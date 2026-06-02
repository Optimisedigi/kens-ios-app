import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useHabits } from '../../src/hooks/useHabits';
import { CalendarGrid } from '../../src/components/CalendarGrid';
import { CampaignGrid } from '../../src/components/CampaignGrid';
import { MonthlyCalendar } from '../../src/components/MonthlyCalendar';
import { YearGrid } from '../../src/components/YearGrid';
import { HabitStrip } from '../../src/components/HabitStrip';
import { NoteEditorModal } from '../../src/components/NoteEditorModal';
import { ResilienceCard } from '../../src/components/ResilienceCard';
import { useTheme } from '../../src/hooks/useTheme';
import { formatDisplayDate } from '../../src/utils/dateUtils';

type CalendarView = 'weeks' | 'months' | 'year';

const ALL_HABITS = '__all__';

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        header: {
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
        },
        title: {
          fontSize: 28,
          fontWeight: 'bold',
          color: colors.textPrimary,
        },
        subtitle: {
          fontSize: 13,
          color: colors.textMuted,
          marginTop: 2,
        },
        pickerWrapper: {
          paddingBottom: 16,
        },
        pickerContainer: {
          paddingHorizontal: 20,
          gap: 8,
          alignItems: 'center',
        },
        pickerItem: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          paddingHorizontal: 14,
          height: 36,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          gap: 8,
        },
        pickerItemSelected: {
          borderColor: colors.accent,
          backgroundColor: colors.inputBackground,
        },
        pickerDot: {
          width: 10,
          height: 10,
          borderRadius: 3,
        },
        pickerName: {
          color: colors.textSecondary,
          fontSize: 14,
          fontWeight: '500',
        },
        pickerNameSelected: {
          color: colors.textPrimary,
        },
        content: {
          paddingHorizontal: 20,
          paddingBottom: 32,
        },
        // Borderless inline stat strip — three values separated by thin
        // dividers instead of three bordered cards.
        statsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 4,
          marginBottom: 24,
        },
        statCell: {
          flex: 1,
          alignItems: 'center',
        },
        statDivider: {
          width: 1,
          height: 30,
          backgroundColor: colors.separator,
        },
        statValue: {
          fontSize: 26,
          fontWeight: '800',
          color: colors.textPrimary,
          letterSpacing: -0.5,
          marginBottom: 4,
        },
        statLabel: {
          fontSize: 11,
          fontWeight: '500',
          color: colors.textMuted,
          textAlign: 'center',
        },
        // Borderless segmented control — active tab gets an accent underline.
        toggleRow: {
          flexDirection: 'row',
          gap: 22,
          marginBottom: 16,
          paddingHorizontal: 4,
        },
        toggleButton: {
          paddingBottom: 6,
          borderBottomWidth: 2,
          borderBottomColor: 'transparent',
        },
        toggleButtonActive: {
          borderBottomColor: colors.accent,
        },
        toggleText: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textMuted,
        },
        toggleTextActive: {
          color: colors.textPrimary,
        },
        divider: {
          height: 1,
          backgroundColor: colors.separator,
          marginTop: 20,
          marginBottom: 20,
        },
        modeHint: {
          fontSize: 12,
          color: colors.textMuted,
          marginBottom: 18,
          lineHeight: 16,
        },
        habitCard: {
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 16,
          marginBottom: 12,
        },
        habitCardPressed: {
          opacity: 0.7,
        },
        dayModeRow: {
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 4,
          marginTop: 12,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        dayModeButton: {
          flex: 1,
          paddingVertical: 7,
          borderRadius: 10,
          alignItems: 'center',
        },
        dayModeButtonActive: {
          backgroundColor: colors.accent,
        },
        dayModeText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
        },
        dayModeTextActive: {
          color: colors.textPrimary,
        },
        dayModeHint: {
          fontSize: 12,
          color: colors.textMuted,
          marginBottom: 12,
          marginHorizontal: 4,
          lineHeight: 16,
        },
        calendarSection: {
          backgroundColor: colors.card,
          borderRadius: 20,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        sectionTitle: {
          fontSize: 15,
          fontWeight: '600',
          color: colors.textPrimary,
          marginBottom: 12,
        },
        legend: {
          flexDirection: 'row',
          justifyContent: 'center',
          marginTop: 16,
          gap: 16,
        },
        legendItem: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        legendDot: {
          width: 10,
          height: 10,
          borderRadius: 3,
        },
        legendText: {
          color: colors.textSecondary,
          fontSize: 12,
        },
        notesSection: {
          marginTop: 24,
        },
        filterInput: {
          backgroundColor: colors.inputBackground,
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 8,
          color: colors.textPrimary,
          fontSize: 14,
          marginBottom: 12,
        },
        notesEmpty: {
          color: colors.textMuted,
          fontSize: 13,
          textAlign: 'center',
          paddingVertical: 12,
        },
        noteRow: {
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
        },
        noteDate: {
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '600',
          textTransform: 'uppercase',
          marginBottom: 4,
        },
        noteText: {
          color: colors.textPrimary,
          fontSize: 14,
          lineHeight: 20,
        },
        emptyContainer: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 80,
        },
        emptyText: {
          fontSize: 16,
          color: colors.textSecondary,
        },
      }),
    [colors],
  );

  const { habits, rawHabits, setCompletionNote, toggleCompletionForDate, toggleSkip } = useHabits();
  const [selectedId, setSelectedId] = useState<string>(ALL_HABITS);
  const [calendarView, setCalendarView] = useState<CalendarView>('months');
  const [noteDate, setNoteDate] = useState<string | null>(null);
  const [noteFilter, setNoteFilter] = useState('');
  // Backfill mode: when on, day taps in Weeks/Months toggle that day's
  // completion instead of opening the note editor. Lets the user log days
  // they forgot. Auto-resets to off whenever the selected habit changes
  // so the destructive action can't quietly persist across habits.
  const [backfillMode, setBackfillMode] = useState(false);
  // Skip mode: when on, a day tap toggles a skip / off-day instead of a
  // completion. Mutually exclusive with backfill mode; both reset when the
  // selected habit changes.
  const [skipMode, setSkipMode] = useState(false);
  React.useEffect(() => {
    setBackfillMode(false);
    setSkipMode(false);
  }, [selectedId]);

  // Resolve a day tap to the active action: skip > backfill > note.
  const handleDayPress = React.useCallback(
    (habitId: string, d: string) => {
      if (skipMode) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        toggleSkip(habitId, d);
      } else if (backfillMode) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toggleCompletionForDate(habitId, d);
      } else {
        setNoteDate(d);
      }
    },
    [skipMode, backfillMode, toggleSkip, toggleCompletionForDate],
  );

  // The three day-tap modes are mutually exclusive, so present them as one
  // segmented control. `note` is the default (neither toggle on).
  const dayMode: 'note' | 'backfill' | 'skip' = skipMode
    ? 'skip'
    : backfillMode
      ? 'backfill'
      : 'note';
  const setDayMode = React.useCallback((mode: 'note' | 'backfill' | 'skip') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBackfillMode(mode === 'backfill');
    setSkipMode(mode === 'skip');
  }, []);
  const dayModeHint =
    dayMode === 'backfill'
      ? 'Tap a day to mark / unmark it complete.'
      : dayMode === 'skip'
        ? "Tap a day to mark it off — off days don't break your streak."
        : 'Tap a day to add a note.';

  const isAllView = selectedId === ALL_HABITS;
  const selectedIndex = isAllView ? -1 : habits.findIndex((h) => h.id === selectedId);
  // Guard against the transient window where `selectedId` references a habit
  // that isn't in the freshly-reloaded list yet (e.g. right after a backfill
  // edit triggers a refresh): findIndex returns -1, and `array[-1]` is
  // `undefined`. Coalesce to null so every downstream `selectedHabit &&`
  // guard holds instead of dereferencing undefined.
  const selectedHabit = !isAllView && selectedIndex >= 0 ? habits[selectedIndex] : null;
  const selectedRawHabit = !isAllView && selectedIndex >= 0 ? rawHabits[selectedIndex] : null;

  // Build the filtered, reverse-chrono notes list for the selected habit.
  const filteredNotes = useMemo(() => {
    if (!selectedRawHabit) return [];
    const entries = Object.entries(selectedRawHabit.notes);
    const q = noteFilter.trim().toLowerCase();
    const matched = q ? entries.filter(([, text]) => text.toLowerCase().includes(q)) : entries;
    return matched.sort(([a], [b]) => (a < b ? 1 : -1));
  }, [selectedRawHabit, noteFilter]);

  if (habits.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Add some habits to see your stats</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>
          {isAllView ? 'Your habits at a glance' : 'Tap a habit to switch views'}
        </Text>
      </View>

      {/* Habit picker — "All habits" first, then each habit */}
      <View style={styles.pickerWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pickerContainer}
        >
          <Pressable
            onPress={() => setSelectedId(ALL_HABITS)}
            style={[styles.pickerItem, isAllView && styles.pickerItemSelected]}
          >
            <Text
              style={[styles.pickerName, isAllView && styles.pickerNameSelected]}
              numberOfLines={1}
            >
              All habits
            </Text>
          </Pressable>

          {habits.map((habit) => {
            const isSelected = habit.id === selectedId;
            return (
              <Pressable
                key={habit.id}
                onPress={() => setSelectedId(habit.id)}
                style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
              >
                <View style={[styles.pickerDot, { backgroundColor: habit.color }]} />
                <Text
                  style={[styles.pickerName, isSelected && styles.pickerNameSelected]}
                  numberOfLines={1}
                >
                  {habit.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isAllView ? (
          <>
            {rawHabits.map((habit) => (
              <Pressable
                key={habit.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedId(habit.id);
                }}
                style={({ pressed }) => [styles.habitCard, pressed && styles.habitCardPressed]}
                accessibilityRole="button"
                accessibilityLabel={`Open ${habit.name} stats`}
              >
                <HabitStrip habit={habit} mode="days" columns={16} ascending={true} />
              </Pressable>
            ))}

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.completed }]} />
                <Text style={styles.legendText}>On track</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.cellMissedOnce }]} />
                <Text style={styles.legendText}>Missed once</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.missed }]} />
                <Text style={styles.legendText}>Missed twice</Text>
              </View>
            </View>
          </>
        ) : (
          selectedHabit &&
          selectedRawHabit && (
            <>
              {/* Stats — borderless inline strip with dividers */}
              <View style={styles.statsRow}>
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: selectedHabit.color }]}>
                    {selectedHabit.currentStreak}
                  </Text>
                  <Text style={styles.statLabel}>Current streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: selectedHabit.color }]}>
                    {selectedHabit.longestStreak}
                  </Text>
                  <Text style={styles.statLabel}>Longest streak</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: selectedHabit.color }]}>
                    {Math.round(selectedHabit.completionRate * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>Completion</Text>
                </View>
              </View>

              {/* Resilience Score + recovery analytics (Feature 6) */}
              <ResilienceCard habit={selectedRawHabit} accent={selectedRawHabit.color} />

              <View style={styles.divider} />

              {/* Calendar view toggle */}
              <View style={styles.toggleRow}>
                <Pressable
                  onPress={() => setCalendarView('weeks')}
                  style={[
                    styles.toggleButton,
                    calendarView === 'weeks' && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[styles.toggleText, calendarView === 'weeks' && styles.toggleTextActive]}
                  >
                    Weeks
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCalendarView('months')}
                  style={[
                    styles.toggleButton,
                    calendarView === 'months' && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      calendarView === 'months' && styles.toggleTextActive,
                    ]}
                  >
                    Months
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setCalendarView('year')}
                  style={[
                    styles.toggleButton,
                    calendarView === 'year' && styles.toggleButtonActive,
                  ]}
                >
                  <Text
                    style={[styles.toggleText, calendarView === 'year' && styles.toggleTextActive]}
                  >
                    Year
                  </Text>
                </Pressable>
              </View>

              <View style={styles.calendarSection}>
                {calendarView === 'weeks' ? (
                  selectedRawHabit.endDate ? (
                    <>
                      {/* Finite campaign: show exactly the required boxes
                         from start through the end date. */}
                      <Text style={styles.sectionTitle}>Campaign</Text>
                      <CampaignGrid
                        habit={selectedRawHabit}
                        backfillMode={backfillMode || skipMode}
                        onDayPress={(d) => handleDayPress(selectedRawHabit.id, d)}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.sectionTitle}>Last 8 Weeks</Text>
                      <CalendarGrid
                        habit={selectedRawHabit}
                        weeks={8}
                        backfillMode={backfillMode || skipMode}
                        onDayPress={(d) => handleDayPress(selectedRawHabit.id, d)}
                      />
                    </>
                  )
                ) : calendarView === 'months' ? (
                  <MonthlyCalendar
                    habit={selectedRawHabit}
                    backfillMode={backfillMode || skipMode}
                    onDayPress={(d) => handleDayPress(selectedRawHabit.id, d)}
                  />
                ) : (
                  <YearGrid habit={selectedRawHabit} onDayPress={setNoteDate} />
                )}
              </View>

              {/* Day-tap mode — Note / Backfill / Skip are mutually
                 exclusive, so one compact segmented control. Sits below the
                 calendar since it controls what a day tap does. Hidden on
                 Year (too dense to tap a single day). */}
              {(calendarView === 'weeks' || calendarView === 'months') && (
                <>
                  <View style={styles.dayModeRow}>
                    {(['note', 'backfill', 'skip'] as const).map((mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => setDayMode(mode)}
                        style={[
                          styles.dayModeButton,
                          dayMode === mode && styles.dayModeButtonActive,
                        ]}
                      >
                        <Text
                          style={[styles.dayModeText, dayMode === mode && styles.dayModeTextActive]}
                        >
                          {mode === 'note' ? 'Note' : mode === 'backfill' ? 'Backfill' : 'Skip'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.dayModeHint}>{dayModeHint}</Text>
                </>
              )}

              {/* Notes section — only when this habit has any notes */}
              {Object.keys(selectedRawHabit.notes).length > 0 && (
                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Notes</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="Filter notes…"
                    placeholderTextColor={colors.textMuted}
                    value={noteFilter}
                    onChangeText={setNoteFilter}
                  />
                  {filteredNotes.length === 0 ? (
                    <Text style={styles.notesEmpty}>No notes match “{noteFilter}”</Text>
                  ) : (
                    filteredNotes.map(([date, text]) => (
                      <Pressable
                        key={date}
                        onPress={() => setNoteDate(date)}
                        style={styles.noteRow}
                      >
                        <Text style={styles.noteDate}>{formatDisplayDate(date)}</Text>
                        <Text style={styles.noteText} numberOfLines={3}>
                          {text}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </>
          )
        )}
      </ScrollView>

      <NoteEditorModal
        visible={noteDate !== null}
        habit={selectedRawHabit ?? null}
        dateStr={noteDate}
        onClose={() => setNoteDate(null)}
        onSave={setCompletionNote}
      />
    </SafeAreaView>
  );
}
