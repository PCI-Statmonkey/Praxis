import { expect, test } from "vitest";
import fs from "fs";
import path from "path";
import { RUNTIME_CHANNELS } from "./runtimeChannels";
import { registerRuntimeIpcHandlers } from "../../electron/ipc/registerRuntimeIpcHandlers";

test("IPC contract lists all runtime channels", () => {
  const docPath = path.resolve(process.cwd(), "docs", "STAGE_10_IPC_CONTRACT.md");
  const contents = fs.readFileSync(docPath, "utf8");
  for (const channel of Object.values(RUNTIME_CHANNELS)) {
    expect(contents).toContain(channel);
  }
});

test("IPC registrar registers only known runtime channels", () => {
  const handlers = new Map<string, unknown>();
  const ipcMain = {
    handle: (channel: string, handler: unknown) => {
      handlers.set(channel, handler);
    },
  };

  registerRuntimeIpcHandlers(ipcMain, {
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
      value: {
        items: [],
        warnings: [],
      },
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
  });

  const registered = Array.from(handlers.keys()).sort();
  const known = new Set(Object.values(RUNTIME_CHANNELS));

  for (const channel of registered) {
    expect(known.has(channel)).toBe(true);
  }
});
