import { describe, expect, it } from 'vitest';
import { Habit } from '../../types/habit';
import { getHabitWithStatus, getToday, addDays } from '../dateUtils';
import { detectMilestone, milestoneFlagKey } from '../milestones';

/** Build a daily habit completed on the last `n` days ending yesterday. */
function dailyHabitCompletedThrough(daysBeforeToday: number, count: number): Habit {
  const today = getToday();
  const completions: string[] = [];
  // Most recent completion is `daysBeforeToday` days ago; walk back `count`.
  for (let i = 0; i < count; i++) {
    completions.push(addDays(today, -(daysBeforeToday + i)));
  }
  const createdAt = completions[completions.length - 1] ?? today;
  return {
    id: 'h1',
    name: 'Run',
    emoji: '🏃',
    color: '#34D399',
    createdAt,
    completions: completions.sort(),
    frequency: { kind: 'interval', days: 1 },
    notes: {},
    reminderHour: null,
    reminderMinute: null,
    endDate: null,
    target: null,
    unit: null,
    counts: {},
    skips: [],
    healthMetric: null,
  };
}

describe('detectMilestone — streak thresholds', () => {
  it('fires the 7-day milestone when today completes a 6-day run', () => {
    // Completed the 6 days immediately before today (yesterday back 6).
    const habit = getHabitWithStatus(dailyHabitCompletedThrough(1, 6));
    const milestone = detectMilestone(habit);
    expect(milestone).toEqual(expect.objectContaining({ kind: 'streak', days: 7, streak: 7 }));
  });

  it('does not fire when the threshold was already passed', () => {
    // Already on a 10-day run before today → completing today reaches 11,
    // which crosses no threshold (7 already passed, 14 not yet reached).
    const habit = getHabitWithStatus(dailyHabitCompletedThrough(1, 10));
    expect(detectMilestone(habit)).toBeNull();
  });

  it('fires 30 (highest crossed) when jumping past multiple thresholds is impossible but 30 is hit', () => {
    const habit = getHabitWithStatus(dailyHabitCompletedThrough(1, 29));
    const milestone = detectMilestone(habit);
    expect(milestone).toEqual(expect.objectContaining({ kind: 'streak', days: 30 }));
  });
});

describe('detectMilestone — goal', () => {
  it('fires a goal milestone on the campaign end date', () => {
    const today = getToday();
    const habit = getHabitWithStatus({
      ...dailyHabitCompletedThrough(1, 3),
      endDate: today,
    });
    const milestone = detectMilestone(habit);
    expect(milestone?.kind).toBe('goal');
  });
});

describe('milestoneFlagKey', () => {
  it('produces distinct one-shot keys per milestone', () => {
    expect(
      milestoneFlagKey('h1', { kind: 'streak', days: 7, streak: 7, longest: 7, rate: 100 }),
    ).toBe('milestone:h1:streak:7');
    expect(milestoneFlagKey('h1', { kind: 'personalBest', streak: 31, previousBest: 30 })).toBe(
      'milestone:h1:pb:30',
    );
    expect(
      milestoneFlagKey('h1', {
        kind: 'goal',
        done: 3,
        expected: 3,
        missed: 0,
        unit: 'day',
        unitPlural: 'days',
      }),
    ).toBe('celebrated:h1:goal');
  });
});
