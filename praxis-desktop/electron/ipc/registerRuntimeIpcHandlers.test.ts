import { expect, test } from "vitest";
import {
  BACKUP_GET_INVENTORY_PREVIEW,
  PERSISTENCE_GET_DB_INTEGRITY,
  PERSISTENCE_GET_DB_STATUS,
  PERSISTENCE_GET_PATHS,
  RESTORE_GET_PLAN_PREVIEW,
  RUNTIME_GET_STATUS,
  RUNTIME_PING,
  SYNC_GET_STATUS,
} from "../../shared/ipc/runtimeChannels";
import type {
  BackupInventoryPreview,
  DbIntegritySummary,
  DbStatus,
  IpcResult,
  PersistencePaths,
  RestorePlanPreview,
  RuntimeStatus,
  SyncSummary,
} from "../../shared/ipc/runtimeTypes";
import type { BackupResult } from "../../shared/backup/backupTypes";
import type { ReadOnlyResult } from "../../shared/persistence/readOnlyService";
import {
  registerRuntimeIpcHandlers,
  type IpcMainLike,
  type RuntimeIpcDeps,
} from "./registerRuntimeIpcHandlers";

type Handler = (event?: unknown, request?: unknown) => Promise<unknown> | unknown;

const okResult = <T>(value: T): ReadOnlyResult<T> => ({ ok: true, value });
const okBackupResult = <T>(value: T): BackupResult<T> => ({ ok: true, value });
const makeSyncSummary = (): SyncSummary => ({
  status: "idle",
  mirrorConfigured: true,
  localCursor: {},
  syncState: {},
  issues: [],
});

const errorResult = (message: string): ReadOnlyResult<never> => ({
  ok: false,
  error: { code: "test_error", message },
});

test("registers runtime IPC handlers", () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "x", dbPath: "y" }),
    getDbStatus: async () => okResult({ exists: false, path: "z" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  expect(handlers.has(RUNTIME_PING)).toBe(true);
  expect(handlers.has(RUNTIME_GET_STATUS)).toBe(true);
  expect(handlers.has(PERSISTENCE_GET_PATHS)).toBe(true);
  expect(handlers.has(PERSISTENCE_GET_DB_STATUS)).toBe(true);
  expect(handlers.has(PERSISTENCE_GET_DB_INTEGRITY)).toBe(true);
  expect(handlers.has(SYNC_GET_STATUS)).toBe(true);
  expect(handlers.has(BACKUP_GET_INVENTORY_PREVIEW)).toBe(true);
  expect(handlers.has(RESTORE_GET_PLAN_PREVIEW)).toBe(true);
});

test("runtime.ping returns version payload", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "1.2.3",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "x", dbPath: "y" }),
    getDbStatus: async () => okResult({ exists: false, path: "z" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(RUNTIME_PING);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<{ version: string }>;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.version).toBe("1.2.3");
  }
});

test("runtime.getStatus returns contract error on failure", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => {
      throw new Error("status failed");
    },
    getPersistencePaths: async () => okResult({ appDataRoot: "x", dbPath: "y" }),
    getDbStatus: async () => okResult({ exists: false, path: "z" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(RUNTIME_GET_STATUS);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<RuntimeStatus>;
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe("unknown_error");
    expect(result.error.message).toContain("status failed");
  }
});

test("persistence.getDbStatus passes through error results", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "x", dbPath: "y" }),
    getDbStatus: async () => errorResult("db missing"),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(PERSISTENCE_GET_DB_STATUS);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<DbStatus>;
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe("test_error");
    expect(result.error.message).toBe("db missing");
  }
});

test("persistence.getPaths returns read-only data", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "root", dbPath: "db" }),
    getDbStatus: async () => okResult({ exists: true, path: "db" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(PERSISTENCE_GET_PATHS);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<PersistencePaths>;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.appDataRoot).toBe("root");
    expect(result.data.dbPath).toBe("db");
  }
});

test("persistence.getDbIntegritySummary returns read-only data", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "root", dbPath: "db" }),
    getDbStatus: async () => okResult({ exists: true, path: "db" }),
    getDbIntegritySummary: async () => okResult({ ok: false, integrityCheck: "fail" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(PERSISTENCE_GET_DB_INTEGRITY);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<DbIntegritySummary>;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.ok).toBe(false);
    expect(result.data.integrityCheck).toBe("fail");
  }
});

test("sync.getStatus returns status summary", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "root", dbPath: "db" }),
    getDbStatus: async () => okResult({ exists: true, path: "db" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => ({
      ...makeSyncSummary(),
      localCursor: { maxRowId: 3 },
    }),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(SYNC_GET_STATUS);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<SyncSummary>;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.status).toBe("idle");
    expect(result.data.mirrorConfigured).toBe(true);
  }
});

test("backup.getInventoryPreview returns preview data", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "root", dbPath: "db" }),
    getDbStatus: async () => okResult({ exists: true, path: "db" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async () =>
      okBackupResult({
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(BACKUP_GET_INVENTORY_PREVIEW);
  expect(handler).toBeDefined();
  const result = (await handler?.()) as IpcResult<BackupInventoryPreview>;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.items[0].category).toBe("db");
  }
});

test("restore.getPlanPreview returns preview data", async () => {
  const handlers = new Map<string, Handler>();
  const ipcMain: IpcMainLike = {
    handle: (channel, handler) => {
      handlers.set(channel, handler as Handler);
    },
  };

  const deps: RuntimeIpcDeps = {
    getVersion: () => "0.0.0",
    getStatus: () => ({ ready: true }),
    getPersistencePaths: async () => okResult({ appDataRoot: "root", dbPath: "db" }),
    getDbStatus: async () => okResult({ exists: true, path: "db" }),
    getDbIntegritySummary: async () => okResult({ ok: true, integrityCheck: "ok" }),
    getSyncStatus: () => makeSyncSummary(),
    getBackupInventoryPreview: async () =>
      okBackupResult({
        items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
        warnings: [],
      }),
    getRestorePlanPreview: async (_zipPath: string) =>
      okBackupResult({
        zipPath: "C:\\backup.zip",
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: [],
      }),
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  const handler = handlers.get(RESTORE_GET_PLAN_PREVIEW);
  expect(handler).toBeDefined();
  const result = (await handler?.({}, { zipPath: "C:\\backup.zip" })) as IpcResult<RestorePlanPreview>;
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.data.conflicts).toEqual([]);
    expect(result.data.zipPath).toBe("C:\\backup.zip");
  }
});
