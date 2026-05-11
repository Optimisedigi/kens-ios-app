import { useCallback, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Habit, NotificationSettings, getFrequencyLabel } from "../types/habit";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "../storage/habitStorage";
import { getToday, parseDate, addDays } from "../utils/dateUtils";

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Build the notification body line for a habit */
function buildBody(habit: Habit): string {
  if (habit.frequency.kind === "perWeek") {
    const target = habit.frequency.daysPerWeek;
    const label = target === 1 ? "1 day this week" : `${target} days this week`;
    return `${habit.emoji} ${habit.name} — aim for ${label}, don't break the chain!`;
  }
  if (habit.frequency.kind === "weekdays") {
    return `${habit.emoji} ${habit.name} — today's a ${getFrequencyLabel(
      habit.frequency
    ).toLowerCase()} day, don't break the chain!`;
  }
  const f = habit.frequency.days;
  const freqLabel =
    f === 1 ? "today" : f === 7 ? "this week" : `every ${f} days`;
  return `${habit.emoji} ${habit.name} is due ${freqLabel} — don't break the chain!`;
}

/**
 * Returns the next date (Date object, at the reminder time) the habit is due,
 * starting from today or later. Used for non-daily, non-weekly cadences.
 */
function getNextIntervalDueDate(
  habit: Habit,
  intervalDays: number,
  hour: number,
  minute: number
): Date {
  const todayStr = getToday();
  const f = intervalDays;
  const created = parseDate(habit.createdAt);

  // Find the next due day on or after today, aligned to createdAt
  const todayDate = parseDate(todayStr);
  const daysSinceCreated = Math.round(
    (todayDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysIntoCycle = ((daysSinceCreated % f) + f) % f;
  const daysUntilNextSlot = daysIntoCycle === 0 ? 0 : f - daysIntoCycle;

  let dueStr = addDays(todayStr, daysUntilNextSlot);

  // If today is the due day but the user already completed it, jump to next cycle
  if (
    daysUntilNextSlot === 0 &&
    habit.completions.includes(dueStr)
  ) {
    dueStr = addDays(dueStr, f);
  }

  // Build a Date at hour:minute on dueStr; if that's already passed today, push by f days
  const due = parseDate(dueStr);
  due.setHours(hour, minute, 0, 0);
  if (due.getTime() <= Date.now()) {
    due.setDate(due.getDate() + f);
  }
  return due;
}

/** Counts completions in the rolling 7-day window ending today (inclusive). */
function completionsThisRollingWeek(habit: Habit): number {
  const today = getToday();
  const set = new Set(habit.completions);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(today, -i);
    if (day < habit.createdAt) break;
    if (set.has(day)) count++;
  }
  return count;
}

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    reminderHour: 20,
    reminderMinute: 0,
  });
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Load saved settings
  useEffect(() => {
    loadNotificationSettings().then(setSettings);
  }, []);

  // Request permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (!Device.isDevice) {
      console.log("Notifications only work on physical devices");
      return false;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === "granted";
    setPermissionGranted(granted);
    return granted;
  }, []);

  // Check permissions on mount
  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionGranted(status === "granted");
    });
  }, []);

  /**
   * Schedules one repeating reminder per habit, on its own frequency:
   * - Interval/Daily (f=1):  fires every day at the reminder time
   * - Interval/Weekly (f=7): fires once a week on the createdAt weekday
   * - Interval/Every N:      one-off on the next due date; re-scheduled on
   *                          each call (we cancel & re-create everything).
   * - PerWeek (K days/week): if the user has already hit K completions in
   *                          the rolling 7-day window ending today, skip
   *                          (will be re-evaluated when the app re-opens).
   *                          Otherwise fire daily at the reminder time.
   */
  // Guard against overlapping invocations — if `scheduleHabitNotifications`
  // is called while a previous invocation is still in flight, the older one
  // can register notifications *after* the newer one already cancelled,
  // producing duplicates. We track a monotonically-increasing run id; only
  // the latest run is allowed to actually schedule.
  const runIdRef = useRef(0);

  const scheduleHabitNotifications = useCallback(
    async (habits: Habit[]) => {
      if (!settings.enabled || !permissionGranted) return;

      const myRunId = ++runIdRef.current;
      const isStale = () => runIdRef.current !== myRunId;

      // Cancel all existing scheduled notifications and re-schedule cleanly.
      // Also clear any already-delivered (visible in Notification Centre)
      // notifications from this app, so old copy/styling can't linger after
      // an update.
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      if (isStale()) return;

      for (const habit of habits) {
        if (isStale()) return;
        // Skip habits the user has explicitly opted out of reminders for.
        if (
          habit.reminderHour === null ||
          habit.reminderMinute === null
        ) {
          continue;
        }
        const title = `Time for ${habit.name}`;
        const body = buildBody(habit);
        const data = { habitId: habit.id };
        const hour = habit.reminderHour;
        const minute = habit.reminderMinute;

        try {
          if (habit.frequency.kind === "weekdays") {
            // Schedule one weekly repeating reminder per selected weekday.
            // expo-notifications weekday: 1=Sunday … 7=Saturday, so add 1.
            for (const dow of habit.frequency.weekdays) {
              const weekday = dow + 1;
              await Notifications.scheduleNotificationAsync({
                content: { title, body, data },
                trigger: {
                  type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                  weekday,
                  hour,
                  minute,
                },
              });
            }
            continue;
          }

          if (habit.frequency.kind === "perWeek") {
            // Skip if already on track this rolling week.
            const done = completionsThisRollingWeek(habit);
            if (done >= habit.frequency.daysPerWeek) continue;

            await Notifications.scheduleNotificationAsync({
              content: { title, body, data },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
              },
            });
            continue;
          }

          const f = habit.frequency.days;
          if (f === 1) {
            await Notifications.scheduleNotificationAsync({
              content: { title, body, data },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour,
                minute,
              },
            });
          } else if (f === 7) {
            // Fire weekly on the weekday the habit was created
            const created = parseDate(habit.createdAt);
            // expo-notifications weekday: 1=Sunday … 7=Saturday
            const weekday = created.getDay() + 1;
            await Notifications.scheduleNotificationAsync({
              content: { title, body, data },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday,
                hour,
                minute,
              },
            });
          } else {
            // Every N days: schedule next due date as a one-off.
            const nextDue = getNextIntervalDueDate(habit, f, hour, minute);
            await Notifications.scheduleNotificationAsync({
              content: { title, body, data },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: nextDue,
              },
            });
          }
        } catch (err) {
          console.error(
            `Failed to schedule notification for habit "${habit.name}":`,
            err
          );
        }
      }
    },
    [settings, permissionGranted]
  );

  // Update notification settings
  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>) => {
      const updated = { ...settings, ...newSettings };
      setSettings(updated);
      await saveNotificationSettings(updated);
    },
    [settings]
  );

  // Toggle notifications on/off
  const toggleNotifications = useCallback(async () => {
    const newEnabled = !settings.enabled;

    if (newEnabled) {
      const granted = await requestPermissions();
      if (!granted) return;
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }

    await updateSettings({ enabled: newEnabled });
  }, [settings, requestPermissions, updateSettings]);

  return {
    settings,
    permissionGranted,
    requestPermissions,
    scheduleHabitNotifications,
    updateSettings,
    toggleNotifications,
  };
}
