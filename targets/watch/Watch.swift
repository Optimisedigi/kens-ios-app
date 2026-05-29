import SwiftUI
import WatchConnectivity

/// Entry point for the watchOS companion app.
///
/// We deliberately do almost nothing here — the entire WatchConnectivity
/// lifecycle and habit state lives in `HabitsStore`, which we hand to the
/// view tree as an `@EnvironmentObject`. Keeping the `App` body trivial
/// avoids subtle ordering bugs where the session would be activated from
/// a `View.onAppear` (too late — the phone may have already pushed an
/// application context before the first view renders, and we'd miss it).
@main
struct NeverMissTwiceWatchApp: App {
  @StateObject private var store = HabitsStore()

  var body: some Scene {
    WindowGroup {
      ContentView()
        .environmentObject(store)
    }
  }
}
