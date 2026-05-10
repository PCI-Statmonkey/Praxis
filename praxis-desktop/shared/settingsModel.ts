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
export type AiApiProvider = "openai_compatible";

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
  apiProvider: AiApiProvider;
  apiBaseUrl: string | null;
  apiModelName: string | null;
  apiKeyConfigured: boolean;
};

export type UiTimeFormat = "standard" | "military";
export type PresenceMode = "active" | "paused" | "quiet_until";

export type UiSettings = {
  fontScalePercent: number;
  timeFormat: UiTimeFormat;
  closeToTrayEnabled: boolean;
  notificationsEnabled: boolean;
  notificationQuietWindowEnabled: boolean;
  notificationQuietStartMinutes: number;
  notificationQuietEndMinutes: number;
};

export type PresenceSettings = {
  mode: PresenceMode;
  quietUntil: string | null;
  updatedAt: string | null;
};

export type UpdateAiSettingsInput = {
  localModelName?: string | null;
  reliancePolicy?: AiReliancePolicy;
  apiProvider?: AiApiProvider;
  apiBaseUrl?: string | null;
  apiModelName?: string | null;
  apiKey?: string | null;
  clearApiKey?: boolean;
};

export type UpdateUiSettingsInput = {
  fontScalePercent?: number;
  timeFormat?: UiTimeFormat;
  closeToTrayEnabled?: boolean;
  notificationsEnabled?: boolean;
  notificationQuietWindowEnabled?: boolean;
  notificationQuietStartMinutes?: number;
  notificationQuietEndMinutes?: number;
};

export type UpdatePresenceSettingsInput = {
  mode?: PresenceMode;
  quietUntil?: string | null;
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
  apiProvider: "openai_compatible",
  apiBaseUrl: null,
  apiModelName: null,
  apiKeyConfigured: false,
};

export const UI_FONT_SCALE_MIN_PERCENT = 94;
export const UI_FONT_SCALE_MAX_PERCENT = 114;
export const UI_FONT_SCALE_STEP_PERCENT = 2;

export const DEFAULT_UI_SETTINGS: UiSettings = {
  fontScalePercent: 100,
  timeFormat: "standard",
  closeToTrayEnabled: false,
  notificationsEnabled: false,
  notificationQuietWindowEnabled: true,
  notificationQuietStartMinutes: 22 * 60,
  notificationQuietEndMinutes: 7 * 60,
};

export const DEFAULT_PRESENCE_SETTINGS: PresenceSettings = {
  mode: "active",
  quietUntil: null,
  updatedAt: null,
};

const uiTimeFormats = new Set<UiTimeFormat>(["standard", "military"]);
const presenceModes = new Set<PresenceMode>(["active", "paused", "quiet_until"]);

export const isUiTimeFormat = (value: unknown): value is UiTimeFormat =>
  typeof value === "string" && uiTimeFormats.has(value as UiTimeFormat);
export const isPresenceMode = (value: unknown): value is PresenceMode =>
  typeof value === "string" && presenceModes.has(value as PresenceMode);

const normalizeIsoDateOrNull = (value: unknown) => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeMinuteOfDay = (value: unknown, fallback: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(23 * 60 + 59, Math.max(0, Math.floor(value)));
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
    timeFormat: isUiTimeFormat(input.timeFormat) ? input.timeFormat : fallback.timeFormat,
    closeToTrayEnabled:
      typeof input.closeToTrayEnabled === "boolean"
        ? input.closeToTrayEnabled
        : fallback.closeToTrayEnabled,
    notificationsEnabled:
      typeof input.notificationsEnabled === "boolean"
        ? input.notificationsEnabled
        : fallback.notificationsEnabled,
    notificationQuietWindowEnabled:
      typeof input.notificationQuietWindowEnabled === "boolean"
        ? input.notificationQuietWindowEnabled
        : fallback.notificationQuietWindowEnabled,
    notificationQuietStartMinutes: normalizeMinuteOfDay(
      input.notificationQuietStartMinutes,
      fallback.notificationQuietStartMinutes
    ),
    notificationQuietEndMinutes: normalizeMinuteOfDay(
      input.notificationQuietEndMinutes,
      fallback.notificationQuietEndMinutes
    ),
  };
};

export const uiFontScaleCssValue = (settings: Partial<UiSettings | UpdateUiSettingsInput>) =>
  `${normalizeUiSettings(settings).fontScalePercent / 100}`;

export const normalizePresenceSettings = (
  input: Partial<PresenceSettings | UpdatePresenceSettingsInput> = {},
  fallback: PresenceSettings = DEFAULT_PRESENCE_SETTINGS
): PresenceSettings => {
  const mode = isPresenceMode(input.mode) ? input.mode : fallback.mode;
  const quietUntil =
    input.quietUntil === undefined
      ? fallback.quietUntil
      : normalizeIsoDateOrNull(input.quietUntil);
  const updatedAt =
    "updatedAt" in input && input.updatedAt !== undefined
      ? normalizeIsoDateOrNull(input.updatedAt)
      : fallback.updatedAt;

  return {
    mode: mode === "quiet_until" && !quietUntil ? "active" : mode,
    quietUntil: mode === "quiet_until" ? quietUntil : null,
    updatedAt,
  };
};

export const resolvePresenceSettings = (
  settings: PresenceSettings,
  now: Date | string | number = new Date()
): PresenceSettings => {
  const normalized = normalizePresenceSettings(settings);
  const nowDate = now instanceof Date ? now : new Date(now);
  if (
    normalized.mode === "quiet_until" &&
    normalized.quietUntil &&
    !Number.isNaN(nowDate.getTime()) &&
    Date.parse(normalized.quietUntil) <= nowDate.getTime()
  ) {
    return {
      ...normalized,
      mode: "active",
      quietUntil: null,
    };
  }
  return normalized;
};

export const formatPraxisTime = (
  value: Date | string | number,
  timeFormat: UiTimeFormat = DEFAULT_UI_SETTINGS.timeFormat
) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  if (timeFormat === "military") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const aiReliancePolicies = new Set<AiReliancePolicy>([
  "local_only",
  "prefer_local",
  "balanced",
  "prefer_api",
  "api_only",
]);
const aiApiProviders = new Set<AiApiProvider>(["openai_compatible"]);

export const isAiReliancePolicy = (value: unknown): value is AiReliancePolicy =>
  typeof value === "string" && aiReliancePolicies.has(value as AiReliancePolicy);

export const isAiApiProvider = (value: unknown): value is AiApiProvider =>
  typeof value === "string" && aiApiProviders.has(value as AiApiProvider);

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
  const rawApiBaseUrl =
    typeof input.apiBaseUrl === "string"
      ? input.apiBaseUrl
      : input.apiBaseUrl === null
        ? ""
        : fallback.apiBaseUrl ?? "";
  const apiBaseUrl = rawApiBaseUrl.trim();
  const rawApiModelName =
    typeof input.apiModelName === "string"
      ? input.apiModelName
      : input.apiModelName === null
        ? ""
        : fallback.apiModelName ?? "";
  const apiModelName = rawApiModelName.trim();
  const apiKeyConfigured =
    "apiKeyConfigured" in input && typeof input.apiKeyConfigured === "boolean"
      ? input.apiKeyConfigured
      : fallback.apiKeyConfigured;

  return {
    localRuntime: "ollama",
    localModelName: localModelName.length > 0 ? localModelName : null,
    reliancePolicy: isAiReliancePolicy(input.reliancePolicy)
      ? input.reliancePolicy
      : fallback.reliancePolicy,
    apiProvider: isAiApiProvider(input.apiProvider) ? input.apiProvider : fallback.apiProvider,
    apiBaseUrl: apiBaseUrl.length > 0 ? apiBaseUrl : null,
    apiModelName: apiModelName.length > 0 ? apiModelName : null,
    apiKeyConfigured,
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
  presence: PresenceSettings;
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
