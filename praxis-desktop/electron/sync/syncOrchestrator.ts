import type { EventRecord, EventLogValidationResult } from "../../shared/persistence/eventLogContract";
import type { MirrorTransport } from "./mirrorTransport";
import type { SyncError, SyncSummary, SyncStatus } from "../../shared/sync/syncTypes";

type EventLogRead = {
  getLocalCursor: () => Promise<{
    maxRowId?: number;
    lastUploadedRowId?: number;
    lastImportedRowId?: number;
  }>;
  readEventsAfterRowId: (rowId: number, limit: number) => Promise<EventRecord[]>;
};

type EventLogWrite = {
  insertEventIfMissing: (record: EventRecord) => Promise<boolean>;
};

type MirrorLock = {
  withMirrorLock: <T>(fn: () => Promise<T>) => Promise<T | null>;
};

type Clock = {
  now: () => number;
};

export type SyncOrchestratorDeps = {
  getMirrorRoot: () => string | null;
  lock: MirrorLock;
  mirrorTransport: MirrorTransport;
  eventLogRead: EventLogRead;
  eventLogWrite: EventLogWrite;
  validateEventRecord: (record: EventRecord) => EventLogValidationResult;
  clock: Clock;
};

export type SyncTickResult = {
  status: SyncStatus;
  uploaded: number;
  imported: number;
  warnings: string[];
  error?: SyncError;
};

export type SyncOrchestrator = {
  tick: () => Promise<SyncTickResult>;
  getStatus: () => Promise<SyncSummary>;
};

const MAX_BATCH_SIZE = 500;

const toError = (error: SyncError): SyncTickResult => ({
  status: "error",
  uploaded: 0,
  imported: 0,
  warnings: [],
  error,
});

const normalizeRecord = (record: Record<string, unknown>): EventRecord => ({
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
});

const parseLine = (line: string): EventRecord | null => {
  try {
    const record = JSON.parse(line) as Record<string, unknown>;
    return normalizeRecord(record);
  } catch {
    return null;
  }
};

export const createSyncOrchestrator = (deps: SyncOrchestratorDeps): SyncOrchestrator => {
  const getStatus = async (): Promise<SyncSummary> => {
    const mirrorRoot = deps.getMirrorRoot();
    const mirrorConfigured = Boolean(mirrorRoot);
    const issues: string[] = [];
    if (!mirrorConfigured) {
      issues.push("mirror root not configured");
    }

    let localCursor: { maxRowId?: number } = {};
    let syncState: { lastUploadedRowId?: number; lastImportedRowId?: number } = {};
    try {
      const cursor = await deps.eventLogRead.getLocalCursor();
      localCursor = { maxRowId: cursor.maxRowId };
      syncState = {
        lastUploadedRowId: cursor.lastUploadedRowId,
        lastImportedRowId: cursor.lastImportedRowId,
      };
    } catch {
      issues.push("local cursor unavailable");
    }

    const status: SyncStatus = issues.length > 0 ? "blocked" : "idle";

    return {
      status,
      mirrorConfigured,
      mirrorRoot: mirrorRoot ?? undefined,
      localCursor,
      syncState,
      issues,
    };
  };

  const tick = async (): Promise<SyncTickResult> => {
    if (!deps.getMirrorRoot()) {
      return {
        status: "blocked",
        uploaded: 0,
        imported: 0,
        warnings: ["mirror root not configured"],
      };
    }

    const locked = await deps.lock.withMirrorLock(async () => {
      let uploaded = 0;
      let imported = 0;
      const warnings: string[] = [];

      const cursor = await deps.eventLogRead.getLocalCursor();
      const lastUploaded = cursor.lastUploadedRowId ?? 0;
      const maxRowId = cursor.maxRowId ?? 0;

      if (maxRowId > lastUploaded) {
        const events = await deps.eventLogRead.readEventsAfterRowId(lastUploaded, MAX_BATCH_SIZE);
        if (events.length > 0) {
          const lines = events.map((event) => JSON.stringify(event));
          const appendResult = await deps.mirrorTransport.appendLines("local", lines);
          uploaded += appendResult.appended;
        }
      }

      const deviceLogs = await deps.mirrorTransport.listDeviceLogs();
      for (const deviceLog of deviceLogs) {
        const readResult = await deps.mirrorTransport.readFromOffset(deviceLog, 0);
        for (const line of readResult.lines) {
          const record = parseLine(line);
          if (!record) {
            warnings.push("invalid json line");
            continue;
          }
          const validation = deps.validateEventRecord(record);
          if (!validation.ok) {
            warnings.push(validation.error.message);
            continue;
          }
          const inserted = await deps.eventLogWrite.insertEventIfMissing(record);
          if (inserted) imported += 1;
        }
      }

      return {
        status: "idle" as SyncStatus,
        uploaded,
        imported,
        warnings,
      };
    });

    if (!locked) {
      return {
        status: "blocked",
        uploaded: 0,
        imported: 0,
        warnings: ["mirror lock unavailable"],
      };
    }

    if (locked.status === "error") return locked;

    return locked;
  };

  return { tick, getStatus };
};
