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
  DEFAULT_UI_SETTINGS,
  formatPraxisTime,
  isActivelySyncing,
  normalizeAiSettings,
  normalizeUiSettings,
  selectCalendarConnectionsByProvider,
  selectEmailConnectionsByProvider,
  serviceConnectionErrorMessage,
  shouldShowNoNewMailSuccessCopy,
  statusGuidance,
  summarizeOllamaInstalledModels,
  syncLabel,
  type SettingsSnapshot,
  uiFontScaleCssValue,
} from "../shared/settingsModel";
import {
  selectDashboardReadiness,
  selectServiceHealthItems,
} from "../src/dashboardSelectors";
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
assert.equal(connectActionLabel(connectedState), "Refresh Sign-In");
assert.equal(canSyncConnection(connectedState), true);

const needsCredentialsState = {
  ...connectedState,
  authStatus: "needs_credentials",
  syncStatus: "blocked",
  lastSyncedAt: null,
};
assert.equal(authLabel(needsCredentialsState.authStatus), "Needs sign-in");
assert.equal(syncLabel(needsCredentialsState), "Sync blocked");
assert.equal(connectActionLabel(needsCredentialsState), "Finish Setup");
assert.equal(canSyncConnection(needsCredentialsState), false);
assert.equal(statusGuidance(needsCredentialsState, readyReadiness), "Finish setup for this source before syncing.");
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
assert.equal(connectActionLabel(syncErrorState), "Refresh Sign-In");
assert.equal(canSyncConnection(syncErrorState), true);
assert.equal(shouldShowNoNewMailSuccessCopy(connectedState, 0), true);
assert.equal(shouldShowNoNewMailSuccessCopy(connectedState, 1), false);
assert.equal(shouldShowNoNewMailSuccessCopy(syncErrorState, 0), false);

const authErrorState = {
  ...syncErrorState,
  authStatus: "error",
  lastSyncError:
    "Saved Gmail sign-in could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this inbox.",
};
assert.equal(authLabel(authErrorState.authStatus), "Connection problem");
assert.equal(connectActionLabel(authErrorState), "Reconnect");
assert.equal(canSyncConnection(authErrorState), false);
assert.equal(shouldShowNoNewMailSuccessCopy(authErrorState, 0), false);
assert.equal(serviceConnectionErrorMessage(authErrorState), authErrorState.lastSyncError);
assert.equal(statusGuidance(authErrorState, readyReadiness), null);

const rawSafeStorageErrorState = {
  ...authErrorState,
  lastSyncError: "Error while decrypting the ciphertext provided to safeStorage.decryptString.",
};
assert.equal(
  serviceConnectionErrorMessage(rawSafeStorageErrorState),
  "Saved sign-in data could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this source."
);
assert.equal(
  statusGuidance({ ...authErrorState, lastSyncError: null }, readyReadiness),
  "Saved sign-in needs attention. Reconnect or refresh sign-in for this source."
);

const opaqueAuthErrorState = {
  ...authErrorState,
  lastSyncError: "invalid_request",
};
assert.equal(
  serviceConnectionErrorMessage(opaqueAuthErrorState),
  "Saved sign-in needs attention. Reconnect or refresh sign-in for this source."
);
assert.equal(
  serviceConnectionErrorMessage({
    ...opaqueAuthErrorState,
    lastSyncError: "Google OAuth failed: invalid_request.",
  }),
  "Saved sign-in needs attention. Reconnect or refresh sign-in for this source."
);
assert.equal(
  serviceConnectionErrorMessage({
    ...authErrorState,
    lastSyncError: "Gmail API has not been used in project 123 before or it is disabled.",
  }),
  "Gmail API has not been used in project 123 before or it is disabled."
);

const savedGmailRow = {
  id: "gmail-1",
  provider: "gmail",
  label: "Gmail Primary",
  accountRef: "person@example.com",
  enabled: true,
  authStatus: "error",
  syncStatus: "error",
  lastSyncedAt: null,
  lastSyncError: authErrorState.lastSyncError,
  createdAt: "2026-04-24T12:00:00.000Z",
  updatedAt: "2026-04-24T12:00:00.000Z",
} as const;
const savedOutlookCalendarRow = {
  id: "outlook-calendar-1",
  provider: "outlook",
  label: "Outlook Primary",
  accountRef: null,
  enabled: true,
  authStatus: "error",
  syncStatus: "error",
  lastSyncedAt: null,
  lastSyncError:
    "Saved Outlook sign-in could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this calendar.",
  createdAt: "2026-04-24T12:00:00.000Z",
  updatedAt: "2026-04-24T12:00:00.000Z",
} as const;
assert.deepEqual(selectEmailConnectionsByProvider([savedGmailRow], "gmail"), [savedGmailRow]);
assert.deepEqual(selectCalendarConnectionsByProvider([savedOutlookCalendarRow], "outlook"), [
  savedOutlookCalendarRow,
]);

const dashboardSettingsSnapshot = {
  calendarConnections: [savedOutlookCalendarRow],
  emailConnections: [
    {
      ...savedGmailRow,
      lastSyncError: opaqueAuthErrorState.lastSyncError,
    },
  ],
  calendarAutoSync: { enabled: true, intervalMinutes: 30 },
  secretStorage: {
    available: true,
    provider: "electron_safe_storage",
    reason: "OS-backed encryption is available for local secrets.",
  },
  googleOAuth: {
    clientId: "google-client",
    clientSecretConfigured: true,
    redirectUri: null,
    effectiveRedirectUri: "http://127.0.0.1:5174/oauth/google/callback",
  },
  outlookOAuth: {
    clientId: "outlook-client",
    clientSecretConfigured: true,
  },
  ai: DEFAULT_AI_SETTINGS,
  ui: DEFAULT_UI_SETTINGS,
  slack: {
    operatorChannelId: null,
    proactiveMirroringEnabled: false,
  },
} satisfies SettingsSnapshot;
const dashboardServiceHealth = selectServiceHealthItems(
  {
    settings: dashboardSettingsSnapshot,
    storage: null,
    slack: null,
    companion: null,
  },
  (value) => value ?? "never"
);
const googleHealth = dashboardServiceHealth.find((item) => item.label === "Google");
const outlookHealth = dashboardServiceHealth.find((item) => item.label === "Outlook");
assert.equal(googleHealth?.state, "problem");
assert.equal(
  googleHealth?.detail,
  "Saved sign-in needs attention. Reconnect or refresh sign-in for this source."
);
assert.doesNotMatch(googleHealth?.detail ?? "", /invalid_request/);
assert.equal(outlookHealth?.state, "problem");
assert.equal(
  outlookHealth?.detail,
  "Saved Outlook sign-in could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this calendar."
);
const dashboardReadiness = selectDashboardReadiness(dashboardServiceHealth);
assert.equal(dashboardReadiness.state, "problem");
assert.doesNotMatch(dashboardReadiness.detail, /invalid_request/);
assert.match(dashboardReadiness.detail, /Google: Saved sign-in needs attention/);
assert.match(dashboardReadiness.detail, /Outlook: Saved Outlook sign-in could not be decrypted/);

const safeStorageDashboardServiceHealth = selectServiceHealthItems(
  {
    settings: {
      ...dashboardSettingsSnapshot,
      emailConnections: [
        {
          ...savedGmailRow,
          lastSyncError: rawSafeStorageErrorState.lastSyncError,
        },
      ],
      calendarConnections: [],
    },
    storage: null,
    slack: null,
    companion: null,
  },
  (value) => value ?? "never"
);
const safeStorageGoogleHealth = safeStorageDashboardServiceHealth.find(
  (item) => item.label === "Google"
);
assert.equal(
  safeStorageGoogleHealth?.detail,
  "Saved sign-in data could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this source."
);
const safeStorageDashboardReadiness = selectDashboardReadiness(safeStorageDashboardServiceHealth);
assert.doesNotMatch(dashboardReadiness.detail, /safeStorage\.decryptString/);
assert.doesNotMatch(safeStorageDashboardReadiness.detail, /safeStorage\.decryptString/);

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

assert.deepEqual(normalizeUiSettings(), DEFAULT_UI_SETTINGS);
assert.deepEqual(normalizeUiSettings({ fontScalePercent: 108 }), {
  fontScalePercent: 108,
  timeFormat: "standard",
});
assert.deepEqual(normalizeUiSettings({ fontScalePercent: 200, timeFormat: "military" }), {
  fontScalePercent: 114,
  timeFormat: "military",
});
assert.deepEqual(
  normalizeUiSettings({ fontScalePercent: 50, timeFormat: "unknown" } as unknown as Partial<
    typeof DEFAULT_UI_SETTINGS
  >),
  {
    fontScalePercent: 94,
    timeFormat: "standard",
  }
);
assert.equal(uiFontScaleCssValue({ fontScalePercent: 106 }), "1.06");
assert.equal(formatPraxisTime("2026-04-24T14:30:00", "standard"), "2:30 PM");
assert.equal(formatPraxisTime("2026-04-24T14:30:00", "military"), "14:30");

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
