import { expect, test } from "vitest";
import { createSqliteReadOnly } from "./sqliteReadOnly";

const makeStat = (exists: boolean) => async () => ({
  isFile: () => exists,
});

test("sqliteReadOnly returns safe defaults when DB missing", async () => {
  let openCalled = false;
  const service = createSqliteReadOnly({
    getDbPath: () => "C:\\missing\\eventlog.sqlite",
    fs: { stat: async () => { const err = new Error("missing") as NodeJS.ErrnoException; err.code = "ENOENT"; throw err; } },
    openDb: async () => {
      openCalled = true;
      throw new Error("should not open");
    },
  });

  const status = await service.getDbStatus();
  expect(status.ok).toBe(true);
  if (status.ok) {
    expect(status.value.exists).toBe(false);
  }

  const integrity = await service.getIntegritySummary();
  expect(integrity.ok).toBe(true);
  if (integrity.ok) {
    expect(integrity.value.ok).toBe(false);
    expect(integrity.value.issues).toContain("db_missing");
  }

  const syncState = await service.getSyncState();
  expect(syncState.ok).toBe(true);
  if (syncState.ok) {
    expect(syncState.value).toEqual({});
  }

  const snapshot = await service.getLatestSnapshotMeta();
  expect(snapshot.ok).toBe(true);
  if (snapshot.ok) {
    expect(snapshot.value.exists).toBe(false);
  }

  expect(openCalled).toBe(false);
});

test("sqliteReadOnly reads data when DB exists without creating new files", async () => {
  const calls: string[] = [];
  const db = {
    prepare: (sql: string) => {
      calls.push(sql.trim());
      if (sql.includes("PRAGMA integrity_check")) {
        return {
          all: () => [{ integrity_check: "ok" }],
          get: () => ({ integrity_check: "ok" }),
        };
      }
      if (sql.includes("FROM events")) {
        return { all: () => [], get: () => ({ count: 2 }) };
      }
      if (sql.includes("FROM snapshots") && sql.includes("ORDER BY")) {
        return {
          all: () => [],
          get: () => ({ snapshot_id: 5, last_event_rowid: 10, created_at: "2026-01-01T00:00:00.000Z" }),
        };
      }
      if (sql.includes("FROM sync_state")) {
        return {
          all: () => [],
          get: () => ({
            last_uploaded_local_seq: 9,
            last_pulled_seq: 7,
            last_pushed_seq: 8,
            last_pull_ts: "2026-01-01T00:00:00.000Z",
            last_push_ts: "2026-01-01T01:00:00.000Z",
            remote_offsets: "{\"dev-a\":{\"offset\":12}}",
          }),
        };
      }
      return { all: () => [], get: () => ({ count: 0 }) };
    },
    close: () => {
      calls.push("close");
    },
  };

  const service = createSqliteReadOnly({
    getDbPath: () => "C:\\exists\\eventlog.sqlite",
    fs: { stat: makeStat(true) },
    openDb: async () => db,
  });

  const integrity = await service.getIntegritySummary();
  expect(integrity.ok).toBe(true);
  if (integrity.ok) {
    expect(integrity.value.ok).toBe(true);
    expect(integrity.value.issues).toEqual([]);
  }

  const syncState = await service.getSyncState();
  expect(syncState.ok).toBe(true);
  if (syncState.ok) {
    expect(syncState.value.last_uploaded_local_seq).toBe(9);
    expect(syncState.value.remote_offsets?.["dev-a"].offset).toBe(12);
  }

  const snapshot = await service.getLatestSnapshotMeta();
  expect(snapshot.ok).toBe(true);
  if (snapshot.ok) {
    expect(snapshot.value.exists).toBe(true);
    expect(snapshot.value.snapshotId).toBe(5);
  }

  expect(calls).toContain("close");
});
