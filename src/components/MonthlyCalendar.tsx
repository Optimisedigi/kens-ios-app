import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, PanResponder } from 'react-native';
import { Habit } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { DayCell } from './DayCell';
import { formatDate, parseDate, getToday, getDayStatus } from '../utils/dateUtils';

interface MonthlyCalendarProps {
  habit: Habit;
  /** Called when the user taps a day cell within [createdAt, today]. */
  onDayPress?: (dateStr: string) => void;
  /**
   * Backfill mode — when true, dates **before** `habit.createdAt` are
   * also tappable so the user can log history that pre-dates when they
   * added the habit to the app. Empty cells get a faint outline so
   * they're discoverable as tap targets.
   */
  backfillMode?: boolean;
}

interface MonthData {
  label: string; // e.g. "April 2026"
  year: number;
  month: number; // 0-indexed
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const CELL_SIZE = 38;
/** Horizontal pan distance (px) required to count as a swipe. */
const SWIPE_THRESHOLD = 40;

/**
 * Get all months from habit creation to today, oldest first.
 * Index 0 = month of habit creation; index `length - 1` = current month.
 *
 * When `extraMonthsBack` > 0 the range is widened that many months
 * earlier than `createdAt` so the user can navigate to pre-creation
 * months in backfill mode.
 */
function getMonthRange(createdAt: string, extraMonthsBack: number = 0): MonthData[] {
  const created = parseDate(createdAt);
  if (extraMonthsBack > 0) {
    created.setMonth(created.getMonth() - extraMonthsBack);
  }
  const today = new Date();
  const months: MonthData[] = [];

  let y = created.getFullYear();
  let m = created.getMonth();
  const endY = today.getFullYear();
  const endM = today.getMonth();

  while (y < endY || (y === endY && m <= endM)) {
    const d = new Date(y, m, 1);
    months.push({
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      year: y,
      month: m,
    });
    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }

  return months;
}

function MonthGrid({
  habit,
  data,
  onDayPress,
  backfillMode,
}: {
  habit: Habit;
  data: MonthData;
  onDayPress?: (dateStr: string) => void;
  backfillMode?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        monthBlock: {
          marginBottom: 4,
        },
        weekRow: {
          flexDirection: 'row',
          justifyContent: 'center',
        },
        headerCell: {
          width: CELL_SIZE,
          margin: 2,
          alignItems: 'center',
        },
        headerText: {
          color: colors.textMuted,
          fontSize: 12,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  const todayStr = getToday();
  const daysInMonth = new Date(data.year, data.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(data.year, data.month, 1).getDay(); // 0=Sun
  // Anchor the active range to the first completion (or createdAt if the
  // user hasn't logged anything yet) so days between createdAt and the
  // first actual completion render as empty rather than coloured/missed.
  const sortedCompletions = [...habit.completions].sort();
  const anchor = sortedCompletions[0] ?? habit.createdAt;

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
    while (row.length < 7) row.push(null);
    weeks.push(row);
  }

  return (
    <View style={styles.monthBlock}>
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
            const inRange = dateStr >= anchor && dateStr <= todayStr;
            const status = inRange ? getDayStatus(habit, dateStr) : 'empty';
            const dayNum = parseDate(dateStr).getDate().toString();
            // In backfill mode we drop the `>= createdAt` floor so the
            // user can log history that predates when they added the
            // habit to the app. Future dates stay non-tappable.
            const tappable =
              onDayPress && dateStr <= todayStr && (backfillMode || dateStr >= habit.createdAt);
            return (
              <DayCell
                key={dateStr}
                status={status}
                label={dayNum}
                size={CELL_SIZE}
                hasNote={Boolean(habit.notes[dateStr])}
                tappableHint={backfillMode && tappable}
                onPress={tappable ? () => onDayPress!(dateStr) : undefined}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function MonthlyCalendar({ habit, onDayPress, backfillMode }: MonthlyCalendarProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        navRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          paddingHorizontal: 4,
        },
        navButton: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: colors.inputBackground,
        },
        navButtonDisabled: {
          opacity: 0.35,
        },
        navChevron: {
          color: colors.textPrimary,
          fontSize: 22,
          lineHeight: 24,
          fontWeight: '600',
        },
        navChevronDisabled: {
          color: colors.textMuted,
        },
        monthLabel: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        legend: {
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 12,
          gap: 16,
        },
        legendItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        legendDot: {
          width: 10,
          height: 10,
          borderRadius: 3,
        },
        monthStats: {
          fontSize: 12,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: 8,
        },
        legendText: {
          color: colors.textSecondary,
          fontSize: 12,
        },
      }),
    [colors],
  );

  // In backfill mode we expose 24 extra months before `createdAt` so the
  // user can log history from before they added the habit to the app.
  const months = useMemo(
    () => getMonthRange(habit.createdAt, backfillMode ? 24 : 0),
    [habit.createdAt, backfillMode],
  );
  // Default to the current month (last entry).
  const [index, setIndex] = useState(months.length - 1);
  // Re-anchor to the current month whenever the range changes (e.g. when
  // backfill mode toggles and 24 earlier months get prepended) so the
  // user always starts on "now" rather than getting silently shuffled
  // 24 months into the past.
  useEffect(() => {
    setIndex(months.length - 1);
  }, [months.length]);

  // Clamp the index into the current range *during render*. The `useEffect`
  // above only re-anchors after the commit, so on the render immediately
  // after `months` shrinks (e.g. backfill mode toggling off, or createdAt
  // moving when a historic day is edited) a stale `index` can point past the
  // end of the array. Without this clamp `months[index]` is `undefined` and
  // dereferencing `current.year` below crashes the screen.
  const safeIndex = months.length === 0 ? 0 : Math.min(Math.max(index, 0), months.length - 1);
  const canGoPrev = safeIndex > 0;
  const canGoNext = safeIndex < months.length - 1;

  const goPrev = () => {
    if (canGoPrev) setIndex(safeIndex - 1);
  };
  const goNext = () => {
    if (canGoNext) setIndex(safeIndex + 1);
  };

  // Swipe left/right on the month grid. We claim the gesture only when the
  // pan is clearly horizontal so the parent ScrollView keeps vertical scroll.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -SWIPE_THRESHOLD) goNext();
        else if (g.dx >= SWIPE_THRESHOLD) goPrev();
      },
    }),
  ).current;

  // Final guard: if the range is somehow empty, render nothing rather than
  // crash (months is always non-empty in practice — createdAt ≤ today).
  const current = months[safeIndex];
  if (!current) return null;

  // Stats for the displayed month: completions / elapsed days, bounded by
  // createdAt and today.
  const todayStr = getToday();
  const monthFirst = formatDate(new Date(current.year, current.month, 1));
  const monthLast = formatDate(new Date(current.year, current.month + 1, 0));
  const statsStart = habit.createdAt > monthFirst ? habit.createdAt : monthFirst;
  const statsEnd = todayStr < monthLast ? todayStr : monthLast;
  let daysElapsed = 0;
  if (statsStart <= statsEnd) {
    const a = parseDate(statsStart);
    const b = parseDate(statsEnd);
    daysElapsed = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  const completionsThisMonth = habit.completions.filter(
    (d) => d >= monthFirst && d <= monthLast,
  ).length;
  const notesThisMonth = Object.keys(habit.notes).filter(
    (d) => d >= monthFirst && d <= monthLast,
  ).length;

  return (
    <View>
      {/* Month header with prev/next chevrons */}
      <View style={styles.navRow}>
        <Pressable
          onPress={goPrev}
          disabled={!canGoPrev}
          hitSlop={10}
          style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
        >
          <Text style={[styles.navChevron, !canGoPrev && styles.navChevronDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{current.label}</Text>
        <Pressable
          onPress={goNext}
          disabled={!canGoNext}
          hitSlop={10}
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
        >
          <Text style={[styles.navChevron, !canGoNext && styles.navChevronDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* Month grid (swipe-to-paginate) */}
      <View {...panResponder.panHandlers}>
        <MonthGrid
          habit={habit}
          data={current}
          onDayPress={onDayPress}
          backfillMode={backfillMode}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.cellCompleted }]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.cellMissedTwice }]} />
          <Text style={styles.legendText}>Missed twice</Text>
        </View>
      </View>

      {/* Stats line for this month, below the legend */}
      <Text style={styles.monthStats}>
        {completionsThisMonth} / {daysElapsed} day
        {daysElapsed === 1 ? '' : 's'} · {notesThisMonth} note
        {notesThisMonth === 1 ? '' : 's'}
      </Text>
    </View>
  );
}
