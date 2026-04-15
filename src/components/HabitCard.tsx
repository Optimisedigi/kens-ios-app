import React, { useRef } from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { HabitWithStatus, FREQUENCY_OPTIONS } from "../types/habit";
import { Colors } from "../constants/colors";

interface HabitCardProps {
  habit: HabitWithStatus;
  onToggle: (id: string) => void;
}

function getStatusColor(status: HabitWithStatus["status"]): string {
  switch (status) {
    case "completed_today":
      return Colors.completed;
    case "safe":
      return Colors.safe;
    case "warning":
      return Colors.warning;
    case "missed_twice":
      return Colors.missed;
    case "new":
      return Colors.safe;
    default:
      return Colors.cardBorder;
  }
}

function getStatusLabel(habit: HabitWithStatus): string {
  const hasStarted = habit.completions.length > 0;

  if (habit.status === "completed_today") return "Done ✓";
  if (habit.status === "new") return "Start today!";

  if (!hasStarted) return "Start today!";

  switch (habit.status) {
    case "safe":
      return "On track";
    case "warning":
      return `Don't miss twice: ${habit.name}!`;
    case "missed_twice":
      return "Missed twice — get back on track!";
    default:
      return "";
  }
}

export function HabitCard({ habit, onToggle }: HabitCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    // Animate scale
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (habit.status === "completed_today") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }

    onToggle(habit.id);
  };

  const statusColor = getStatusColor(habit.status);
  const isCompleted = habit.status === "completed_today";

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.card,
          {
            borderLeftColor: statusColor,
            backgroundColor: isCompleted
              ? Colors.card
              : Colors.card,
          },
        ]}
      >
        <View style={styles.leftSection}>
          <Text style={styles.emoji}>{habit.emoji}</Text>
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.name,
                isCompleted && styles.nameCompleted,
              ]}
            >
              {habit.name}
            </Text>
            <Text
              style={[
                styles.statusLabel,
                { color: statusColor },
              ]}
            >
              {getStatusLabel(habit)}
            </Text>
            {habit.frequencyDays > 1 && (
              <Text style={styles.frequencyLabel}>
                {FREQUENCY_OPTIONS.find((o) => o.value === habit.frequencyDays)?.label ?? `Every ${habit.frequencyDays} days`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {isCompleted ? (
            <View
              style={[
                styles.checkCircle,
                { backgroundColor: Colors.completed },
              ]}
            >
              <Text style={styles.checkMark}>✓</Text>
            </View>
          ) : (
            <View style={styles.emptyCircle} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderColor: Colors.cardBorder,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  emoji: {
    fontSize: 32,
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  nameCompleted: {
    opacity: 0.6,
  },
  statusLabel: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: "500",
  },
  frequencyLabel: {
    fontSize: 11,
    marginTop: 2,
    color: Colors.textMuted,
  },
  rightSection: {
    marginLeft: 12,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#000",
    fontSize: 18,
    fontWeight: "bold",
  },
  emptyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.cardBorder,
  },
});
