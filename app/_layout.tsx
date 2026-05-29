import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppState, Pressable } from 'react-native';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';
import { ThemeProvider, useTheme } from '../src/hooks/useTheme';
import { UpdateToast } from '../src/components/UpdateToast';
import { NewBuildBanner } from '../src/components/NewBuildBanner';
import { useHabits } from '../src/hooks/useHabits';
import { useWatchSync } from '../src/hooks/useWatchSync';
import { useNotificationActions } from '../src/hooks/useNotificationActions';
import { useWidgetSync } from '../src/hooks/useWidgetSync';
import { useStreakLiveActivity } from '../src/hooks/useStreakLiveActivity';
import { useHealthSync } from '../src/hooks/useHealthSync';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Mounts the phone<->Apple Watch sync at the app root. Uses its own
 * `useHabits()` snapshot to publish to the watch and to refresh after
 * watch-originated writes; the per-screen `useHabits()` instances each
 * pick up the change on their own `useFocusEffect` cycle.
 */
function WatchSyncMount() {
  const { rawHabits, refresh } = useHabits();
  useWatchSync(rawHabits, refresh);
  // Interactive notification actions ("Mark done" / "Snooze 1h", Feature 5).
  useNotificationActions(refresh);
  // Home/Lock-screen widget snapshot + tap-to-complete drain (Feature 1).
  useWidgetSync(rawHabits, refresh);
  // "Streak in danger" Live Activity / Dynamic Island (Feature 2).
  useStreakLiveActivity(rawHabits);
  // Apple Health auto-completion on foreground (Feature 7).
  useHealthSync(refresh);
  // The root's `useHabits` only re-loads on mount; the per-screen
  // instances each have their own state and don't notify us when they
  // mutate storage. Refresh on foreground so the watch sees changes
  // the user made on the phone the next time the app comes back up.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);
  return null;
}

/**
 * Inner layout that consumes the active palette. Split out so the
 * navigation theme + status-bar style update reactively when the user
 * toggles light/dark in Settings.
 */
function ThemedStack() {
  const { colors, themeName } = useTheme();
  const router = useRouter();

  // Top-left X close on the modal screens. expo-router gives the user a
  // swipe-down dismiss already, but an explicit button is a bigger hit
  // target and matches the rest of the app's modal language.
  const renderHeaderClose = () => (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      accessibilityLabel="Close"
      style={{ paddingHorizontal: 4, paddingVertical: 4 }}
    >
      <Ionicons name="close-outline" size={28} color={colors.textPrimary} />
    </Pressable>
  );

  const navTheme = {
    ...(themeName === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(themeName === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
      text: colors.textPrimary,
      border: colors.separator,
      primary: colors.accent,
    },
  };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-habit"
          options={{
            presentation: 'modal',
            title: 'Add Habit',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.textPrimary,
            headerLeft: renderHeaderClose,
          }}
        />
        <Stack.Screen
          name="edit-habit"
          options={{
            presentation: 'modal',
            title: 'Edit Habit',
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.textPrimary,
            headerLeft: renderHeaderClose,
          }}
        />
      </Stack>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <UpdateToast />
      <NewBuildBanner />
      <WatchSyncMount />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}
