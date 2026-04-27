import crypto from "node:crypto";
import type {
  CalendarAuthStatus,
  CalendarConnectionRecord,
  CalendarSyncStatus,
  CreateCalendarConnectionInput,
  DeleteCalendarConnectionInput,
  CreateEmailConnectionInput,
  DeleteEmailConnectionInput,
  UpdateCalendarConnectionInput,
  UpdateEmailConnectionInput,
  GoogleOAuthSettings,
  OutlookOAuthSettings,
  SettingsSnapshot,
  UpdateCalendarAutoSyncSettingsInput,
  SlackSettings,
  UpdateGoogleOAuthSettingsInput,
  UpdateOutlookOAuthSettingsInput,
  UpdateSlackSettingsInput,
} from "../shared/settingsModel";
import {
  DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS,
  normalizeCalendarAutoSyncSettings,
} from "../shared/calendarAutoSyncSettings";
import type {
  EmailAuthStatus,
  EmailConnectionRecord,
  EmailSyncStatus,
} from "../shared/emailModel";
import { getPraxisDatabase } from "./praxisDb";
import {
  deleteSecret,
  deleteSecretsForOwner,
  getSecretStorageStatus,
  hasSecret,
  readSecret,
  storeSecret,
} from "./secretRepository";

type DbCalendarConnection = {
  id: string;
  provider: CalendarConnectionRecord["provider"];
  label: string;
  account_ref: string | null;
  enabled: number;
  auth_status: CalendarAuthStatus | null;
  sync_status: CalendarSyncStatus | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

type DbEmailConnection = {
  id: string;
  provider: EmailConnectionRecord["provider"];
  label: string;
  account_ref: string | null;
  enabled: number;
  auth_status: EmailAuthStatus | null;
  sync_status: EmailSyncStatus | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

const nowIso = () => new Date().toISOString();
const slackSettingsKey = "slack";
const calendarAutoSyncSettingsKey = "calendar_auto_sync";
const googleOAuthSettingsKey = "google_oauth";
const googleOAuthIntegrationOwnerId = "google_calendar";
const outlookOAuthSettingsKey = "outlook_oauth";
const outlookOAuthIntegrationOwnerId = "outlook_shared";
const defaultGoogleRedirectUri = "http://127.0.0.1:47841/oauth/google/callback";

const defaultSlackSettings = (): SlackSettings => ({
  operatorChannelId: null,
  proactiveMirroringEnabled: false,
});

export const getCalendarAutoSyncSettings = () => {
  const row = getPraxisDatabase()
    .prepare("SELECT value_json FROM settings WHERE key = ?")
    .get(calendarAutoSyncSettingsKey) as { value_json: string } | undefined;
  if (!row) {
    return DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS;
  }

  try {
    return normalizeCalendarAutoSyncSettings(JSON.parse(row.value_json) as Record<string, unknown>);
  } catch {
    return DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS;
  }
};

const defaultGoogleOAuthSettings = (): GoogleOAuthSettings => ({
  clientId: null,
  clientSecretConfigured: false,
  redirectUri: null,
  effectiveRedirectUri: defaultGoogleRedirectUri,
});

const defaultOutlookOAuthSettings = (): OutlookOAuthSettings => ({
  clientId: null,
  clientSecretConfigured: false,
});

const normalizeOptional = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const defaultCalendarAuthStatus = (
  provider: CalendarConnectionRecord["provider"]
): CalendarAuthStatus => (provider === "other" ? "not_configured" : "needs_credentials");

const defaultCalendarSyncStatus = (
  provider: CalendarConnectionRecord["provider"]
): CalendarSyncStatus => (provider === "other" ? "manual_import_only" : "blocked");

const toCalendarConnection = (row: DbCalendarConnection): CalendarConnectionRecord => ({
  id: row.id,
  provider: row.provider,
  label: row.label,
  accountRef: row.account_ref,
  enabled: row.enabled === 1,
  authStatus: row.auth_status ?? defaultCalendarAuthStatus(row.provider),
  syncStatus: row.sync_status ?? defaultCalendarSyncStatus(row.provider),
  lastSyncedAt: row.last_synced_at,
  lastSyncError: row.last_sync_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const defaultEmailAuthStatus = (
  provider: EmailConnectionRecord["provider"]
): EmailAuthStatus => (provider === "manual" ? "not_configured" : "needs_credentials");

const defaultEmailSyncStatus = (
  provider: EmailConnectionRecord["provider"]
): EmailSyncStatus => (provider === "manual" ? "manual_import_only" : "blocked");

const toEmailConnection = (row: DbEmailConnection): EmailConnectionRecord => ({
  id: row.id,
  provider: row.provider,
  label: row.label,
  accountRef: row.account_ref,
  enabled: row.enabled === 1,
  authStatus: row.auth_status ?? defaultEmailAuthStatus(row.provider),
  syncStatus: row.sync_status ?? defaultEmailSyncStatus(row.provider),
  lastSyncedAt: row.last_synced_at,
  lastSyncError: row.last_sync_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const getSlackSettings = (): SlackSettings => {
  const row = getPraxisDatabase()
    .prepare("SELECT value_json FROM settings WHERE key = ?")
    .get(slackSettingsKey) as { value_json: string } | undefined;
  if (!row) {
    return defaultSlackSettings();
  }

  try {
    return {
      ...defaultSlackSettings(),
      ...(JSON.parse(row.value_json) as Partial<SlackSettings>),
    };
  } catch {
    return defaultSlackSettings();
  }
};

export const getGoogleOAuthSettings = (): GoogleOAuthSettings => {
  const row = getPraxisDatabase()
    .prepare("SELECT value_json FROM settings WHERE key = ?")
    .get(googleOAuthSettingsKey) as { value_json: string } | undefined;
  const storedSettings = (() => {
    if (!row) {
      return defaultGoogleOAuthSettings();
    }

    try {
      return {
        ...defaultGoogleOAuthSettings(),
        ...(JSON.parse(row.value_json) as Partial<GoogleOAuthSettings>),
      };
    } catch {
      return defaultGoogleOAuthSettings();
    }
  })();
  const redirectUri = storedSettings.redirectUri ?? null;

  return {
    clientId: storedSettings.clientId ?? null,
    clientSecretConfigured: hasSecret(
      "integration_config",
      googleOAuthIntegrationOwnerId,
      "oauth_client_secret"
    ),
    redirectUri,
    effectiveRedirectUri: redirectUri ?? defaultGoogleRedirectUri,
  };
};

export const getSettingsSnapshot = (): SettingsSnapshot => ({
  calendarConnections: (
    getPraxisDatabase()
      .prepare("SELECT * FROM calendar_connections ORDER BY created_at DESC")
      .all() as DbCalendarConnection[]
  ).map(toCalendarConnection),
  emailConnections: (
    getPraxisDatabase()
      .prepare("SELECT * FROM email_connections ORDER BY created_at DESC")
      .all() as DbEmailConnection[]
  ).map(toEmailConnection),
  calendarAutoSync: getCalendarAutoSyncSettings(),
  secretStorage: getSecretStorageStatus(),
  googleOAuth: getGoogleOAuthSettings(),
  outlookOAuth: getOutlookOAuthSettings(),
  slack: getSlackSettings(),
});

export const getOutlookOAuthSettings = (): OutlookOAuthSettings => {
  const row = getPraxisDatabase()
    .prepare("SELECT value_json FROM settings WHERE key = ?")
    .get(outlookOAuthSettingsKey) as { value_json: string } | undefined;
  const storedSettings = (() => {
    if (!row) {
      return defaultOutlookOAuthSettings();
    }

    try {
      return {
        ...defaultOutlookOAuthSettings(),
        ...(JSON.parse(row.value_json) as Partial<OutlookOAuthSettings>),
      };
    } catch {
      return defaultOutlookOAuthSettings();
    }
  })();

  return {
    clientId: storedSettings.clientId ?? null,
    clientSecretConfigured: hasSecret(
      "integration_config",
      outlookOAuthIntegrationOwnerId,
      "oauth_client_secret"
    ),
  };
};

export const createCalendarConnection = (input: CreateCalendarConnectionInput) => {
  const timestamp = nowIso();
  const record: CalendarConnectionRecord = {
    id: `calendar_${crypto.randomUUID()}`,
    provider: input.provider,
    label: input.label.trim(),
    accountRef: normalizeOptional(input.accountRef),
    enabled: input.enabled ?? true,
    authStatus: input.authStatus ?? defaultCalendarAuthStatus(input.provider),
    syncStatus: input.syncStatus ?? defaultCalendarSyncStatus(input.provider),
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  getPraxisDatabase()
    .prepare(
      `INSERT INTO calendar_connections (
        id,
        provider,
        label,
        account_ref,
        enabled,
        auth_status,
        sync_status,
        last_synced_at,
        last_sync_error,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.provider,
      record.label,
      record.accountRef,
      record.enabled ? 1 : 0,
      record.authStatus,
      record.syncStatus,
      record.lastSyncedAt,
      record.lastSyncError,
      record.createdAt,
      record.updatedAt
    );

  return record;
};

export const deleteCalendarConnection = (input: DeleteCalendarConnectionInput) => {
  deleteSecretsForOwner("calendar_connection", input.id);
  getPraxisDatabase().prepare("DELETE FROM calendar_connections WHERE id = ?").run(input.id);
  return getSettingsSnapshot();
};

export const updateCalendarConnection = (input: UpdateCalendarConnectionInput) => {
  const current = getPraxisDatabase()
    .prepare("SELECT * FROM calendar_connections WHERE id = ?")
    .get(input.id) as DbCalendarConnection | undefined;
  if (!current) {
    return getSettingsSnapshot();
  }

  getPraxisDatabase()
    .prepare(
      `UPDATE calendar_connections
       SET label = ?,
           account_ref = ?,
           enabled = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.label === undefined ? current.label : input.label.trim(),
      input.accountRef === undefined ? current.account_ref : normalizeOptional(input.accountRef),
      input.enabled === undefined ? current.enabled : input.enabled ? 1 : 0,
      nowIso(),
      input.id
    );

  return getSettingsSnapshot();
};

export const createEmailConnection = (input: CreateEmailConnectionInput) => {
  const timestamp = nowIso();
  const record: EmailConnectionRecord = {
    id: `email_${crypto.randomUUID()}`,
    provider: input.provider,
    label: input.label.trim(),
    accountRef: normalizeOptional(input.accountRef),
    enabled: input.enabled ?? true,
    authStatus: input.authStatus ?? defaultEmailAuthStatus(input.provider),
    syncStatus: input.syncStatus ?? defaultEmailSyncStatus(input.provider),
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  getPraxisDatabase()
    .prepare(
      `INSERT INTO email_connections (
        id,
        provider,
        label,
        account_ref,
        enabled,
        auth_status,
        sync_status,
        last_synced_at,
        last_sync_error,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.provider,
      record.label,
      record.accountRef,
      record.enabled ? 1 : 0,
      record.authStatus,
      record.syncStatus,
      record.lastSyncedAt,
      record.lastSyncError,
      record.createdAt,
      record.updatedAt
    );

  return record;
};

export const deleteEmailConnection = (input: DeleteEmailConnectionInput) => {
  deleteSecretsForOwner("email_connection", input.id);
  getPraxisDatabase().prepare("DELETE FROM email_connections WHERE id = ?").run(input.id);
  return getSettingsSnapshot();
};

export const updateEmailConnection = (input: UpdateEmailConnectionInput) => {
  const current = getPraxisDatabase()
    .prepare("SELECT * FROM email_connections WHERE id = ?")
    .get(input.id) as DbEmailConnection | undefined;
  if (!current) {
    return getSettingsSnapshot();
  }

  getPraxisDatabase()
    .prepare(
      `UPDATE email_connections
       SET label = ?,
           account_ref = ?,
           enabled = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.label === undefined ? current.label : input.label.trim(),
      input.accountRef === undefined ? current.account_ref : normalizeOptional(input.accountRef),
      input.enabled === undefined ? current.enabled : input.enabled ? 1 : 0,
      nowIso(),
      input.id
    );

  return getSettingsSnapshot();
};

export const updateSlackSettings = (input: UpdateSlackSettingsInput) => {
  const current = getSlackSettings();
  const next: SlackSettings = {
    operatorChannelId:
      input.operatorChannelId === undefined
        ? current.operatorChannelId
        : normalizeOptional(input.operatorChannelId),
    proactiveMirroringEnabled:
      input.proactiveMirroringEnabled ?? current.proactiveMirroringEnabled,
  };
  const timestamp = nowIso();

  getPraxisDatabase()
    .prepare(
      `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    )
    .run(slackSettingsKey, JSON.stringify(next), timestamp);

  return getSettingsSnapshot();
};

export const updateCalendarAutoSyncSettings = (input: UpdateCalendarAutoSyncSettingsInput) => {
  const next = normalizeCalendarAutoSyncSettings(input, getCalendarAutoSyncSettings());
  const timestamp = nowIso();

  getPraxisDatabase()
    .prepare(
      `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    )
    .run(calendarAutoSyncSettingsKey, JSON.stringify(next), timestamp);

  return getSettingsSnapshot();
};

export const updateGoogleOAuthSettings = (input: UpdateGoogleOAuthSettingsInput) => {
  const current = getGoogleOAuthSettings();
  const next: GoogleOAuthSettings = {
    ...current,
    clientId:
      input.clientId === undefined ? current.clientId : normalizeOptional(input.clientId),
    redirectUri:
      input.redirectUri === undefined ? current.redirectUri : normalizeOptional(input.redirectUri),
    clientSecretConfigured: current.clientSecretConfigured,
    effectiveRedirectUri: current.effectiveRedirectUri,
  };
  next.effectiveRedirectUri = next.redirectUri ?? defaultGoogleRedirectUri;
  const timestamp = nowIso();

  getPraxisDatabase()
    .prepare(
      `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    )
    .run(
      googleOAuthSettingsKey,
      JSON.stringify({
        clientId: next.clientId,
        redirectUri: next.redirectUri,
      }),
      timestamp
    );

  const normalizedSecret = input.clientSecret?.trim();
  if (normalizedSecret) {
    storeSecret({
      ownerKind: "integration_config",
      ownerId: googleOAuthIntegrationOwnerId,
      secretKind: "oauth_client_secret",
      value: normalizedSecret,
    });
  } else if (input.clearClientSecret) {
    deleteSecret("integration_config", googleOAuthIntegrationOwnerId, "oauth_client_secret");
  }

  return getSettingsSnapshot();
};

export const updateOutlookOAuthSettings = (input: UpdateOutlookOAuthSettingsInput) => {
  const current = getOutlookOAuthSettings();
  const next: OutlookOAuthSettings = {
    ...current,
    clientId:
      input.clientId === undefined ? current.clientId : normalizeOptional(input.clientId),
    clientSecretConfigured: current.clientSecretConfigured,
  };
  const timestamp = nowIso();

  getPraxisDatabase()
    .prepare(
      `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
    )
    .run(
      outlookOAuthSettingsKey,
      JSON.stringify({
        clientId: next.clientId,
      }),
      timestamp
    );

  const normalizedSecret = input.clientSecret?.trim();
  if (normalizedSecret) {
    storeSecret({
      ownerKind: "integration_config",
      ownerId: outlookOAuthIntegrationOwnerId,
      secretKind: "oauth_client_secret",
      value: normalizedSecret,
    });
  } else if (input.clearClientSecret) {
    deleteSecret("integration_config", outlookOAuthIntegrationOwnerId, "oauth_client_secret");
  }

  return getSettingsSnapshot();
};

export const getGoogleOAuthClientConfig = () => {
  const settings = getGoogleOAuthSettings();
  return {
    clientId: settings.clientId ?? process.env["PRAXIS_GOOGLE_CLIENT_ID"]?.trim() ?? "",
    clientSecret:
      process.env["PRAXIS_GOOGLE_CLIENT_SECRET"]?.trim() ??
      readSecret("integration_config", googleOAuthIntegrationOwnerId, "oauth_client_secret") ??
      "",
    redirectUri:
      settings.redirectUri ??
      process.env["PRAXIS_GOOGLE_REDIRECT_URI"]?.trim() ??
      defaultGoogleRedirectUri,
  };
};

export const getOutlookOAuthClientConfig = () => {
  const settings = getOutlookOAuthSettings();
  return {
    clientId: settings.clientId ?? process.env["PRAXIS_OUTLOOK_CLIENT_ID"]?.trim() ?? "",
    clientSecret:
      process.env["PRAXIS_OUTLOOK_CLIENT_SECRET"]?.trim() ??
      readSecret("integration_config", outlookOAuthIntegrationOwnerId, "oauth_client_secret") ??
      "",
  };
};
