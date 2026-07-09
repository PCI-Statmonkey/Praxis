import { strict as assert } from "node:assert";
import {
  completeHomeNodeLocalPairingHandoff,
  createHomeNodeLocalPairingOffer,
  revokeHomeNodePairedDevice,
} from "../shared/homeNodeLocalPairingLifecycle";
import {
  confirmHomeNodePendingConfirmationLocally,
  dismissHomeNodePendingConfirmation,
  expireHomeNodePendingConfirmation,
  stageHomeNodePendingConfirmation,
  type HomeNodePendingConfirmationRecord,
} from "../shared/homeNodePendingConfirmationLifecycle";
import { HOME_NODE_NETWORKING_DENIED_AUTHORITIES } from "../shared/homeNodeNetworkingCloseout";

const createdAt = "2026-07-09T15:00:00.000Z";
const expiresAt = "2026-07-09T15:10:00.000Z";
const { offer } = createHomeNodeLocalPairingOffer({
  offerId: "offer-rm14-1",
  oneTimeCode: "914-772",
  createdAt,
  expiresAt,
});
const handoff = completeHomeNodeLocalPairingHandoff({
  offer,
  oneTimeCode: "914-772",
  deviceId: "surface-rm14",
  deviceLabel: "Surface RM14",
  completedAt: "2026-07-09T15:01:00.000Z",
});

if (!handoff.ok) {
  throw new Error("Expected local pairing handoff to complete.");
}

const staged = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "confirm-rm14-1",
  actionKind: "todo",
  requestedAt: "2026-07-09T15:02:00.000Z",
  expiresAt: "2026-07-09T15:12:00.000Z",
  title: "Review follow up task",
  summary: "Create a local todo after operator review.",
  reason: "Future client requested local review.",
});

assert.equal(staged.ok, true);
assert.equal(staged.confirmation.schemaVersion, "home-node-pending-confirmation.v1");
assert.equal(staged.confirmation.status, "pending");
assert.equal(staged.confirmation.sourceDeviceId, "surface-rm14");
assert.equal(staged.confirmation.sourceDeviceStatus, "active");
assert.equal(staged.confirmation.writeBoundary, "pending_local_confirmation_only");
assert.equal(staged.confirmation.localOperatorConfirmationRequired, true);
assert.equal(staged.confirmation.clientConfirmed, false);
assert.equal(staged.confirmation.workMutationApplied, false);
assert.equal(staged.confirmation.directRemoteWritePerformed, false);
assert.equal(staged.confirmation.providerWritesPerformed, false);
assert.equal(staged.confirmation.rawRequestIncluded, false);
assert.equal(staged.confirmation.unsafeContentIncluded, false);
assert.deepEqual(
  staged.auditEvents.map((event) => event.type),
  ["pending_confirmation_staged"]
);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(staged.confirmation.authorityFlags[authority], false);
}

const localConfirm = confirmHomeNodePendingConfirmationLocally(
  staged.confirmation,
  "2026-07-09T15:03:00.000Z"
);

assert.equal(localConfirm.ok, true);
assert.equal(localConfirm.confirmation.status, "confirmed_locally");
assert.equal(localConfirm.confirmation.resolvedAt, "2026-07-09T15:03:00.000Z");
assert.equal(localConfirm.confirmation.workMutationApplied, false);
assert.equal(localConfirm.confirmation.directRemoteWritePerformed, false);
assert.equal(localConfirm.confirmation.providerWritesPerformed, false);
assert.deepEqual(
  localConfirm.auditEvents.map((event) => event.type),
  ["pending_confirmation_confirmed_locally"]
);

const doubleConfirm = confirmHomeNodePendingConfirmationLocally(
  localConfirm.confirmation,
  "2026-07-09T15:04:00.000Z"
);

assert.equal(doubleConfirm.ok, false);
assert.equal(doubleConfirm.ok ? undefined : doubleConfirm.reason, "record_not_pending");
assert.equal(doubleConfirm.confirmation.status, "confirmed_locally");
assert.equal(doubleConfirm.confirmation.workMutationApplied, false);

const dismissedSeed = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "confirm-rm14-dismiss",
  actionKind: "deadline",
  requestedAt: "2026-07-09T15:02:00.000Z",
  expiresAt: "2026-07-09T15:12:00.000Z",
  title: "Review deadline",
  summary: "Create a deadline after local review.",
  reason: "Future client staged a local review request.",
});

if (!dismissedSeed.ok) {
  throw new Error("Expected dismiss seed to stage.");
}

const dismissed = dismissHomeNodePendingConfirmation(
  dismissedSeed.confirmation,
  "2026-07-09T15:04:00.000Z"
);

assert.equal(dismissed.ok, true);
assert.equal(dismissed.confirmation.status, "dismissed");
assert.equal(dismissed.confirmation.workMutationApplied, false);

const expiredSeed = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "confirm-rm14-expire",
  actionKind: "project",
  requestedAt: "2026-07-09T15:02:00.000Z",
  expiresAt: "2026-07-09T15:03:00.000Z",
  title: "Review project",
  summary: "Create a project after local review.",
  reason: "Future client staged a local review request.",
});

if (!expiredSeed.ok) {
  throw new Error("Expected expire seed to stage.");
}

const expired = expireHomeNodePendingConfirmation(
  expiredSeed.confirmation,
  "2026-07-09T15:04:00.000Z"
);

assert.equal(expired.ok, true);
assert.equal(expired.confirmation.status, "expired");
assert.equal(expired.confirmation.workMutationApplied, false);

const lateConfirm = confirmHomeNodePendingConfirmationLocally(
  expiredSeed.confirmation,
  "2026-07-09T15:04:00.000Z"
);

assert.equal(lateConfirm.ok, false);
assert.equal(lateConfirm.ok ? undefined : lateConfirm.reason, "request_expired");
assert.equal(lateConfirm.confirmation.status, "expired");

const clientConfirmed = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "confirm-rm14-client-confirmed",
  actionKind: "todo",
  requestedAt: "2026-07-09T15:02:00.000Z",
  expiresAt: "2026-07-09T15:12:00.000Z",
  title: "Review client confirmation",
  summary: "Client attempted to bypass local confirmation.",
  reason: "Future client sent confirmed true.",
  confirmed: true,
});

assert.equal(clientConfirmed.ok, false);
assert.equal(clientConfirmed.ok ? undefined : clientConfirmed.reason, "client_confirmation_rejected");
assert.equal(clientConfirmed.confirmation.status, "rejected");
assert.equal(clientConfirmed.confirmation.clientConfirmed, false);
assert.equal(clientConfirmed.confirmation.workMutationApplied, false);

const revokedDevice = revokeHomeNodePairedDevice(
  handoff.pairedDevice,
  "2026-07-09T15:05:00.000Z"
).device;
const revokedDeviceStage = stageHomeNodePendingConfirmation({
  device: revokedDevice,
  requestId: "confirm-rm14-revoked-device",
  actionKind: "mission_note",
  requestedAt: "2026-07-09T15:06:00.000Z",
  expiresAt: "2026-07-09T15:12:00.000Z",
  title: "Review revoked device",
  summary: "Revoked device attempted local staging.",
  reason: "Device was revoked before staging.",
});

assert.equal(revokedDeviceStage.ok, false);
assert.equal(revokedDeviceStage.ok ? undefined : revokedDeviceStage.reason, "device_not_allowed");
assert.equal(revokedDeviceStage.confirmation.status, "rejected");
assert.equal(revokedDeviceStage.confirmation.sourceDeviceStatus, "revoked");
assert.deepEqual(
  revokedDeviceStage.auditEvents.map((event) => event.type),
  ["pending_confirmation_revoked_device_blocked"]
);

const unsafeStage = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "https://relay.example/private",
  actionKind: "todo",
  requestedAt: "2026-07-09T15:02:00.000Z",
  expiresAt: "2026-07-09T15:12:00.000Z",
  title: "Subject: invoice 4421 for account 9988",
  summary:
    "Raw message body with token abc123 and provider payload at https://relay.example/private",
  reason: "Storage path C:\\Users\\operator\\AppData\\Praxis\\db.sqlite",
} as Parameters<typeof stageHomeNodePendingConfirmation>[0] & {
  rawPayload?: string;
  providerPayload?: string;
  endpointUrl?: string;
  storagePath?: string;
});
const unsafeJson = JSON.stringify(unsafeStage);

assert.equal(unsafeStage.ok, true);
assert.equal(unsafeStage.confirmation.confirmationId, "confirmation-redacted");
assert.equal(unsafeStage.confirmation.title, "Local review request");
assert.equal(unsafeStage.confirmation.summary, "Summary redacted for local review.");
assert.equal(unsafeStage.confirmation.reason, "Reason redacted for local review.");
assert.equal(unsafeStage.confirmation.rawRequestIncluded, false);
assert.equal(unsafeStage.confirmation.providerPayloadIncluded, false);
assert.equal(unsafeStage.confirmation.endpointUrlIncluded, false);
assert.equal(unsafeStage.confirmation.storagePathIncluded, false);

for (const forbidden of [
  "invoice",
  "account",
  "9988",
  "abc123",
  "https://relay.example/private",
  "AppData",
  "db.sqlite",
  "Raw message body",
  "provider payload",
]) {
  assert.equal(unsafeJson.includes(forbidden), false, `pending confirmation leaked ${forbidden}`);
}

const unsafeExisting = {
  ...staged.confirmation,
  confirmationId: "C:\\Users\\operator\\secret.db",
  sourceDeviceId: "https://relay.example/device-token",
  sourceDeviceStatus: "https://relay.example/source-status",
  requestedAt: "C:\\Users\\operator\\requested-at",
  expiresAt: "https://relay.example/expires-at",
  title: "Message body with account 12345",
  summary: "Provider payload token",
  reason: "C:\\Users\\operator\\AppData\\Praxis\\db.sqlite",
  rawPayload: "raw request payload",
  providerPayload: "provider payload body",
} as unknown as HomeNodePendingConfirmationRecord;
const unsafeExistingConfirm = confirmHomeNodePendingConfirmationLocally(
  unsafeExisting,
  "2026-07-09T15:03:00.000Z"
);
const unsafeExistingJson = JSON.stringify(unsafeExistingConfirm);

assert.equal(unsafeExistingConfirm.ok, true);
assert.equal(unsafeExistingConfirm.confirmation.confirmationId, "confirmation-redacted");
assert.equal(unsafeExistingConfirm.confirmation.sourceDeviceId, "device-redacted");
assert.equal(unsafeExistingConfirm.confirmation.sourceDeviceStatus, "unknown");
assert.equal(unsafeExistingConfirm.confirmation.requestedAt, "1970-01-01T00:00:00.000Z");
assert.equal(unsafeExistingConfirm.confirmation.expiresAt, "1970-01-01T00:00:00.000Z");
assert.equal(unsafeExistingConfirm.confirmation.title, "Local review request");
assert.equal(unsafeExistingConfirm.confirmation.workMutationApplied, false);

for (const forbidden of [
  "secret.db",
  "device-token",
  "source-status",
  "requested-at",
  "expires-at",
  "account 12345",
  "Provider payload token",
  "raw request payload",
  "provider payload body",
  "AppData",
  "db.sqlite",
]) {
  assert.equal(
    unsafeExistingJson.includes(forbidden),
    false,
    `resolved confirmation leaked ${forbidden}`
  );
}

console.log("home node pending confirmation lifecycle tests passed");
