import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  type HomeNodeNetworkingDeniedAuthority,
} from "./homeNodeNetworkingCloseout";
import {
  canStageHomeNodeLocalRequestForDevice,
  type HomeNodePairedDeviceRecord,
} from "./homeNodeLocalPairingLifecycle";

export const HOME_NODE_PENDING_CONFIRMATION_PHASE = "RM14" as const;
export const HOME_NODE_PENDING_CONFIRMATION_SCHEMA_VERSION =
  "home-node-pending-confirmation.v1" as const;

export type HomeNodePendingConfirmationStatus =
  | "pending"
  | "confirmed_locally"
  | "dismissed"
  | "expired"
  | "rejected";

export type HomeNodePendingConfirmationActionKind =
  | "todo"
  | "project"
  | "mission_note"
  | "deadline";

export type HomeNodePendingConfirmationRejectionReason =
  | "client_confirmation_rejected"
  | "device_not_allowed"
  | "request_expired"
  | "record_not_pending";

export type HomeNodePendingConfirmationAuthorityFlags = Record<
  HomeNodeNetworkingDeniedAuthority,
  false
>;

export type StageHomeNodePendingConfirmationInput = {
  device: HomeNodePairedDeviceRecord | null;
  requestId: string;
  actionKind: HomeNodePendingConfirmationActionKind;
  requestedAt: string;
  expiresAt: string;
  title: string;
  summary: string;
  reason: string;
  confirmed?: boolean;
};

export type HomeNodePendingConfirmationRecord = {
  schemaVersion: typeof HOME_NODE_PENDING_CONFIRMATION_SCHEMA_VERSION;
  confirmationId: string;
  sourceDeviceId: string | null;
  sourceDeviceStatus: HomeNodePairedDeviceRecord["status"] | "unknown";
  actionKind: HomeNodePendingConfirmationActionKind;
  status: HomeNodePendingConfirmationStatus;
  requestedAt: string;
  expiresAt: string;
  resolvedAt: string | null;
  title: string;
  summary: string;
  reason: string;
  writeBoundary: "pending_local_confirmation_only";
  localOperatorConfirmationRequired: true;
  clientConfirmed: false;
  workMutationApplied: false;
  directRemoteWritePerformed: false;
  providerWritesPerformed: false;
  rawRequestIncluded: false;
  unsafeContentIncluded: false;
  providerPayloadIncluded: false;
  endpointUrlIncluded: false;
  storagePathIncluded: false;
  authorityFlags: HomeNodePendingConfirmationAuthorityFlags;
};

export type HomeNodePendingConfirmationAuditEventType =
  | "pending_confirmation_staged"
  | "pending_confirmation_rejected"
  | "pending_confirmation_confirmed_locally"
  | "pending_confirmation_dismissed"
  | "pending_confirmation_expired"
  | "pending_confirmation_revoked_device_blocked";

export type HomeNodePendingConfirmationAuditEvent = {
  schemaVersion: typeof HOME_NODE_PENDING_CONFIRMATION_SCHEMA_VERSION;
  type: HomeNodePendingConfirmationAuditEventType;
  confirmationId: string;
  sourceDeviceId: string | null;
  occurredAt: string;
  status: HomeNodePendingConfirmationStatus;
  writeBoundary: "pending_local_confirmation_only";
  workMutationApplied: false;
  directRemoteWritePerformed: false;
  providerWritesPerformed: false;
};

export type StageHomeNodePendingConfirmationResult =
  | {
      ok: true;
      confirmation: HomeNodePendingConfirmationRecord;
      auditEvents: HomeNodePendingConfirmationAuditEvent[];
    }
  | {
      ok: false;
      reason: HomeNodePendingConfirmationRejectionReason;
      confirmation: HomeNodePendingConfirmationRecord;
      auditEvents: HomeNodePendingConfirmationAuditEvent[];
    };

export type ResolveHomeNodePendingConfirmationResult =
  | {
      ok: true;
      confirmation: HomeNodePendingConfirmationRecord;
      auditEvents: HomeNodePendingConfirmationAuditEvent[];
    }
  | {
      ok: false;
      reason: HomeNodePendingConfirmationRejectionReason;
      confirmation: HomeNodePendingConfirmationRecord;
      auditEvents: HomeNodePendingConfirmationAuditEvent[];
    };

const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const SAFE_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .,:;!?()/_-]{0,159}$/;
const UNSAFE_TEXT_PATTERN =
  /(https?:\/\/|[A-Z]:\\|\\\\|@|token|secret|password|credential|provider|payload|invoice|account|acct|subject|message|body|db\.sqlite|appdata)/i;

const actionKinds = new Set<HomeNodePendingConfirmationActionKind>([
  "todo",
  "project",
  "mission_note",
  "deadline",
]);

const buildAuthorityFlags = (): HomeNodePendingConfirmationAuthorityFlags =>
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES.reduce(
    (flags, authority) => ({
      ...flags,
      [authority]: false,
    }),
    {} as HomeNodePendingConfirmationAuthorityFlags
  );

const normalizeIsoOrFallback = (value: string, fallback: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
};

const normalizeIsoOrNull = (value: string | null) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeSourceDeviceStatus = (
  value: HomeNodePendingConfirmationRecord["sourceDeviceStatus"]
): HomeNodePendingConfirmationRecord["sourceDeviceStatus"] =>
  value === "active" || value === "revoked" ? value : "unknown";

const normalizeId = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return SAFE_ID_PATTERN.test(trimmed) ? trimmed : fallback;
};

const sanitizeSummaryText = (value: string, fallback: string) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0 || UNSAFE_TEXT_PATTERN.test(trimmed)) {
    return fallback;
  }

  return SAFE_TEXT_PATTERN.test(trimmed) ? trimmed : fallback;
};

const normalizeActionKind = (value: HomeNodePendingConfirmationActionKind) =>
  actionKinds.has(value) ? value : "todo";

const isExpiredAt = (expiresAt: string, now: string) =>
  Date.parse(normalizeIsoOrFallback(now, expiresAt)) >= Date.parse(expiresAt);

const buildAuditEvent = (
  type: HomeNodePendingConfirmationAuditEventType,
  confirmation: HomeNodePendingConfirmationRecord,
  occurredAt: string
): HomeNodePendingConfirmationAuditEvent => ({
  schemaVersion: HOME_NODE_PENDING_CONFIRMATION_SCHEMA_VERSION,
  type,
  confirmationId: confirmation.confirmationId,
  sourceDeviceId: confirmation.sourceDeviceId,
  occurredAt,
  status: confirmation.status,
  writeBoundary: "pending_local_confirmation_only",
  workMutationApplied: false,
  directRemoteWritePerformed: false,
  providerWritesPerformed: false,
});

const copyConfirmationWithStatus = (
  confirmation: HomeNodePendingConfirmationRecord,
  status: HomeNodePendingConfirmationStatus,
  resolvedAt: string | null
): HomeNodePendingConfirmationRecord => {
  const requestedAt = normalizeIsoOrFallback(confirmation.requestedAt, new Date(0).toISOString());

  return {
    schemaVersion: HOME_NODE_PENDING_CONFIRMATION_SCHEMA_VERSION,
    confirmationId: normalizeId(confirmation.confirmationId, "confirmation-redacted"),
    sourceDeviceId: confirmation.sourceDeviceId
      ? normalizeId(confirmation.sourceDeviceId, "device-redacted")
      : null,
    sourceDeviceStatus: normalizeSourceDeviceStatus(confirmation.sourceDeviceStatus),
    actionKind: normalizeActionKind(confirmation.actionKind),
    status,
    requestedAt,
    expiresAt: normalizeIsoOrFallback(confirmation.expiresAt, requestedAt),
    resolvedAt: normalizeIsoOrNull(resolvedAt),
    title: sanitizeSummaryText(confirmation.title, "Local review request"),
    summary: sanitizeSummaryText(confirmation.summary, "Summary redacted for local review."),
    reason: sanitizeSummaryText(confirmation.reason, "Reason redacted for local review."),
    writeBoundary: "pending_local_confirmation_only",
    localOperatorConfirmationRequired: true,
    clientConfirmed: false,
    workMutationApplied: false,
    directRemoteWritePerformed: false,
    providerWritesPerformed: false,
    rawRequestIncluded: false,
    unsafeContentIncluded: false,
    providerPayloadIncluded: false,
    endpointUrlIncluded: false,
    storagePathIncluded: false,
    authorityFlags: buildAuthorityFlags(),
  };
};

const buildConfirmationRecord = (
  input: StageHomeNodePendingConfirmationInput,
  status: HomeNodePendingConfirmationStatus,
  resolvedAt: string | null
): HomeNodePendingConfirmationRecord => {
  const requestedAt = normalizeIsoOrFallback(input.requestedAt, new Date(0).toISOString());
  const expiresAt = normalizeIsoOrFallback(input.expiresAt, requestedAt);

  return {
    schemaVersion: HOME_NODE_PENDING_CONFIRMATION_SCHEMA_VERSION,
    confirmationId: normalizeId(input.requestId, "confirmation-redacted"),
    sourceDeviceId: input.device ? normalizeId(input.device.deviceId, "device-redacted") : null,
    sourceDeviceStatus: input.device ? normalizeSourceDeviceStatus(input.device.status) : "unknown",
    actionKind: normalizeActionKind(input.actionKind),
    status,
    requestedAt,
    expiresAt,
    resolvedAt: normalizeIsoOrNull(resolvedAt),
    title: sanitizeSummaryText(input.title, "Local review request"),
    summary: sanitizeSummaryText(input.summary, "Summary redacted for local review."),
    reason: sanitizeSummaryText(input.reason, "Reason redacted for local review."),
    writeBoundary: "pending_local_confirmation_only",
    localOperatorConfirmationRequired: true,
    clientConfirmed: false,
    workMutationApplied: false,
    directRemoteWritePerformed: false,
    providerWritesPerformed: false,
    rawRequestIncluded: false,
    unsafeContentIncluded: false,
    providerPayloadIncluded: false,
    endpointUrlIncluded: false,
    storagePathIncluded: false,
    authorityFlags: buildAuthorityFlags(),
  };
};

export const stageHomeNodePendingConfirmation = (
  input: StageHomeNodePendingConfirmationInput
): StageHomeNodePendingConfirmationResult => {
  const requestedAt = normalizeIsoOrFallback(input.requestedAt, new Date(0).toISOString());

  if (input.confirmed === true) {
    const confirmation = buildConfirmationRecord(input, "rejected", requestedAt);
    return {
      ok: false,
      reason: "client_confirmation_rejected",
      confirmation,
      auditEvents: [
        buildAuditEvent("pending_confirmation_rejected", confirmation, requestedAt),
      ],
    };
  }

  if (!canStageHomeNodeLocalRequestForDevice(input.device)) {
    const confirmation = buildConfirmationRecord(input, "rejected", requestedAt);
    const type =
      input.device?.status === "revoked"
        ? "pending_confirmation_revoked_device_blocked"
        : "pending_confirmation_rejected";

    return {
      ok: false,
      reason: "device_not_allowed",
      confirmation,
      auditEvents: [buildAuditEvent(type, confirmation, requestedAt)],
    };
  }

  if (isExpiredAt(normalizeIsoOrFallback(input.expiresAt, requestedAt), requestedAt)) {
    const confirmation = buildConfirmationRecord(input, "expired", requestedAt);
    return {
      ok: false,
      reason: "request_expired",
      confirmation,
      auditEvents: [
        buildAuditEvent("pending_confirmation_expired", confirmation, requestedAt),
      ],
    };
  }

  const confirmation = buildConfirmationRecord(input, "pending", null);
  return {
    ok: true,
    confirmation,
    auditEvents: [
      buildAuditEvent("pending_confirmation_staged", confirmation, requestedAt),
    ],
  };
};

export const confirmHomeNodePendingConfirmationLocally = (
  confirmation: HomeNodePendingConfirmationRecord,
  confirmedAt: string
): ResolveHomeNodePendingConfirmationResult => {
  const occurredAt = normalizeIsoOrFallback(confirmedAt, confirmation.requestedAt);

  if (confirmation.status !== "pending") {
    const blockedConfirmation = copyConfirmationWithStatus(
      confirmation,
      confirmation.status,
      confirmation.resolvedAt
    );
    return {
      ok: false,
      reason: "record_not_pending",
      confirmation: blockedConfirmation,
      auditEvents: [
        buildAuditEvent("pending_confirmation_rejected", blockedConfirmation, occurredAt),
      ],
    };
  }

  if (isExpiredAt(confirmation.expiresAt, occurredAt)) {
    const expiredConfirmation = copyConfirmationWithStatus(confirmation, "expired", occurredAt);
    return {
      ok: false,
      reason: "request_expired",
      confirmation: expiredConfirmation,
      auditEvents: [
        buildAuditEvent("pending_confirmation_expired", expiredConfirmation, occurredAt),
      ],
    };
  }

  const confirmedConfirmation = copyConfirmationWithStatus(
    confirmation,
    "confirmed_locally",
    occurredAt
  );

  return {
    ok: true,
    confirmation: confirmedConfirmation,
    auditEvents: [
      buildAuditEvent(
        "pending_confirmation_confirmed_locally",
        confirmedConfirmation,
        occurredAt
      ),
    ],
  };
};

export const dismissHomeNodePendingConfirmation = (
  confirmation: HomeNodePendingConfirmationRecord,
  dismissedAt: string
): ResolveHomeNodePendingConfirmationResult => {
  const occurredAt = normalizeIsoOrFallback(dismissedAt, confirmation.requestedAt);

  if (confirmation.status !== "pending") {
    const blockedConfirmation = copyConfirmationWithStatus(
      confirmation,
      confirmation.status,
      confirmation.resolvedAt
    );
    return {
      ok: false,
      reason: "record_not_pending",
      confirmation: blockedConfirmation,
      auditEvents: [
        buildAuditEvent("pending_confirmation_rejected", blockedConfirmation, occurredAt),
      ],
    };
  }

  const dismissedConfirmation = copyConfirmationWithStatus(
    confirmation,
    "dismissed",
    occurredAt
  );

  return {
    ok: true,
    confirmation: dismissedConfirmation,
    auditEvents: [
      buildAuditEvent("pending_confirmation_dismissed", dismissedConfirmation, occurredAt),
    ],
  };
};

export const expireHomeNodePendingConfirmation = (
  confirmation: HomeNodePendingConfirmationRecord,
  expiredAt: string
): ResolveHomeNodePendingConfirmationResult => {
  const occurredAt = normalizeIsoOrFallback(expiredAt, confirmation.expiresAt);

  if (confirmation.status !== "pending") {
    const blockedConfirmation = copyConfirmationWithStatus(
      confirmation,
      confirmation.status,
      confirmation.resolvedAt
    );
    return {
      ok: false,
      reason: "record_not_pending",
      confirmation: blockedConfirmation,
      auditEvents: [
        buildAuditEvent("pending_confirmation_rejected", blockedConfirmation, occurredAt),
      ],
    };
  }

  const expiredConfirmation = copyConfirmationWithStatus(confirmation, "expired", occurredAt);

  return {
    ok: true,
    confirmation: expiredConfirmation,
    auditEvents: [
      buildAuditEvent("pending_confirmation_expired", expiredConfirmation, occurredAt),
    ],
  };
};
