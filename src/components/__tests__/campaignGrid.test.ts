import { afterEach, describe, expect, it, vi } from 'vitest';
import { Habit } from '../../types/habit';
import { getDueDayCount } from '../../utils/dateUtils';

/**
 * The CampaignGrid renders one box per due day in [createdAt, endDate]. Its
 * box count must equal `getDueDayCount` over that range, so a daily habit
 * running 7 days shows exactly 7 boxes (the user's reported expectation).
 * We assert the count contract directly (the grid maps 1:1 to it).
 */
function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    emoji: '✅',
    color: '#34D399',
    createdAt: '2026-05-04',
    completions: [],
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
    ...overrides,
  };
}

describe('Finite campaign box count', () => {
  afterEach(() => vi.useRealTimers());

  it('a daily habit running 7 days has exactly 7 due days', () => {
    const habit = makeHabit({
      frequency: { kind: 'interval', days: 1 },
      createdAt: '2026-05-04', // Mon
      endDate: '2026-05-10', // Sun (7 days inclusive)
    });
    expect(getDueDayCount(habit, habit.createdAt, habit.endDate!)).toBe(7);
  });

  it('an every-2-days habit over 7 days has 4 due days', () => {
    const habit = makeHabit({
      frequency: { kind: 'interval', days: 2 },
      createdAt: '2026-05-04',
      endDate: '2026-05-10',
    });
    // days 04,06,08,10 → 4 boxes
    expect(getDueDayCount(habit, habit.createdAt, habit.endDate!)).toBe(4);
  });

  it('a Mon–Fri weekday habit over one week has 5 due days', () => {
    const habit = makeHabit({
      frequency: { kind: 'weekdays', weekdays: [1, 2, 3, 4, 5] },
      createdAt: '2026-05-04', // Mon
      endDate: '2026-05-10', // Sun
    });
    expect(getDueDayCount(habit, habit.createdAt, habit.endDate!)).toBe(5);
  });
});
