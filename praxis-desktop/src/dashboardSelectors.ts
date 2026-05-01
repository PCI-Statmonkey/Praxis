import type { ChatImportSnapshot } from "../shared/chatImport";
import type { CompanionSnapshot } from "../shared/companionSnapshot";
import type { EmailSnapshot } from "../shared/emailModel";
import {
  buildReviewInboxFromChatSuggestions,
  buildReviewInboxFromEmailSuggestions,
  sortReviewInboxItems,
} from "../shared/reviewInbox";
import type { ReviewInboxItem } from "../shared/reviewInbox";
import type { SettingsSnapshot } from "../shared/settingsModel";
import type { SlackAdapterStatus } from "../shared/slackAdapter";
import type { StorageOverview } from "../shared/storage/hybridStorage";
import type { AppointmentRecord, DeadlineRecord } from "../shared/workModel";

export type DashboardServiceSnapshot = {
  settings: SettingsSnapshot | null;
  storage: StorageOverview | null;
  slack: SlackAdapterStatus | null;
  companion: CompanionSnapshot | null;
};

export type ServiceHealthState = "online" | "setup" | "idle" | "problem" | "loading";

export type ServiceHealthItem = {
  label: string;
  state: ServiceHealthState;
  detail: string;
  action: string;
};

export type DashboardReadiness = {
  state: Exclude<ServiceHealthState, "idle" | "loading">;
  title: string;
  detail: string;
  action: string;
};

type IntegrationConnection = {
  label: string;
  enabled: boolean;
  authStatus: string;
  syncStatus: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export const EMPTY_SERVICE_SNAPSHOT: DashboardServiceSnapshot = {
  settings: null,
  storage: null,
  slack: null,
  companion: null,
};

export const selectUpcomingDeadlines = (deadlines: DeadlineRecord[]): DeadlineRecord[] =>
  deadlines.filter((deadline) => deadline.status !== "completed");

export const selectUpcomingAppointments = (
  appointments: AppointmentRecord[],
  now = Date.now()
): AppointmentRecord[] =>
  appointments.filter((appointment) => {
    const startsAt = new Date(appointment.startsAt);
    return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() >= now - 60 * 60 * 1000;
  });

export const selectReviewInboxItems = (
  emailSnapshot: EmailSnapshot,
  chatSnapshot: ChatImportSnapshot
): ReviewInboxItem[] => {
  const pendingEmailSuggestions = emailSnapshot.suggestions.filter(
    (suggestion) => suggestion.status === "pending"
  );
  const pendingChatSuggestions = chatSnapshot.suggestions.filter(
    (suggestion) => suggestion.status === "pending"
  );

  return sortReviewInboxItems([
    ...buildReviewInboxFromEmailSuggestions(pendingEmailSuggestions),
    ...buildReviewInboxFromChatSuggestions(pendingChatSuggestions),
  ]);
};

const formatServiceStatus = (value: string) => value.split("_").join(" ");

const newestSyncTime = (connections: IntegrationConnection[]) =>
  connections
    .map((connection) => connection.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

const summarizeIntegrationHealth = (
  label: string,
  connections: IntegrationConnection[],
  oauthReady: boolean,
  formatTimestamp: (value: string | null) => string
): ServiceHealthItem => {
  const enabledConnections = connections.filter((connection) => connection.enabled);
  const problemConnection = enabledConnections.find(
    (connection) =>
      connection.authStatus === "error" ||
      connection.syncStatus === "error" ||
      connection.syncStatus === "blocked" ||
      Boolean(connection.lastSyncError)
  );

  if (problemConnection) {
    return {
      label,
      state: "problem",
      detail:
        problemConnection.lastSyncError ||
        `${problemConnection.label}: ${formatServiceStatus(problemConnection.syncStatus)}`,
      action: "Open Settings to reconnect or retry sync.",
    };
  }

  const readyConnection = enabledConnections.find(
    (connection) => connection.authStatus === "ready" && connection.syncStatus !== "blocked"
  );

  if (readyConnection) {
    const lastSyncedAt = newestSyncTime(enabledConnections);
    return {
      label,
      state: "online",
      detail: lastSyncedAt ? `last sync ${formatTimestamp(lastSyncedAt)}` : "connected, no sync yet",
      action: "Ready for dashboard planning.",
    };
  }

  if (connections.length > 0 || oauthReady) {
    return {
      label,
      state: "setup",
      detail: oauthReady ? "account authorization needed" : "OAuth credentials missing",
      action: "Finish account setup before relying on sync.",
    };
  }

  return {
    label,
    state: "idle",
    detail: "not configured",
    action: "Optional; capture can still run locally.",
  };
};

export const selectServiceHealthItems = (
  serviceSnapshot: DashboardServiceSnapshot,
  formatTimestamp: (value: string | null) => string
): ServiceHealthItem[] => {
  const googleConnections: IntegrationConnection[] = [
    ...(serviceSnapshot.settings?.emailConnections.filter(
      (connection) => connection.provider === "gmail"
    ) ?? []),
    ...(serviceSnapshot.settings?.calendarConnections.filter(
      (connection) => connection.provider === "google"
    ) ?? []),
  ];
  const outlookConnections: IntegrationConnection[] = [
    ...(serviceSnapshot.settings?.emailConnections.filter(
      (connection) => connection.provider === "outlook"
    ) ?? []),
    ...(serviceSnapshot.settings?.calendarConnections.filter(
      (connection) => connection.provider === "outlook"
    ) ?? []),
  ];
  const googleOAuthReady = Boolean(
    serviceSnapshot.settings?.googleOAuth.clientId &&
      serviceSnapshot.settings.googleOAuth.clientSecretConfigured
  );
  const outlookOAuthReady = Boolean(
    serviceSnapshot.settings?.outlookOAuth.clientId &&
      serviceSnapshot.settings.outlookOAuth.clientSecretConfigured
  );
  const slackHealth: ServiceHealthItem = serviceSnapshot.slack
    ? {
        label: "Slack",
        state: serviceSnapshot.slack.enabled ? "online" : "idle",
        detail: serviceSnapshot.slack.enabled ? "adapter ready" : serviceSnapshot.slack.reason,
        action: serviceSnapshot.slack.enabled
          ? "Operator mirroring is available."
          : "Optional; dashboard still works locally.",
      }
    : {
        label: "Slack",
        state: "loading",
        detail: "status loading",
        action: "Waiting for adapter status.",
      };
  const memoryHealth: ServiceHealthItem = serviceSnapshot.storage
    ? {
        label: "Memory",
        state: "online",
        detail: `${serviceSnapshot.storage.indexedDocumentCount} docs indexed`,
        action:
          serviceSnapshot.storage.indexedDocumentCount > 0
            ? "Markdown memory is indexed."
            : "Run memory reindex if expected notes are missing.",
      }
    : {
        label: "Memory",
        state: "loading",
        detail: "index loading",
        action: "Waiting for local storage overview.",
      };
  const companionHealth: ServiceHealthItem = serviceSnapshot.companion
    ? {
        label: "Companion",
        state: serviceSnapshot.companion.capability.commandsAccepted ? "online" : "idle",
        detail: serviceSnapshot.companion.capability.commandsAccepted ? "commands ready" : "read only",
        action: serviceSnapshot.companion.capability.commandsAccepted
          ? "Companion commands are accepted."
          : serviceSnapshot.companion.capability.notes,
      }
    : {
        label: "Companion",
        state: "loading",
        detail: "snapshot loading",
        action: "Waiting for companion snapshot.",
      };

  return [
    summarizeIntegrationHealth("Google", googleConnections, googleOAuthReady, formatTimestamp),
    summarizeIntegrationHealth("Outlook", outlookConnections, outlookOAuthReady, formatTimestamp),
    slackHealth,
    memoryHealth,
    companionHealth,
  ];
};

export const selectDashboardReadiness = (
  serviceHealthItems: ServiceHealthItem[]
): DashboardReadiness => {
  const serviceProblemItems = serviceHealthItems.filter((item) => item.state === "problem");
  const serviceSetupItems = serviceHealthItems.filter((item) => item.state === "setup");

  return serviceProblemItems.length > 0
    ? {
        state: "problem",
        title: `${serviceProblemItems.length} service problem${
          serviceProblemItems.length === 1 ? "" : "s"
        }`,
        detail: serviceProblemItems.map((item) => `${item.label}: ${item.detail}`).join(" | "),
        action: "Resolve problem services before trusting imported calendar or inbox data.",
      }
    : serviceSetupItems.length > 0
      ? {
          state: "setup",
          title: `${serviceSetupItems.length} service${serviceSetupItems.length === 1 ? "" : "s"} need setup`,
          detail: serviceSetupItems.map((item) => `${item.label}: ${item.detail}`).join(" | "),
          action: "Local capture is available; sync-backed lanes may be incomplete.",
        }
      : {
          state: "online",
          title: "Dashboard ready",
          detail: "Local storage is online and no configured service is reporting a problem.",
          action: "Use the rhythm cards below for the next move, triage, and closeout.",
        };
};
