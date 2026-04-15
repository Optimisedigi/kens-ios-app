# Plan: Edit Habits in Settings + Frequency-Aware "Don't Miss Twice" Messaging

## Summary

Three features:
- Allow editing habits (name, emoji, frequency) from Settings
- Show the selected frequency of each habit in Settings
- Rework the "Don't miss twice" message to be frequency-aware and only show after the habit's first completion

## Analysis

### Status Logic Trace

The existing `getHabitStatus()` in `src/utils/dateUtils.ts` (line 39-77) already uses `frequencyDays` correctly. Tracing through:

**Daily (f=1):** Complete Day 1 → Day 2 skip → `daysSince=1, >= f=1, < f*2=2` → "warning" ✓

**Every 2 days (f=2):** Complete Day 1 → Day 2 safe → Day 3 `daysSince=2, >= f=2, < f*2=4` → "warning" at day 3. `daysSince=4` → "missed_twice" at day 5. User said "in 2 days you miss" = warning after 2-day gap ✓

**Weekly (f=7):** Complete Day 1 → Days 2-7 safe → Day 8+ `daysSince >= 7, < 14` → "warning" each day after week passes ✓

The existing math is correct. The only change needed is in the **labels** shown in `HabitCard.tsx`.

### New Label Logic

The `getStatusLabel` function currently takes just a status string. It needs to take the full habit to:
- Check `completions.length > 0` (has the habit been started?)
- Include `habit.name` in the "Don't miss twice" message

| Status | Before first completion | After first completion |
|---|---|---|
| `completed_today` | "Done ✓" | "Done ✓" |
| `new` | "Start today!" | N/A |
| `safe` | "Start today!" | "On track" |
| `warning` | "Start today!" | "Don't miss twice: {name}!" |
| `missed_twice` | "Start today!" | "Missed twice — get back on track!" |

### Edit Habit Flow

Settings → tap "Edit" on a habit → modal opens pre-populated → user edits → save → back to settings. Reuses same UI pattern as `add-habit.tsx`.

### Files to Change

- **`src/storage/habitStorage.ts`** (line ~53) — Add `updateHabit()` function after `addHabit`
- **`src/hooks/useHabits.ts`** (line ~35) — Import and expose `updateHabit` callback
- **`app/edit-habit.tsx`** — New file, modal screen (mirrors `add-habit.tsx` pattern)
- **`app/_layout.tsx`** (line ~30) — Register `edit-habit` Stack.Screen
- **`app/(tabs)/settings.tsx`** (line ~68-93) — Show frequency label + Edit button per habit row
- **`src/components/HabitCard.tsx`** (line ~35-50) — Update `getStatusLabel` signature and logic

## Steps

1. Add `updateHabit(id, updates)` function to `src/storage/habitStorage.ts` that maps over habits, merges `{name?, emoji?, frequencyDays?}` into the matching habit by id, saves, and returns the updated array
2. Import `updateHabit` as `updateHabitStorage` in `src/hooks/useHabits.ts` and add a `updateHabit` callback that calls storage and sets state, then return it from the hook
3. Create `app/edit-habit.tsx` as a new modal screen that reads `id` from `useLocalSearchParams`, finds the habit via `useHabits`, pre-populates emoji/name/frequency pickers (same UI as `add-habit.tsx`), and calls `updateHabit` on save then navigates back
4. Register the `edit-habit` route in `app/_layout.tsx` as a modal Stack.Screen with title "Edit Habit"
5. Update `app/(tabs)/settings.tsx` to show the frequency label (Daily/Every 2 Days/Weekly) in the habit meta text, add an "Edit" pressable button next to the Delete button that navigates to `/edit-habit?id={habit.id}`, and import `FREQUENCY_OPTIONS` and `useRouter`
6. Update `getStatusLabel` in `src/components/HabitCard.tsx` to accept the full `HabitWithStatus` object instead of just the status string, check `completions.length > 0` to determine if the habit has been started, and show "Don't miss twice: {name}!" for warning status (only after first completion), "Start today!" for all statuses before first completion, and "On track" for safe status after first completion
