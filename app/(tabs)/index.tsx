import React, { useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useHabits } from '../../src/hooks/useHabits';
import { useNotifications } from '../../src/hooks/useNotifications';
import { HabitCard } from '../../src/components/HabitCard';
import { EmptyState } from '../../src/components/EmptyState';
import { useTheme } from '../../src/hooks/useTheme';
import { formatDisplayDate, getToday } from '../../src/utils/dateUtils';

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        loadingContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        loadingText: {
          color: colors.textSecondary,
          fontSize: 16,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 16,
        },
        title: {
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.textPrimary,
        },
        date: {
          fontSize: 15,
          color: colors.textSecondary,
          marginTop: 4,
        },
        addButton: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        },
        addButtonText: {
          color: colors.textPrimary,
          fontSize: 28,
          fontWeight: '300',
          marginTop: -2,
        },
        listContent: {
          paddingBottom: 32,
        },
      }),
    [colors],
  );

  const { habits, rawHabits, loading, toggleCompletion, setCompletionNote, refresh } = useHabits();
  const { scheduleHabitNotifications, requestPermissions } = useNotifications();
  const router = useRouter();

  // Refresh habits when tab is focused (e.g., after adding a new habit)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Schedule notifications whenever habits change
  useEffect(() => {
    if (rawHabits.length > 0) {
      scheduleHabitNotifications(rawHabits);
    }
  }, [rawHabits, scheduleHabitNotifications]);

  // Request notification permissions on first launch
  useEffect(() => {
    requestPermissions();
  }, [requestPermissions]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Never Miss Twice</Text>
          <Text style={styles.date}>{formatDisplayDate(getToday())}</Text>
        </View>
        {habits.length > 0 && (
          <Pressable style={styles.addButton} onPress={() => router.push('/add-habit')}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        )}
      </View>

      {habits.length === 0 ? (
        <EmptyState onAddHabit={() => router.push('/add-habit')} />
      ) : (
        <FlatList
          data={habits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HabitCard habit={item} onToggle={toggleCompletion} onSaveNote={setCompletionNote} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
