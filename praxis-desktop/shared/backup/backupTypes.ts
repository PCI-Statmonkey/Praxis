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

export type BackupInventoryPreview = {
  items: Array<{
    category: string;
    path: string;
    exists: boolean;
    sizeBytes?: number;
  }>;
  warnings: string[];
};

export type RestorePlanPreview = {
  conflicts: Array<{ path: string; reason: string }>;
  willOverwriteCount: number;
  missingCount: number;
  warnings: string[];
};
