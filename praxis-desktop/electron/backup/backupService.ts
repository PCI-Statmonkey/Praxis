import type { BackupInventoryPreview, BackupResult } from "../../shared/backup/backupTypes";

type InventoryBuilder = {
  buildPreview: () => Promise<BackupInventoryPreview>;
};

type Deps = {
  inventory: InventoryBuilder;
};

export type BackupService = {
  getInventoryPreview: () => Promise<BackupResult<BackupInventoryPreview>>;
};

const toOk = <T>(value: T): BackupResult<T> => ({ ok: true, value });

const toError = (
  code: BackupResult<never>["error"]["code"],
  message: string,
  details?: Record<string, unknown>
): BackupResult<never> => ({
  ok: false,
  error: { code, message, details },
});

export const createBackupService = (deps: Deps): BackupService => {
  const getInventoryPreview = async (): Promise<BackupResult<BackupInventoryPreview>> => {
    try {
      return toOk(await deps.inventory.buildPreview());
    } catch (error) {
      const err = error as Error;
      return toError("io_error", "Failed to read inventory preview", {
        name: err?.name ?? "Error",
      });
    }
  };

  return {
    getInventoryPreview,
  };
};
