import {
  RUNTIME_GET_STATUS,
  RUNTIME_PING,
} from "../../shared/ipc/runtimeChannels";
import type {
  IpcFailure,
  IpcResult,
  RuntimePingResponse,
  RuntimeStatus,
} from "../../shared/ipc/runtimeTypes";

export type RuntimeIpcDeps = {
  getVersion: () => string;
  getStatus: () => RuntimeStatus;
};

export type IpcMainLike = {
  handle: (channel: string, handler: () => Promise<unknown> | unknown) => void;
};

const toErrorResult = (error: unknown): IpcFailure => {
  const err = error as Error;
  return {
    ok: false,
    error: {
      code: "unknown_error",
      message: err?.message ?? "Unknown error",
      details: {
        name: err?.name ?? "Error",
      },
    },
  };
};

export const registerRuntimeIpcHandlers = (
  ipcMain: IpcMainLike,
  deps: RuntimeIpcDeps
): void => {
  ipcMain.handle(RUNTIME_PING, async (): Promise<IpcResult<RuntimePingResponse>> => {
    try {
      return {
        ok: true,
        data: { version: deps.getVersion() },
      };
    } catch (error) {
      return toErrorResult(error);
    }
  });

  ipcMain.handle(RUNTIME_GET_STATUS, async (): Promise<IpcResult<RuntimeStatus>> => {
    try {
      return {
        ok: true,
        data: deps.getStatus(),
      };
    } catch (error) {
      return toErrorResult(error);
    }
  });
};
