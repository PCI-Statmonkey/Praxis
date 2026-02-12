import { describe, expect, test, vi } from "vitest";
import fs from "fs";
import {
  BACKUP_GET_INVENTORY_PREVIEW,
  MISSIONS_LIST,
  PERSISTENCE_GET_DB_STATUS,
  RESTORE_GET_PLAN_PREVIEW,
  RUNTIME_GET_STATUS,
  RUNTIME_PING,
  SYNC_GET_MIRROR_STATUS,
  SYNC_GET_STATUS,
  RUNTIME_CHANNELS,
} from "../../shared/ipc/runtimeChannels";
import { registerRuntimeIpcHandlers } from "./registerRuntimeIpcHandlers";

const makeDeps = () => ({
  getVersion: () => "0.0.0",
  getStatus: () => ({ ready: true }),
  getPersistencePaths: async () => ({ ok: true, value: { appDataRoot: "x", dbPath: "y" } }),
  getDbStatus: async () => ({ ok: true, value: { exists: false, path: "z" } }),
  getDbIntegritySummary: async () => ({ ok: true, value: { ok: true } }),
  getSyncStatus: () => ({
    status: "idle",
    mirrorConfigured: false,
    localCursor: {},
    syncState: {},
    issues: ["mirror root not configured"],
  }),
  getBackupInventoryPreview: async () => ({
    ok: true,
    value: { items: [], warnings: [] },
  }),
  getRestorePlanPreview: async () => ({
    ok: true,
    value: {
      zipPath: "C:\\backup.zip",
      conflicts: [],
      willOverwriteCount: 0,
      missingCount: 0,
      warnings: [],
    },
  }),
  missionsList: async () => [],
  missionsGet: async (id: string) => ({
    id,
    title: "Mission",
    status: "active",
    createdAt: "2026-02-12T00:00:00.000Z",
    updatedAt: "2026-02-12T00:00:00.000Z",
  }),
  missionsCreate: async () => ({
    id: "mission-1",
    title: "Mission",
    status: "active",
    createdAt: "2026-02-12T00:00:00.000Z",
    updatedAt: "2026-02-12T00:00:00.000Z",
  }),
  missionsUpdate: async () => ({
    id: "mission-1",
    title: "Mission",
    status: "active",
    createdAt: "2026-02-12T00:00:00.000Z",
    updatedAt: "2026-02-12T00:00:00.000Z",
  }),
  missionsArchive: async () => ({
    id: "mission-1",
    title: "Mission",
    status: "archived",
    createdAt: "2026-02-12T00:00:00.000Z",
    updatedAt: "2026-02-12T00:00:00.000Z",
  }),
});

describe("runtime IPC wiring", () => {
  test("registers expected runtime channels", () => {
    const handlers = new Map<string, unknown>();
    const ipcMain = {
      handle: (channel: string, handler: unknown) => {
        handlers.set(channel, handler);
      },
    };

    registerRuntimeIpcHandlers(ipcMain, makeDeps());

    const registered = Array.from(handlers.keys()).sort();
    const expected = Object.values(RUNTIME_CHANNELS)
      .filter((channel) => channel !== SYNC_GET_MIRROR_STATUS)
      .sort();

    expect(registered).toEqual(expected);
  });

  test("handlers are callable without side effects", async () => {
    const handlers = new Map<string, (event?: unknown, request?: unknown) => unknown>();
    const ipcMain = {
      handle: (channel: string, handler: unknown) => {
        handlers.set(channel, handler as (event?: unknown, request?: unknown) => unknown);
      },
    };

    registerRuntimeIpcHandlers(ipcMain, makeDeps());

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const logSpy = vi.spyOn(console, "log");
    const warnSpy = vi.spyOn(console, "warn");
    const errorSpy = vi.spyOn(console, "error");
    const mkdirSpy = vi.spyOn(fs.promises, "mkdir");
    const writeFileSpy = vi.spyOn(fs.promises, "writeFile");
    const appendFileSpy = vi.spyOn(fs.promises, "appendFile");

    try {
      const ping = await handlers.get(RUNTIME_PING)?.();
      const status = await handlers.get(RUNTIME_GET_STATUS)?.();
      const dbStatus = await handlers.get(PERSISTENCE_GET_DB_STATUS)?.();
      const syncStatus = await handlers.get(SYNC_GET_STATUS)?.();
      const backup = await handlers.get(BACKUP_GET_INVENTORY_PREVIEW)?.();
      const restore = await handlers.get(RESTORE_GET_PLAN_PREVIEW)?.({}, { zipPath: "C:\\backup.zip" });
      const missions = await handlers.get(MISSIONS_LIST)?.();

      expect(ping).toEqual({ ok: true, data: { version: "0.0.0" } });
      expect(status).toEqual({ ok: true, data: { ready: true } });
      expect(dbStatus).toEqual({ ok: true, data: { exists: false, path: "z" } });
      expect(syncStatus).toEqual({
        ok: true,
        data: {
          status: "idle",
          mirrorConfigured: false,
          localCursor: {},
          syncState: {},
          issues: ["mirror root not configured"],
        },
      });
      expect(backup).toEqual({ ok: true, data: { items: [], warnings: [] } });
      expect(restore).toEqual({
        ok: true,
        data: {
          zipPath: "C:\\backup.zip",
          conflicts: [],
          willOverwriteCount: 0,
          missingCount: 0,
          warnings: [],
        },
      });
      expect(missions).toEqual({ ok: true, data: [] });

      expect(setTimeoutSpy).not.toHaveBeenCalled();
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(mkdirSpy).not.toHaveBeenCalled();
      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(appendFileSpy).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      setIntervalSpy.mockRestore();
      logSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeFileSpy.mockRestore();
      appendFileSpy.mockRestore();
    }
  });
});
