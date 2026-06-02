import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { HabitWithStatus } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { getToday, parseDate } from '../utils/dateUtils';

interface DailySummaryProps {
  habits: HabitWithStatus[];
}

/** Sunday-first single-letter weekday labels. */
const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Today's hero card: greeting, date, a daily completion ratio with a
 * segmented progress bar, and a 7-day week strip with today highlighted.
 * Gives the Today screen a focal point instead of a bare title.
 */
export function DailySummary({ habits }: DailySummaryProps) {
  const { colors } = useTheme();
  const today = getToday();

  const { done, total, pct, message } = useMemo(() => {
    const active = habits.filter((h) => !h.skips.includes(today));
    const completed = active.filter((h) => h.status === 'completed_today').length;
    const count = active.length;
    const ratio = count === 0 ? 0 : completed / count;
    let msg: string;
    if (count === 0) msg = 'Nothing due today';
    else if (completed === count) msg = 'All done — nice work!';
    else if (completed === 0) msg = "Let's get started";
    else msg = `${count - completed} to go`;
    return { done: completed, total: count, pct: ratio, message: msg };
  }, [habits, today]);

  // Build the current week (Sunday → Saturday) with completion flags.
  const week = useMemo(() => {
    const now = parseDate(today);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      const anyDone = habits.some((h) => h.completions.includes(iso));
      const isToday = iso === today;
      return { label: WEEK_LABELS[i], iso, anyDone, isToday };
    });
  }, [habits, today]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginHorizontal: 20,
          marginBottom: 8,
          backgroundColor: colors.card,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 20,
        },
        topRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        },
        ratioWrap: {
          flexDirection: 'row',
          alignItems: 'baseline',
        },
        ratioBig: {
          fontSize: 40,
          fontWeight: '800',
          color: colors.textPrimary,
          letterSpacing: -1,
        },
        ratioTotal: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.textMuted,
          marginLeft: 2,
        },
        message: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.accent,
          marginBottom: 6,
        },
        track: {
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.inputBackground,
          marginTop: 16,
          overflow: 'hidden',
        },
        fill: {
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.completed,
        },
        weekRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 18,
        },
        dayCol: {
          alignItems: 'center',
          flex: 1,
          gap: 6,
        },
        dayLabel: {
          fontSize: 11,
          fontWeight: '600',
          color: colors.textMuted,
        },
        dayLabelToday: {
          color: colors.textPrimary,
        },
        dot: {
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.inputBackground,
        },
        dotDone: {
          backgroundColor: colors.completed,
        },
        dotToday: {
          borderWidth: 2,
          borderColor: colors.accent,
        },
        dotCheck: {
          color: colors.background,
          fontSize: 13,
          fontWeight: '800',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.ratioWrap}>
          <Text style={styles.ratioBig}>{done}</Text>
          <Text style={styles.ratioTotal}>/{total}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
      </View>

      <View style={styles.weekRow}>
        {week.map((d, i) => (
          <View key={`${d.iso}-${i}`} style={styles.dayCol}>
            <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>{d.label}</Text>
            <View style={[styles.dot, d.anyDone && styles.dotDone, d.isToday && styles.dotToday]}>
              {d.anyDone && <Text style={styles.dotCheck}>✓</Text>}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
