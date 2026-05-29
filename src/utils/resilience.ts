import { Habit } from '../types/habit';
import { addDays, getDayStatus, getToday, parseDate } from './dateUtils';

/**
 * Resilience analytics (Feature 6). On-brand for "never miss twice": this
 * measures how well a user *bounces back* after a slip, not the length of an
 * unbroken chain.
 *
 * Definitions used here:
 *  - A "slip" is a day `getDayStatus` flags as `'missed_twice'` — the moment
 *    the user crossed into missed-twice territory. Skipped days are never
 *    slips (they're excluded by `getDayStatus`).
 *  - A slip is "recovered" if the user records a completion on any day after
 *    the slip and before the next slip. The comeback time is the number of
 *    days from the slip to that first completion.
 */
export interface RecoveryStats {
  /** Total slip events (missed-twice crossings) over the habit's history. */
  slips: number;
  /** Slips that were followed by a completion before the next slip. */
  recoveries: number;
  /** recoveries / slips, 0 when there are no slips (nothing to recover from). */
  recoveryRate: number;
  /** Average days from a recovered slip to the next completion; null if none. */
  avgComebackDays: number | null;
  /** Count of slips indexed by JS weekday (0=Sun … 6=Sat). */
  slipsByWeekday: number[];
  /** Headline 0–100 score blending recovery rate and comeback speed. */
  resilienceScore: number;
}

/**
 * Walk the habit's history day-by-day from `createdAt` to today, collecting
 * slip events and whether each was recovered. Pure function over
 * `completions`/`skips`; no I/O.
 */
export function getRecoveryStats(habit: Habit): RecoveryStats {
  const today = getToday();
  const slipsByWeekday = [0, 0, 0, 0, 0, 0, 0];

  if (habit.completions.length === 0 && habit.createdAt > today) {
    return emptyStats(slipsByWeekday);
  }

  const completionSet = new Set(habit.completions);
  const slipDates: string[] = [];

  let cursor = habit.createdAt;
  let guard = 0;
  const maxIterations = 366 * 10; // ~10 years of history is plenty.
  while (cursor <= today && guard < maxIterations) {
    if (getDayStatus(habit, cursor) === 'missed_twice') {
      slipDates.push(cursor);
      slipsByWeekday[parseDate(cursor).getDay()]++;
    }
    cursor = addDays(cursor, 1);
    guard++;
  }

  let recoveries = 0;
  let comebackTotal = 0;
  let comebackCount = 0;

  for (let i = 0; i < slipDates.length; i++) {
    const slip = slipDates[i];
    const nextSlip = slipDates[i + 1] ?? null;
    // First completion strictly after this slip and before the next slip.
    let day = addDays(slip, 1);
    let comeback: string | null = null;
    let steps = 0;
    while (day <= today && (nextSlip === null || day < nextSlip) && steps < maxIterations) {
      if (completionSet.has(day)) {
        comeback = day;
        break;
      }
      day = addDays(day, 1);
      steps++;
    }
    if (comeback !== null) {
      recoveries++;
      comebackTotal += daysApart(slip, comeback);
      comebackCount++;
    }
  }

  const slips = slipDates.length;
  const recoveryRate = slips === 0 ? 0 : recoveries / slips;
  const avgComebackDays = comebackCount === 0 ? null : comebackTotal / comebackCount;
  const resilienceScore = computeScore(slips, recoveryRate, avgComebackDays);

  return {
    slips,
    recoveries,
    recoveryRate,
    avgComebackDays,
    slipsByWeekday,
    resilienceScore,
  };
}

function emptyStats(slipsByWeekday: number[]): RecoveryStats {
  return {
    slips: 0,
    recoveries: 0,
    recoveryRate: 0,
    avgComebackDays: null,
    slipsByWeekday,
    // No slips yet → maximally resilient by default (nothing has gone wrong).
    resilienceScore: 100,
  };
}

/** Whole days between two YYYY-MM-DD strings (a < b assumed by callers). */
function daysApart(fromStr: string, toStr: string): number {
  const ms = parseDate(toStr).getTime() - parseDate(fromStr).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Blend recovery rate (how often you bounce back) with comeback speed
 * (how quickly), clamped to 0–100.
 *
 *  - With no slips at all the score is 100 (nothing to recover from).
 *  - Recovery rate contributes 70 points (rate * 70).
 *  - Comeback speed contributes up to 30 points: a 1-day comeback earns the
 *    full 30, decaying toward 0 as the average comeback stretches out
 *    (30 / avgDays). When some slips were never recovered there's no speed
 *    sample, so the speed term is 0.
 */
function computeScore(slips: number, recoveryRate: number, avgComebackDays: number | null): number {
  if (slips === 0) return 100;
  const ratePoints = recoveryRate * 70;
  const speedPoints =
    avgComebackDays === null ? 0 : Math.min(30, 30 / Math.max(1, avgComebackDays));
  return Math.round(Math.max(0, Math.min(100, ratePoints + speedPoints)));
}
