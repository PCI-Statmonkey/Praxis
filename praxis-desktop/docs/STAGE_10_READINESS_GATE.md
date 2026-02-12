# Stage 10 Readiness Gate (Docs Only)

## A) What Exists Now (with file pointers)
- IPC contract + types + registrar:
  - `docs/STAGE_10_IPC_CONTRACT.md`
  - `shared/ipc/runtimeChannels.ts`
  - `shared/ipc/runtimeTypes.ts`
  - `electron/ipc/registerRuntimeIpcHandlers.ts`
  - `electron/ipc/registerRuntimeIpcHandlers.test.ts`
- Persistence read-only adapter + channels:
  - `shared/persistence/readOnlyService.ts`
  - `electron/persistence/sqliteReadOnly.ts`
  - `electron/persistence/sqliteReadOnly.test.ts`
  - IPC: `shared/ipc/runtimeChannels.ts` + `electron/ipc/registerRuntimeIpcHandlers.ts`
- Event log contract + service wrapper:
  - `shared/persistence/eventLogContract.ts`
  - `shared/persistence/eventLogContract.test.ts`
  - `electron/persistence/eventLogService.ts`
  - `electron/persistence/eventLogService.test.ts`
- Sync orchestrator (single tick, DI) + sync.getStatus:
  - `shared/sync/syncTypes.ts`
  - `electron/sync/mirrorTransport.ts`
  - `electron/sync/syncOrchestrator.ts`
  - `electron/sync/syncOrchestrator.test.ts`
  - IPC: `shared/ipc/runtimeChannels.ts` + `electron/ipc/registerRuntimeIpcHandlers.ts`
- Backup/restore preview services + IPC channels:
  - `shared/backup/backupTypes.ts`
  - `electron/backup/backupService.ts`
  - `electron/backup/restoreService.ts`
  - `electron/backup/backupService.test.ts`
  - `electron/backup/restoreService.test.ts`
  - IPC: `shared/ipc/runtimeChannels.ts` + `electron/ipc/registerRuntimeIpcHandlers.ts`
- Composition root + no-side-effects test:
  - `electron/runtime/runtimeComposition.ts`
  - `electron/runtime/runtimeComposition.test.ts`
- Wiring checklist:
  - `docs/STAGE_10_WIRING_CHECKLIST.md`

## B) Explicit Non-Goals / Still Not Done
- No wiring in `electron/main.ts`
- No preload exposure in `electron/preload.ts`
- No UI usage in `renderer/App.tsx` or settings UI
- No scheduler/timers
- No write IPC channels
- No restore apply/export invocation

## C) Stage 8/9 Mismatch Re-check (Status)
- `electron/syncScheduler.ts`: still open. Background timers remain a risk; must stay unused until explicit enable.
- `electron/persistence/mirrorSync.ts`: still open. Reads/writes mirror + DB; must remain gated behind explicit user action.
- `electron/persistence/mirrorLock.ts`: still open. Writes lock files in mirror root; must be gated and documented.
- `electron/persistence/sqliteEventLog.ts`: still open. `ensureDb()` creates schema and `getDeviceId()` writes meta row.
- `electron/checklistEventLog.ts`: still open. Writes JSONL + snapshots on call.
- `electron/backupExport.ts`: still open. Writes backup ZIP and reads mirror root.
- `electron/restoreApply.ts`: still open. Writes DB/config and rollback artifacts.
- `electron/supportBundle.ts`: still open. Writes support bundle files.
- `electron/syncDiagnostics.ts`: still open. Writes diagnostics logs if enabled.

## D) Wiring Prerequisites (Go/No-Go)
- Unit tests green
- Verify unchanged
- CI gates unchanged
- Clean tracked tree
- Dist artifacts reverted
- Stash baggage still untracked

## E) Next Stage Plan (Minimum Wiring)
- main.ts: add `registerRuntimeIpcHandlers(ipcMain, deps)` call site using `buildRuntimeIpcDeps(...)`
- preload.ts: expose safe IPC invoke wrappers for read-only channels
- UI: add minimal read-only status/preview calls behind explicit user actions
