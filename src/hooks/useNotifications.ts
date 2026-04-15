import { useCallback, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Habit, NotificationSettings } from "../types/habit";
import {
  loadNotificationSettings,
  saveNotificationSettings,
} from "../storage/habitStorage";
import { getHabitStatus } from "../utils/dateUtils";

// Configure how notifications are shown when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

  // Schedule notifications for habits that are at risk
  const scheduleHabitNotifications = useCallback(
    async (habits: Habit[]) => {
      if (!settings.enabled || !permissionGranted) return;

      // Cancel all existing scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      for (const habit of habits) {
        const status = getHabitStatus(habit);
        const freqLabel =
          habit.frequencyDays === 1
            ? "daily"
            : habit.frequencyDays === 7
              ? "weekly"
              : `every ${habit.frequencyDays} day`;

        if (status === "safe" || status === "new") {
          // About to miss twice — schedule warning
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⚠️ Don't miss twice!`,
              body: `Your ${freqLabel} habit ${habit.emoji} ${habit.name} is due — don't break the chain!`,
              data: { habitId: habit.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: settings.reminderHour,
              minute: settings.reminderMinute,
            },
          });
        } else if (status === "missed_twice") {
          // Already missed twice — urgent notification
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🔴 Missed twice!`,
              body: `You missed twice on your ${freqLabel} habit ${habit.emoji} ${habit.name}. Get back on track!`,
              data: { habitId: habit.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour: settings.reminderHour,
              minute: settings.reminderMinute,
            },
          });
        }
        // No notification needed for "completed_today" or "warning" (already handled by "safe")
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
