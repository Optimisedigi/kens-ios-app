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
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useHabits } from '../src/hooks/useHabits';
import { useTheme } from '../src/hooks/useTheme';
import { TimePicker } from '../src/components/TimePicker';
import { EmojiPickerModal } from '../src/components/EmojiPickerModal';
import {
  HABIT_COLOR_PALETTE,
  HabitFrequency,
  HabitWithStatus,
  INTERVAL_FREQUENCY_OPTIONS,
  PER_WEEK_FREQUENCY_OPTIONS,
  WEEKDAY_LABELS,
  WEEKDAY_FULL,
  HEALTH_METRICS,
} from '../src/types/habit';
import { addDays, formatDate, getToday, parseDate } from '../src/utils/dateUtils';

const KEYBOARD_ACCESSORY_ID = 'editHabitNameAccessory';

type CadenceKind = 'interval' | 'perWeek' | 'weekdays';

/**
 * Wrapper that waits for `useHabits` to finish loading before mounting the
 * form. The form's `useState` initializers seed from the existing habit, so
 * the form must not mount until the habit object is actually available
 * — otherwise every field would render blank/default while the AsyncStorage
 * load is in flight.
 */
export default function EditHabitScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        errorText: {
          color: colors.textMuted,
          fontSize: 16,
          textAlign: 'center',
          marginTop: 40,
        },
        loadingText: {
          color: colors.textSecondary,
          fontSize: 16,
          textAlign: 'center',
          marginTop: 40,
        },
      }),
    [colors],
  );

  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, loading, updateHabit } = useHabits();

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const habit = habits.find((h) => h.id === id);
  if (!habit) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Habit not found</Text>
      </View>
    );
  }

  return <EditHabitForm habit={habit} updateHabit={updateHabit} />;
}

interface EditHabitFormProps {
  habit: HabitWithStatus;
  updateHabit: (
    id: string,
    updates: Partial<
      Pick<
        HabitWithStatus,
        | 'name'
        | 'emoji'
        | 'frequency'
        | 'color'
        | 'reminderHour'
        | 'reminderMinute'
        | 'endDate'
        | 'target'
        | 'unit'
        | 'healthMetric'
      >
    >,
  ) => Promise<void>;
}

function EditHabitForm({ habit, updateHabit }: EditHabitFormProps) {
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
          fontSize: 14,
          fontWeight: '600',
          color: colors.textSecondary,
          marginBottom: 8,
          marginTop: 4,
        },
        subLabel: {
          fontSize: 12,
          fontWeight: '600',
          color: colors.textMuted,
          marginBottom: 6,
          marginTop: 2,
        },
        measurableHeaderRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 8,
        },
        measurableRow: {
          flexDirection: 'row',
          gap: 10,
          marginBottom: 16,
        },
        measurableTargetInput: {
          width: 80,
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: 16,
          fontSize: 18,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          minHeight: 52,
          textAlign: 'center',
        },
        measurableUnitInput: {
          flex: 1,
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: 16,
          fontSize: 18,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          minHeight: 52,
        },
        nameRow: {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 10,
          marginBottom: 16,
        },
        nameInput: {
          flex: 1,
          backgroundColor: colors.inputBackground,
          borderRadius: 12,
          paddingHorizontal: 14,
          fontSize: 16,
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          minHeight: 52,
        },
        emojiBox: {
          width: 52,
          height: 52,
          borderRadius: 12,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          alignItems: 'center',
          justifyContent: 'center',
        },
        emojiBoxText: {
          fontSize: 26,
        },
        colorRow: {
          flexDirection: 'row',
          gap: 10,
          paddingRight: 4,
          paddingBottom: 16,
        },
        colorSwatch: {
          width: 32,
          height: 32,
          borderRadius: 10,
          borderWidth: 2,
          borderColor: 'transparent',
        },
        colorSwatchSelected: {
          borderColor: colors.textPrimary,
        },
        segmentedRow: {
          flexDirection: 'row',
          backgroundColor: colors.inputBackground,
          borderRadius: 10,
          padding: 3,
          gap: 4,
          marginBottom: 12,
        },
        segment: {
          flex: 1,
          paddingVertical: 7,
          borderRadius: 8,
          alignItems: 'center',
        },
        segmentSelected: {
          backgroundColor: colors.card,
        },
        segmentText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
        },
        segmentTextSelected: {
          color: colors.accent,
        },
        frequencyRow: {
          flexDirection: 'row',
          gap: 8,
          marginBottom: 20,
        },
        numberRow: {
          flexDirection: 'row',
          gap: 5,
          marginBottom: 20,
        },
        frequencyPill: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 10,
          backgroundColor: colors.inputBackground,
          alignItems: 'center',
          borderWidth: 2,
          borderColor: 'transparent',
        },
        numberPill: {
          flex: 1,
          paddingVertical: 10,
          borderRadius: 10,
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
          fontSize: 13,
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
          marginBottom: 20,
        },
        endDateButton: {
          flex: 1,
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
        },
        endDateText: {
          color: colors.textPrimary,
          fontSize: 15,
          fontWeight: '600',
        },
        endDateTextEmpty: {
          color: colors.textMuted,
          fontWeight: '500',
        },
        endDateClear: {
          width: 36,
          height: 36,
          borderRadius: 18,
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
          padding: 14,
          alignItems: 'center',
        },
        saveButtonDisabled: {
          opacity: 0.4,
        },
        saveButtonText: {
          color: colors.textPrimary,
          fontSize: 16,
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

  const [name, setName] = useState(habit.name);
  const [selectedEmoji, setSelectedEmoji] = useState(habit.emoji);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [cadenceKind, setCadenceKind] = useState<CadenceKind>(habit.frequency.kind);
  const [intervalDays, setIntervalDays] = useState(
    habit.frequency.kind === 'interval' ? habit.frequency.days : 1,
  );
  const [daysPerWeek, setDaysPerWeek] = useState(
    habit.frequency.kind === 'perWeek' ? habit.frequency.daysPerWeek : 3,
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    habit.frequency.kind === 'weekdays' ? habit.frequency.weekdays : [1, 2, 3, 4, 5],
  );
  const [selectedColor, setSelectedColor] = useState(habit.color);
  const [reminderHour, setReminderHour] = useState<number | null>(habit.reminderHour);
  const [reminderMinute, setReminderMinute] = useState<number | null>(habit.reminderMinute);
  const [endDate, setEndDate] = useState<string | null>(habit.endDate ?? null);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endDateDraft, setEndDateDraft] = useState<Date>(() =>
    parseDate(habit.endDate ?? addDays(getToday(), 7)),
  );
  // Measurable habit (Feature 3): seed from the existing habit.
  const [measurable, setMeasurable] = useState(habit.target !== null);
  const [targetText, setTargetText] = useState(habit.target !== null ? String(habit.target) : '8');
  const [unitText, setUnitText] = useState(habit.unit ?? '');
  // Apple Health link (Feature 7): only meaningful for measurable habits.
  const [healthMetric, setHealthMetric] = useState<string | null>(habit.healthMetric ?? null);

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

  const parsedTarget = (): number | null => {
    if (!measurable) return null;
    const n = Math.floor(Number(targetText));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const target = parsedTarget();
    await updateHabit(habit.id, {
      name: trimmed,
      emoji: selectedEmoji,
      frequency: buildFrequency(),
      color: selectedColor,
      reminderHour,
      reminderMinute,
      endDate,
      target,
      unit: measurable ? unitText.trim() || null : null,
      // Health link only applies to measurable habits with a target.
      healthMetric: measurable && target !== null ? healthMetric : null,
    });
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  const canSave =
    name.trim().length > 0 &&
    (cadenceKind !== 'weekdays' || selectedWeekdays.length > 0) &&
    (!measurable || parsedTarget() !== null);

  // End-date picker minimum = tomorrow. (Editing an existing habit whose
  // end date is already today/past is allowed via clearing — we don't let
  // the user set a brand new end in the past.)
  const minimumEndDate = useMemo(() => parseDate(addDays(getToday(), 1)), []);

  const openEndDatePicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Habit name + emoji box */}
        <Text style={styles.label}>Habit name</Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            placeholder="e.g., Workout, Read, Meditate"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
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

        {/* Color Picker — single horizontally-scrollable line */}
        <Text style={styles.label}>Color</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.colorRow}
        >
          {HABIT_COLOR_PALETTE.map((color) => (
            <Pressable
              key={color}
              onPress={() => {
                setSelectedColor(color);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selectedColor === color && styles.colorSwatchSelected,
              ]}
            />
          ))}
        </ScrollView>

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

        {/* Measurable habit (optional) */}
        <View style={styles.measurableHeaderRow}>
          <Text style={[styles.label, { marginBottom: 0 }]}>Measurable</Text>
          <Switch
            value={measurable}
            onValueChange={(next) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMeasurable(next);
            }}
            trackColor={{ false: colors.inputBackground, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
        {measurable && (
          <View style={styles.measurableRow}>
            <TextInput
              style={styles.measurableTargetInput}
              placeholder="8"
              placeholderTextColor={colors.textMuted}
              value={targetText}
              onChangeText={setTargetText}
              keyboardType="number-pad"
              maxLength={5}
              inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
            />
            <TextInput
              style={styles.measurableUnitInput}
              placeholder="unit (e.g. glasses)"
              placeholderTextColor={colors.textMuted}
              value={unitText}
              onChangeText={setUnitText}
              maxLength={20}
              inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
            />
          </View>
        )}

        {/* Apple Health link (iOS, measurable only) */}
        {Platform.OS === 'ios' && measurable && (
          <>
            <Text style={styles.subLabel}>Link to Apple Health (optional)</Text>
            <View style={styles.frequencyRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHealthMetric(null);
                }}
                style={[styles.numberPill, healthMetric === null && styles.frequencyPillSelected]}
              >
                <Text
                  style={[
                    styles.frequencyPillText,
                    healthMetric === null && styles.frequencyPillTextSelected,
                  ]}
                >
                  None
                </Text>
              </Pressable>
              {HEALTH_METRICS.map((m) => (
                <Pressable
                  key={m.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setHealthMetric(m.value);
                  }}
                  style={[
                    styles.numberPill,
                    healthMetric === m.value && styles.frequencyPillSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.frequencyPillText,
                      healthMetric === m.value && styles.frequencyPillTextSelected,
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
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
          <Text style={styles.saveButtonText}>Save Changes</Text>
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
