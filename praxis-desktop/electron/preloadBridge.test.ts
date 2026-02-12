import { describe, expect, test, vi } from "vitest";

const exposeInMainWorld = vi.fn();
const invoke = vi.fn(async () => ({ ok: true }));

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke },
}));

describe("preload bridge", () => {
  test("exposes praxis namespace with expected methods", async () => {
    await import("./preload");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    const [namespace, api] = exposeInMainWorld.mock.calls[0] ?? [];
    expect(namespace).toBe("praxis");
    expect(api).toBeDefined();

    const keys = Object.keys(api as Record<string, unknown>).sort();
    expect(keys).toEqual(
      [
        "backupGetInventoryPreview",
        "getStatus",
        "persistenceGetDbIntegritySummary",
        "persistenceGetDbStatus",
        "persistenceGetPaths",
        "ping",
        "restoreGetPlanPreview",
        "syncGetStatus",
      ].sort()
    );
  });

  test("forwards invoke calls with correct channel + payload", async () => {
    vi.resetModules();
    exposeInMainWorld.mockClear();
    invoke.mockClear();

    const mod = await import("./preload");
    const api = mod.createPraxisApi();

    await api.ping();
    expect(invoke).toHaveBeenCalledWith("praxis:runtime:ping", undefined);

    await api.restoreGetPlanPreview("C:\\backup.zip");
    expect(invoke).toHaveBeenCalledWith("praxis:runtime:restore.getPlanPreview", {
      zipPath: "C:\\backup.zip",
    });
  });

  test("blocks unknown channels", async () => {
    vi.resetModules();
    const mod = await import("./preload");
    expect(() => mod.invokeAllowed("praxis:runtime:unknown.channel")).toThrow(
      "IPC channel not allowed"
    );
  });
});
