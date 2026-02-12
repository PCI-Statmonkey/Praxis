import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { Mission, MissionCreateInput, MissionUpdatePatch } from "../../shared/missions/missionTypes";

type SqliteStatement = {
  run: (params?: unknown) => { changes?: number };
  get: (params?: unknown) => unknown;
  all: (params?: unknown) => unknown[];
};

type SqliteDb = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
  close?: () => void;
};

type FsLike = {
  stat: (filePath: string) => Promise<{ isFile: () => boolean }>;
};

type OpenDbFn = (dbPath: string) => Promise<SqliteDb>;

type Deps = {
  fs: FsLike;
  openReadOnlyDb: OpenDbFn;
  openWriteDb: OpenDbFn;
  getDbPath: () => string;
};

export type MissionStore = {
  list: (includeArchived?: boolean) => Promise<Mission[]>;
  get: (id: string) => Promise<Mission | null>;
  create: (mission: Mission) => Promise<Mission>;
  update: (id: string, patch: MissionUpdatePatch & { updatedAt: string }) => Promise<Mission | null>;
  archive: (id: string, updatedAt: string) => Promise<Mission | null>;
  unarchive: (id: string, updatedAt: string) => Promise<Mission | null>;
};

const DB_FILENAME = "missions.sqlite";

const defaultGetDbPath = () => path.join(app.getPath("userData"), DB_FILENAME);

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

const openWriteDb: OpenDbFn = async (dbPath: string) => {
  try {
    const mod = await import("node:sqlite");
    if ("DatabaseSync" in mod) {
      const db = new mod.DatabaseSync(dbPath);
      return db as unknown as SqliteDb;
    }
  } catch {
    // fallthrough
  }

  const mod = await import("better-sqlite3");
  const Database = (mod as { default?: new (path: string, options?: Record<string, unknown>) => SqliteDb })
    .default ?? (mod as any);
  const db = new Database(dbPath);
  return db as SqliteDb;
};

const ensureMissionsTable = (db: SqliteDb) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      due_at TEXT,
      tags TEXT
    );
  `);
};

const mapRowToMission = (row: Record<string, unknown>): Mission => ({
  id: String(row.id ?? ""),
  title: String(row.title ?? ""),
  description: row.description ? String(row.description) : undefined,
  status: (row.status as Mission["status"]) ?? "active",
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? ""),
  dueAt: row.due_at ? String(row.due_at) : null,
  tags: typeof row.tags === "string" ? safeParseJson<string[]>(row.tags) : null,
});

const safeParseJson = <T>(value: string): T | null => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const resolveDbStatus = async (deps: Deps) => {
  const dbPath = deps.getDbPath();
  try {
    const stat = await deps.fs.stat(dbPath);
    return stat.isFile();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") return false;
    throw error;
  }
};

export const createMissionStore = (overrides?: Partial<Deps>): MissionStore => {
  const deps: Deps = {
    fs,
    openReadOnlyDb,
    openWriteDb,
    getDbPath: defaultGetDbPath,
    ...overrides,
  };

  const list = async (includeArchived = false): Promise<Mission[]> => {
    const exists = await resolveDbStatus(deps);
    if (!exists) return [];

    const db = await deps.openReadOnlyDb(deps.getDbPath());
    try {
      const sql = includeArchived
        ? "SELECT * FROM missions ORDER BY created_at DESC"
        : "SELECT * FROM missions WHERE status != 'archived' ORDER BY created_at DESC";
      const rows = db.prepare(sql).all() as Array<Record<string, unknown>>;
      return rows.map(mapRowToMission);
    } catch (error) {
      const err = error as Error;
      if (err?.message?.includes("no such table")) return [];
      return [];
    } finally {
      db.close?.();
    }
  };

  const get = async (id: string): Promise<Mission | null> => {
    const exists = await resolveDbStatus(deps);
    if (!exists) return null;

    const db = await deps.openReadOnlyDb(deps.getDbPath());
    try {
      const row = db.prepare("SELECT * FROM missions WHERE id = ?").get([id]) as
        | Record<string, unknown>
        | undefined;
      return row ? mapRowToMission(row) : null;
    } catch (error) {
      const err = error as Error;
      if (err?.message?.includes("no such table")) return null;
      return null;
    } finally {
      db.close?.();
    }
  };

  const create = async (mission: Mission): Promise<Mission> => {
    const db = await deps.openWriteDb(deps.getDbPath());
    try {
      ensureMissionsTable(db);
      db.prepare(
        `
          INSERT INTO missions (id, title, description, status, created_at, updated_at, due_at, tags)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `
      ).run([
        mission.id,
        mission.title,
        mission.description ?? null,
        mission.status,
        mission.createdAt,
        mission.updatedAt,
        mission.dueAt ?? null,
        mission.tags ? JSON.stringify(mission.tags) : null,
      ]);
      return mission;
    } finally {
      db.close?.();
    }
  };

  const update = async (
    id: string,
    patch: MissionUpdatePatch & { updatedAt: string }
  ): Promise<Mission | null> => {
    const db = await deps.openWriteDb(deps.getDbPath());
    try {
      ensureMissionsTable(db);
      const existing = db.prepare("SELECT * FROM missions WHERE id = ?").get([id]) as
        | Record<string, unknown>
        | undefined;
      if (!existing) return null;

      const next: Mission = {
        ...mapRowToMission(existing),
        title: patch.title ?? String(existing.title ?? ""),
        description: patch.description ?? (existing.description ? String(existing.description) : undefined),
        dueAt: patch.dueAt === undefined ? (existing.due_at ? String(existing.due_at) : null) : patch.dueAt,
        tags:
          patch.tags === undefined
            ? (typeof existing.tags === "string" ? safeParseJson<string[]>(existing.tags) : null)
            : patch.tags,
        updatedAt: patch.updatedAt,
      };

      db.prepare(
        `
          UPDATE missions
          SET title = ?, description = ?, status = ?, updated_at = ?, due_at = ?, tags = ?
          WHERE id = ?;
        `
      ).run([
        next.title,
        next.description ?? null,
        next.status,
        next.updatedAt,
        next.dueAt ?? null,
        next.tags ? JSON.stringify(next.tags) : null,
        id,
      ]);
      return next;
    } finally {
      db.close?.();
    }
  };

  const archive = async (id: string, updatedAt: string): Promise<Mission | null> => {
    const db = await deps.openWriteDb(deps.getDbPath());
    try {
      ensureMissionsTable(db);
      const row = db.prepare("SELECT * FROM missions WHERE id = ?").get([id]) as
        | Record<string, unknown>
        | undefined;
      if (!row) return null;
      db.prepare("UPDATE missions SET status = 'archived', updated_at = ? WHERE id = ?").run([
        updatedAt,
        id,
      ]);
      return { ...mapRowToMission(row), status: "archived", updatedAt };
    } finally {
      db.close?.();
    }
  };

  const unarchive = async (id: string, updatedAt: string): Promise<Mission | null> => {
    const db = await deps.openWriteDb(deps.getDbPath());
    try {
      ensureMissionsTable(db);
      const row = db.prepare("SELECT * FROM missions WHERE id = ?").get([id]) as
        | Record<string, unknown>
        | undefined;
      if (!row) return null;
      db.prepare("UPDATE missions SET status = 'active', updated_at = ? WHERE id = ?").run([
        updatedAt,
        id,
      ]);
      return { ...mapRowToMission(row), status: "active", updatedAt };
    } finally {
      db.close?.();
    }
  };

  return { list, get, create, update, archive, unarchive };
};
