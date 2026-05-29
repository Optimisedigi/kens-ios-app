import { Platform } from 'react-native';
import { Habit, isDayComplete } from '../types/habit';
import { getHabitStatus, getCurrentStreak, getToday } from './dateUtils';

/** App Group shared with the widget + Live Activity targets. */
export const APP_GROUP = 'group.com.optimisedigital.nevermisstwice';
/** Key the widget reads its snapshot from inside the App Group defaults. */
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshot';
/**
 * Key the widget App Intent writes completions into when the user taps a
 * checkbox without opening the app. The app drains this on next foreground.
 */
export const PENDING_COMPLETIONS_KEY = 'pendingCompletions';

/** Per-habit summary the widget renders. Kept compact — strings/numbers only. */
export interface WidgetHabit {
  id: string;
  name: string;
  emoji: string;
  /** Hex like "#34D399". */
  color: string;
  /** Engine status, used to pick the accent + "at risk" ordering. */
  status: string;
  completedToday: boolean;
  currentStreak: number;
  /** Measurable habits only; 0/null otherwise. */
  count: number;
  target: number | null;
}

export interface WidgetSnapshot {
  habits: WidgetHabit[];
  /** YYYY-MM-DD the app considers "today". */
  today: string;
}

/** Build the compact snapshot the widget timeline provider reads. */
export function buildWidgetSnapshot(habits: Habit[]): WidgetSnapshot {
  const today = getToday();
  return {
    today,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      status: getHabitStatus(h),
      completedToday: isDayComplete(h, today),
      currentStreak: getCurrentStreak(h),
      count: h.counts[today] ?? 0,
      target: h.target,
    })),
  };
}

interface ExtensionStorageLike {
  set: (key: string, value: unknown) => void;
  get: (key: string) => string | null;
  remove: (key: string) => void;
}

interface ExtensionStorageCtor {
  new (appGroup: string): ExtensionStorageLike;
  reloadWidget: (name?: string) => void;
  get: (key: string) => string | null;
}

/**
 * Lazy-require apple-targets' `ExtensionStorage`. It's a native module that
 * doesn't exist in Expo Go or on Android, so we guard both and no-op when
 * unavailable — exactly like the watch bridge.
 */
function loadExtensionStorage(): ExtensionStorageCtor | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@bacons/apple-targets') as { ExtensionStorage?: ExtensionStorageCtor };
    return mod.ExtensionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Publish the snapshot to the App Group and reload the widget timeline.
 * No-ops off iOS / in Expo Go. Pure side-effect; safe to call on every
 * habits change and on foreground.
 */
export function publishWidgetSnapshot(habits: Habit[]): void {
  const ExtensionStorage = loadExtensionStorage();
  if (!ExtensionStorage) return;
  try {
    const storage = new ExtensionStorage(APP_GROUP);
    const snapshot = buildWidgetSnapshot(habits);
    storage.set(WIDGET_SNAPSHOT_KEY, JSON.stringify(snapshot));
    ExtensionStorage.reloadWidget();
  } catch {
    // Never let a widget publish failure surface to the user.
  }
}

/**
 * Drain widget-originated completions written to the App Group by the
 * widget's App Intent. Returns the list of `{ habitId, isoDate }` the app
 * should apply, and clears the pending key. No-ops off iOS.
 */
export function drainPendingCompletions(): { habitId: string; isoDate: string }[] {
  const ExtensionStorage = loadExtensionStorage();
  if (!ExtensionStorage) return [];
  try {
    const raw = ExtensionStorage.get(PENDING_COMPLETIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const result: { habitId: string; isoDate: string }[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof (item as { habitId?: unknown }).habitId === 'string' &&
        typeof (item as { isoDate?: unknown }).isoDate === 'string'
      ) {
        result.push({
          habitId: (item as { habitId: string }).habitId,
          isoDate: (item as { isoDate: string }).isoDate,
        });
      }
    }
    const storage = new ExtensionStorage(APP_GROUP);
    storage.remove(PENDING_COMPLETIONS_KEY);
    return result;
  } catch {
    return [];
  }
}
