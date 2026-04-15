import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Habit } from "../types/habit";
import { Colors } from "../constants/colors";
import { getMonthlyStats, MonthlyStats } from "../utils/dateUtils";

interface MonthlyBreakdownProps {
  habit: Habit;
  monthsBack?: number;
}

function RateBar({ rate, color }: { rate: number; color: string }) {
  return (
    <View style={styles.barBackground}>
      <View
        style={[
          styles.barFill,
          { width: `${Math.round(rate * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

function MonthRow({ stats }: { stats: MonthlyStats }) {
  const ratePercent = Math.round(stats.rate * 100);

  // Color the rate based on performance
  let rateColor = Colors.completed;
  if (ratePercent < 50) rateColor = Colors.missed;
  else if (ratePercent < 75) rateColor = Colors.warning;

  return (
    <View style={styles.monthRow}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthLabel}>{stats.label}</Text>
        <Text style={[styles.monthRate, { color: rateColor }]}>
          {ratePercent}%
        </Text>
      </View>

      <RateBar rate={stats.rate} color={rateColor} />

      <View style={styles.monthDetails}>
        <View style={styles.detailItem}>
          <View
            style={[styles.detailDot, { backgroundColor: Colors.completed }]}
          />
          <Text style={styles.detailText}>
            {stats.completed} done
          </Text>
        </View>
        <View style={styles.detailItem}>
          <View
            style={[styles.detailDot, { backgroundColor: Colors.missed }]}
          />
          <Text style={styles.detailText}>
            {stats.missedTwice} missed twice
          </Text>
        </View>
      </View>
    </View>
  );
}

export function MonthlyBreakdown({
  habit,
  monthsBack = 6,
}: MonthlyBreakdownProps) {
  const monthlyStats = getMonthlyStats(habit, monthsBack);

  if (monthlyStats.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No monthly data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {monthlyStats.map((stats, index) => (
        <View key={stats.month}>
          <MonthRow stats={stats} />
          {index < monthlyStats.length - 1 && (
            <View style={styles.divider} />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  monthRow: {
    paddingVertical: 12,
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  monthRate: {
    fontSize: 15,
    fontWeight: "bold",
  },
  barBackground: {
    height: 8,
    backgroundColor: Colors.inputBackground,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  monthDetails: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
