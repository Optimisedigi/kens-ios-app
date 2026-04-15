import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useHabits } from "../../src/hooks/useHabits";
import { useNotifications } from "../../src/hooks/useNotifications";
import { Colors } from "../../src/constants/colors";
import { FREQUENCY_OPTIONS } from "../../src/types/habit";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  const displayMinute = minute.toString().padStart(2, "0");
  return `${displayHour}:${displayMinute} ${period}`;
}

function getFrequencyLabel(frequencyDays: number): string {
  return (
    FREQUENCY_OPTIONS.find((o) => o.value === frequencyDays)?.label ??
    `Every ${frequencyDays} days`
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { habits, deleteHabit } = useHabits();
  const {
    settings,
    toggleNotifications,
    updateSettings,
    permissionGranted,
  } = useNotifications();
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleDeleteHabit = (id: string, name: string) => {
    Alert.alert(
      "Delete Habit",
      `Are you sure you want to delete "${name}"? This will remove all your history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteHabit(id),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Habits Management */}
        <Text style={styles.sectionTitle}>Your Habits</Text>
        <View style={styles.section}>
          {habits.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No habits yet</Text>
            </View>
          ) : (
            habits.map((habit, index) => (
              <View
                key={habit.id}
                style={[
                  styles.habitRow,
                  index < habits.length - 1 && styles.habitRowBorder,
                ]}
              >
                <View style={styles.habitInfo}>
                  <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                  <View>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.habitMeta}>
                      {getFrequencyLabel(habit.frequencyDays)} · {habit.completions.length} completions
                    </Text>
                  </View>
                </View>
                <View style={styles.habitActions}>
                  <Pressable
                    onPress={() => router.push(`/edit-habit?id=${habit.id}`)}
                    style={styles.editButton}
                  >
                    <Text style={styles.editText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteHabit(habit.id, habit.name)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Daily Reminders</Text>
              <Text style={styles.settingDescription}>
                Get reminded before you miss twice
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleNotifications}
              trackColor={{
                false: Colors.inputBackground,
                true: Colors.accent,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.enabled && (
            <>
              <View style={styles.divider} />
              <Pressable
                style={styles.settingRow}
                onPress={() => setShowTimePicker(!showTimePicker)}
              >
                <View>
                  <Text style={styles.settingLabel}>Reminder Time</Text>
                  <Text style={styles.settingDescription}>
                    {formatTime(
                      settings.reminderHour,
                      settings.reminderMinute
                    )}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              {showTimePicker && (
                <>
                  <View style={styles.divider} />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.timePickerContainer}
                  >
                    {HOUR_OPTIONS.map((hour) => (
                      <Pressable
                        key={hour}
                        onPress={() =>
                          updateSettings({ reminderHour: hour })
                        }
                        style={[
                          styles.timeOption,
                          settings.reminderHour === hour &&
                            styles.timeOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeOptionText,
                            settings.reminderHour === hour &&
                              styles.timeOptionTextSelected,
                          ]}
                        >
                          {formatTime(hour, 0)}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              )}

              {!permissionGranted && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.warningRow}>
                    <Text style={styles.warningText}>
                      ⚠️ Notification permissions not granted. Enable
                      them in your device settings.
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutTitle}>Never Miss Twice</Text>
            <Text style={styles.aboutDescription}>
              You can miss once, but never twice.{"\n"}
              Build consistency, not perfection.
            </Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  habitRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },
  habitInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  habitEmoji: {
    fontSize: 24,
  },
  habitName: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  habitMeta: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  habitActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  editText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.dangerBackground,
  },
  deleteText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyRow: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.textPrimary,
  },
  settingDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textMuted,
    fontWeight: "300",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.separator,
  },
  timePickerContainer: {
    padding: 12,
    gap: 8,
  },
  timeOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.inputBackground,
  },
  timeOptionSelected: {
    backgroundColor: Colors.accent,
  },
  timeOptionText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  timeOptionTextSelected: {
    color: Colors.textPrimary,
  },
  warningRow: {
    padding: 14,
  },
  warningText: {
    color: Colors.warning,
    fontSize: 13,
  },
  aboutRow: {
    padding: 16,
    alignItems: "center",
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  aboutDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  aboutVersion: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
