import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type {
  ReadOnlyDbStatus,
  ReadOnlyIntegritySummary,
  ReadOnlyPersistenceError,
  ReadOnlyPersistenceService,
  ReadOnlyResult,
  ReadOnlySnapshotMeta,
  ReadOnlySyncState,
} from "../../shared/persistence/readOnlyService";

type SqliteStatement = {
  get: () => unknown;
  all: () => unknown[];
};

type SqliteDb = {
  prepare: (sql: string) => SqliteStatement;
  close?: () => void;
};

type FsLike = {
  stat: (filePath: string) => Promise<{ isFile: () => boolean }>;
};

type OpenDbFn = (dbPath: string) => Promise<SqliteDb>;

type Deps = {
  fs: FsLike;
  openDb: OpenDbFn;
  getDbPath: () => string;
};

const DB_FILENAME = "eventlog.sqlite";

const defaultGetDbPath = () => path.join(app.getPath("userData"), DB_FILENAME);

const toError = (code: string, message: string, details?: Record<string, unknown>): ReadOnlyResult<never> => ({
  ok: false,
  error: { code, message, details },
});

const toOk = <T>(value: T): ReadOnlyResult<T> => ({ ok: true, value });

const resolveDbStatus = async (deps: Deps): Promise<ReadOnlyResult<ReadOnlyDbStatus>> => {
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

const readIntegritySummary = (db: SqliteDb): ReadOnlyIntegritySummary => {
  const issues: string[] = [];
  let integrityValue = "unknown";
  try {
    const rows = db.prepare("PRAGMA integrity_check;").all();
    const first = rows[0];
    const value = first ? Object.values(first)[0] : "unknown";
    integrityValue = typeof value === "string" ? value : String(value ?? "unknown");
  } catch {
    integrityValue = "failed";
  }

  const ok = integrityValue.toLowerCase() === "ok";
  if (!ok) issues.push(`integrity_check:${integrityValue}`);

  try {
    db.prepare("SELECT COUNT(*) as count FROM events").get();
  } catch {
    issues.push("events_table_missing");
  }
  try {
    db.prepare("SELECT COUNT(*) as count FROM snapshots").get();
  } catch {
    issues.push("snapshots_table_missing");
  }

  return { ok, issues };
};

const readSyncState = (db: SqliteDb): ReadOnlySyncState => {
  try {
    const row = db
      .prepare(
        `
          SELECT
            last_pulled_seq,
            last_pushed_seq,
            last_pull_ts,
            last_push_ts,
            last_uploaded_local_seq,
            remote_offsets
          FROM sync_state
          WHERE id = 1;
        `
      )
      .get() as Record<string, unknown> | undefined;

    if (!row) return {};

    const remoteOffsets =
      typeof row.remote_offsets === "string"
        ? safeParseJson<Record<string, { offset: number; identity?: string }>>(row.remote_offsets)
        : undefined;

    return {
      last_uploaded_local_seq:
        typeof row.last_uploaded_local_seq === "number" ? row.last_uploaded_local_seq : undefined,
      last_pulled_seq:
        typeof row.last_pulled_seq === "number" ? row.last_pulled_seq : undefined,
      last_pushed_seq:
        typeof row.last_pushed_seq === "number" ? row.last_pushed_seq : undefined,
      last_pull_ts: typeof row.last_pull_ts === "string" ? row.last_pull_ts : null,
      last_push_ts: typeof row.last_push_ts === "string" ? row.last_push_ts : null,
      remote_offsets: remoteOffsets,
    };
  } catch {
    return {};
  }
};

const readLatestSnapshotMeta = (db: SqliteDb): ReadOnlySnapshotMeta => {
  try {
    const row = db
      .prepare(
        `
          SELECT snapshot_id, last_event_rowid, created_at
          FROM snapshots
          ORDER BY snapshot_id DESC
          LIMIT 1;
        `
      )
      .get() as Record<string, unknown> | undefined;

    if (!row) return { exists: false };

    return {
      exists: true,
      snapshotId: Number(row.snapshot_id ?? 0),
      lastEventRowId: Number(row.last_event_rowid ?? 0),
      createdAt: String(row.created_at ?? ""),
    };
  } catch {
    return { exists: false };
  }
};

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

export const createSqliteReadOnly = (overrides?: Partial<Deps>): ReadOnlyPersistenceService => {
  const deps: Deps = {
    fs,
    openDb: openReadOnlyDb,
    getDbPath: defaultGetDbPath,
    ...overrides,
  };

  const getDbStatus = async (): Promise<ReadOnlyResult<ReadOnlyDbStatus>> => resolveDbStatus(deps);

  const getIntegritySummary = async (): Promise<ReadOnlyResult<ReadOnlyIntegritySummary>> => {
    const status = await resolveDbStatus(deps);
    if (!status.ok) return status;
    if (!status.value.exists) return toOk({ ok: false, issues: ["db_missing"] });

    try {
      const db = await deps.openDb(status.value.path);
      try {
        return toOk(readIntegritySummary(db));
      } finally {
        db.close?.();
      }
    } catch (error) {
      const err = error as Error;
      return toError("driver_unavailable", "SQLite read-only driver unavailable", {
        name: err?.name ?? "Error",
      });
    }
  };

  const getSyncState = async (): Promise<ReadOnlyResult<ReadOnlySyncState>> => {
    const status = await resolveDbStatus(deps);
    if (!status.ok) return status;
    if (!status.value.exists) return toOk({});

    try {
      const db = await deps.openDb(status.value.path);
      try {
        return toOk(readSyncState(db));
      } finally {
        db.close?.();
      }
    } catch (error) {
      const err = error as Error;
      return toError("driver_unavailable", "SQLite read-only driver unavailable", {
        name: err?.name ?? "Error",
      });
    }
  };

  const getLatestSnapshotMeta = async (): Promise<ReadOnlyResult<ReadOnlySnapshotMeta>> => {
    const status = await resolveDbStatus(deps);
    if (!status.ok) return status;
    if (!status.value.exists) return toOk({ exists: false });

    try {
      const db = await deps.openDb(status.value.path);
      try {
        return toOk(readLatestSnapshotMeta(db));
      } finally {
        db.close?.();
      }
    } catch (error) {
      const err = error as Error;
      return toError("driver_unavailable", "SQLite read-only driver unavailable", {
        name: err?.name ?? "Error",
      });
    }
  };

  return {
    getDbStatus,
    getIntegritySummary,
    getSyncState,
    getLatestSnapshotMeta,
  };
};
