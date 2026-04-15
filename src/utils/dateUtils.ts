import { Habit, HabitStatus, HabitWithStatus } from "../types/habit";

/** Returns today's date as YYYY-MM-DD string in local timezone */
export function getToday(): string {
  const now = new Date();
  return formatDate(now);
}

/** Formats a Date object as YYYY-MM-DD in local timezone */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a Date object (at midnight local time) */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Returns the number of days between two YYYY-MM-DD date strings */
export function getDaysBetween(dateA: string, dateB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Returns yesterday's date as YYYY-MM-DD */
export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/** Gets the status of a habit based on its completions and frequency */
export function getHabitStatus(habit: Habit): HabitStatus {
  const today = getToday();
  const f = habit.frequencyDays;

  if (habit.completions.includes(today)) {
    return "completed_today";
  }

  if (habit.completions.length === 0) {
    // New habit — check if created today
    if (habit.createdAt === today) {
      return "new";
    }
    // Created before today with no completions
    const daysSinceCreated = getDaysBetween(habit.createdAt, today);
    if (daysSinceCreated < f) return "safe";
    if (daysSinceCreated < f * 2) return "warning";
    return "missed_twice";
  }

  const sortedCompletions = [...habit.completions].sort().reverse();
  const lastCompleted = sortedCompletions[0];
  const daysSince = getDaysBetween(lastCompleted, today);

  if (daysSince === 0) {
    return "completed_today"; // safety check
  }

  if (daysSince < f) {
    return "safe"; // still within current period
  }

  if (daysSince < f * 2) {
    return "warning"; // used your grace, do it today
  }

  // daysSince >= f * 2: missed twice
  return "missed_twice";
}

/** Gets the number of days since last completion, or null if never completed */
export function getDaysSinceLastCompleted(habit: Habit): number | null {
  if (habit.completions.length === 0) return null;
  const today = getToday();
  const sortedCompletions = [...habit.completions].sort().reverse();
  return getDaysBetween(sortedCompletions[0], today);
}

/** Calculates the current streak (consecutive completion periods ending recently) */
export function getCurrentStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;

  const today = getToday();
  const f = habit.frequencyDays;
  const sortedDates = [...new Set(habit.completions)].sort().reverse();

  // The most recent completion must be within the grace window (< f*2 days ago)
  const daysSinceLast = getDaysBetween(sortedDates[0], today);
  if (daysSinceLast >= f * 2) return 0;

  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = getDaysBetween(sortedDates[i], sortedDates[i - 1]);
    if (gap <= f) {
      // Within one period — still part of the streak
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/** Calculates the longest streak ever (consecutive completions within frequency) */
export function getLongestStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;

  const f = habit.frequencyDays;
  const sortedDates = [...new Set(habit.completions)].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = getDaysBetween(sortedDates[i - 1], sortedDates[i]);
    if (gap <= f) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

/** Calculates the completion rate (completions / expected completions based on frequency) */
export function getCompletionRate(habit: Habit): number {
  const today = getToday();
  const totalDays = getDaysBetween(habit.createdAt, today) + 1; // Include creation day
  if (totalDays === 0) return 0;
  const expectedCompletions = Math.max(1, Math.ceil(totalDays / habit.frequencyDays));
  const uniqueCompletions = new Set(habit.completions).size;
  return Math.min(uniqueCompletions / expectedCompletions, 1);
}

/** Enriches a Habit with computed status and stats */
export function getHabitWithStatus(habit: Habit): HabitWithStatus {
  return {
    ...habit,
    status: getHabitStatus(habit),
    daysSinceLastCompleted: getDaysSinceLastCompleted(habit),
    currentStreak: getCurrentStreak(habit),
    longestStreak: getLongestStreak(habit),
    completionRate: getCompletionRate(habit),
  };
}

/** Returns an array of date strings for the last N days (including today), oldest first */
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(formatDate(date));
  }
  return days;
}

/** Gets the day-of-week label for a date (S, M, T, W, T, F, S) */
export function getDayOfWeekLabel(dateStr: string): string {
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const date = parseDate(dateStr);
  return days[date.getDay()];
}

/** Formats a date string for display, e.g., "Monday, April 14" */
export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export interface MonthlyStats {
  /** YYYY-MM format */
  month: string;
  /** Display label, e.g. "April 2026" */
  label: string;
  /** Total days in this month (up to today if current month) */
  totalDays: number;
  /** Days completed */
  completed: number;
  /** Days where habit was missed twice (gap >= frequencyDays * 2) */
  missedTwice: number;
  /** Completion rate 0-1 */
  rate: number;
}

/** Returns monthly stats for a habit, going back `monthsBack` months from today */
export function getMonthlyStats(
  habit: Habit,
  monthsBack: number = 6
): MonthlyStats[] {
  const today = new Date();
  const todayStr = getToday();
  const results: MonthlyStats[] = [];

  for (let i = 0; i < monthsBack; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const label = targetDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Determine the range of days to check in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = formatDate(new Date(year, month, 1));
    const lastDayDate = new Date(year, month, daysInMonth);
    const lastDay =
      formatDate(lastDayDate) > todayStr
        ? todayStr
        : formatDate(lastDayDate);

    // Skip months entirely before the habit was created
    if (lastDay < habit.createdAt) continue;

    let completed = 0;
    let missedTwice = 0;
    let totalDays = 0;

    // Walk through each day of the month
    const startDay = habit.createdAt > firstDay ? habit.createdAt : firstDay;
    const startDate = parseDate(startDay);
    const endDate = parseDate(lastDay);

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = formatDate(d);
      totalDays++;
      const status = getDayStatus(habit, dateStr);
      if (status === "completed") completed++;
      else if (status === "missed_twice") missedTwice++;
    }

    const expectedCompletions = Math.max(1, Math.ceil(totalDays / habit.frequencyDays));
    results.push({
      month: monthStr,
      label,
      totalDays,
      completed,
      missedTwice,
      rate: totalDays > 0 ? completed / expectedCompletions : 0,
    });
  }

  return results;
}

/**
 * Returns the status of a specific day for a habit:
 * "completed", "missed_twice", "empty"
 */
export function getDayStatus(
  habit: Habit,
  dateStr: string
): "completed" | "missed_twice" | "empty" {
  const createdDate = habit.createdAt;
  const f = habit.frequencyDays;
  if (dateStr < createdDate) return "empty";

  if (habit.completions.includes(dateStr)) return "completed";

  // Check if this is a gap day — find surrounding completions
  const sortedCompletions = [...habit.completions].sort();

  // Find the previous completion date
  let prevCompletion: string | null = null;
  for (const comp of sortedCompletions) {
    if (comp < dateStr) prevCompletion = comp;
    else break;
  }

  if (prevCompletion) {
    const gapDays = getDaysBetween(prevCompletion, dateStr);
    if (gapDays >= f * 2) return "missed_twice";
  } else {
    // No previous completion — check from creation date
    const daysSinceCreated = getDaysBetween(createdDate, dateStr);
    if (daysSinceCreated === 0) return "empty"; // Creation day, no completion yet
    if (daysSinceCreated >= f * 2) return "missed_twice";
  }

  return "empty";
}
