import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  type HomeNodeNetworkingDeniedAuthority,
} from "./homeNodeNetworkingCloseout";
import type {
  HomeNodeLocalPairingScope,
  HomeNodePairedDeviceRecord,
} from "./homeNodeLocalPairingLifecycle";
import type { HomeNodeCompanionSafeMasterSnapshot } from "./homeNodeCompanionSafeMasterSnapshot";

export const HOME_NODE_COMPANION_SESSION_ENVELOPE_PHASE = "RM16" as const;
export const HOME_NODE_COMPANION_SESSION_ENVELOPE_SCHEMA_VERSION =
  "home-node-companion-session-envelope.v1" as const;

export type HomeNodeCompanionSessionEnvelopeStatus =
  | "ready_for_local_companion_handoff"
  | "blocked";

export type HomeNodeCompanionSessionEnvelopeIssue =
  | "paired_device_missing"
  | "paired_device_not_active"
  | "read_scope_missing"
  | "handoff_window_expired"
  | "snapshot_schema_unrecognized"
  | "snapshot_not_read_only"
  | "snapshot_accepts_commands"
  | "snapshot_transport_enabled"
  | "snapshot_closeout_incomplete";

export type HomeNodeCompanionSessionEnvelopeAuthorityFlags = Record<
  HomeNodeNetworkingDeniedAuthority,
  false
>;

export type BuildHomeNodeCompanionSessionEnvelopeInput = {
  envelopeId: string;
  generatedAt: string;
  expiresAt: string;
  pairedDevice: HomeNodePairedDeviceRecord | null;
  snapshot: HomeNodeCompanionSafeMasterSnapshot;
};

export type HomeNodeCompanionSessionEnvelope = {
  phase: typeof HOME_NODE_COMPANION_SESSION_ENVELOPE_PHASE;
  schemaVersion: typeof HOME_NODE_COMPANION_SESSION_ENVELOPE_SCHEMA_VERSION;
  envelopeId: string;
  generatedAt: string;
  expiresAt: string;
  status: HomeNodeCompanionSessionEnvelopeStatus;
  recipient: {
    pairedDeviceStatus: HomeNodePairedDeviceRecord["status"] | "missing";
    localRecordOnly: true;
    readMasterSnapshotScope: boolean;
    stagePendingConfirmationScope: boolean;
    deviceIdIncluded: false;
    deviceLabelIncluded: false;
  };
  handoff: {
    selectedTransport: "none";
    runtimeProvider: "none";
    qrTransport: "none";
    requestAcceptance: "blocked";
    localOnly: true;
    endpointUrlIncluded: false;
    relayPayloadIncluded: false;
    socketListenerBound: false;
    publicNetworkReachable: false;
    providerPayloadIncluded: false;
    storagePathIncluded: false;
  };
  payload: {
    snapshotSchemaVersion: HomeNodeCompanionSafeMasterSnapshot["schemaVersion"];
    snapshot: HomeNodeCompanionSafeMasterSnapshot;
    rawWorkIncluded: false;
    commandPayloadIncluded: false;
    providerPayloadIncluded: false;
    endpointUrlIncluded: false;
    storagePathIncluded: false;
    tokenIncluded: false;
  };
  diagnostics: {
    issues: HomeNodeCompanionSessionEnvelopeIssue[];
    snapshotReadOnly: boolean;
    snapshotTransportNeutral: boolean;
    closeoutEvidenceComplete: boolean;
  };
  excludedContent: readonly string[];
  authorityFlags: HomeNodeCompanionSessionEnvelopeAuthorityFlags;
};

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

const buildAuthorityFlags = (): HomeNodeCompanionSessionEnvelopeAuthorityFlags =>
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES.reduce(
    (flags, authority) => ({
      ...flags,
      [authority]: false,
    }),
    {} as HomeNodeCompanionSessionEnvelopeAuthorityFlags
  );

const normalizeIsoOrFallback = (value: string, fallback: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const normalizeId = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return SAFE_ID_PATTERN.test(trimmed) ? trimmed : fallback;
};

const hasScope = (
  pairedDevice: HomeNodePairedDeviceRecord | null,
  scope: HomeNodeLocalPairingScope
) => pairedDevice?.scopes.includes(scope) === true;

const buildIssues = (
  input: BuildHomeNodeCompanionSessionEnvelopeInput,
  generatedAt: string,
  expiresAt: string
): HomeNodeCompanionSessionEnvelopeIssue[] => {
  const issues: HomeNodeCompanionSessionEnvelopeIssue[] = [];

  if (!input.pairedDevice) {
    issues.push("paired_device_missing");
  } else if (input.pairedDevice.status !== "active") {
    issues.push("paired_device_not_active");
  }

  if (!hasScope(input.pairedDevice, "read_master_snapshot")) {
    issues.push("read_scope_missing");
  }

  if (Date.parse(expiresAt) <= Date.parse(generatedAt)) {
    issues.push("handoff_window_expired");
  }

  if (input.snapshot.schemaVersion !== "home-node-companion-safe-master-snapshot.v1") {
    issues.push("snapshot_schema_unrecognized");
  }

  if (input.snapshot.capability.readOnly !== true) {
    issues.push("snapshot_not_read_only");
  }

  if (input.snapshot.capability.commandsAccepted !== false) {
    issues.push("snapshot_accepts_commands");
  }

  if (
    input.snapshot.homePcMaster.selectedTransport !== "none" ||
    input.snapshot.homePcMaster.runtimeProvider !== "none" ||
    input.snapshot.homePcMaster.qrTransport !== "none" ||
    input.snapshot.homePcMaster.requestAcceptance !== "blocked"
  ) {
    issues.push("snapshot_transport_enabled");
  }

  if (input.snapshot.homePcMaster.closeoutEvidenceComplete !== true) {
    issues.push("snapshot_closeout_incomplete");
  }

  return issues;
};

export const buildHomeNodeCompanionSessionEnvelope = (
  input: BuildHomeNodeCompanionSessionEnvelopeInput
): HomeNodeCompanionSessionEnvelope => {
  const generatedAt = normalizeIsoOrFallback(input.generatedAt, new Date(0).toISOString());
  const expiresAt = normalizeIsoOrFallback(input.expiresAt, generatedAt);
  const issues = buildIssues(input, generatedAt, expiresAt);

  return {
    phase: HOME_NODE_COMPANION_SESSION_ENVELOPE_PHASE,
    schemaVersion: HOME_NODE_COMPANION_SESSION_ENVELOPE_SCHEMA_VERSION,
    envelopeId: normalizeId(input.envelopeId, "envelope-redacted"),
    generatedAt,
    expiresAt,
    status: issues.length === 0 ? "ready_for_local_companion_handoff" : "blocked",
    recipient: {
      pairedDeviceStatus: input.pairedDevice?.status ?? "missing",
      localRecordOnly: true,
      readMasterSnapshotScope: hasScope(input.pairedDevice, "read_master_snapshot"),
      stagePendingConfirmationScope: hasScope(input.pairedDevice, "stage_pending_confirmation"),
      deviceIdIncluded: false,
      deviceLabelIncluded: false,
    },
    handoff: {
      selectedTransport: "none",
      runtimeProvider: "none",
      qrTransport: "none",
      requestAcceptance: "blocked",
      localOnly: true,
      endpointUrlIncluded: false,
      relayPayloadIncluded: false,
      socketListenerBound: false,
      publicNetworkReachable: false,
      providerPayloadIncluded: false,
      storagePathIncluded: false,
    },
    payload: {
      snapshotSchemaVersion: input.snapshot.schemaVersion,
      snapshot: input.snapshot,
      rawWorkIncluded: false,
      commandPayloadIncluded: false,
      providerPayloadIncluded: false,
      endpointUrlIncluded: false,
      storagePathIncluded: false,
      tokenIncluded: false,
    },
    diagnostics: {
      issues,
      snapshotReadOnly: input.snapshot.capability.readOnly === true,
      snapshotTransportNeutral:
        input.snapshot.homePcMaster.selectedTransport === "none" &&
        input.snapshot.homePcMaster.runtimeProvider === "none" &&
        input.snapshot.homePcMaster.qrTransport === "none" &&
        input.snapshot.homePcMaster.requestAcceptance === "blocked",
      closeoutEvidenceComplete: input.snapshot.homePcMaster.closeoutEvidenceComplete === true,
    },
    excludedContent: [
      "paired_device_ids",
      "paired_device_labels",
      "raw_work_records",
      "raw_pending_confirmation_requests",
      "command_payloads",
      "provider_payloads",
      "endpoint_urls",
      "storage_paths",
      "tokens",
      "secrets",
    ],
    authorityFlags: buildAuthorityFlags(),
  };
};
