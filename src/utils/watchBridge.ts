import { Habit } from '../types/habit';
import { formatDate, parseDate } from './dateUtils';

/**
 * Result of attempting to apply a watch-originated "mark complete" event
 * against the current habits list.
 *
 * Set semantics (NOT toggle): if the date is already present, the call is
 * a no-op (`changed: false`). The handler never removes a completion —
 * the watch app intentionally only has a one-way trigger.
 */
export type MarkCompleteResult =
  | { ok: true; habits: Habit[]; changed: boolean }
  | { ok: false; error: 'habit-not-found' | 'invalid-date' };

/** YYYY-MM-DD shape match. Does NOT validate semantic legality of the date. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Apply an idempotent "mark habit `habitId` complete on `isoDate`" to
 * a habits list. Pure function — the input array and habit objects are
 * not mutated; on `changed: true` a new array with a new habit object is
 * returned. Used by the watch-connectivity bridge to validate inbound
 * taps before delegating to the real storage mutator.
 *
 * Invariants:
 *  - never removes a date (this is what makes it "set" not "toggle");
 *  - rejects malformed dates like `2024-13-40` even though they match
 *    the shape regex — `formatDate(parseDate(x))` round-trips and so
 *    catches month/day overflow that the `Date` constructor normalises;
 *  - returns the input array reference (via spread) when nothing changed
 *    so callers can cheaply detect no-ops with `=== input`.
 */
export function markComplete(
  habits: readonly Habit[],
  input: { habitId: string; isoDate: string },
): MarkCompleteResult {
  const { habitId, isoDate } = input;

  if (!ISO_DATE_RE.test(isoDate)) {
    return { ok: false, error: 'invalid-date' };
  }
  // Round-trip catches values that pass the shape regex but represent
  // an impossible date (e.g. 2024-13-40 -> Date normalises to 2025-02-09
  // -> formatDate returns '2025-02-09' which !== input).
  if (formatDate(parseDate(isoDate)) !== isoDate) {
    return { ok: false, error: 'invalid-date' };
  }

  const index = habits.findIndex((h) => h.id === habitId);
  if (index === -1) {
    return { ok: false, error: 'habit-not-found' };
  }

  const target = habits[index];
  if (target.completions.includes(isoDate)) {
    // Idempotent: already done for that date. Return a shallow copy so
    // the caller can treat the result uniformly without aliasing the
    // input array, but flag `changed: false` so they can skip the
    // expensive write-through to storage.
    return { ok: true, habits: [...habits], changed: false };
  }

  const nextCompletions = [...target.completions, isoDate].sort();
  const nextHabit: Habit = { ...target, completions: nextCompletions };
  const nextHabits = habits.slice();
  nextHabits[index] = nextHabit;
  return { ok: true, habits: nextHabits, changed: true };
}
