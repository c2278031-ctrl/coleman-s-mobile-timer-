# Mobile Time Tracker

M6 implementation of a local-first mobile React + TypeScript application. Tracking provides activity management and working timer controls. Events now provides date-grouped history with manual creation, editing and confirmed deletion. Both use IndexedDB, a timestamp-based timer engine and local-day reconciliation. Five-tab navigation retains placeholders for later screens.

On first launch the database creates a protected `Untracked` activity, stores the first-use timestamp, fills elapsed time from that day's local midnight and starts one live Untracked event. Subsequent launches recover the persisted timer, including paused activity/session context, split elapsed events at local midnights and fill genuinely uncovered time. The timer service implements start, switch, pause, resume and stop through atomic transactions. No user activity data is sent anywhere.

Timeline and report charts arrive later. Basic Reporting remains a placeholder. Daily derived data is maintained by reconciliation, but reporting screens and weekly calculations remain M8. Offline/PWA support remains M9; functional Goals remains P1.

## Local setup

Use Node.js 22.12+ in the 22.x line, or a supported newer even-numbered release (see `package.json`). The initial setup was verified with Node 22.19.0 and npm 10.9.3.

```sh
npm ci
npm run dev
```

On Windows PowerShell, use `npm.cmd` / `npx.cmd` if the execution policy blocks the corresponding `.ps1` launchers. No execution-policy change is needed.

Open the local URL printed by Vite. The default development host is `127.0.0.1`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Vite development server |
| `npm run lint` | ESLint, with warnings treated as failures |
| `npm run typecheck` | Strict TypeScript check of source, tests and configuration |
| `npm run test` | Vitest component, domain and IndexedDB integration tests, single run |
| `npm run test:watch` | Interactive test watch mode |
| `npm run build` | Type check and production build to `dist/` |
| `npm run preview` | Locally serve `dist/` for inspection |
| `npm run test:e2e` | Playwright against the production build plus an isolated timer test fixture |

Before the first E2E run, install the browser with `npx playwright install chromium`. Run `npm run build` before `npm run test:e2e`. Playwright starts and stops a production preview on port 4173 and a Vite server on port 5174 for `e2e/fixtures/timer.html`. The fixture imports the actual timer service and uses real IndexedDB; it is not part of the production bundle. Production tests independently verify startup recovery from seeded timer records. Browser tests also cover mobile and desktop navigation, direct links, history, keyboard access and responsive layout. Screenshots and failure traces are written to ignored `test-results/`.

## Structure

```text
src/
  app/       Shell, routing, service composition, live subscriptions and recovery
  domain/    Activities, timer engine, timestamp display and reconciliation
  pages/     Tracking, activity management, Events/editor and remaining placeholders
  persistence/ Versioned Dexie database, initialization and implementations
  repositories/ Persistence-independent repository interfaces
  ui/        Original shared SVG icons and accessible modal sheet
  test/      Test setup
  main.tsx   React entry point
  styles.css Mobile layout, theme and safe-area spacing
e2e/         Browser acceptance checks
docs/        Milestone plan, requirement mapping and verification record
```

The base timer service depends on `TimerStore`. The production `ReconciledTimerService` uses `ReconciliationStore` to run a timer operation, reconciliation and derived-report maintenance in one Dexie transaction. The service returns a snapshot only after commit and propagates failures. It keeps no in-memory authoritative timer state; every operation reads the current database state, including changes from other connections. Core rules stay outside UI components.

## Timer engine (M3)

`src/app/timer.ts` composes the production `timerService`. Its API is `recover()`, `start(activityId)`, `switchActivity(activityId)`, `pause()`, `resume()` and `stop()`. Calls return committed `{ state, event, elapsedMs, sessionElapsedMs }` snapshots. `elapsedMs` is the current day-bounded event segment's duration; `sessionElapsedMs` sums segments of the active logical session so midnight splitting does not reset its accumulated activity duration. While paused the active session is Untracked. Resume uses a new event ID with the original activity session ID. Tracking displays accumulated activity totals for the current local day. Session logs and transitions are unchanged.

- Start/switch closes the previous segment at exactly the next segment's start timestamp.
- Pause starts Untracked and stores resume context. Resume closes Untracked and restores that session.
- Stop starts Untracked; stopping while paused cancels resume context without splitting the current Untracked event.
- Selecting another activity while paused starts a fresh session. Explicitly selecting Untracked cancels resume context.
- Repeating the current start, pause or stop is idempotent; resume outside paused mode is a no-op.
- Clock rollback and a same-millisecond transition are rejected without partial writes or fabricated durations. Retry after time advances or the device clock is corrected. Forward clock changes follow wall-clock timestamps.
- Corrupt/missing timer references or competing live timer events produce an error and preserve history. Recovery does not guess which event is correct.

For focused engine verification: `npm run test -- src/domain/timer.test.ts src/persistence/timer-service.test.ts`. The regular browser suite checks running/paused reload and page close/reopen. Real-device suspension, a full browser-process restart and offline launch remain unverified.

## Day reconciliation (M4)

Reconciliation runs at startup, after timer commands, when a visible page gains focus/is restored, and through the completed-history mutation boundary exported as `reconciliationService` from `src/app/timer.ts`.

- First-use coverage starts at local midnight on the `firstUseAt` date, never on earlier days. Existing manually entered history before first use is retained.
- Events are split at calendar midnights, not fixed 24-hour increments. The first segment retains the original event ID; additional segments retain its activity, source, creation timestamp and session ID. The timer pointer moves to the final open segment while pause context survives.
- Gaps are calculated from the union of all event intervals, clipped to elapsed time. Only real gaps receive new system Untracked events. Existing manual overlaps and overlaps with Untracked are preserved.
- Daily report data is rebuilt from event durations in the same transaction. Overlaps count fully toward each activity; unique coverage and overlap duration are stored separately. No activity-colour snapshots are cached.
- `reconciliationService.saveEvent(event)` and `deleteEvent(id)` atomically reconcile completed-history changes. The M6 UI uses `EventService`, which adds activity validation and stale-edit checks within the same reconciliation transaction. Low-level repository writes do not automatically reconcile. Live events must be changed through the timer service. The Events editor requires deletion confirmation.
- Resume failures preserve the mounted application and show an error with Retry. No database is deleted to recover from errors.

The calendar uses the device/browser's current local timezone. Historical timezone-at-recording is not stored. Tests verify London and New York spring/fall transitions (23/25-hour days), plus Kolkata's +05:30 offset. Completed future manual events are retained and contribute their full duration to derived reports; future Untracked is never generated. Reconciliation is repeatable without duplicate events.

For focused checks: `npm run test -- src/domain/reconciliation.test.ts src/persistence/reconciliation-service.test.ts src/app/RecoveryBoundary.test.tsx`. Browser tests also exercise production startup/resume and multi-day recovery. Phone suspension is simulated by changing the clock and restoring/reloading the page, not tested on physical Safari hardware.

## Tracking and activity management (M5)

Run `npm run dev`, open the printed local address, and select Tracking:

1. Tap **+** to create an activity. Enter its name, choose a colour and save.
2. Tap the clock beside that activity to start it. Starting a different activity switches immediately.
3. Use **Pause**, **Resume** and **Stop** on the active/paused row. Paused time contributes to Untracked; the paused activity total stops increasing until resumed.
4. Reload while running or paused to check recovery. Each row shows its total today across separate sessions and manual entries. Switching back continues from that total. Totals reset at local midnight without changing recorded history; overlaps count fully and durations never wrap at 24 hours.
5. Open the top-left **Manage activities** button to edit names/colours, reorder with the arrows, archive, or restore from the archived list.

Stop a running or paused activity before archiving it. The management screen explains this and disables Archive while it is in use; the application service enforces the same rule inside a transaction serialized against timer changes. Archiving never deletes events. Untracked can be selected, recoloured and reordered, but keeps its protected name and has no archive/delete control. No activity has a hard-delete control.

`ActivityService` depends on an `ActivityStore` transaction interface. Activity writes, including multi-row reordering, commit atomically. The Tracking read adapter uses Dexie's existing `liveQuery` to read a consistent snapshot of activities, timer state and recorded events. Committed changes from other tabs refresh the screen. A lightweight display interval samples `Date.now()`; it neither accumulates elapsed ticks nor writes to IndexedDB. No new state-management library is needed.

Errors retain the last valid rows or entered form values, with read retry and repeatable commands. Sheets use native modal dialogs with keyboard focus containment, Escape/Done dismissal, focus restoration and scrolling on small screens. Browser verification covers 320px layouts and 44px timer targets. Physical iPhone/Safari and offline startup remain unverified.

## Events (M6)

Open **Events** to see recorded and running segments, grouped by local date with newest dates/events first. Each row shows the activity's current name/colour, its time range and elapsed duration. Archived activities remain visible in their historical events.

- Tap **+** to add a manual event. Choose an activity, start date/time and end date/time. For overnight entries, explicitly choose the next end date. The form previews elapsed duration and blocks Save unless end is after start.
- Tap a completed row to edit its activity or times. Tap **Delete event**, then **Confirm delete** to remove it, or **Keep event** to cancel.
- Manual overlaps, including overlaps with Untracked, are allowed and retained. Saving does not trim other events. Deleting or shortening an event fills genuinely uncovered elapsed time with new Untracked records.
- Overnight events split into day-bounded segments with a shared session ID. Editing/deleting a listed segment affects that segment only.
- Inputs use local time at minute precision. Unchanged existing fields retain their precise recorded timestamps, so changing an activity alone does not round timer history. Nonexistent local times during a spring DST change are rejected. New ambiguous autumn times use the first occurrence; unchanged recorded times preserve their original occurrence.
- Running events can be inspected but must first be closed using Tracking controls before editing/deleting. To close a live Untracked segment, start another activity.
- An existing event may keep its archived activity. Restore an activity before using it for a new event or reassigning another event to it.

`src/app/events.ts` composes `EventService` with the existing `ReconciliationStore`. Create/update/delete, midnight splitting, gap filling and report data updates commit atomically. Updates and deletions compare the original record with the persisted record to prevent stale forms overwriting changes from another tab or recreating deleted history. Errors retain entered values and permit retry; conflicts ask you to close and reopen the event. The Events read adapter subscribes to committed activity/event changes through Dexie liveQuery.

The current list reads all history; very large datasets have not been performance-tested. Timeline and chart rendering are still deferred, although their underlying event/report data updates now.

## Static hosting / GitHub Pages

The app builds to static files and requires no production Node server. Vite uses `base: './'` so asset references resolve beneath the hosting directory. `HashRouter` produces links such as `/mobile-time-tracker/#/events`, which reload without server rewrite rules. For a fixed repository name, an explicit build is also supported:

```sh
npm run build -- --base=/mobile-time-tracker/
```

Upload the contents of `dist/` through a future GitHub Pages workflow. M1 does not publish the app or configure a remote. GitHub Actions deployment configuration belongs to M10. A successful local build/preview does not verify a real deployment. Service-worker caching, manifest and offline verification belong to M9.

## Source material

- `CODEX_BUILD_SPEC.MD` is the product source of truth.
- `AGENTS.MD` contains implementation instructions.
- The supplied visual reference is actually named `reference/timelines-ui.png.png`; it has been inspected and preserved with its existing name.
- [Implementation plan and requirement traceability](docs/IMPLEMENTATION_PLAN.md).
- [M1 verification record](docs/M1_VERIFICATION.md).
- [M2 verification record](docs/M2_VERIFICATION.md).
- [M3 verification record](docs/M3_VERIFICATION.md).
- [M4 verification record](docs/M4_VERIFICATION.md).
- [M5 verification record](docs/M5_VERIFICATION.md).
- [M6 verification record](docs/M6_VERIFICATION.md).

The requirements and reference assets are not copied into the production bundle. The reference informs layout; the UI uses original code and icons.
