import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  type HomeNodeNetworkingDeniedAuthority,
} from "./homeNodeNetworkingCloseout";

export const HOME_NODE_LOCAL_PAIRING_LIFECYCLE_PHASE = "RM13" as const;
export const HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION =
  "home-node-local-pairing-lifecycle.v1" as const;
export const HOME_NODE_LOCAL_PAIRING_QR_SCHEMA_VERSION =
  "home-node-local-pairing-qr.v1" as const;

export type HomeNodeLocalPairingTransport = "none";
export type HomeNodeLocalPairingRequestAcceptance = "blocked";
export type HomeNodeLocalPairingOfferStatus =
  | "pending"
  | "completed"
  | "revoked"
  | "expired";
export type HomeNodePairedDeviceStatus = "active" | "revoked";
export type HomeNodeLocalRequestStagingStatus = "allowed" | "blocked";
export type HomeNodeLocalPairingScope =
  | "read_master_snapshot"
  | "stage_pending_confirmation";

export type HomeNodeLocalPairingAuditEventType =
  | "offer_created"
  | "qr_payload_built"
  | "handoff_completed"
  | "handoff_denied"
  | "offer_revoked"
  | "offer_expired"
  | "device_revoked";

export type HomeNodeLocalPairingAuthorityFlags = Record<
  HomeNodeNetworkingDeniedAuthority,
  false
>;

export type CreateHomeNodeLocalPairingOfferInput = {
  offerId: string;
  oneTimeCode: string;
  createdAt: string;
  expiresAt: string;
  deviceLabel?: string | null;
  requestedScopes?: readonly HomeNodeLocalPairingScope[];
};

export type HomeNodeLocalPairingOfferRecord = {
  schemaVersion: typeof HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION;
  offerId: string;
  status: HomeNodeLocalPairingOfferStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  completedAt: string | null;
  completedDeviceId: string | null;
  deviceLabel: string | null;
  oneTimeCodeFingerprint: string;
  requestedScopes: HomeNodeLocalPairingScope[];
  selectedTransport: HomeNodeLocalPairingTransport;
  qrTransport: HomeNodeLocalPairingTransport;
  requestAcceptance: HomeNodeLocalPairingRequestAcceptance;
  rawOneTimeCodeStored: false;
  authorityFlags: HomeNodeLocalPairingAuthorityFlags;
};

export type HomeNodeLocalPairingQrPayload = {
  schemaVersion: typeof HOME_NODE_LOCAL_PAIRING_QR_SCHEMA_VERSION;
  offerId: string;
  expiresAt: string;
  oneTimeCodeFingerprint: string;
  requestedScopes: HomeNodeLocalPairingScope[];
  selectedTransport: HomeNodeLocalPairingTransport;
  qrTransport: HomeNodeLocalPairingTransport;
  requestAcceptance: HomeNodeLocalPairingRequestAcceptance;
  rawOneTimeCodeIncluded: false;
  endpointUrlIncluded: false;
  providerPayloadIncluded: false;
  storagePathIncluded: false;
  authorityFlags: HomeNodeLocalPairingAuthorityFlags;
};

export type HomeNodePairedDeviceRecord = {
  schemaVersion: typeof HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION;
  deviceId: string;
  label: string;
  pairedAt: string;
  revokedAt: string | null;
  status: HomeNodePairedDeviceStatus;
  scopes: HomeNodeLocalPairingScope[];
  selectedTransport: HomeNodeLocalPairingTransport;
  qrTransport: HomeNodeLocalPairingTransport;
  requestAcceptance: HomeNodeLocalPairingRequestAcceptance;
  localRequestStagingStatus: HomeNodeLocalRequestStagingStatus;
  writeBoundary: "pending_local_confirmation_only";
  authorityFlags: HomeNodeLocalPairingAuthorityFlags;
};

export type HomeNodeLocalPairingAuditEvent = {
  schemaVersion: typeof HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION;
  type: HomeNodeLocalPairingAuditEventType;
  offerId: string | null;
  deviceId: string | null;
  occurredAt: string;
  status: HomeNodeLocalPairingOfferStatus | HomeNodePairedDeviceStatus | "denied";
  selectedTransport: HomeNodeLocalPairingTransport;
  qrTransport: HomeNodeLocalPairingTransport;
  requestAcceptance: HomeNodeLocalPairingRequestAcceptance;
};

export type CompleteHomeNodeLocalPairingHandoffInput = {
  offer: HomeNodeLocalPairingOfferRecord;
  oneTimeCode: string;
  deviceId: string;
  deviceLabel?: string | null;
  completedAt: string;
};

export type CompleteHomeNodeLocalPairingHandoffResult =
  | {
      ok: true;
      offer: HomeNodeLocalPairingOfferRecord;
      pairedDevice: HomeNodePairedDeviceRecord;
      auditEvents: HomeNodeLocalPairingAuditEvent[];
    }
  | {
      ok: false;
      reason: "offer_not_pending" | "offer_expired" | "one_time_code_mismatch";
      offer: HomeNodeLocalPairingOfferRecord;
      pairedDevice: null;
      auditEvents: HomeNodeLocalPairingAuditEvent[];
    };

const DEFAULT_PAIRING_SCOPES: HomeNodeLocalPairingScope[] = [
  "read_master_snapshot",
  "stage_pending_confirmation",
];

const pairingScopeSet = new Set<HomeNodeLocalPairingScope>(DEFAULT_PAIRING_SCOPES);
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._():-]{0,79}$/;
const SAFE_FINGERPRINT_PATTERN = /^fp_[a-f0-9]{8}$/;

const buildAuthorityFlags = (): HomeNodeLocalPairingAuthorityFlags =>
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES.reduce(
    (flags, authority) => ({
      ...flags,
      [authority]: false,
    }),
    {} as HomeNodeLocalPairingAuthorityFlags
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

const normalizeId = (value: string, fallback: string) => {
  const trimmed = value.trim();
  return SAFE_ID_PATTERN.test(trimmed) ? trimmed : fallback;
};

const normalizeLabel = (value: string | null | undefined, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return SAFE_LABEL_PATTERN.test(trimmed) ? trimmed : fallback;
};

const normalizeScopes = (
  scopes: readonly HomeNodeLocalPairingScope[] | undefined
): HomeNodeLocalPairingScope[] => {
  const normalizedScopes =
    scopes?.filter(
      (scope, index, allScopes) => pairingScopeSet.has(scope) && allScopes.indexOf(scope) === index
    ) ??
    DEFAULT_PAIRING_SCOPES;

  return normalizedScopes.length > 0 ? normalizedScopes : DEFAULT_PAIRING_SCOPES;
};

const normalizeFingerprint = (value: string) =>
  SAFE_FINGERPRINT_PATTERN.test(value) ? value : "fp_redacted";

const fingerprintOneTimeCode = (offerId: string, oneTimeCode: string) => {
  const material = `${offerId}:${oneTimeCode.trim()}`;
  let hash = 0x811c9dc5;

  for (let index = 0; index < material.length; index += 1) {
    hash ^= material.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fp_${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const buildAuditEvent = (
  type: HomeNodeLocalPairingAuditEventType,
  occurredAt: string,
  status: HomeNodeLocalPairingAuditEvent["status"],
  offerId: string | null,
  deviceId: string | null = null
): HomeNodeLocalPairingAuditEvent => ({
  schemaVersion: HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION,
  type,
  offerId,
  deviceId,
  occurredAt,
  status,
  selectedTransport: "none",
  qrTransport: "none",
  requestAcceptance: "blocked",
});

const copyOfferWithStatus = (
  offer: HomeNodeLocalPairingOfferRecord,
  status: HomeNodeLocalPairingOfferStatus,
  changedAt: string,
  completedDeviceId: string | null = offer.completedDeviceId
): HomeNodeLocalPairingOfferRecord => ({
  schemaVersion: HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION,
  offerId: normalizeId(offer.offerId, "offer-redacted"),
  status,
  createdAt: normalizeIsoOrFallback(offer.createdAt, changedAt),
  expiresAt: normalizeIsoOrFallback(offer.expiresAt, changedAt),
  revokedAt: status === "revoked" ? changedAt : normalizeIsoOrNull(offer.revokedAt),
  completedAt: status === "completed" ? changedAt : normalizeIsoOrNull(offer.completedAt),
  completedDeviceId:
    status === "completed"
      ? completedDeviceId
      : offer.completedDeviceId
        ? normalizeId(offer.completedDeviceId, "device-redacted")
        : null,
  deviceLabel: normalizeLabel(offer.deviceLabel, "Local device"),
  oneTimeCodeFingerprint: normalizeFingerprint(offer.oneTimeCodeFingerprint),
  requestedScopes: normalizeScopes(offer.requestedScopes),
  selectedTransport: "none",
  qrTransport: "none",
  requestAcceptance: "blocked",
  rawOneTimeCodeStored: false,
  authorityFlags: buildAuthorityFlags(),
});

export const createHomeNodeLocalPairingOffer = (
  input: CreateHomeNodeLocalPairingOfferInput
): {
  offer: HomeNodeLocalPairingOfferRecord;
  auditEvents: HomeNodeLocalPairingAuditEvent[];
} => {
  const offerId = normalizeId(input.offerId, "offer-redacted");
  const createdAt = normalizeIsoOrFallback(input.createdAt, new Date(0).toISOString());
  const expiresAt = normalizeIsoOrFallback(input.expiresAt, createdAt);
  const requestedScopes = normalizeScopes(input.requestedScopes);
  const offer: HomeNodeLocalPairingOfferRecord = {
    schemaVersion: HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION,
    offerId,
    status: Date.parse(expiresAt) <= Date.parse(createdAt) ? "expired" : "pending",
    createdAt,
    expiresAt,
    revokedAt: null,
    completedAt: null,
    completedDeviceId: null,
    deviceLabel: normalizeLabel(input.deviceLabel, "Local device"),
    oneTimeCodeFingerprint: fingerprintOneTimeCode(offerId, input.oneTimeCode),
    requestedScopes,
    selectedTransport: "none",
    qrTransport: "none",
    requestAcceptance: "blocked",
    rawOneTimeCodeStored: false,
    authorityFlags: buildAuthorityFlags(),
  };

  return {
    offer,
    auditEvents: [buildAuditEvent("offer_created", createdAt, offer.status, offer.offerId)],
  };
};

export const buildHomeNodeLocalPairingQrPayload = (
  offer: HomeNodeLocalPairingOfferRecord,
  builtAt: string
): {
  qrPayload: HomeNodeLocalPairingQrPayload;
  auditEvents: HomeNodeLocalPairingAuditEvent[];
} => {
  const occurredAt = normalizeIsoOrFallback(builtAt, offer.createdAt);
  const qrPayload: HomeNodeLocalPairingQrPayload = {
    schemaVersion: HOME_NODE_LOCAL_PAIRING_QR_SCHEMA_VERSION,
    offerId: normalizeId(offer.offerId, "offer-redacted"),
    expiresAt: normalizeIsoOrFallback(offer.expiresAt, occurredAt),
    oneTimeCodeFingerprint: offer.oneTimeCodeFingerprint,
    requestedScopes: normalizeScopes(offer.requestedScopes),
    selectedTransport: "none",
    qrTransport: "none",
    requestAcceptance: "blocked",
    rawOneTimeCodeIncluded: false,
    endpointUrlIncluded: false,
    providerPayloadIncluded: false,
    storagePathIncluded: false,
    authorityFlags: buildAuthorityFlags(),
  };

  return {
    qrPayload,
    auditEvents: [buildAuditEvent("qr_payload_built", occurredAt, offer.status, qrPayload.offerId)],
  };
};

export const isHomeNodeLocalPairingOfferExpired = (
  offer: HomeNodeLocalPairingOfferRecord,
  now: string
) => Date.parse(normalizeIsoOrFallback(now, offer.expiresAt)) >= Date.parse(offer.expiresAt);

export const revokeHomeNodeLocalPairingOffer = (
  offer: HomeNodeLocalPairingOfferRecord,
  revokedAt: string
) => {
  const occurredAt = normalizeIsoOrFallback(revokedAt, offer.createdAt);
  const revokedOffer =
    offer.status === "pending"
      ? copyOfferWithStatus(offer, "revoked", occurredAt)
      : copyOfferWithStatus(offer, offer.status, occurredAt);

  return {
    offer: revokedOffer,
    auditEvents: [
      buildAuditEvent("offer_revoked", occurredAt, revokedOffer.status, revokedOffer.offerId),
    ],
  };
};

export const completeHomeNodeLocalPairingHandoff = (
  input: CompleteHomeNodeLocalPairingHandoffInput
): CompleteHomeNodeLocalPairingHandoffResult => {
  const completedAt = normalizeIsoOrFallback(input.completedAt, input.offer.createdAt);
  const offerId = normalizeId(input.offer.offerId, "offer-redacted");

  if (input.offer.status !== "pending") {
    const blockedOffer = copyOfferWithStatus(input.offer, input.offer.status, completedAt);
    return {
      ok: false,
      reason: "offer_not_pending",
      offer: blockedOffer,
      pairedDevice: null,
      auditEvents: [buildAuditEvent("handoff_denied", completedAt, "denied", offerId)],
    };
  }

  if (isHomeNodeLocalPairingOfferExpired(input.offer, completedAt)) {
    const expiredOffer = copyOfferWithStatus(input.offer, "expired", completedAt);
    return {
      ok: false,
      reason: "offer_expired",
      offer: expiredOffer,
      pairedDevice: null,
      auditEvents: [buildAuditEvent("offer_expired", completedAt, "expired", offerId)],
    };
  }

  if (fingerprintOneTimeCode(offerId, input.oneTimeCode) !== input.offer.oneTimeCodeFingerprint) {
    const blockedOffer = copyOfferWithStatus(input.offer, "pending", completedAt);
    return {
      ok: false,
      reason: "one_time_code_mismatch",
      offer: blockedOffer,
      pairedDevice: null,
      auditEvents: [buildAuditEvent("handoff_denied", completedAt, "denied", offerId)],
    };
  }

  const deviceId = normalizeId(input.deviceId, "device-redacted");
  const pairedDevice: HomeNodePairedDeviceRecord = {
    schemaVersion: HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION,
    deviceId,
    label: normalizeLabel(input.deviceLabel ?? input.offer.deviceLabel, "Local device"),
    pairedAt: completedAt,
    revokedAt: null,
    status: "active",
    scopes: normalizeScopes(input.offer.requestedScopes),
    selectedTransport: "none",
    qrTransport: "none",
    requestAcceptance: "blocked",
    localRequestStagingStatus: "allowed",
    writeBoundary: "pending_local_confirmation_only",
    authorityFlags: buildAuthorityFlags(),
  };
  const completedOffer = copyOfferWithStatus(input.offer, "completed", completedAt, deviceId);

  return {
    ok: true,
    offer: completedOffer,
    pairedDevice,
    auditEvents: [
      buildAuditEvent("handoff_completed", completedAt, "completed", offerId, deviceId),
    ],
  };
};

export const revokeHomeNodePairedDevice = (
  device: HomeNodePairedDeviceRecord,
  revokedAt: string
) => {
  const occurredAt = normalizeIsoOrFallback(revokedAt, device.pairedAt);
  const revokedDevice: HomeNodePairedDeviceRecord = {
    schemaVersion: HOME_NODE_LOCAL_PAIRING_LIFECYCLE_SCHEMA_VERSION,
    deviceId: normalizeId(device.deviceId, "device-redacted"),
    label: normalizeLabel(device.label, "Local device"),
    pairedAt: normalizeIsoOrFallback(device.pairedAt, occurredAt),
    revokedAt: occurredAt,
    status: "revoked",
    scopes: normalizeScopes(device.scopes),
    selectedTransport: "none",
    qrTransport: "none",
    requestAcceptance: "blocked",
    localRequestStagingStatus: "blocked",
    writeBoundary: "pending_local_confirmation_only",
    authorityFlags: buildAuthorityFlags(),
  };

  return {
    device: revokedDevice,
    auditEvents: [
      buildAuditEvent("device_revoked", occurredAt, "revoked", null, revokedDevice.deviceId),
    ],
  };
};

export const canStageHomeNodeLocalRequestForDevice = (
  device: HomeNodePairedDeviceRecord | null | undefined
) => {
  if (!device) {
    return false;
  }

  return (
    device.status === "active" &&
    device.localRequestStagingStatus === "allowed" &&
    device.scopes.includes("stage_pending_confirmation") &&
    device.requestAcceptance === "blocked"
  );
};
