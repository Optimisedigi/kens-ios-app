import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Habit } from '../types/habit';
import { getToday } from '../utils/dateUtils';
import { toggleCompletionForDate } from '../storage/habitStorage';
import { markComplete } from '../utils/watchBridge';

/**
 * Shape published to the watch via `updateApplicationContext`. Kept tiny:
 * the watch only needs enough to render a tappable row and show today's
 * "done" tick. Everything else (streaks, calendar grid, notes) stays on
 * the phone.
 */
interface WatchHabitSummary {
  id: string;
  name: string;
  emoji: string;
  color: string;
  completedToday: boolean;
}

interface WatchContext {
  habits: WatchHabitSummary[];
  today: string; // YYYY-MM-DD local — lets the watch label "today" without
  // having to derive it from its own (possibly off) clock.
}

interface IncomingMarkCompleteMessage {
  type: 'mark-complete';
  habitId: string;
  isoDate: string;
}

type WatchReply = { ok: true } | { ok: false; error: string };

/**
 * The watch-connectivity npm module is iOS-only at the native layer
 * (Android has stub `false` returns). We still lazy-require it so a
 * crash inside its module load — or a missing native binary in Expo Go,
 * which doesn't ship third-party native code — can never take the JS
 * bundle down with it. The hook then quietly no-ops.
 */
interface WatchModule {
  updateApplicationContext: (ctx: object) => void;
  watchEvents: {
    on: (
      event: 'message',
      cb: (
        payload: IncomingMarkCompleteMessage & { id?: string },
        replyHandler: ((resp: WatchReply) => void) | null,
      ) => void,
    ) => () => void;
  };
}

function loadWatchModule(): WatchModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-watch-connectivity') as WatchModule;
    if (!mod || typeof mod.updateApplicationContext !== 'function') return null;
    return mod;
  } catch {
    // Expo Go / unlinked native build / module not available. Returning
    // null makes the hook a clean no-op rather than crashing the app
    // root layout, which would brick the entire UI.
    return null;
  }
}

function serialiseForWatch(habits: readonly Habit[]): WatchContext {
  const today = getToday();
  return {
    today,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      completedToday: h.completions.includes(today),
    })),
  };
}

/**
 * Phone-side WatchConnectivity glue. Mount this once near the root,
 * giving it the current `habits` array and a callback that re-reads
 * habits from storage (so the UI reflects watch-originated changes).
 *
 * Two responsibilities:
 *
 *  1. Publish: on every change to `habits`, push a compact summary to
 *     the watch via `updateApplicationContext`. iOS coalesces these,
 *     so spamming on every render is safe.
 *
 *  2. Receive: subscribe to `message` events of shape
 *     `{ type: 'mark-complete', habitId, isoDate }`. For each, we:
 *       - validate via the pure `markComplete` handler so malformed
 *         inputs from a misbehaving watch build are rejected (failure
 *         imagination #6, #8);
 *       - only call the real storage mutator when the date is NOT
 *         already present, since `toggleCompletionForDate` is a toggle
 *         and would otherwise REMOVE the date on the second tap
 *         (failure #6 — set semantics, not toggle);
 *       - reply through `replyHandler` so the watch can show a tick
 *         immediately instead of waiting on the application-context
 *         round trip.
 *     `toggleCompletionForDate` writes through AsyncStorage (the
 *     source of truth `useHabits` reads), then we call `onChange()`
 *     so the screen that owns the visible state refreshes (failure #4).
 *
 * The latest `habits` array is mirrored into a ref so the message
 * handler closure always sees the freshest list without having to
 * re-subscribe on every render.
 */
export function useWatchSync(habits: readonly Habit[], onChange: () => void | Promise<void>): void {
  const habitsRef = useRef<readonly Habit[]>(habits);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ----- Publish loop. Re-runs when habits change. ----------------
  useEffect(() => {
    const mod = loadWatchModule();
    if (!mod) return;
    try {
      mod.updateApplicationContext(serialiseForWatch(habits));
    } catch (err) {
      // updateApplicationContext can throw if WCSession isn't yet
      // activated (e.g. very first render). Swallow — iOS will keep
      // the next snapshot the moment a session is up.
      console.warn('useWatchSync: updateApplicationContext failed', err);
    }
  }, [habits]);

  // ----- Receive loop. Mount-once subscription. -------------------
  useEffect(() => {
    const mod = loadWatchModule();
    if (!mod) return;

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = mod.watchEvents.on('message', (payload, replyHandler) => {
        // Use the latest habits / onChange from refs so we never act on
        // a stale snapshot from when the subscription was first wired.
        const currentHabits = habitsRef.current;

        if (!payload || payload.type !== 'mark-complete') {
          replyHandler?.({ ok: false, error: 'unknown-message' });
          return;
        }

        const result = markComplete(currentHabits, {
          habitId: payload.habitId,
          isoDate: payload.isoDate,
        });

        if (!result.ok) {
          replyHandler?.({ ok: false, error: result.error });
          return;
        }

        if (!result.changed) {
          // Already complete — nothing to write. Still reply success
          // so the watch shows the tick confirmed.
          replyHandler?.({ ok: true });
          return;
        }

        // `toggleCompletionForDate` is a toggle, but we just proved
        // (via markComplete + changed === true) the date is NOT in
        // the current list, so the toggle will add (set semantics).
        // We deliberately call the existing storage helper rather
        // than writing a new path — failure imagination #4 says any
        // bypass leaves AsyncStorage out of sync with the rest of
        // the app.
        toggleCompletionForDate(payload.habitId, payload.isoDate)
          .then(async () => {
            await onChangeRef.current();
            replyHandler?.({ ok: true });
          })
          .catch((err: unknown) => {
            console.warn('useWatchSync: storage write failed', err);
            replyHandler?.({ ok: false, error: 'storage-failed' });
          });
      });
    } catch (err) {
      console.warn('useWatchSync: failed to subscribe to message events', err);
    }

    return () => {
      try {
        unsubscribe?.();
      } catch (err) {
        console.warn('useWatchSync: unsubscribe failed', err);
      }
    };
  }, []);
}
