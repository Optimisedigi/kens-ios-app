import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../constants/colors";

interface DayCellProps {
  status: "completed" | "missed_twice" | "empty";
  label?: string; // Day number
  size?: number;
}

function getCellColor(
  status: DayCellProps["status"]
): string {
  switch (status) {
    case "completed":
      return Colors.cellCompleted;
    case "missed_twice":
      return Colors.cellMissedTwice;
    case "empty":
      return Colors.cellEmpty;
  }
}

export function DayCell({ status, label, size = 36 }: DayCellProps) {
  const backgroundColor = getCellColor(status);

  return (
    <View
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          borderRadius: 6,
          backgroundColor,
        },
      ]}
    >
      {label ? (
        <Text
          style={[
            styles.label,
            {
              fontSize: size * 0.35,
              color:
                status === "empty"
                  ? Colors.textMuted
                  : Colors.background,
            },
          ]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    justifyContent: "center",
    margin: 2,
  },
  label: {
    fontWeight: "600",
  },
});
