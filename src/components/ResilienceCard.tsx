import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
 *
 * Rendered as a borderless, collapsible section to keep the Progress tab
 * uncluttered: the header (label + score) is always visible; tapping it
 * reveals an explanatory tooltip plus the recovery metrics and weekday
 * breakdown. Most users won't know what "Resilience" means until they read
 * the tooltip, so it leads the expanded content.
 */
export function ResilienceCard({ habit, accent }: ResilienceCardProps) {
  const { colors } = useTheme();
  const stats = useMemo(() => getRecoveryStats(habit), [habit]);
  const [expanded, setExpanded] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        titleGroup: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        title: {
          fontSize: 13,
          fontWeight: '700',
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        },
        scoreGroup: {
          flexDirection: 'row',
          alignItems: 'baseline',
          gap: 6,
        },
        score: {
          fontSize: 26,
          fontWeight: '800',
          letterSpacing: -0.5,
        },
        scoreMax: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
        },
        chevron: {
          marginLeft: 2,
        },
        tooltip: {
          flexDirection: 'row',
          gap: 8,
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          padding: 12,
          marginTop: 14,
        },
        tooltipText: {
          flex: 1,
          fontSize: 12,
          lineHeight: 17,
          color: colors.textSecondary,
        },
        metricsRow: {
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
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
          marginTop: 18,
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

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  };

  return (
    <View>
      <Pressable
        style={styles.headerRow}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Hide resilience details' : 'Show resilience details'}
      >
        <View style={styles.titleGroup}>
          <Text style={styles.title}>Resilience</Text>
          <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
        </View>
        <View style={styles.scoreGroup}>
          <Text style={[styles.score, { color: accent }]}>{stats.resilienceScore}</Text>
          <Text style={styles.scoreMax}>/100</Text>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textMuted}
            style={styles.chevron}
          />
        </View>
      </Pressable>

      {expanded && (
        <>
          <View style={styles.tooltip}>
            <Ionicons name="bulb-outline" size={16} color={accent} />
            <Text style={styles.tooltipText}>
              Resilience scores how well you bounce back after a slip — not whether your streak is
              perfect. Recovering quickly keeps it high, even if you miss a day.
            </Text>
          </View>

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
        </>
      )}
    </View>
  );
}
