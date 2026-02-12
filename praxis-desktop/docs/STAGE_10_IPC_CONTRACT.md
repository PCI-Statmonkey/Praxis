# Stage 10 IPC Contract (v0)

## Goals
- Explicit request/response IPC only.
- No side effects on import.
- All writes behind explicit IPC calls.
- Contract-first; no runtime wiring in this phase.
- No hidden persistence (no implicit DB creation, file writes, or background timers).

## Channel Naming
- Prefix: `praxis:runtime:*`
- Namespace segments use dots for logical grouping.
  - Example: `praxis:runtime:persistence.getPaths`

## Message Shapes (TypeScript)

```ts
export type IpcError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type IpcSuccess<T> = {
  ok: true;
  data: T;
};

export type IpcFailure = {
  ok: false;
  error: IpcError;
};

export type IpcResult<T> = IpcSuccess<T> | IpcFailure;
```

## Core Requirements
- Handlers must catch and return errors using `IpcFailure`.
- Read-only channels must not mutate disk or create databases.
- Any write-capable channel must be explicit and never invoked implicitly.
- No module side effects (no timers, no I/O on import).

## v0 Channel List (Contract-First)

All channels are placeholders until wired. None are invoked at runtime in this phase.

### praxis:runtime:ping
- Purpose: sanity check and version echo.
- Request: `{}`
- Response: `IpcResult<{ version: string }>`

### praxis:runtime:getStatus
- Purpose: read-only runtime summary.
- Request: `{}`
- Response: `IpcResult<{ ready: boolean; notes?: string[] }>`

### praxis:runtime:persistence.getPaths
- Purpose: read-only path summary for app data and DB locations.
- Request: `{}`
- Response: `IpcResult<{ appDataRoot: string; dbPath: string }>`
- Requirement: must not create DB if absent (read-only path resolution).
- Read-only guarantees:
  - DB missing is OK; `persistence.getDbStatus` returns `exists: false`.
  - No create-on-read: no DB/schema/deviceId/snapshot writes.

### praxis:runtime:persistence.getDbStatus
- Purpose: read-only DB status summary.
- Request: `{}`
- Response: `IpcResult<{ exists: boolean; path: string }>`
- Read-only guarantees:
  - DB missing is OK and returns `exists: false`.
  - No create-on-read: no DB/schema/deviceId/snapshot writes.

### praxis:runtime:persistence.getDbIntegritySummary
- Purpose: read-only integrity summary.
- Request: `{}`
- Response: `IpcResult<{ ok: boolean; integrityCheck?: string; eventCount?: number; snapshotCount?: number }>`
- Requirement: must not create DB if absent.
- Read-only guarantees:
  - DB missing is OK; `persistence.getDbStatus` returns `exists: false`.
  - No create-on-read: no DB/schema/deviceId/snapshot writes.

### praxis:runtime:sync.getMirrorStatus
- Purpose: read-only mirror status summary.
- Request: `{}`
- Response: `IpcResult<{ mirrorRootSet: boolean; mirrorRoot?: string }>`

### praxis:runtime:sync.getStatus
- Purpose: read-only sync orchestration status snapshot.
- Request: `{}`
- Response: `IpcResult<SyncSummary>`
- Read-only guarantees:
  - No sync tick or background scheduling.
  - No writes or mirror access.

### praxis:runtime:backup.getInventoryPreview
- Purpose: read-only inventory preview (no writes).
- Request: `{}`
- Response: `IpcResult<BackupInventoryPreview>`
- Requirement: preview only; do not write report files.

### praxis:runtime:restore.getPlanPreview
- Purpose: read-only restore plan preview (no writes).
- Request: `{ backupZipPath: string }`
- Response: `IpcResult<RestorePlanPreview>`
- Requirement: preview only; do not apply changes or write rollback artifacts.

## Error Codes (Initial)
- `unknown_error`
- `invalid_request`
- `not_implemented`
- `db_missing`
- `io_error`

## Notes
- Any future write-capable channels must be added explicitly with confirmation semantics and auditability.
- No channel should trigger background loops (sync scheduler) without explicit user opt-in and clear UI visibility.
