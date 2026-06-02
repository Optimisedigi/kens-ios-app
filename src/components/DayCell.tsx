import React, { useMemo } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../constants/colors';

interface DayCellProps {
  status: 'completed' | 'missed_once' | 'missed_twice' | 'skipped' | 'empty';
  label?: string; // Day number
  size?: number;
  /** Render a small dot in the corner if a note exists for this day */
  hasNote?: boolean;
  /** Optional press handler — if provided, the cell becomes tappable */
  onPress?: () => void;
  /**
   * When true, draw a faint outline on uncolored cells so they read as
   * tap targets (used by backfill mode in the Progress tab — otherwise
   * empty cells look identical to the background and the user can't
   * tell they're interactive).
   */
  tappableHint?: boolean;
}

function getCellColor(status: DayCellProps['status'], colors: ThemeColors): string {
  switch (status) {
    case 'completed':
      return colors.cellCompleted;
    case 'missed_once':
      return colors.cellMissedOnce;
    case 'missed_twice':
      return colors.cellMissedTwice;
    case 'skipped':
      return colors.cellSkipped;
    case 'empty':
      return colors.cellEmpty;
  }
}

export function DayCell({
  status,
  label,
  size = 36,
  hasNote = false,
  onPress,
  tappableHint = false,
}: DayCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        cell: {
          alignItems: 'center',
          justifyContent: 'center',
          margin: 2,
          position: 'relative',
        },
        label: {
          fontWeight: '600',
        },
        noteDot: {
          position: 'absolute',
          top: 4,
          right: 4,
          width: 3,
          height: 3,
          borderRadius: 1.5,
          opacity: 0.55,
        },
      }),
    [],
  );

  const backgroundColor = getCellColor(status, colors);
  // Empty-status cells in backfill mode get a faint dashed outline so the
  // user sees they're interactive. Colored cells already read as buttons.
  const showHint = tappableHint && status === 'empty';
  const cellStyle = [
    styles.cell,
    {
      width: size,
      height: size,
      borderRadius: 6,
      backgroundColor,
      borderWidth: showHint ? 1 : 0,
      borderColor: showHint ? colors.accent : 'transparent',
      borderStyle: showHint ? ('dashed' as const) : ('solid' as const),
    },
  ];

  const inner = (
    <>
      {label ? (
        <Text
          style={[
            styles.label,
            {
              fontSize: size * 0.35,
              color: status === 'empty' ? colors.textMuted : colors.background,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {hasNote && <View style={[styles.noteDot, { backgroundColor: colors.textSecondary }]} />}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={cellStyle} hitSlop={2}>
        {inner}
      </Pressable>
    );
  }
  return <View style={cellStyle}>{inner}</View>;
}
