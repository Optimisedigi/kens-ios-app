import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useHabits } from '../../src/hooks/useHabits';
import { CalendarGrid } from '../../src/components/CalendarGrid';
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
          paddingHorizontal: 16,
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
          paddingHorizontal: 16,
          paddingBottom: 32,
        },
        statsRow: {
          flexDirection: 'row',
          gap: 6,
          marginBottom: 10,
        },
        statCard: {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 8,
          paddingVertical: 6,
          paddingHorizontal: 6,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        statValue: {
          fontSize: 17,
          fontWeight: '700',
          color: colors.textPrimary,
          marginBottom: 0,
        },
        statLabel: {
          fontSize: 10,
          color: colors.textMuted,
          textAlign: 'center',
        },
        toggleRow: {
          flexDirection: 'row',
          backgroundColor: colors.card,
          borderRadius: 10,
          padding: 3,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        toggleButton: {
          flex: 1,
          paddingVertical: 6,
          borderRadius: 8,
          alignItems: 'center',
        },
        toggleButtonActive: {
          backgroundColor: colors.accent,
        },
        toggleText: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
        },
        toggleTextActive: {
          color: colors.textPrimary,
        },
        modeHint: {
          fontSize: 12,
          color: colors.textMuted,
          marginBottom: 18,
          lineHeight: 16,
        },
        backfillRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.card,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        },
        backfillTextWrap: {
          flex: 1,
        },
        backfillLabel: {
          color: colors.textPrimary,
          fontSize: 14,
          fontWeight: '600',
        },
        backfillHelper: {
          color: colors.textMuted,
          fontSize: 11,
          marginTop: 2,
          lineHeight: 14,
        },
        calendarSection: {
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: 12,
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
          marginTop: 18,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
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
        emptyEmoji: {
          fontSize: 48,
          marginBottom: 12,
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

  const isAllView = selectedId === ALL_HABITS;
  const selectedIndex = isAllView ? -1 : habits.findIndex((h) => h.id === selectedId);
  const selectedHabit = !isAllView ? habits[selectedIndex] : null;
  const selectedRawHabit = !isAllView ? rawHabits[selectedIndex] : null;

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
          <Text style={styles.emptyEmoji}>📊</Text>
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
          {isAllView ? 'One mini-calendar per habit' : 'Tap a habit to switch views'}
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
            <Text style={styles.modeHint}>
              Each cell = one day. Color = a day you did the habit. Empty = inside the cadence
              window. Gray = missed once. Red = missed twice. Most recent on the left.
            </Text>

            {rawHabits.map((habit) => (
              <Pressable
                key={habit.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedId(habit.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open ${habit.name} stats`}
              >
                <HabitStrip habit={habit} mode="days" ascending={true} />
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
              {/* Stats cards — compact one-line layout */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{selectedHabit.currentStreak}</Text>
                  <Text style={styles.statLabel}>Current Streak</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{selectedHabit.longestStreak}</Text>
                  <Text style={styles.statLabel}>Longest Streak</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>
                    {Math.round(selectedHabit.completionRate * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>Completion Rate</Text>
                </View>
              </View>

              {/* Resilience Score + recovery analytics (Feature 6) */}
              <ResilienceCard habit={selectedRawHabit} accent={selectedRawHabit.color} />

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

              {/* Backfill toggle — only on Weeks/Months (Year grid is too
                 dense to safely target individual days). When on, day taps
                 toggle completion instead of opening the note editor. */}
              {(calendarView === 'weeks' || calendarView === 'months') && (
                <View style={styles.backfillRow}>
                  <View style={styles.backfillTextWrap}>
                    <Text style={styles.backfillLabel}>Backfill mode</Text>
                    <Text style={styles.backfillHelper}>
                      {backfillMode
                        ? 'Tap a day to mark / unmark it complete.'
                        : 'Tap a day to add a note. Turn on to log missed days.'}
                    </Text>
                  </View>
                  <Switch
                    value={backfillMode}
                    onValueChange={(next) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setBackfillMode(next);
                      if (next) setSkipMode(false);
                    }}
                    trackColor={{
                      false: colors.inputBackground,
                      true: colors.accent,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}

              {/* Skip toggle — mark a day as an explicit off / not-due day
                 (vacation, sick). A skipped day doesn't break the streak. */}
              {(calendarView === 'weeks' || calendarView === 'months') && (
                <View style={styles.backfillRow}>
                  <View style={styles.backfillTextWrap}>
                    <Text style={styles.backfillLabel}>Skip mode</Text>
                    <Text style={styles.backfillHelper}>
                      {skipMode
                        ? 'Tap a day to mark / unmark it as an off day.'
                        : "Tap a day to mark it off. Off days don't break your streak."}
                    </Text>
                  </View>
                  <Switch
                    value={skipMode}
                    onValueChange={(next) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSkipMode(next);
                      if (next) setBackfillMode(false);
                    }}
                    trackColor={{
                      false: colors.inputBackground,
                      true: colors.accent,
                    }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}

              <View style={styles.calendarSection}>
                {calendarView === 'weeks' ? (
                  <>
                    <Text style={styles.sectionTitle}>Last 8 Weeks</Text>
                    <CalendarGrid
                      habit={selectedRawHabit}
                      weeks={8}
                      backfillMode={backfillMode || skipMode}
                      onDayPress={(d) => handleDayPress(selectedRawHabit.id, d)}
                    />
                  </>
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
