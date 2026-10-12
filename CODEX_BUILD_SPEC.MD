Paste the following directly into `CODEX_BUILD_SPEC.md`.

```markdown
# Codex Build Specification: Mobile Time Tracker

## 1. Project status

**Project:** Mobile Time Tracker  
**Version:** 1.0  
**Status:** Implementation-ready  
**Primary target:** Mobile-first web app / PWA, primarily iPhone Safari  
**Development:** Local development using Codex  
**Production hosting:** GitHub Pages  
**Core storage:** IndexedDB on the user's device  
**Backend:** None for the first working version  

Visual reference:

`reference/timelines-ui.png`

The application should closely reproduce the supplied Timelines-style UI while implementing the behaviour defined in this specification.

---

# 2. Objective

Build a mobile-first time-tracking web application that lets a user:

1. Create labelled activities.
2. Start a timer for an activity.
3. Switch between activities.
4. Pause and resume activities.
5. Automatically record unused time as `Untracked`.
6. Manually add, edit and delete recorded events.
7. Review events grouped by date.
8. Review the day as a proportional vertical timeline.
9. Review each day using a colour-labelled pie chart.
10. Compare one selected activity across a week using a bar chart.
11. Use the app fully offline after its first successful load.

The purpose is to let the user reconstruct how their time was used and identify where time could be used more efficiently.

---

# 3. P0 scope — first working version

The first working version must include:

- React + TypeScript + Vite application.
- Mobile-first responsive UI.
- Timelines-style dark interface.
- Bottom navigation:
  - Tracking
  - Events
  - Timeline
  - Goals
  - Settings
- Local IndexedDB persistence.
- Offline-capable PWA.
- Flat activities.
- Create activity.
- Rename activity.
- Change activity colour.
- Reorder activities.
- Archive activity.
- Restore archived activity.
- Protected `Untracked` activity.
- One active timer at a time.
- Start activity.
- Switch activity.
- Pause activity.
- Resume activity.
- Stop activity.
- Automatic `Untracked` time.
- Timer recovery after page/browser restart.
- Midnight splitting.
- Manual event creation.
- Manual event editing.
- Manual event deletion.
- Overlapping manual events allowed.
- Events grouped by date.
- Vertical proportional timeline.
- Daily pie chart.
- Historical daily reports.
- Weekly selected-activity bar chart.
- GitHub Pages-compatible production build.

---

# 4. Deferred scope

## P1

Implement only after the P0 tracker is working and verified:

- Functional Goals system.
- Daily minimum/maximum targets.
- Weekly minimum/maximum targets.
- Goal progress indicators.
- Advanced data export/import.
- Additional reporting controls.

The Goals tab should exist in P0 but may display a placeholder.

## P2

Future features:

- Hierarchical activities.
- Activity-specific task descriptions.
- Accounts.
- Cloud sync.
- Supabase.
- Multi-device synchronization.
- Sync conflict resolution.
- Monthly reports.
- Yearly reports.

Do not allow P1 or P2 functionality to expand P0 implementation.

---

# 5. Explicitly rejected behaviour

Do not implement the following in P0:

- Multiple simultaneously running live timers.
- Hard deletion of activities through normal UI.
- Automatic correction of manually overlapping events.
- Mandatory overlap resolution.
- Hierarchical activities.
- Task descriptions under activities.
- Cloud authentication.
- Cloud database.
- Native iOS application.
- Server-side Node/Express backend.
- AI activity recognition.
- Location tracking.
- Automatic activity recognition.

---

# 6. Recommended technical stack

Use:

- React
- TypeScript
- Vite
- IndexedDB
- Dexie.js
- React Router or equivalent client-side navigation
- Zustand or lightweight equivalent for transient UI state
- Recharts or equivalent for charts
- Vite PWA / Workbox tooling
- Vitest for unit tests
- Playwright where appropriate for end-to-end tests

Deployment target:

`GitHub Pages`

The project must remain a static frontend application.

No backend is required for P0.

---

# 7. Architecture

Use approximately this dependency direction:

```text
UI Components
      ↓
Feature / Application Logic
      ↓
Domain Services
      ↓
Repository Interfaces
      ↓
Dexie / IndexedDB
```

Core timer behaviour must not be implemented directly inside UI components.

Recommended services:

```text
ActivityService
TimerService
EventService
ReconciliationService
ReportingService
```

Recommended repositories:

```text
ActivityRepository
EventRepository
TimerStateRepository
SettingsRepository
DailyReportRepository
```

IndexedDB is the authoritative P0 persistence layer.

Reports are derived from raw event data.

---

# 8. Core entities

## Activity

```ts
Activity {
  id: string
  name: string
  color: string
  isSystem: boolean
  archived: boolean
  archivedAt: timestamp | null
  sortOrder: number
  createdAt: timestamp
  updatedAt: timestamp
}
```

Rules:

- `name` cannot be empty.
- Activities remain available until archived.
- Archived activities remain referenced by historical events.
- Archived activities can be restored.
- Normal activities are not hard-deleted through the UI.

---

## Protected Untracked activity

The application must always contain one protected system activity:

```text
Untracked
```

Requirements:

- visible on Tracking screen;
- visible in Events;
- visible in Timeline;
- visible in Reports;
- can be manually selected;
- can be generated automatically;
- cannot be archived;
- cannot be deleted.

Use a stable internal ID such as:

```text
system:untracked
```

The exact identifier may differ but must remain stable across schema migrations.

---

## Event

```ts
Event {
  id: string
  sessionId: string
  activityId: string
  startAt: timestamp
  endAt: timestamp | null
  source: "timer" | "manual" | "system"
  createdAt: timestamp
  updatedAt: timestamp
}
```

Rules:

- `endAt = null` means the event is currently running.
- Completed events must satisfy:

```text
endAt > startAt
```

- Manual events may overlap.
- Events crossing midnight must be split into day-bounded segments.
- Split segments from one continuous timer should retain the same `sessionId`.

---

## Timer state

Persist enough information to restore timer state after restart:

```ts
TimerState {
  mode:
    | "RUNNING_ACTIVITY"
    | "RUNNING_UNTRACKED"
    | "PAUSED_ACTIVITY"

  activeEventId: string
  activeActivityId: string
  activeSessionId: string

  pausedActivityId: string | null
  pausedSessionId: string | null

  updatedAt: timestamp
}
```

---

## Daily report

Recommended persisted structure:

```ts
DailyReport {
  date: string

  activityTotals: {
    activityId: string
    durationMs: number
  }[]

  recordedDurationMs: number
  uniqueOccupiedDurationMs: number
  overlapDurationMs: number
  elapsedDayMs: number

  generatedAt: timestamp
  updatedAt: timestamp
}
```

Do not store the chart itself as an image.

Store the calculated report data and render the chart from it.

---

# 9. Timer behaviour

## FR-01 — Only one live activity timer

Only one activity can be the primary live timer at once.

Example:

```text
Studying running
      ↓
User taps Exercise
      ↓
Studying ends
      ↓
Exercise starts
```

Both transitions should use the same effective transition timestamp.

Use an atomic IndexedDB transaction where possible.

---

## FR-02 — Start activity

When no normal activity is running and the user selects `Studying`:

```text
Close current Untracked segment
        ↓
Create Studying event
        ↓
startAt = current timestamp
endAt = null
```

---

## FR-03 — Switch activity

Example:

```text
Studying
14:00 → running

User taps Exercise at 15:20
```

Result:

```text
Studying
14:00 → 15:20

Exercise
15:20 → running
```

There must be no artificial Untracked gap between the two.

---

## FR-04 — Stop

If a normal activity is running:

```text
Close activity
      ↓
Start Untracked
```

Example:

```text
Studying
14:00 → 15:00

Untracked
15:00 → running
```

---

# 10. Pause behaviour

Pause must become `Untracked`.

Example:

```text
14:00 Studying starts
14:45 Pause
15:00 Resume
16:00 Stop
```

Internal events:

```text
Studying
14:00 → 14:45

Untracked
14:45 → 15:00

Studying
15:00 → 16:00

Untracked
16:00 → running
```

The two Studying segments should share the same logical `sessionId`.

Resume must return to the paused activity unless the user starts another activity instead.

If another activity is selected while paused, cancel the paused-resume context and start the newly selected activity.

---

# 11. Timer correctness

Do not use accumulated `setInterval()` ticks as the source of truth.

Use timestamps.

Example:

```text
elapsed = currentTime - startAt
```

The timer must remain correct after:

- locking the phone;
- switching apps;
- Safari backgrounding;
- page reload;
- browser close/reopen;
- internet loss;
- device restart where browser storage survives.

UI timers may use intervals only to refresh the displayed value.

---

# 12. Untracked behaviour

The goal is for elapsed calendar time to be accounted for.

## Beginning of a day

If the user's first activity begins at:

```text
11:00
```

the app should represent:

```text
00:00 → 11:00
Untracked
```

Then:

```text
11:00 → ...
Selected activity
```

---

## First-ever use

If the application is first used at 13:00:

```text
00:00 → 13:00
Untracked
```

Do not invent records for previous calendar days before the user's first use.

Store a setting such as:

```text
firstUseAt
```

---

## Overnight

Untracked continues overnight unless the user has created another activity such as `Sleep`.

Example:

```text
23:00 Study stops
      ↓
Untracked continues
      ↓
00:00
      ↓
Untracked continues into next calendar day
```

Midnight reconciliation should split the event by calendar date.

---

# 13. Day reconciliation

Mobile Safari may suspend JavaScript overnight.

Do not depend on code executing exactly at midnight.

Run reconciliation when appropriate, including:

- application startup;
- application resume;
- relevant event mutations.

Reconciliation should:

1. Find cross-midnight events.
2. Split them at each local midnight boundary.
3. Preserve logical `sessionId`.
4. Find genuinely uncovered elapsed time.
5. Create missing `Untracked` events.
6. Recalculate affected daily reports.

Example:

```text
Studying
27 Sep 23:30 → 28 Sep 00:45
```

becomes:

```text
27 Sep
23:30 → 24:00 Studying

28 Sep
00:00 → 00:45 Studying
```

---

# 14. Manual overlaps

Manual event overlaps are allowed.

Example:

```text
Studying
14:00 → 16:00

Exercise
15:00 → 16:00
```

Both events remain.

Do not:

- reject the overlap;
- automatically shorten one event;
- automatically choose one event;
- silently modify user history.

The user is responsible for manually correcting overlaps if desired.

---

# 15. Manual Untracked editing

Do not automatically trim an existing Untracked event when the user manually adds another overlapping event.

Example:

Existing:

```text
Untracked
13:00 → 15:00
```

User manually creates:

```text
Studying
13:30 → 14:30
```

Both may temporarily remain:

```text
Untracked
13:00 → 15:00

Studying
13:30 → 14:30
```

The user may manually edit the Untracked event later.

Reports may therefore temporarily exceed 24 hours.

---

# 16. Activities

The Tracking screen should contain flat activities such as:

```text
Studying
Exercise
Work
Eating
Travel
Gaming
Untracked
```

The user can:

- create;
- rename;
- recolour;
- reorder;
- archive;
- restore.

A user may create a temporary activity for one day and archive it later.

Do not implement hierarchy in P0.

---

# 17. Activity colours

Colour belongs to the Activity, not individual events.

Example:

```text
Studying = blue
```

If the user changes Studying to red:

```text
Studying = red
```

then all views should subsequently use red:

- Tracking;
- Events;
- Timeline;
- current report;
- historical reports.

Do not store permanent historical colour snapshots.

---

# 18. Tracking screen

Use the supplied screenshot as the main visual reference.

Approximate structure:

```text
┌─────────────────────────────┐
│ ☰                        ＋ │
│                             │
│ Tracking                    │
│                             │
│ ┌─────────────────────────┐ │
│ │▌ Studying            ◷ │ │
│ ├─────────────────────────┤ │
│ │▌ Exercise            ◷ │ │
│ ├─────────────────────────┤ │
│ │▌ Work                ◷ │ │
│ ├─────────────────────────┤ │
│ │▌ Untracked           ◷ │ │
│ └─────────────────────────┘ │
│                             │
│ Basic Reporting        ⌄   │
│ ┌─────────────────────────┐ │
│ │ Today                   │ │
│ │                         │ │
│ │       PIE CHART         │ │
│ │                         │ │
│ │ Activity totals         │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│Track Events Timeline Goals ⚙│
└─────────────────────────────┘
```

Requirements:

- dark mobile visual style;
- rounded containers;
- coloured activity markers;
- timer/action control on each row;
- clear active activity state;
- clear paused state;
- fixed bottom navigation.

Do not copy proprietary visual assets directly.

Use original icons/components with similar layout.

---

# 19. Events screen

Events should be grouped by date.

Example:

```text
TODAY — 27 SEP

Studying
14:30–16:00
1h 30m

Lunch
13:45–14:30
45m

Work
09:00–13:45
4h 45m


YESTERDAY — 26 SEP

Exercise
18:00–19:15
1h 15m
```

Recommended ordering:

```text
Newest date first
Newest event first within each date
```

---

# 20. Add event

The Events screen must provide a `+` control.

Required input:

```text
Activity
Date
Start time
End time
```

Display calculated elapsed time.

Allow overlaps.

Save only if:

```text
end > start
```

---

# 21. Edit event

Tapping an event should open a mobile bottom sheet.

Example:

```text
Edit Event

Activity
[ Studying ▼ ]

Start
[ 14:30 ]

End
[ 16:00 ]

Total elapsed
1h 30m

[ Delete ]         [ Save ]
```

Requirements:

- activity editable;
- start editable;
- end editable;
- total duration displayed;
- Save;
- Delete;
- minute-level editing precision.

Overlaps must not prevent Save.

Deletion should require confirmation.

---

# 22. Duration precision

User-facing manual time editing:

```text
nearest minute
```

Timer internals may retain precise timestamps.

Durations are elapsed quantities.

Do not wrap durations at 24 hours.

Correct:

```text
27h 42m
```

Incorrect:

```text
03h 42m
```

---

# 23. Timeline screen

Provide a Timelines-style vertical chronological day view.

Physical event block height should represent event duration.

Example:

```text
09:00 ┌─────────────────────┐
      │                     │
      │        Work         │
      │        3h           │
      │                     │
12:00 └─────────────────────┘

12:00 ┌─────────────────────┐
      │ Lunch               │
13:00 └─────────────────────┘

13:00 ┌─────────────────────┐
      │                     │
      │      Studying       │
      │       2h 30m        │
      │                     │
15:30 └─────────────────────┘
```

A 3-hour event should appear substantially taller than a 30-minute event.

Use a minimum display/touch height for very short events.

Do not alter the actual displayed duration to achieve that minimum size.

The current running event should grow visually as time passes.

Overlapping events must both remain visible.

Codex may choose a sensible lane/offset representation for overlaps.

---

# 24. Daily reports

Provide a pie chart for each recorded day.

The chart shows activity duration proportions.

Example:

```text
27 September

Sleep        8h
Studying     4h
Exercise     1h
Work         6h
Untracked    5h
```

The current day report updates live.

Users must be able to view any previous recorded day.

Recommended navigation:

- previous/next day;
- date picker;
- optional swipe navigation.

---

# 25. Report overlap semantics

Overlapping events count fully toward each activity.

Example:

```text
Studying
14:00 → 16:00 = 2h

Exercise
15:00 → 16:00 = 1h
```

Report:

```text
Studying = 2h
Exercise = 1h
```

Recorded activity time for that interval is therefore:

```text
3h
```

even though only 2 clock hours elapsed.

Daily total recorded duration may exceed 24 hours.

The pie chart therefore represents:

```text
percentage of total recorded activity-duration
```

not necessarily:

```text
percentage of unique 24-hour clock time
```

Where practical, also display:

```text
Recorded duration
Unique elapsed coverage
Overlap duration
```

---

# 26. Historical report updates

Reports are not permanently frozen.

If the user edits an event from yesterday:

```text
Update event
      ↓
Identify affected date
      ↓
Recalculate report
      ↓
Update chart
```

The report must reflect current event data.

---

# 27. Weekly report

The weekly bar chart displays one selected activity.

Example:

```text
Studying ▼

Hours
 5 │       █
 4 │ █     █
 3 │ █ █   █
 2 │ █ █ █ █   █
 1 │ █ █ █ █ █ █
   └────────────────
    M T W T F S S
```

Requirements:

```text
Y axis = activity duration
X axis = day of week
```

User selects one activity, for example:

```text
Studying
Exercise
Work
Untracked
```

The chart then shows that activity's total duration for each day of the selected week.

Do not make a stacked all-activity weekly chart the default in P0.

---

# 28. Goals screen

P0 must preserve the Goals position in bottom navigation.

P0 may display:

```text
Goals

Goal tracking will be added in a later version.
```

Do not implement incomplete goal functionality merely to populate the screen.

Functional Goals are P1.

---

# 29. Settings screen

P0 Settings should at minimum provide access to:

- active activity management;
- archived activities;
- restore archived activities;
- application information where useful.

Optional simple preferences may include:

- 12/24-hour clock;
- week starts Monday.

Do not delay core implementation for optional settings.

---

# 30. Offline requirements

After the first successful load, the app must work without internet.

Offline functionality includes:

- application startup;
- activity management;
- timer operation;
- event history;
- event editing;
- timeline;
- daily reporting;
- weekly reporting;
- settings.

Use:

```text
Service Worker
+
Cached application shell
+
IndexedDB
```

Do not make core operation dependent on GitHub Pages being reachable after initial caching.

---

# 31. Local persistence

Use IndexedDB through Dexie.js or an equivalent structured wrapper.

Do not use `localStorage` as the main event database.

`localStorage` may be used only for trivial UI preferences if useful.

Primary user data should remain in IndexedDB.

---

# 32. Database migrations

Use explicit schema versions.

Migrations must preserve:

- activities;
- event IDs;
- session IDs;
- timestamps;
- protected Untracked identity;
- historical records.

Migration failure must not automatically destroy the user's database.

Add tests for migrations once multiple schema versions exist.

---

# 33. Failure behaviour

## Storage failure

If IndexedDB cannot open or write:

- do not pretend the change succeeded;
- show a useful error;
- preserve the last known valid UI state where possible.

## Transaction failure

Operations such as:

```text
close current event
+
start new event
+
update timer state
```

should be atomic.

If the transaction fails, roll it back rather than producing inconsistent timer state.

## Invalid manual event

If:

```text
end <= start
```

block Save and show validation.

## Cross-midnight recovery

If the app resumes after midnight:

- detect cross-midnight active event;
- split correctly;
- generate/recalculate affected reports;
- continue the current activity correctly.

## Service worker failure

The application should still work online if service-worker registration fails.

Offline availability may be unavailable until registration succeeds.

---

# 34. Important edge cases

Codex must test:

- timer running during reload;
- timer running during browser close/reopen;
- pause followed by reload;
- switching activities;
- stopping to Untracked;
- first use halfway through a day;
- Untracked overnight;
- event crossing midnight;
- browser suspended through midnight;
- overlapping manual events;
- manual event overlapping Untracked;
- deletion leaving a time gap;
- archived activity with historical events;
- restoring archived activity;
- changing historical activity colour;
- report total over 24 hours;
- daylight-saving transition;
- device clock changes;
- IndexedDB transaction failure.

---

# 35. P0 acceptance criteria

## AC-01

Given the application has loaded, when the user selects each bottom navigation item, then the corresponding view opens without a full-page reload failure.

## AC-02

Given the Tracking screen, when the user creates an activity, then it appears immediately and remains after reload.

## AC-03

Given an activity exists, when its name or colour is changed, then current and historical views use the updated activity information.

## AC-04

Given an activity has historical events, when it is archived, then it disappears from normal Tracking but historical events remain intact.

## AC-05

Given an archived activity, when Restore is selected, then it returns to Tracking.

## AC-06

Given Untracked exists, when activity management is opened, then Untracked cannot be archived or deleted.

## AC-07

Given Studying is running, when Exercise is started, then Studying ends and Exercise starts without a missing gap.

## AC-08

Given an activity is running, when Stop is pressed, then Untracked begins.

## AC-09

Given an activity is running, when Pause is pressed, then the activity closes and Untracked begins.

## AC-10

Given an activity is paused, when Resume is pressed, then Untracked closes and the paused activity resumes under the same logical session.

## AC-11

Given a timer is running, when the page reloads, then its elapsed duration remains correct.

## AC-12

Given first use occurs at 13:00, when the day is initialized, then 00:00–13:00 is represented as Untracked.

## AC-13

Given an event spans 23:30–00:45, when reconciliation runs, then it is represented as two day-bounded segments.

## AC-14

Given events exist across several dates, when Events opens, then they are grouped by date.

## AC-15

Given the Events screen, when a valid manual event is created, then it persists after reload.

## AC-16

Given an existing event, when it is edited and saved, then affected reports and timeline views update.

## AC-17

Given an existing event, when Delete is confirmed, then the event is removed.

## AC-18

Given one event overlaps another, when the second event is saved, then both remain persisted.

## AC-19

Given events have different durations, when Timeline renders, then longer events have proportionally larger visual blocks.

## AC-20

Given an event is currently running, when time passes, then the displayed timer and timeline block update.

## AC-21

Given events exist for a day, when its report is viewed, then a colour-labelled pie chart represents activity totals.

## AC-22

Given a historical event is changed, when that day's report is viewed again, then it reflects the new values.

## AC-23

Given an activity colour changes, when an old report is viewed, then the activity uses its current colour.

## AC-24

Given Studying is selected in Weekly Report, when the chart renders, then Monday–Sunday bars equal Studying time for each day.

## AC-25

Given total duration is 27h42m, when formatted, then the UI displays 27h42m without wrapping to 3h42m.

## AC-26

Given the app has successfully loaded previously, when internet access is removed, then core tracking/history/reporting features remain usable.

## AC-27

Given activities and events have been created, when the page reloads, then they remain available from IndexedDB.

---

# 36. Testing requirements

## Unit tests

Test deterministic logic including:

- timer transitions;
- pause/resume;
- stop;
- activity switching;
- duration calculation;
- duration >24h;
- midnight splitting;
- interval union;
- overlap calculation;
- Untracked gap detection;
- daily aggregation;
- weekly aggregation;
- archive protection;
- Untracked protection.

---

## Integration tests

Test:

- IndexedDB repositories;
- atomic timer switching;
- persistent timer recovery;
- historical event editing;
- report recalculation;
- activity archive/restore;
- first-use initialization;
- migrations.

---

## End-to-end tests

Cover at minimum:

```text
Launch
→ Create Studying
→ Start Studying
→ Pause
→ Resume
→ Switch to Exercise
→ Stop
→ Add manual event
→ Edit event
→ View Timeline
→ View Daily Report
→ View Weekly Report
→ Reload
→ Verify persistence
```

---

## Offline test

Verify manually or with suitable browser tooling:

```text
Load app online
      ↓
Create data
      ↓
Close/reopen app
      ↓
Disable network
      ↓
Open app
      ↓
Start/edit/view activities
      ↓
Verify functionality remains available
```

---

# 37. UI verification

Compare the Tracking screen with:

```text
reference/timelines-ui.png
```

Check:

- overall dark layout;
- spacing;
- Tracking heading;
- activity rows;
- coloured activity markers;
- rounded cards;
- timer controls;
- Basic Reporting placement;
- bottom navigation;
- mobile proportions.

Do not require pixel-perfect copying of proprietary assets.

The goal is very close structure and interaction while using original implementation and assets.

---

# 38. GitHub Pages compatibility

The application will initially be developed entirely locally.

When finished, it will be uploaded to GitHub.

Prepare the project so deployment can later use:

```text
GitHub repository
      ↓
GitHub Actions
      ↓
npm install
      ↓
test / typecheck / build
      ↓
dist/
      ↓
GitHub Pages
```

The Vite base path must support repository-based GitHub Pages hosting.

Do not require a production Node server.

---

# 39. Project scripts

Create standard scripts similar to:

```text
npm run dev
npm run build
npm run preview
npm run test
npm run lint
npm run typecheck
```

Exact tool configuration may vary if justified.

All required verification commands must actually work before the project is considered complete.

---

# 40. Implementation milestones

Implement one milestone at a time.

Do not build the whole application in one uncontrolled pass.

---

## M1 — Repository and tooling foundation

Build:

- React;
- TypeScript;
- Vite;
- mobile application shell;
- bottom navigation;
- project structure;
- testing;
- linting;
- type checking;
- GitHub Pages-compatible configuration.

Do not implement database or timer behaviour yet.

Completion:

```text
App runs
+
tests run
+
typecheck passes
+
lint passes
+
production build succeeds
```

---

## M2 — Local persistence and domain models

Build:

- IndexedDB/Dexie;
- Activity model;
- Event model;
- TimerState;
- Settings;
- Untracked system activity;
- repository interfaces.

Verify persistence after reload.

---

## M3 — Timer engine

Build:

- start;
- switch;
- stop;
- pause;
- resume;
- atomic timer transitions;
- timer-state recovery.

Verify timer correctness after reload.

---

## M4 — Day reconciliation

Build:

- first-use Untracked;
- daily Untracked coverage;
- midnight splitting;
- cross-midnight recovery;
- gap detection;
- DST/date handling.

---

## M5 — Tracking UI

Build the Timelines-style Tracking screen.

Implement:

- activity list;
- create;
- rename;
- colour;
- reorder;
- archive;
- restore;
- timer controls;
- current state display.

---

## M6 — Events

Build:

- grouped event list;
- manual Add Event;
- event editing bottom sheet;
- delete;
- duration display;
- minute-level editing;
- overlap support.

---

## M7 — Timeline

Build:

- selected-day timeline;
- chronological layout;
- duration-proportional blocks;
- running event growth;
- overlap representation.

---

## M8 — Reporting

Build:

- live Today pie chart;
- historical daily pie charts;
- date navigation;
- report recalculation;
- selected-activity weekly bar chart;
- >24-hour duration display;
- overlap metrics.

---

## M9 — PWA and settings

Build:

- service worker;
- offline application shell;
- PWA manifest;
- installability;
- Settings screen;
- archived activity management;
- Goals placeholder.

Verify offline operation.

---

## M10 — Final hardening

Run:

- full unit tests;
- integration tests;
- E2E tests;
- offline tests;
- lint;
- typecheck;
- build;
- mobile visual review;
- acceptance-criteria audit.

Prepare GitHub Pages deployment configuration.

---

# 41. Definition of done

The first working version is complete only when:

- every P0 feature is implemented;
- all P0 acceptance criteria pass;
- timer state survives reload;
- pause becomes Untracked;
- Untracked fills required time;
- midnight reconciliation works;
- manual overlaps remain allowed;
- event editing works;
- daily pie chart works;
- weekly selected-activity bar chart works;
- durations above 24h are displayed correctly;
- data survives reload;
- offline operation is verified;
- project works on mobile layouts;
- lint passes;
- type checking passes;
- tests pass;
- production build succeeds;
- no secrets exist in source;
- P1/P2 features are not falsely represented as complete.

---

# 42. Codex implementation rules

Before each milestone:

1. Read this specification.
2. Read `AGENTS.md`.
3. Inspect the current repository.
4. Identify the relevant requirement and acceptance criteria.
5. Identify files expected to change.
6. Identify genuine blockers.
7. Implement only the current milestone.
8. Run relevant verification.
9. Report exactly what changed.

After each milestone report:

- files created/modified;
- dependencies added;
- commands executed;
- tests executed;
- lint result;
- typecheck result;
- build result where relevant;
- requirements satisfied;
- acceptance criteria verified;
- known limitations.

Do not claim a test or verification passed unless it actually ran.

Do not silently change confirmed product behaviour because another implementation would be easier.

Do not continue to the next milestone until the current milestone is runnable and testable.
```