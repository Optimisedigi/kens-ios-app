import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { Habit } from '../types/habit';
import { loadHabits, toggleCompletionForDate } from '../storage/habitStorage';
import { getToday, parseDate } from '../utils/dateUtils';

/**
 * Apple Health auto-completion (Feature 7). iOS-only. Requires
 * `@kingstinct/react-native-healthkit` to be installed and a dev/production
 * build (it does not work in Expo Go). The library is lazy-required so the
 * app still runs when it isn't installed yet — the hook simply no-ops.
 */

/** HealthKit quantity/category identifiers per supported metric. */
const QUANTITY_IDENTIFIERS: Record<string, string> = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  water: 'HKQuantityTypeIdentifierDietaryWater',
};
const MINDFUL_IDENTIFIER = 'HKCategoryTypeIdentifierMindfulSession';
const WORKOUT_TYPE = 'HKWorkoutTypeIdentifier';

interface HealthKitModule {
  isHealthDataAvailable: () => Promise<boolean>;
  requestAuthorization: (input: { toRead: string[] }) => Promise<boolean>;
  queryQuantitySamples?: (
    identifier: string,
    options: { from: Date; to: Date },
  ) => Promise<{ quantity: number }[]>;
  queryCategorySamples?: (
    identifier: string,
    options: { from: Date; to: Date },
  ) => Promise<{ startDate: string; endDate: string }[]>;
  queryWorkoutSamples?: (options: { from: Date; to: Date }) => Promise<unknown[]>;
}

function loadHealthKit(): HealthKitModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit') as HealthKitModule;
  } catch {
    return null;
  }
}

/** Read identifiers we need authorization for. */
const READ_IDENTIFIERS = [
  QUANTITY_IDENTIFIERS.steps,
  QUANTITY_IDENTIFIERS.water,
  MINDFUL_IDENTIFIER,
  WORKOUT_TYPE,
];

export type HealthPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';

/** Query today's total for a habit's linked metric; null if unsupported. */
async function queryTodayTotal(
  hk: HealthKitModule,
  metric: string,
  from: Date,
  to: Date,
): Promise<number | null> {
  try {
    if (metric === 'workouts') {
      const samples = (await hk.queryWorkoutSamples?.({ from, to })) ?? [];
      return samples.length;
    }
    if (metric === 'mindfulMinutes') {
      const samples = (await hk.queryCategorySamples?.(MINDFUL_IDENTIFIER, { from, to })) ?? [];
      let minutes = 0;
      for (const s of samples) {
        const start = new Date(s.startDate).getTime();
        const end = new Date(s.endDate).getTime();
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
          minutes += (end - start) / 60000;
        }
      }
      return Math.round(minutes);
    }
    const identifier = QUANTITY_IDENTIFIERS[metric];
    if (!identifier) return null;
    const samples = (await hk.queryQuantitySamples?.(identifier, { from, to })) ?? [];
    return samples.reduce((sum, s) => sum + (s.quantity ?? 0), 0);
  } catch {
    return null;
  }
}

export function useHealthSync(onChanged: () => void): { permission: HealthPermission } {
  const [permission, setPermission] = useState<HealthPermission>('unknown');

  const syncOnce = useCallback(async (): Promise<void> => {
    const hk = loadHealthKit();
    if (!hk) {
      setPermission('unavailable');
      return;
    }
    const available = await hk.isHealthDataAvailable().catch(() => false);
    if (!available) {
      setPermission('unavailable');
      return;
    }

    const habits = await loadHabits();
    const linked = habits.filter((h: Habit) => h.healthMetric !== null && h.target !== null);
    if (linked.length === 0) return;

    const granted = await hk.requestAuthorization({ toRead: READ_IDENTIFIERS }).catch(() => false);
    setPermission(granted ? 'granted' : 'denied');
    if (!granted) return;

    const today = getToday();
    const from = parseDate(today);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);

    let changed = false;
    for (const habit of linked) {
      if (habit.healthMetric === null || habit.target === null) continue;
      if (habit.completions.includes(today)) continue;
      const total = await queryTodayTotal(hk, habit.healthMetric, from, to);
      if (total !== null && total >= habit.target) {
        await toggleCompletionForDate(habit.id, today);
        changed = true;
      }
    }
    if (changed) onChanged();
  }, [onChanged]);

  useEffect(() => {
    void syncOnce();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncOnce();
    });
    return () => sub.remove();
  }, [syncOnce]);

  return { permission };
}
