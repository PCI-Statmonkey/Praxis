import { contextBridge, ipcRenderer } from 'electron'
import type { MissionCreateInput, MissionUpdatePatch } from '../shared/missions/missionTypes'
import {
  BACKUP_GET_INVENTORY_PREVIEW,
  MISSIONS_ARCHIVE,
  MISSIONS_CREATE,
  MISSIONS_GET,
  MISSIONS_LIST,
  MISSIONS_UPDATE,
  PERSISTENCE_GET_DB_INTEGRITY,
  PERSISTENCE_GET_DB_STATUS,
  PERSISTENCE_GET_PATHS,
  RESTORE_GET_PLAN_PREVIEW,
  RUNTIME_GET_STATUS,
  RUNTIME_PING,
  SYNC_GET_STATUS,
} from '../shared/ipc/runtimeChannels'

export const ALLOWED_IPC_CHANNELS = [
  RUNTIME_PING,
  RUNTIME_GET_STATUS,
  PERSISTENCE_GET_PATHS,
  PERSISTENCE_GET_DB_STATUS,
  PERSISTENCE_GET_DB_INTEGRITY,
  SYNC_GET_STATUS,
  BACKUP_GET_INVENTORY_PREVIEW,
  RESTORE_GET_PLAN_PREVIEW,
  MISSIONS_LIST,
  MISSIONS_GET,
  MISSIONS_CREATE,
  MISSIONS_UPDATE,
  MISSIONS_ARCHIVE,
] as const

const ALLOWED_SET = new Set<string>(ALLOWED_IPC_CHANNELS)

export const invokeAllowed = (channel: string, payload?: unknown) => {
  if (!ALLOWED_SET.has(channel)) {
    throw new Error(`IPC channel not allowed: ${channel}`)
  }
  return ipcRenderer.invoke(channel, payload)
}

export const createPraxisApi = () =>
  Object.freeze({
    ping: () => invokeAllowed(RUNTIME_PING),
    getStatus: () => invokeAllowed(RUNTIME_GET_STATUS),
    persistenceGetPaths: () => invokeAllowed(PERSISTENCE_GET_PATHS),
    persistenceGetDbStatus: () => invokeAllowed(PERSISTENCE_GET_DB_STATUS),
    persistenceGetDbIntegritySummary: () => invokeAllowed(PERSISTENCE_GET_DB_INTEGRITY),
    syncGetStatus: () => invokeAllowed(SYNC_GET_STATUS),
    backupGetInventoryPreview: () => invokeAllowed(BACKUP_GET_INVENTORY_PREVIEW),
    restoreGetPlanPreview: (zipPath: string) =>
      invokeAllowed(RESTORE_GET_PLAN_PREVIEW, { zipPath }),
    missionsList: (includeArchived?: boolean) =>
      invokeAllowed(MISSIONS_LIST, { includeArchived }),
    missionsGet: (id: string) => invokeAllowed(MISSIONS_GET, { id }),
    missionsCreate: (input: MissionCreateInput) => invokeAllowed(MISSIONS_CREATE, input),
    missionsUpdate: (id: string, patch: MissionUpdatePatch) =>
      invokeAllowed(MISSIONS_UPDATE, { id, patch }),
    missionsArchive: (id: string) => invokeAllowed(MISSIONS_ARCHIVE, { id }),
  })

contextBridge.exposeInMainWorld('praxis', createPraxisApi())
