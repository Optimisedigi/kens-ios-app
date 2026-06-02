import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Habit } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { DayCell } from './DayCell';
import { addDays, getDayStatus, getToday, parseDate } from '../utils/dateUtils';

interface CampaignGridProps {
  /** Habit that has a finite `endDate`. */
  habit: Habit;
  onDayPress?: (dateStr: string) => void;
  /** When true, empty cells are tappable (backfill / skip modes). */
  backfillMode?: boolean;
}

interface CampaignCell {
  dateStr: string;
  /** A due slot's representative date for status, == dateStr for interval/weekday. */
  status: 'completed' | 'missed_once' | 'missed_twice' | 'skipped' | 'empty' | 'future';
}

const CELL_SIZE = 38;

/**
 * Build exactly the boxes a finite (end-dated) campaign needs, one per due
 * day from `createdAt` through `endDate` (inclusive), oldest first.
 *
 *  - interval: every `days`-th day is a box (daily → one per day).
 *  - weekdays: one box per selected weekday in the window.
 *  - perWeek:  one box per 7-day window in the campaign.
 *
 * Days after today render as `future` (the campaign isn't over yet).
 */
function buildCampaignCells(habit: Habit): CampaignCell[] {
  if (!habit.endDate) return [];
  const todayStr = getToday();
  const start = habit.createdAt;
  const end = habit.endDate;
  const cells: CampaignCell[] = [];

  const cellFor = (dateStr: string): CampaignCell => {
    if (dateStr > todayStr) return { dateStr, status: 'future' };
    return { dateStr, status: getDayStatus(habit, dateStr) };
  };

  if (habit.frequency.kind === 'weekdays') {
    const set = new Set(habit.frequency.weekdays);
    let cur = start;
    let guard = 0;
    const maxGuard = 1000;
    while (cur <= end && guard < maxGuard) {
      if (set.has(parseDate(cur).getDay())) cells.push(cellFor(cur));
      cur = addDays(cur, 1);
      guard++;
    }
    return cells;
  }

  if (habit.frequency.kind === 'perWeek') {
    let cur = start;
    let guard = 0;
    const maxGuard = 520; // ~10 years of weeks
    while (cur <= end && guard < maxGuard) {
      cells.push(cellFor(cur));
      cur = addDays(cur, 7);
      guard++;
    }
    return cells;
  }

  // interval
  const step = Math.max(1, habit.frequency.days);
  let cur = start;
  let guard = 0;
  const maxGuard = 4000;
  while (cur <= end && guard < maxGuard) {
    cells.push(cellFor(cur));
    cur = addDays(cur, step);
    guard++;
  }
  return cells;
}

export function CampaignGrid({ habit, onDayPress, backfillMode }: CampaignGridProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { paddingHorizontal: 8, alignItems: 'center' },
        grid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
        },
        caption: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: 12,
          textAlign: 'center',
        },
      }),
    [colors],
  );

  const todayStr = getToday();
  const cells = useMemo(() => buildCampaignCells(habit), [habit]);
  const done = cells.filter((c) => c.status === 'completed').length;
  const total = cells.length;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {cells.map((cell) => {
          const tappable =
            onDayPress &&
            cell.dateStr <= todayStr &&
            (backfillMode || cell.dateStr >= habit.createdAt);
          // `future` isn't a DayCell status — render those as empty boxes.
          const cellStatus = cell.status === 'future' ? 'empty' : cell.status;
          return (
            <DayCell
              key={cell.dateStr}
              status={cellStatus}
              size={CELL_SIZE}
              hasNote={Boolean(habit.notes[cell.dateStr])}
              tappableHint={backfillMode && Boolean(tappable)}
              onPress={tappable ? () => onDayPress!(cell.dateStr) : undefined}
            />
          );
        })}
      </View>
      <Text style={styles.caption}>
        {done} of {total} {total === 1 ? 'day' : 'days'} complete
      </Text>
    </View>
  );
}
