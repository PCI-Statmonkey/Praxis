import { strict as assert } from "node:assert";
import {
  buildEmailSuggestionDuplicateKey,
  isStaleEmailSuggestion,
  normalizeEmailSuggestionSubject,
} from "../shared/emailSuggestionRules";
import {
  normalizeGoogleCalendarEvent,
  normalizeOutlookCalendarEvent,
} from "../shared/calendarProviderNormalization";
import {
  authLabel,
  canSyncConnection,
  connectActionLabel,
  DEFAULT_AI_SETTINGS,
  isActivelySyncing,
  normalizeAiSettings,
  statusGuidance,
  summarizeOllamaInstalledModels,
  syncLabel,
} from "../shared/settingsModel";
import {
  isOllamaModelInstalled,
  parseOllamaModelTags,
} from "../electron/ollamaProbe";

assert.equal(normalizeEmailSuggestionSubject("Re: FWD:  Project Plan  "), "Project Plan");

const duplicateBase = buildEmailSuggestionDuplicateKey(
  {
    sourceSystem: "gmail",
    threadRef: "thread-1",
    senderEmail: "MAX@example.com",
    senderName: "Max",
  },
  {
    title: "Follow up: Project Plan!",
    suggestedEntityKind: "todo",
  }
);
const duplicateRepeat = buildEmailSuggestionDuplicateKey(
  {
    sourceSystem: "gmail",
    threadRef: "thread-1",
    senderEmail: "max@example.com",
    senderName: "Max",
  },
  {
    title: "follow up project plan",
    suggestedEntityKind: "todo",
  }
);
const duplicateDifferentKind = buildEmailSuggestionDuplicateKey(
  {
    sourceSystem: "gmail",
    threadRef: "thread-1",
    senderEmail: "max@example.com",
  },
  {
    title: "follow up project plan",
    suggestedEntityKind: "project",
  }
);
assert.equal(duplicateBase, duplicateRepeat);
assert.notEqual(duplicateBase, duplicateDifferentKind);

const now = new Date("2026-04-24T12:00:00.000Z");
assert.equal(
  isStaleEmailSuggestion({ receivedAt: "2026-03-01T12:00:00.000Z", dueAt: null }, now),
  true
);
assert.equal(
  isStaleEmailSuggestion(
    { receivedAt: "2026-03-01T12:00:00.000Z", dueAt: "2026-04-30T17:00:00.000Z" },
    now
  ),
  false
);
assert.equal(
  isStaleEmailSuggestion(
    { receivedAt: "2026-03-01T12:00:00.000Z", dueAt: "2026-04-01T17:00:00.000Z" },
    now
  ),
  true
);
assert.equal(
  isStaleEmailSuggestion({ receivedAt: "not a date", dueAt: null }, now),
  false
);

const googleAllDay = normalizeGoogleCalendarEvent(
  {
    id: "event-1",
    summary: "  Strategy Day  ",
    location: "Office",
    hangoutLink: "https://meet.example/google",
    htmlLink: "https://calendar.example/event-1",
    start: { date: "2026-04-25" },
    end: { date: "2026-04-26" },
  },
  "primary"
);
assert.equal(googleAllDay?.externalId, "primary:event-1");
assert.equal(googleAllDay?.title, "Strategy Day");
assert.equal(googleAllDay?.startsAt, "2026-04-25T00:00:00");
assert.equal(googleAllDay?.endsAt, "2026-04-26T00:00:00");
assert.equal(googleAllDay?.allDay, true);
assert.match(googleAllDay?.notes ?? "", /Location: Office/);
assert.match(googleAllDay?.notes ?? "", /Meet:/);
assert.equal(normalizeGoogleCalendarEvent({ status: "cancelled", start: { date: "2026-04-25" } }, "primary"), null);
assert.equal(normalizeGoogleCalendarEvent({ summary: "No start" }, "primary"), null);

const outlookTimed = normalizeOutlookCalendarEvent(
  {
    id: "outlook-1",
    subject: "Client Call",
    bodyPreview: "Discuss launch.",
    webLink: "https://outlook.example/event",
    location: { displayName: "Teams" },
    onlineMeeting: { joinUrl: "https://teams.example/join" },
    start: { dateTime: "2026-04-25T15:00:00" },
    end: { dateTime: "2026-04-25T16:00:00Z" },
  },
  "primary"
);
assert.equal(outlookTimed?.externalId, "primary:outlook-1");
assert.equal(outlookTimed?.startsAt, "2026-04-25T15:00:00Z");
assert.equal(outlookTimed?.endsAt, "2026-04-25T16:00:00Z");
assert.equal(outlookTimed?.allDay, false);
assert.match(outlookTimed?.notes ?? "", /Meeting:/);
assert.equal(
  normalizeOutlookCalendarEvent({ isCancelled: true, start: { dateTime: "2026-04-25T15:00:00" } }, "primary"),
  null
);
assert.equal(normalizeOutlookCalendarEvent({ subject: "No start" }, "primary"), null);

const readyReadiness = {
  ready: true,
  message: "OAuth is ready.",
};
const missingReadiness = {
  ready: false,
  message: "OAuth needs setup: client ID.",
};
const connectedState = {
  authStatus: "ready",
  syncStatus: "ready_to_sync",
  lastSyncedAt: "2026-04-24T12:00:00.000Z",
  lastSyncError: null,
  updatedAt: "2026-04-24T12:00:00.000Z",
};
assert.equal(authLabel(connectedState.authStatus), "Connected");
assert.equal(syncLabel(connectedState), "Synced");
assert.equal(connectActionLabel(connectedState), "Reconnect");
assert.equal(canSyncConnection(connectedState), true);

const needsCredentialsState = {
  ...connectedState,
  authStatus: "needs_credentials",
  syncStatus: "blocked",
  lastSyncedAt: null,
};
assert.equal(authLabel(needsCredentialsState.authStatus), "Needs sign-in");
assert.equal(syncLabel(needsCredentialsState), "Sync blocked");
assert.equal(connectActionLabel(needsCredentialsState), "Connect");
assert.equal(canSyncConnection(needsCredentialsState), false);
assert.equal(statusGuidance(needsCredentialsState, readyReadiness), "Connect this source before syncing.");
assert.equal(statusGuidance(needsCredentialsState, missingReadiness), missingReadiness.message);

const activeSyncingState = {
  ...connectedState,
  syncStatus: "syncing",
  updatedAt: new Date().toISOString(),
};
assert.equal(syncLabel(activeSyncingState), "Syncing");
assert.equal(isActivelySyncing(activeSyncingState), true);
assert.equal(canSyncConnection(activeSyncingState), false);
assert.equal(
  statusGuidance(activeSyncingState, readyReadiness),
  "Sync is running now. Settings will refresh when it finishes."
);

const staleSyncingState = {
  ...activeSyncingState,
  updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
};
assert.equal(syncLabel(staleSyncingState), "Interrupted");
assert.equal(isActivelySyncing(staleSyncingState), false);
assert.equal(canSyncConnection(staleSyncingState), true);
assert.equal(
  statusGuidance(staleSyncingState, readyReadiness),
  "The last sync did not finish. Start sync again to recover this source."
);

const syncErrorState = {
  ...connectedState,
  syncStatus: "error",
  lastSyncError: "Provider temporarily unavailable.",
};
assert.equal(syncLabel(syncErrorState), "Sync problem");
assert.equal(connectActionLabel(syncErrorState), "Reconnect");
assert.equal(canSyncConnection(syncErrorState), true);

const authErrorState = {
  ...syncErrorState,
  authStatus: "error",
};
assert.equal(authLabel(authErrorState.authStatus), "Connection problem");
assert.equal(connectActionLabel(authErrorState), "Reconnect");
assert.equal(canSyncConnection(authErrorState), false);

assert.deepEqual(normalizeAiSettings(), DEFAULT_AI_SETTINGS);
assert.deepEqual(normalizeAiSettings({ localModelName: "  gpt-oss-20b  " }), {
  ...DEFAULT_AI_SETTINGS,
  localModelName: "gpt-oss-20b",
});
assert.deepEqual(
  normalizeAiSettings({ localModelName: "   ", reliancePolicy: "balanced" }),
  {
    ...DEFAULT_AI_SETTINGS,
    localModelName: null,
    reliancePolicy: "balanced",
  }
);
assert.deepEqual(
  normalizeAiSettings(
    { reliancePolicy: "not-a-policy" as never },
    { ...DEFAULT_AI_SETTINGS, reliancePolicy: "local_only" }
  ),
  {
    ...DEFAULT_AI_SETTINGS,
    reliancePolicy: "local_only",
  }
);

assert.deepEqual(
  parseOllamaModelTags({
    models: [
      { name: "phi3:latest" },
      { model: "gpt-oss-20b:latest" },
      { name: "  " },
      { name: "phi3:latest" },
      null,
    ],
  }),
  ["phi3:latest", "gpt-oss-20b:latest"]
);
assert.equal(isOllamaModelInstalled("phi3", ["phi3:latest"]), true);
assert.equal(isOllamaModelInstalled("gpt-oss-20b:latest", ["gpt-oss-20b:latest"]), true);
assert.equal(isOllamaModelInstalled("gpt-oss-120b", ["gpt-oss-20b:latest"]), false);
assert.deepEqual(
  summarizeOllamaInstalledModels([
    "model-1:latest",
    "model-2:latest",
    "model-3:latest",
    "model-4:latest",
  ], 2),
  {
    visibleModels: ["model-1:latest", "model-2:latest"],
    hiddenCount: 2,
    label: "Installed tags: model-1:latest, model-2:latest, +2 more.",
  }
);
assert.deepEqual(summarizeOllamaInstalledModels([], 2), {
  visibleModels: [],
  hiddenCount: 0,
  label: "Installed tags: none reported.",
});

console.log("sync import regression tests passed");
