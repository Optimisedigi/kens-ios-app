import { describe, expect, it } from 'vitest';
import { Habit } from '../../types/habit';
import { markComplete } from '../watchBridge';

/** Minimal valid Habit for tests. */
function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Test',
    emoji: '✅',
    color: '#34D399',
    createdAt: '2026-04-01',
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

describe('markComplete', () => {
  it('adds the date to an empty completions list (happy path)', () => {
    const habits = [makeHabit({ id: 'h1', completions: [] })];
    const result = markComplete(habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toBe(true);
    expect(result.habits[0].completions).toEqual(['2026-05-10']);
  });

  it('is idempotent when the date is already present', () => {
    const habits = [makeHabit({ id: 'h1', completions: ['2026-05-10'] })];
    const result = markComplete(habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toBe(false);
    expect(result.habits[0].completions).toEqual(['2026-05-10']);
  });

  it('calling twice for the same date returns identical completion contents and the second call is no-op', () => {
    const habits = [makeHabit({ id: 'h1', completions: [] })];
    const first = markComplete(habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = markComplete(first.habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.changed).toBe(false);
    expect(second.habits[0].completions).toEqual(first.habits[0].completions);
  });

  it('preserves sort order when inserting a middle date', () => {
    const habits = [makeHabit({ id: 'h1', completions: ['2026-05-01', '2026-05-20'] })];
    const result = markComplete(habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toBe(true);
    expect(result.habits[0].completions).toEqual(['2026-05-01', '2026-05-10', '2026-05-20']);
  });

  it('returns habit-not-found for unknown habit id', () => {
    const habits = [makeHabit({ id: 'h1' })];
    const result = markComplete(habits, { habitId: 'nope', isoDate: '2026-05-10' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('habit-not-found');
  });

  it('returns invalid-date for shape-matching but semantically impossible date (2024-13-40)', () => {
    const habits = [makeHabit({ id: 'h1' })];
    const result = markComplete(habits, { habitId: 'h1', isoDate: '2024-13-40' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid-date');
  });

  it('returns invalid-date for non-iso strings like "today"', () => {
    const habits = [makeHabit({ id: 'h1' })];
    const result = markComplete(habits, { habitId: 'h1', isoDate: 'today' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('invalid-date');
  });

  it('does not mutate the input habits array or the matched habit', () => {
    const originalCompletions = ['2026-05-01'];
    const habit = makeHabit({ id: 'h1', completions: originalCompletions });
    const habits = [habit];
    const habitsSnapshot = habits.slice();

    const result = markComplete(habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Input array reference contents unchanged.
    expect(habits).toEqual(habitsSnapshot);
    expect(habits[0]).toBe(habit);
    // Input habit object was not mutated.
    expect(habit.completions).toBe(originalCompletions);
    expect(habit.completions).toEqual(['2026-05-01']);
    // Output is a fresh array with a fresh habit object.
    expect(result.habits).not.toBe(habits);
    expect(result.habits[0]).not.toBe(habit);
    expect(result.habits[0].completions).not.toBe(originalCompletions);
  });

  it('does not mutate input on idempotent no-op either', () => {
    const habit = makeHabit({ id: 'h1', completions: ['2026-05-10'] });
    const habits = [habit];
    const completionsRef = habit.completions;

    const result = markComplete(habits, { habitId: 'h1', isoDate: '2026-05-10' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(habit.completions).toBe(completionsRef);
    expect(habit.completions).toEqual(['2026-05-10']);
  });
});
