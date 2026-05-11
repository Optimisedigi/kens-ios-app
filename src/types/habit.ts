/**
 * A habit's cadence is one of three kinds:
 *  - "interval": "do it every N days" (1 = daily, 2 = every 2 days, 7 = weekly).
 *  - "perWeek":  "do it K days within any rolling 7-day window" (1–7).
 *  - "weekdays": "do it on these specific days of the week"
 *                (e.g. Mon/Tue/Wed/Thu/Fri). `weekdays` holds the JS
 *                getDay() indices: 0 = Sunday … 6 = Saturday, sorted asc.
 *
 * The three are semantically distinct: an interval rule flags a day as missed
 * once `N` days pass without a completion; a per-week rule only flags the week
 * if the user logged fewer than `daysPerWeek` completions in the last 7 days;
 * a weekdays rule treats only its selected weekdays as "due days" — missing
 * two consecutive due days flips the habit into missed-twice territory.
 */
export type HabitFrequency =
  | { kind: 'interval'; days: number }
  | { kind: 'perWeek'; daysPerWeek: number }
  | { kind: 'weekdays'; weekdays: number[] };

/** Single-letter weekday labels, Sunday-first (matches `Date.getDay()`). */
export const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/** Three-letter weekday names, Sunday-first (matches `Date.getDay()`). */
export const WEEKDAY_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string; // Hex color used in stats charts
  createdAt: string; // ISO date string (YYYY-MM-DD)
  completions: string[]; // Array of date strings (YYYY-MM-DD)
  frequency: HabitFrequency;
  /**
   * Optional free-text notes attached to specific completion days.
   * Keys are YYYY-MM-DD; missing keys = no note. Notes survive un-ticking.
   */
  notes: Record<string, string>;
  /**
   * Per-habit reminder time. Each habit fires its own notification at this
   * time on its cadence. `null` means "no reminder for this habit" — the
   * notification system skips it entirely. Migration seeds non-null values
   * from the legacy global reminder time so existing habits keep their
   * current behaviour.
   */
  reminderHour: number | null; // 0–23 or null
  reminderMinute: number | null; // 0–59 or null
  /**
   * Optional finite end date for a fixed-campaign habit (e.g. "10 days in
   * a row", "for the month"). YYYY-MM-DD in local time. `null` means the
   * habit runs indefinitely. The habit is considered "ended" once today
   * is strictly past `endDate`.
   */
  endDate: string | null;
}

/** Curated palette for habit colors — readable on dark background */
export const HABIT_COLOR_PALETTE: string[] = [
  '#34D399', // emerald
  '#38BDF8', // sky
  '#A78BFA', // violet
  '#FB923C', // orange
  '#F472B6', // pink
  '#22D3EE', // cyan
  '#A3E635', // lime
  '#FBBF24', // amber
];

export interface IntervalFrequencyOption {
  label: string;
  value: number;
}

/** Preset interval cadences shown in the "Interval" tab. */
export const INTERVAL_FREQUENCY_OPTIONS: IntervalFrequencyOption[] = [
  { label: 'Daily', value: 1 },
  { label: 'Every 2 Days', value: 2 },
  { label: 'Weekly', value: 7 },
];

/** Per-week cadence options shown in the "Per week" tab (1–7 days/week). */
export const PER_WEEK_FREQUENCY_OPTIONS: number[] = [1, 2, 3, 4, 5, 6, 7];

/** Human-readable label for a habit's cadence. */
export function getFrequencyLabel(freq: HabitFrequency): string {
  if (freq.kind === 'interval') {
    const preset = INTERVAL_FREQUENCY_OPTIONS.find((o) => o.value === freq.days);
    if (preset) return preset.label;
    return `Every ${freq.days} Days`;
  }
  if (freq.kind === 'weekdays') {
    const sorted = [...freq.weekdays].sort((a, b) => a - b);
    if (sorted.length === 7) return 'Daily';
    if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) {
      return 'Weekdays';
    }
    if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) {
      return 'Weekends';
    }
    if (sorted.length === 0) return 'No days selected';
    return sorted.map((d) => WEEKDAY_FULL[d]).join(', ');
  }
  // perWeek
  return freq.daysPerWeek === 1 ? '1 day a week' : `${freq.daysPerWeek} days a week`;
}

export type HabitStatus =
  | 'completed_today'
  | 'safe' // completed yesterday, still within window
  | 'warning' // last completed 1 day ago but not today — about to miss twice
  | 'missed_twice' // 2+ days gap
  | 'new'; // no completions yet (just created today)

export interface HabitWithStatus extends Habit {
  status: HabitStatus;
  daysSinceLastCompleted: number | null; // null if never completed
  currentStreak: number;
  longestStreak: number;
  completionRate: number; // 0-1
}

/**
 * Global notification settings. The on/off toggle is global; reminder
 * times now live per-habit (`Habit.reminderHour`/`reminderMinute`).
 * `reminderHour`/`reminderMinute` are kept here only as the seed value
 * for new habits during migration.
 */
export interface NotificationSettings {
  enabled: boolean;
  /** @deprecated Used only as seed for per-habit reminder times. */
  reminderHour: number; // 0-23
  /** @deprecated Used only as seed for per-habit reminder times. */
  reminderMinute: number; // 0-59
}
