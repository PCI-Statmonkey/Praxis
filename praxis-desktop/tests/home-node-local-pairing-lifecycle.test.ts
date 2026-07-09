import { strict as assert } from "node:assert";
import {
  buildHomeNodeLocalPairingQrPayload,
  canStageHomeNodeLocalRequestForDevice,
  completeHomeNodeLocalPairingHandoff,
  createHomeNodeLocalPairingOffer,
  revokeHomeNodeLocalPairingOffer,
  revokeHomeNodePairedDevice,
  type HomeNodeLocalPairingOfferRecord,
} from "../shared/homeNodeLocalPairingLifecycle";
import { HOME_NODE_NETWORKING_DENIED_AUTHORITIES } from "../shared/homeNodeNetworkingCloseout";

const createdAt = "2026-07-09T14:00:00.000Z";
const expiresAt = "2026-07-09T14:10:00.000Z";
const oneTimeCode = "617-294";

const { offer, auditEvents: createEvents } = createHomeNodeLocalPairingOffer({
  offerId: "offer-rm13-1",
  oneTimeCode,
  createdAt,
  expiresAt,
  deviceLabel: "Surface Desk",
  requestedScopes: ["read_master_snapshot", "stage_pending_confirmation"],
});

assert.equal(offer.status, "pending");
assert.equal(offer.selectedTransport, "none");
assert.equal(offer.qrTransport, "none");
assert.equal(offer.requestAcceptance, "blocked");
assert.equal(offer.rawOneTimeCodeStored, false);
assert.notEqual(offer.oneTimeCodeFingerprint, oneTimeCode);
assert.equal(JSON.stringify(offer).includes(oneTimeCode), false);
assert.deepEqual(
  createEvents.map((event) => event.type),
  ["offer_created"]
);

const { qrPayload, auditEvents: qrEvents } = buildHomeNodeLocalPairingQrPayload(
  offer,
  "2026-07-09T14:01:00.000Z"
);

assert.equal(qrPayload.schemaVersion, "home-node-local-pairing-qr.v1");
assert.equal(qrPayload.selectedTransport, "none");
assert.equal(qrPayload.qrTransport, "none");
assert.equal(qrPayload.requestAcceptance, "blocked");
assert.equal(qrPayload.rawOneTimeCodeIncluded, false);
assert.equal(qrPayload.endpointUrlIncluded, false);
assert.equal(qrPayload.providerPayloadIncluded, false);
assert.equal(qrPayload.storagePathIncluded, false);
assert.equal(JSON.stringify(qrPayload).includes(oneTimeCode), false);
assert.deepEqual(
  qrEvents.map((event) => event.type),
  ["qr_payload_built"]
);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(qrPayload.authorityFlags[authority], false);
  assert.equal(offer.authorityFlags[authority], false);
}

const mismatch = completeHomeNodeLocalPairingHandoff({
  offer,
  oneTimeCode: "000-000",
  deviceId: "surface-desk",
  deviceLabel: "Surface Desk",
  completedAt: "2026-07-09T14:02:00.000Z",
});

assert.equal(mismatch.ok, false);
assert.equal(mismatch.ok ? undefined : mismatch.reason, "one_time_code_mismatch");
assert.equal(mismatch.offer.status, "pending");
assert.equal(mismatch.pairedDevice, null);
assert.equal(canStageHomeNodeLocalRequestForDevice(mismatch.pairedDevice), false);

const handoff = completeHomeNodeLocalPairingHandoff({
  offer,
  oneTimeCode,
  deviceId: "surface-desk",
  deviceLabel: "Surface Desk",
  completedAt: "2026-07-09T14:02:00.000Z",
});

assert.equal(handoff.ok, true);
assert.equal(handoff.offer.status, "completed");
if (!handoff.ok) {
  throw new Error("Expected pairing handoff to complete.");
}

assert.equal(handoff.pairedDevice.status, "active");
assert.equal(handoff.pairedDevice.selectedTransport, "none");
assert.equal(handoff.pairedDevice.qrTransport, "none");
assert.equal(handoff.pairedDevice.requestAcceptance, "blocked");
assert.equal(handoff.pairedDevice.localRequestStagingStatus, "allowed");
assert.equal(handoff.pairedDevice.writeBoundary, "pending_local_confirmation_only");
assert.equal(canStageHomeNodeLocalRequestForDevice(handoff.pairedDevice), true);
assert.deepEqual(
  handoff.auditEvents.map((event) => event.type),
  ["handoff_completed"]
);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(handoff.pairedDevice.authorityFlags[authority], false);
}

const revokedDeviceResult = revokeHomeNodePairedDevice(
  handoff.pairedDevice,
  "2026-07-09T14:03:00.000Z"
);

assert.equal(revokedDeviceResult.device.status, "revoked");
assert.equal(revokedDeviceResult.device.localRequestStagingStatus, "blocked");
assert.equal(canStageHomeNodeLocalRequestForDevice(revokedDeviceResult.device), false);
assert.deepEqual(
  revokedDeviceResult.auditEvents.map((event) => event.type),
  ["device_revoked"]
);

const { offer: expiredSeed } = createHomeNodeLocalPairingOffer({
  offerId: "offer-rm13-expired",
  oneTimeCode: "111-222",
  createdAt,
  expiresAt,
});
const expired = completeHomeNodeLocalPairingHandoff({
  offer: expiredSeed,
  oneTimeCode: "111-222",
  deviceId: "expired-device",
  completedAt: "2026-07-09T14:11:00.000Z",
});

assert.equal(expired.ok, false);
assert.equal(expired.ok ? undefined : expired.reason, "offer_expired");
assert.equal(expired.offer.status, "expired");

const { offer: revocableOffer } = createHomeNodeLocalPairingOffer({
  offerId: "offer-rm13-revoke",
  oneTimeCode: "333-444",
  createdAt,
  expiresAt,
});
const revokedOfferResult = revokeHomeNodeLocalPairingOffer(
  revocableOffer,
  "2026-07-09T14:04:00.000Z"
);
const revokedHandoff = completeHomeNodeLocalPairingHandoff({
  offer: revokedOfferResult.offer,
  oneTimeCode: "333-444",
  deviceId: "revoked-device",
  completedAt: "2026-07-09T14:05:00.000Z",
});

assert.equal(revokedOfferResult.offer.status, "revoked");
assert.equal(revokedHandoff.ok, false);
assert.equal(revokedHandoff.ok ? undefined : revokedHandoff.reason, "offer_not_pending");

const unsafeOffer = {
  ...offer,
  offerId: "https://relay.example/unsafe",
  deviceLabel: "C:\\Users\\operator\\secret.db",
  oneTimeCodeFingerprint: "raw-code-617-294",
  rawOneTimeCode: oneTimeCode,
  token: "provider-token",
  endpointUrl: "https://relay.example/private",
  providerPayload: "provider-payload-body",
  storagePath: "C:\\Users\\operator\\AppData\\Praxis\\db.sqlite",
} as unknown as HomeNodeLocalPairingOfferRecord;

const unsafeDenied = completeHomeNodeLocalPairingHandoff({
  offer: unsafeOffer,
  oneTimeCode,
  deviceId: "C:\\Users\\operator\\device-token",
  completedAt: "2026-07-09T14:02:00.000Z",
});
const unsafeJson = JSON.stringify(unsafeDenied);

assert.equal(unsafeDenied.ok, false);
assert.equal(unsafeDenied.offer.offerId, "offer-redacted");
assert.equal(unsafeDenied.offer.deviceLabel, "Local device");
assert.equal(unsafeDenied.offer.oneTimeCodeFingerprint, "fp_redacted");

for (const forbidden of [
  oneTimeCode,
  "provider-token",
  "https://relay.example/private",
  "provider-payload-body",
  "AppData",
  "secret.db",
  "db.sqlite",
  "device-token",
]) {
  assert.equal(unsafeJson.includes(forbidden), false, `pairing lifecycle leaked ${forbidden}`);
}

console.log("home node local pairing lifecycle tests passed");
