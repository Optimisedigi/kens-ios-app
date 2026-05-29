import ActivityKit
import WidgetKit
import SwiftUI

/// Attributes describing a "streak in danger" Live Activity (Feature 2).
/// Started by the app (`src/utils/liveActivity.ts`) when a habit enters the
/// `warning` state; ended when completed or the day rolls over.
struct StreakActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Whether the user has completed the habit since the activity started.
    var completed: Bool
  }

  /// Static for the life of the activity.
  var habitId: String
  var habitName: String
  var emoji: String
  var streak: Int
}

@available(iOS 16.2, *)
struct StreakLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: StreakActivityAttributes.self) { context in
      // Lock Screen / banner presentation.
      HStack(spacing: 12) {
        Text(context.attributes.emoji).font(.title)
        VStack(alignment: .leading, spacing: 2) {
          Text(context.state.completed ? "Streak saved!" : "Don't miss twice")
            .font(.headline)
          Text(context.attributes.habitName)
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
        Spacer()
        VStack {
          Text("\(context.attributes.streak)")
            .font(.title2).bold()
          Text("streak").font(.caption2).foregroundStyle(.secondary)
        }
      }
      .padding()
      .activityBackgroundTint(Color.black.opacity(0.6))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.attributes.emoji).font(.title2)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text("🔥 \(context.attributes.streak)")
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.state.completed ? "Streak saved!" : "Don't miss twice")
            .font(.headline)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.attributes.habitName).foregroundStyle(.secondary)
        }
      } compactLeading: {
        Text(context.attributes.emoji)
      } compactTrailing: {
        Text("🔥\(context.attributes.streak)")
      } minimal: {
        Text(context.attributes.emoji)
      }
    }
  }
}
