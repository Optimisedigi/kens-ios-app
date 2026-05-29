import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit } from '../types/habit';
import { getCurrentStreak } from './dateUtils';

const LIVE_ACTIVITY_ENABLED_KEY = 'liveActivityEnabled';

/** Whether the user has opted into "streak at risk" Live Activities. */
export async function isLiveActivityEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LIVE_ACTIVITY_ENABLED_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

/** Persist the Live Activity opt-in flag. */
export async function setLiveActivityEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(LIVE_ACTIVITY_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // Best-effort; a failed write just means the toggle won't persist.
  }
}

/**
 * Optional native bridge for ActivityKit. The apple-targets toolchain ships
 * the Live Activity *widget* but not a JS start/stop API, so we lazy-require
 * a module if one is linked (e.g. a custom Expo module named
 * `StreakLiveActivity`) and otherwise no-op. This keeps the JS side honest:
 * the Live Activity only appears once the native start API is wired in a
 * dev/production build — never in Expo Go.
 */
interface LiveActivityModule {
  startActivity: (input: {
    habitId: string;
    habitName: string;
    emoji: string;
    streak: number;
  }) => void;
  updateActivity: (input: { habitId: string; completed: boolean }) => void;
  endActivity: (input: { habitId: string }) => void;
}

function loadModule(): LiveActivityModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const expoModules = require('expo-modules-core') as {
      requireOptionalNativeModule?: (name: string) => LiveActivityModule | null;
    };
    return expoModules.requireOptionalNativeModule?.('StreakLiveActivity') ?? null;
  } catch {
    return null;
  }
}

/** Start a "streak at risk" Live Activity for a habit. No-ops when unsupported. */
export function startStreakActivity(habit: Habit): void {
  const mod = loadModule();
  if (!mod) return;
  try {
    mod.startActivity({
      habitId: habit.id,
      habitName: habit.name,
      emoji: habit.emoji,
      streak: getCurrentStreak(habit),
    });
  } catch {
    // Ignore — Live Activity is a non-critical enhancement.
  }
}

/** Mark a habit's Live Activity as completed (saves the streak). */
export function updateStreakActivity(habitId: string, completed: boolean): void {
  const mod = loadModule();
  if (!mod) return;
  try {
    mod.updateActivity({ habitId, completed });
  } catch {
    /* ignore */
  }
}

/** End a habit's Live Activity (completed or day rolled over). */
export function endStreakActivity(habitId: string): void {
  const mod = loadModule();
  if (!mod) return;
  try {
    mod.endActivity({ habitId });
  } catch {
    /* ignore */
  }
}
