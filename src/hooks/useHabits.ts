import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Habit, HabitFrequency, HabitWithStatus } from '../types/habit';
import {
  loadHabits,
  addHabit as addHabitStorage,
  updateHabit as updateHabitStorage,
  deleteHabit as deleteHabitStorage,
  toggleCompletion as toggleCompletionStorage,
  toggleCompletionForDate as toggleCompletionForDateStorage,
  setCompletionNote as setCompletionNoteStorage,
} from '../storage/habitStorage';
import { getHabitWithStatus } from '../utils/dateUtils';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const loaded = await loadHabits();
    setHabits(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch habits every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const habitsWithStatus: HabitWithStatus[] = habits.map(getHabitWithStatus);

  const addHabit = useCallback(
    async (
      name: string,
      emoji: string,
      frequency: HabitFrequency,
      reminderHour: number | null,
      reminderMinute: number | null,
      endDate: string | null,
    ) => {
      const updated = await addHabitStorage(
        name,
        emoji,
        frequency,
        reminderHour,
        reminderMinute,
        endDate,
      );
      setHabits(updated);
    },
    [],
  );

  const updateHabit = useCallback(
    async (
      id: string,
      updates: Partial<
        Pick<
          Habit,
          'name' | 'emoji' | 'frequency' | 'color' | 'reminderHour' | 'reminderMinute' | 'endDate'
        >
      >,
    ) => {
      const updated = await updateHabitStorage(id, updates);
      setHabits(updated);
    },
    [],
  );

  const deleteHabit = useCallback(async (id: string) => {
    const updated = await deleteHabitStorage(id);
    setHabits(updated);
  }, []);

  const toggleCompletion = useCallback(async (id: string) => {
    const updated = await toggleCompletionStorage(id);
    setHabits(updated);
  }, []);

  const toggleCompletionForDate = useCallback(async (id: string, dateStr: string) => {
    const updated = await toggleCompletionForDateStorage(id, dateStr);
    setHabits(updated);
  }, []);

  const setCompletionNote = useCallback(
    async (id: string, dateStr: string, text: string | null) => {
      const updated = await setCompletionNoteStorage(id, dateStr, text);
      setHabits(updated);
    },
    [],
  );

  return {
    habits: habitsWithStatus,
    rawHabits: habits,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    toggleCompletionForDate,
    setCompletionNote,
    refresh,
  };
}
