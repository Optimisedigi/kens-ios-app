import React, { useMemo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { ThemeColors } from "../constants/colors";

interface DayCellProps {
  status: "completed" | "missed_twice" | "empty";
  label?: string; // Day number
  size?: number;
  /** Render a small dot in the corner if a note exists for this day */
  hasNote?: boolean;
  /** Optional press handler — if provided, the cell becomes tappable */
  onPress?: () => void;
}

function getCellColor(
  status: DayCellProps["status"],
  colors: ThemeColors
): string {
  switch (status) {
    case "completed":
      return colors.cellCompleted;
    case "missed_twice":
      return colors.cellMissedTwice;
    case "empty":
      return colors.cellEmpty;
  }
}

export function DayCell({
  status,
  label,
  size = 36,
  hasNote = false,
  onPress,
}: DayCellProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        cell: {
          alignItems: "center",
          justifyContent: "center",
          margin: 2,
          position: "relative",
        },
        label: {
          fontWeight: "600",
        },
        noteDot: {
          position: "absolute",
          top: 4,
          right: 4,
          width: 3,
          height: 3,
          borderRadius: 1.5,
          opacity: 0.55,
        },
      }),
    [colors]
  );

  const backgroundColor = getCellColor(status, colors);
  const cellStyle = [
    styles.cell,
    {
      width: size,
      height: size,
      borderRadius: 6,
      backgroundColor,
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
              color:
                status === "empty"
                  ? colors.textMuted
                  : colors.background,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
      {hasNote && (
        <View
          style={[
            styles.noteDot,
            { backgroundColor: colors.textSecondary },
          ]}
        />
      )}
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
