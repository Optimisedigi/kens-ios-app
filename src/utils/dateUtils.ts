import { Habit, HabitStatus, HabitWithStatus } from '../types/habit';

/** Returns today's date as YYYY-MM-DD string in local timezone */
export function getToday(): string {
  const now = new Date();
  return formatDate(now);
}

/** Formats a Date object as YYYY-MM-DD in local timezone */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses a YYYY-MM-DD string into a Date object (at midnight local time) */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Returns the number of days between two YYYY-MM-DD date strings */
export function getDaysBetween(dateA: string, dateB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  const diffMs = Math.abs(a.getTime() - b.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/** Returns yesterday's date as YYYY-MM-DD */
export function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDate(date);
}

/** True iff `dateStr` is one of the habit's selected weekdays. */
function isDueOnWeekday(habit: Habit, dateStr: string): boolean {
  if (habit.frequency.kind !== 'weekdays') return true;
  const weekday = parseDate(dateStr).getDay();
  return habit.frequency.weekdays.includes(weekday);
}

/**
 * Walks back from `dateStr` (inclusive) and returns the most recent due
 * weekday on or before it. Returns null only if the weekdays list is empty
 * (which the storage layer guards against).
 */
function lastDueOnOrBefore(habit: Habit, dateStr: string): string | null {
  if (habit.frequency.kind !== 'weekdays') return dateStr;
  const set = new Set(habit.frequency.weekdays);
  let cur = dateStr;
  for (let i = 0; i < 7; i++) {
    if (set.has(parseDate(cur).getDay())) return cur;
    cur = addDays(cur, -1);
  }
  return null;
}

/** Returns the next due weekday strictly after `dateStr`. */
function nextDueAfter(habit: Habit, dateStr: string): string | null {
  if (habit.frequency.kind !== 'weekdays') return addDays(dateStr, 1);
  const set = new Set(habit.frequency.weekdays);
  let cur = addDays(dateStr, 1);
  for (let i = 0; i < 7; i++) {
    if (set.has(parseDate(cur).getDay())) return cur;
    cur = addDays(cur, 1);
  }
  return null;
}

/** Returns the previous due weekday strictly before `dateStr`. */
function prevDueBefore(habit: Habit, dateStr: string): string | null {
  if (habit.frequency.kind !== 'weekdays') return addDays(dateStr, -1);
  const set = new Set(habit.frequency.weekdays);
  let cur = addDays(dateStr, -1);
  for (let i = 0; i < 7; i++) {
    if (set.has(parseDate(cur).getDay())) return cur;
    cur = addDays(cur, -1);
  }
  return null;
}

/** Counts completions in the rolling 7-day window ending on `endDateStr` (inclusive). */
function countCompletionsInRollingWeek(habit: Habit, endDateStr: string): number {
  const completionSet = new Set(habit.completions);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(endDateStr, -i);
    if (day < habit.createdAt) break;
    if (completionSet.has(day)) count++;
  }
  return count;
}

/** Gets the status of a habit based on its completions and frequency */
export function getHabitStatus(habit: Habit): HabitStatus {
  const today = getToday();

  if (habit.completions.includes(today)) {
    return 'completed_today';
  }

  if (habit.frequency.kind === 'weekdays') {
    if (habit.frequency.weekdays.length === 0) return 'safe';
    const completionSet = new Set(habit.completions);

    // Find the two most recent due-days at or before today (today inclusive).
    const lastDue = lastDueOnOrBefore(habit, today);
    const lastDueWasMissed =
      lastDue !== null && lastDue >= habit.createdAt && !completionSet.has(lastDue);

    let prevDueWasMissed = false;
    if (lastDue) {
      const prevDue = prevDueBefore(habit, lastDue);
      if (prevDue !== null && prevDue >= habit.createdAt) {
        prevDueWasMissed = !completionSet.has(prevDue);
      }
    }

    const isDueToday = isDueOnWeekday(habit, today);

    // Two consecutive missed due-days → missed_twice. (The most recent due
    // day might be today itself — but only if today is fully past, which it
    // never is from the user's POV. Today not being completed yet shouldn't
    // by itself flip the habit red, so when today is the most-recent due
    // day and is uncompleted we still count it as a miss only for streak
    // purposes; for the live status we only redline if the *previous* due
    // day was also missed.)
    if (isDueToday) {
      // Today is due. "missed_twice" only when the previous due day was
      // also missed — today is the user's chance to recover.
      const prevDue = prevDueBefore(habit, today);
      if (prevDue !== null && prevDue >= habit.createdAt && !completionSet.has(prevDue)) {
        // Previous due also missed — if today not done either, that's the
        // second consecutive miss locked in.
        const prevPrev = prevDueBefore(habit, prevDue);
        if (prevPrev !== null && prevPrev >= habit.createdAt && !completionSet.has(prevPrev)) {
          return 'missed_twice';
        }
        return 'warning';
      }
      // Today is the first due day after a recovery (or first ever).
      if (habit.completions.length === 0 && habit.createdAt === today) {
        return 'new';
      }
      return 'safe';
    }

    // Today is NOT a due day. Look at the last two due days that are fully
    // past (i.e. before today). Both missed → missed_twice; one missed
    // → warning; otherwise safe.
    if (lastDueWasMissed && prevDueWasMissed) return 'missed_twice';
    if (lastDueWasMissed) return 'warning';
    return 'safe';
  }

  if (habit.frequency.kind === 'perWeek') {
    const target = habit.frequency.daysPerWeek;
    const doneThisWeek = countCompletionsInRollingWeek(habit, today);

    // Plenty completed in the rolling week → safe.
    if (doneThisWeek >= target) return 'safe';

    // Look at the rolling week ending yesterday: how many remain to hit the
    // target after that window slides off? We measure deficits across two
    // consecutive rolling windows to decide "missed twice".
    const yesterday = addDays(today, -1);
    if (yesterday >= habit.createdAt) {
      const doneYesterdayWeek = countCompletionsInRollingWeek(habit, yesterday);
      // Two consecutive windows below target with no chance of recovery on
      // the second → missed twice. We check that the second (today's) window
      // *cannot* hit the target by completing today: if doneThisWeek+1 still
      // < target, today alone won't save it, so it's already missed twice.
      if (doneYesterdayWeek < target && doneThisWeek + 1 < target) {
        return 'missed_twice';
      }
      // One window short and today is the deciding day → warning.
      if (doneYesterdayWeek < target && doneThisWeek + 1 >= target) {
        return 'warning';
      }
    }

    // First week of the habit, target not yet met but achievable → safe/new.
    if (habit.completions.length === 0 && habit.createdAt === today) {
      return 'new';
    }
    return 'safe';
  }

  // Interval-based cadence (legacy semantics).
  const f = habit.frequency.days;

  if (habit.completions.length === 0) {
    if (habit.createdAt === today) {
      return 'new';
    }
    const daysSinceCreated = getDaysBetween(habit.createdAt, today);
    if (daysSinceCreated < f) return 'safe';
    if (daysSinceCreated < f * 2) return 'warning';
    return 'missed_twice';
  }

  const sortedCompletions = [...habit.completions].sort().reverse();
  const lastCompleted = sortedCompletions[0];
  const daysSince = getDaysBetween(lastCompleted, today);

  if (daysSince === 0) {
    return 'completed_today'; // safety check
  }

  if (daysSince < f) {
    return 'safe'; // still within current period
  }

  if (daysSince < f * 2) {
    return 'warning'; // used your grace, do it today
  }

  // daysSince >= f * 2: missed twice
  return 'missed_twice';
}

/** Gets the number of days since last completion, or null if never completed */
export function getDaysSinceLastCompleted(habit: Habit): number | null {
  if (habit.completions.length === 0) return null;
  const today = getToday();
  const sortedCompletions = [...habit.completions].sort().reverse();
  return getDaysBetween(sortedCompletions[0], today);
}

/** Calculates the current streak (consecutive completion periods ending recently) */
export function getCurrentStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;

  if (habit.frequency.kind === 'weekdays') {
    if (habit.frequency.weekdays.length === 0) return 0;
    const completionSet = new Set(habit.completions);
    const today = getToday();

    // Walk backwards over due-days starting from the most recent past or
    // present due day. Allow at most one missed due-day window before the
    // streak chain (the user hasn't necessarily done today yet). Streak =
    // count of completed due-days ending at the most recent completed one
    // with no two consecutive missed due-days between today and the chain.
    let cursor = lastDueOnOrBefore(habit, today);
    if (!cursor) return 0;

    // Skip a single trailing miss (e.g. today not yet done) without
    // breaking the streak; if two in a row are missed, streak is broken.
    let consecutiveMisses = 0;
    while (cursor && cursor >= habit.createdAt && !completionSet.has(cursor)) {
      consecutiveMisses++;
      if (consecutiveMisses >= 2) return 0;
      cursor = prevDueBefore(habit, cursor);
    }

    let streak = 0;
    while (cursor && cursor >= habit.createdAt && completionSet.has(cursor)) {
      streak++;
      cursor = prevDueBefore(habit, cursor);
    }
    return streak;
  }

  if (habit.frequency.kind === 'perWeek') {
    // A perWeek streak counts consecutive rolling-7-day windows (ending today,
    // then today-7, today-14…) where completions ≥ target.
    const target = habit.frequency.daysPerWeek;
    const today = getToday();
    let streak = 0;
    let endDate = today;
    while (endDate >= habit.createdAt) {
      const done = countCompletionsInRollingWeek(habit, endDate);
      if (done >= target) {
        streak++;
        endDate = addDays(endDate, -7);
      } else {
        break;
      }
    }
    return streak;
  }

  const today = getToday();
  const f = habit.frequency.days;
  const sortedDates = [...new Set(habit.completions)].sort().reverse();

  // The most recent completion must be within the grace window (< f*2 days ago)
  const daysSinceLast = getDaysBetween(sortedDates[0], today);
  if (daysSinceLast >= f * 2) return 0;

  let streak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = getDaysBetween(sortedDates[i], sortedDates[i - 1]);
    if (gap <= f) {
      // Within one period — still part of the streak
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/** Calculates the longest streak ever (consecutive completions within frequency) */
export function getLongestStreak(habit: Habit): number {
  if (habit.completions.length === 0) return 0;

  if (habit.frequency.kind === 'weekdays') {
    if (habit.frequency.weekdays.length === 0) return 0;
    const completionSet = new Set(habit.completions);
    const today = getToday();

    // Walk forward over due-days from createdAt to today, tracking the
    // longest run of consecutive completed due-days.
    // Find the first due-day on or after createdAt.
    const set = new Set(habit.frequency.weekdays);
    let cur = habit.createdAt;
    // Advance to first due-day if createdAt isn't one.
    let guard = 0;
    while (cur <= today && !set.has(parseDate(cur).getDay()) && guard < 7) {
      cur = addDays(cur, 1);
      guard++;
    }

    let longest = 0;
    let run = 0;
    while (cur <= today) {
      if (completionSet.has(cur)) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
      const next = nextDueAfter(habit, cur);
      if (!next) break;
      cur = next;
    }
    return longest;
  }

  if (habit.frequency.kind === 'perWeek') {
    // Step through anchored, non-overlapping 7-day windows walking backwards
    // from today and track the longest run of windows that hit the target.
    const target = habit.frequency.daysPerWeek;
    const today = getToday();
    let longest = 0;
    let run = 0;
    let endDate = today;
    while (endDate >= habit.createdAt) {
      const done = countCompletionsInRollingWeek(habit, endDate);
      if (done >= target) {
        run++;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
      endDate = addDays(endDate, -7);
    }
    return longest;
  }

  const f = habit.frequency.days;
  const sortedDates = [...new Set(habit.completions)].sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const gap = getDaysBetween(sortedDates[i - 1], sortedDates[i]);
    if (gap <= f) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

/** Calculates the completion rate (completions / expected completions based on frequency) */
export function getCompletionRate(habit: Habit): number {
  const today = getToday();
  const totalDays = getDaysBetween(habit.createdAt, today) + 1; // Include creation day
  if (totalDays === 0) return 0;
  const uniqueCompletions = new Set(habit.completions).size;

  if (habit.frequency.kind === 'perWeek') {
    // Expected = (weeks since created) * daysPerWeek, with a minimum of
    // daysPerWeek so a brand-new habit isn't auto-100%.
    const weeks = Math.max(1, totalDays / 7);
    const expected = Math.max(1, Math.ceil(weeks * habit.frequency.daysPerWeek));
    return Math.min(uniqueCompletions / expected, 1);
  }

  if (habit.frequency.kind === 'weekdays') {
    if (habit.frequency.weekdays.length === 0) return 0;
    const set = new Set(habit.frequency.weekdays);
    let expected = 0;
    let cur = habit.createdAt;
    while (cur <= today) {
      if (set.has(parseDate(cur).getDay())) expected++;
      cur = addDays(cur, 1);
    }
    return Math.min(uniqueCompletions / Math.max(expected, 1), 1);
  }

  const expectedCompletions = Math.max(1, Math.ceil(totalDays / habit.frequency.days));
  return Math.min(uniqueCompletions / expectedCompletions, 1);
}

/** Enriches a Habit with computed status and stats */
export function getHabitWithStatus(habit: Habit): HabitWithStatus {
  return {
    ...habit,
    status: getHabitStatus(habit),
    daysSinceLastCompleted: getDaysSinceLastCompleted(habit),
    currentStreak: getCurrentStreak(habit),
    longestStreak: getLongestStreak(habit),
    completionRate: getCompletionRate(habit),
  };
}

/** Adds N days to a YYYY-MM-DD date string and returns the new YYYY-MM-DD string */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Returns the YYYY-MM-DD of the Monday that starts the ISO week containing
 * `dateStr`. JS getDay(): 0=Sun, 1=Mon … 6=Sat, so we shift Sunday back to
 * the previous Monday by 6 days.
 */
export function getIsoWeekStart(dateStr: string): string {
  const dow = parseDate(dateStr).getDay();
  const daysSinceMonday = (dow + 6) % 7;
  return addDays(dateStr, -daysSinceMonday);
}

/**
 * Number of times a habit was "due" between `fromStr` and `toStr` inclusive.
 * Used for the completion-celebration summary so we can say "5 of 7 days
 * complete" without re-implementing cadence rules at the call site.
 *
 * - interval: floor(span / N) + 1, capped at completions-or-more.
 * - weekdays: count of selected weekday occurrences in the range.
 * - perWeek:  weeks-in-range * daysPerWeek (target slot count).
 */
export function getDueDayCount(habit: Habit, fromStr: string, toStr: string): number {
  if (toStr < fromStr) return 0;
  const spanDays = getDaysBetween(fromStr, toStr); // inclusive end → +1 below
  if (habit.frequency.kind === 'interval') {
    return Math.floor(spanDays / habit.frequency.days) + 1;
  }
  if (habit.frequency.kind === 'weekdays') {
    const set = new Set(habit.frequency.weekdays);
    let count = 0;
    let cur = fromStr;
    while (cur <= toStr) {
      if (set.has(parseDate(cur).getDay())) count++;
      cur = addDays(cur, 1);
    }
    return count;
  }
  // perWeek: count weeks (rounding up partial weeks) * target.
  const totalDays = spanDays + 1;
  const weeks = Math.max(1, Math.ceil(totalDays / 7));
  return weeks * habit.frequency.daysPerWeek;
}

/** Number of completions a habit recorded in `[fromStr, toStr]` inclusive. */
export function getCompletionsInRange(habit: Habit, fromStr: string, toStr: string): number {
  if (toStr < fromStr) return 0;
  let n = 0;
  for (const d of habit.completions) {
    if (d >= fromStr && d <= toStr) n++;
  }
  return n;
}

/**
 * True when the habit is on its declared `endDate` AND today is one of the
 * habit's completion dates — i.e. the user just ticked the very last day of
 * a fixed campaign. Caller is responsible for the one-shot guard so the
 * congratulations modal doesn't re-fire on subsequent renders.
 */
export function isHabitJustCompleted(habit: Habit): boolean {
  if (!habit.endDate) return false;
  const today = getToday();
  if (today !== habit.endDate) return false;
  return habit.completions.includes(today);
}

export interface FrequencySlot {
  /** Inclusive start date of this due window (YYYY-MM-DD) */
  start: string;
  /** Inclusive end date of this due window (YYYY-MM-DD) */
  end: string;
  /** "completed" if any completion fell in [start, end]; "missed" otherwise. Future slots are "future". */
  status: 'completed' | 'missed' | 'future';
}

/**
 * Builds frequency-based due slots walking forward from an anchor date,
 * oldest first. Returns up to `maxSlots` slots; slots after today are
 * flagged as "future". Used by the stats strip so the first cell is
 * day 1 of the habit's actual activity.
 *
 * The anchor defaults to `habit.createdAt`, but callers can pass an explicit
 * `anchorDate` (e.g. the first completion) so a habit that was created long
 * before it was actually started doesn't show a wall of "missed" cells.
 *
 * - Interval cadence: each slot = `days` long.
 * - Per-week cadence: each slot = a 7-day window. "completed" means the
 *   user hit `daysPerWeek` completions in that window.
 */
export function getFrequencySlotsFromStart(
  habit: Habit,
  maxSlots: number,
  anchorDate?: string,
): FrequencySlot[] {
  const todayStr = getToday();
  const completionSet = new Set(habit.completions);
  const slots: FrequencySlot[] = [];
  const anchor = anchorDate ?? habit.createdAt;

  if (habit.frequency.kind === 'perWeek') {
    const target = habit.frequency.daysPerWeek;
    for (let i = 0; i < maxSlots; i++) {
      const start = addDays(anchor, i * 7);
      const end = addDays(start, 6);

      let count = 0;
      for (let d = 0; d < 7; d++) {
        if (completionSet.has(addDays(start, d))) count++;
      }

      let status: FrequencySlot['status'];
      if (start > todayStr) {
        status = 'future';
      } else if (count >= target) {
        status = 'completed';
      } else {
        // For windows still in progress (today is inside [start, end]) we
        // treat partial as "future" so it doesn't read as a hard miss yet.
        status = end > todayStr ? 'future' : 'missed';
      }

      slots.push({ start, end, status });
    }
    return slots;
  }

  if (habit.frequency.kind === 'weekdays') {
    if (habit.frequency.weekdays.length === 0) return slots;
    const set = new Set(habit.frequency.weekdays);
    // Walk forward from anchor day-by-day, emitting one slot per due day.
    let cur = anchor;
    // Advance to first due day on or after anchor.
    let guard = 0;
    while (!set.has(parseDate(cur).getDay()) && guard < 7) {
      cur = addDays(cur, 1);
      guard++;
    }
    while (slots.length < maxSlots) {
      const start = cur;
      const end = cur;
      const completed = completionSet.has(start);
      let status: FrequencySlot['status'];
      if (completed) status = 'completed';
      else if (start > todayStr) status = 'future';
      else if (start === todayStr)
        status = 'future'; // today still in progress
      else status = 'missed';
      slots.push({ start, end, status });
      const next = nextDueAfter(habit, cur);
      if (!next) break;
      cur = next;
    }
    return slots;
  }

  const f = habit.frequency.days;
  for (let i = 0; i < maxSlots; i++) {
    const start = addDays(anchor, i * f);
    const end = addDays(start, f - 1);

    let completed = false;
    for (let d = 0; d < f; d++) {
      if (completionSet.has(addDays(start, d))) {
        completed = true;
        break;
      }
    }

    let status: FrequencySlot['status'];
    if (completed) {
      status = 'completed';
    } else if (start > todayStr) {
      status = 'future';
    } else if (end >= todayStr) {
      // Slot's window still includes today — not a hard miss yet.
      status = 'future';
    } else {
      status = 'missed';
    }

    slots.push({ start, end, status });
  }

  return slots;
}

/**
 * Builds the list of frequency-based "due slots" for a habit, going back
 * `slotsBack` slots from the slot containing today (oldest first). For
 * interval cadences each slot is `days` long; for per-week each slot is 7
 * days.
 */
export function getFrequencySlots(habit: Habit, slotsBack: number): FrequencySlot[] {
  const todayStr = getToday();
  const completionSet = new Set(habit.completions);
  const daysSinceCreated = getDaysBetween(habit.createdAt, todayStr);

  if (habit.frequency.kind === 'perWeek') {
    const target = habit.frequency.daysPerWeek;
    const currentSlotIndex = Math.floor(daysSinceCreated / 7);
    const startSlotIndex = Math.max(0, currentSlotIndex - slotsBack + 1);
    const slots: FrequencySlot[] = [];

    for (let i = startSlotIndex; i <= currentSlotIndex; i++) {
      const start = addDays(habit.createdAt, i * 7);
      const end = addDays(start, 6);

      let count = 0;
      for (let d = 0; d < 7; d++) {
        if (completionSet.has(addDays(start, d))) count++;
      }

      let status: FrequencySlot['status'];
      if (start > todayStr) {
        status = 'future';
      } else if (count >= target) {
        status = 'completed';
      } else {
        status = end > todayStr ? 'future' : 'missed';
      }

      slots.push({ start, end, status });
    }
    return slots;
  }

  if (habit.frequency.kind === 'weekdays') {
    const slots: FrequencySlot[] = [];
    if (habit.frequency.weekdays.length === 0) return slots;
    const set = new Set(habit.frequency.weekdays);

    // Collect due-days from createdAt up through today, then keep only the
    // last `slotsBack` of them.
    const dueDays: string[] = [];
    let cur = habit.createdAt;
    while (cur <= todayStr) {
      if (set.has(parseDate(cur).getDay())) dueDays.push(cur);
      cur = addDays(cur, 1);
    }
    const tail = dueDays.slice(Math.max(0, dueDays.length - slotsBack));
    for (const start of tail) {
      const completed = completionSet.has(start);
      let status: FrequencySlot['status'];
      if (completed) status = 'completed';
      else if (start === todayStr) status = 'future';
      else status = 'missed';
      slots.push({ start, end: start, status });
    }
    return slots;
  }

  const f = habit.frequency.days;
  const currentSlotIndex = Math.floor(daysSinceCreated / f);
  const startSlotIndex = Math.max(0, currentSlotIndex - slotsBack + 1);
  const slots: FrequencySlot[] = [];

  for (let i = startSlotIndex; i <= currentSlotIndex; i++) {
    const start = addDays(habit.createdAt, i * f);
    const end = addDays(start, f - 1);

    let completed = false;
    for (let d = 0; d < f; d++) {
      if (completionSet.has(addDays(start, d))) {
        completed = true;
        break;
      }
    }

    let status: FrequencySlot['status'];
    if (completed) {
      status = 'completed';
    } else if (start > todayStr) {
      status = 'future';
    } else if (end >= todayStr) {
      // Slot's window still includes today — not a hard miss yet.
      status = 'future';
    } else {
      status = 'missed';
    }

    slots.push({ start, end, status });
  }

  return slots;
}

/** Returns an array of date strings for the last N days (including today), oldest first */
export function getLastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(formatDate(date));
  }
  return days;
}

/** Gets the day-of-week label for a date (S, M, T, W, T, F, S) */
export function getDayOfWeekLabel(dateStr: string): string {
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const date = parseDate(dateStr);
  return days[date.getDay()];
}

/** Formats a date string for display, e.g., "Monday, April 14" */
export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export interface MonthlyStats {
  /** YYYY-MM format */
  month: string;
  /** Display label, e.g. "April 2026" */
  label: string;
  /** Total days in this month (up to today if current month) */
  totalDays: number;
  /** Days completed */
  completed: number;
  /** Days where habit was missed twice */
  missedTwice: number;
  /** Completion rate 0-1 */
  rate: number;
}

/** Returns monthly stats for a habit, going back `monthsBack` months from today */
export function getMonthlyStats(habit: Habit, monthsBack: number = 6): MonthlyStats[] {
  const today = new Date();
  const todayStr = getToday();
  const results: MonthlyStats[] = [];

  for (let i = 0; i < monthsBack; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth(); // 0-indexed

    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = targetDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    // Determine the range of days to check in this month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = formatDate(new Date(year, month, 1));
    const lastDayDate = new Date(year, month, daysInMonth);
    const lastDay = formatDate(lastDayDate) > todayStr ? todayStr : formatDate(lastDayDate);

    // Skip months entirely before the habit was created
    if (lastDay < habit.createdAt) continue;

    let completed = 0;
    let missedTwice = 0;
    let totalDays = 0;

    // Walk through each day of the month
    const startDay = habit.createdAt > firstDay ? habit.createdAt : firstDay;
    const startDate = parseDate(startDay);
    const endDate = parseDate(lastDay);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDate(d);
      totalDays++;
      const status = getDayStatus(habit, dateStr);
      if (status === 'completed') completed++;
      else if (status === 'missed_twice') missedTwice++;
    }

    let expectedCompletions: number;
    if (habit.frequency.kind === 'perWeek') {
      const weeks = Math.max(1, totalDays / 7);
      expectedCompletions = Math.max(1, Math.ceil(weeks * habit.frequency.daysPerWeek));
    } else if (habit.frequency.kind === 'weekdays') {
      const set = new Set(habit.frequency.weekdays);
      let dueCount = 0;
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (set.has(d.getDay())) dueCount++;
      }
      expectedCompletions = Math.max(1, dueCount);
    } else {
      expectedCompletions = Math.max(1, Math.ceil(totalDays / habit.frequency.days));
    }

    results.push({
      month: monthStr,
      label,
      totalDays,
      completed,
      missedTwice,
      rate: totalDays > 0 ? completed / expectedCompletions : 0,
    });
  }

  return results;
}

/**
 * Returns the status of a specific day for a habit:
 * "completed", "missed_twice", "empty"
 *
 * Philosophy: "You can miss once, but never twice." A single red marker is
 * placed on the day a user *crossed into* missed-twice territory.
 *
 * For interval cadences this is the day exactly `days * 2` after the last
 * completion (or createdAt). For per-week cadences this is the day where
 * the rolling 7-day windows ending on that day AND on the day before both
 * fell short of `daysPerWeek` AND the user has no way to recover on that
 * single day — i.e. the deficit became locked in.
 */
export function getDayStatus(
  habit: Habit,
  dateStr: string,
): 'completed' | 'missed_twice' | 'empty' {
  const createdDate = habit.createdAt;
  if (dateStr < createdDate) return 'empty';

  if (habit.completions.includes(dateStr)) return 'completed';

  if (habit.frequency.kind === 'weekdays') {
    if (habit.frequency.weekdays.length === 0) return 'empty';
    // Non-due day — nothing to mark.
    if (!isDueOnWeekday(habit, dateStr)) return 'empty';
    // Due day not completed. Mark "missed_twice" only when the previous due
    // day was also missed AND the day before *that* was completed (or before
    // createdAt) — keeps one mark per locked-in event.
    const prevDue = prevDueBefore(habit, dateStr);
    if (prevDue === null || prevDue < createdDate) return 'empty';
    if (habit.completions.includes(prevDue)) return 'empty';
    // Both this due day and the previous due day are missed.
    const prevPrevDue = prevDueBefore(habit, prevDue);
    if (prevPrevDue !== null && prevPrevDue >= createdDate) {
      // If the day-before-previous was *also* missed, the missed-twice
      // flag was already raised on the previous due day — don't double-mark.
      if (!habit.completions.includes(prevPrevDue)) return 'empty';
    }
    return 'missed_twice';
  }

  if (habit.frequency.kind === 'perWeek') {
    const target = habit.frequency.daysPerWeek;
    // Need at least 7 days of history to evaluate a "missed twice" event.
    const daysSinceCreated = getDaysBetween(createdDate, dateStr);
    if (daysSinceCreated < 7) return 'empty';

    const doneToday = countCompletionsInRollingWeek(habit, dateStr);
    const prevDay = addDays(dateStr, -1);
    if (prevDay < createdDate) return 'empty';
    const donePrev = countCompletionsInRollingWeek(habit, prevDay);

    // Locked-in miss: yesterday's window already short, and even completing
    // today wouldn't have reached the target on this window.
    if (donePrev < target && doneToday + 1 < target) {
      // Only mark the first day this becomes true — i.e. the day before
      // wasn't already missed_twice.
      const dayBefore = addDays(prevDay, -1);
      if (dayBefore < createdDate) return 'missed_twice';
      const doneDayBefore = countCompletionsInRollingWeek(habit, dayBefore);
      const donePrevPlusOne = donePrev + 1;
      // If the same condition held the previous day, this isn't a fresh
      // crossing — leave it empty so the calendar shows one mark per event.
      if (doneDayBefore < target && donePrevPlusOne < target) {
        return 'empty';
      }
      return 'missed_twice';
    }

    return 'empty';
  }

  const f = habit.frequency.days;
  const sortedCompletions = [...habit.completions].sort();

  // Find the previous and next completion dates around this day
  let prevCompletion: string | null = null;
  let nextCompletion: string | null = null;
  for (const comp of sortedCompletions) {
    if (comp < dateStr) prevCompletion = comp;
    else if (comp > dateStr) {
      nextCompletion = comp;
      break;
    }
  }

  // The "anchor" is whatever the gap is being measured from
  const anchor = prevCompletion ?? createdDate;
  const daysFromAnchor = getDaysBetween(anchor, dateStr);

  // Only the exact day the user crossed into "missed twice" gets the red
  // marker. If there's a next completion that lands within the same window,
  // the streak was effectively recovered before this point — no marker.
  if (daysFromAnchor === f * 2) {
    if (nextCompletion) {
      const anchorToNext = getDaysBetween(anchor, nextCompletion);
      if (anchorToNext < f * 2) return 'empty';
    }
    return 'missed_twice';
  }

  return 'empty';
}

/**
 * Per-day status used ONLY by the All Habits strip (days mode). The strip
 * reads chronologically left→right (or right→left when ascending) and
 * communicates each completion as a colored cell, then escalates missed
 * cadence slots: the first slot you blow past becomes a dark-gray
 * "missed_once" warning bar, and the *next* missed slot after that becomes
 * a red "missed_twice" bar. A completion resets the escalation.
 *
 * Rules per cadence:
 *
 *  - Interval (every N days): after a completion on day D, days D+1…D+N
 *    are inside the cadence window and stay empty. Day D+N+1 is the first
 *    "missed slot" → missed_once. Day D+2N+1 is the second consecutive
 *    missed slot → missed_twice. Day D+3N+1, D+4N+1… also missed_twice
 *    (it never escalates further). A completion anywhere along the way
 *    resets the anchor.
 *
 *  - Per-week (K/week): Mon–Sun calendar weeks. Each completion is a
 *    colored cell. If a *past* week fell short of K, the gap shows as a
 *    single warning cell on the **Sunday** of that week: missed_once if
 *    the previous week hit target (or there was no previous week), or
 *    missed_twice if the previous week also fell short. The current
 *    in-progress week never marks itself as missed; if it has already met
 *    target, days sandwiched between the first and last completion render
 *    as completed_filler so the won block reads as one stretch.
 *
 *  - Weekdays: a selected weekday that wasn't completed becomes
 *    missed_once if the previous selected weekday WAS completed (or there
 *    was none yet), and missed_twice if the previous selected weekday was
 *    also missed.
 *
 * Days before the first completion are always "empty" (the strip
 * deliberately doesn't pre-judge a habit you hadn't actually started yet).
 */
export function getStripDayStatus(
  habit: Habit,
  dateStr: string,
): 'completed' | 'completed_filler' | 'missed_once' | 'missed_twice' | 'empty' {
  if (habit.completions.length === 0) return 'empty';
  const sortedCompletions = [...habit.completions].sort();
  const firstCompletion = sortedCompletions[0];
  if (dateStr < firstCompletion) return 'empty';
  if (habit.completions.includes(dateStr)) return 'completed';

  const todayStr = getToday();

  if (habit.frequency.kind === 'interval') {
    const f = habit.frequency.days;
    // Find the most recent completion on or before this day. That's the
    // anchor for cadence-slot counting.
    let prevCompletion: string | null = null;
    for (const c of sortedCompletions) {
      if (c < dateStr) prevCompletion = c;
      else break;
    }
    const anchor = prevCompletion ?? firstCompletion;
    const daysFromAnchor = getDaysBetween(anchor, dateStr);
    if (daysFromAnchor <= f) return 'empty'; // inside the cadence window
    // First day past the window → missed_once (the warning bar). Every
    // day after that without a completion → missed_twice.
    if (daysFromAnchor === f + 1) return 'missed_once';
    return 'missed_twice';
  }

  if (habit.frequency.kind === 'perWeek') {
    const target = habit.frequency.daysPerWeek;
    // Mon–Sun calendar weeks. JS getDay(): 0=Sun, 1=Mon … 6=Sat.
    const date = parseDate(dateStr);
    const dow = date.getDay();
    const daysSinceMonday = (dow + 6) % 7;
    const weekStart = addDays(dateStr, -daysSinceMonday);
    const weekEnd = addDays(weekStart, 6);
    const set = new Set(habit.completions);

    const countCompletionsInWeek = (wkStart: string): number => {
      let n = 0;
      for (let i = 0; i < 7; i++) {
        if (set.has(addDays(wkStart, i))) n++;
      }
      return n;
    };

    // In-progress week (week containing today): never mark as missed yet.
    // Optionally render filler between completions in a target-met week.
    if (todayStr >= weekStart && todayStr <= weekEnd) {
      let countInWeek = 0;
      let firstInWeek: string | null = null;
      let lastInWeek: string | null = null;
      for (let i = 0; i < 7; i++) {
        const d = addDays(weekStart, i);
        if (set.has(d)) {
          countInWeek++;
          if (firstInWeek === null) firstInWeek = d;
          lastInWeek = d;
        }
      }
      if (
        countInWeek >= target &&
        firstInWeek !== null &&
        lastInWeek !== null &&
        dateStr > firstInWeek &&
        dateStr < lastInWeek
      ) {
        return 'completed_filler';
      }
      return 'empty';
    }

    // Past week. The shortfall (if any) is recorded as a single cell on
    // the Sunday of the week. Every other uncompleted day stays empty so
    // the strip doesn't smear red across whole weeks.
    if (dateStr !== weekEnd) return 'empty';
    const countThisWeek = countCompletionsInWeek(weekStart);
    if (countThisWeek >= target) return 'empty';

    // Walk previous Mon–Sun weeks back to (but not before) the week
    // containing the first completion, counting consecutive shortfall
    // weeks. 1 consecutive shortfall (this week) → missed_once. 2+ →
    // missed_twice.
    let consecutiveShortfalls = 1;
    let cursorWeekStart = addDays(weekStart, -7);
    while (cursorWeekStart >= firstCompletion || addDays(cursorWeekStart, 6) >= firstCompletion) {
      const c = countCompletionsInWeek(cursorWeekStart);
      if (c >= target) break;
      consecutiveShortfalls++;
      if (consecutiveShortfalls >= 2) break;
      cursorWeekStart = addDays(cursorWeekStart, -7);
    }
    return consecutiveShortfalls >= 2 ? 'missed_twice' : 'missed_once';
  }

  // Weekdays cadence.
  if (habit.frequency.weekdays.length === 0) return 'empty';
  const weekdaySet = new Set(habit.frequency.weekdays);
  const dow = parseDate(dateStr).getDay();
  if (!weekdaySet.has(dow)) return 'empty';
  // dateStr is a selected weekday and not completed. Walk back to the
  // previous selected weekday. If that day was also missed (and falls
  // on or after the first completion), this day is missed_twice.
  // Otherwise (previous due day was completed, or there was none yet),
  // this day is missed_once — the first warning bar.
  let cursor = addDays(dateStr, -1);
  for (let i = 0; i < 7; i++) {
    if (weekdaySet.has(parseDate(cursor).getDay())) {
      if (cursor < firstCompletion) return 'missed_once';
      if (!habit.completions.includes(cursor)) return 'missed_twice';
      return 'missed_once';
    }
    cursor = addDays(cursor, -1);
  }
  return 'missed_once';
}
