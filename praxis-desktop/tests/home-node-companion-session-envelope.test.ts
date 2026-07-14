import { strict as assert } from "node:assert";
import { buildHomeNodeCompanionSafeMasterSnapshot } from "../shared/homeNodeCompanionSafeMasterSnapshot";
import { buildHomeNodeCompanionSessionEnvelope } from "../shared/homeNodeCompanionSessionEnvelope";
import {
  completeHomeNodeLocalPairingHandoff,
  createHomeNodeLocalPairingOffer,
} from "../shared/homeNodeLocalPairingLifecycle";
import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  buildHomeNodeNetworkingPhaseCloseout,
} from "../shared/homeNodeNetworkingCloseout";
import type { WorkSnapshot } from "../shared/workModel";

const closeout = buildHomeNodeNetworkingPhaseCloseout({
  sourceVersions: {
    transportApprovalDiagnostics: "rm11",
    homeNodeApi: "api_v1",
    listenerFreeRuntime: "listener_free_v1",
    settings: "settings_v1",
    pairedDevices: "paired_v1",
  },
  counts: {
    approvalPacketSummaries: 2,
    runtimeSnapshotSummaries: 1,
    settingsDisplayRows: 3,
    pairedDeviceRecords: 1,
    readinessChecks: 5,
  },
  settingsSummary: {
    selectedTransport: "none",
    runtimeProvider: "none",
    qrTransport: "none",
    pairedDeviceRecordCount: 1,
  },
  runtimeSummary: {
    selectedTransport: "none",
    selectedProvider: "none",
    qrTransport: "none",
    listenerFreeWrapperArmed: true,
    requestAcceptance: "blocked",
  },
});

const { offer } = createHomeNodeLocalPairingOffer({
  offerId: "offer-rm16-1",
  oneTimeCode: "710-116",
  createdAt: "2026-07-10T12:00:00.000Z",
  expiresAt: "2026-07-10T12:10:00.000Z",
  deviceLabel: "Surface RM16 Secret",
});
const handoff = completeHomeNodeLocalPairingHandoff({
  offer,
  oneTimeCode: "710-116",
  deviceId: "surface-rm16-secret",
  deviceLabel: "Surface RM16 Secret",
  completedAt: "2026-07-10T12:01:00.000Z",
});

if (!handoff.ok) {
  throw new Error("Expected local pairing handoff to complete.");
}

const workSnapshot: WorkSnapshot = {
  missions: [],
  projects: [],
  todos: [],
  deadlines: [],
  appointments: [],
  people: [],
  personWorkLinks: [],
  memoryDocuments: [],
};

const snapshot = buildHomeNodeCompanionSafeMasterSnapshot({
  generatedAt: "2026-07-10T12:02:00.000Z",
  workSnapshot,
  pairedDevices: [handoff.pairedDevice],
  pendingConfirmations: [],
  closeout,
});

const envelope = buildHomeNodeCompanionSessionEnvelope({
  envelopeId: "envelope-rm16-1",
  generatedAt: "2026-07-10T12:03:00.000Z",
  expiresAt: "2026-07-10T12:08:00.000Z",
  pairedDevice: handoff.pairedDevice,
  snapshot,
});
const envelopeJson = JSON.stringify(envelope);

assert.equal(envelope.phase, "RM16");
assert.equal(envelope.schemaVersion, "home-node-companion-session-envelope.v1");
assert.equal(envelope.status, "ready_for_local_companion_handoff");
assert.equal(envelope.recipient.pairedDeviceStatus, "active");
assert.equal(envelope.recipient.localRecordOnly, true);
assert.equal(envelope.recipient.readMasterSnapshotScope, true);
assert.equal(envelope.recipient.stagePendingConfirmationScope, true);
assert.equal(envelope.recipient.deviceIdIncluded, false);
assert.equal(envelope.recipient.deviceLabelIncluded, false);
assert.equal(envelope.handoff.selectedTransport, "none");
assert.equal(envelope.handoff.runtimeProvider, "none");
assert.equal(envelope.handoff.qrTransport, "none");
assert.equal(envelope.handoff.requestAcceptance, "blocked");
assert.equal(envelope.handoff.localOnly, true);
assert.equal(envelope.handoff.endpointUrlIncluded, false);
assert.equal(envelope.handoff.relayPayloadIncluded, false);
assert.equal(envelope.handoff.socketListenerBound, false);
assert.equal(envelope.handoff.publicNetworkReachable, false);
assert.equal(envelope.payload.rawWorkIncluded, false);
assert.equal(envelope.payload.commandPayloadIncluded, false);
assert.equal(envelope.payload.providerPayloadIncluded, false);
assert.equal(envelope.payload.endpointUrlIncluded, false);
assert.equal(envelope.payload.storagePathIncluded, false);
assert.equal(envelope.payload.tokenIncluded, false);
assert.equal(envelope.payload.snapshot.generatedAt, snapshot.generatedAt);
assert.deepEqual(envelope.diagnostics.issues, []);
assert.equal(envelope.diagnostics.snapshotReadOnly, true);
assert.equal(envelope.diagnostics.snapshotTransportNeutral, true);
assert.equal(envelope.diagnostics.closeoutEvidenceComplete, true);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(envelope.authorityFlags[authority], false);
}

for (const forbidden of [
  "710-116",
  "surface-rm16-secret",
  "Surface RM16 Secret",
  "https://relay.example",
  "provider-payload",
  "C:\\Users\\operator",
]) {
  assert.equal(envelopeJson.includes(forbidden), false, `envelope leaked ${forbidden}`);
}

const blockedSnapshot = {
  ...snapshot,
  capability: {
    ...snapshot.capability,
    commandsAccepted: true,
  },
} as unknown as typeof snapshot;
const blockedEnvelope = buildHomeNodeCompanionSessionEnvelope({
  envelopeId: "https://relay.example/unsafe-token",
  generatedAt: "2026-07-10T12:03:00.000Z",
  expiresAt: "2026-07-10T12:03:00.000Z",
  pairedDevice: null,
  snapshot: blockedSnapshot,
});

assert.equal(blockedEnvelope.status, "blocked");
assert.equal(blockedEnvelope.envelopeId, "envelope-redacted");
assert.deepEqual(blockedEnvelope.diagnostics.issues, [
  "paired_device_missing",
  "read_scope_missing",
  "handoff_window_expired",
  "snapshot_accepts_commands",
]);

console.log("home node companion session envelope tests passed");
