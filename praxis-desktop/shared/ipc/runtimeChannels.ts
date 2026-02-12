export const RUNTIME_PING = "praxis:runtime:ping";
export const RUNTIME_GET_STATUS = "praxis:runtime:getStatus";
export const PERSISTENCE_GET_PATHS = "praxis:runtime:persistence.getPaths";
export const PERSISTENCE_GET_DB_STATUS = "praxis:runtime:persistence.getDbStatus";
export const PERSISTENCE_GET_DB_INTEGRITY = "praxis:runtime:persistence.getDbIntegritySummary";
export const SYNC_GET_MIRROR_STATUS = "praxis:runtime:sync.getMirrorStatus";
export const SYNC_GET_STATUS = "praxis:runtime:sync.getStatus";
export const BACKUP_GET_INVENTORY_PREVIEW = "praxis:runtime:backup.getInventoryPreview";
export const RESTORE_GET_PLAN_PREVIEW = "praxis:runtime:restore.getPlanPreview";
export const MISSIONS_LIST = "praxis:runtime:missions.list";
export const MISSIONS_GET = "praxis:runtime:missions.get";
export const MISSIONS_CREATE = "praxis:runtime:missions.create";
export const MISSIONS_UPDATE = "praxis:runtime:missions.update";
export const MISSIONS_ARCHIVE = "praxis:runtime:missions.archive";

export const RUNTIME_CHANNELS = {
  RUNTIME_PING,
  RUNTIME_GET_STATUS,
  PERSISTENCE_GET_PATHS,
  PERSISTENCE_GET_DB_STATUS,
  PERSISTENCE_GET_DB_INTEGRITY,
  SYNC_GET_MIRROR_STATUS,
  SYNC_GET_STATUS,
  BACKUP_GET_INVENTORY_PREVIEW,
  RESTORE_GET_PLAN_PREVIEW,
  MISSIONS_LIST,
  MISSIONS_GET,
  MISSIONS_CREATE,
  MISSIONS_UPDATE,
  MISSIONS_ARCHIVE,
} as const;

export type RuntimeChannel = (typeof RUNTIME_CHANNELS)[keyof typeof RUNTIME_CHANNELS];
