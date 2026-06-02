import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { loadHabits, toggleCompletionForDate } from '../storage/habitStorage';
import { getToday } from '../utils/dateUtils';
import { HABIT_REMINDER_CATEGORY } from './useNotifications';

/**
 * Handle an interactive notification response (Feature 5). `complete` marks
 * the habit done for today (set-semantics via toggle on an uncompleted day);
 * `snooze` reschedules a one-off reminder in one hour. Exported for testing
 * and so cold-start handling can reuse it.
 */
export async function handleNotificationResponse(
  response: Notifications.NotificationResponse,
): Promise<void> {
  const { actionIdentifier, notification } = response;
  const data = notification.request.content.data as { habitId?: unknown } | null;
  const habitId = typeof data?.habitId === 'string' ? data.habitId : null;
  if (!habitId) return;

  if (actionIdentifier === 'complete') {
    const today = getToday();
    // Set-semantics, not toggle: completing from a notification must never
    // un-complete a day. Only toggle when the habit isn't already done today.
    const habits = await loadHabits();
    const habit = habits.find((h) => h.id === habitId);
    if (habit && !habit.completions.includes(today)) {
      await toggleCompletionForDate(habitId, today);
    }
    return;
  }

  if (actionIdentifier === 'snooze') {
    const content = notification.request.content;
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title ?? 'Habit reminder',
        body: content.body ?? "Don't break the chain!",
        data: content.data,
        categoryIdentifier: HABIT_REMINDER_CATEGORY,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: inOneHour,
      },
    });
  }
}

/**
 * Mounts the interactive-notification-action listener at the app root and
 * drains any cold-start response (a button tapped while the app was killed).
 * Calls `onChanged` after a state-mutating action so the caller can refresh
 * the in-memory habits snapshot.
 */
export function useNotificationActions(onChanged: () => void): void {
  useEffect(() => {
    // Interactive-notification APIs are native-only; skip on web (preview).
    if (Platform.OS === 'web') return;

    let cancelled = false;

    // Cold-start: the app may have been launched by tapping an action.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response) return;
      void handleNotificationResponse(response).then(() => {
        if (!cancelled) onChanged();
      });
    });

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleNotificationResponse(response).then(() => onChanged());
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [onChanged]);
}
