import { strict as assert } from "node:assert";
import { buildHomeNodeCompanionSafeMasterSnapshot } from "../shared/homeNodeCompanionSafeMasterSnapshot";
import {
  completeHomeNodeLocalPairingHandoff,
  createHomeNodeLocalPairingOffer,
  revokeHomeNodePairedDevice,
} from "../shared/homeNodeLocalPairingLifecycle";
import {
  confirmHomeNodePendingConfirmationLocally,
  stageHomeNodePendingConfirmation,
} from "../shared/homeNodePendingConfirmationLifecycle";
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
    pairedDeviceRecords: 2,
    readinessChecks: 5,
  },
  settingsSummary: {
    selectedTransport: "none",
    runtimeProvider: "none",
    qrTransport: "none",
    pairedDeviceRecordCount: 2,
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
  offerId: "offer-rm15-1",
  oneTimeCode: "551-120",
  createdAt: "2026-07-09T16:00:00.000Z",
  expiresAt: "2026-07-09T16:10:00.000Z",
});
const handoff = completeHomeNodeLocalPairingHandoff({
  offer,
  oneTimeCode: "551-120",
  deviceId: "surface-rm15",
  deviceLabel: "Surface RM15",
  completedAt: "2026-07-09T16:01:00.000Z",
});

if (!handoff.ok) {
  throw new Error("Expected local handoff to complete.");
}

const staged = stageHomeNodePendingConfirmation({
  device: handoff.pairedDevice,
  requestId: "confirm-rm15-1",
  actionKind: "todo",
  requestedAt: "2026-07-09T16:02:00.000Z",
  expiresAt: "2026-07-09T16:12:00.000Z",
  title: "Review local task",
  summary: "Create task after local operator review.",
  reason: "Future client staged a safe local request.",
});

if (!staged.ok) {
  throw new Error("Expected pending confirmation to stage.");
}

const confirmed = confirmHomeNodePendingConfirmationLocally(
  staged.confirmation,
  "2026-07-09T16:03:00.000Z"
);

if (!confirmed.ok) {
  throw new Error("Expected local confirmation status update.");
}

const revokedDevice = revokeHomeNodePairedDevice(
  handoff.pairedDevice,
  "2026-07-09T16:04:00.000Z"
).device;

const workSnapshot: WorkSnapshot = {
  missions: [
    {
      id: "mission-secret-id",
      slug: "private-mission",
      title: "Do not leak mission title token-abc123",
      summary: "Raw mission summary with provider payload",
      status: "active",
      dueAt: "2026-07-09T18:00:00.000Z",
      markdownPath: "C:\\Users\\operator\\Praxis\\missions\\private.md",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  projects: [
    {
      id: "project-secret-id",
      missionId: "mission-secret-id",
      slug: "client-project",
      title: "Project account 7788",
      summary: "Project summary with https://provider.example/private",
      status: "blocked",
      dueAt: "2026-07-08T18:00:00.000Z",
      markdownPath: "C:\\Users\\operator\\Praxis\\projects\\client.md",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  todos: [
    {
      id: "todo-secret-id",
      projectId: "project-secret-id",
      title: "Todo invoice 4455",
      status: "active",
      priority: "high",
      dueAt: "2026-07-09T20:00:00.000Z",
      moneyRelated: true,
      quickAction: true,
      estimatedMinutes: 15,
      waitingOnPersonId: "person-secret-id",
      sourceKind: "gmail",
      sourceRef: "gmail-message-provider-id",
      notes: "Email body with token-abc123",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
    {
      id: "todo-paused-id",
      projectId: null,
      title: "Paused raw todo",
      status: "paused",
      priority: "normal",
      dueAt: null,
      moneyRelated: false,
      quickAction: false,
      estimatedMinutes: null,
      waitingOnPersonId: null,
      sourceKind: null,
      sourceRef: null,
      notes: null,
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  deadlines: [
    {
      id: "deadline-secret-id",
      entityKind: "todo",
      entityId: "todo-secret-id",
      title: "Deadline subject private",
      dueAt: "2026-07-08T20:00:00.000Z",
      status: "active",
      priority: "critical",
      sourceKind: "outlook",
      sourceRef: "outlook-provider-id",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  appointments: [
    {
      id: "appointment-secret-id",
      sourceSystem: "google",
      externalId: "google-calendar-event-id",
      title: "Appointment with private client",
      startsAt: "2026-07-09T17:00:00.000Z",
      endsAt: "2026-07-09T17:30:00.000Z",
      allDay: false,
      notes: "Meeting body https://calendar.example/private",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
    {
      id: "appointment-tomorrow-id",
      sourceSystem: "outlook",
      externalId: "outlook-calendar-event-id",
      title: "Tomorrow private appointment",
      startsAt: "2026-07-10T17:00:00.000Z",
      endsAt: "2026-07-10T17:30:00.000Z",
      allDay: false,
      notes: null,
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  people: [
    {
      id: "person-secret-id",
      slug: "private-person",
      name: "Private Person",
      aliases: ["VIP Alias"],
      roleSummary: "Billing contact",
      email: "private@example.com",
      phone: "555-0100",
      billingAddress: "Private billing address",
      notes: "Do not leak person notes",
      markdownPath: "C:\\Users\\operator\\Praxis\\people\\private.md",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  personWorkLinks: [
    {
      id: "link-secret-id",
      personId: "person-secret-id",
      entityKind: "mission",
      entityId: "mission-secret-id",
      relationship: "billing approver",
      sourceKind: "manual",
      createdAt: "2026-07-01T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
    },
  ],
  memoryDocuments: [
    {
      title: "Private memory title",
      relativePath: "memory/private.md",
      docKind: "mission",
      entityKind: "mission",
    },
  ],
};

const snapshot = buildHomeNodeCompanionSafeMasterSnapshot({
  generatedAt: "2026-07-09T16:05:00.000Z",
  workSnapshot,
  pairedDevices: [handoff.pairedDevice, revokedDevice],
  pendingConfirmations: [staged.confirmation, confirmed.confirmation],
  closeout,
});
const snapshotJson = JSON.stringify(snapshot);

assert.equal(snapshot.phase, "RM15");
assert.equal(snapshot.schemaVersion, "home-node-companion-safe-master-snapshot.v1");
assert.equal(snapshot.capability.readOnly, true);
assert.equal(snapshot.capability.commandsAccepted, false);
assert.equal(snapshot.capability.directStorageAccess, false);
assert.equal(snapshot.capability.directDatabaseAccess, false);
assert.equal(snapshot.capability.providerAccess, false);
assert.equal(snapshot.capability.rawPayloadAccess, false);
assert.equal(snapshot.capability.writeCommandsIncluded, false);
assert.equal(snapshot.homePcMaster.selectedTransport, "none");
assert.equal(snapshot.homePcMaster.runtimeProvider, "none");
assert.equal(snapshot.homePcMaster.qrTransport, "none");
assert.equal(snapshot.homePcMaster.requestAcceptance, "blocked");
assert.equal(snapshot.homePcMaster.readinessStatus, "ready_for_client_phase");
assert.equal(snapshot.homePcMaster.closeoutEvidenceComplete, true);
assert.equal(snapshot.devices.activeCount, 1);
assert.equal(snapshot.devices.revokedCount, 1);
assert.equal(snapshot.devices.localRecordOnly, true);
assert.equal(snapshot.devices.requestStagingEligibleCount, 1);
assert.equal(snapshot.pendingConfirmations.pendingCount, 1);
assert.equal(snapshot.pendingConfirmations.confirmedLocallyCount, 1);
assert.equal(snapshot.pendingConfirmations.writeBoundary, "pending_local_confirmation_only");
assert.equal(snapshot.pendingConfirmations.workMutationsApplied, false);
assert.equal(snapshot.pendingConfirmations.byActionKind.todo, 2);
assert.equal(snapshot.workOverview.activeMissionCount, 1);
assert.equal(snapshot.workOverview.activeProjectCount, 1);
assert.equal(snapshot.workOverview.activeTodoCount, 2);
assert.equal(snapshot.workOverview.activeDeadlineCount, 1);
assert.equal(snapshot.workOverview.appointmentCountToday, 1);
assert.equal(snapshot.workOverview.appointmentCountTomorrow, 1);
assert.equal(snapshot.workOverview.waitingOnCount, 1);
assert.equal(snapshot.workOverview.blockedCount, 1);
assert.equal(snapshot.workOverview.pausedCount, 1);
assert.equal(snapshot.workOverview.overdueCount, 2);
assert.equal(snapshot.workOverview.dueTodayCount, 2);
assert.equal(snapshot.workOverview.quickActionCount, 1);
assert.equal(snapshot.workOverview.moneyRelatedCount, 1);
assert.equal(snapshot.workOverview.peopleCount, 1);
assert.equal(snapshot.workOverview.activeRelationshipCount, 1);
assert.equal(snapshot.diagnostics.settingsRuntimeConsistent, true);

for (const authority of HOME_NODE_NETWORKING_DENIED_AUTHORITIES) {
  assert.equal(snapshot.authorityFlags[authority], false);
}

for (const forbidden of [
  "Do not leak mission title",
  "Project account 7788",
  "Todo invoice 4455",
  "Deadline subject private",
  "Appointment with private client",
  "Private Person",
  "VIP Alias",
  "private@example.com",
  "555-0100",
  "Private billing address",
  "Private memory title",
  "token-abc123",
  "provider payload",
  "provider-id",
  "google-calendar-event-id",
  "outlook-calendar-event-id",
  "https://provider.example/private",
  "https://calendar.example/private",
  "C:\\Users\\operator",
  "memory/private.md",
  "gmail-message-provider-id",
  "outlook-provider-id",
]) {
  assert.equal(snapshotJson.includes(forbidden), false, `snapshot leaked ${forbidden}`);
}

assert.deepEqual(Object.keys(snapshot).sort(), [
  "authorityFlags",
  "capability",
  "devices",
  "diagnostics",
  "excludedContent",
  "generatedAt",
  "homePcMaster",
  "pendingConfirmations",
  "phase",
  "schemaVersion",
  "source",
  "workOverview",
]);

console.log("home node companion-safe master snapshot tests passed");
