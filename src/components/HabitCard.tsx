import React, { useMemo, useRef, useState } from 'react';
import { Pressable, Text, StyleSheet, Animated, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HabitWithStatus, getFrequencyLabel } from '../types/habit';
import { useTheme } from '../hooks/useTheme';
import { ThemeColors } from '../constants/colors';
import { getToday } from '../utils/dateUtils';
import { NoteEditorModal } from './NoteEditorModal';
import { HabitCompletedModal } from './HabitCompletedModal';

interface HabitCardProps {
  habit: HabitWithStatus;
  onToggle: (id: string) => void;
  onSaveNote: (id: string, dateStr: string, text: string | null) => void;
  /**
   * Long-press handler — marks today as a skipped / off day for the habit
   * (Feature 4). Optional so callers that don't support skipping can omit it.
   */
  onSkip?: (id: string, dateStr: string) => void;
  /**
   * Increment handler for measurable habits (Feature 3). Tapping a
   * measurable habit adds `delta` to today's count instead of toggling.
   */
  onIncrement?: (id: string, dateStr: string, delta: number) => void;
}

function getStatusColor(status: HabitWithStatus['status'], colors: ThemeColors): string {
  switch (status) {
    case 'completed_today':
      return colors.completed;
    case 'safe':
      return colors.safe;
    case 'warning':
      return colors.warning;
    case 'missed_twice':
      return colors.missed;
    case 'new':
      return colors.safe;
    default:
      return colors.cardBorder;
  }
}

function getStatusLabel(habit: HabitWithStatus): string {
  const hasStarted = habit.completions.length > 0;

  if (habit.status === 'completed_today') return 'Done ✓';
  if (habit.status === 'new') return 'Start today!';

  if (!hasStarted) return 'Start today!';

  switch (habit.status) {
    case 'safe':
      return 'On track';
    case 'warning':
      return `Don't miss twice: ${habit.name}!`;
    case 'missed_twice':
      return 'Missed twice — get back on track!';
    default:
      return '';
  }
}

export function HabitCard({ habit, onToggle, onSaveNote, onSkip, onIncrement }: HabitCardProps) {
  const isMeasurable = habit.target !== null;
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          marginHorizontal: 16,
          marginVertical: 6,
          borderLeftWidth: 4,
          borderColor: colors.cardBorder,
        },
        leftSection: {
          flexDirection: 'row',
          alignItems: 'center',
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
          fontWeight: '600',
          color: colors.textPrimary,
        },
        nameCompleted: {
          opacity: 0.6,
        },
        statusLabel: {
          fontSize: 13,
          marginTop: 3,
          fontWeight: '500',
        },
        frequencyLabel: {
          fontSize: 11,
          marginTop: 2,
          color: colors.textMuted,
        },
        rightSection: {
          marginLeft: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        },
        noteButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: 'transparent',
        },
        noteButtonGlyph: {
          fontSize: 16,
          color: colors.textMuted,
          fontWeight: '600',
        },
        checkCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkMark: {
          color: '#000',
          fontSize: 18,
          fontWeight: 'bold',
        },
        emptyCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 2,
          borderColor: colors.cardBorder,
        },
      }),
    [colors],
  );

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [noteOpen, setNoteOpen] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const today = getToday();
  const hasNoteToday = Boolean(habit.notes[today]);

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

    // Measurable habit: tap increments today's count by 1 instead of
    // toggling. The day flips to "completed" once count >= target.
    if (isMeasurable && onIncrement) {
      const nextCount = (habit.counts[today] ?? 0) + 1;
      if (habit.target !== null && nextCount >= habit.target) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onIncrement(habit.id, today, 1);
      return;
    }

    // Haptic feedback
    if (habit.status === 'completed_today') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Detect "user just turned today on" BEFORE we toggle — if today is the
    // habit's declared end date and we're flipping completed:false→true,
    // fire the one-shot congratulations modal. Keyed per (habit, endDate)
    // so re-ticks after un-ticks won't re-celebrate, but extending the
    // campaign with a new end date will let it fire again.
    const wasCompletedToday = habit.completions.includes(today);
    const turningOn = !wasCompletedToday;
    if (turningOn && habit.endDate && habit.endDate === today) {
      const flagKey = `celebrated:${habit.id}:${habit.endDate}`;
      const already = await AsyncStorage.getItem(flagKey);
      if (!already) {
        await AsyncStorage.setItem(flagKey, '1');
        setCelebrationOpen(true);
      }
    }

    onToggle(habit.id);
  };

  const statusColor = getStatusColor(habit.status, colors);
  const isCompleted = habit.status === 'completed_today';
  const isSkippedToday = habit.skips.includes(today);

  const todayCount = habit.counts[today] ?? 0;

  const handleLongPress = async () => {
    // For measurable habits, long-press decrements today's count.
    if (isMeasurable && onIncrement) {
      if (todayCount > 0) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onIncrement(habit.id, today, -1);
      }
      return;
    }
    if (!onSkip) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSkip(habit.id, today);
  };

  const openNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNoteOpen(true);
  };

  return (
    <>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={400}
          style={[
            styles.card,
            {
              borderLeftColor: isSkippedToday ? colors.cellSkipped : statusColor,
              backgroundColor: isCompleted ? colors.card : colors.card,
              opacity: isSkippedToday ? 0.6 : 1,
            },
          ]}
        >
          <View style={styles.leftSection}>
            <Text style={styles.emoji}>{habit.emoji}</Text>
            <View style={styles.textContainer}>
              <Text style={[styles.name, isCompleted && styles.nameCompleted]}>{habit.name}</Text>
              <Text style={[styles.statusLabel, { color: statusColor }]}>
                {isMeasurable
                  ? `${todayCount}/${habit.target} ${habit.unit ?? ''}`.trim()
                  : getStatusLabel(habit)}
              </Text>
              {!(
                (habit.frequency.kind === 'interval' && habit.frequency.days === 1) ||
                (habit.frequency.kind === 'weekdays' && habit.frequency.weekdays.length === 7)
              ) && <Text style={styles.frequencyLabel}>{getFrequencyLabel(habit.frequency)}</Text>}
            </View>
          </View>

          <View style={styles.rightSection}>
            {/* Note button — low-key, always visible. Filled with habit
               color when there's a note for today, muted otherwise. */}
            <Pressable
              onPress={openNote}
              hitSlop={8}
              style={[
                styles.noteButton,
                hasNoteToday && {
                  backgroundColor: habit.color,
                  borderColor: habit.color,
                },
              ]}
              accessibilityLabel={hasNoteToday ? 'Edit note for today' : 'Add note for today'}
            >
              <Text style={[styles.noteButtonGlyph, hasNoteToday && { color: colors.background }]}>
                ✎
              </Text>
            </Pressable>

            {isCompleted ? (
              <View style={[styles.checkCircle, { backgroundColor: colors.completed }]}>
                <Text style={styles.checkMark}>✓</Text>
              </View>
            ) : (
              <View style={styles.emptyCircle} />
            )}
          </View>
        </Pressable>
      </Animated.View>

      <NoteEditorModal
        visible={noteOpen}
        habit={habit}
        dateStr={today}
        onClose={() => setNoteOpen(false)}
        onSave={onSaveNote}
      />

      <HabitCompletedModal
        visible={celebrationOpen}
        habit={habit}
        onClose={() => setCelebrationOpen(false)}
      />
    </>
  );
}
