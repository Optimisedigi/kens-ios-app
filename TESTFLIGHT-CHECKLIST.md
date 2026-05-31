# TestFlight Verification Checklist — v1.1.0

Test each feature on a **physical iOS device** running the new TestFlight build.
Native features (widget, Live Activity, notification actions, Health) do **not**
work in Expo Go or the simulator for all behaviors — use a real device.

> Build note: the EAS build was blocked on the Free-plan monthly quota. Run
> `eas build --platform ios --profile production --auto-submit` after the quota
> resets (or after upgrading). Widget credentials are already set up, so it
> should go straight through.

---

## 0. Pre-flight

- [ ] New build (v1.1.0, build ≥ 16) installed from TestFlight
- [ ] App launches without crashing
- [ ] Existing habits still appear with correct streaks/history (data migration is automatic)

---

## 1. Skip / off-day (Feature 4)

- [ ] **Home long-press**: long-press a habit card → it dims/greys (marked "off" today)
- [ ] Long-press again → un-skips (returns to normal)
- [ ] **Progress → Skip mode**: select a habit, toggle **Skip mode** on
- [ ] Tap days in Weeks/Months view → cells turn muted slate (not red, not green)
- [ ] Tap a skipped day again → un-skips
- [ ] A skipped day **between two completions does NOT break the streak** (check Current Streak stat)
- [ ] A skipped day is **excluded from Completion Rate** (rate doesn't drop for off days)
- [ ] Backfill mode and Skip mode are mutually exclusive (turning one on turns the other off)
- [ ] Marking a completed day as skipped removes the completion

---

## 2. Measurable habits (Feature 3)

- [ ] **Add Habit** → toggle **Measurable** on → set target (e.g. `8`) + unit (e.g. `glasses`) → Save
- [ ] Home card shows progress text, e.g. `0/8 glasses`
- [ ] **Tap** the card → increments (`1/8`, `2/8`, …) with light haptic
- [ ] Reaching the target flips the day to **completed** (green check) with success haptic
- [ ] **Long-press** the card → decrements the count
- [ ] Decrementing below target removes the completed state
- [ ] A reached-target day **counts toward the streak** (check Progress stats + calendar shows it complete)
- [ ] **Edit** a habit → toggle Measurable off → confirm it reverts to a normal boolean habit (unit/counts cleared)
- [ ] Boolean (non-measurable) habits behave exactly as before (single tap = done)

---

## 3. Resilience analytics (Feature 6)

- [ ] **Progress** → select a single habit → **Resilience** card appears under the stat row
- [ ] Card shows: **Score /100**, **Recovery rate**, **Avg comeback**, **Total slips**, and **Slips-by-weekday** bars
- [ ] A habit you always complete reads a high score (≈100, 0 slips)
- [ ] A habit with un-recovered slips shows a lower score
- [ ] Skipped days are **not** counted as slips
- [ ] The "All habits" view does **not** show the Resilience card (single-habit only)

---

## 4. Interactive notifications (Feature 5)

> Set a habit's reminder a minute or two out (Edit → reminder time) and ensure
> notifications are enabled in Settings + iOS permissions granted.

- [ ] Reminder fires at the set time
- [ ] **Long-press / pull down** the notification banner → shows **"Mark done"** and **"Snooze 1h"** buttons
- [ ] Tap **"Mark done"** → habit is completed for today **without opening the app**
- [ ] Reopen the app → the completion is reflected
- [ ] Tap **"Snooze 1h"** → a new reminder is scheduled ~1 hour later
- [ ] Cold start: kill the app, tap "Mark done" on a reminder → completion applies on next launch
- [ ] (Android, if applicable: actions may be flaky; tapping the banner body still opens the app — acceptable)

---

## 5. Home / Lock-screen widget (Feature 1) — iOS 17+

- [ ] Add the **Never Miss Twice** widget to the Home screen (and/or Lock screen)
- [ ] **Small widget**: shows the most at-risk / next habit with status color
- [ ] **Medium widget**: shows today's checklist (up to 4 habits)
- [ ] Measurable habits show `count/target` in the medium widget
- [ ] **Tap the circle/checkbox** on the widget → it checks off (interactive, no app open)
- [ ] Open the app → the widget-originated completion is reconciled into the habit
- [ ] Widget updates after you complete a habit in the app (reflects current state)
- [ ] Day rollover: the widget refreshes for the new day

---

## 6. Live Activity / Dynamic Island (Feature 2) — iOS 16.2+ (interactive iOS 17+)

- [ ] **Settings** → enable **"Streak-at-risk Live Activity"**
- [ ] When a habit enters the **warning** state (completed yesterday, not yet today), a Live Activity appears on the Lock Screen
- [ ] **Dynamic Island** (iPhone 14 Pro+) shows the habit emoji + streak (compact + expanded)
- [ ] Completing the habit shows **"Streak saved!"** then the activity ends
- [ ] Activity ends when the habit leaves the warning state or the day rolls over
- [ ] Toggling the Settings switch **off** tears down any active Live Activity
- [ ] Constraint to expect: iOS auto-ends Live Activities after ~12h (same-day "save your streak" window)

---

## 7. Apple Health auto-completion (Feature 7) — iOS only

> **Prerequisite (not done yet):** this needs the `@kingstinct/react-native-healthkit`
> dependency installed + linked in the build. If it isn't in this build, the
> feature is inert (no crash, just does nothing) and the Settings Health row
> shows "—". Confirm the dependency is present before testing.

- [ ] **Edit** a measurable habit (e.g. "Steps", target `8000`) → **Link to Apple Health → Steps**
- [ ] On next foreground, iOS prompts for **Health read permission** → grant it
- [ ] **Settings** shows the Apple Health row: **✓ Allowed**
- [ ] Background the app, accrue/inject Health data past the goal, reopen → habit **auto-completes** for today
- [ ] Permission **denied** path: Settings shows "⚠️ Denied" with guidance, and the app does **not** crash (manual logging still works)
- [ ] A habit that hasn't met its goal stays incomplete

---

## 8. Bug fixes in this release

### Finite-campaign box count

- [ ] Create a habit with an **end date** (e.g. daily, ending 7 days out)
- [ ] **Progress → Weeks view** for that habit shows a **"Campaign"** grid with exactly the required number of boxes (7-day daily = **7 boxes**)
- [ ] Every-2-days over a week → 4 boxes; Mon–Fri week → 5 boxes
- [ ] Caption reads "X of N days complete"
- [ ] Open-ended habits still show the normal "Last 8 Weeks" grid

### Crash on editing historic days (previously intermittent)

- [ ] Progress → Months view → **Backfill mode** on → add several historic completions (including days before createdAt)
- [ ] Toggle Backfill mode **off** after backfilling → screen does **NOT** crash
- [ ] Switch between habits and calendar views (Weeks/Months/Year) after backfilling → no crash
- [ ] Month navigation chevrons still work and stay in range

---

## 9. Regression sweep (make sure nothing old broke)

- [ ] Add / edit / delete a habit
- [ ] Toggle a normal habit complete/incomplete on Home
- [ ] Notes: add/edit a note on a day; note dot appears on the calendar
- [ ] Streak / longest streak / completion rate numbers look correct
- [ ] Weeks, Months, Year calendar views all render
- [ ] Dark / light theme toggle
- [ ] Apple Watch app still syncs (if used)
- [ ] Existing reminders still fire at the right times

---

## Notes / issues found

_(Record anything broken here so it can be fixed in the next build.)_

-
-
-
