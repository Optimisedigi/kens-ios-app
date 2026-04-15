export interface Habit {
  id: string;
  name: string;
  emoji: string;
  createdAt: string; // ISO date string (YYYY-MM-DD)
  completions: string[]; // Array of date strings (YYYY-MM-DD)
  frequencyDays: number; // 1 = daily, 2 = every 2 days, 7 = weekly
}

export interface FrequencyOption {
  label: string;
  value: number;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { label: "Daily", value: 1 },
  { label: "Every 2 Days", value: 2 },
  { label: "Weekly", value: 7 },
];

export type HabitStatus =
  | "completed_today"
  | "safe" // completed yesterday, still within window
  | "warning" // last completed 1 day ago but not today — about to miss twice
  | "missed_twice" // 2+ days gap
  | "new"; // no completions yet (just created today)

export interface HabitWithStatus extends Habit {
  status: HabitStatus;
  daysSinceLastCompleted: number | null; // null if never completed
  currentStreak: number;
  longestStreak: number;
  completionRate: number; // 0-1
}

export interface NotificationSettings {
  enabled: boolean;
  reminderHour: number; // 0-23
  reminderMinute: number; // 0-59
}
