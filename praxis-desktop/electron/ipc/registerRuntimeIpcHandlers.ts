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
  IpcFailure,
  IpcResult,
  PersistencePaths,
  RestorePlanPreview,
  RuntimePingResponse,
  RuntimeStatus,
  SyncSummary,
} from "../../shared/ipc/runtimeTypes";
import type { BackupResult } from "../../shared/backup/backupTypes";
import type { ReadOnlyResult } from "../../shared/persistence/readOnlyService";

export type RuntimeIpcDeps = {
  getVersion: () => string;
  getStatus: () => RuntimeStatus;
  getPersistencePaths: () => Promise<ReadOnlyResult<PersistencePaths>>;
  getDbStatus: () => Promise<ReadOnlyResult<DbStatus>>;
  getDbIntegritySummary: () => Promise<ReadOnlyResult<DbIntegritySummary>>;
  getSyncStatus: () => Promise<SyncSummary> | SyncSummary;
  getBackupInventoryPreview: () => Promise<BackupResult<BackupInventoryPreview>>;
  getRestorePlanPreview: (backupZipPath: string) => Promise<BackupResult<RestorePlanPreview>>;
};

export type IpcMainLike = {
  handle: (
    channel: string,
    handler: (event: unknown, request?: unknown) => Promise<unknown> | unknown
  ) => void;
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

const toIpcResult = <T>(result: ReadOnlyResult<T>): IpcResult<T> =>
  result.ok ? { ok: true, data: result.value } : { ok: false, error: result.error };

const toBackupIpcResult = <T>(result: BackupResult<T>): IpcResult<T> =>
  result.ok ? { ok: true, data: result.value } : { ok: false, error: result.error };

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

  ipcMain.handle(PERSISTENCE_GET_PATHS, async (): Promise<IpcResult<PersistencePaths>> => {
    try {
      return toIpcResult(await deps.getPersistencePaths());
    } catch (error) {
      return toErrorResult(error);
    }
  });

  ipcMain.handle(PERSISTENCE_GET_DB_STATUS, async (): Promise<IpcResult<DbStatus>> => {
    try {
      return toIpcResult(await deps.getDbStatus());
    } catch (error) {
      return toErrorResult(error);
    }
  });

  ipcMain.handle(
    PERSISTENCE_GET_DB_INTEGRITY,
    async (): Promise<IpcResult<DbIntegritySummary>> => {
      try {
        return toIpcResult(await deps.getDbIntegritySummary());
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  ipcMain.handle(SYNC_GET_STATUS, async (): Promise<IpcResult<SyncSummary>> => {
    try {
      return {
        ok: true,
        data: await deps.getSyncStatus(),
      };
    } catch (error) {
      return toErrorResult(error);
    }
  });

  ipcMain.handle(
    BACKUP_GET_INVENTORY_PREVIEW,
    async (): Promise<IpcResult<BackupInventoryPreview>> => {
      try {
        return toBackupIpcResult(await deps.getBackupInventoryPreview());
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );

  ipcMain.handle(
    RESTORE_GET_PLAN_PREVIEW,
    async (
      _event,
      request: { zipPath?: string } = {}
    ): Promise<IpcResult<RestorePlanPreview>> => {
      try {
        const zipPath = request.zipPath ?? "";
        return toBackupIpcResult(await deps.getRestorePlanPreview(zipPath));
      } catch (error) {
        return toErrorResult(error);
      }
    }
  );
};
