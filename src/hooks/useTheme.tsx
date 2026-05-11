import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  darkColors,
  lightColors,
  ThemeColors,
  ThemeName,
} from "../constants/colors";

const THEME_KEY = "@nmt/theme";

interface ThemeContextValue {
  /** Active palette — read-only, components consume `colors.x` for styling. */
  colors: ThemeColors;
  /** "dark" or "light". */
  themeName: ThemeName;
  /** Persist a new preference and switch the active palette. */
  setTheme: (name: ThemeName) => void;
  /** Convenience: flip dark↔light. */
  toggleTheme: () => void;
}

const defaultValue: ThemeContextValue = {
  colors: darkColors,
  themeName: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultValue);

/**
 * Wraps the app and provides the active color palette. Loads the saved
 * preference from AsyncStorage on mount; defaults to dark when nothing
 * is stored. Persists every change.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>("dark");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_KEY);
        if (!cancelled && (saved === "light" || saved === "dark")) {
          setThemeName(saved);
        }
      } catch {
        // Ignore — fall back to default dark theme.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeName(name);
    AsyncStorage.setItem(THEME_KEY, name).catch(() => {
      // Persistence failure is non-fatal; the in-memory state still flips.
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => {
      const next: ThemeName = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: themeName === "dark" ? darkColors : lightColors,
      themeName,
      setTheme,
      toggleTheme,
    }),
    [themeName, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Read the active palette + theme controls anywhere inside ThemeProvider. */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
