import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { Colors } from "../src/constants/colors";

const customDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.card,
    text: Colors.textPrimary,
    border: Colors.separator,
    primary: Colors.accent,
  },
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <ThemeProvider value={customDarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-habit"
          options={{
            presentation: "modal",
            title: "Add Habit",
            headerStyle: { backgroundColor: Colors.card },
            headerTintColor: Colors.textPrimary,
          }}
        />
        <Stack.Screen
          name="edit-habit"
          options={{
            presentation: "modal",
            title: "Edit Habit",
            headerStyle: { backgroundColor: Colors.card },
            headerTintColor: Colors.textPrimary,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
