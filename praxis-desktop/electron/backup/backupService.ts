import type {
  BackupInventoryPreview,
  BackupResult,
  RestorePlanPreview,
} from "../../shared/backup/backupTypes";

type Clock = {
  now: () => string;
};

type InventoryProvider = {
  getScopeSummary: () => BackupInventoryPreview["scope"];
  getStatePaths: () => Promise<BackupInventoryPreview["statePaths"]>;
};

type RestorePlanProvider = {
  getPlanPreview: (
    backupZipPath: string
  ) => Promise<Omit<RestorePlanPreview, "backupZipPath" | "generatedAt">>;
};

type Deps = {
  clock: Clock;
  inventory: InventoryProvider;
  restore: RestorePlanProvider;
};

export type BackupService = {
  getInventoryPreview: () => Promise<BackupResult<BackupInventoryPreview>>;
  getRestorePlanPreview: (backupZipPath: string) => Promise<BackupResult<RestorePlanPreview>>;
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
      const statePaths = await deps.inventory.getStatePaths();
      const scope = deps.inventory.getScopeSummary();
      return toOk({
        generatedAt: deps.clock.now(),
        scope,
        statePaths,
      });
    } catch (error) {
      const err = error as Error;
      return toError("io_error", "Failed to read inventory preview", {
        name: err?.name ?? "Error",
      });
    }
  };

  const getRestorePlanPreview = async (
    backupZipPath: string
  ): Promise<BackupResult<RestorePlanPreview>> => {
    if (!backupZipPath || typeof backupZipPath !== "string" || !backupZipPath.trim()) {
      return toError("invalid_request", "backupZipPath is required");
    }
    try {
      const preview = await deps.restore.getPlanPreview(backupZipPath);
      return toOk({
        ...preview,
        backupZipPath,
        generatedAt: deps.clock.now(),
      });
    } catch (error) {
      const err = error as Error;
      return toError("io_error", "Failed to read restore plan preview", {
        name: err?.name ?? "Error",
      });
    }
  };

  return {
    getInventoryPreview,
    getRestorePlanPreview,
  };
};
