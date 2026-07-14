import { strict as assert } from "node:assert";
import { buildHomeNodeCompanionSafeMasterSnapshot } from "../shared/homeNodeCompanionSafeMasterSnapshot";
import { buildHomeNodeCompanionSessionEnvelope } from "../shared/homeNodeCompanionSessionEnvelope";
import {
  completeHomeNodeLocalPairingHandoff,
  createHomeNodeLocalPairingOffer,
} from "../shared/homeNodeLocalPairingLifecycle";
import { stageHomeNodePendingConfirmation } from "../shared/homeNodePendingConfirmationLifecycle";
import {
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  buildHomeNodeNetworkingPhaseCloseout,
} from "../shared/homeNodeNetworkingCloseout";
import { buildHomeNodeNetworkingSetupCloseout } from "../shared/homeNodeNetworkingSetupCloseout";
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
  offerId: "offer-rm17-1",
  oneTimeCode: "871-217",
  createdAt: "2026-07-10T13:00:00.000Z",
  expiresAt: "2026-07-10T13:10:00.000Z",
  deviceLabel: "Surface RM17 Secret",
});
const handoff = completeHomeNodeLocalPairingHandoff({
  offer,
  oneTimeCode: "871-217",
  deviceId: "surface-rm17-secret",
  deviceLabel: "Surface RM17 Secret",
  completedAt: "2026-07-10T13:01:00.000Z",
});

if (!handoff.ok) {
  throw new Error("Expected local pairing handoff to complete.");
}

const staged = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "confirm-rm17-1",
  actionKind: "todo",
  requestedAt: "2026-07-10T13:02:00.000Z",
  expiresAt: "2026-07-10T13:12:00.000Z",
  title: "Review safe task",
  summary: "Create local task after operator review.",
  reason: "Future companion staged a safe request.",
});

if (!staged.ok) {
  throw new Error("Expected pending confirmation to stage.");
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
  generatedAt: "2026-07-10T13:03:00.000Z",
  workSnapshot,
  pairedDevices: [handoff.pairedDevice],
  pendingConfirmations: [staged.confirmation],
  closeout,
});
const companionEnvelope = buildHomeNodeCompanionSessionEnvelope({
  envelopeId: "envelope-rm17-1",
  generatedAt: "2026-07-10T13:04:00.000Z",
  expiresAt: "2026-07-10T13:09:00.000Z",
  pairedDevice: handoff.pairedDevice,
  snapshot,
});

const setupCloseout = buildHomeNodeNetworkingSetupCloseout({
  generatedAt: "2026-07-10T13:05:00.000Z",
  closeout,
  pairedDevices: [handoff.pairedDevice],
  pendingConfirmations: [staged.confirmation],
  snapshot,
  companionEnvelope,
});
const setupCloseoutJson = JSON.stringify(setupCloseout);

assert.equal(setupCloseout.phase, "RM17");
assert.equal(setupCloseout.schemaVersion, "home-node-networking-setup-closeout.v1");
assert.equal(setupCloseout.readinessStatus, "ready_for_transport_planning");
assert.deepEqual(setupCloseout.completedRoadmapMasters, [
  "RM12",
  "RM13",
  "RM14",
  "RM15",
  "RM16",
  "RM17",
]);
assert.deepEqual(setupCloseout.remainingRoadmapMasters, []);
assert.equal(setupCloseout.preTransportSetupStepsRemaining, 0);
assert.equal(setupCloseout.boundary.selectedTransport, "none");
assert.equal(setupCloseout.boundary.runtimeProvider, "none");
assert.equal(setupCloseout.boundary.qrTransport, "none");
assert.equal(setupCloseout.boundary.requestAcceptance, "blocked");
assert.equal(setupCloseout.boundary.runtimeActivationStatus, "not_started");
assert.equal(setupCloseout.boundary.publicNetworkingEnabled, false);
assert.equal(setupCloseout.boundary.listenerSocketBound, false);
assert.equal(setupCloseout.boundary.remoteWritesAccepted, false);
assert.equal(setupCloseout.boundary.providerWritesAccepted, false);
assert.equal(setupCloseout.boundary.selectedTransportPersistenceEnabled, false);
assert.equal(setupCloseout.prerequisites.rm12CloseoutComplete, true);
assert.equal(setupCloseout.prerequisites.rm13LocalPairingLifecycleAvailable, true);
assert.equal(setupCloseout.prerequisites.rm14PendingConfirmationLifecycleAvailable, true);
assert.equal(setupCloseout.prerequisites.rm15CompanionSafeSnapshotAvailable, true);
assert.equal(setupCloseout.prerequisites.rm16CompanionSessionEnvelopeAvailable, true);
assert.equal(setupCloseout.prerequisites.setupCloseoutRecorded, true);
assert.equal(setupCloseout.summary.activePairedDevices, 1);
assert.equal(setupCloseout.summary.revokedPairedDevices, 0);
assert.equal(setupCloseout.summary.pendingConfirmations, 1);
assert.equal(setupCloseout.summary.confirmedLocallyConfirmations, 0);
assert.equal(setupCloseout.summary.companionEnvelopeStatus, "ready_for_local_companion_handoff");
assert.deepEqual(setupCloseout.diagnostics.issues, []);
assert.equal(setupCloseout.diagnostics.deniedAuthorityCount, HOME_NODE_NETWORKING_DENIED_AUTHORITIES.length);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(setupCloseout.deniedAuthorityFlags[authority], true);
}

for (const forbidden of [
  "871-217",
  "surface-rm17-secret",
  "Surface RM17 Secret",
  "Review safe task",
  "Create local task",
  "Future companion",
  "https://relay.example",
  "provider-payload",
  "C:\\Users\\operator",
]) {
  assert.equal(setupCloseoutJson.includes(forbidden), false, `setup closeout leaked ${forbidden}`);
}

const mismatchedSnapshot = {
  ...snapshot,
  devices: {
    ...snapshot.devices,
    activeCount: 99,
  },
} as typeof snapshot;
const blockedCloseout = buildHomeNodeNetworkingSetupCloseout({
  generatedAt: "2026-07-10T13:05:00.000Z",
  closeout,
  pairedDevices: [handoff.pairedDevice],
  pendingConfirmations: [staged.confirmation],
  snapshot: mismatchedSnapshot,
  companionEnvelope,
});

assert.equal(blockedCloseout.readinessStatus, "blocked");
assert.equal(
  blockedCloseout.diagnostics.issues.includes("rm15_paired_device_summary_mismatch"),
  true
);
assert.equal(
  blockedCloseout.diagnostics.issues.includes("rm16_envelope_snapshot_mismatch"),
  true
);

console.log("home node networking setup closeout tests passed");
