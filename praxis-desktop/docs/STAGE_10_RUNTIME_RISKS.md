# Stage 10 Runtime Risks

## Operational Risks
- SQLite schema creation and writes can occur on first read (device id or integrity checks), which risks unexpected DB creation or WAL growth. Modules: `electron/persistence/sqliteEventLog.ts`, `electron/persistence/checklistReplay.ts`.
- Mirror sync can import partial/corrupt lines and still advance offsets, potentially missing or duplicating events if logs are truncated or rotated. Modules: `electron/persistence/mirrorSync.ts`, `electron/persistence/mirrorProvider.ts`.
- Restore apply replaces files and relies on rollback paths; partial failures can leave mixed state even after rollback. Modules: `electron/restoreApply.ts`, `electron/restoreRollback.ts`.
- JSONL checklist log parsing skips invalid lines silently; persistent corruption could lead to state drift. Modules: `electron/checklistEventLog.ts`.
- Snapshot writes are best-effort and fire asynchronously; snapshot errors are swallowed, which can mask perf or consistency issues. Modules: `electron/persistence/checklistReplay.ts`.

## Security/Privacy Risks
- Support bundle export reads diagnostics and mirror logs and writes a bundle to disk; misuse could expose sensitive metadata if invoked without user consent. Modules: `electron/supportBundle.ts`, `electron/syncDiagnostics.ts`, `electron/persistence/mirrorProvider.ts`.
- Backup export can include mirror root files; if mirror root is user-controlled or points to shared folders, exports could capture unintended data. Modules: `electron/backupExport.ts`, `electron/persistence/mirrorConfig.ts`.
- Sync diagnostics logs may include device IDs or error messages and are stored unencrypted. Modules: `electron/syncDiagnostics.ts`, `electron/persistence/mirrorSync.ts`.

## UX Risks
- Background sync scheduling may run without visible UI state, leading to "silent" activity and confusion about data movement. Modules: `electron/syncScheduler.ts`, `electron/persistence/mirrorSync.ts`.
- Restore apply uses a confirmation phrase but could still be triggered by a single IPC call, leading to unexpected data rollback if not surfaced clearly. Modules: `electron/restoreApply.ts`.
- Backup/restore flows operate on local files with minimal progress feedback if wired directly; operations can be slow and appear frozen. Modules: `electron/backupExport.ts`, `electron/restoreApply.ts`.

## Maintainability Risks
- Two parallel persistence stacks (JSONL checklist log vs SQLite event log vs Stage3 scaffolding) increase cognitive load and risk divergent behavior. Modules: `electron/checklistEventLog.ts`, `electron/persistence/sqliteEventLog.ts`, `electron/stage3/persistence/*`, `shared/persistence/*`.
- Sync code spans multiple files (config, locks, providers, scheduler, diagnostics) with shared implicit state, making it easy to introduce unintended coupling. Modules: `electron/persistence/mirrorConfig.ts`, `electron/persistence/mirrorLock.ts`, `electron/persistence/mirrorProvider.ts`, `electron/persistence/mirrorSync.ts`, `electron/syncScheduler.ts`, `electron/syncDiagnostics.ts`.
- Smoke tests depend on built `dist-electron` outputs and temp filesystem state; failures can be non-deterministic and not caught in unit tests. Modules: `scripts/*.mjs`.
