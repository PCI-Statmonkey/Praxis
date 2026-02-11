export type ReadOnlyPersistenceError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ReadOnlyResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ReadOnlyPersistenceError };

export type ReadOnlyDbStatus = {
  exists: boolean;
  path: string;
};

export type ReadOnlyIntegritySummary = {
  ok: boolean;
  issues: string[];
};

export type ReadOnlySyncState = {
  last_uploaded_local_seq?: number;
  last_pulled_seq?: number;
  last_pushed_seq?: number;
  last_pull_ts?: string | null;
  last_push_ts?: string | null;
  remote_offsets?: Record<string, { offset: number; identity?: string }>;
};

export type ReadOnlySnapshotMeta = {
  exists: boolean;
  snapshotId?: number;
  lastEventRowId?: number;
  createdAt?: string;
};

export interface ReadOnlyPersistenceService {
  getDbStatus: () => Promise<ReadOnlyResult<ReadOnlyDbStatus>>;
  getIntegritySummary: () => Promise<ReadOnlyResult<ReadOnlyIntegritySummary>>;
  getSyncState: () => Promise<ReadOnlyResult<ReadOnlySyncState>>;
  getLatestSnapshotMeta: () => Promise<ReadOnlyResult<ReadOnlySnapshotMeta>>;
}
