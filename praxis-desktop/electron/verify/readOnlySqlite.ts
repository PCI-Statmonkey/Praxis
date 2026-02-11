import { promises as fs } from "fs";

export const readDbSchemaVersion = async (dbPath: string) => {
  try {
    const stat = await fs.stat(dbPath);
    if (!stat.isFile()) {
      return { ok: false, error: "db_not_file" };
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") return { ok: false, error: "db_missing" };
    return { ok: false, error: `db_stat_failed:${err?.message ?? String(error)}` };
  }

  const errors: string[] = [];

  try {
    const mod = await import("node:sqlite");
    const DatabaseSync = (mod as any).DatabaseSync as
      | (new (path: string, options?: unknown) => any)
      | undefined;
    if (DatabaseSync) {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      try {
        const row = db
          .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
          .get() as { value?: string } | undefined;
        const value = row?.value ? Number(row.value) : NaN;
        if (!Number.isFinite(value)) {
          return { ok: false, driver: "node:sqlite", error: "schema_version_missing" };
        }
        return { ok: true, schemaVersion: value, driver: "node:sqlite" };
      } finally {
        if (typeof db.close === "function") db.close();
      }
    }
  } catch (error) {
    errors.push(`node:sqlite:${(error as Error).message ?? String(error)}`);
  }

  try {
    const mod = await import("better-sqlite3");
    const Database = ((mod as any).default ?? mod) as
      | (new (path: string, options?: unknown) => any)
      | undefined;
    if (Database) {
      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const row = db
          .prepare("SELECT value FROM meta WHERE key = 'schema_version'")
          .get() as { value?: string } | undefined;
        const value = row?.value ? Number(row.value) : NaN;
        if (!Number.isFinite(value)) {
          return { ok: false, driver: "better-sqlite3", error: "schema_version_missing" };
        }
        return { ok: true, schemaVersion: value, driver: "better-sqlite3" };
      } finally {
        if (typeof db.close === "function") db.close();
      }
    }
  } catch (error) {
    errors.push(`better-sqlite3:${(error as Error).message ?? String(error)}`);
  }

  return {
    ok: false,
    error: errors.length > 0 ? `no_sqlite_driver:${errors.join(" | ")}` : "no_sqlite_driver",
  };
};
