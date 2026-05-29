import Foundation
import SwiftUI
import WatchConnectivity

/// Compact habit shape mirrored from the phone via
/// `WCSession.updateApplicationContext`. The phone-side serialiser
/// (`src/hooks/useWatchSync.ts → serialiseForWatch`) is the source of
/// truth for the field set — keep these names in sync.
struct WatchHabit: Identifiable, Hashable {
  let id: String
  let name: String
  let emoji: String
  /// Hex string like "#818CF8". Parsed lazily into `Color` by the view.
  let color: String
  var completedToday: Bool
}

/// Holds the latest snapshot the phone pushed us, plus owns the
/// `WCSession` lifecycle. There is exactly one of these — created in
/// `NeverMissTwiceWatchApp` as a `@StateObject` and handed down via
/// `@EnvironmentObject`.
///
/// Design notes:
///
/// - The watch never computes "today" itself. The phone publishes the
///   iso `YYYY-MM-DD` it considers "today" inside the same application
///   context as the habit list; we echo that back on tap. This makes
///   the watch immune to clock drift / timezone shenanigans.
///
/// - `session(_:activationDidCompleteWith:error:)` is the *only*
///   delegate callback required on watchOS. The `sessionDidBecomeInactive`
///   / `sessionDidDeactivate` callbacks are iOS-only and adding them
///   here will fail to compile against the watchOS SDK.
///
/// - On activation we deliberately re-read `session.receivedApplicationContext`
///   and apply it. The system delivers the latest stored context as part
///   of activation — but it does so *before* our delegate is wired, so
///   without this manual read the first launch shows an empty list until
///   the phone pushes a new context.
final class HabitsStore: NSObject, ObservableObject {
  @Published var habits: [WatchHabit] = []
  /// Iso `YYYY-MM-DD` from the phone. Empty until the first context arrives.
  @Published var today: String = ""

  override init() {
    super.init()
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  // MARK: - Mark complete

  /// Send a `mark-complete` message back to the phone.
  ///
  /// We try `sendMessage` first (instant round-trip when the phone is
  /// reachable, which is the common case — the user just opened the
  /// watch app and their phone is on their wrist). If the session
  /// isn't reachable we fall back to `transferUserInfo`, which queues
  /// on disk and delivers when the phone wakes up.
  ///
  /// Returns `true` optimistically on the queued path because the
  /// system guarantees eventual delivery; the watch UI already toggled
  /// the row before this was called, so a brittle false here would
  /// just confuse the user.
  @MainActor
  func markComplete(habitId: String) async -> Bool {
    // Guard: we need an iso date to send. If the phone has never
    // talked to us, we have no `today` and refusing to send is safer
    // than guessing.
    guard !today.isEmpty else { return false }
    guard WCSession.isSupported() else { return false }

    let session = WCSession.default
    let payload: [String: Any] = [
      "type": "mark-complete",
      "habitId": habitId,
      "isoDate": today,
    ]

    if session.isReachable {
      return await withCheckedContinuation { continuation in
        session.sendMessage(
          payload,
          replyHandler: { _ in
            continuation.resume(returning: true)
          },
          errorHandler: { _ in
            // Fall back to the queued path on the same payload so
            // the tick still lands eventually.
            session.transferUserInfo(payload)
            continuation.resume(returning: true)
          }
        )
      }
    } else {
      session.transferUserInfo(payload)
      return true
    }
  }

  // MARK: - Apply application context

  /// Decode the dictionary the phone pushed us into `[WatchHabit]`.
  /// Defensive on every field — a malformed push must not crash the
  /// watch app.
  @MainActor
  fileprivate func apply(applicationContext: [String: Any]) {
    if let isoToday = applicationContext["today"] as? String {
      today = isoToday
    } else {
      today = ""
    }

    guard let rawHabits = applicationContext["habits"] as? [[String: Any]] else {
      habits = []
      return
    }

    habits = rawHabits.compactMap { raw in
      guard
        let id = raw["id"] as? String,
        let name = raw["name"] as? String
      else { return nil }
      let emoji = (raw["emoji"] as? String) ?? ""
      let color = (raw["color"] as? String) ?? ""
      let completedToday = (raw["completedToday"] as? Bool) ?? false
      return WatchHabit(
        id: id,
        name: name,
        emoji: emoji,
        color: color,
        completedToday: completedToday
      )
    }
  }
}

// MARK: - WCSessionDelegate

extension HabitsStore: WCSessionDelegate {
  func session(
    _ session: WCSession,
    activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    // Snapshot the latest stored context before returning — the system
    // may have one waiting from before our delegate existed.
    let snapshot = session.receivedApplicationContext
    DispatchQueue.main.async { [weak self] in
      self?.apply(applicationContext: snapshot)
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    DispatchQueue.main.async { [weak self] in
      self?.apply(applicationContext: applicationContext)
    }
  }
}

// MARK: - Color hex helper

extension Color {
  /// Parse a hex color string like "#818CF8" or "818CF8" into a `Color`.
  /// Returns `.accentColor` on any parse failure — the goal is never to
  /// crash on a malformed colour from the phone, just to fall back to
  /// something visible.
  init(hex: String) {
    var trimmed = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("#") {
      trimmed.removeFirst()
    }
    guard trimmed.count == 6, let value = UInt32(trimmed, radix: 16) else {
      self = .accentColor
      return
    }
    let r = Double((value >> 16) & 0xFF) / 255.0
    let g = Double((value >> 8) & 0xFF) / 255.0
    let b = Double(value & 0xFF) / 255.0
    self = Color(red: r, green: g, blue: b)
  }
}
