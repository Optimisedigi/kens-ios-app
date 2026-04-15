# Never Miss Twice — Expo React Native App Plan

## Overview
Build a habit tracker app called "Never Miss Twice" using Expo (React Native). The core premise: you can miss a day, but never two in a row. The app visually tracks habits, lets you tap to log them, and sends notifications before you're about to miss twice.

## Tech Stack
- **Expo SDK 54** (latest stable that works with Expo Go on physical devices — SDK 55 is in transition)
- **Expo Router** — file-based routing (tabs + stack)
- **AsyncStorage** (`@react-native-async-storage/async-storage`) — for habit data persistence (non-sensitive data, simple key-value)
- **expo-notifications** — local scheduled notifications for "about to miss twice" warnings
- **expo-haptics** — haptic feedback when tapping to complete a habit
- **TypeScript** — type safety throughout

## Project Structure

The Expo project will be created in a new directory alongside the existing Swift project, or replace it. Since the user wants to go the Expo route, we'll create the Expo project in the current directory (after moving/removing the Swift files).

```
never-miss-twice/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root layout (tab navigator)
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar layout (Home, Stats, Settings)
│   │   ├── index.tsx             # Home — today's habits, tap to complete
│   │   ├── stats.tsx             # Stats — calendar/grid view of history
│   │   └── settings.tsx          # Settings — manage habits, notifications
│   └── add-habit.tsx             # Modal — add new habit
├── src/
│   ├── components/
│   │   ├── HabitCard.tsx          # Single habit row with tap-to-complete
│   │   ├── CalendarGrid.tsx       # Visual calendar showing streak data
│   │   ├── DayCell.tsx            # Single day cell (green/red/yellow/gray)
│   │   └── EmptyState.tsx         # Shown when no habits exist
│   ├── hooks/
│   │   ├── useHabits.ts           # CRUD operations for habits
│   │   └── useNotifications.ts    # Notification scheduling logic
│   ├── storage/
│   │   └── habitStorage.ts        # AsyncStorage wrapper for habit data
│   ├── types/
│   │   └── habit.ts               # TypeScript type definitions
│   ├── utils/
│   │   └── dateUtils.ts           # Date helpers (today, streaks, etc.)
│   └── constants/
│       └── colors.ts              # App color palette
├── assets/                        # App icon, splash screen
├── app.json                       # Expo config
├── package.json
└── tsconfig.json
```

## Data Model

```typescript
// src/types/habit.ts

interface Habit {
  id: string;                    // UUID
  name: string;                  // e.g., "Workout", "Sleep Early", "Read"
  emoji: string;                 // Visual identifier, e.g., "🏋️", "😴", "📖"
  createdAt: string;             // ISO date string
  completions: string[];         // Array of ISO date strings when completed
}

// Derived state (computed, not stored):
// - lastCompleted: most recent date in completions
// - daysSinceLastCompleted: diff between today and lastCompleted
// - status: "completed_today" | "safe" (1 day gap) | "warning" (about to miss twice) | "missed_twice" (2+ days gap)
```

## Screens

### Home Screen (tabs/index.tsx)
- Shows today's date at top
- Lists all habits as tappable cards
- Each card shows: emoji, name, status indicator
- Tap = log for today (with haptic feedback via `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`)
- Cards have visual states:
  - ✅ Green border/check — completed today
  - 🟡 Yellow/amber — last done yesterday, safe but do it today
  - 🔴 Red — missed twice! Needs attention
  - ⚪ Gray — completed yesterday, still within the "never miss twice" window

### Stats Screen (tabs/stats.tsx)
- Calendar grid view (like GitHub contribution graph)
- Select a habit from a horizontal picker at top
- Each day cell is colored:
  - Green = completed
  - Red = missed twice (2+ consecutive days without)
  - Yellow = missed once (gap of 1 day)
  - Gray = no data / before habit was created
- Shows streak stats: current streak, longest streak, completion rate

### Settings Screen (tabs/settings.tsx)
- List of habits with edit/delete
- Notification toggle (on/off)
- Notification time picker (default: 8pm — remind before day ends)
- About section

### Add Habit Modal (add-habit.tsx)
- Text input for habit name
- Emoji picker (simple grid of common emojis)
- Save button

## Notification Logic

Using `expo-notifications` local scheduling:
- When a habit hasn't been completed today AND was last completed yesterday → schedule a notification for the user's chosen reminder time: "⚠️ You're about to miss twice on [Habit Name]! Don't break the chain."
- When a habit has already missed twice → notification: "🔴 You missed twice on [Habit Name]. Get back on track today!"
- Reschedule notifications whenever habits are completed or app is opened
- Use `Notifications.scheduleNotificationAsync()` with a time trigger

## Key Implementation Details

- **Storage**: AsyncStorage with JSON serialization. Store all habits as a single JSON array under key `"habits"`. Simple and sufficient for this use case.
- **Haptics**: `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)` on habit completion tap, `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` on successful completion.
- **Date handling**: Use simple date string comparisons (YYYY-MM-DD format). No need for a date library — built-in Date is sufficient for this use case.
- **Expo Go compatibility**: All features (AsyncStorage, local notifications, haptics) work in Expo Go. No development build needed for core features.

## Visual Design
- Dark theme by default (modern, easy on eyes)
- Clean, minimal UI
- Large tap targets for habit cards
- Satisfying completion animation (scale + check mark)
- Color coding: green (done), red (missed twice), yellow/amber (warning), gray (inactive)

## Steps

1. Clean up existing Swift project files and create new Expo project using `npx create-expo-app@latest` in the project directory
2. Install dependencies: `@react-native-async-storage/async-storage`, `expo-haptics`, `expo-notifications`, `expo-device`
3. Create TypeScript types in `src/types/habit.ts` with Habit interface and status types
4. Create color constants in `src/constants/colors.ts` with the dark theme palette
5. Create date utility functions in `src/utils/dateUtils.ts` (getToday, getDaysBetween, getHabitStatus, getStreakData)
6. Create AsyncStorage wrapper in `src/storage/habitStorage.ts` (loadHabits, saveHabits, addHabit, deleteHabit, toggleCompletion)
7. Create the useHabits custom hook in `src/hooks/useHabits.ts` that wraps storage with React state
8. Create the useNotifications hook in `src/hooks/useNotifications.ts` for scheduling local notifications
9. Create UI components: HabitCard, DayCell, CalendarGrid, EmptyState in `src/components/`
10. Set up Expo Router root layout in `app/_layout.tsx` with dark theme configuration
11. Set up tab navigation in `app/(tabs)/_layout.tsx` with Home, Stats, and Settings tabs
12. Build the Home screen in `app/(tabs)/index.tsx` — today's habits list with tap-to-complete and haptic feedback
13. Build the Add Habit modal screen in `app/add-habit.tsx` with name input and emoji picker
14. Build the Stats screen in `app/(tabs)/stats.tsx` with calendar grid visualization and streak statistics
15. Build the Settings screen in `app/(tabs)/settings.tsx` with habit management, notification toggle, and reminder time picker
16. Integrate notification scheduling — reschedule notifications on app open and after habit completion
17. Test the full app flow in Expo Go: add habits, complete them, verify notifications, check stats view
