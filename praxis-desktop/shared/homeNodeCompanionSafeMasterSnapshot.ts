import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  type HomeNodeNetworkingDeniedAuthority,
  type HomeNodeNetworkingPhaseCloseout,
} from "./homeNodeNetworkingCloseout";
import type { HomeNodePairedDeviceRecord } from "./homeNodeLocalPairingLifecycle";
import type { HomeNodePendingConfirmationRecord } from "./homeNodePendingConfirmationLifecycle";
import type { WorkSnapshot } from "./workModel";

export const HOME_NODE_COMPANION_SAFE_MASTER_SNAPSHOT_PHASE = "RM15" as const;
export const HOME_NODE_COMPANION_SAFE_MASTER_SNAPSHOT_SCHEMA_VERSION =
  "home-node-companion-safe-master-snapshot.v1" as const;

export type HomeNodeCompanionSafeMasterSnapshotAuthorityFlags = Record<
  HomeNodeNetworkingDeniedAuthority,
  false
>;

export type HomeNodeCompanionSafeMasterSnapshotInput = {
  generatedAt: string;
  workSnapshot: WorkSnapshot;
  pairedDevices: readonly HomeNodePairedDeviceRecord[];
  pendingConfirmations: readonly HomeNodePendingConfirmationRecord[];
  closeout: HomeNodeNetworkingPhaseCloseout;
};

export type HomeNodeCompanionSafeMasterSnapshot = {
  phase: typeof HOME_NODE_COMPANION_SAFE_MASTER_SNAPSHOT_PHASE;
  schemaVersion: typeof HOME_NODE_COMPANION_SAFE_MASTER_SNAPSHOT_SCHEMA_VERSION;
  generatedAt: string;
  source: "praxis-home-node";
  capability: {
    readOnly: true;
    commandsAccepted: false;
    directStorageAccess: false;
    directDatabaseAccess: false;
    providerAccess: false;
    rawPayloadAccess: false;
    writeCommandsIncluded: false;
    notes: string;
  };
  homePcMaster: {
    selectedTransport: "none";
    runtimeProvider: "none";
    qrTransport: "none";
    requestAcceptance: "blocked";
    readinessStatus: HomeNodeNetworkingPhaseCloseout["readinessStatus"];
    closeoutEvidenceComplete: boolean;
  };
  devices: {
    activeCount: number;
    revokedCount: number;
    localRecordOnly: true;
    requestStagingEligibleCount: number;
  };
  pendingConfirmations: {
    pendingCount: number;
    confirmedLocallyCount: number;
    dismissedCount: number;
    expiredCount: number;
    rejectedCount: number;
    byActionKind: Record<"todo" | "project" | "mission_note" | "deadline", number>;
    writeBoundary: "pending_local_confirmation_only";
    workMutationsApplied: false;
  };
  workOverview: {
    activeMissionCount: number;
    activeProjectCount: number;
    activeTodoCount: number;
    activeDeadlineCount: number;
    appointmentCountToday: number;
    appointmentCountTomorrow: number;
    waitingOnCount: number;
    blockedCount: number;
    pausedCount: number;
    overdueCount: number;
    dueTodayCount: number;
    quickActionCount: number;
    moneyRelatedCount: number;
    peopleCount: number;
    activeRelationshipCount: number;
  };
  diagnostics: {
    closeoutSchemaVersion: HomeNodeNetworkingPhaseCloseout["schemaVersion"];
    deniedAuthorityCount: number;
    excludedEvidenceCount: number;
    settingsRuntimeConsistent: boolean;
  };
  excludedContent: readonly string[];
  authorityFlags: HomeNodeCompanionSafeMasterSnapshotAuthorityFlags;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const buildAuthorityFlags = (): HomeNodeCompanionSafeMasterSnapshotAuthorityFlags =>
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES.reduce(
    (flags, authority) => ({
      ...flags,
      [authority]: false,
    }),
    {} as HomeNodeCompanionSafeMasterSnapshotAuthorityFlags
  );

const normalizeIsoOrFallback = (value: string, fallback: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysUntil = (value: string | null, now: Date) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
};

const activeStatus = <T extends { status: string }>(items: readonly T[]) =>
  items.filter((item) => item.status !== "completed");

const countStatus = <T extends { status: string }>(items: readonly T[], status: string) =>
  items.filter((item) => item.status === status).length;

const pendingConfirmationActionCounts = (
  confirmations: readonly HomeNodePendingConfirmationRecord[]
) => ({
  todo: confirmations.filter((confirmation) => confirmation.actionKind === "todo").length,
  project: confirmations.filter((confirmation) => confirmation.actionKind === "project").length,
  mission_note: confirmations.filter((confirmation) => confirmation.actionKind === "mission_note")
    .length,
  deadline: confirmations.filter((confirmation) => confirmation.actionKind === "deadline").length,
});

const buildWorkOverview = (workSnapshot: WorkSnapshot, now: Date) => {
  const activeMissions = activeStatus(workSnapshot.missions);
  const activeProjects = activeStatus(workSnapshot.projects);
  const activeTodos = activeStatus(workSnapshot.todos);
  const activeDeadlines = activeStatus(workSnapshot.deadlines);
  const activeItems = [...activeMissions, ...activeProjects, ...activeTodos, ...activeDeadlines];
  const appointmentDayOffsets = workSnapshot.appointments.map((appointment) =>
    daysUntil(appointment.startsAt, now)
  );

  return {
    activeMissionCount: activeMissions.length,
    activeProjectCount: activeProjects.length,
    activeTodoCount: activeTodos.length,
    activeDeadlineCount: activeDeadlines.length,
    appointmentCountToday: appointmentDayOffsets.filter((days) => days === 0).length,
    appointmentCountTomorrow: appointmentDayOffsets.filter((days) => days === 1).length,
    waitingOnCount: activeTodos.filter((todo) => Boolean(todo.waitingOnPersonId)).length,
    blockedCount: countStatus(activeItems, "blocked"),
    pausedCount: countStatus(activeItems, "paused"),
    overdueCount:
      activeItems.filter((item) => "dueAt" in item && daysUntil(item.dueAt, now) !== null && Number(daysUntil(item.dueAt, now)) < 0)
        .length,
    dueTodayCount:
      activeItems.filter((item) => "dueAt" in item && daysUntil(item.dueAt, now) === 0).length,
    quickActionCount: activeTodos.filter((todo) => todo.quickAction).length,
    moneyRelatedCount: activeTodos.filter((todo) => todo.moneyRelated).length,
    peopleCount: workSnapshot.people.length,
    activeRelationshipCount: workSnapshot.personWorkLinks.filter((link) =>
      activeItems.some((item) => item.id === link.entityId)
    ).length,
  };
};

export const buildHomeNodeCompanionSafeMasterSnapshot = (
  input: HomeNodeCompanionSafeMasterSnapshotInput
): HomeNodeCompanionSafeMasterSnapshot => {
  const generatedAt = normalizeIsoOrFallback(input.generatedAt, new Date(0).toISOString());
  const now = new Date(generatedAt);
  const activeDevices = input.pairedDevices.filter((device) => device.status === "active");
  const revokedDevices = input.pairedDevices.filter((device) => device.status === "revoked");

  return {
    phase: HOME_NODE_COMPANION_SAFE_MASTER_SNAPSHOT_PHASE,
    schemaVersion: HOME_NODE_COMPANION_SAFE_MASTER_SNAPSHOT_SCHEMA_VERSION,
    generatedAt,
    source: "praxis-home-node",
    capability: {
      readOnly: true,
      commandsAccepted: false,
      directStorageAccess: false,
      directDatabaseAccess: false,
      providerAccess: false,
      rawPayloadAccess: false,
      writeCommandsIncluded: false,
      notes:
        "Companion-safe master snapshot exposes counts and statuses only. Request drafts remain local pending confirmations.",
    },
    homePcMaster: {
      selectedTransport: "none",
      runtimeProvider: "none",
      qrTransport: "none",
      requestAcceptance: "blocked",
      readinessStatus: input.closeout.readinessStatus,
      closeoutEvidenceComplete: input.closeout.evidenceCompleteness.complete,
    },
    devices: {
      activeCount: activeDevices.length,
      revokedCount: revokedDevices.length,
      localRecordOnly: true,
      requestStagingEligibleCount: activeDevices.filter(
        (device) => device.localRequestStagingStatus === "allowed"
      ).length,
    },
    pendingConfirmations: {
      pendingCount: countStatus(input.pendingConfirmations, "pending"),
      confirmedLocallyCount: countStatus(input.pendingConfirmations, "confirmed_locally"),
      dismissedCount: countStatus(input.pendingConfirmations, "dismissed"),
      expiredCount: countStatus(input.pendingConfirmations, "expired"),
      rejectedCount: countStatus(input.pendingConfirmations, "rejected"),
      byActionKind: pendingConfirmationActionCounts(input.pendingConfirmations),
      writeBoundary: "pending_local_confirmation_only",
      workMutationsApplied: false,
    },
    workOverview: buildWorkOverview(input.workSnapshot, now),
    diagnostics: {
      closeoutSchemaVersion: input.closeout.schemaVersion,
      deniedAuthorityCount: HOME_NODE_NETWORKING_DENIED_AUTHORITIES.length,
      excludedEvidenceCount: input.closeout.excludedEvidence.length,
      settingsRuntimeConsistent: input.closeout.settingsRuntimeConsistency.consistent,
    },
    excludedContent: [
      "raw_work_records",
      "raw_email_or_chat_bodies",
      "provider_record_ids",
      "provider_payloads",
      "storage_paths",
      "markdown_paths",
      "external_ids",
      "secrets",
      "tokens",
      "write_commands",
      "direct_database_rows",
    ],
    authorityFlags: buildAuthorityFlags(),
  };
};
