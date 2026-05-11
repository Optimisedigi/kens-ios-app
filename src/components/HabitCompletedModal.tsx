import React, { useMemo } from 'react';
import { Modal, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Habit } from '../types/habit';
import { getCompletionsInRange, getDueDayCount } from '../utils/dateUtils';

interface HabitCompletedModalProps {
  visible: boolean;
  habit: Habit | null;
  onClose: () => void;
}

/**
 * Congratulations modal shown when the user ticks the final day of a
 * fixed-campaign habit (one with an `endDate`). Mirrors NoteEditorModal's
 * sheet styling so the visual language stays consistent.
 */
export function HabitCompletedModal({ visible, habit, onClose }: HabitCompletedModalProps) {
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
          padding: 22,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          alignItems: 'center',
        },
        bigEmoji: {
          fontSize: 56,
          marginBottom: 8,
        },
        title: {
          color: colors.textPrimary,
          fontSize: 22,
          fontWeight: '700',
          marginBottom: 6,
          textAlign: 'center',
        },
        subtitle: {
          color: colors.textSecondary,
          fontSize: 15,
          textAlign: 'center',
          marginBottom: 14,
        },
        summary: {
          color: colors.textPrimary,
          fontSize: 15,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 4,
        },
        verdict: {
          color: colors.textSecondary,
          fontSize: 14,
          textAlign: 'center',
          marginBottom: 20,
        },
        button: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 32,
        },
        buttonText: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '600',
        },
      }),
    [colors],
  );

  if (!habit || !habit.endDate) return null;

  const anchorStart =
    habit.completions.length > 0 ? [...habit.completions].sort()[0] : habit.createdAt;
  const expected = getDueDayCount(habit, anchorStart, habit.endDate);
  const done = getCompletionsInRange(habit, anchorStart, habit.endDate);
  const missed = Math.max(0, expected - done);

  // perWeek talks in "slots" (each completion is a slot toward the weekly
  // target); the other cadences talk in "days" since each due day is one
  // expected completion.
  const unit = habit.frequency.kind === 'perWeek' ? 'slot' : 'day';
  const unitPlural = unit === 'slot' ? 'slots' : 'days';
  const summary = `${done} of ${expected} ${expected === 1 ? unit : unitPlural} complete`;
  const verdict =
    missed === 0 ? 'Flawless! 🏆' : `You missed ${missed} ${missed === 1 ? unit : unitPlural}.`;

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.bigEmoji}>🎉</Text>
            <Text style={styles.title}>Congratulations!</Text>
            <Text style={styles.subtitle}>
              You completed {habit.emoji} {habit.name}!
            </Text>
            <Text style={styles.summary}>{summary}</Text>
            <Text style={styles.verdict}>{verdict}</Text>
            <Pressable onPress={handleDone} style={styles.button}>
              <Text style={styles.buttonText}>Done</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
