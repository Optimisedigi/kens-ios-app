import { Habit, HabitWithStatus } from '../types/habit';
import { getCurrentStreak, getDueDayCount, getCompletionsInRange, getToday } from './dateUtils';

/**
 * A milestone worth celebrating with a popup. Three kinds:
 *  - `streak`: the current streak just crossed a headline threshold.
 *  - `personalBest`: the streak climbed back to a record set in a prior run
 *    (a comeback), so it fires once per reclaimed record — never during the
 *    first-ever climb, which would spam every day.
 *  - `goal`: a finite-campaign habit (`endDate`) reached its final day.
 */
export type Milestone =
  | { kind: 'streak'; days: number; streak: number; longest: number; rate: number }
  | { kind: 'personalBest'; streak: number; previousBest: number }
  | {
      kind: 'goal';
      done: number;
      expected: number;
      missed: number;
      unit: string;
      unitPlural: string;
    };

/** Headline streak thresholds, highest first so the biggest one wins a tie. */
export const STREAK_THRESHOLDS = [100, 30, 14, 7] as const;

/**
 * Return a habit as if `today` were completed, so streak helpers can be run
 * on the post-tap state. No-op when today is already complete.
 */
function withTodayComplete(habit: Habit, today: string): Habit {
  if (habit.completions.includes(today)) return habit;
  const completions = [...habit.completions, today];
  const counts = habit.target !== null ? { ...habit.counts, [today]: habit.target } : habit.counts;
  return { ...habit, completions, counts };
}

/**
 * AsyncStorage flag key that gates a milestone so it fires at most once.
 * Streak/personal-best keys embed the value reached; goal keys embed the
 * end date (matching the legacy `celebrated:` key the card already wrote).
 */
export function milestoneFlagKey(habitId: string, milestone: Milestone): string {
  switch (milestone.kind) {
    case 'streak':
      return `milestone:${habitId}:streak:${milestone.days}`;
    case 'personalBest':
      return `milestone:${habitId}:pb:${milestone.previousBest}`;
    case 'goal':
      return `celebrated:${habitId}:goal`;
  }
}

/**
 * Detect the milestone (if any) that completing `today` unlocks for `habit`.
 * `habit` is the pre-tap snapshot (its `currentStreak`/`longestStreak`
 * reflect state before today's completion). Returns null when nothing is
 * unlocked. Precedence: goal > streak threshold > personal best — only one
 * popup per tap.
 */
export function detectMilestone(
  habit: HabitWithStatus,
  today: string = getToday(),
): Milestone | null {
  // Goal: finite campaign whose final day is today.
  if (habit.endDate && habit.endDate === today) {
    const anchorStart =
      habit.completions.length > 0 ? [...habit.completions].sort()[0] : habit.createdAt;
    const expected = getDueDayCount(habit, anchorStart, habit.endDate);
    const done = getCompletionsInRange(withTodayComplete(habit, today), anchorStart, habit.endDate);
    const missed = Math.max(0, expected - done);
    const unit = habit.frequency.kind === 'perWeek' ? 'slot' : 'day';
    const unitPlural = unit === 'slot' ? 'slots' : 'days';
    return { kind: 'goal', done, expected, missed, unit, unitPlural };
  }

  const sim = withTodayComplete(habit, today);
  const newStreak = getCurrentStreak(sim);
  const oldStreak = habit.currentStreak;
  const oldBest = habit.longestStreak;

  // Streak threshold just crossed by this completion.
  const crossed = STREAK_THRESHOLDS.find((t) => newStreak >= t && oldStreak < t);
  if (crossed) {
    return {
      kind: 'streak',
      days: crossed,
      streak: newStreak,
      longest: Math.max(oldBest, newStreak),
      rate: Math.round(habit.completionRate * 100),
    };
  }

  // Personal best (comeback): the previous record was higher than the run we
  // were on (`oldBest > oldStreak`), and this completion climbs back to it.
  // Fires once at the moment the record is reclaimed; never during a first
  // unbroken climb where oldBest === oldStreak each day.
  if (oldBest > oldStreak && newStreak >= oldBest) {
    return { kind: 'personalBest', streak: newStreak, previousBest: oldBest };
  }

  return null;
}
