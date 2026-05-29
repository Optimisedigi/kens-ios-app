import AppIntents
import WidgetKit

/// Interactive-widget App Intent (iOS 17+). Records a completion for the
/// tapped habit into the shared App Group so the app applies it on next
/// foreground, and optimistically flips the cached snapshot so the widget
/// updates immediately.
@available(iOS 17.0, *)
struct CompleteHabitIntent: AppIntent {
  static var title: LocalizedStringResource = "Complete Habit"
  static var description = IntentDescription("Mark a habit complete for today.")

  @Parameter(title: "Habit ID")
  var habitId: String

  @Parameter(title: "Date")
  var isoDate: String

  init() {}

  init(habitId: String, isoDate: String) {
    self.habitId = habitId
    self.isoDate = isoDate
  }

  func perform() async throws -> some IntentResult {
    WidgetStore.recordPendingCompletion(habitId: habitId, isoDate: isoDate)
    WidgetStore.markCompletedLocally(habitId: habitId)
    WidgetCenter.shared.reloadAllTimelines()
    return .result()
  }
}
