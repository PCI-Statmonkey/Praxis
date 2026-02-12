import type { RuntimeIpcDeps } from "../ipc/registerRuntimeIpcHandlers";
import type {
  BackupInventoryPreview,
  DbIntegritySummary,
  DbStatus,
  Mission,
  MissionCreateInput,
  MissionUpdatePatch,
  PersistencePaths,
  RestorePlanPreview,
  RuntimeStatus,
  SyncSummary,
} from "../../shared/ipc/runtimeTypes";
import type { BackupResult } from "../../shared/backup/backupTypes";
import type { ReadOnlyResult } from "../../shared/persistence/readOnlyService";

export type RuntimeServices = {
  persistenceRO: {
    getDbStatus: () => Promise<ReadOnlyResult<DbStatus>>;
    getDbIntegritySummary: () => Promise<ReadOnlyResult<DbIntegritySummary>>;
  };
  eventLog: {
    getLocalEventCursor: () => Promise<{ maxRowId: number; lastSyncRowId?: number }>;
    readEventsAfterRowId: (rowId: number, limit: number) => Promise<unknown[]>;
    validateEventRecord: (record: unknown) => { ok: boolean; error?: { message: string } };
    appendEvent: (record: unknown) => Promise<unknown>;
    insertEventIfMissing: (record: unknown) => Promise<boolean>;
  };
  syncOrchestrator: {
    tick: () => Promise<unknown>;
    getStatus: () => Promise<SyncSummary> | SyncSummary;
  };
  backupService: {
    getInventoryPreview: () => Promise<BackupResult<BackupInventoryPreview>>;
  };
  restoreService: {
    getPlanPreview: (zipPath: string) => Promise<BackupResult<RestorePlanPreview>>;
  };
  missionService: {
    list: (includeArchived?: boolean) => Promise<Mission[]>;
    get: (id: string) => Promise<Mission | null>;
    create: (input: MissionCreateInput) => Promise<Mission>;
    update: (id: string, patch: MissionUpdatePatch) => Promise<Mission | null>;
    archive: (id: string) => Promise<Mission | null>;
  };
};

export type RuntimeServiceFactories = {
  createPersistenceRO: () => RuntimeServices["persistenceRO"];
  createEventLog: () => RuntimeServices["eventLog"];
  createSyncOrchestrator: () => RuntimeServices["syncOrchestrator"];
  createBackupService: () => RuntimeServices["backupService"];
  createRestoreService: () => RuntimeServices["restoreService"];
  createMissionService: () => RuntimeServices["missionService"];
};

export const createRuntimeServices = (opts: RuntimeServiceFactories): RuntimeServices => ({
  persistenceRO: opts.createPersistenceRO(),
  eventLog: opts.createEventLog(),
  syncOrchestrator: opts.createSyncOrchestrator(),
  backupService: opts.createBackupService(),
  restoreService: opts.createRestoreService(),
  missionService: opts.createMissionService(),
});

export type RuntimeIpcDepsOptions = {
  getVersion: () => string;
  getStatus: () => RuntimeStatus;
  getPaths: () => Promise<ReadOnlyResult<PersistencePaths>>;
  getDbStatus: () => Promise<ReadOnlyResult<DbStatus>>;
  getDbIntegritySummary: () => Promise<ReadOnlyResult<DbIntegritySummary>>;
};

export const buildRuntimeIpcDeps = (
  services: RuntimeServices,
  opts: RuntimeIpcDepsOptions
): RuntimeIpcDeps => ({
  getVersion: opts.getVersion,
  getStatus: opts.getStatus,
  getPersistencePaths: opts.getPaths,
  getDbStatus: opts.getDbStatus,
  getDbIntegritySummary: opts.getDbIntegritySummary,
  getSyncStatus: services.syncOrchestrator.getStatus,
  getBackupInventoryPreview: services.backupService.getInventoryPreview,
  getRestorePlanPreview: services.restoreService.getPlanPreview,
  missionsList: services.missionService.list,
  missionsGet: services.missionService.get,
  missionsCreate: services.missionService.create,
  missionsUpdate: services.missionService.update,
  missionsArchive: services.missionService.archive,
});
