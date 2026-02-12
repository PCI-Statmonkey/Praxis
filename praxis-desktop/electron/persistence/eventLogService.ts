import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type {
  EventLogResult,
  EventRecord,
  EventLogValidationResult,
} from "../../shared/persistence/eventLogContract";
import { validateEventRecord as validateRecord } from "../../shared/persistence/eventLogContract";

type SqliteStatement = {
  get: (params?: unknown) => unknown;
  all: (params?: unknown) => unknown[];
};

type SqliteDb = {
  prepare: (sql: string) => SqliteStatement;
  close?: () => void;
};

type FsLike = {
  stat: (filePath: string) => Promise<{ isFile: () => boolean }>;
};

type OpenDbFn = (dbPath: string) => Promise<SqliteDb>;

type EventLogWriter = {
  appendEvent: (record: EventRecord) => Promise<EventRecord>;
  insertEventIfMissing: (record: EventRecord) => Promise<boolean>;
};

type Deps = {
  fs: FsLike;
  openDb: OpenDbFn;
  getDbPath: () => string;
  writer?: EventLogWriter;
};

export type LocalEventCursor = {
  maxRowId: number;
  lastSyncRowId?: number;
};

export type EventLogService = {
  getLocalEventCursor: () => Promise<EventLogResult<LocalEventCursor>>;
  readEventsAfterRowId: (
    rowId: number,
    limit: number
  ) => Promise<EventLogResult<EventRecord[]>>;
  validateEventRecord: (record: EventRecord) => EventLogValidationResult;
  appendEvent: (record: EventRecord) => Promise<EventLogResult<EventRecord>>;
  insertEventIfMissing: (record: EventRecord) => Promise<EventLogResult<boolean>>;
};

const DB_FILENAME = "eventlog.sqlite";
const MAX_READ_LIMIT = 500;

const defaultGetDbPath = () => path.join(app.getPath("userData"), DB_FILENAME);

const toOk = <T>(value: T): EventLogResult<T> => ({ ok: true, value });

const toError = (
  code: EventLogResult<never>["error"]["code"],
  message: string,
  details?: Record<string, unknown>
): EventLogResult<never> => ({
  ok: false,
  error: { code, message, details },
});

const safeParseJson = <T>(value: string): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
};

const openReadOnlyDb: OpenDbFn = async (dbPath: string) => {
  const readOnlyUri = `${pathToFileURL(dbPath).href}?mode=ro`;
  try {
    const mod = await import("node:sqlite");
    if ("DatabaseSync" in mod) {
      const db = new mod.DatabaseSync(readOnlyUri);
      return db as unknown as SqliteDb;
    }
  } catch {
    // fallthrough
  }

  try {
    const mod = await import("better-sqlite3");
    const Database = (mod as { default?: new (path: string, options?: Record<string, unknown>) => SqliteDb })
      .default ?? (mod as any);
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    return db as SqliteDb;
  } catch {
    throw new Error("sqlite_driver_unavailable");
  }
};

const resolveDbStatus = async (
  deps: Deps
): Promise<EventLogResult<{ exists: boolean; path: string }>> => {
  const dbPath = deps.getDbPath();
  try {
    const stat = await deps.fs.stat(dbPath);
    return toOk({ exists: stat.isFile(), path: dbPath });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return toOk({ exists: false, path: dbPath });
    }
    return toError("io_error", "Failed to stat DB path", { path: dbPath });
  }
};

const mapRowToEvent = (row: Record<string, unknown>): EventRecord => ({
  row_id: typeof row.row_id === "number" ? row.row_id : Number(row.row_id ?? 0),
  event_id: String(row.event_id ?? ""),
  device_id: String(row.device_id ?? ""),
  local_seq: Number(row.local_seq ?? 0),
  ts: String(row.ts ?? ""),
  type: row.type as EventRecord["type"],
  item_id: String(row.item_id ?? ""),
  payload: safeParseJson(String(row.payload ?? "{}")),
  prev_hash: row.prev_hash ? String(row.prev_hash) : null,
  hash: row.hash ? String(row.hash) : null,
});

export const createEventLogService = (overrides?: Partial<Deps>): EventLogService => {
  const deps: Deps = {
    fs,
    openDb: openReadOnlyDb,
    getDbPath: defaultGetDbPath,
    ...overrides,
  };

  const getLocalEventCursor = async (): Promise<EventLogResult<LocalEventCursor>> => {
    const status = await resolveDbStatus(deps);
    if (!status.ok) return status;
    if (!status.value.exists) return toOk({ maxRowId: 0 });

    try {
      const db = await deps.openDb(status.value.path);
      try {
        const maxRow = db
          .prepare("SELECT MAX(rowid) as max_rowid FROM events")
          .get() as { max_rowid?: number | null };
        let lastSyncRowId: number | undefined;
        try {
          const snapRow = db
            .prepare("SELECT MAX(last_event_rowid) as last_event_rowid FROM snapshots")
            .get() as { last_event_rowid?: number | null };
          if (typeof snapRow?.last_event_rowid === "number") {
            lastSyncRowId = snapRow.last_event_rowid;
          }
        } catch {
          lastSyncRowId = undefined;
        }
        return toOk({
          maxRowId: Number(maxRow?.max_rowid ?? 0),
          lastSyncRowId,
        });
      } finally {
        db.close?.();
      }
    } catch (error) {
      const err = error as Error;
      return toError("io_error", "Failed to read event cursor", { name: err?.name ?? "Error" });
    }
  };

  const readEventsAfterRowId = async (
    rowId: number,
    limit: number
  ): Promise<EventLogResult<EventRecord[]>> => {
    if (!Number.isFinite(rowId) || rowId < 0) {
      return toError("invalid_request", "rowId must be a non-negative number");
    }
    if (!Number.isFinite(limit) || limit <= 0 || limit > MAX_READ_LIMIT) {
      return toError("invalid_request", `limit must be between 1 and ${MAX_READ_LIMIT}`);
    }

    const status = await resolveDbStatus(deps);
    if (!status.ok) return status;
    if (!status.value.exists) return toOk([]);

    try {
      const db = await deps.openDb(status.value.path);
      try {
        const rows = db
          .prepare(
            `
              SELECT
                rowid as row_id,
                event_id,
                device_id,
                local_seq,
                ts,
                type,
                item_id,
                payload,
                prev_hash,
                hash
              FROM events
              WHERE rowid > ?
              ORDER BY rowid ASC
              LIMIT ?;
            `
          )
          .all([rowId, limit]) as Array<Record<string, unknown>>;
        return toOk(rows.map(mapRowToEvent));
      } finally {
        db.close?.();
      }
    } catch (error) {
      const err = error as Error;
      return toError("io_error", "Failed to read events", { name: err?.name ?? "Error" });
    }
  };

  const validateEventRecord = (record: EventRecord): EventLogValidationResult =>
    validateRecord(record);

  const appendEvent = async (record: EventRecord): Promise<EventLogResult<EventRecord>> => {
    if (!deps.writer?.appendEvent) {
      return toError("not_implemented", "appendEvent not wired");
    }
    try {
      const value = await deps.writer.appendEvent(record);
      return toOk(value);
    } catch (error) {
      const err = error as Error;
      return toError("unknown_error", "appendEvent failed", { name: err?.name ?? "Error" });
    }
  };

  const insertEventIfMissing = async (record: EventRecord): Promise<EventLogResult<boolean>> => {
    if (!deps.writer?.insertEventIfMissing) {
      return toError("not_implemented", "insertEventIfMissing not wired");
    }
    try {
      const value = await deps.writer.insertEventIfMissing(record);
      return toOk(value);
    } catch (error) {
      const err = error as Error;
      return toError("unknown_error", "insertEventIfMissing failed", { name: err?.name ?? "Error" });
    }
  };

  return {
    getLocalEventCursor,
    readEventsAfterRowId,
    validateEventRecord,
    appendEvent,
    insertEventIfMissing,
  };
};
