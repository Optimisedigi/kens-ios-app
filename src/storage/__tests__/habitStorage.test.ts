import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Habit } from '../../types/habit';
import { incrementCount, toggleSkipForDate, saveHabits } from '../habitStorage';

/**
 * In-memory AsyncStorage stand-in. Declared before the `vi.mock` factory
 * via hoisting so the mock can close over it. Mirrors the subset of the
 * AsyncStorage API the storage layer uses.
 */
const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string): Promise<string | null> => store.get(k) ?? null,
    setItem: async (k: string, v: string): Promise<void> => {
      store.set(k, v);
    },
    removeItem: async (k: string): Promise<void> => {
      store.delete(k);
    },
  },
}));

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Water',
    emoji: '💧',
    color: '#38BDF8',
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

/** Seed storage so loadHabits() (called inside the mutators) sees a fixed set. */
async function seed(habits: Habit[]): Promise<void> {
  store.clear();
  // Set the one-shot migration flags so loadHabits doesn't run backfills.
  store.set('migration:physicalExercise:2026-04-28', '1');
  store.set('migration:backfill:2026-04-30', '1');
  await saveHabits(habits);
}

describe('Feature 3 — incrementCount', () => {
  beforeEach(() => {
    store.clear();
  });

  it('increments counts and only adds to completions at the target threshold', async () => {
    const date = '2026-05-10';
    await seed([makeHabit({ target: 3, unit: 'glasses' })]);

    let after = await incrementCount('h1', date, 1);
    expect(after[0].counts[date]).toBe(1);
    expect(after[0].completions).not.toContain(date);

    after = await incrementCount('h1', date, 1);
    expect(after[0].counts[date]).toBe(2);
    expect(after[0].completions).not.toContain(date);

    after = await incrementCount('h1', date, 1);
    expect(after[0].counts[date]).toBe(3);
    // Threshold reached → date written into completions.
    expect(after[0].completions).toContain(date);
  });

  it('decrementing below target removes the completion date', async () => {
    const date = '2026-05-10';
    await seed([
      makeHabit({ target: 2, counts: { '2026-05-10': 2 }, completions: ['2026-05-10'] }),
    ]);

    const after = await incrementCount('h1', date, -1);
    expect(after[0].counts[date]).toBe(1);
    expect(after[0].completions).not.toContain(date);
  });

  it('clamps the count at zero and clears the key when it reaches zero', async () => {
    const date = '2026-05-10';
    await seed([makeHabit({ target: 5, counts: { '2026-05-10': 1 } })]);

    const after = await incrementCount('h1', date, -3);
    expect(after[0].counts[date]).toBeUndefined();
  });

  it('is a no-op for boolean habits (target null)', async () => {
    const date = '2026-05-10';
    await seed([makeHabit({ target: null })]);

    const after = await incrementCount('h1', date, 1);
    expect(after[0].counts[date]).toBeUndefined();
    expect(after[0].completions).not.toContain(date);
  });
});

describe('Feature 4 — toggleSkipForDate', () => {
  beforeEach(() => {
    store.clear();
  });

  it('marking a day skipped removes any completion on that day', async () => {
    const date = '2026-05-10';
    await seed([makeHabit({ completions: ['2026-05-10'] })]);

    const after = await toggleSkipForDate('h1', date);
    expect(after[0].skips).toContain(date);
    expect(after[0].completions).not.toContain(date);
  });

  it('un-skipping clears the skip and is idempotent toggling', async () => {
    const date = '2026-05-10';
    await seed([makeHabit({ skips: ['2026-05-10'] })]);

    const after = await toggleSkipForDate('h1', date);
    expect(after[0].skips).not.toContain(date);
  });
});
