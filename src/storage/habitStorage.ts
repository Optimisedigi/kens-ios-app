import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HABIT_COLOR_PALETTE, HabitFrequency, NotificationSettings } from '../types/habit';
import { getToday } from '../utils/dateUtils';

export const DEFAULT_HABIT_COLOR = HABIT_COLOR_PALETTE[0];

const HABITS_KEY = 'habits';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

/**
 * Stored habit shape on disk — accommodates the legacy `frequencyDays: number`
 * field and the newer `frequency` discriminated union. We migrate on read.
 */
interface StoredHabit extends Omit<
  Habit,
  | 'frequency'
  | 'reminderHour'
  | 'reminderMinute'
  | 'notes'
  | 'endDate'
  | 'target'
  | 'unit'
  | 'counts'
  | 'skips'
  | 'healthMetric'
> {
  frequency?: HabitFrequency;
  frequencyDays?: number;
  reminderHour?: number | null;
  reminderMinute?: number | null;
  notes?: Record<string, string>;
  endDate?: string | null;
  target?: number | null;
  unit?: string | null;
  counts?: Record<string, number>;
  skips?: string[];
  healthMetric?: string | null;
}

/** Load all habits from storage (migrates legacy `frequencyDays` and missing `color`) */
export async function loadHabits(): Promise<Habit[]> {
  try {
    const json = await AsyncStorage.getItem(HABITS_KEY);
    if (!json) return [];
    const habits = JSON.parse(json) as StoredHabit[];
    let needsSave = false;

    // Seed for habits that don't yet have a per-habit reminder time —
    // pull whatever the legacy global time was so existing habits keep
    // firing at the same time the user already chose.
    const seed = await loadNotificationSettings();
    const migrated: Habit[] = habits.map((h) => {
      let frequency: HabitFrequency;
      if (h.frequency) {
        frequency = h.frequency;
        // Defensive: a stored weekdays array with no days selected is
        // meaningless (the habit would never be due) — coerce to Daily so
        // a corrupt habit can't crash the screen.
        if (
          frequency.kind === 'weekdays' &&
          (!Array.isArray(frequency.weekdays) || frequency.weekdays.length === 0)
        ) {
          frequency = { kind: 'interval', days: 1 };
          needsSave = true;
        }
      } else {
        // Legacy: only `frequencyDays` was stored. Treat as an interval.
        frequency = { kind: 'interval', days: h.frequencyDays ?? 1 };
        needsSave = true;
      }
      const color = DEFAULT_HABIT_COLOR;
      if (h.color !== DEFAULT_HABIT_COLOR) needsSave = true;
      const notes = h.notes && typeof h.notes === 'object' ? h.notes : {};
      if (!h.notes) needsSave = true;
      // Reminder values: `undefined` means "never set" — seed from the
      // legacy global time. `null` means "user explicitly turned off the
      // reminder" — leave it alone.
      let reminderHour: number | null;
      let reminderMinute: number | null;
      if (h.reminderHour === undefined && h.reminderMinute === undefined) {
        reminderHour = seed.reminderHour;
        reminderMinute = seed.reminderMinute;
        needsSave = true;
      } else {
        reminderHour = typeof h.reminderHour === 'number' ? h.reminderHour : null;
        reminderMinute = typeof h.reminderMinute === 'number' ? h.reminderMinute : null;
      }
      // `endDate` is optional on disk; missing = no end date (legacy
      // habits run indefinitely). Default to null without flipping
      // `needsSave` — we'll persist it the next time anything else
      // changes.
      const endDate = typeof h.endDate === 'string' || h.endDate === null ? h.endDate : null;
      // New optional fields (Features 3/4/7). Default without flipping
      // `needsSave` for fields that are absent on legacy habits — they get
      // persisted the next time anything else changes.
      const target = typeof h.target === 'number' ? h.target : null;
      const unit = typeof h.unit === 'string' ? h.unit : null;
      const counts = h.counts && typeof h.counts === 'object' ? h.counts : {};
      const skips = Array.isArray(h.skips) ? h.skips : [];
      const healthMetric = typeof h.healthMetric === 'string' ? h.healthMetric : null;
      return {
        id: h.id,
        name: h.name,
        emoji: h.emoji,
        color,
        createdAt: h.createdAt,
        completions: h.completions,
        frequency,
        notes,
        reminderHour,
        reminderMinute,
        endDate,
        target,
        unit,
        counts,
        skips,
        healthMetric,
      };
    });
    // ---------------------------------------------------------------
    // ONE-SHOT MIGRATION: reset "Physical exercise" createdAt to
    // 2026-04-28 and drop any completions before that date. Keyed on a
    // flag so it runs exactly once, then can be deleted in a follow-up.
    // ---------------------------------------------------------------
    const PHYS_EX_MIGRATION_KEY = 'migration:physicalExercise:2026-04-28';
    const cutoff = '2026-04-28';
    let physExMigrated = migrated;
    const alreadyRan = await AsyncStorage.getItem(PHYS_EX_MIGRATION_KEY);
    if (!alreadyRan) {
      let touched = false;
      physExMigrated = migrated.map((h) => {
        if (h.name.trim().toLowerCase() !== 'physical exercise') return h;
        const newCompletions = h.completions.filter((d) => d >= cutoff);
        const completionsChanged = newCompletions.length !== h.completions.length;
        if (h.createdAt === cutoff && !completionsChanged) return h;
        touched = true;
        return { ...h, createdAt: cutoff, completions: newCompletions };
      });
      if (touched) needsSave = true;
      await AsyncStorage.setItem(PHYS_EX_MIGRATION_KEY, '1');
    }

    // ---------------------------------------------------------------
    // ONE-SHOT MIGRATION: backfill "Physical exercise" history from CSV.
    // Adds completions + notes for ~2 years of past workouts, moves
    // createdAt back to the first entry. Adds a single Sleep before 10
    // completion for 2026-04-29. Keyed on a flag so it runs exactly once.
    // ---------------------------------------------------------------
    const BACKFILL_KEY = 'migration:backfill:2026-04-30';
    const backfillRan = await AsyncStorage.getItem(BACKFILL_KEY);
    if (!backfillRan) {
      const physExEntries: [string, string][] = [
        ['2024-04-04', 'Legs - 3'],
        ['2024-04-05', 'Push - 3'],
        ['2024-04-09', 'Pull - 4'],
        ['2024-04-10', 'Legs - 3'],
        ['2024-04-11', 'Push 2 - 3'],
        ['2024-04-12', 'Kot - 1'],
        ['2024-04-17', 'Kot - 1'],
        ['2024-04-18', 'Pull 2 - 3'],
        ['2024-04-24', 'Legs - 3'],
        ['2024-04-25', 'Push - 2'],
        ['2024-05-07', 'Pull 2 - 3'],
        ['2024-05-09', 'Push 2 - 2'],
        ['2024-05-12', 'Legs 2 - 1'],
        ['2024-05-14', 'Push - 3'],
        ['2024-05-15', 'Pull - 3'],
        ['2024-05-22', 'Legs - 3'],
        ['2024-05-23', 'Push 2 - 3'],
        ['2024-05-24', 'Pull 2 - 3'],
        ['2024-05-30', 'Legs 2 - 2'],
        ['2024-05-31', 'Push - 2'],
        ['2024-06-05', 'Pull - 3'],
        ['2024-06-12', 'Legs - 3'],
        ['2024-06-16', 'Push 2 - 2'],
        ['2024-06-17', 'Pull - 2'],
        ['2024-06-20', 'Legs 2 - 2'],
        ['2024-06-21', 'Push - 2'],
        ['2024-07-01', 'Legs - 2'],
        ['2024-07-02', 'Push - 2'],
        ['2024-07-05', 'Pull - 2'],
        ['2024-07-10', 'Legs 2 - 2'],
        ['2024-07-11', 'Push Ups (Heria) - 2'],
        ['2024-07-17', 'Pull 2 - 3'],
        ['2024-07-18', 'Legs - 3'],
        ['2024-07-19', 'Push - 3'],
        ['2024-08-21', 'Push - 2'],
        ['2024-08-22', 'Legs - 2'],
        ['2024-08-26', 'Back - 2'],
        ['2024-08-30', '30 Full Body -'],
        ['2024-09-03', 'Che - 2'],
        ['2024-09-04', 'Legs - 3'],
        ['2024-09-06', 'Pull 2 - 3'],
        ['2024-09-12', '30 30 60 -'],
        ['2024-09-19', 'Legs - 3'],
        ['2024-09-25', 'Pull 2 - 3'],
        ['2024-09-26', 'Push 2 - 2'],
        ['2024-09-30', 'Legs 2 - 2'],
        ['2024-10-01', 'Push - 2'],
        ['2024-10-03', 'Pull - 3'],
        ['2024-10-16', 'Legs - 2'],
        ['2024-10-29', 'Push 2 - 2'],
        ['2024-10-31', 'Pull 2 - 2'],
        ['2024-11-01', 'Legs 2 - 2'],
        ['2024-11-05', 'Push - 2'],
        ['2024-11-07', 'Legs - 2'],
        ['2024-11-12', 'Back - 2'],
        ['2024-11-17', 'Push -'],
        ['2024-12-25', 'Push - 3'],
        ['2025-01-08', 'Legs 2 - 3'],
        ['2025-01-09', 'Back - 3'],
        ['2025-01-15', 'Push 2 - 3'],
        ['2025-01-24', 'Full Body - 2'],
        ['2025-01-28', 'Legs - 3'],
        ['2025-01-29', 'Pull 2 - 3'],
        ['2025-01-31', 'Push - 3'],
        ['2025-02-05', 'Pull - 3'],
        ['2025-02-06', 'Legs 2 - 2'],
        ['2025-02-08', 'Push 2 - 3'],
        ['2025-02-12', 'Pull 2 - 3'],
        ['2025-02-13', 'Legs - 2'],
        ['2025-02-15', 'Push - 3'],
        ['2025-02-18', 'Pull - 3'],
        ['2025-02-19', 'Push 2 - 3'],
        ['2025-02-25', 'Legs 2 - 3'],
        ['2025-02-27', 'Pull 2 - 3'],
        ['2025-02-28', 'Push - 3'],
        ['2025-03-06', 'Legs - 2'],
        ['2025-03-07', 'Pull - 3'],
        ['2025-03-11', 'Push 2 - 3'],
        ['2025-03-12', 'Legs 2 - 2'],
        ['2025-03-13', 'Pull 2 - 3'],
        ['2025-03-25', 'Push - 3'],
        ['2025-03-26', 'Legs - 3'],
        ['2025-03-27', 'Pull - 3'],
        ['2025-03-29', 'Push 2 - 3'],
        ['2025-04-03', 'Legs 2 - 3'],
        ['2025-04-04', 'Pull 2 - 3'],
        ['2025-04-08', 'Push - 3'],
        ['2025-04-09', 'Legs - 3'],
        ['2025-04-10', 'Pull - 3'],
        ['2025-04-15', 'Push 2 - 2'],
        ['2025-04-16', 'Legs 2 - 2'],
        ['2025-04-17', 'Pull 2 - 3'],
        ['2025-04-29', 'Push - 3'],
        ['2025-05-14', 'Full Body - 1'],
        ['2025-05-18', 'Legs - 2'],
        ['2025-05-19', 'Push - 1'],
        ['2025-05-21', 'Pull - 3'],
        ['2025-05-22', 'Yoga - 30Mins'],
        ['2025-05-23', 'Full Body - 2.5'],
        ['2025-05-26', 'Yoga - 30Mins'],
        ['2025-05-27', 'Legs 2 - 3'],
        ['2025-05-28', 'Push 2 - 2'],
        ['2025-05-30', 'Pull 2 - 2'],
        ['2025-06-01', 'Yoga - 15Mins'],
        ['2025-06-02', 'Full Body -'],
        ['2025-06-04', 'Full Body -'],
        ['2025-06-05', 'Full Body -'],
        ['2025-06-08', 'Full Body -'],
        ['2025-06-12', 'Full Body -'],
        ['2025-07-16', 'Legs - 2'],
        ['2025-07-17', 'Pull - 2'],
        ['2025-07-18', 'Push - 2'],
        ['2025-07-21', 'Legs 2 - 2'],
        ['2025-07-22', 'Pull 2 - 2'],
        ['2025-07-23', 'Push 2 - 2'],
        ['2025-07-29', 'Legs - 2'],
        ['2025-07-31', 'Push - 2'],
        ['2025-08-14', 'Legs 2 - 3'],
        ['2025-08-15', 'Pull 2 - 3'],
        ['2025-08-19', 'Push 2 - 2'],
        ['2025-08-21', 'Legs - 2'],
        ['2025-08-27', 'Pull - 3'],
        ['2025-08-28', 'Push - 2'],
        ['2025-09-17', 'Legs - 3'],
        ['2025-09-18', 'Push - 3'],
        ['2025-09-19', 'Pull - 3'],
        ['2025-09-20', 'Legs 2 - 3'],
        ['2025-09-22', 'Pull 2 - 3'],
        ['2025-09-29', 'Push 2 - 3'],
        ['2025-09-30', 'Legs - 3'],
        ['2025-10-02', 'Pull - 3'],
        ['2025-10-03', 'Push - 3'],
        ['2025-10-08', 'Legs 2 - 2'],
        ['2025-10-09', 'Pull 2 - 3'],
        ['2025-10-14', 'Push 2 - 3'],
        ['2025-10-15', 'Legs - 2'],
        ['2025-10-17', 'Pull - 3'],
        ['2025-10-22', 'Push - 3'],
        ['2025-10-23', 'Legs 2 - 3'],
        ['2025-10-24', 'Pull 2 - 3'],
        ['2025-11-04', 'Push 2 - 2'],
        ['2025-12-01', 'Full Body - Light'],
        ['2025-12-06', 'Full Body - Light'],
        ['2025-12-11', 'Full Body - Light'],
        ['2026-01-05', 'Legs - 2'],
        ['2026-01-08', 'Push - 2'],
        ['2026-01-12', 'Pull - 3'],
        ['2026-01-14', 'Legs 2 - 2'],
        ['2026-01-15', 'Push 2 - 2'],
        ['2026-01-16', 'Pull 2 - 2'],
        ['2026-01-23', 'Full Body -'],
        ['2026-01-30', 'Full Body - 2'],
        ['2026-02-04', 'Legs - 2'],
        ['2026-02-06', 'Push - 2'],
        ['2026-02-11', 'Pull - 2'],
        ['2026-02-17', 'Push 2 - 2'],
        ['2026-02-23', 'Pilates -'],
        ['2026-02-27', 'Full Body -'],
        ['2026-03-06', 'Full Body -'],
      ];

      let touched = false;
      physExMigrated = physExMigrated.map((h) => {
        const lc = h.name.trim().toLowerCase();

        // Physical exercise: backfill all CSV entries.
        if (lc === 'physical exercise') {
          const completionSet = new Set(h.completions);
          const nextNotes = { ...h.notes };
          for (const [date, note] of physExEntries) {
            completionSet.add(date);
            // Don't overwrite a note the user has already saved manually
            // for the same date.
            if (nextNotes[date] === undefined) nextNotes[date] = note;
          }
          const earliest = physExEntries[0][0];
          const newCreatedAt = earliest < h.createdAt ? earliest : h.createdAt;
          const nextCompletions = Array.from(completionSet).sort();
          touched = true;
          return {
            ...h,
            createdAt: newCreatedAt,
            completions: nextCompletions,
            notes: nextNotes,
          };
        }

        // Sleep before 10[pm]: add a single completion for 2026-04-29.
        if (
          lc === 'sleep before 10' ||
          lc === 'sleep before 10pm' ||
          lc.startsWith('sleep before 10')
        ) {
          const date = '2026-04-29';
          if (h.completions.includes(date)) return h;
          touched = true;
          return { ...h, completions: [...h.completions, date].sort() };
        }

        return h;
      });

      if (touched) needsSave = true;
      await AsyncStorage.setItem(BACKFILL_KEY, '1');
    }

    if (needsSave) {
      await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(physExMigrated));
    }
    return physExMigrated;
  } catch (error) {
    console.error('Failed to load habits:', error);
    return [];
  }
}

/** Save all habits to storage */
export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Failed to save habits:', error);
  }
}

/**
 * Add a new habit.
 * `reminderHour` and `reminderMinute` are required and must move together:
 * either both numbers (a real reminder time) or both `null` (no reminder).
 */
export async function addHabit(
  name: string,
  emoji: string,
  frequency: HabitFrequency,
  reminderHour: number | null,
  reminderMinute: number | null,
  endDate: string | null,
  target: number | null = null,
  unit: string | null = null,
): Promise<Habit[]> {
  const habits = await loadHabits();
  const newHabit: Habit = {
    id: generateId(),
    name,
    emoji,
    color: DEFAULT_HABIT_COLOR,
    createdAt: getToday(),
    completions: [],
    frequency,
    notes: {},
    reminderHour,
    reminderMinute,
    endDate,
    target,
    unit,
    counts: {},
    skips: [],
    healthMetric: null,
  };
  const updated = [...habits, newHabit];
  await saveHabits(updated);
  return updated;
}

/** Update a habit's name, emoji, frequency, color, and/or reminder time */
export async function updateHabit(
  id: string,
  updates: Partial<
    Pick<
      Habit,
      | 'name'
      | 'emoji'
      | 'frequency'
      | 'color'
      | 'reminderHour'
      | 'reminderMinute'
      | 'endDate'
      | 'target'
      | 'unit'
      | 'healthMetric'
    >
  >,
): Promise<Habit[]> {
  const habits = await loadHabits();
  const updated = habits.map((h) => {
    if (h.id !== id) return h;
    const next = { ...h, ...updates };
    // When a habit is switched back to boolean (target cleared) drop the
    // unit and any partial counts so stale measurable state can't linger.
    if ('target' in updates && updates.target === null) {
      next.unit = null;
      next.counts = {};
    }
    return next;
  });
  await saveHabits(updated);
  return updated;
}

/**
 * Toggle a skip / off-day for `dateStr`. Skipping is mutually exclusive
 * with a completion on the same day: marking a day skipped removes any
 * completion (and its count) for that day; un-skipping just clears the
 * skip. Never moves `createdAt`.
 */
export async function toggleSkipForDate(id: string, dateStr: string): Promise<Habit[]> {
  const habits = await loadHabits();
  const updated = habits.map((h) => {
    if (h.id !== id) return h;
    const alreadySkipped = h.skips.includes(dateStr);
    if (alreadySkipped) {
      return { ...h, skips: h.skips.filter((d) => d !== dateStr) };
    }
    const nextCounts = { ...h.counts };
    delete nextCounts[dateStr];
    return {
      ...h,
      skips: [...h.skips, dateStr].sort(),
      completions: h.completions.filter((d) => d !== dateStr),
      counts: nextCounts,
    };
  });
  await saveHabits(updated);
  return updated;
}

/**
 * Increment (or decrement) a measurable habit's count for `dateStr` by
 * `delta`, clamped at 0. Keeps `completions` in sync with the target
 * threshold: the date is present in `completions` iff the day's count is
 * at or above `target`. A skip on the same day is cleared when a positive
 * count is recorded. No-op for boolean habits (`target === null`).
 */
export async function incrementCount(id: string, dateStr: string, delta: number): Promise<Habit[]> {
  const habits = await loadHabits();
  const updated = habits.map((h) => {
    if (h.id !== id || h.target === null) return h;
    const current = h.counts[dateStr] ?? 0;
    const next = Math.max(0, current + delta);
    const nextCounts = { ...h.counts };
    if (next === 0) {
      delete nextCounts[dateStr];
    } else {
      nextCounts[dateStr] = next;
    }
    const reached = next >= h.target;
    const hasCompletion = h.completions.includes(dateStr);
    let nextCompletions = h.completions;
    if (reached && !hasCompletion) {
      nextCompletions = [...h.completions, dateStr].sort();
    } else if (!reached && hasCompletion) {
      nextCompletions = h.completions.filter((d) => d !== dateStr);
    }
    // Logging on a day clears any skip for that day.
    const nextSkips = next > 0 ? h.skips.filter((d) => d !== dateStr) : h.skips;
    const nextCreatedAt = next > 0 && dateStr < h.createdAt ? dateStr : h.createdAt;
    return {
      ...h,
      counts: nextCounts,
      completions: nextCompletions,
      skips: nextSkips,
      createdAt: nextCreatedAt,
    };
  });
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

/**
 * Set or clear a note for a specific date on a habit.
 * - Passing a non-empty string saves the note AND marks that date as
 *   completed (saving a note implies you did the habit that day).
 * - Passing null/empty clears the note key but leaves completions alone.
 */
export async function setCompletionNote(
  id: string,
  dateStr: string,
  text: string | null,
): Promise<Habit[]> {
  const habits = await loadHabits();
  const trimmed = text?.trim() ?? '';
  const updated = habits.map((h) => {
    if (h.id !== id) return h;
    const nextNotes = { ...h.notes };
    let nextCompletions = h.completions;
    if (trimmed.length === 0) {
      delete nextNotes[dateStr];
    } else {
      nextNotes[dateStr] = trimmed;
      if (!h.completions.includes(dateStr)) {
        nextCompletions = [...h.completions, dateStr];
      }
    }
    return { ...h, notes: nextNotes, completions: nextCompletions };
  });
  await saveHabits(updated);
  return updated;
}

/** Toggle completion for today on a habit */
export async function toggleCompletion(id: string): Promise<Habit[]> {
  return toggleCompletionForDate(id, getToday());
}

/**
 * Toggle completion for an arbitrary YYYY-MM-DD on a habit. Used by the
 * Progress tab's backfill mode so the user can retroactively mark days they
 * forgot to log — including days **before** the habit was originally
 * created (for habits the user has been doing all along but only just
 * added to the app).
 *
 * When the toggled-on date is earlier than the habit's current
 * `createdAt`, we extend `createdAt` backward to that date so the
 * calendar grids, status logic, and stats all treat it as part of the
 * habit's history. Un-ticking never moves createdAt forward — the user's
 * earliest completion stays the anchor.
 */
export async function toggleCompletionForDate(id: string, dateStr: string): Promise<Habit[]> {
  const habits = await loadHabits();
  const updated = habits.map((h) => {
    if (h.id !== id) return h;
    const alreadyCompleted = h.completions.includes(dateStr);
    const nextCompletions = alreadyCompleted
      ? h.completions.filter((d) => d !== dateStr)
      : [...h.completions, dateStr].sort();
    const nextCreatedAt = !alreadyCompleted && dateStr < h.createdAt ? dateStr : h.createdAt;
    return {
      ...h,
      createdAt: nextCreatedAt,
      completions: nextCompletions,
    };
  });
  await saveHabits(updated);
  return updated;
}

/** Load notification settings */
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!json) return { enabled: true, reminderHour: 20, reminderMinute: 0 }; // Default: 8pm
    return JSON.parse(json) as NotificationSettings;
  } catch (error) {
    console.error('Failed to load notification settings:', error);
    return { enabled: true, reminderHour: 20, reminderMinute: 0 };
  }
}

/** Save notification settings */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save notification settings:', error);
  }
}

/** Generate a simple unique ID */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}
