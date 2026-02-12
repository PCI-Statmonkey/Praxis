import type {
  BackupInventoryPreview as BackupInventoryPreviewType,
  RestorePlanPreview as RestorePlanPreviewType,
} from "../backup/backupTypes";
import type {
  Mission as MissionType,
  MissionCreateInput as MissionCreateInputType,
  MissionUpdatePatch as MissionUpdatePatchType,
} from "../missions/missionTypes";
import type { SyncSummary as SyncSummaryType } from "../sync/syncTypes";

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

export type BackupInventoryPreview = BackupInventoryPreviewType;
export type RestorePlanPreview = RestorePlanPreviewType;

export type SyncSummary = SyncSummaryType;

export type Mission = MissionType;
export type MissionCreateInput = MissionCreateInputType;
export type MissionUpdatePatch = MissionUpdatePatchType;
