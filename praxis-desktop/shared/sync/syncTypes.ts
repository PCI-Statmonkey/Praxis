export type SyncStatus = "idle" | "blocked" | "error";

export type SyncErrorCode =
  | "unknown_error"
  | "invalid_request"
  | "not_implemented"
  | "db_missing"
  | "io_error";

export type SyncError = {
  code: SyncErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type SyncSummary = {
  status: SyncStatus;
  mirrorConfigured: boolean;
  mirrorRoot?: string;
  localCursor: { maxRowId?: number };
  syncState: { lastUploadedRowId?: number; lastImportedRowId?: number };
  lockAvailable?: boolean;
  issues: string[];
};
