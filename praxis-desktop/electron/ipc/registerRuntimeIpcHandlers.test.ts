import { expect, test } from "vitest";
import {
  RUNTIME_GET_STATUS,
  RUNTIME_PING,
} from "../../shared/ipc/runtimeChannels";
import type { IpcResult, RuntimeStatus } from "../../shared/ipc/runtimeTypes";
import {
  registerRuntimeIpcHandlers,
  type IpcMainLike,
  type RuntimeIpcDeps,
} from "./registerRuntimeIpcHandlers";

type Handler = () => Promise<unknown> | unknown;

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
  };

  registerRuntimeIpcHandlers(ipcMain, deps);

  expect(handlers.has(RUNTIME_PING)).toBe(true);
  expect(handlers.has(RUNTIME_GET_STATUS)).toBe(true);
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
