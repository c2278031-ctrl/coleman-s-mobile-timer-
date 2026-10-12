Paste this entire block into `AGENTS.md`:

```markdown
# AGENTS.md

## Read first

Before making changes, read:

1. `CODEX_BUILD_SPEC.md`
2. this `AGENTS.md`
3. the repository README
4. `package.json`
5. any existing test, build, lint, deployment and configuration files
6. any more specific `AGENTS.md` files inside directories you modify

The build specification is the main product source of truth.

---

## Requirement precedence

If requirements appear to conflict, use this order:

1. latest explicit user requirement;
2. explicit correction;
3. explicitly approved decision;
4. consistent implication from the specification;
5. documented technical recommendation.

Do not silently replace confirmed behaviour with a conventional alternative.

If a material contradiction remains, stop and ask the minimum question needed to resolve it.

---

## Core architecture boundaries

Keep dependency direction approximately:

```text
UI
↓
Feature / Application Logic
↓
Domain Services
↓
Repository Interfaces
↓
IndexedDB / Dexie
```

Do not place core timer, reconciliation or reporting rules directly inside UI components.

The raw event history is authoritative.

Reports are derived or cacheable data.

P0 is local-first and must not require a backend.

---

## Important product rules

These rules are mandatory unless the build specification is later explicitly changed.

### Timer

- Only one primary live activity timer may run at once.
- Starting another activity closes the current one and starts the new one.
- Timer correctness must come from timestamps, not accumulated interval ticks.
- Timer state must survive page reload and browser restart where browser storage survives.

### Pause

- Pause closes the current activity segment.
- Pause starts `Untracked`.
- Resume closes `Untracked`.
- Resume returns to the paused activity.
- Resumed segments should preserve the same logical `sessionId`.

### Stop

- Stopping an activity starts `Untracked`.

### Untracked

- `Untracked` is a protected system activity.
- It must appear in Tracking, Events, Timeline and Reports.
- It may be manually selected.
- It cannot be archived or deleted.
- Missing elapsed time should be represented as `Untracked` according to the build specification.

### Activities

- Activities are flat in P0.
- Activities may be created, renamed, recoloured and reordered.
- Activities are archived, not hard-deleted through the normal UI.
- Archived activities must preserve historical event references.
- Archived activities can be restored.

### Events

- Manual events may overlap.
- Do not block overlapping events.
- Do not automatically choose which overlapping event is correct.
- Do not silently rewrite manually entered history.
- Manual event editing uses minute-level precision.
- Events crossing midnight must be reconciled into day-bounded segments.

### Reporting

- Daily reports are derived from event durations.
- Overlapping events count fully toward each activity.
- Daily recorded duration may therefore exceed 24 hours.
- Durations must never wrap at 24 hours.
- Historical reports must recalculate after relevant event changes.
- Activity colour changes apply to historical views.
- Weekly reporting shows one selected activity across the days of the week.

### Goals

- Goals functionality is P1.
- In P0, the Goals screen may be a placeholder only.
- Do not expand P1 Goals functionality into P0 without explicit approval.

### Cloud functionality

- Cloud sync is P2.
- Do not add authentication, Supabase, a backend or server runtime to P0.
- Do not send user activity data to external services.

---

## Visual reference

Read and inspect:

```text
reference/timelines-ui.png
```

Use it as the main visual reference for the mobile Tracking UI.

The goal is a close structural and interaction match using original code and assets.

Do not directly copy proprietary visual assets.

---

## Development approach

Implement the application milestone by milestone.

Do not build the entire application in one uncontrolled pass.

Use the milestone order defined in `CODEX_BUILD_SPEC.md`.

Before starting each milestone:

1. read the milestone requirements;
2. identify relevant requirement IDs;
3. identify relevant acceptance criteria;
4. inspect the existing implementation;
5. identify files likely to change;
6. identify genuine blockers;
7. implement only the approved milestone.

Do not begin later milestones unless explicitly instructed.

---

## Permitted changes

You may:

- create files required by the current milestone;
- refactor internals while preserving confirmed behaviour;
- add tests;
- improve accessibility;
- improve error handling;
- add small, justified dependencies;
- reorganize code where it materially improves maintainability.

---

## Prohibited changes without approval

Do not:

- introduce a backend into P0;
- introduce authentication into P0;
- add paid runtime services;
- send user activity history externally;
- remove offline capability;
- remove IndexedDB as primary P0 persistence;
- make overlapping manual events invalid;
- automatically repair user overlaps;
- delete historical events when archiving activities;
- hard-delete activities through normal UI;
- implement hierarchical activities in P0;
- implement activity-specific task descriptions in P0;
- expand Goals into functional P0 scope;
- silently change reporting semantics;
- replace timestamp-based timer logic with interval-counting logic;
- alter unrelated user work.

---

## Dependency policy

Prefer small, maintained dependencies.

Before adding a package:

1. inspect whether the repository already provides the capability;
2. explain why the package is needed;
3. avoid packages that duplicate existing functionality;
4. prefer packages compatible with static GitHub Pages deployment;
5. avoid adding server-only dependencies to P0.

Recommended stack includes:

- React
- TypeScript
- Vite
- Dexie
- Zustand or lightweight equivalent
- Recharts or equivalent
- Vitest
- Playwright where appropriate
- Vite PWA / Workbox tooling

Do not treat alternatives as mandatory unless the repository or specification requires them.

---

## Persistence rules

IndexedDB is the authoritative P0 persistence layer.

Use repository abstractions between application logic and Dexie where practical.

Important multi-write timer transitions should use atomic transactions.

Do not pretend a write succeeded if persistence fails.

Do not automatically destroy the database after migration failure.

Schema migrations must preserve existing user history.

---

## Testing requirements

Run the smallest relevant verification during implementation.

Before claiming a milestone is complete, run all checks applicable to that milestone.

Expected verification includes, where relevant:

```text
npm run test
npm run lint
npm run typecheck
npm run build
```

Also run milestone-specific integration or E2E tests where required.

Important timer and reconciliation behaviour must have automated tests.

Important edge cases include:

- reload while timer is running;
- pause then reload;
- activity switching;
- stop to Untracked;
- first use partway through a day;
- midnight crossing;
- app suspension across midnight;
- overlapping manual events;
- event overlapping Untracked;
- event deletion creating a gap;
- activity archive and restore;
- historical colour changes;
- durations above 24 hours;
- IndexedDB transaction failure;
- daylight-saving or local-day boundary behaviour.

---

## Requirement traceability

Every implemented P0 feature should map to:

- requirement ID;
- acceptance criterion;
- implementation area;
- verification method.

Where practical, reference requirement or acceptance IDs in test names or test comments.

Do not mark a requirement complete without objective verification.

---

## Error handling

Do not hide important failures.

For recoverable failures:

- surface a clear user-facing error where appropriate;
- preserve the last known valid state;
- avoid partial writes;
- allow retry where meaningful.

For invalid manual input:

- block Save;
- show validation;
- do not write invalid data.

For overlapping events:

- allow Save;
- preserve both events.

---

## Security and privacy

P0 requires no credentials.

Rules:

- never commit credentials;
- never add secret values to source control;
- do not add telemetry without approval;
- do not upload user activity data;
- validate persisted and user-entered data;
- require confirmation for destructive event deletion;
- keep user data local in P0.

If future environment variables are introduced, create an `.env.example` without secrets.

---

## GitHub Pages compatibility

The production application must remain deployable as a static frontend.

Do not require a production Node server.

Ensure Vite base-path handling is compatible with repository-based GitHub Pages hosting.

Routing must work without server-side rewrite support.

---

## Offline requirements

The app must work offline after its first successful load.

Core offline functionality includes:

- app startup;
- activity management;
- timer operation;
- event history;
- event editing;
- timeline;
- reports;
- settings.

Use service-worker caching plus IndexedDB.

Do not make core functionality depend on network availability.

---

## Documentation rules

Update documentation when:

- setup changes;
- architecture changes;
- schema changes;
- scripts change;
- deployment changes;
- behaviour changes;
- known limitations change.

Do not document planned functionality as if it already exists.

Keep `CODEX_BUILD_SPEC.md` as the product requirement source of truth unless explicitly instructed to revise it.

---

## Preserve user work

Do not revert or overwrite unrelated user changes.

Do not rewrite unrelated files simply to simplify implementation.

If unrelated modifications conflict with the current task, report the conflict before changing them.

---

## Milestone completion report

At the end of each milestone, report:

- files created;
- files modified;
- dependencies added or removed;
- commands executed;
- tests executed;
- test results;
- lint result;
- type-check result;
- build result where relevant;
- requirement IDs satisfied;
- acceptance criteria verified;
- known issues;
- limitations;
- anything not verified.

Do not continue automatically to the next milestone unless explicitly instructed.

---

## Completion claims

Never claim:

- a test passed if it was not run;
- a build succeeded if it was not run;
- offline mode works if it was not verified;
- a deployment works if it was not verified;
- a requirement is complete without evidence.

If verification cannot run, state exactly why.

The project is not complete while required P0 acceptance criteria remain unverified.
```