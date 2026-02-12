import type { RuntimeIpcDeps } from "../ipc/registerRuntimeIpcHandlers";
import type {
  BackupInventoryPreview,
  RestorePlanPreview,
  SyncSummary,
} from "../../shared/ipc/runtimeTypes";
import type { BackupResult } from "../../shared/backup/backupTypes";
import type {
  DbIntegritySummary,
  DbStatus,
  PersistencePaths,
  RuntimeStatus,
} from "../../shared/ipc/runtimeTypes";
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
};

export type RuntimeServiceFactories = {
  createPersistenceRO: () => RuntimeServices["persistenceRO"];
  createEventLog: () => RuntimeServices["eventLog"];
  createSyncOrchestrator: () => RuntimeServices["syncOrchestrator"];
  createBackupService: () => RuntimeServices["backupService"];
  createRestoreService: () => RuntimeServices["restoreService"];
};

export type RuntimeDepsOptions = {
  getVersion: () => string;
  getStatus: () => RuntimeStatus;
  persistence: {
    getPaths: () => Promise<ReadOnlyResult<PersistencePaths>>;
    getDbStatus: () => Promise<ReadOnlyResult<DbStatus>>;
    getDbIntegritySummary: () => Promise<ReadOnlyResult<DbIntegritySummary>>;
  };
  sync: {
    getStatus: () => Promise<SyncSummary> | SyncSummary;
  };
  backup: {
    getInventoryPreview: () => Promise<BackupResult<BackupInventoryPreview>>;
  };
  restore: {
    getPlanPreview: (zipPath: string) => Promise<BackupResult<RestorePlanPreview>>;
  };
};

export const createRuntimeServices = (opts: RuntimeServiceFactories): RuntimeServices => ({
  persistenceRO: opts.createPersistenceRO(),
  eventLog: opts.createEventLog(),
  syncOrchestrator: opts.createSyncOrchestrator(),
  backupService: opts.createBackupService(),
  restoreService: opts.createRestoreService(),
});

export const buildRuntimeDeps = (opts: RuntimeDepsOptions): RuntimeIpcDeps => ({
  getVersion: opts.getVersion,
  getStatus: opts.getStatus,
  getPersistencePaths: opts.persistence.getPaths,
  getDbStatus: opts.persistence.getDbStatus,
  getDbIntegritySummary: opts.persistence.getDbIntegritySummary,
  getSyncStatus: opts.sync.getStatus,
  getBackupInventoryPreview: opts.backup.getInventoryPreview,
  getRestorePlanPreview: opts.restore.getPlanPreview,
});
