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
- Pause/quiet mode, notification, and Rainmeter export contracts remain planned but not implemented.

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
- Later: add pause/resume nudge controls after a persisted presence state exists.

Acceptance:

- Closing the main window hides it only when close-to-tray is enabled.
- `Quit` stops calendar/email/slack intervals, closes the database, and exits.
- Settings can disable background presence.

## Phase 2: Pause And Quiet Modes

Add a small presence state model:

- `active`: normal status and optional nudges.
- `quiet_until`: background stays alive, but notifications are suppressed until a timestamp.
- `paused`: background stays alive for sync and tray status, but no nudges.
- `degraded`: sync/storage/AI provider health needs operator attention.

Store state in SQLite settings. Do not use markdown memory for runtime presence state.

Acceptance:

- Mission Control, tray tooltip, and Rainmeter snapshot agree on the presence state.
- Quiet mode survives restart.
- Degraded state uses sanitized service-health copy only.

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

## Phase 4: Rainmeter Snapshot

Export a read-only JSON file for ambient display:

Suggested path:

`memory/runtime/rainmeter/praxis-snapshot.json`

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
    "attentionCount": 0
  }
}
```

Privacy rules:

- Export titles only after existing AI Review packet redaction rules are applied.
- No notes, email bodies, provider account refs, raw sync errors, database paths, memory root paths,
  tokens, encrypted values, or `secure_secrets`.
- Rainmeter snapshot is overwrite-only and read-only from PRAXIS perspective.
- Rainmeter cannot call back into PRAXIS.

## Phase 5: Wallpaper/Ambient Surface

Only after Rainmeter snapshot is stable:

- Design a simple ambient wallpaper/Rainmeter skin around the snapshot.
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
