import { afterEach, describe, expect, it, vi } from 'vitest';
import { Habit } from '../../types/habit';
import { getRecoveryStats } from '../resilience';

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

function freezeToday(dateStr: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${dateStr}T12:00:00`));
}

describe('Feature 6 — getRecoveryStats', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a habit completed every day has no slips and scores 100', () => {
    freezeToday('2026-05-05');
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05'],
    });
    const stats = getRecoveryStats(habit);
    expect(stats.slips).toBe(0);
    expect(stats.resilienceScore).toBe(100);
    expect(stats.recoveryRate).toBe(0);
  });

  it('every slip is followed by a completion → recovery rate 100%', () => {
    freezeToday('2026-05-08');
    // Daily habit. Complete 05-01; the single missed-twice crossing lands on
    // 05-03; recover on 05-04 (the only slip, fully recovered).
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: [
        '2026-05-01',
        '2026-05-04',
        '2026-05-05',
        '2026-05-06',
        '2026-05-07',
        '2026-05-08',
      ],
    });
    const stats = getRecoveryStats(habit);
    expect(stats.slips).toBe(1);
    expect(stats.recoveries).toBe(1);
    expect(stats.recoveryRate).toBe(1);
    expect(stats.avgComebackDays).not.toBeNull();
  });

  it('a slip never followed by a completion yields recovery rate 0', () => {
    freezeToday('2026-05-20');
    // One completion then silence — the slip is never recovered.
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01'],
    });
    const stats = getRecoveryStats(habit);
    expect(stats.slips).toBeGreaterThanOrEqual(1);
    expect(stats.recoveries).toBe(0);
    expect(stats.recoveryRate).toBe(0);
    expect(stats.avgComebackDays).toBeNull();
  });

  it('skipped days are not counted as slips', () => {
    freezeToday('2026-05-20');
    // Baseline: one completion then silence → a missed-twice crossing exists.
    const baseline = getRecoveryStats(
      makeHabit({ createdAt: '2026-05-01', completions: ['2026-05-01'] }),
    );
    expect(baseline.slips).toBeGreaterThanOrEqual(1);

    // Skip every day after the lone completion through today so the cadence
    // clock is paused and no missed-twice crossing can register.
    const skips: string[] = [];
    for (let d = 2; d <= 20; d++) {
      skips.push(`2026-05-${String(d).padStart(2, '0')}`);
    }
    const withSkip = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01'],
      skips,
    });
    const stats = getRecoveryStats(withSkip);
    expect(stats.slips).toBe(0);
    expect(stats.slips).toBeLessThan(baseline.slips);
  });

  it('produces a deterministic score for a fixed fixture', () => {
    freezeToday('2026-05-20');
    const habit = makeHabit({
      createdAt: '2026-05-01',
      completions: ['2026-05-01', '2026-05-04', '2026-05-05', '2026-05-06'],
    });
    const a = getRecoveryStats(habit);
    const b = getRecoveryStats(habit);
    expect(a.resilienceScore).toBe(b.resilienceScore);
    expect(a.resilienceScore).toBeGreaterThan(0);
    expect(a.resilienceScore).toBeLessThanOrEqual(100);
  });
});
