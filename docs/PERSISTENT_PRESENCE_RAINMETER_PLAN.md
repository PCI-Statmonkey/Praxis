# Persistent Presence And Rainmeter Plan

## Purpose

Define the V1.1 path for PRAXIS to stay present without becoming noisy or unsafe. Presence should
reuse AI Task Review, service health, local plan, and Review Inbox signals. Rainmeter and wallpaper
surfaces are display-only outputs, not command surfaces.

## Current State

- Electron now supports a Windows tray lifetime when the operator enables close-to-tray in Settings.
- Calendar and email background sync intervals live in the main process while the app is open.
- Mission Control already has a compact command/status surface, service health, Review Inbox, Talk,
  Plan, and local time blocks.
- AI Review can now explain priority/risk through deterministic, Ollama, or configured API model
  ranking while preserving the read-only boundary.
- Pause/quiet state now persists in settings and appears in Settings plus the Windows tray.
- Read-only Rainmeter snapshot export is implemented.
- Notification contracts remain planned but not implemented.

## Product Boundary

Presence is not automation. It should:

- make PRAXIS easy to bring back,
- show whether PRAXIS is awake, paused, degraded, or needs attention,
- nudge only from local structured facts,
- route write-like actions back into PRAXIS confirmation surfaces,
- never let Rainmeter, wallpaper, or tray surfaces mutate work state.

## Phase 1: Tray And Background Lifetime

Implementation target:

- Done: add a Windows tray icon with `Open PRAXIS`, `Sync Calendars Now`, `Settings`, and `Quit`.
- Done: add close-to-tray as a setting, default off until live QA proves it is understandable.
- Done: keep explicit quit available from tray and File menu.
- Done: preserve command-line maintenance modes such as `--storage-check`, `--memory-reindex`, and
  companion commands as true one-shot commands that never create tray state.
- Done: keep calendar/email/slack runtime alive only when the app is intentionally resident.
- Done: add pause/resume/quiet tray controls after persisted presence state exists.

Acceptance:

- Closing the main window hides it only when close-to-tray is enabled.
- `Quit` stops calendar/email/slack intervals, closes the database, and exits.
- Settings can disable background presence.

## Phase 2: Pause And Quiet Modes

Add a small presence state model:

- Done: `active`: normal status and optional nudges.
- Done: `quiet_until`: background stays alive, but notifications are suppressed until a timestamp.
- Done: `paused`: background stays alive for sync and tray status, but no nudges.
- Done: `attention`: sync/storage/provider health needs operator attention while local work remains
  available.

State is stored in SQLite settings. Do not use markdown memory for runtime presence state.

Acceptance:

- Mission Control, tray tooltip, and Rainmeter snapshot agree on the presence state.
- Quiet mode survives restart.
- Degraded state uses sanitized service-health copy only.

Implementation status: done for display integration. The persisted operator setting remains
`active`, `paused`, or `quiet_until`; PRAXIS derives a public `attention` presence state from
sanitized service health for the app header, tray tooltip, and Rainmeter snapshot.

## Phase 3: Notification Boundaries

Notifications should come from the same packet-backed review logic as Talk:

- due-soon or overdue work that is not already visible as completed,
- waiting-on follow-up that has become stale,
- Review Inbox item aging,
- provider sync degraded state,
- missed local planned time block.

Rules:

- No notification should create, complete, schedule, send, publish, or delete anything.
- Notification click opens PRAXIS to the relevant surface.
- Snooze is local runtime state, not a work graph mutation.
- Do not include raw email subject/body, provider account refs, sync errors, secrets, or local file
  paths in notification text.

Planning status: done in `docs/NOTIFICATION_BOUNDARY_PLAN.md`. Implementation remains pending until
the operator chooses notification delivery and quiet-window controls.

## Phase 4: Rainmeter Snapshot

Export a read-only JSON file for ambient display:

Suggested path:

`memory/runtime/rainmeter/praxis-snapshot.json`

Implementation status: done. PRAXIS writes this snapshot on startup, through
`npm run rainmeter:snapshot`, and through an explicit IPC hook for app surfaces. The snapshot keeps
the nested contract and also includes skin-ready flat field names under `skin` so Rainmeter layouts
can bind to stable keys without parsing nested objects.

Suggested shape:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-05-10T12:00:00.000Z",
  "localDate": "2026-05-10",
  "presence": {
    "state": "active",
    "label": "PRAXIS active",
    "detail": "Plan and Review Inbox are current"
  },
  "topMove": {
    "title": "Review the packet-backed next move",
    "kind": "todo",
    "priority": "high"
  },
  "counts": {
    "reviewInbox": 0,
    "overdue": 0,
    "dueToday": 2,
    "waiting": 1,
    "localBlocksToday": 3
  },
  "calendar": {
    "nextAppointmentTitle": "Client review",
    "nextAppointmentStartsAt": "2026-05-10T15:00:00.000Z"
  },
  "serviceHealth": {
    "state": "ready",
    "label": "Services ready",
    "detail": "Connected services look ready.",
    "attentionCount": 0
  },
  "skin": {
    "presenceLabel": "PRAXIS active",
    "topMoveTitle": "Review the packet-backed next move",
    "reviewInboxCount": 0,
    "serviceHealthLabel": "Services ready"
  }
}
```

Privacy rules:

- Export titles only after existing AI Review packet redaction rules are applied.
- No notes, email bodies, provider account refs, raw sync errors, database paths, memory root paths,
  tokens, encrypted values, or `secure_secrets`.
- Rainmeter receives no command endpoint and cannot mutate SQLite, markdown memory, provider events,
  or settings.
- Rainmeter snapshot is overwrite-only and read-only from PRAXIS perspective.
- Rainmeter cannot call back into PRAXIS.

## Phase 5: Wallpaper/Ambient Surface

Only after Rainmeter snapshot is stable:

- Done: draft a simple ambient Rainmeter skin around the snapshot in `docs/rainmeter/Praxis/`.
- Show top move, next appointment, due/waiting counts, and presence state.
- Open PRAXIS for action; do not embed action controls in the skin.

## Engineering Notes

- Use Electron `Tray` and main-process lifecycle in `electron/main.ts`.
- Keep tray creation out of maintenance CLI modes.
- Add IPC for presence settings only after storage shape is defined.
- Reuse `selectServiceHealthItems`, AI Review packet summary, local time blocks, and Review Inbox
  selectors rather than creating a parallel ranking engine.
- Add storage integrity checks for the presence settings row and Rainmeter runtime path if persisted.

## Verification

- Unit/pure tests for snapshot redaction and presence-state transitions.
- `npx tsc --noEmit`, lint, assistant/sync regressions, build, storage check.
- Manual Windows QA for tray menu, close-to-tray, restore, explicit quit, restart persistence, and
  no secret/path leakage in Rainmeter JSON.

## Open Decisions

- Whether close-to-tray defaults on or off after first-run onboarding.
- Minimum quiet-mode presets.
- Whether `Sync now` appears before or after provider live publish QA is complete.
- Whether Rainmeter export belongs under `memory/runtime/` or `%APPDATA%`.
