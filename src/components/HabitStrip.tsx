import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Habit, HabitStatus, getFrequencyLabel } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../constants/colors';
import {
  addDays,
  getStripDayStatus,
  getFrequencySlotsFromStart,
  getCurrentStreak,
  getCompletionRate,
  getHabitStatus,
  getIsoWeekStart,
  getToday,
} from '../utils/dateUtils';

/** Maps a habit's live cadence-health status to a single dot colour. */
function getCadenceDotColor(status: HabitStatus, colors: ThemeColors): string {
  switch (status) {
    case 'completed_today':
      return colors.completed;
    case 'safe':
    case 'new':
      return colors.safe;
    case 'warning':
      return colors.warning;
    case 'missed_twice':
      return colors.missed;
    default:
      return colors.cellEmpty;
  }
}

interface HabitStripProps {
  habit: Habit;
  /** "frequency" = one cell per due window, "days" = one cell per calendar day */
  mode: 'frequency' | 'days';
  /** How many cells per row in the mini grid */
  columns?: number;
  /** How many rows to render (controls strip height) */
  rows?: number;
  /**
   * Cell order. Default (false): oldest top-left → newest bottom-right.
   * True: newest top-left → oldest bottom-right (used by All Habits tab).
   */
  ascending?: boolean;
}

const CELL_SIZE = 18;
const CELL_GAP = 3;

export function HabitStrip({
  habit,
  mode,
  columns = 17,
  rows = 3,
  ascending = false,
}: HabitStripProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginBottom: 18,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
          gap: 8,
        },
        titleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          flexShrink: 1,
        },
        colorDot: {
          width: 10,
          height: 10,
          borderRadius: 3,
        },
        name: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '600',
          flexShrink: 1,
        },
        frequencyTag: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '600',
          backgroundColor: colors.inputBackground,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
          overflow: 'hidden',
        },
        metaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        cadenceDot: {
          width: 8,
          height: 8,
          borderRadius: 4,
        },
        meta: {
          color: colors.textMuted,
          fontSize: 12,
        },
        row: {
          flexDirection: 'row',
          gap: CELL_GAP,
          marginBottom: CELL_GAP,
        },
        cell: {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: 4,
        },
      }),
    [colors],
  );

  const streak = getCurrentStreak(habit);
  const rate = Math.round(getCompletionRate(habit) * 100);
  const cadenceStatus = getHabitStatus(habit);
  const cadenceColor = getCadenceDotColor(cadenceStatus, colors);
  const totalCells = columns * rows;

  // Build the cells array
  type Cell = {
    key: string;
    state:
      | 'completed'
      | 'completed_filler'
      | 'missed_once'
      | 'missed_twice'
      | 'skipped'
      | 'empty'
      | 'future';
  };
  const cells: Cell[] = [];

  // Anchor the strip to the first day the habit was actually *started*
  // (i.e. first completion). If the user created a habit weeks ago but
  // didn't begin until later, we don't want a wall of "missed" cells
  // leading up to the first completion. Falls back to createdAt when the
  // habit has no completions yet.
  const sortedCompletions = [...habit.completions].sort();
  const anchor = sortedCompletions[0] ?? habit.createdAt;

  if (mode === 'days') {
    const todayStr = getToday();

    if (habit.frequency.kind === 'perWeek') {
      // PerWeek strip: walk ISO week by ISO week (Mon–Sun) from the week
      // of the first completion (or createdAt if none) to the current
      // week. Each week emits its actual completions as colored cells,
      // followed by a single placeholder when the user fell short:
      //   - past week, target met:    K colored cells
      //   - past week, shortfall:    `count` colored cells + 1 red cell
      //   - current week, target met: `count` colored cells
      //   - current week, shortfall: `count` colored cells + 1 empty cell
      // The single "miss" placeholder is what the user expected ("did
      // none last week → 1 red box", not target−count reds).
      const target = habit.frequency.daysPerWeek;
      const completionSet = new Set(habit.completions);
      const firstWeekStart = getIsoWeekStart(sortedCompletions[0] ?? habit.createdAt);
      const todayWeekStart = getIsoWeekStart(todayStr);

      let wkStart = firstWeekStart;
      while (wkStart <= todayWeekStart) {
        // Collect completions inside this Mon–Sun week, in chronological
        // order, capped at `target` so a user who logs 3 in a 2/week
        // week doesn't blow up the row — the third tick lives on the
        // calendar but the strip stays aligned to the cadence promise.
        const inWeek: string[] = [];
        for (let i = 0; i < 7; i++) {
          const d = addDays(wkStart, i);
          if (completionSet.has(d)) inWeek.push(d);
        }
        const shown = inWeek.slice(0, target);
        for (const d of shown) {
          cells.push({ key: d, state: 'completed' });
        }

        const isCurrent = wkStart === todayWeekStart;
        if (isCurrent) {
          // Current (in-progress) week. Only show a placeholder if we
          // haven't hit the target yet — the week isn't over so we never
          // mark it red.
          if (inWeek.length < target) {
            cells.push({ key: `pending-${wkStart}`, state: 'empty' });
          }
        } else if (inWeek.length < target) {
          // Past week shortfall: one red cell, regardless of how many were
          // missed (1/2 short and 0/2 short both render as a single miss).
          cells.push({
            key: `miss-${wkStart}`,
            state: 'missed_twice',
          });
        }

        wkStart = addDays(wkStart, 7);
      }
    } else {
      // Days mode (interval / weekdays): anchor cell 0 to the first
      // completion (or createdAt if none). Walk forward day by day;
      // stop at today, then pad with "future" placeholders. Uses
      // getStripDayStatus so every overdue day stays red until recovery
      // (different from the single-mark Year/Months/Weeks views).
      let dateStr = anchor;
      while (cells.length < totalCells && dateStr <= todayStr) {
        const status = getStripDayStatus(habit, dateStr);
        if (status !== 'completed_filler') {
          cells.push({ key: dateStr, state: status });
        }
        dateStr = addDays(dateStr, 1);
      }
    }
  } else {
    // Frequency mode: one cell per due slot, oldest first, anchored to the
    // first completion (or createdAt if none).
    const slots = getFrequencySlotsFromStart(habit, totalCells, anchor);
    for (const slot of slots) {
      const state: Cell['state'] =
        slot.status === 'completed'
          ? 'completed'
          : slot.status === 'future'
            ? 'future'
            : 'missed_twice';
      cells.push({ key: slot.start, state });
    }
  }

  // When ascending, reverse so newest is top-left and oldest is
  // bottom-right. Padding (future cells) always goes at the end,
  // pushing oldest cells off-screen when the grid is full.
  if (ascending) cells.reverse();

  // Pad the END with "future" placeholders so the strip always fills the grid.
  let padIndex = 0;
  while (cells.length < totalCells) {
    cells.push({ key: `pad-${padIndex++}`, state: 'future' });
  }

  // Trim if we somehow have more (defensive) — drop oldest cells (they
  // are off-screen to the right / bottom when ascending).
  if (cells.length > totalCells) {
    cells.length = totalCells;
  }

  // Chunk into rows
  const chunkedRows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += columns) {
    chunkedRows.push(cells.slice(i, i + columns));
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.colorDot, { backgroundColor: habit.color }]} />
          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>
          <Text style={styles.frequencyTag}>{getFrequencyLabel(habit.frequency)}</Text>
        </View>
        <View style={styles.metaRow}>
          <View
            style={[styles.cadenceDot, { backgroundColor: cadenceColor }]}
            accessibilityLabel={`Cadence ${cadenceStatus}`}
          />
          <Text style={styles.meta}>
            {streak}
            {habit.frequency.kind === 'perWeek' ? 'w' : 'd'} · {rate}%
          </Text>
        </View>
      </View>

      <View>
        {chunkedRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell) => (
              <Cell key={cell.key} state={cell.state} color={habit.color} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function Cell({
  state,
  color,
}: {
  state:
    | 'completed'
    | 'completed_filler'
    | 'missed_once'
    | 'missed_twice'
    | 'skipped'
    | 'empty'
    | 'future';
  color: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        cell: {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: 4,
        },
      }),
    [colors],
  );

  // Both "future" and "empty" render as the same dark filled box — keeps
  // the strip uniform and visually quiet for cells the user hasn't acted on.
  // "completed_filler" renders the habit color at reduced opacity so the
  // gap days inside a target-met week read as part of one continuous "won"
  // block without claiming the user actually completed on those days.
  // "missed_once" is the dark-gray warning bar (one cadence slot blown
  // past); "missed_twice" is the red bar (two consecutive misses).
  let backgroundColor: string;
  let opacity = 1;
  switch (state) {
    case 'completed':
      backgroundColor = color;
      break;
    case 'completed_filler':
      backgroundColor = color;
      opacity = 0.3;
      break;
    case 'missed_once':
      backgroundColor = colors.cellMissedOnce;
      break;
    case 'missed_twice':
      backgroundColor = colors.cellMissedTwice;
      break;
    case 'skipped':
      backgroundColor = colors.cellSkipped;
      break;
    case 'future':
    case 'empty':
    default:
      backgroundColor = colors.cellEmpty;
  }

  return <View style={[styles.cell, { backgroundColor, opacity }]} />;
}
