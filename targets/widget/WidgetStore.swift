import Foundation
import SwiftUI

/// App Group shared with the Expo app (`src/utils/widgetBridge.ts`).
let appGroupIdentifier = "group.com.optimisedigital.nevermisstwice"
let widgetSnapshotKey = "widgetSnapshot"
let pendingCompletionsKey = "pendingCompletions"

/// Compact per-habit shape mirrored from the phone. The phone serialiser
/// (`buildWidgetSnapshot`) is the source of truth — keep names in sync.
struct WidgetHabit: Identifiable, Hashable, Decodable {
  let id: String
  let name: String
  let emoji: String
  /// Hex like "#34D399".
  let color: String
  let status: String
  let completedToday: Bool
  let currentStreak: Int
  let count: Int
  /// `nil` for boolean habits.
  let target: Int?
}

struct WidgetSnapshot: Decodable {
  let habits: [WidgetHabit]
  /// YYYY-MM-DD the app considers "today".
  let today: String
}

/// Reads + writes the shared App Group store the widget and app both use.
enum WidgetStore {
  private static var defaults: UserDefaults? {
    UserDefaults(suiteName: appGroupIdentifier)
  }

  /// Decode the latest snapshot the app published. Returns an empty
  /// placeholder snapshot on any failure so the widget never crashes.
  static func loadSnapshot() -> WidgetSnapshot {
    guard
      let raw = defaults?.string(forKey: widgetSnapshotKey),
      let data = raw.data(using: .utf8),
      let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    else {
      return WidgetSnapshot(habits: [], today: "")
    }
    return snapshot
  }

  /// Record a widget-originated completion for the app to drain on next
  /// foreground. Appends to the pending array stored as JSON text.
  static func recordPendingCompletion(habitId: String, isoDate: String) {
    guard let defaults = defaults else { return }
    var pending: [[String: String]] = []
    if
      let raw = defaults.string(forKey: pendingCompletionsKey),
      let data = raw.data(using: .utf8),
      let parsed = try? JSONSerialization.jsonObject(with: data) as? [[String: String]]
    {
      pending = parsed
    }
    pending.append(["habitId": habitId, "isoDate": isoDate])
    if
      let data = try? JSONSerialization.data(withJSONObject: pending),
      let text = String(data: data, encoding: .utf8)
    {
      defaults.set(text, forKey: pendingCompletionsKey)
    }
  }

  /// Optimistically flip a habit to completed in the cached snapshot so the
  /// widget reflects the tap immediately, before the app reconciles.
  static func markCompletedLocally(habitId: String) {
    guard
      let defaults = defaults,
      let raw = defaults.string(forKey: widgetSnapshotKey),
      let data = raw.data(using: .utf8),
      var json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      var habits = json["habits"] as? [[String: Any]]
    else { return }

    for index in habits.indices {
      if habits[index]["id"] as? String == habitId {
        habits[index]["completedToday"] = true
        habits[index]["status"] = "completed_today"
      }
    }
    json["habits"] = habits
    if let out = try? JSONSerialization.data(withJSONObject: json),
       let text = String(data: out, encoding: .utf8) {
      defaults.set(text, forKey: widgetSnapshotKey)
    }
  }
}

// MARK: - Color hex helper

extension Color {
  init(hex: String) {
    var trimmed = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if trimmed.hasPrefix("#") { trimmed.removeFirst() }
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
