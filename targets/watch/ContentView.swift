import SwiftUI
import WatchKit

/// The one and only watch screen: a list of today's habits with a
/// tap-to-mark-done affordance. No editing, no creating, no settings —
/// the watch app is intentionally a single-purpose trigger.
struct ContentView: View {
  @EnvironmentObject var store: HabitsStore

  var body: some View {
    NavigationStack {
      Group {
        if store.habits.isEmpty {
          emptyState
        } else {
          habitsList
        }
      }
      .navigationTitle("Today")
    }
  }

  // MARK: - Subviews

  private var emptyState: some View {
    VStack(spacing: 6) {
      Text("No habits yet")
        .font(.headline)
      Text("Add one on iPhone")
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding()
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private var habitsList: some View {
    List {
      ForEach(store.habits) { habit in
        Button(action: { tap(habit) }) {
          row(for: habit)
        }
        .buttonStyle(.plain)
      }
    }
  }

  private func row(for habit: WatchHabit) -> some View {
    HStack(spacing: 8) {
      Text(habit.emoji)
        .font(.title3)
      Text(habit.name)
        .font(.body)
        .lineLimit(1)
      Spacer(minLength: 4)
      if habit.completedToday {
        Image(systemName: "checkmark.circle.fill")
          .foregroundStyle(Color(hex: habit.color))
          .font(.title3)
      } else {
        Image(systemName: "circle")
          .foregroundStyle(.secondary)
          .font(.title3)
      }
    }
    .contentShape(Rectangle())
  }

  // MARK: - Interaction

  /// Tap handler. Idempotent set semantics — tapping a row that's
  /// already complete is a no-op, matching the phone-side
  /// `markComplete` contract (`src/utils/watchBridge.ts`). Without
  /// this guard a double-tap would round-trip a second message that
  /// the phone would correctly ignore, but the haptic + flash would
  /// suggest something happened.
  private func tap(_ habit: WatchHabit) {
    guard !habit.completedToday else { return }
    guard let index = store.habits.firstIndex(where: { $0.id == habit.id }) else { return }

    // Optimistic UI: flip the local row immediately so the user gets
    // instant feedback even if the phone is asleep at the bottom of a
    // bag. The phone's next applicationContext push will overwrite us
    // with the authoritative value.
    store.habits[index].completedToday = true
    WKInterfaceDevice.current().play(.success)

    let habitId = habit.id
    Task { _ = await store.markComplete(habitId: habitId) }
  }
}
