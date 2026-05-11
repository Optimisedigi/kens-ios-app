import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import "react-native-reanimated";
import { ThemeProvider, useTheme } from "../src/hooks/useTheme";
import { UpdateToast } from "../src/components/UpdateToast";
import { NewBuildBanner } from "../src/components/NewBuildBanner";

export const unstable_settings = {
  anchor: "(tabs)",
};

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
      <Ionicons
        name="close-outline"
        size={28}
        color={colors.textPrimary}
      />
    </Pressable>
  );

  const navTheme = {
    ...(themeName === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(themeName === "dark" ? DarkTheme.colors : DefaultTheme.colors),
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
            presentation: "modal",
            title: "Add Habit",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.textPrimary,
            headerLeft: renderHeaderClose,
          }}
        />
        <Stack.Screen
          name="edit-habit"
          options={{
            presentation: "modal",
            title: "Edit Habit",
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.textPrimary,
            headerLeft: renderHeaderClose,
          }}
        />
      </Stack>
      <StatusBar style={themeName === "dark" ? "light" : "dark"} />
      <UpdateToast />
      <NewBuildBanner />
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
