import React, { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useHabits } from '../../src/hooks/useHabits';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useTheme } from '../../src/hooks/useTheme';
import { getFrequencyLabel } from '../../src/types/habit';
import { formatTime } from '../../src/components/TimePicker';
import { isLiveActivityEnabled, setLiveActivityEnabled } from '../../src/utils/liveActivity';
import { useHealthSync } from '../../src/hooks/useHealthSync';

export default function SettingsScreen() {
  const { colors, themeName, setTheme } = useTheme();
  const isDark = themeName === 'dark';
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
        content: {
          paddingHorizontal: 16,
          paddingBottom: 32,
        },
        sectionTitle: {
          fontSize: 13,
          fontWeight: '600',
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: 24,
          marginBottom: 8,
          marginLeft: 4,
        },
        section: {
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          overflow: 'hidden',
        },
        habitRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
        },
        habitRowBorder: {
          borderBottomWidth: 1,
          borderBottomColor: colors.separator,
        },
        habitInfo: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          flex: 1,
        },
        habitEmoji: {
          fontSize: 24,
        },
        habitName: {
          fontSize: 16,
          fontWeight: '500',
          color: colors.textPrimary,
        },
        habitMeta: {
          fontSize: 13,
          color: colors.textMuted,
          marginTop: 2,
        },
        habitActions: {
          flexDirection: 'row',
          gap: 8,
        },
        editButton: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: colors.inputBackground,
        },
        editText: {
          color: colors.accent,
          fontSize: 13,
          fontWeight: '600',
        },
        deleteButton: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
          backgroundColor: colors.dangerBackground,
        },
        deleteText: {
          color: colors.danger,
          fontSize: 13,
          fontWeight: '600',
        },
        emptyRow: {
          padding: 20,
          alignItems: 'center',
        },
        emptyText: {
          color: colors.textMuted,
          fontSize: 14,
        },
        settingRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 14,
        },
        settingLabel: {
          fontSize: 16,
          fontWeight: '500',
          color: colors.textPrimary,
        },
        settingDescription: {
          fontSize: 13,
          color: colors.textMuted,
          marginTop: 2,
        },
        divider: {
          height: 1,
          backgroundColor: colors.separator,
        },
        warningRow: {
          padding: 14,
        },
        warningText: {
          color: colors.warning,
          fontSize: 13,
        },
        aboutRow: {
          padding: 16,
          alignItems: 'center',
        },
        aboutTitle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: colors.textPrimary,
          marginBottom: 6,
        },
        aboutDescription: {
          fontSize: 14,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 20,
          marginBottom: 12,
        },
        aboutVersion: {
          fontSize: 12,
          color: colors.textMuted,
        },
      }),
    [colors],
  );

  const router = useRouter();
  const { habits, deleteHabit, refresh } = useHabits();
  const { settings, toggleNotifications, permissionGranted } = useNotifications();
  const [liveActivity, setLiveActivity] = useState(false);
  useEffect(() => {
    isLiveActivityEnabled().then(setLiveActivity);
  }, []);
  const { permission: healthPermission } = useHealthSync(refresh);

  const handleDeleteHabit = (id: string, name: string) => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${name}"? This will remove all your history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteHabit(id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
                style={[styles.habitRow, index < habits.length - 1 && styles.habitRowBorder]}
              >
                <View style={styles.habitInfo}>
                  <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                  <View>
                    <Text style={styles.habitName}>{habit.name}</Text>
                    <Text style={styles.habitMeta}>
                      {getFrequencyLabel(habit.frequency)} ·{' '}
                      {habit.reminderHour !== null && habit.reminderMinute !== null
                        ? `reminder ${formatTime(habit.reminderHour, habit.reminderMinute)}`
                        : 'no reminder'}
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

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>Switch between dark and light themes.</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={(v) => setTheme(v ? 'dark' : 'light')}
              trackColor={{
                false: colors.inputBackground,
                true: colors.accent,
              }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.settingLabel}>Habit Reminders</Text>
              <Text style={styles.settingDescription}>
                Each habit reminds you at its own time — set per habit in Edit.
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleNotifications}
              trackColor={{
                false: colors.inputBackground,
                true: colors.accent,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.enabled && !permissionGranted && (
            <>
              <View style={styles.divider} />
              <View style={styles.warningRow}>
                <Text style={styles.warningText}>
                  ⚠️ Notification permissions not granted. Enable them in your device settings.
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Live Activity (iOS only) */}
        {Platform.OS === 'ios' && (
          <>
            <Text style={styles.sectionTitle}>Live Activity</Text>
            <View style={styles.section}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingLabel}>Streak-at-risk Live Activity</Text>
                  <Text style={styles.settingDescription}>
                    Show a Lock Screen / Dynamic Island reminder when a streak is about to break.
                    Same-day only.
                  </Text>
                </View>
                <Switch
                  value={liveActivity}
                  onValueChange={(v) => {
                    setLiveActivity(v);
                    void setLiveActivityEnabled(v);
                  }}
                  trackColor={{ false: colors.inputBackground, true: colors.accent }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </>
        )}

        {/* Apple Health (iOS only) */}
        {Platform.OS === 'ios' && healthPermission !== 'unavailable' && (
          <>
            <Text style={styles.sectionTitle}>Apple Health</Text>
            <View style={styles.section}>
              <View style={styles.settingRow}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.settingLabel}>Auto-complete from Health</Text>
                  <Text style={styles.settingDescription}>
                    Link a measurable habit to a Health metric in Edit. The day auto-completes when
                    your Health total hits the goal.
                  </Text>
                </View>
                <Text style={styles.settingDescription}>
                  {healthPermission === 'granted'
                    ? '✓ Allowed'
                    : healthPermission === 'denied'
                      ? '⚠️ Denied'
                      : '—'}
                </Text>
              </View>
              {healthPermission === 'denied' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.warningRow}>
                    <Text style={styles.warningText}>
                      ⚠️ Health access denied. Enable it in Settings → Privacy → Health.
                    </Text>
                  </View>
                </>
              )}
            </View>
          </>
        )}

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.section}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutTitle}>Never Miss Twice</Text>
            <Text style={styles.aboutDescription}>
              You can miss once, but never twice.{'\n'}
              Build consistency, not perfection.
            </Text>
            <Text style={styles.aboutVersion}>
              Version {Constants.expoConfig?.version ?? '–'}
              {Constants.expoConfig?.ios?.buildNumber
                ? ` (${Constants.expoConfig.ios.buildNumber})`
                : ''}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
