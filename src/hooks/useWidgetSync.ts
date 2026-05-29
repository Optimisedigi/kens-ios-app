import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Habit } from '../types/habit';
import { loadHabits, toggleCompletionForDate } from '../storage/habitStorage';
import { drainPendingCompletions, publishWidgetSnapshot } from '../utils/widgetBridge';

/**
 * Keeps the Home/Lock-screen widget (Feature 1) in sync with the app:
 *  - publishes a compact snapshot to the App Group whenever habits change,
 *  - re-publishes and drains widget-originated completions on foreground.
 *
 * All side-effects no-op off iOS / in Expo Go (see `widgetBridge`).
 */
export function useWidgetSync(habits: Habit[], onChanged: () => void): void {
  // Publish on every habits change.
  useEffect(() => {
    publishWidgetSnapshot(habits);
  }, [habits]);

  // On foreground: drain any taps the widget recorded while we were away,
  // apply them, then re-publish so the widget reflects the merged state.
  useEffect(() => {
    const apply = async (): Promise<void> => {
      const pending = drainPendingCompletions();
      if (pending.length === 0) return;
      // Set-semantics: a widget tap completes a day and must never
      // un-complete it, so only toggle when the day isn't already done.
      for (const { habitId, isoDate } of pending) {
        const habits = await loadHabits();
        const habit = habits.find((h) => h.id === habitId);
        if (habit && !habit.completions.includes(isoDate)) {
          await toggleCompletionForDate(habitId, isoDate);
        }
      }
      onChanged();
    };

    void apply();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void apply();
    });
    return () => sub.remove();
  }, [onChanged]);
}
