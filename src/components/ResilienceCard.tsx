import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Habit, WEEKDAY_LABELS } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { getRecoveryStats } from '../utils/resilience';

interface ResilienceCardProps {
  habit: Habit;
  /** Habit accent color used for the score + bars. */
  accent: string;
}

/**
 * Resilience Score + recovery analytics (Feature 6). Shows how well the user
 * bounces back after a slip rather than rewarding an unbroken chain.
 */
export function ResilienceCard({ habit, accent }: ResilienceCardProps) {
  const { colors } = useTheme();
  const stats = useMemo(() => getRecoveryStats(habit), [habit]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          marginBottom: 12,
        },
        title: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.textSecondary,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        scoreRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          marginBottom: 4,
        },
        score: {
          fontSize: 44,
          fontWeight: '800',
          lineHeight: 48,
        },
        scoreMax: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textMuted,
          marginLeft: 4,
          marginBottom: 6,
        },
        scoreCaption: {
          fontSize: 12,
          color: colors.textMuted,
          marginBottom: 14,
        },
        metricsRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 16,
        },
        metric: {
          flex: 1,
          alignItems: 'center',
        },
        metricValue: {
          fontSize: 18,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        metricLabel: {
          fontSize: 10,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: 2,
        },
        weekdayTitle: {
          fontSize: 11,
          color: colors.textMuted,
          marginBottom: 8,
        },
        barsRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          height: 48,
        },
        barColumn: {
          flex: 1,
          alignItems: 'center',
        },
        barTrack: {
          width: 14,
          height: 36,
          justifyContent: 'flex-end',
        },
        bar: {
          width: 14,
          borderRadius: 3,
        },
        barLabel: {
          fontSize: 10,
          color: colors.textMuted,
          marginTop: 4,
        },
      }),
    [colors],
  );

  const maxSlips = Math.max(1, ...stats.slipsByWeekday);
  const recoveryPct = Math.round(stats.recoveryRate * 100);
  const comeback = stats.avgComebackDays === null ? '—' : `${stats.avgComebackDays.toFixed(1)}d`;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resilience</Text>

      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: accent }]}>{stats.resilienceScore}</Text>
        <Text style={styles.scoreMax}>/100</Text>
      </View>
      <Text style={styles.scoreCaption}>How well you bounce back after a slip</Text>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{stats.slips === 0 ? '—' : `${recoveryPct}%`}</Text>
          <Text style={styles.metricLabel}>Recovery rate</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{comeback}</Text>
          <Text style={styles.metricLabel}>Avg comeback</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{stats.slips}</Text>
          <Text style={styles.metricLabel}>Total slips</Text>
        </View>
      </View>

      <Text style={styles.weekdayTitle}>Slips by weekday</Text>
      <View style={styles.barsRow}>
        {stats.slipsByWeekday.map((count, dow) => (
          <View key={dow} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(2, (count / maxSlips) * 36),
                    backgroundColor: count > 0 ? colors.missed : colors.cardBorder,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{WEEKDAY_LABELS[dow]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
