import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Habit } from "../types/habit";
import { useTheme } from "../hooks/useTheme";
import { DayCell } from "./DayCell";
import { formatDate, getDayStatus, getToday, parseDate } from "../utils/dateUtils";

interface CalendarGridProps {
  habit: Habit;
  weeks?: number; // Number of weeks to show (default: 12)
  /** Called when the user taps a day cell within [createdAt, today]. */
  onDayPress?: (dateStr: string) => void;
  /**
   * Backfill mode — when true, dates before `habit.createdAt` are also
   * tappable so the user can log history that pre-dates when they added
   * the habit to the app. Tappable empties get a faint outline.
   */
  backfillMode?: boolean;
}

export function CalendarGrid({
  habit,
  weeks = 12,
  onDayPress,
  backfillMode,
}: CalendarGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingHorizontal: 8,
        },
        headerRow: {
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: 4,
        },
        headerCell: {
          width: 40,
          margin: 2,
          alignItems: "center",
        },
        headerLabel: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: "600",
        },
        weekRow: {
          flexDirection: "row",
          justifyContent: "center",
        },
        legend: {
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 16,
          gap: 16,
        },
        legendItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        legendDot: {
          width: 10,
          height: 10,
          borderRadius: 3,
        },
        legendText: {
          color: colors.textSecondary,
          fontSize: 12,
        },
      }),
    [colors]
  );

  const todayStr = getToday();
  // Active range starts at the first completion so a habit created weeks
  // before it was actually started doesn't show coloured cells in the gap.
  const sortedCompletions = [...habit.completions].sort();
  const anchor = sortedCompletions[0] ?? habit.createdAt;

  // Build `weeks` full Sun→Sat rows ending the week containing today.
  // Today's weekday determines how many trailing nulls we need (Sat..today's
  // day-of-week excluded) and where the oldest Sunday sits.
  const today = parseDate(todayStr);
  const todayDow = today.getDay(); // 0=Sun..6=Sat
  const trailingNulls = 6 - todayDow; // days from today (excl) through Sat
  // Oldest Sunday in the visible window.
  const start = new Date(today);
  start.setDate(today.getDate() - todayDow - (weeks - 1) * 7);

  const cells: (string | null)[] = [];
  const totalCells = weeks * 7;
  for (let i = 0; i < totalCells; i++) {
    if (i >= totalCells - trailingNulls) {
      cells.push(null);
      continue;
    }
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(formatDate(d));
  }

  // Organize into weeks (rows of 7 cells)
  const weekRows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weekRows.push(cells.slice(i, i + 7));
  }

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <View style={styles.container}>
      {/* Day-of-week header */}
      <View style={styles.headerRow}>
        {dayLabels.map((label, index) => (
          <View key={index} style={styles.headerCell}>
            <Text style={styles.headerLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {weekRows.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((dateStr, di) => {
              if (!dateStr) {
                return (
                  <View
                    key={`empty-${weekIndex}-${di}`}
                    style={{ width: 40, height: 40, margin: 2 }}
                  />
                );
              }
              const inRange = dateStr >= anchor && dateStr <= todayStr;
              const status = inRange ? getDayStatus(habit, dateStr) : "empty";
              const day = parseDate(dateStr).getDate().toString();
              const tappable =
                onDayPress &&
                dateStr <= todayStr &&
                (backfillMode || dateStr >= habit.createdAt);
              return (
                <DayCell
                  key={dateStr}
                  status={status}
                  label={day}
                  size={40}
                  hasNote={Boolean(habit.notes[dateStr])}
                  tappableHint={backfillMode && tappable}
                  onPress={
                    tappable ? () => onDayPress!(dateStr) : undefined
                  }
                />
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.cellCompleted },
            ]}
          />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: colors.cellMissedTwice },
            ]}
          />
          <Text style={styles.legendText}>Missed twice</Text>
        </View>
      </View>
    </View>
  );
}
