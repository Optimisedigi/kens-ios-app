import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Habit } from "../types/habit";
import { Colors } from "../constants/colors";
import { DayCell } from "./DayCell";
import {
  formatDate,
  parseDate,
  getToday,
  getDayStatus,
} from "../utils/dateUtils";

interface MonthlyCalendarProps {
  habit: Habit;
}

interface MonthData {
  label: string; // e.g. "April 2026"
  year: number;
  month: number; // 0-indexed
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const CELL_SIZE = 38;

/** Get all months from habit creation to today, newest first */
function getMonthRange(createdAt: string): MonthData[] {
  const created = parseDate(createdAt);
  const today = new Date();
  const months: MonthData[] = [];

  let y = today.getFullYear();
  let m = today.getMonth();
  const startY = created.getFullYear();
  const startM = created.getMonth();

  while (y > startY || (y === startY && m >= startM)) {
    const d = new Date(y, m, 1);
    months.push({
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      year: y,
      month: m,
    });
    m--;
    if (m < 0) {
      m = 11;
      y--;
    }
  }

  return months;
}

function MonthGrid({ habit, data }: { habit: Habit; data: MonthData }) {
  const todayStr = getToday();
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(data.year, data.month, 1).getDay(); // 0=Sun

  // Build rows of 7 cells
  const cells: (string | null)[] = [];

  // Leading empty cells for days before the 1st
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }

  // Actual days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(data.year, data.month, day));
    if (dateStr > todayStr) {
      cells.push(null); // Future day — empty
    } else {
      cells.push(dateStr);
    }
  }

  // Chunk into weeks
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    // Pad last row to 7
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }

  return (
    <View style={styles.monthBlock}>
      <Text style={styles.monthLabel}>{data.label}</Text>

      {/* Day-of-week header */}
      <View style={styles.weekRow}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.headerCell}>
            <Text style={styles.headerText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Day cells */}
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((dateStr, di) => {
            if (!dateStr) {
              return (
                <View
                  key={`empty-${di}`}
                  style={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    margin: 2,
                  }}
                />
              );
            }
            const status = getDayStatus(habit, dateStr);
            const dayNum = parseDate(dateStr).getDate().toString();
            return (
              <DayCell
                key={dateStr}
                status={status}
                label={dayNum}
                size={CELL_SIZE}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function MonthlyCalendar({ habit }: MonthlyCalendarProps) {
  const months = getMonthRange(habit.createdAt);

  return (
    <View>
      {months.map((data) => (
        <MonthGrid
          key={`${data.year}-${data.month}`}
          habit={habit}
          data={data}
        />
      ))}

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
  monthBlock: {
    marginBottom: 24,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  headerCell: {
    width: CELL_SIZE,
    margin: 2,
    alignItems: "center",
  },
  headerText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 8,
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
