import { afterEach, describe, expect, it, vi } from 'vitest';

import { Habit } from '../../types/habit';
import { buildWidgetSnapshot } from '../widgetBridge';

// widgetBridge imports `react-native` (Platform) at the top level, which the
// node test environment can't parse. Mock it to the minimal surface used.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

function freezeToday(dateStr: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${dateStr}T12:00:00`));
}

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

describe('buildWidgetSnapshot', () => {
  afterEach(() => vi.useRealTimers());

  it('serialises today and the compact per-habit fields', () => {
    freezeToday('2026-05-10');
    const snapshot = buildWidgetSnapshot([
      makeHabit({ id: 'a', name: 'Read', completions: ['2026-05-10'] }),
    ]);
    expect(snapshot.today).toBe('2026-05-10');
    expect(snapshot.habits).toHaveLength(1);
    const h = snapshot.habits[0];
    expect(h.id).toBe('a');
    expect(h.name).toBe('Read');
    expect(h.completedToday).toBe(true);
    expect(typeof h.currentStreak).toBe('number');
    expect(typeof h.status).toBe('string');
  });

  it('reports completedToday=false for an uncompleted boolean habit', () => {
    freezeToday('2026-05-10');
    const snapshot = buildWidgetSnapshot([makeHabit({ completions: [] })]);
    expect(snapshot.habits[0].completedToday).toBe(false);
  });

  it('measurable habit: completedToday flips only at the target, count is reported', () => {
    freezeToday('2026-05-10');
    const below = buildWidgetSnapshot([
      makeHabit({ target: 8, unit: 'glasses', counts: { '2026-05-10': 3 } }),
    ]);
    expect(below.habits[0].count).toBe(3);
    expect(below.habits[0].target).toBe(8);
    expect(below.habits[0].completedToday).toBe(false);

    const atTarget = buildWidgetSnapshot([
      makeHabit({ target: 8, counts: { '2026-05-10': 8 }, completions: ['2026-05-10'] }),
    ]);
    expect(atTarget.habits[0].completedToday).toBe(true);
  });

  it('boolean habits report target null and count 0', () => {
    freezeToday('2026-05-10');
    const snapshot = buildWidgetSnapshot([makeHabit({ target: null })]);
    expect(snapshot.habits[0].target).toBeNull();
    expect(snapshot.habits[0].count).toBe(0);
  });
});
