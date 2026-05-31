import { afterEach, describe, expect, it, vi } from 'vitest';
import { Habit } from '../../types/habit';
import { getCompletionRate, getCurrentStreak, getDayStatus, getHabitStatus } from '../dateUtils';

/** Minimal valid Habit for tests; daily interval cadence by default. */
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

/** Pin "today" so streak/status math is deterministic. */
function freezeToday(dateStr: string): void {
  vi.useFakeTimers();
  // Local-midnight of the given day so getToday() formats to dateStr.
  vi.setSystemTime(new Date(`${dateStr}T12:00:00`));
}

describe('Feature 4 — skip / off-day (interval daily)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a skipped due-day between two completions keeps the current streak unbroken', () => {
    freezeToday('2026-05-05');
    // Daily habit: completed 1,2,4,5 with 3rd skipped. Without skip support
    // the gap 2→4 would be 2 days and break the daily streak.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-02', '2026-05-04', '2026-05-05'],
      skips: ['2026-05-03'],
    });
    expect(getCurrentStreak(habit)).toBe(3);
  });

  it('a skipped due-day is excluded from the completion-rate denominator', () => {
    freezeToday('2026-05-05');
    // 5 days of history (May 1–5), 1 skipped → denominator 4. Two completions.
    const withSkip = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01', '2026-05-02'],
      skips: ['2026-05-03'],
    });
    const withoutSkip = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01', '2026-05-02'],
      skips: [],
    });
    expect(getCompletionRate(withSkip)).toBeCloseTo(2 / 4, 5);
    expect(getCompletionRate(withoutSkip)).toBeCloseTo(2 / 5, 5);
  });

  it('getDayStatus returns "skipped" for an explicitly skipped day', () => {
    freezeToday('2026-05-10');
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01'],
      skips: ['2026-05-04'],
    });
    expect(getDayStatus(habit, '2026-05-04')).toBe('skipped');
  });

  it('a skipped day is never marked missed_twice', () => {
    freezeToday('2026-05-10');
    // Long gap that would normally produce a missed_twice marker, but the
    // crossing day itself is skipped.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01'],
      skips: ['2026-05-03'],
    });
    // 2026-05-03 would be the f*2 crossing for a daily habit (anchor 05-01).
    expect(getDayStatus(habit, '2026-05-03')).toBe('skipped');
  });

  it('skips pause the live status so the habit stays safe over an off day', () => {
    freezeToday('2026-05-05');
    // Completed yesterday-equivalent (05-03), 05-04 skipped, nothing today.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-03'],
      skips: ['2026-05-04'],
    });
    // Effective gap from last completion (05-03) to today (05-05) minus the
    // skipped 05-04 = 1 day < f (1)*... still inside grace → not missed_twice.
    expect(getHabitStatus(habit)).not.toBe('missed_twice');
  });
});

describe('Feature 4 — skip / off-day (weekdays cadence)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a skipped weekday due-day does not break the streak', () => {
    freezeToday('2026-05-15'); // Friday
    // Mon–Fri habit. 2026-05-04(Mon),05(Tue),06(Wed),07(Thu),08(Fri),
    // 11(Mon),12(Tue) completed; 13(Wed) skipped; 14(Thu),15(Fri) completed.
    const habit = makeHabit({
      createdAt: '2026-05-04',
      frequency: { kind: 'weekdays', weekdays: [1, 2, 3, 4, 5] },
      completions: [
        '2026-05-04',
        '2026-05-05',
        '2026-05-06',
        '2026-05-07',
        '2026-05-08',
        '2026-05-11',
        '2026-05-12',
        '2026-05-14',
        '2026-05-15',
      ],
      skips: ['2026-05-13'],
    });
    // 9 completed due-days, the missed Wed is skipped so chain is intact.
    expect(getCurrentStreak(habit)).toBe(9);
  });
});

describe('Feature 3 — measurable habit streak/status semantics', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a measurable day only counts toward the streak once its date is in completions', () => {
    freezeToday('2026-05-03');
    // Daily measurable habit. Threshold reached on 01 and 02 (dates written
    // into completions by incrementCount), partial on 03 (not yet in
    // completions) — streak counts the two complete days.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      target: 8,
      unit: 'glasses',
      counts: { '2026-05-01': 8, '2026-05-02': 8, '2026-05-03': 3 },
      completions: ['2026-05-01', '2026-05-02'],
    });
    // Two consecutive complete days; today's partial doesn't break it.
    expect(getCurrentStreak(habit)).toBe(2);
    expect(getHabitStatus(habit)).not.toBe('missed_twice');
  });

  it('a measurable partial day is not "completed_today"', () => {
    freezeToday('2026-05-02');
    const habit = makeHabit({
      createdAt: '2026-05-01',
      target: 5,
      counts: { '2026-05-02': 2 },
      completions: [],
    });
    // Only 2/5 today → not completed.
    expect(getHabitStatus(habit)).not.toBe('completed_today');
  });
});

describe('Feature 4 — interval skip boundary', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('two consecutive skipped days still pause an every-2-day cadence', () => {
    freezeToday('2026-05-06');
    // every-2-days habit completed 05-01; 05-03 and 05-05 skipped. Without
    // skip support the gap to today would trip missed_twice; with skips the
    // cadence clock is paused.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      frequency: { kind: 'interval', days: 2 },
      completions: ['2026-05-01'],
      skips: ['2026-05-03', '2026-05-05'],
    });
    expect(getHabitStatus(habit)).not.toBe('missed_twice');
  });

  it('completion rate excludes multiple skipped days from the denominator', () => {
    freezeToday('2026-05-05');
    // 5 days history, 2 skipped → denominator 3; 3 completions → 100%.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01', '2026-05-02', '2026-05-05'],
      skips: ['2026-05-03', '2026-05-04'],
    });
    expect(getCompletionRate(habit)).toBeCloseTo(1, 5);
  });
});
