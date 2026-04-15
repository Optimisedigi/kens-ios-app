# Habit Frequency Support

## Concept

Add a `frequencyDays` field to habits so "never miss twice" adapts to different cadences:

| Frequency | `frequencyDays` | Must do every... | Can skip up to... | "Missed twice" after... |
|-----------|----------------|------------------|-------------------|------------------------|
| Daily     | 1              | 1 day            | 1 day             | 2+ days gap            |
| Every 2 days | 2           | 2 days           | 2 days            | 4+ days gap            |
| Weekly    | 7              | 7 days           | 7 days            | 14+ days gap           |

General rule: gap `< frequencyDays` = safe, gap `= frequencyDays` = warning (last chance), gap `>= frequencyDays * 2` = missed twice.

More precisely, with `f = frequencyDays` and `daysSince = days since last completion`:
- `daysSince == 0` → completed today (within current period)
- `daysSince < f` → safe (still within current period)
- `daysSince >= f && daysSince < f * 2` → warning (used your grace, do it today)
- `daysSince >= f * 2` → missed twice

## Files to change

- `src/types/habit.ts` — add `frequencyDays` to `Habit`, add `FrequencyOption` type
- `src/utils/dateUtils.ts` — update `getHabitStatus`, `getCurrentStreak`, `getLongestStreak`, `getCompletionRate`, `getDayStatus`, `getMonthlyStats` to use `frequencyDays`
- `src/storage/habitStorage.ts` — update `addHabit` to accept `frequencyDays`, add migration for old habits (default to 1)
- `src/components/HabitCard.tsx` — show frequency label under habit name
- `src/components/MonthlyBreakdown.tsx` — adjust rate calculation label (no code change needed, uses dateUtils)
- `app/add-habit.tsx` — add frequency selector UI
- `src/hooks/useNotifications.ts` — notification text should reflect frequency

## Steps

1. Update `src/types/habit.ts`: add `frequencyDays: number` to `Habit` interface, add `FrequencyOption` type with label/value pairs, and export a `FREQUENCY_OPTIONS` constant array with three options: Daily (1), Every 2 Days (2), Weekly (7)
2. Update `src/storage/habitStorage.ts`: change `addHabit` to accept a `frequencyDays` parameter (default 1), and update `loadHabits` to migrate old habits missing `frequencyDays` by defaulting them to 1
3. Update `src/utils/dateUtils.ts`: rewrite `getHabitStatus` to use `habit.frequencyDays` — safe when `daysSince < f`, warning when `f <= daysSince < f*2`, missed when `daysSince >= f*2`; update `getCurrentStreak` to count consecutive completion "periods" (each completion within `frequencyDays` of the next); update `getLongestStreak` similarly; update `getCompletionRate` to use expected completions (`totalDays / frequencyDays`); update `getDayStatus` to use `frequencyDays` for gap thresholds; update `getMonthlyStats` to pass through to the updated `getDayStatus`
4. Update `app/add-habit.tsx`: add a frequency picker UI (three pill buttons: Daily, Every 2 Days, Weekly) between the name input and preview, wire selected frequency into `addHabit` call
5. Update `src/components/HabitCard.tsx`: show a small frequency label (e.g. "Weekly" or "Every 2 days") below the status text when frequency is not daily
6. Update `src/hooks/useNotifications.ts`: adjust notification body text to mention frequency (e.g. "weekly" habit vs "daily")
7. Run TypeScript compiler and linter to verify zero errors
