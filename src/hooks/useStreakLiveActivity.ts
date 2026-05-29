import { useEffect, useRef } from 'react';
import { Habit, isDayComplete } from '../types/habit';
import { getHabitStatus, getToday } from '../utils/dateUtils';
import {
  endStreakActivity,
  isLiveActivityEnabled,
  startStreakActivity,
  updateStreakActivity,
} from '../utils/liveActivity';

/**
 * Drives the "streak in danger" Live Activity (Feature 2). When a habit
 * transitions into the `warning` state it starts an activity (behind the
 * Settings opt-in); when the habit is completed or leaves the warning state
 * it ends the activity. All side-effects no-op unless a native ActivityKit
 * module is linked in a dev/production build.
 */
export function useStreakLiveActivity(habits: Habit[]): void {
  // Track which habits currently have a live activity so we only act on
  // transitions, not on every render.
  const activeRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const sync = async (): Promise<void> => {
      const enabled = await isLiveActivityEnabled();
      if (cancelled) return;
      const today = getToday();
      const active = activeRef.current;

      for (const habit of habits) {
        const status = getHabitStatus(habit);
        const completed = isDayComplete(habit, today);
        const isActive = active.has(habit.id);

        if (enabled && status === 'warning' && !completed && !isActive) {
          startStreakActivity(habit);
          active.add(habit.id);
        } else if (isActive && completed) {
          updateStreakActivity(habit.id, true);
          endStreakActivity(habit.id);
          active.delete(habit.id);
        } else if (isActive && status !== 'warning') {
          // Recovered or rolled over out of the warning window.
          endStreakActivity(habit.id);
          active.delete(habit.id);
        }
      }

      // If the user turned the feature off, tear everything down.
      if (!enabled && active.size > 0) {
        for (const id of active) endStreakActivity(id);
        active.clear();
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [habits]);
}
