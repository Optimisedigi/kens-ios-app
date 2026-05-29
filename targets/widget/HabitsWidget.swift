import WidgetKit
import SwiftUI

/// Timeline entry carrying the snapshot read from the App Group at refresh.
struct HabitsEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot
}

/// Static provider: the snapshot is pushed by the app via `ExtensionStorage`
/// and `reloadAllTimelines()`, so we just read whatever is current and ask
/// the system to refresh roughly hourly as a backstop (e.g. day rollover).
struct HabitsProvider: TimelineProvider {
  func placeholder(in context: Context) -> HabitsEntry {
    HabitsEntry(date: Date(), snapshot: WidgetSnapshot(habits: [], today: ""))
  }

  func getSnapshot(in context: Context, completion: @escaping (HabitsEntry) -> Void) {
    completion(HabitsEntry(date: Date(), snapshot: WidgetStore.loadSnapshot()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<HabitsEntry>) -> Void) {
    let entry = HabitsEntry(date: Date(), snapshot: WidgetStore.loadSnapshot())
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

/// Accent color for a habit status string (mirrors the app's status colors).
private func statusColor(_ status: String, habitColor: Color) -> Color {
  switch status {
  case "completed_today": return Color(hex: "#34D399")
  case "warning": return Color(hex: "#FBBF24")
  case "missed_twice": return Color(hex: "#EF4444")
  default: return habitColor
  }
}

/// Pick the most "at risk" habit for the small widget: warning/missed first,
/// then anything not completed, else the first habit.
private func mostAtRisk(_ habits: [WidgetHabit]) -> WidgetHabit? {
  if let warn = habits.first(where: { $0.status == "warning" }) { return warn }
  if let miss = habits.first(where: { $0.status == "missed_twice" }) { return miss }
  if let todo = habits.first(where: { !$0.completedToday }) { return todo }
  return habits.first
}

// MARK: - Completion button

@available(iOS 17.0, *)
struct HabitCheckButton: View {
  let habit: WidgetHabit
  let today: String

  var body: some View {
    Button(intent: CompleteHabitIntent(habitId: habit.id, isoDate: today)) {
      Image(systemName: habit.completedToday ? "checkmark.circle.fill" : "circle")
        .font(.title3)
        .foregroundStyle(habit.completedToday ? Color(hex: "#34D399") : .secondary)
    }
    .buttonStyle(.plain)
    .disabled(habit.completedToday)
  }
}

// MARK: - Small widget (single at-risk habit)

struct SmallHabitView: View {
  let entry: HabitsEntry

  var body: some View {
    let habit = mostAtRisk(entry.snapshot.habits)
    VStack(alignment: .leading, spacing: 6) {
      if let habit = habit {
        HStack {
          Text(habit.emoji).font(.title2)
          Spacer()
          if #available(iOS 17.0, *) {
            HabitCheckButton(habit: habit, today: entry.snapshot.today)
          }
        }
        Text(habit.name)
          .font(.headline)
          .lineLimit(2)
          .foregroundStyle(.primary)
        Text(habit.completedToday ? "Done today" : "Don't miss twice")
          .font(.caption)
          .foregroundStyle(statusColor(habit.status, habitColor: Color(hex: habit.color)))
      } else {
        Text("No habits yet").font(.caption).foregroundStyle(.secondary)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

// MARK: - Medium widget (today's checklist)

struct MediumHabitView: View {
  let entry: HabitsEntry

  var body: some View {
    let habits = Array(entry.snapshot.habits.prefix(4))
    VStack(alignment: .leading, spacing: 8) {
      Text("Today").font(.caption).bold().foregroundStyle(.secondary)
      if habits.isEmpty {
        Text("No habits yet").font(.caption).foregroundStyle(.secondary)
      } else {
        ForEach(habits) { habit in
          HStack(spacing: 8) {
            Text(habit.emoji)
            Text(habit.name).font(.subheadline).lineLimit(1)
            Spacer()
            if let target = habit.target {
              Text("\(habit.count)/\(target)").font(.caption2).foregroundStyle(.secondary)
            }
            if #available(iOS 17.0, *) {
              HabitCheckButton(habit: habit, today: entry.snapshot.today)
            }
          }
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct HabitsWidgetEntryView: View {
  @Environment(\.widgetFamily) var family
  let entry: HabitsEntry

  var body: some View {
    switch family {
    case .systemMedium:
      MediumHabitView(entry: entry)
    default:
      SmallHabitView(entry: entry)
    }
  }
}

struct HabitsWidget: Widget {
  let kind: String = "HabitsWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: HabitsProvider()) { entry in
      if #available(iOS 17.0, *) {
        HabitsWidgetEntryView(entry: entry)
          .containerBackground(.fill.tertiary, for: .widget)
      } else {
        HabitsWidgetEntryView(entry: entry)
          .padding()
      }
    }
    .configurationDisplayName("Never Miss Twice")
    .description("Today's habits with tap-to-complete.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
