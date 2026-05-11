import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Switch,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "../hooks/useTheme";

interface TimePickerProps {
  /** null = no reminder for this habit */
  hour: number | null;
  /** null = no reminder for this habit */
  minute: number | null;
  /** Pass null to clear the reminder, or a real (hour, minute) pair. */
  onChange: (hour: number | null, minute: number | null) => void;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Format a (h, m) tuple as "h:mm AM/PM". */
export function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${pad(minute)} ${period}`;
}

export function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        },
        timeButton: {
          flex: 1,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          alignItems: "center",
        },
        timeButtonDisabled: {
          opacity: 0.6,
        },
        timeText: {
          color: colors.textPrimary,
          fontSize: 17,
          fontWeight: "600",
        },
        timeTextDisabled: {
          color: colors.textMuted,
          fontWeight: "500",
        },
        backdrop: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 20,
        },
        sheet: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          width: "100%",
          maxWidth: 360,
        },
        sheetTitle: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: "600",
          textAlign: "center",
          marginBottom: 8,
        },
        spinnerWrap: {
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
        },
        actions: {
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 8,
        },
        btn: {
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 10,
        },
        btnGhost: {
          backgroundColor: colors.inputBackground,
        },
        btnGhostText: {
          color: colors.textSecondary,
          fontSize: 14,
          fontWeight: "600",
        },
        btnPrimary: {
          backgroundColor: colors.accent,
        },
        btnPrimaryText: {
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: "600",
        },
      }),
    [colors]
  );

  const enabled = hour !== null && minute !== null;
  const [modalOpen, setModalOpen] = useState(false);
  // Local draft Date the spinner manipulates while the modal is open.
  const [draft, setDraft] = useState<Date>(() => {
    const d = new Date();
    d.setHours(hour ?? 20, minute ?? 0, 0, 0);
    return d;
  });

  const openModal = () => {
    // Re-seed draft from current props every time we open
    const d = new Date();
    d.setHours(hour ?? 20, minute ?? 0, 0, 0);
    setDraft(d);
    setModalOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggle = (next: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next) {
      // Turning the reminder on: default to 8pm if nothing was set.
      onChange(hour ?? 20, minute ?? 0);
    } else {
      onChange(null, null);
    }
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange(draft.getHours(), draft.getMinutes());
    setModalOpen(false);
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={enabled ? openModal : undefined}
        disabled={!enabled}
        style={[styles.timeButton, !enabled && styles.timeButtonDisabled]}
        accessibilityLabel={
          enabled ? "Edit reminder time" : "Reminder is off"
        }
      >
        <Text
          style={[
            styles.timeText,
            !enabled && styles.timeTextDisabled,
          ]}
        >
          {enabled ? formatTime(hour!, minute!) : "Off"}
        </Text>
      </Pressable>

      <Switch
        value={enabled}
        onValueChange={handleToggle}
        trackColor={{
          false: colors.inputBackground,
          true: colors.accent,
        }}
        thumbColor="#FFFFFF"
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setModalOpen(false)}
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>Reminder time</Text>

            <View style={styles.spinnerWrap}>
              <DateTimePicker
                value={draft}
                mode="time"
                // iOS spinner = the slot-machine wheels you wanted.
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="dark"
                textColor={colors.textPrimary}
                onChange={(_, selected) => {
                  if (selected) setDraft(selected);
                }}
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => setModalOpen(false)}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleDone}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
