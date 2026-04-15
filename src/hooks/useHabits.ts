import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Habit, HabitWithStatus } from "../types/habit";
import {
  loadHabits,
  addHabit as addHabitStorage,
  updateHabit as updateHabitStorage,
  deleteHabit as deleteHabitStorage,
  toggleCompletion as toggleCompletionStorage,
} from "../storage/habitStorage";
import { getHabitWithStatus } from "../utils/dateUtils";

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
    }, [refresh])
  );

  const habitsWithStatus: HabitWithStatus[] = habits.map(getHabitWithStatus);

  const addHabit = useCallback(async (name: string, emoji: string) => {
    const updated = await addHabitStorage(name, emoji);
    setHabits(updated);
  }, []);

  const updateHabit = useCallback(
    async (
      id: string,
      updates: Partial<Pick<Habit, "name" | "emoji" | "frequencyDays">>
    ) => {
      const updated = await updateHabitStorage(id, updates);
      setHabits(updated);
    },
    []
  );

  const deleteHabit = useCallback(async (id: string) => {
    const updated = await deleteHabitStorage(id);
    setHabits(updated);
  }, []);

  const toggleCompletion = useCallback(async (id: string) => {
    const updated = await toggleCompletionStorage(id);
    setHabits(updated);
  }, []);

  return {
    habits: habitsWithStatus,
    rawHabits: habits,
    loading,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleCompletion,
    refresh,
  };
}
