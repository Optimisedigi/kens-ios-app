import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  InputAccessoryView,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { addHabit, loadNotificationSettings } from '../src/storage/habitStorage';
import { useTheme } from '../src/hooks/useTheme';
import { TimePicker } from '../src/components/TimePicker';
import { EmojiPickerModal } from '../src/components/EmojiPickerModal';
import {
  HabitFrequency,
  INTERVAL_FREQUENCY_OPTIONS,
  PER_WEEK_FREQUENCY_OPTIONS,
  WEEKDAY_LABELS,
  WEEKDAY_FULL,
} from '../src/types/habit';
import { addDays, formatDate, getToday, parseDate } from '../src/utils/dateUtils';

const KEYBOARD_ACCESSORY_ID = 'addHabitNameAccessory';

type CadenceKind = 'interval' | 'perWeek' | 'weekdays';

export default function AddHabitScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          padding: 20,
        },
        label: {
          fontSize: 16,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: 12,
          marginTop: 8,
        },
        subLabel: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
          marginBottom: 8,
          marginTop: 4,
        },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 10,
          marginBottom: 24,
        },
        nameInput: {
          flex: 1,
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: 16,
          fontSize: 18,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          minHeight: 56,
        },
        emojiBox: {
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emojiBoxText: {
          fontSize: 28,
        },
        segmentedRow: {
          flexDirection: 'row',
          backgroundColor: colors.inputBackground,
          borderRadius: 10,
          padding: 4,
          gap: 4,
          marginBottom: 14,
        },
        segment: {
          flex: 1,
          paddingVertical: 8,
          borderRadius: 8,
          alignItems: 'center',
        },
        segmentSelected: {
          backgroundColor: colors.card,
        },
        segmentText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textMuted,
        },
        segmentTextSelected: {
          color: colors.accent,
        },
        frequencyRow: {
          flexDirection: 'row',
          gap: 10,
          marginBottom: 24,
        },
        numberRow: {
          flexDirection: 'row',
          gap: 6,
          marginBottom: 24,
        },
        frequencyPill: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.inputBackground,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        numberPill: {
          flex: 1,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.inputBackground,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        frequencyPillSelected: {
          borderColor: colors.accent,
          backgroundColor: colors.card,
        },
        frequencyPillText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.textMuted,
        },
        frequencyPillTextSelected: {
          color: colors.accent,
        },
        endDateRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
        },
        endDateButton: {
          flex: 1,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 12,
        },
        endDateText: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '600',
        },
        endDateTextEmpty: {
          color: colors.textMuted,
          fontWeight: '500',
        },
        endDateClear: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        endDateClearText: {
          color: colors.textMuted,
          fontSize: 18,
          fontWeight: '600',
        },
        saveButton: {
          backgroundColor: colors.accent,
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
        },
        saveButtonDisabled: {
          opacity: 0.4,
        },
        saveButtonText: {
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: '600',
        },
        accessoryBar: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        accessoryButton: {
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: colors.inputBackground,
        },
        accessoryButtonText: {
          color: colors.accent,
          fontSize: 15,
          fontWeight: '600',
        },
        // End-date picker modal
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        sheet: {
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          width: '100%',
          maxWidth: 360,
        },
        sheetTitle: {
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: 8,
        },
        spinnerWrap: {
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        },
        actions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
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

  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🎯');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [cadenceKind, setCadenceKind] = useState<CadenceKind>('interval');
  const [intervalDays, setIntervalDays] = useState(1);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  // Seed the new-habit reminder time from the legacy global setting so the
  // user's existing default carries over to anything they create now.
  // null means "no reminder for this habit".
  const [reminderHour, setReminderHour] = useState<number | null>(20);
  const [reminderMinute, setReminderMinute] = useState<number | null>(0);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  // Local Date the spinner mutates while the modal is open. Default = a week
  // from now so the picker opens on something sensible.
  const [endDateDraft, setEndDateDraft] = useState<Date>(() => parseDate(addDays(getToday(), 7)));

  React.useEffect(() => {
    loadNotificationSettings().then((s) => {
      setReminderHour(s.reminderHour);
      setReminderMinute(s.reminderMinute);
    });
  }, []);

  const toggleWeekday = (day: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const buildFrequency = (): HabitFrequency => {
    if (cadenceKind === 'interval') {
      return { kind: 'interval', days: intervalDays };
    }
    if (cadenceKind === 'perWeek') {
      return { kind: 'perWeek', daysPerWeek };
    }
    return {
      kind: 'weekdays',
      weekdays: [...selectedWeekdays].sort((a, b) => a - b),
    };
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    await addHabit(trimmed, selectedEmoji, buildFrequency(), reminderHour, reminderMinute, endDate);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const canSave =
    name.trim().length > 0 && (cadenceKind !== 'weekdays' || selectedWeekdays.length > 0);

  // End-date picker minimum = tomorrow (an end date earlier than today
  // would mean the campaign already ended, which doesn't make sense
  // for a brand-new habit).
  const minimumEndDate = useMemo(() => parseDate(addDays(getToday(), 1)), []);

  const openEndDatePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Re-seed draft from current state every open
    const seed = endDate ? parseDate(endDate) : parseDate(addDays(getToday(), 7));
    setEndDateDraft(seed);
    setEndDatePickerOpen(true);
  };

  const handleEndDateDone = () => {
    setEndDate(formatDate(endDateDraft));
    setEndDatePickerOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Habit name + emoji box */}
        <Text style={styles.label}>Habit name</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Workout, Read, Meditate"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={50}
            returnKeyType="default"
            blurOnSubmit={false}
            inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
          />
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEmojiPickerOpen(true);
            }}
            style={styles.emojiBox}
            accessibilityLabel="Choose emoji"
          >
            <Text style={styles.emojiBoxText}>{selectedEmoji}</Text>
          </Pressable>
        </View>

        {/* Cadence kind selector */}
        <Text style={styles.label}>How often?</Text>
        <View style={styles.segmentedRow}>
          <Pressable
            onPress={() => {
              setCadenceKind('interval');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.segment, cadenceKind === 'interval' && styles.segmentSelected]}
          >
            <Text
              style={[styles.segmentText, cadenceKind === 'interval' && styles.segmentTextSelected]}
            >
              Interval
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCadenceKind('perWeek');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.segment, cadenceKind === 'perWeek' && styles.segmentSelected]}
          >
            <Text
              style={[styles.segmentText, cadenceKind === 'perWeek' && styles.segmentTextSelected]}
            >
              Per week
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setCadenceKind('weekdays');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.segment, cadenceKind === 'weekdays' && styles.segmentSelected]}
          >
            <Text
              style={[styles.segmentText, cadenceKind === 'weekdays' && styles.segmentTextSelected]}
            >
              Specific days
            </Text>
          </Pressable>
        </View>

        {cadenceKind === 'interval' ? (
          <View style={styles.frequencyRow}>
            {INTERVAL_FREQUENCY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setIntervalDays(option.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.frequencyPill,
                  intervalDays === option.value && styles.frequencyPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.frequencyPillText,
                    intervalDays === option.value && styles.frequencyPillTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : cadenceKind === 'perWeek' ? (
          <>
            <Text style={styles.subLabel}>Days per week</Text>
            <View style={styles.numberRow}>
              {PER_WEEK_FREQUENCY_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => {
                    setDaysPerWeek(n);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.numberPill, daysPerWeek === n && styles.frequencyPillSelected]}
                >
                  <Text
                    style={[
                      styles.frequencyPillText,
                      daysPerWeek === n && styles.frequencyPillTextSelected,
                    ]}
                  >
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.subLabel}>Pick the days</Text>
            <View style={styles.numberRow}>
              {WEEKDAY_LABELS.map((label, idx) => {
                const selected = selectedWeekdays.includes(idx);
                return (
                  <Pressable
                    key={idx}
                    onPress={() => toggleWeekday(idx)}
                    accessibilityLabel={WEEKDAY_FULL[idx]}
                    style={[styles.numberPill, selected && styles.frequencyPillSelected]}
                  >
                    <Text
                      style={[
                        styles.frequencyPillText,
                        selected && styles.frequencyPillTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* End date (optional) */}
        <Text style={styles.label}>End date (optional)</Text>
        <View style={styles.endDateRow}>
          <Pressable onPress={openEndDatePicker} style={styles.endDateButton}>
            <Text style={[styles.endDateText, !endDate && styles.endDateTextEmpty]}>
              {endDate
                ? parseDate(endDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Set end date ▾'}
            </Text>
          </Pressable>
          {endDate && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEndDate(null);
              }}
              style={styles.endDateClear}
              accessibilityLabel="Clear end date"
            >
              <Text style={styles.endDateClearText}>×</Text>
            </Pressable>
          )}
        </View>

        {/* Reminder time */}
        <Text style={styles.label}>Reminder time</Text>
        <TimePicker
          hour={reminderHour}
          minute={reminderMinute}
          onChange={(h, m) => {
            setReminderHour(h);
            setReminderMinute(m);
          }}
        />

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Add Habit</Text>
        </Pressable>
      </ScrollView>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
          <View style={styles.accessoryBar}>
            <Pressable
              onPress={() => Keyboard.dismiss()}
              style={styles.accessoryButton}
              hitSlop={8}
            >
              <Text style={styles.accessoryButtonText}>Close ✕</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}

      <EmojiPickerModal
        visible={emojiPickerOpen}
        currentEmoji={selectedEmoji}
        onClose={() => setEmojiPickerOpen(false)}
        onSelect={(e) => {
          setSelectedEmoji(e);
          setEmojiPickerOpen(false);
        }}
      />

      <Modal
        visible={endDatePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEndDatePickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setEndDatePickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>End date</Text>
            <View style={styles.spinnerWrap}>
              <DateTimePicker
                value={endDateDraft}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                textColor={colors.textPrimary}
                minimumDate={minimumEndDate}
                onChange={(_, selected) => {
                  if (selected) setEndDateDraft(selected);
                }}
              />
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={() => setEndDatePickerOpen(false)}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleEndDateDone} style={[styles.btn, styles.btnPrimary]}>
                <Text style={styles.btnPrimaryText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}
