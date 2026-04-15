import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Habit } from "../types/habit";
import { Colors } from "../constants/colors";
import { DayCell } from "./DayCell";
import { getLastNDays, getDayStatus, parseDate } from "../utils/dateUtils";

interface CalendarGridProps {
  habit: Habit;
  weeks?: number; // Number of weeks to show (default: 12)
}

export function CalendarGrid({ habit, weeks = 12 }: CalendarGridProps) {
  const totalDays = weeks * 7;
  const days = getLastNDays(totalDays);

  // Organize into weeks (rows of 7 days)
  const weekRows: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weekRows.push(days.slice(i, i + 7));
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
            {week.map((dateStr) => {
              const status = getDayStatus(habit, dateStr);
              const day = parseDate(dateStr).getDate().toString();
              return (
                <DayCell
                  key={dateStr}
                  status={status}
                  label={day}
                  size={40}
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
              { backgroundColor: Colors.cellCompleted },
            ]}
          />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: Colors.cellMissedTwice },
            ]}
          />
          <Text style={styles.legendText}>Missed twice</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: Colors.textMuted,
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
    color: Colors.textSecondary,
    fontSize: 12,
  },
});
