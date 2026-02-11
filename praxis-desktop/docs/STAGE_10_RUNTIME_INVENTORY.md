# Stage 10 Runtime Inventory

Scope: reintroduced runtime modules under `electron/persistence/`, `electron/stage3/`, `shared/`, `scripts/`, and loose `*.ts` under `electron/`.

## Inventory

| Path | Purpose (guess) | Imports/Exports Signals | Side-Effect Risk |
| --- | --- | --- | --- |
| electron/appPaths.ts | App data root helpers for diagnostics/support bundles. | Imports `electron` app, `path`. Exports `getAppDataRoot()`, `getDefaultSupportBundleDir()`. | No import-time effects. Reads `app.getPath("userData")` when called. |
| electron/backupExport.ts | Build backup ZIP archive from inventory and state files. | Imports `electron` app, `fs`, `crypto`, `os`, `path`, `buildBackupInventoryReport()`. Exports `BACKUP_EXPORT_FORMAT_VERSION`, `BACKUP_EXPORT_WARNING`, `exportBackupArchive()`. | Writes temp and archive files, reads DB/config/mirror root contents when invoked. |
| electron/backupInventory.ts | Generate inventory report of current state paths. | Imports `electron` app, `fs`, `os`, `path`, `appPaths`, `checklistEventLog`, `mirrorConfig`, `sqliteEventLog`. Exports `BACKUP_INVENTORY_WARNING`, `buildBackupInventoryReport()`, `writeBackupInventoryReport()`, type `InventoryReport`. | Reads filesystem, writes report file when `writeBackupInventoryReport()` is called. |
| electron/checklistEventLog.ts | JSONL event log + snapshot for checklist state in userData. | Imports `electron` app, `fs`, `path`, shared checklist event types and `replayChecklistEvents()`. Exports `getChecklistPaths()`, `appendChecklistEvent()`, `readAllChecklistEvents()`, `readChecklistSnapshot()`, `writeChecklistSnapshot()`, `loadChecklistState()`. | Reads/writes `userData` files; queued writes on calls. |
| electron/persistence/checklistReplay.ts | Load checklist state from SQLite events and optional snapshot. | Imports `sqliteEventLog` functions and `applyChecklistEvents()`. Exports `loadChecklistStateFromSqlite()`. | Reads DB; may write snapshot asynchronously after threshold when called. |
| electron/persistence/mirrorConfig.ts | Resolve mirror root via env or config file. | Imports `electron` app, `fs`, `path`. Exports `getMirrorConfigPath()`, `getMirrorRoot()`. | Reads config file on call. No writes. |
| electron/persistence/mirrorLock.ts | Cross-process lock file for mirror sync. | Imports `fs`, `path`, `logSyncDiagnostics()`. Exports `withMirrorLock()`, types. | Creates/updates/deletes `.praxis-sync.lock` and writes diagnostics when used. |
| electron/persistence/mirrorProvider.ts | Read/write mirror device logs with optional hash chaining. | Imports `fs`, `path`, `crypto`. Exports `listDeviceLogs()`, `appendToDeviceLog()`, `readFromOffset()`, type `MirrorResult`. | Creates dirs and appends to mirror log files on call. Env `PRAXIS_SYNC_HASHCHAIN` read at import. |
| electron/persistence/mirrorSync.ts | Upload local events to mirror and import remote events with backoff. | Imports `sqliteEventLog` functions, `mirrorConfig`, `mirrorProvider`, `mirrorLock`, `syncDiagnostics`. Exports `syncTick()`, `syncTickWithBackoff()`, `uploadNewLocalEvents()`, `SYNC_BASELINE_INTERVAL_MS`, `_test_*` lock helpers. | Reads/writes DB, mirror logs, lock files; logs diagnostics. Module-level backoff state; no timers unless invoked. |
| electron/persistence/sqliteEventLog.ts | SQLite event log storage, schema, sync state, snapshots. | Imports `electron` app, `path`, `crypto`, dynamic `node:sqlite`/`better-sqlite3`. Exports `getDbFilePath()`, `getDeviceId()`, `appendEvent()`, `getAllEvents()`, `getEventsSince()`, `getLocalEventsSince()`, `getEventsAfterRowId()`, `getMaxEventRowId()`, `readLatestSnapshot()`, `writeSnapshot()`, `getSyncState()`, `setSyncState()`, `insertEventIfMissing()`, `getDbIntegritySummary()`, `getDropboxMirrorPath()`, `getDropboxMirrorFilePath()`, `validateEventRecord()`, `DB_SCHEMA_VERSION`. | Creates DB file and schema on first use; `getDeviceId()` writes meta row; writes WAL on event inserts. |
| electron/restorePlan.ts | Build restore plan by comparing backup ZIP with current inventory. | Imports `fs`, `crypto`, `path`, `backupInventory`, `backupExport`. Exports `RESTORE_PLAN_WARNING`, `buildRestorePlan()`, `writeRestorePlan()`. | Reads ZIP and filesystem; writes plan file when called. |
| electron/restoreApply.ts | Apply restore plan; creates rollback dir + report. | Imports `fs`, `crypto`, `path`, `restorePlan`, `appPaths`. Exports `RESTORE_APPLY_CONFIRM_PHRASE`, `applyRestorePlan()`. | Writes/renames/deletes files in app data and rollback dir; requires confirm phrase. |
| electron/restoreRollback.ts | Roll back a prior restore apply report. | Imports `fs`, `crypto`, `path`. Exports `restoreRollback()`. | Reads apply report; writes rollback report; moves/deletes files. |
| electron/supportBundle.ts | Export redacted support bundle (sync/db/logs/mirror summary). | Imports `fs`, `path`, `electron` app, `appPaths`, `mirrorConfig`, `mirrorProvider`, `sqliteEventLog`. Exports `exportSupportBundle()`. | Writes bundle directory/files; reads diagnostics log and mirror logs when called. |
| electron/syncDiagnostics.ts | Optional JSONL sync diagnostics logger with rotation. | Imports `electron` app, `fs`, `path`. Exports `logSyncDiagnostics()`. | Writes/rotates log files when `PRAXIS_SYNC_DIAGNOSTICS=1`; env checked at import. |
| electron/syncScheduler.ts | Background scheduler for `syncTickWithBackoff()`. | Imports `logSyncDiagnostics()`, `mirrorConfig`, `mirrorSync`. Exports `startSyncScheduler()`, `stopSyncScheduler()`. | Creates timers and calls sync when started; writes diagnostics. |
| electron/stage3/persistence/mirrorProvider.ts | Stage3 mirror IO helpers. | Imports `fs`, `path`. Exports `ensureEventlogDir()`, `listDeviceLogs()`, `appendLinesToDeviceLog()`, `readFromOffset()`, `MIRROR_EVENTLOG_DIR`, type `MirrorResult`. | Creates dirs and appends/reads mirror logs on call. |
| electron/stage3/persistence/sqliteFoundation.ts | Stage3 DB schema helpers and event row mapping. | Imports stage3 event types. Exports `initStage3Schema()`, `mapEventToRow()`, types. | Executes schema SQL when called. |
| electron/stage3/persistence/syncConfig.ts | Stage3 sync config read/write helpers. | Imports `SqliteDbHandle` type. Exports `readSyncConfig()`, `writeSyncConfig()`. | Writes sync_state rows on call. |
| electron/stage3/persistence/syncEngine.ts | Stage3 sync no-op placeholders. | Imports `MirrorResult` type. Exports `uploadNewLocalEvents()`, `importRemoteEvents()`, `syncTick()`. | No side effects (all no-op). |
| shared/persistence/checklistEvents.ts | Checklist event types + pure reducer. | Exports event types, `createChecklistEvent()`, `applyChecklistEvent()`, `replayChecklistEvents()`. | No I/O; uses `crypto.randomUUID` if present. |
| shared/persistence/deriveChecklistState.ts | Deterministic derivation from event log records. | Imports checklist types + `EventRecord`. Exports `applyChecklistEvents()`, `deriveChecklistState()`. | Pure; no side effects. |
| shared/persistence/eventLogTypes.ts | Shared event log and sync state types. | Exports type aliases only. | No side effects. |
| shared/persistence/masterChecklistTypes.ts | Checklist state types. | Exports type aliases only. | No side effects. |
| shared/persistence/stage3EventTypes.ts | Stage3 event log types. | Exports type aliases only. | No side effects. |
| scripts/backup_export_smoke.mjs | Smoke test for backup export ZIP format/inventory content. | Imports built `dist-electron/backupExport`. Runs `exportBackupArchive()`. | Writes temp dirs/files; sets `PRAXIS_MIRROR_ROOT` in-process. |
| scripts/backup_inventory_smoke.mjs | Smoke test for inventory report generation. | Imports built `dist-electron/backupInventory`. Runs `writeBackupInventoryReport()`. | Writes temp report files. |
| scripts/dev_mirror_tests.mjs | Dev tests for mirror read/lock behaviors. | Imports built `persistence/mirrorProvider` and `mirrorSync`. Uses `_test_*` helpers. | Writes temp mirror files/locks; cleans up temp dir. |
| scripts/dev_replay_test.mjs | Dev tests for deterministic event replay. | Imports built `shared/persistence/deriveChecklistState`. | Pure; no external I/O beyond console. |
| scripts/dev_sqlite_smoke.mjs | Dev smoke for sqlite event log append/read. | Imports built `persistence/sqliteEventLog`. | Writes to SQLite DB in app data. |
| scripts/dev_stage3_smoke.mjs | Dev smoke for sqlite event log append/read (same module). | Imports built `persistence/sqliteEventLog`. | Writes to SQLite DB in app data. |
| scripts/restore_apply_smoke.mjs | Smoke test for restore apply + drift + checksum checks. | Imports built `backupExport`, `restorePlan`, `restoreApply`, `mirrorConfig`. | Writes temp dirs, modifies mirror config file, writes restore rollback dirs. |
| scripts/restore_plan_smoke.mjs | Smoke test for restore plan conflicts/checksum detection. | Imports built `backupExport`, `restorePlan`. | Writes temp dirs; sets `PRAXIS_MIRROR_ROOT` in-process. |
| scripts/restore_rollback_smoke.mjs | Smoke test for restore rollback behavior. | Imports built `backupExport`, `restorePlan`, `restoreApply`, `restoreRollback`, `mirrorConfig`. | Writes temp dirs/files; modifies mirror config file. |
| scripts/support_bundle_smoke.mjs | Smoke test for support bundle export + redaction. | Imports built `supportBundle` and `appPaths`. | Writes temp bundle dirs/files; reads diagnostics and mirror logs. |

## Classification

| Module Path | Classification Bucket | Confidence | Notes |
| --- | --- | --- | --- |
| electron/appPaths.ts | Utility / unknown | High | Path helpers used by backup/support flows. Inspect stage 6 diagnostics docs for usage. |
| electron/backupExport.ts | Backup/restore support | High | Produces backup ZIP. |
| electron/backupInventory.ts | Backup/restore support | High | Inventory report used by backup/restore. |
| electron/checklistEventLog.ts | Event log implementation | High | JSONL log + snapshot read/write. |
| electron/persistence/checklistReplay.ts | Event log implementation | High | SQLite replay + snapshot write. Secondary: persistence layer. |
| electron/persistence/mirrorConfig.ts | Sync orchestration | Medium | Mirror root discovery for sync. Secondary: persistence config. |
| electron/persistence/mirrorLock.ts | Sync orchestration | High | Locking for sync operations. |
| electron/persistence/mirrorProvider.ts | Sync orchestration | High | Mirror log IO utilities. |
| electron/persistence/mirrorSync.ts | Sync orchestration | High | Core sync tick + backoff. |
| electron/persistence/sqliteEventLog.ts | Event log implementation | High | SQLite storage + sync state. Secondary: persistence layer. |
| electron/restorePlan.ts | Backup/restore support | High | Restore plan generation. |
| electron/restoreApply.ts | Backup/restore support | High | Apply restore plan + rollback. |
| electron/restoreRollback.ts | Backup/restore support | High | Rollback restore apply. |
| electron/supportBundle.ts | Utility / unknown | Medium | Support bundle export for diagnostics. Inspect Stage 6 support bundle spec. |
| electron/syncDiagnostics.ts | Sync orchestration | Medium | Diagnostics logging for sync. |
| electron/syncScheduler.ts | Sync orchestration | High | Background scheduler for sync ticks. |
| electron/stage3/persistence/mirrorProvider.ts | Sync orchestration | Medium | Stage3 mirror IO. |
| electron/stage3/persistence/sqliteFoundation.ts | Persistence layer | High | Stage3 schema + mapping. |
| electron/stage3/persistence/syncConfig.ts | Persistence layer | High | Stage3 sync config persistence. |
| electron/stage3/persistence/syncEngine.ts | Sync orchestration | Medium | Stage3 sync no-op scaffold. |
| shared/persistence/checklistEvents.ts | Persistence layer | High | Types + reducers. |
| shared/persistence/deriveChecklistState.ts | Persistence layer | High | Event log -> state derivation. |
| shared/persistence/eventLogTypes.ts | Persistence layer | High | Event log types. |
| shared/persistence/masterChecklistTypes.ts | Persistence layer | High | Checklist types. |
| shared/persistence/stage3EventTypes.ts | Persistence layer | High | Stage3 event types. |
| scripts/backup_export_smoke.mjs | Backup/restore support | High | Backup export smoke tests. |
| scripts/backup_inventory_smoke.mjs | Backup/restore support | High | Inventory smoke tests. |
| scripts/dev_mirror_tests.mjs | Sync orchestration | Medium | Mirror IO + lock tests. |
| scripts/dev_replay_test.mjs | Event log implementation | Medium | Replay correctness tests. |
| scripts/dev_sqlite_smoke.mjs | Event log implementation | Medium | SQLite append/read smoke. |
| scripts/dev_stage3_smoke.mjs | Event log implementation | Low | Uses same sqlite module as Stage 10, not stage3 DB. |
| scripts/restore_apply_smoke.mjs | Backup/restore support | High | Restore apply tests. |
| scripts/restore_plan_smoke.mjs | Backup/restore support | High | Restore plan tests. |
| scripts/restore_rollback_smoke.mjs | Backup/restore support | High | Restore rollback tests. |
| scripts/support_bundle_smoke.mjs | Utility / unknown | Medium | Support bundle tests; inspect Stage 6 bundle spec. |
