export const RUNTIME_PING = "praxis:runtime:ping";
export const RUNTIME_GET_STATUS = "praxis:runtime:getStatus";
export const PERSISTENCE_GET_PATHS = "praxis:runtime:persistence.getPaths";
export const PERSISTENCE_GET_DB_STATUS = "praxis:runtime:persistence.getDbStatus";
export const PERSISTENCE_GET_DB_INTEGRITY = "praxis:runtime:persistence.getDbIntegritySummary";
export const SYNC_GET_MIRROR_STATUS = "praxis:runtime:sync.getMirrorStatus";
export const BACKUP_GET_INVENTORY_PREVIEW = "praxis:runtime:backup.getInventoryPreview";

export const RUNTIME_CHANNELS = {
  RUNTIME_PING,
  RUNTIME_GET_STATUS,
  PERSISTENCE_GET_PATHS,
  PERSISTENCE_GET_DB_STATUS,
  PERSISTENCE_GET_DB_INTEGRITY,
  SYNC_GET_MIRROR_STATUS,
  BACKUP_GET_INVENTORY_PREVIEW,
} as const;

export type RuntimeChannel = (typeof RUNTIME_CHANNELS)[keyof typeof RUNTIME_CHANNELS];
