import type { BackupResult, RestorePlanPreview } from "../../shared/backup/backupTypes";

type RestorePlanBuilder = {
  buildPlanPreview: (backupZipPath: string) => Promise<RestorePlanPreview>;
};

type Deps = {
  restore: RestorePlanBuilder;
};

export type RestoreService = {
  getPlanPreview: (backupZipPath: string) => Promise<BackupResult<RestorePlanPreview>>;
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

export const createRestoreService = (deps: Deps): RestoreService => {
  const getPlanPreview = async (
    backupZipPath: string
  ): Promise<BackupResult<RestorePlanPreview>> => {
    if (!backupZipPath || typeof backupZipPath !== "string" || !backupZipPath.trim()) {
      return toError("invalid_request", "backupZipPath is required");
    }
    try {
      return toOk(await deps.restore.buildPlanPreview(backupZipPath));
    } catch (error) {
      const err = error as Error;
      return toError("io_error", "Failed to read restore plan preview", {
        name: err?.name ?? "Error",
      });
    }
  };

  return {
    getPlanPreview,
  };
};
