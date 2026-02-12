# Stage 10 Runtime Architecture Map

## Entry Points

Locked (do not modify):
- Electron main entrypoint (`main.ts`) - LOCKED.
- Electron preload entrypoint (`preload.ts`) - LOCKED.
- Renderer entrypoint (`App.tsx`) - LOCKED.

Candidate runtime entrypoints (NOT YET CONNECTED):
- Backup/export: `exportBackupArchive()` from `electron/backupExport.ts`.
- Inventory: `writeBackupInventoryReport()` from `electron/backupInventory.ts`.
- Restore: `writeRestorePlan()` from `electron/restorePlan.ts`, `applyRestorePlan()` from `electron/restoreApply.ts`, `restoreRollback()` from `electron/restoreRollback.ts`.
- Support bundle: `exportSupportBundle()` from `electron/supportBundle.ts`.
- Event log (JSONL): `appendChecklistEvent()` / `loadChecklistState()` from `electron/checklistEventLog.ts`.
- Event log (SQLite): `appendEvent()` / `getAllEvents()` / `loadChecklistStateFromSqlite()` from `electron/persistence/sqliteEventLog.ts` and `electron/persistence/checklistReplay.ts`.
- Sync orchestration: `syncTick()` / `syncTickWithBackoff()` from `electron/persistence/mirrorSync.ts` and `startSyncScheduler()` from `electron/syncScheduler.ts`.

## Diagram

```
[Renderer UI]
    |
    | (IPC invoke/handle - NOT WIRED)
    v
[Electron Main: IPC Bridge]
    |
    |--> [Checklist Event Log (JSONL)] ---> [userData files]
    |
    |--> [SQLite Event Log] -----> [eventlog.sqlite]
    |            |
    |            v
    |       [Snapshot table]
    |
    |--> [Backup/Restore]
    |        |--> [Inventory]
    |        |--> [Backup ZIP]
    |        |--> [Restore Plan/Apply/Rollback]
    |
    |--> [Sync Orchestrator]
             |--> [Mirror Root /eventlog/*.jsonl]
             |--> [Sync Diagnostics Log]
             |--> [Support Bundle Export]
```

## Data Flow

- User action -> UI state -> IPC (NOT WIRED) -> persistence write (JSONL or SQLite) -> event log append -> optional snapshot update.
- Sync tick -> read local events -> append to mirror log -> read remote device logs -> validate/import into SQLite -> update sync state offsets.
- Backup export -> inventory current paths -> read DB/config/mirror root -> write ZIP + manifest/checksums.
- Restore plan -> read backup ZIP -> compare with live inventory -> produce actions (conflicts for mirror root).
- Restore apply -> validate plan -> write/replace DB/config -> write rollback report.

## Boundaries & Contracts

- IPC surface: No IPC channels defined in these modules. Any renderer access would require explicit `ipcMain.handle`/`ipcRenderer.invoke` wiring elsewhere.
- DB access points: `electron/persistence/sqliteEventLog.ts` is the authoritative SQLite access layer; `electron/persistence/checklistReplay.ts` reads from it.
- Sync orchestrator: DI wrapper, single-tick only, no scheduling or timers. Scheduler remains locked and not reintroduced in Stage 10.
- Sync status: computed from current deps (no stored state).
- Sync boundaries: orchestrator coordinates deps only; transport/locks are injected and handle mirror I/O separately.
- Mirror root assumptions: `getMirrorRoot()` uses env `PRAXIS_MIRROR_ROOT` or `userData/config.json`. Mirror event logs stored under `<mirrorRoot>/eventlog/*.jsonl` and lock files under `<mirrorRoot>/.praxis-sync.lock` and `<mirrorRoot>/eventlog/*.lock`.
- Backup/restore touch points: backup inventory + export read app data, mirror config, mirror root; restore plan/apply operate on DB/config (mirror root files are always conflicts unless explicitly allowed by plan logic).
- Backup/restore staging: read-only previews only (inventory + path-based restore plan) with no writes or export/apply/rollback in Stage 10.

## Authoritative Event Log Model

- Authoritative store: SQLite (`eventlog.sqlite`) is the source of truth for local state.
- Transport: mirror JSONL device logs are for sync transport only and are not authoritative.
- Snapshot usage: optional acceleration only; snapshots do not replace the SQLite event log.

## Stage 8/9 Contract Mismatch Checklist

- `electron/syncScheduler.ts`: starts background timers and sync loop as soon as `startSyncScheduler()` is called. Conflict: Stage 8/9 emphasize no background timers without explicit enable. Mitigation: require explicit user opt-in + IPC gating before calling `startSyncScheduler()`; ensure it is never started on app boot.
- `electron/persistence/mirrorSync.ts`: `syncTickWithBackoff()` can read/write mirror logs, DB, and diagnostics. Conflict: could write to mirror root without explicit consent if called implicitly. Mitigation: gate calls behind explicit enable + mirror root validation and a visible UX toggle.
- `electron/persistence/mirrorLock.ts`: writes `.praxis-sync.lock` in mirror root. Conflict: lock file writes in user-chosen mirror root may be outside allowed write locations. Mitigation: validate mirror root under approved paths and document lock file behavior.
- `electron/persistence/sqliteEventLog.ts`: `ensureDb()` creates schema and `getDeviceId()` writes to DB on read. Conflict: read paths can cause writes and background DB creation if invoked too early. Mitigation: separate read-only probes from mutating calls; gate first-use initialization explicitly.
- `electron/checklistEventLog.ts`: `appendChecklistEvent()` and `writeChecklistSnapshot()` write to `userData` on call. Conflict: if wired to render-side hydration without explicit write intent, would break no-hidden-persistence stance. Mitigation: separate read-only load calls from write flows and keep writes behind explicit user actions.
- `electron/backupExport.ts`: `exportBackupArchive()` can include mirror root content if configured. Conflict: could read and package data outside approved locations. Mitigation: require explicit selection/confirmation of mirror root inclusion (already skipped when missing); add allowlist for backup sources.
- `electron/restoreApply.ts`: writes DB/config and creates rollback artifacts. Conflict: non-idempotent writes can occur if invoked implicitly or via stale plans. Mitigation: require explicit confirmation phrase and IPC-only access; validate plan freshness (already enforced).
- `electron/supportBundle.ts`: `exportSupportBundle()` writes support bundle folders in app data and reads mirror logs. Conflict: silent export could leak data or create unexpected writes. Mitigation: require explicit user action + show output location.
- `electron/syncDiagnostics.ts`: writes diagnostics logs when env flag enabled. Conflict: background logging to disk without user visibility. Mitigation: require explicit developer-only enable flag and surface clear diagnostics status.
