export type IpcError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type IpcSuccess<T> = {
  ok: true;
  data: T;
};

export type IpcFailure = {
  ok: false;
  error: IpcError;
};

export type IpcResult<T> = IpcSuccess<T> | IpcFailure;

export type RuntimePingResponse = {
  version: string;
};

export type RuntimeStatus = {
  ready: boolean;
  notes?: string[];
};

export type PersistencePaths = {
  appDataRoot: string;
  dbPath: string;
};

export type DbStatus = {
  exists: boolean;
  path: string;
};

export type DbIntegritySummary = {
  ok: boolean;
  integrityCheck?: string;
  eventCount?: number;
  snapshotCount?: number;
};

export type MirrorStatus = {
  mirrorRootSet: boolean;
  mirrorRoot?: string;
};

export type InventoryPreview = {
  generatedAt: string;
  statePaths: Array<{ label: string; exists: boolean; type: string }>;
};
