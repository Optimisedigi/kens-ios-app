import AsyncStorage from "@react-native-async-storage/async-storage";
import { Habit, NotificationSettings } from "../types/habit";
import { getToday } from "../utils/dateUtils";

const HABITS_KEY = "habits";
const NOTIFICATION_SETTINGS_KEY = "notification_settings";

/** Load all habits from storage (migrates old habits missing frequencyDays) */
export async function loadHabits(): Promise<Habit[]> {
  try {
    const json = await AsyncStorage.getItem(HABITS_KEY);
    if (!json) return [];
    const habits = JSON.parse(json) as Habit[];
    // Migrate old habits that don't have frequencyDays
    return habits.map((h) => ({
      ...h,
      frequencyDays: h.frequencyDays ?? 1,
    }));
  } catch (error) {
    console.error("Failed to load habits:", error);
    return [];
  }
}

/** Save all habits to storage */
export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error("Failed to save habits:", error);
  }
}

/** Add a new habit */
export async function addHabit(
  name: string,
  emoji: string,
  frequencyDays: number = 1
): Promise<Habit[]> {
  const habits = await loadHabits();
  const newHabit: Habit = {
    id: generateId(),
    name,
    emoji,
    createdAt: getToday(),
    completions: [],
    frequencyDays,
  };
  const updated = [...habits, newHabit];
  await saveHabits(updated);
  return updated;
}

/** Update a habit's name, emoji, and/or frequency */
export async function updateHabit(
  id: string,
  updates: Partial<Pick<Habit, "name" | "emoji" | "frequencyDays">>
): Promise<Habit[]> {
  const habits = await loadHabits();
  const updated = habits.map((h) =>
    h.id === id ? { ...h, ...updates } : h
  );
  await saveHabits(updated);
  return updated;
}

/** Delete a habit by ID */
export async function deleteHabit(id: string): Promise<Habit[]> {
  const habits = await loadHabits();
  const updated = habits.filter((h) => h.id !== id);
  await saveHabits(updated);
  return updated;
}

/** Toggle completion for today on a habit */
export async function toggleCompletion(id: string): Promise<Habit[]> {
  const habits = await loadHabits();
  const today = getToday();
  const updated = habits.map((h) => {
    if (h.id !== id) return h;
    const alreadyCompleted = h.completions.includes(today);
    return {
      ...h,
      completions: alreadyCompleted
        ? h.completions.filter((d) => d !== today)
        : [...h.completions, today],
    };
  });
  await saveHabits(updated);
  return updated;
}

/** Load notification settings */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!json)
      return { enabled: true, reminderHour: 20, reminderMinute: 0 }; // Default: 8pm
    return JSON.parse(json) as NotificationSettings;
  } catch (error) {
    console.error("Failed to load notification settings:", error);
    return { enabled: true, reminderHour: 20, reminderMinute: 0 };
  }
}

/** Save notification settings */
export async function saveNotificationSettings(
  settings: NotificationSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify(settings)
    );
  } catch (error) {
    console.error("Failed to save notification settings:", error);
  }
}

/** Generate a simple unique ID */
function generateId(): string {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 9)
  );
}
