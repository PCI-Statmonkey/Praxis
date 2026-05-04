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

export const SAFE_STORAGE_DECRYPT_ERROR_PATTERN =
  /Error while decrypting the ciphertext provided to safeStorage\.decryptString/i;

export const DECRYPTED_SIGN_IN_ERROR_GUIDANCE =
  "Saved sign-in data could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this source.";

export const RECONNECT_SIGN_IN_ERROR_GUIDANCE =
  "Saved sign-in needs attention. Reconnect or refresh sign-in for this source.";

const OPAQUE_PROVIDER_AUTH_ERROR_PATTERN =
  /^(?:(?:google|gmail|outlook|microsoft|provider|oauth)\s+(?:oauth\s+)?(?:failed|error):\s*)?(invalid_request|invalid_grant|unauthorized_client|access_denied)\.?$/i;

export const sanitizeServiceConnectionErrorMessage = (lastSyncError: string | null) => {
  if (!lastSyncError) {
    return null;
  }

  const trimmedError = lastSyncError.trim();
  if (SAFE_STORAGE_DECRYPT_ERROR_PATTERN.test(trimmedError)) {
    return DECRYPTED_SIGN_IN_ERROR_GUIDANCE;
  }
  if (OPAQUE_PROVIDER_AUTH_ERROR_PATTERN.test(trimmedError)) {
    return RECONNECT_SIGN_IN_ERROR_GUIDANCE;
  }

  return lastSyncError;
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
  if (connection.authStatus === "error") {
    return connection.lastSyncError ? null : RECONNECT_SIGN_IN_ERROR_GUIDANCE;
  }
  if (connection.authStatus === "needs_credentials") {
    return readiness.ready ? "Finish setup for this source before syncing." : readiness.message;
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

export const connectActionLabel = (connection: ServiceConnectionState) => {
  switch (connection.authStatus) {
    case "ready":
      return "Refresh Sign-In";
    case "error":
      return "Reconnect";
    case "needs_credentials":
    case "not_configured":
      return "Finish Setup";
    default:
      return "Reconnect";
  }
};

export const serviceConnectionErrorMessage = (connection: ServiceConnectionState) => {
  return sanitizeServiceConnectionErrorMessage(connection.lastSyncError);
};

export const shouldShowNoNewMailSuccessCopy = (
  connection: ServiceConnectionState,
  messageCount: number
) =>
  Boolean(connection.lastSyncedAt) &&
  connection.authStatus === "ready" &&
  connection.syncStatus === "ready_to_sync" &&
  !serviceConnectionErrorMessage(connection) &&
  messageCount === 0;

export const selectEmailConnectionsByProvider = (
  connections: EmailConnectionRecord[],
  provider: EmailProvider
) => connections.filter((connection) => connection.provider === provider);

export const selectCalendarConnectionsByProvider = (
  connections: CalendarConnectionRecord[],
  provider: CalendarProvider
) => connections.filter((connection) => connection.provider === provider);

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

export type UiSettings = {
  fontScalePercent: number;
};

export type UpdateAiSettingsInput = {
  localModelName?: string | null;
  reliancePolicy?: AiReliancePolicy;
};

export type UpdateUiSettingsInput = {
  fontScalePercent?: number;
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

export type OllamaInstalledModelSummary = {
  visibleModels: string[];
  hiddenCount: number;
  label: string;
};

export const summarizeOllamaInstalledModels = (
  installedModels: string[],
  limit = 6
): OllamaInstalledModelSummary => {
  const normalizedLimit = Number.isFinite(limit) ? Math.max(Math.floor(limit), 1) : 6;
  const visibleModels = installedModels.slice(0, normalizedLimit);
  const hiddenCount = Math.max(installedModels.length - visibleModels.length, 0);
  const visibleLabel = visibleModels.join(", ");
  const hiddenLabel = hiddenCount > 0 ? `, +${hiddenCount} more` : "";

  return {
    visibleModels,
    hiddenCount,
    label:
      installedModels.length > 0
        ? `Installed tags: ${visibleLabel}${hiddenLabel}.`
        : "Installed tags: none reported.",
  };
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  localRuntime: "ollama",
  localModelName: null,
  reliancePolicy: "prefer_local",
};

export const UI_FONT_SCALE_MIN_PERCENT = 94;
export const UI_FONT_SCALE_MAX_PERCENT = 114;
export const UI_FONT_SCALE_STEP_PERCENT = 2;

export const DEFAULT_UI_SETTINGS: UiSettings = {
  fontScalePercent: 100,
};

export const normalizeUiSettings = (
  input: Partial<UiSettings | UpdateUiSettingsInput> = {},
  fallback: UiSettings = DEFAULT_UI_SETTINGS
): UiSettings => {
  const rawScale =
    typeof input.fontScalePercent === "number" && Number.isFinite(input.fontScalePercent)
      ? input.fontScalePercent
      : fallback.fontScalePercent;
  const roundedScale = Math.round(rawScale);
  const fontScalePercent = Math.min(
    UI_FONT_SCALE_MAX_PERCENT,
    Math.max(UI_FONT_SCALE_MIN_PERCENT, roundedScale)
  );

  return {
    fontScalePercent,
  };
};

export const uiFontScaleCssValue = (settings: Partial<UiSettings | UpdateUiSettingsInput>) =>
  `${normalizeUiSettings(settings).fontScalePercent / 100}`;

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
  ui: UiSettings;
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
