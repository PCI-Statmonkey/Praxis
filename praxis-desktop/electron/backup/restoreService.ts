import type { BackupResult, RestorePlanPreview } from "../../shared/backup/backupTypes";

type RestorePlanBuilder = {
  buildPlanPreview: (backupZipPath: string) => Promise<Omit<RestorePlanPreview, "zipPath">>;
};

type Deps = {
  restore: RestorePlanBuilder;
  fs: {
    stat: (path: string) => Promise<{ isFile: () => boolean }>;
  };
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
  const getPlanPreview = async (zipPath: string): Promise<BackupResult<RestorePlanPreview>> => {
    if (!zipPath || typeof zipPath !== "string" || !zipPath.trim()) {
      return toError("invalid_request", "zipPath is required");
    }
    try {
      const stat = await deps.fs.stat(zipPath);
      if (!stat.isFile()) {
        return toError("invalid_request", "zipPath must be a file");
      }
      const preview = await deps.restore.buildPlanPreview(zipPath);
      return toOk({ zipPath, ...preview });
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
