import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Habit } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../constants/colors';
import { addDays, getDayStatus, getToday, parseDate } from '../utils/dateUtils';

interface YearGridProps {
  habit: Habit;
  /** Tapping a day inside [createdAt, today] opens the note editor. */
  onDayPress?: (dateStr: string) => void;
}

// 18 cells per row matches HabitStrip. 18 * 21 = 378 cells, enough for a
// full leap year (366) with a tiny "future" tail, just like the
// all-habits days strip.
const COLUMNS = 18;
const CELL_SIZE = 15;
const CELL_GAP = 3;
// Lighter than colors.cellEmpty so empty days are clearly visible against
// the dark card background — the all-habits strip stays as-is.
const EMPTY_CELL = '#2E2E2E';

type CellState = 'completed' | 'missed_twice' | 'skipped' | 'empty' | 'future';

interface Cell {
  dateStr: string;
  state: CellState;
  hasNote: boolean;
  inRange: boolean;
}

/** Build all 365/366 day cells for the given calendar year, Jan 1 first.
 *  The active range starts at the first completion (or createdAt if the
 *  habit has no completions yet) so a habit created weeks before it was
 *  actually started doesn't show a wall of dim grey leading up to day 1. */
function buildYearCells(habit: Habit, year: number, todayStr: string): Cell[] {
  const sortedCompletions = [...habit.completions].sort();
  const anchor = sortedCompletions[0] ?? habit.createdAt;
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const cells: Cell[] = [];
  let cursor = start;
  while (cursor <= end) {
    const inRange = cursor >= anchor && cursor <= todayStr;
    let state: CellState;
    if (!inRange) {
      // Before the habit was actually started OR after today: render
      // dim/future-style.
      state = cursor > todayStr ? 'future' : 'empty';
    } else {
      state = getDayStatus(habit, cursor);
    }
    cells.push({
      dateStr: cursor,
      state,
      hasNote: Boolean(habit.notes[cursor]),
      inRange,
    });
    cursor = addDays(cursor, 1);
  }
  return cells;
}

function getCellColor(state: CellState, habitColor: string, colors: ThemeColors): string {
  switch (state) {
    case 'completed':
      return habitColor;
    case 'missed_twice':
      return colors.cellMissedTwice;
    case 'skipped':
      return colors.cellSkipped;
    case 'future':
    case 'empty':
    default:
      return EMPTY_CELL;
  }
}

export function YearGrid({ habit, onDayPress }: YearGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        navRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
          paddingHorizontal: 4,
        },
        navButton: {
          width: 30,
          height: 30,
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
        yearLabel: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textPrimary,
        },
        yearStats: {
          fontSize: 12,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: 8,
        },
        grid: {
          alignItems: 'center',
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
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
        },
        noteDot: {
          width: 3,
          height: 3,
          borderRadius: 1.5,
          margin: 2,
          opacity: 0.6,
        },
        legend: {
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 10,
          gap: 14,
          flexWrap: 'wrap',
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
        legendNoteDot: {
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.textSecondary,
        },
        legendText: {
          color: colors.textSecondary,
          fontSize: 12,
        },
      }),
    [colors],
  );

  const todayStr = getToday();
  const todayYear = parseDate(todayStr).getFullYear();
  const createdYear = parseDate(habit.createdAt).getFullYear();

  const [year, setYear] = useState(todayYear);

  const cells = useMemo(() => buildYearCells(habit, year, todayStr), [habit, year, todayStr]);

  // Chunk into rows of COLUMNS, like HabitStrip.
  const rows: Cell[][] = useMemo(() => {
    const out: Cell[][] = [];
    for (let i = 0; i < cells.length; i += COLUMNS) {
      out.push(cells.slice(i, i + COLUMNS));
    }
    return out;
  }, [cells]);

  const canGoPrev = year > createdYear;
  const canGoNext = year < todayYear;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const completionsThisYear = habit.completions.filter(
    (d) => d >= yearStart && d <= yearEnd,
  ).length;
  const notesThisYear = Object.keys(habit.notes).filter(
    (d) => d >= yearStart && d <= yearEnd,
  ).length;

  // Days elapsed inside this year, bounded by createdAt (don't count days
  // before the habit existed) and today (don't count future days).
  const elapsedStart = habit.createdAt > yearStart ? habit.createdAt : yearStart;
  const elapsedEnd = todayStr < yearEnd ? todayStr : yearEnd;
  let daysElapsed = 0;
  if (elapsedStart <= elapsedEnd) {
    const a = parseDate(elapsedStart);
    const b = parseDate(elapsedEnd);
    daysElapsed = Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  return (
    <View>
      {/* Year nav */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => canGoPrev && setYear((y) => y - 1)}
          disabled={!canGoPrev}
          hitSlop={10}
          style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
        >
          <Text style={[styles.navChevron, !canGoPrev && styles.navChevronDisabled]}>‹</Text>
        </Pressable>
        <Text style={styles.yearLabel}>{year}</Text>
        <Pressable
          onPress={() => canGoNext && setYear((y) => y + 1)}
          disabled={!canGoNext}
          hitSlop={10}
          style={[styles.navButton, !canGoNext && styles.navButtonDisabled]}
        >
          <Text style={[styles.navChevron, !canGoNext && styles.navChevronDisabled]}>›</Text>
        </Pressable>
      </View>

      {/* Grid: 18 cells per row, Jan 1 top-left → Dec 31 bottom-right */}
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((cell) => {
              const bg = getCellColor(cell.state, habit.color, colors);
              const tappable = cell.inRange && onDayPress;
              const cellStyle = [
                styles.cell,
                {
                  backgroundColor: bg,
                  opacity: cell.inRange ? 1 : 0.45,
                },
              ];
              const inner = cell.hasNote ? (
                <View style={[styles.noteDot, { backgroundColor: colors.textSecondary }]} />
              ) : null;
              if (tappable) {
                return (
                  <Pressable
                    key={cell.dateStr}
                    onPress={() => onDayPress!(cell.dateStr)}
                    hitSlop={1}
                    style={cellStyle}
                    accessibilityLabel={cell.dateStr}
                  >
                    {inner}
                  </Pressable>
                );
              }
              return (
                <View key={cell.dateStr} style={cellStyle}>
                  {inner}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: habit.color }]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.cellMissedTwice }]} />
          <Text style={styles.legendText}>Missed twice</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendNoteDot} />
          <Text style={styles.legendText}>Has note</Text>
        </View>
      </View>

      {/* Stats line for this year, below the legend */}
      <Text style={styles.yearStats}>
        {completionsThisYear} / {daysElapsed} day
        {daysElapsed === 1 ? '' : 's'} · {notesThisYear} note
        {notesThisYear === 1 ? '' : 's'}
      </Text>
    </View>
  );
}
