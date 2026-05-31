import { describe, expect, it } from 'vitest';
import { Habit, isDayComplete, isSkipped } from '../habit';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    emoji: '✅',
    color: '#34D399',
    createdAt: '2026-05-01',
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

describe('isSkipped', () => {
  it('is true only for dates in the skips list', () => {
    const habit = makeHabit({ skips: ['2026-05-03'] });
    expect(isSkipped(habit, '2026-05-03')).toBe(true);
    expect(isSkipped(habit, '2026-05-04')).toBe(false);
  });
});

describe('isDayComplete', () => {
  it('boolean habit: true iff the date is in completions', () => {
    const habit = makeHabit({ completions: ['2026-05-02'] });
    expect(isDayComplete(habit, '2026-05-02')).toBe(true);
    expect(isDayComplete(habit, '2026-05-03')).toBe(false);
  });

  it('measurable habit: true iff the day count reached the target', () => {
    const habit = makeHabit({ target: 3, counts: { '2026-05-02': 3, '2026-05-03': 2 } });
    expect(isDayComplete(habit, '2026-05-02')).toBe(true); // 3 >= 3
    expect(isDayComplete(habit, '2026-05-03')).toBe(false); // 2 < 3
    expect(isDayComplete(habit, '2026-05-04')).toBe(false); // missing key → 0
  });

  it('measurable habit ignores completions array when target is set', () => {
    // Even if a date leaked into completions, the count is the source of truth.
    const habit = makeHabit({ target: 5, counts: {}, completions: ['2026-05-02'] });
    expect(isDayComplete(habit, '2026-05-02')).toBe(false);
  });
});
