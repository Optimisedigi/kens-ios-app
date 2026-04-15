import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHabits } from "../../src/hooks/useHabits";
import { CalendarGrid } from "../../src/components/CalendarGrid";
import { MonthlyCalendar } from "../../src/components/MonthlyCalendar";
import { Colors } from "../../src/constants/colors";

type CalendarView = "weeks" | "months";

export default function StatsScreen() {
  const { habits, rawHabits } = useHabits();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [calendarView, setCalendarView] = useState<CalendarView>("weeks");

  if (habits.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Stats</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>
            Add some habits to see your stats
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedHabit = habits[selectedIndex];
  const selectedRawHabit = rawHabits[selectedIndex];

  if (!selectedHabit || !selectedRawHabit) return null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
      </View>

      {/* Habit picker */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pickerContainer}
      >
        {habits.map((habit, index) => (
          <Pressable
            key={habit.id}
            onPress={() => setSelectedIndex(index)}
            style={[
              styles.pickerItem,
              selectedIndex === index && styles.pickerItemSelected,
            ]}
          >
            <Text style={styles.pickerEmoji}>{habit.emoji}</Text>
            <Text
              style={[
                styles.pickerName,
                selectedIndex === index && styles.pickerNameSelected,
              ]}
              numberOfLines={1}
            >
              {habit.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Stats cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {selectedHabit.currentStreak}
            </Text>
            <Text style={styles.statLabel}>Current{"\n"}Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {selectedHabit.longestStreak}
            </Text>
            <Text style={styles.statLabel}>Longest{"\n"}Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.round(selectedHabit.completionRate * 100)}%
            </Text>
            <Text style={styles.statLabel}>Completion{"\n"}Rate</Text>
          </View>
        </View>

        {/* View toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            onPress={() => setCalendarView("weeks")}
            style={[
              styles.toggleButton,
              calendarView === "weeks" && styles.toggleButtonActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                calendarView === "weeks" && styles.toggleTextActive,
              ]}
            >
              Weeks
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCalendarView("months")}
            style={[
              styles.toggleButton,
              calendarView === "months" && styles.toggleButtonActive,
            ]}
          >
            <Text
              style={[
                styles.toggleText,
                calendarView === "months" && styles.toggleTextActive,
              ]}
            >
              Months
            </Text>
          </Pressable>
        </View>

        {/* Calendar */}
        <View style={styles.calendarSection}>
          {calendarView === "weeks" ? (
            <>
              <Text style={styles.sectionTitle}>Last 12 Weeks</Text>
              <CalendarGrid habit={selectedRawHabit} weeks={12} />
            </>
          ) : (
            <MonthlyCalendar habit={selectedRawHabit} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  pickerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    gap: 8,
  },
  pickerItemSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.inputBackground,
  },
  pickerEmoji: {
    fontSize: 20,
  },
  pickerName: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
    maxWidth: 100,
  },
  pickerNameSelected: {
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: Colors.accent,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  calendarSection: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
