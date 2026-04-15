import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors } from "../constants/colors";

interface EmptyStateProps {
  onAddHabit: () => void;
}

export function EmptyState({ onAddHabit }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🎯</Text>
      <Text style={styles.title}>No habits yet</Text>
      <Text style={styles.subtitle}>
        Add your first habit and start building{"\n"}consistency. Remember:
        you can miss once,{"\n"}but never twice!
      </Text>
      <Pressable style={styles.button} onPress={onAddHabit}>
        <Text style={styles.buttonText}>+ Add Your First Habit</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
