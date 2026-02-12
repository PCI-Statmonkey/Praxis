import type {
  EventLogResult,
  EventRecord,
  EventLogValidationResult,
} from "../../shared/persistence/eventLogContract";
import type { MirrorTransport } from "./mirrorTransport";
import type {
  SyncCursor,
  SyncError,
  SyncSummary,
  SyncTickResult,
  SyncStatus,
} from "../../shared/sync/syncTypes";

type EventLogService = {
  getLocalEventCursor: () => Promise<EventLogResult<SyncCursor>>;
  readEventsAfterRowId: (rowId: number, limit: number) => Promise<EventLogResult<EventRecord[]>>;
  validateEventRecord: (record: EventRecord) => EventLogValidationResult;
  appendEvent: (record: EventRecord) => Promise<EventLogResult<EventRecord>>;
  insertEventIfMissing: (record: EventRecord) => Promise<EventLogResult<boolean>>;
};

type MirrorLock = {
  withMirrorLock: <T>(fn: () => Promise<T>) => Promise<T | null>;
};

type DiagnosticsLogger = {
  log: (message: string, details?: Record<string, unknown>) => void;
};

type Clock = {
  now: () => string;
};

type SyncConfig = {
  isMirrorConfigured: () => boolean;
  getLocalDeviceId: () => string;
};

export type SyncOrchestratorDeps = {
  eventLog: EventLogService;
  mirrorTransport: MirrorTransport;
  mirrorLock: MirrorLock;
  diagnostics?: DiagnosticsLogger;
  clock: Clock;
  config: SyncConfig;
};

export type SyncOrchestrator = {
  tick: () => Promise<SyncTickResult>;
  getStatus: () => SyncSummary;
};

const MAX_BATCH_SIZE = 500;

const toBlocked = (
  reason: string,
  error?: SyncError
): SyncTickResult => ({
  status: "blocked",
  uploaded: 0,
  imported: 0,
  warnings: [reason],
  blockedReason: reason,
  error,
});

const toError = (error: SyncError): SyncTickResult => ({
  status: "error",
  uploaded: 0,
  imported: 0,
  warnings: [],
  error,
});

const normalizeRecord = (record: Record<string, unknown>): EventRecord | null => {
  if (!record || typeof record !== "object") return null;
  return {
    event_id: String(record.event_id ?? ""),
    device_id: String(record.device_id ?? ""),
    local_seq: Number(record.local_seq ?? 0),
    ts: String(record.ts ?? ""),
    type: record.type as EventRecord["type"],
    item_id: String(record.item_id ?? ""),
    payload: (record.payload ?? {}) as Record<string, unknown>,
    prev_hash: record.prev_hash ? String(record.prev_hash) : null,
    hash: record.hash ? String(record.hash) : null,
    row_id: typeof record.row_id === "number" ? record.row_id : undefined,
  };
};

export const createSyncOrchestrator = (deps: SyncOrchestratorDeps): SyncOrchestrator => {
  let summary: SyncSummary = {
    status: "idle",
  };

  const getStatus = (): SyncSummary => ({ ...summary });

  const tick = async (): Promise<SyncTickResult> => {
    const now = deps.clock.now();
    if (summary.status === "running") {
      const error: SyncError = {
        code: "invalid_request",
        message: "sync already running",
      };
      summary = { ...summary, status: "blocked", lastTickAt: now, lastError: error };
      return toBlocked("already_running", error);
    }

    if (!deps.config.isMirrorConfigured()) {
      const error: SyncError = {
        code: "invalid_request",
        message: "mirror not configured",
      };
      summary = { ...summary, status: "blocked", lastTickAt: now, lastError: error };
      return toBlocked("mirror_not_configured", error);
    }

    summary = { ...summary, status: "running", lastTickAt: now, lastError: undefined };

    const lockResult = await deps.mirrorLock.withMirrorLock(async () => {
      const warnings: string[] = [];
      let uploaded = 0;
      let imported = 0;
      const localCursorResult = await deps.eventLog.getLocalEventCursor();
      if (!localCursorResult.ok) {
        return toError(localCursorResult.error);
      }

      const localCursor = localCursorResult.value;
      summary = { ...summary, localCursor };

      const localDeviceId = deps.config.getLocalDeviceId();
      if (!localDeviceId || typeof localDeviceId !== "string") {
        return toError({ code: "invalid_request", message: "local device id missing" });
      }

      const lastSynced = localCursor.lastSyncRowId ?? 0;
      if (localCursor.maxRowId > lastSynced) {
        const eventsResult = await deps.eventLog.readEventsAfterRowId(lastSynced, MAX_BATCH_SIZE);
        if (!eventsResult.ok) {
          return toError(eventsResult.error);
        }
        if (eventsResult.value.length > 0) {
          const appendResult = await deps.mirrorTransport.append(localDeviceId, eventsResult.value);
          uploaded += appendResult.appended;
          summary = {
            ...summary,
            remoteCursor: {
              ...(summary.remoteCursor ?? {}),
              [localDeviceId]: appendResult.nextOffset,
            },
          };
        }
      }

      const devices = await deps.mirrorTransport.listDeviceLogs();
      for (const deviceId of devices) {
        if (deviceId === localDeviceId) continue;
        const currentOffset = summary.remoteCursor?.[deviceId] ?? 0;
        const readResult = await deps.mirrorTransport.readFromOffset(deviceId, currentOffset);
        for (const entry of readResult.entries) {
          const normalized = normalizeRecord(entry.record);
          if (!normalized) {
            warnings.push("invalid_entry_shape");
            continue;
          }
          const validation = deps.eventLog.validateEventRecord(normalized);
          if (!validation.ok) {
            warnings.push(validation.error.message);
            continue;
          }
          const insertResult = await deps.eventLog.insertEventIfMissing(normalized);
          if (!insertResult.ok) {
            return toError(insertResult.error);
          }
          if (insertResult.value) imported += 1;
        }
        summary = {
          ...summary,
          remoteCursor: {
            ...(summary.remoteCursor ?? {}),
            [deviceId]: readResult.nextOffset,
          },
        };
      }

      return {
        status: "idle" as SyncStatus,
        uploaded,
        imported,
        warnings,
      };
    });

    if (!lockResult) {
      const error: SyncError = {
        code: "io_error",
        message: "mirror lock unavailable",
      };
      summary = { ...summary, status: "blocked", lastTickAt: now, lastError: error };
      return toBlocked("mirror_lock_unavailable", error);
    }

    if (lockResult.status === "error" || lockResult.status === "blocked") {
      summary = { ...summary, status: lockResult.status, lastTickAt: now, lastError: lockResult.error };
      return lockResult;
    }

    summary = {
      ...summary,
      status: "idle",
      lastTickAt: now,
      lastSuccessAt: now,
      lastError: undefined,
    };
    deps.diagnostics?.log("sync_tick_complete", {
      uploaded: lockResult.uploaded,
      imported: lockResult.imported,
      warnings: lockResult.warnings.length,
    });
    return lockResult;
  };

  return { tick, getStatus };
};
