import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  type HomeNodeNetworkingDeniedAuthority,
  type HomeNodeNetworkingPhaseCloseout,
} from "./homeNodeNetworkingCloseout";
import type { HomeNodePairedDeviceRecord } from "./homeNodeLocalPairingLifecycle";
import type { HomeNodePendingConfirmationRecord } from "./homeNodePendingConfirmationLifecycle";
import type { HomeNodeCompanionSafeMasterSnapshot } from "./homeNodeCompanionSafeMasterSnapshot";
import {
  HOME_NODE_COMPANION_SESSION_ENVELOPE_PHASE,
  type HomeNodeCompanionSessionEnvelope,
} from "./homeNodeCompanionSessionEnvelope";

export const HOME_NODE_NETWORKING_SETUP_CLOSEOUT_PHASE = "RM17" as const;
export const HOME_NODE_NETWORKING_SETUP_CLOSEOUT_SCHEMA_VERSION =
  "home-node-networking-setup-closeout.v1" as const;

export type HomeNodeNetworkingSetupCloseoutStatus =
  | "ready_for_transport_planning"
  | "blocked";

export type HomeNodeNetworkingSetupCloseoutIssue =
  | "rm12_closeout_blocked"
  | "rm12_settings_runtime_inconsistent"
  | "rm12_evidence_incomplete"
  | "rm15_snapshot_not_read_only"
  | "rm15_snapshot_transport_enabled"
  | "rm15_paired_device_summary_mismatch"
  | "rm15_pending_confirmation_summary_mismatch"
  | "rm16_envelope_blocked"
  | "rm16_envelope_snapshot_mismatch";

export type HomeNodeNetworkingSetupDeniedAuthorityFlags = Record<
  HomeNodeNetworkingDeniedAuthority,
  true
>;

export type BuildHomeNodeNetworkingSetupCloseoutInput = {
  generatedAt: string;
  closeout: HomeNodeNetworkingPhaseCloseout;
  pairedDevices: readonly HomeNodePairedDeviceRecord[];
  pendingConfirmations: readonly HomeNodePendingConfirmationRecord[];
  snapshot: HomeNodeCompanionSafeMasterSnapshot;
  companionEnvelope: HomeNodeCompanionSessionEnvelope;
};

export type HomeNodeNetworkingSetupCloseout = {
  phase: typeof HOME_NODE_NETWORKING_SETUP_CLOSEOUT_PHASE;
  schemaVersion: typeof HOME_NODE_NETWORKING_SETUP_CLOSEOUT_SCHEMA_VERSION;
  generatedAt: string;
  readinessStatus: HomeNodeNetworkingSetupCloseoutStatus;
  completedRoadmapMasters: readonly ["RM12", "RM13", "RM14", "RM15", "RM16", "RM17"];
  remainingRoadmapMasters: readonly [];
  preTransportSetupStepsRemaining: 0;
  boundary: {
    selectedTransport: "none";
    runtimeProvider: "none";
    qrTransport: "none";
    requestAcceptance: "blocked";
    runtimeActivationStatus: "not_started";
    publicNetworkingEnabled: false;
    listenerSocketBound: false;
    remoteWritesAccepted: false;
    providerWritesAccepted: false;
    selectedTransportPersistenceEnabled: false;
  };
  prerequisites: {
    rm12CloseoutComplete: boolean;
    rm13LocalPairingLifecycleAvailable: true;
    rm14PendingConfirmationLifecycleAvailable: true;
    rm15CompanionSafeSnapshotAvailable: boolean;
    rm16CompanionSessionEnvelopeAvailable: boolean;
    setupCloseoutRecorded: true;
  };
  summary: {
    activePairedDevices: number;
    revokedPairedDevices: number;
    pendingConfirmations: number;
    confirmedLocallyConfirmations: number;
    dismissedConfirmations: number;
    expiredConfirmations: number;
    rejectedConfirmations: number;
    snapshotGeneratedAt: string;
    companionEnvelopeStatus: HomeNodeCompanionSessionEnvelope["status"];
  };
  diagnostics: {
    issues: HomeNodeNetworkingSetupCloseoutIssue[];
    closeoutSchemaVersion: HomeNodeNetworkingPhaseCloseout["schemaVersion"];
    snapshotSchemaVersion: HomeNodeCompanionSafeMasterSnapshot["schemaVersion"];
    companionEnvelopeSchemaVersion: HomeNodeCompanionSessionEnvelope["schemaVersion"];
    deniedAuthorityCount: number;
  };
  excludedContent: readonly string[];
  deniedAuthorityFlags: HomeNodeNetworkingSetupDeniedAuthorityFlags;
};

const buildDeniedAuthorityFlags = (): HomeNodeNetworkingSetupDeniedAuthorityFlags =>
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES.reduce(
    (flags, authority) => ({
      ...flags,
      [authority]: true,
    }),
    {} as HomeNodeNetworkingSetupDeniedAuthorityFlags
  );

const normalizeIsoOrFallback = (value: string, fallback: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const countStatus = <T extends { status: string }>(items: readonly T[], status: string) =>
  items.filter((item) => item.status === status).length;

const buildIssues = (
  input: BuildHomeNodeNetworkingSetupCloseoutInput
): HomeNodeNetworkingSetupCloseoutIssue[] => {
  const issues: HomeNodeNetworkingSetupCloseoutIssue[] = [];
  const activePairedDevices = countStatus(input.pairedDevices, "active");
  const revokedPairedDevices = countStatus(input.pairedDevices, "revoked");

  if (input.closeout.readinessStatus !== "ready_for_client_phase") {
    issues.push("rm12_closeout_blocked");
  }

  if (input.closeout.settingsRuntimeConsistency.consistent !== true) {
    issues.push("rm12_settings_runtime_inconsistent");
  }

  if (input.closeout.evidenceCompleteness.complete !== true) {
    issues.push("rm12_evidence_incomplete");
  }

  if (
    input.snapshot.capability.readOnly !== true ||
    input.snapshot.capability.commandsAccepted !== false ||
    input.snapshot.capability.writeCommandsIncluded !== false
  ) {
    issues.push("rm15_snapshot_not_read_only");
  }

  if (
    input.snapshot.homePcMaster.selectedTransport !== "none" ||
    input.snapshot.homePcMaster.runtimeProvider !== "none" ||
    input.snapshot.homePcMaster.qrTransport !== "none" ||
    input.snapshot.homePcMaster.requestAcceptance !== "blocked"
  ) {
    issues.push("rm15_snapshot_transport_enabled");
  }

  if (
    input.snapshot.devices.activeCount !== activePairedDevices ||
    input.snapshot.devices.revokedCount !== revokedPairedDevices
  ) {
    issues.push("rm15_paired_device_summary_mismatch");
  }

  if (
    input.snapshot.pendingConfirmations.pendingCount !==
      countStatus(input.pendingConfirmations, "pending") ||
    input.snapshot.pendingConfirmations.confirmedLocallyCount !==
      countStatus(input.pendingConfirmations, "confirmed_locally") ||
    input.snapshot.pendingConfirmations.dismissedCount !==
      countStatus(input.pendingConfirmations, "dismissed") ||
    input.snapshot.pendingConfirmations.expiredCount !==
      countStatus(input.pendingConfirmations, "expired") ||
    input.snapshot.pendingConfirmations.rejectedCount !==
      countStatus(input.pendingConfirmations, "rejected")
  ) {
    issues.push("rm15_pending_confirmation_summary_mismatch");
  }

  if (input.companionEnvelope.status !== "ready_for_local_companion_handoff") {
    issues.push("rm16_envelope_blocked");
  }

  if (
    input.companionEnvelope.payload.snapshotSchemaVersion !== input.snapshot.schemaVersion ||
    input.companionEnvelope.payload.snapshot.generatedAt !== input.snapshot.generatedAt ||
    input.companionEnvelope.payload.snapshot.devices.activeCount !==
      input.snapshot.devices.activeCount ||
    input.companionEnvelope.payload.snapshot.devices.revokedCount !==
      input.snapshot.devices.revokedCount ||
    input.companionEnvelope.payload.snapshot.pendingConfirmations.pendingCount !==
      input.snapshot.pendingConfirmations.pendingCount ||
    input.companionEnvelope.payload.snapshot.pendingConfirmations.confirmedLocallyCount !==
      input.snapshot.pendingConfirmations.confirmedLocallyCount ||
    input.companionEnvelope.payload.snapshot.pendingConfirmations.dismissedCount !==
      input.snapshot.pendingConfirmations.dismissedCount ||
    input.companionEnvelope.payload.snapshot.pendingConfirmations.expiredCount !==
      input.snapshot.pendingConfirmations.expiredCount ||
    input.companionEnvelope.payload.snapshot.pendingConfirmations.rejectedCount !==
      input.snapshot.pendingConfirmations.rejectedCount
  ) {
    issues.push("rm16_envelope_snapshot_mismatch");
  }

  return issues;
};

export const buildHomeNodeNetworkingSetupCloseout = (
  input: BuildHomeNodeNetworkingSetupCloseoutInput
): HomeNodeNetworkingSetupCloseout => {
  const generatedAt = normalizeIsoOrFallback(input.generatedAt, new Date(0).toISOString());
  const issues = buildIssues(input);

  return {
    phase: HOME_NODE_NETWORKING_SETUP_CLOSEOUT_PHASE,
    schemaVersion: HOME_NODE_NETWORKING_SETUP_CLOSEOUT_SCHEMA_VERSION,
    generatedAt,
    readinessStatus: issues.length === 0 ? "ready_for_transport_planning" : "blocked",
    completedRoadmapMasters: ["RM12", "RM13", "RM14", "RM15", "RM16", "RM17"],
    remainingRoadmapMasters: [],
    preTransportSetupStepsRemaining: 0,
    boundary: {
      selectedTransport: "none",
      runtimeProvider: "none",
      qrTransport: "none",
      requestAcceptance: "blocked",
      runtimeActivationStatus: "not_started",
      publicNetworkingEnabled: false,
      listenerSocketBound: false,
      remoteWritesAccepted: false,
      providerWritesAccepted: false,
      selectedTransportPersistenceEnabled: false,
    },
    prerequisites: {
      rm12CloseoutComplete:
        input.closeout.readinessStatus === "ready_for_client_phase" &&
        input.closeout.evidenceCompleteness.complete &&
        input.closeout.settingsRuntimeConsistency.consistent,
      rm13LocalPairingLifecycleAvailable: true,
      rm14PendingConfirmationLifecycleAvailable: true,
      rm15CompanionSafeSnapshotAvailable:
        input.snapshot.phase === "RM15" && input.snapshot.capability.readOnly === true,
      rm16CompanionSessionEnvelopeAvailable:
        input.companionEnvelope.phase === HOME_NODE_COMPANION_SESSION_ENVELOPE_PHASE,
      setupCloseoutRecorded: true,
    },
    summary: {
      activePairedDevices: countStatus(input.pairedDevices, "active"),
      revokedPairedDevices: countStatus(input.pairedDevices, "revoked"),
      pendingConfirmations: countStatus(input.pendingConfirmations, "pending"),
      confirmedLocallyConfirmations: countStatus(
        input.pendingConfirmations,
        "confirmed_locally"
      ),
      dismissedConfirmations: countStatus(input.pendingConfirmations, "dismissed"),
      expiredConfirmations: countStatus(input.pendingConfirmations, "expired"),
      rejectedConfirmations: countStatus(input.pendingConfirmations, "rejected"),
      snapshotGeneratedAt: input.snapshot.generatedAt,
      companionEnvelopeStatus: input.companionEnvelope.status,
    },
    diagnostics: {
      issues,
      closeoutSchemaVersion: input.closeout.schemaVersion,
      snapshotSchemaVersion: input.snapshot.schemaVersion,
      companionEnvelopeSchemaVersion: input.companionEnvelope.schemaVersion,
      deniedAuthorityCount: HOME_NODE_NETWORKING_DENIED_AUTHORITIES.length,
    },
    excludedContent: [
      "paired_device_ids",
      "paired_device_labels",
      "pending_confirmation_titles",
      "pending_confirmation_summaries",
      "raw_work_records",
      "provider_payloads",
      "endpoint_urls",
      "storage_paths",
      "tokens",
      "secrets",
      "transport_activation",
    ],
    deniedAuthorityFlags: buildDeniedAuthorityFlags(),
  };
};
