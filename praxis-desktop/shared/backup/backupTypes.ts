export type BackupErrorCode =
  | "unknown_error"
  | "invalid_request"
  | "not_implemented"
  | "db_missing"
  | "io_error";

export type BackupError = {
  code: BackupErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type BackupResult<T> = { ok: true; value: T } | { ok: false; error: BackupError };

export type BackupScopeSummary = {
  includes: string[];
  excludes?: Array<{ label: string; reason?: string }>;
};

export type BackupInventoryPath = {
  label: string;
  path: string;
  exists: boolean;
  type: "file" | "dir" | "missing";
};

export type BackupInventoryPreview = {
  generatedAt: string;
  scope: BackupScopeSummary;
  statePaths: BackupInventoryPath[];
};

export type RestorePlanPreview = {
  backupZipPath: string;
  generatedAt: string;
  summary: {
    files: number;
    dirs: number;
    conflicts: number;
  };
  conflicts: Array<{ path: string; reason: string }>;
};
