import type { EmailConnectionRecord, EmailProvider } from "./emailModel";
import type { CalendarAutoSyncSettings } from "./calendarAutoSyncSettings";

export type {
  CalendarAutoSyncSettings,
  UpdateCalendarAutoSyncSettingsInput,
} from "./calendarAutoSyncSettings";

export type CalendarProvider = "google" | "outlook" | "other";
export type CalendarAuthStatus = "not_configured" | "needs_credentials" | "ready" | "error";
export type CalendarSyncStatus = "manual_import_only" | "blocked" | "ready_to_sync" | "syncing" | "error";

export type SecretStorageStatus = {
  available: boolean;
  provider: "electron_safe_storage";
  reason: string;
};

export type CalendarConnectionRecord = {
  id: string;
  provider: CalendarProvider;
  label: string;
  accountRef: string | null;
  enabled: boolean;
  authStatus: CalendarAuthStatus;
  syncStatus: CalendarSyncStatus;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export const SERVICE_STALE_SYNCING_MS = 10 * 60 * 1000;

export type ServiceConnectionState = {
  authStatus: CalendarAuthStatus | import("./emailModel").EmailAuthStatus | string;
  syncStatus: CalendarSyncStatus | import("./emailModel").EmailSyncStatus | string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  updatedAt: string;
};

export type ServiceReadinessState = {
  ready: boolean;
  message: string;
};

export const isStaleSyncing = (connection: ServiceConnectionState) => {
  if (connection.syncStatus !== "syncing") {
    return false;
  }

  const updatedAt = new Date(connection.updatedAt).getTime();
  return Number.isNaN(updatedAt) || Date.now() - updatedAt > SERVICE_STALE_SYNCING_MS;
};

export const isActivelySyncing = (connection: ServiceConnectionState) =>
  connection.syncStatus === "syncing" && !isStaleSyncing(connection);

export const authLabel = (authStatus: ServiceConnectionState["authStatus"]) => {
  switch (authStatus) {
    case "ready":
      return "Connected";
    case "needs_credentials":
      return "Needs sign-in";
    case "not_configured":
      return "Not configured";
    case "error":
      return "Connection problem";
    default:
      return authStatus;
  }
};

export const syncLabel = (connection: ServiceConnectionState) => {
  if (isStaleSyncing(connection)) {
    return "Interrupted";
  }

  if (connection.lastSyncedAt && connection.syncStatus === "ready_to_sync") {
    return "Synced";
  }

  switch (connection.syncStatus) {
    case "manual_import_only":
      return "Manual import only";
    case "blocked":
      return "Sync blocked";
    case "ready_to_sync":
      return "Ready to sync";
    case "syncing":
      return "Syncing";
    case "error":
      return "Sync problem";
    default:
      return connection.syncStatus;
  }
};

export const statusGuidance = (
  connection: ServiceConnectionState,
  readiness: ServiceReadinessState
) => {
  if (connection.authStatus === "needs_credentials") {
    return readiness.ready ? "Connect this source before syncing." : readiness.message;
  }
  if (connection.authStatus === "not_configured") {
    return readiness.message;
  }
  if (isActivelySyncing(connection)) {
    return "Sync is running now. Settings will refresh when it finishes.";
  }
  if (isStaleSyncing(connection)) {
    return "The last sync did not finish. Start sync again to recover this source.";
  }
  if (connection.syncStatus === "blocked") {
    return "Sync is blocked until this source is connected again.";
  }
  return null;
};

export const canSyncConnection = (connection: ServiceConnectionState) =>
  connection.authStatus === "ready" && !isActivelySyncing(connection);

export const connectActionLabel = (connection: ServiceConnectionState) =>
  connection.authStatus === "needs_credentials" || connection.authStatus === "not_configured"
    ? "Connect"
    : "Reconnect";

export type GoogleOAuthSettings = {
  clientId: string | null;
  clientSecretConfigured: boolean;
  redirectUri: string | null;
  effectiveRedirectUri: string;
};

export type OutlookOAuthSettings = {
  clientId: string | null;
  clientSecretConfigured: boolean;
};

export type AiLocalRuntime = "ollama";

export type AiReliancePolicy =
  | "local_only"
  | "prefer_local"
  | "balanced"
  | "prefer_api"
  | "api_only";

export type AiSettings = {
  localRuntime: AiLocalRuntime;
  localModelName: string | null;
  reliancePolicy: AiReliancePolicy;
};

export type UpdateAiSettingsInput = {
  localModelName?: string | null;
  reliancePolicy?: AiReliancePolicy;
};

export type CheckOllamaModelAvailabilityInput = {
  modelName?: string | null;
};

export type OllamaModelAvailabilityStatus =
  | "no_model_selected"
  | "unavailable"
  | "available"
  | "missing";

export type OllamaModelAvailabilityResult = {
  localRuntime: AiLocalRuntime;
  status: OllamaModelAvailabilityStatus;
  modelName: string | null;
  installedModels: string[];
  message: string;
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  localRuntime: "ollama",
  localModelName: null,
  reliancePolicy: "prefer_local",
};

const aiReliancePolicies = new Set<AiReliancePolicy>([
  "local_only",
  "prefer_local",
  "balanced",
  "prefer_api",
  "api_only",
]);

export const isAiReliancePolicy = (value: unknown): value is AiReliancePolicy =>
  typeof value === "string" && aiReliancePolicies.has(value as AiReliancePolicy);

export const normalizeAiSettings = (
  input: Partial<AiSettings | UpdateAiSettingsInput> = {},
  fallback: AiSettings = DEFAULT_AI_SETTINGS
): AiSettings => {
  const rawModelName =
    typeof input.localModelName === "string"
      ? input.localModelName
      : input.localModelName === null
        ? ""
        : fallback.localModelName ?? "";
  const localModelName = rawModelName.trim();

  return {
    localRuntime: "ollama",
    localModelName: localModelName.length > 0 ? localModelName : null,
    reliancePolicy: isAiReliancePolicy(input.reliancePolicy)
      ? input.reliancePolicy
      : fallback.reliancePolicy,
  };
};

export type CreateCalendarConnectionInput = {
  provider: CalendarProvider;
  label: string;
  accountRef?: string;
  enabled?: boolean;
  authStatus?: CalendarAuthStatus;
  syncStatus?: CalendarSyncStatus;
};

export type SettingsSnapshot = {
  calendarConnections: CalendarConnectionRecord[];
  emailConnections: EmailConnectionRecord[];
  calendarAutoSync: CalendarAutoSyncSettings;
  secretStorage: SecretStorageStatus;
  googleOAuth: GoogleOAuthSettings;
  outlookOAuth: OutlookOAuthSettings;
  ai: AiSettings;
  slack: SlackSettings;
};

export type UpdateGoogleOAuthSettingsInput = {
  clientId?: string;
  clientSecret?: string;
  clearClientSecret?: boolean;
  redirectUri?: string;
};

export type UpdateOutlookOAuthSettingsInput = {
  clientId?: string;
  clientSecret?: string;
  clearClientSecret?: boolean;
};

export type DeleteCalendarConnectionInput = {
  id: string;
};

export type UpdateCalendarConnectionInput = {
  id: string;
  label?: string;
  accountRef?: string;
  enabled?: boolean;
};

export type CreateEmailConnectionInput = {
  provider: EmailProvider;
  label: string;
  accountRef?: string;
  enabled?: boolean;
  authStatus?: import("./emailModel").EmailAuthStatus;
  syncStatus?: import("./emailModel").EmailSyncStatus;
};

export type DeleteEmailConnectionInput = {
  id: string;
};

export type UpdateEmailConnectionInput = {
  id: string;
  label?: string;
  accountRef?: string;
  enabled?: boolean;
};

export type SlackSettings = {
  operatorChannelId: string | null;
  proactiveMirroringEnabled: boolean;
};

export type UpdateSlackSettingsInput = {
  operatorChannelId?: string;
  proactiveMirroringEnabled?: boolean;
};
