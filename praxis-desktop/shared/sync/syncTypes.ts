export type SyncStatus = "idle" | "running" | "blocked" | "error";

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

export type SyncCursor = {
  maxRowId: number;
  lastSyncRowId?: number;
};

export type SyncSummary = {
  status: SyncStatus;
  lastTickAt?: string;
  lastSuccessAt?: string;
  lastError?: SyncError;
  localCursor?: SyncCursor;
  remoteCursor?: Record<string, number>;
};

export type SyncTickResult = {
  status: SyncStatus;
  uploaded: number;
  imported: number;
  warnings: string[];
  blockedReason?: string;
  error?: SyncError;
};
