import { strict as assert } from "node:assert";
import {
  HOME_NODE_NETWORKING_CLOSEOUT_EXCLUDED_EVIDENCE,
  HOME_NODE_NETWORKING_DENIED_AUTHORITIES,
  buildHomeNodeNetworkingPhaseCloseout,
  type HomeNodeNetworkingCloseoutEvidence,
} from "../shared/homeNodeNetworkingCloseout";

const closeout = buildHomeNodeNetworkingPhaseCloseout({
  sourceVersions: {
    transportApprovalDiagnostics: "rm11.2",
    homeNodeApi: "api_v1",
    listenerFreeRuntime: "listener-free_1",
    settings: "settings_v4",
    pairedDevices: "paired-devices_1",
  },
  counts: {
    approvalPacketSummaries: 2,
    runtimeSnapshotSummaries: 1,
    settingsDisplayRows: 3,
    pairedDeviceRecords: 4,
    readinessChecks: 5,
  },
  settingsSummary: {
    selectedTransport: "none",
    runtimeProvider: "none",
    qrTransport: "none",
    pairedDeviceRecordCount: 4,
  },
  runtimeSummary: {
    selectedTransport: "none",
    selectedProvider: "none",
    qrTransport: "none",
    listenerFreeWrapperArmed: true,
    requestAcceptance: "blocked",
  },
});

assert.equal(closeout.phase, "RM12");
assert.equal(closeout.schemaVersion, "home-node-networking-closeout.v1");
assert.equal(closeout.readinessStatus, "ready_for_client_phase");
assert.equal(closeout.evidenceCompleteness.complete, true);
assert.deepEqual(closeout.evidenceCompleteness.missing, []);
assert.equal(closeout.settingsRuntimeConsistency.consistent, true);
assert.equal(closeout.runtimeSummary.selectedTransport, "none");
assert.equal(closeout.runtimeSummary.selectedProvider, "none");
assert.equal(closeout.runtimeSummary.qrTransport, "none");
assert.equal(closeout.runtimeSummary.requestAcceptance, "blocked");
assert.equal(closeout.settingsSummary.pairedDeviceRecordCount, 4);
assert.equal(closeout.counts.deniedAuthorities, HOME_NODE_NETWORKING_DENIED_AUTHORITIES.length);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(closeout.deniedAuthorityFlags[authority], true);
}

for (const excludedEvidence of HOME_NODE_NETWORKING_CLOSEOUT_EXCLUDED_EVIDENCE) {
  assert.equal(closeout.excludedEvidence.includes(excludedEvidence), true);
}

const blockedCloseout = buildHomeNodeNetworkingPhaseCloseout({
  settingsSummary: {
    selectedTransport: "none",
    runtimeProvider: "none",
    qrTransport: "none",
    pairedDeviceRecordCount: 0,
  },
  runtimeSummary: {
    selectedTransport: "lan" as "none",
    selectedProvider: "dropbox" as "none",
    qrTransport: "qr" as "none",
    listenerFreeWrapperArmed: false,
    requestAcceptance: "accepting" as "blocked",
  },
});

assert.equal(blockedCloseout.readinessStatus, "blocked");
assert.equal(blockedCloseout.settingsRuntimeConsistency.consistent, false);
assert.deepEqual(
  blockedCloseout.settingsRuntimeConsistency.checks
    .filter((check) => check.status === "blocked")
    .map((check) => check.name),
  ["selected_transport", "runtime_provider", "qr_transport", "request_acceptance"]
);

const emptyEvidenceCloseout = buildHomeNodeNetworkingPhaseCloseout();

assert.equal(emptyEvidenceCloseout.readinessStatus, "blocked");
assert.equal(emptyEvidenceCloseout.settingsRuntimeConsistency.consistent, true);
assert.equal(emptyEvidenceCloseout.evidenceCompleteness.complete, false);
assert.deepEqual(emptyEvidenceCloseout.evidenceCompleteness.missing, [
  "sourceVersions",
  "settingsSummary",
  "runtimeSummary",
  "readinessChecks",
]);

const suspiciousEvidence = {
  sourceVersions: {
    transportApprovalDiagnostics: "https://relay.example/token",
    homeNodeApi: "C:\\Users\\operator\\secret.db",
    listenerFreeRuntime: "../storage/path",
    settings: "settings_v4",
    pairedDevices: "paired-devices_1",
  },
  rawApprovalPackets: [{ approvalPacket: "raw approval packet secret" }],
  rawRuntimeSnapshots: [{ endpointUrl: "https://runtime.example/private" }],
  rawSettingsDisplayRows: [{ selectedTransport: "lan" }],
  unsafePacketContent: "unsafe-packet-body",
  providerPayload: "provider-token-payload",
  storagePath: "C:\\Users\\operator\\AppData\\Praxis\\db.sqlite",
} as unknown as HomeNodeNetworkingCloseoutEvidence;

const sanitizedCloseout = buildHomeNodeNetworkingPhaseCloseout(suspiciousEvidence);
const sanitizedJson = JSON.stringify(sanitizedCloseout);

assert.equal(sanitizedCloseout.sourceVersions.transportApprovalDiagnostics, "redacted");
assert.equal(sanitizedCloseout.sourceVersions.homeNodeApi, "redacted");
assert.equal(sanitizedCloseout.sourceVersions.listenerFreeRuntime, "redacted");
assert.equal(sanitizedCloseout.sourceVersions.settings, "settings_v4");
assert.equal(sanitizedCloseout.sourceVersions.pairedDevices, "paired-devices_1");

for (const forbidden of [
  "raw approval packet secret",
  "https://runtime.example/private",
  "unsafe-packet-body",
  "provider-token-payload",
  "AppData",
  "secret.db",
  "db.sqlite",
]) {
  assert.equal(sanitizedJson.includes(forbidden), false, `closeout leaked ${forbidden}`);
}

assert.deepEqual(Object.keys(sanitizedCloseout).sort(), [
  "counts",
  "deniedAuthorityFlags",
  "evidenceCompleteness",
  "excludedEvidence",
  "phase",
  "readinessStatus",
  "runtimeSummary",
  "schemaVersion",
  "settingsRuntimeConsistency",
  "settingsSummary",
  "sourceVersions",
]);

console.log("home node networking closeout tests passed");
