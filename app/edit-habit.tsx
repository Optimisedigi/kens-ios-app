import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useHabits } from "../src/hooks/useHabits";
import { Colors } from "../src/constants/colors";
import { FREQUENCY_OPTIONS } from "../src/types/habit";

const EMOJI_OPTIONS = [
  "🏋️", "🏃", "📖", "💧", "🧘", "😴", "🥗", "💊",
  "🎯", "📝", "🎨", "🎵", "💻", "🧹", "🌱", "🙏",
  "📱", "🚶", "🧠", "❤️", "🦷", "👁️", "🛏️", "🍳",
  "☕", "🏊", "🚲", "🧘‍♂️", "🎸", "📷", "🗣️", "💪",
];

export default function EditHabitScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, updateHabit } = useHabits();

  const habit = habits.find((h) => h.id === id);

  const [name, setName] = useState(habit?.name ?? "");
  const [selectedEmoji, setSelectedEmoji] = useState(habit?.emoji ?? "🎯");
  const [frequencyDays, setFrequencyDays] = useState(habit?.frequencyDays ?? 1);

  if (!habit) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Habit not found</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await updateHabit(habit.id, {
      name: trimmed,
      emoji: selectedEmoji,
      frequencyDays,
    });
    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
    router.back();
  };

  const canSave = name.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Emoji Picker */}
        <Text style={styles.label}>Choose an emoji</Text>
        <View style={styles.emojiGrid}>
          {EMOJI_OPTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                setSelectedEmoji(emoji);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.emojiButton,
                selectedEmoji === emoji && styles.emojiButtonSelected,
              ]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </Pressable>
          ))}
        </View>

        {/* Name Input */}
        <Text style={styles.label}>Habit name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Workout, Read, Meditate"
          placeholderTextColor={Colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={50}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {/* Frequency Picker */}
        <Text style={styles.label}>How often?</Text>
        <View style={styles.frequencyRow}>
          {FREQUENCY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setFrequencyDays(option.value);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.frequencyPill,
                frequencyDays === option.value && styles.frequencyPillSelected,
              ]}
            >
              <Text
                style={[
                  styles.frequencyPillText,
                  frequencyDays === option.value &&
                    styles.frequencyPillTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
          <Text style={styles.previewName}>
            {name.trim() || "Your habit name"}
          </Text>
        </View>

        {/* Save Button */}
        <Pressable
          style={[
            styles.saveButton,
            !canSave && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  emojiButtonSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.card,
  },
  emojiText: {
    fontSize: 24,
  },
  frequencyRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  frequencyPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.inputBackground,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  frequencyPillSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.card,
  },
  frequencyPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  frequencyPillTextSelected: {
    color: Colors.accent,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    marginBottom: 24,
  },
  preview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  previewEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  saveButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveButtonText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
});
