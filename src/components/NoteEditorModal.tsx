import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Habit } from '../types/habit';
import { formatDisplayDate } from '../utils/dateUtils';

interface NoteEditorModalProps {
  visible: boolean;
  habit: Habit | null;
  /** YYYY-MM-DD; the date the note belongs to */
  dateStr: string | null;
  onClose: () => void;
  /** text === null means "delete note" */
  onSave: (habitId: string, dateStr: string, text: string | null) => void;
}

export function NoteEditorModal({
  visible,
  habit,
  dateStr,
  onClose,
  onSave,
}: NoteEditorModalProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
        },
        center: {
          flex: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
        },
        sheet: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 14,
          gap: 12,
        },
        emoji: {
          fontSize: 28,
        },
        headerText: {
          flex: 1,
        },
        habitName: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '600',
        },
        dateLabel: {
          color: colors.textMuted,
          fontSize: 12,
          marginTop: 2,
        },
        input: {
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          padding: 12,
          color: colors.textPrimary,
          fontSize: 15,
          minHeight: 100,
          marginBottom: 14,
        },
        buttonRow: {
          flexDirection: 'row',
          gap: 8,
          justifyContent: 'flex-end',
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
          fontWeight: '600',
        },
        btnDanger: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.missed,
        },
        btnDangerText: {
          color: colors.missed,
          fontSize: 14,
          fontWeight: '600',
        },
        btnPrimary: {
          backgroundColor: colors.accent,
        },
        btnPrimaryText: {
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  const [text, setText] = useState('');

  // Re-seed when the modal opens for a different (habit, date)
  useEffect(() => {
    if (visible && habit && dateStr) {
      setText(habit.notes[dateStr] ?? '');
    }
  }, [visible, habit, dateStr]);

  if (!habit || !dateStr) return null;

  const existing = habit.notes[dateStr] ?? '';
  const hasExisting = existing.length > 0;

  const handleSave = () => {
    onSave(habit.id, dateStr, text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleDelete = () => {
    onSave(habit.id, dateStr, null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
        >
          <Pressable
            style={styles.sheet}
            // Stop the backdrop press from bubbling and dismissing the modal
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={styles.emoji}>{habit.emoji}</Text>
              <View style={styles.headerText}>
                <Text style={styles.habitName} numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text style={styles.dateLabel}>{formatDisplayDate(dateStr)}</Text>
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="e.g. chest day, 5km easy run, felt strong…"
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
              maxLength={500}
              textAlignVertical="top"
            />

            <View style={styles.buttonRow}>
              <Pressable onPress={onClose} style={[styles.btn, styles.btnGhost]}>
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              {hasExisting && (
                <Pressable onPress={handleDelete} style={[styles.btn, styles.btnDanger]}>
                  <Text style={styles.btnDangerText}>Delete</Text>
                </Pressable>
              )}
              <Pressable onPress={handleSave} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
