/**
 * Theme palettes. The shape is identical for `darkColors` and
 * `lightColors` — every key in one MUST exist in the other so the typed
 * `ThemeColors` contract holds for either palette. Components read from
 * the active palette via `useTheme()`; never import `Colors` directly.
 *
 * Habit completion accents use the single green habit color saved on each
 * habit and are rendered as-is on either background.
 */

export const darkColors = {
  // Backgrounds
  background: '#0D0D0D',
  card: '#1A1A1A',
  cardBorder: '#2A2A2A',

  // Status colors
  completed: '#34D399', // green — completed today
  safe: '#6B7280', // gray — completed yesterday, still safe
  warning: '#FBBF24', // amber/yellow — about to miss twice
  missed: '#EF4444', // red — missed twice

  // Calendar cells
  cellCompleted: '#34D399',
  cellMissedOnce: '#FCA5A5', // light red — first missed due slot
  cellMissedTwice: '#EF4444',
  cellEmpty: '#1F1F1F',
  cellSkipped: '#2D3748', // muted slate — an explicit "off" day (Feature 4)

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // UI elements
  accent: '#818CF8', // indigo — buttons, links
  accentPressed: '#6366F1',
  separator: '#2A2A2A',
  tabBar: '#111111',
  tabBarBorder: '#1F1F1F',
  inputBackground: '#1F1F1F',
  inputBorder: '#333333',
  danger: '#EF4444',
  dangerBackground: '#7F1D1D',
};

export const lightColors: typeof darkColors = {
  // Backgrounds
  background: '#F7F7F8',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',

  // Status colors — kept saturated so they read on either background
  completed: '#059669',
  safe: '#9CA3AF',
  warning: '#D97706',
  missed: '#DC2626',

  // Calendar cells
  cellCompleted: '#059669',
  cellMissedOnce: '#FECACA', // light red — first missed due slot
  cellMissedTwice: '#DC2626',
  cellEmpty: '#ECECEE',
  cellSkipped: '#CBD5E1', // muted slate — an explicit "off" day (Feature 4)

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',

  // UI elements
  accent: '#4F46E5',
  accentPressed: '#4338CA',
  separator: '#E5E7EB',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  inputBackground: '#F1F5F9',
  inputBorder: '#CBD5E1',
  danger: '#DC2626',
  dangerBackground: '#FEE2E2',
};

export type ThemeColors = typeof darkColors;
export type ThemeName = 'dark' | 'light';

/**
 * @deprecated Direct import. Prefer `useTheme().colors` so colors update
 * when the user toggles light/dark mode at runtime. Kept as the dark
 * palette only to avoid breaking any one-off non-component use.
 */
export const Colors = darkColors;
