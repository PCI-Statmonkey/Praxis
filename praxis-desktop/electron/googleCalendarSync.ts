import type { NormalizedCalendarEvent } from "../shared/calendarImport";
import type {
  SyncGoogleCalendarInput,
  SyncGoogleCalendarResult,
} from "../shared/googleCalendarSync";
import {
  normalizeGoogleCalendarEvent,
  type GoogleCalendarSourceEvent,
} from "../shared/calendarProviderNormalization";
import { importCalendarEvents } from "./calendarImport";
import { getPraxisDatabase } from "./praxisDb";
import { isSecretReadError, readSecret, storeSecret } from "./secretRepository";
import { getGoogleOAuthClientConfig } from "./settingsRepository";
import { fetchJsonWithRetry, recoverableSyncMessage } from "./syncRecovery";
import { GOOGLE_CALENDAR_SCOPES } from "./googleCalendarOAuth";
import type { ProviderEventDraft } from "../shared/calendarWriteback";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_EVENTS_BASE_URL = "https://www.googleapis.com/calendar/v3/calendars";
const GOOGLE_CALENDAR_EVENTS_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const SYNC_WINDOW_PAST_DAYS = 1;
const SYNC_WINDOW_FUTURE_DAYS = 90;

type GoogleTokenSecret = {
  provider: "google";
  receivedAt: string;
  token: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
};

type GoogleEventsResponse = {
  items?: GoogleCalendarSourceEvent[];
  nextPageToken?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

type GoogleCreateEventResponse = {
  id?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string; message?: string }>;
  };
};

class GoogleCalendarSyncError extends Error {
  constructor(
    message: string,
    readonly authStatus: "needs_credentials" | "ready" | "error",
    readonly syncStatus: "blocked" | "ready_to_sync" | "error"
  ) {
    super(message);
  }
}

const configuredClientId = () => getGoogleOAuthClientConfig().clientId;
const configuredClientSecret = () => getGoogleOAuthClientConfig().clientSecret;

const updateConnectionStatus = (
  connectionId: string,
  authStatus: "needs_credentials" | "ready" | "error",
  syncStatus: "blocked" | "ready_to_sync" | "syncing" | "error",
  error: string | null,
  lastSyncedAt: string | null = null
) => {
  getPraxisDatabase()
    .prepare(
      `UPDATE calendar_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           last_synced_at = COALESCE(?, last_synced_at),
           updated_at = ?
       WHERE id = ?`
    )
    .run(authStatus, syncStatus, error, lastSyncedAt, new Date().toISOString(), connectionId);
};

const getGoogleConnection = (connectionId: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?")
    .get(connectionId) as { provider: string; account_ref: string | null } | undefined;
  return row?.provider === "google" ? row : null;
};

const parseTokenSecret = (connectionId: string): GoogleTokenSecret | null => {
  let raw: string | null;
  try {
    raw = readSecret("calendar_connection", connectionId, "oauth_token");
  } catch (error) {
    if (isSecretReadError(error)) {
      throw new GoogleCalendarSyncError(
        "Saved Google Calendar sign-in could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this calendar.",
        "error",
        "error"
      );
    }
    throw error;
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GoogleTokenSecret;
    return parsed.provider === "google" ? parsed : null;
  } catch {
    throw new GoogleCalendarSyncError(
      "Stored Google token data could not be read. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }
};

const tokenExpiresSoon = (secret: GoogleTokenSecret) => {
  if (!secret.token.expires_in) {
    return true;
  }
  const receivedAt = new Date(secret.receivedAt).getTime();
  if (Number.isNaN(receivedAt)) {
    return true;
  }

  return Date.now() > receivedAt + secret.token.expires_in * 1000 - 60_000;
};

const saveTokenSecret = (connectionId: string, token: GoogleTokenSecret["token"]) => {
  storeSecret({
    ownerKind: "calendar_connection",
    ownerId: connectionId,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "google",
      receivedAt: new Date().toISOString(),
      token,
    }),
  });
};

const refreshAccessToken = async (
  connectionId: string,
  secret: GoogleTokenSecret
): Promise<GoogleTokenSecret> => {
  if (!secret.token.refresh_token) {
    throw new GoogleCalendarSyncError(
      "Google OAuth token is missing a refresh token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }

  const body = new URLSearchParams({
    client_id: configuredClientId(),
    grant_type: "refresh_token",
    refresh_token: secret.token.refresh_token,
  });
  const clientSecret = configuredClientSecret();
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const { response, payload } = await fetchJsonWithRetry<
    GoogleTokenSecret["token"] & {
      error?: string;
      error_description?: string;
    }
  >(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }, "Google Calendar token refresh");
  if (!response.ok) {
    const reason = payload.error_description ?? payload.error ?? "Google token refresh failed.";
    const needsReconnect = payload.error === "invalid_grant";
    throw new GoogleCalendarSyncError(
      needsReconnect
        ? "Google authorization was revoked or expired. Reconnect this calendar."
        : `Google token refresh failed: ${reason}`,
      needsReconnect ? "needs_credentials" : "error",
      needsReconnect ? "blocked" : "error"
    );
  }

  const mergedToken = {
    ...secret.token,
    ...payload,
    refresh_token: payload.refresh_token ?? secret.token.refresh_token,
  };
  saveTokenSecret(connectionId, mergedToken);

  return {
    provider: "google",
    receivedAt: new Date().toISOString(),
    token: mergedToken,
  };
};

const ensureAccessToken = async (connectionId: string): Promise<string> => {
  const secret = parseTokenSecret(connectionId);
  if (!secret) {
    throw new GoogleCalendarSyncError(
      "No encrypted Google OAuth token is stored for this calendar. Connect Google first.",
      "needs_credentials",
      "blocked"
    );
  }

  const usableSecret = !secret.token.access_token || tokenExpiresSoon(secret)
    ? await refreshAccessToken(connectionId, secret)
    : secret;

  if (!usableSecret.token.access_token) {
    throw new GoogleCalendarSyncError(
      "Google OAuth token does not include an access token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }

  return usableSecret.token.access_token;
};

const tokenScopes = (secret: GoogleTokenSecret | null) =>
  new Set((secret?.token.scope ?? "").split(/\s+/).filter(Boolean));

export const googleCalendarHasWriteScope = (connectionId: string) => {
  try {
    const scopes = tokenScopes(parseTokenSecret(connectionId));
    return scopes.has(GOOGLE_CALENDAR_EVENTS_SCOPE) || scopes.has("https://www.googleapis.com/auth/calendar");
  } catch {
    return false;
  }
};

const ensureWriteScope = (connectionId: string) => {
  if (!googleCalendarHasWriteScope(connectionId)) {
    throw new GoogleCalendarSyncError(
      "Google Calendar write access is missing. Refresh sign-in for this calendar before publishing local blocks.",
      "needs_credentials",
      "blocked"
    );
  }
};

const fetchGoogleEvents = async (accessToken: string, calendarId: string) => {
  const timeMin = new Date(Date.now() - SYNC_WINDOW_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + SYNC_WINDOW_FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const events: GoogleCalendarSourceEvent[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GOOGLE_EVENTS_BASE_URL}/${encodeURIComponent(calendarId)}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("maxResults", "250");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const { response, payload } = await fetchJsonWithRetry<GoogleEventsResponse>(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }, "Google Calendar events fetch");
    if (!response.ok) {
      const reason =
        payload.error?.errors?.[0]?.reason ?? payload.error?.status ?? String(response.status);
      const message = payload.error?.message ?? "Google Calendar events fetch failed.";
      if (response.status === 401) {
        throw new GoogleCalendarSyncError(
          "Google authorization is no longer valid. Reconnect this calendar.",
          "needs_credentials",
          "blocked"
        );
      }
      if (response.status === 403) {
        throw new GoogleCalendarSyncError(
          `Google Calendar permission denied: ${message}`,
          "error",
          "error"
        );
      }
      throw new GoogleCalendarSyncError(
        `Google Calendar events fetch failed (${reason}): ${message}`,
        "error",
        "error"
      );
    }

    events.push(...(payload.items ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken);

  return events;
};

export const syncGoogleCalendar = async (
  input: SyncGoogleCalendarInput
): Promise<SyncGoogleCalendarResult> => {
  const connection = getGoogleConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Google calendar connection before syncing.",
      fetched: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
    };
  }

  updateConnectionStatus(input.connectionId, "ready", "syncing", null);

  try {
    const accessToken = await ensureAccessToken(input.connectionId);
    const calendarId = connection.account_ref?.trim() || "primary";
    const googleEvents = await fetchGoogleEvents(accessToken, calendarId);
    const normalizedEvents = googleEvents
      .map((event) => normalizeGoogleCalendarEvent(event, calendarId))
      .filter((event): event is NormalizedCalendarEvent => Boolean(event));
    const importResult = importCalendarEvents({
      sourceSystem: "google",
      events: normalizedEvents,
    });
    updateConnectionStatus(input.connectionId, "ready", "ready_to_sync", null, new Date().toISOString());
    const emptyMessage =
      googleEvents.length === 0
        ? `Google Calendar sync finished: no events found in the next ${SYNC_WINDOW_FUTURE_DAYS} days.`
        : `Google Calendar sync finished: ${googleEvents.length} fetched, ${importResult.imported} imported, ${importResult.updated} updated, ${importResult.skipped} skipped.`;

    return {
      ok: true,
      message: emptyMessage,
      fetched: googleEvents.length,
      imported: importResult.imported,
      updated: importResult.updated,
      skipped: importResult.skipped,
      importResult,
    };
  } catch (error) {
    const recoverableMessage = recoverableSyncMessage("Google Calendar", error);
    const message = recoverableMessage ?? (error instanceof Error ? error.message : "Google Calendar sync failed.");
    const authStatus =
      recoverableMessage
        ? "ready"
        : error instanceof GoogleCalendarSyncError
          ? error.authStatus
          : "error";
    const syncStatus =
      recoverableMessage
        ? "error"
        : error instanceof GoogleCalendarSyncError
          ? error.syncStatus
          : "error";
    updateConnectionStatus(input.connectionId, authStatus, syncStatus, message);
    return {
      ok: false,
      message,
      fetched: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
    };
  }
};

export const createGoogleCalendarEvent = async ({
  connectionId,
  calendarId,
  event,
}: {
  connectionId: string;
  calendarId: string;
  event: ProviderEventDraft;
}): Promise<{ providerEventId: string }> => {
  const connection = getGoogleConnection(connectionId);
  if (!connection) {
    throw new GoogleCalendarSyncError(
      "Choose a saved Google calendar connection before publishing.",
      "needs_credentials",
      "blocked"
    );
  }

  ensureWriteScope(connectionId);
  const accessToken = await ensureAccessToken(connectionId);
  const targetCalendarId = calendarId.trim() || connection.account_ref?.trim() || "primary";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const url = new URL(`${GOOGLE_EVENTS_BASE_URL}/${encodeURIComponent(targetCalendarId)}/events`);
  const { response, payload } = await fetchJsonWithRetry<GoogleCreateEventResponse>(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.body,
      start: {
        dateTime: event.startsAt,
        timeZone,
      },
      end: {
        dateTime: event.endsAt,
        timeZone,
      },
      extendedProperties: {
        private: {
          praxisTimeBlockId: event.localTimeBlockId,
          praxisCreated: "true",
        },
      },
    }),
  }, "Google Calendar event create");

  if (!response.ok || !payload.id) {
    if (response.status === 401) {
      throw new GoogleCalendarSyncError(
        "Google authorization is no longer valid. Reconnect this calendar.",
        "needs_credentials",
        "blocked"
      );
    }
    if (response.status === 403) {
      throw new GoogleCalendarSyncError(
        "Google Calendar write access was denied. Refresh sign-in for this calendar.",
        "error",
        "error"
      );
    }
    throw new GoogleCalendarSyncError(
      payload.error?.message ?? "Google Calendar could not create the event.",
      "error",
      "error"
    );
  }

  return { providerEventId: payload.id };
};

export const googleCalendarWriteScopes = GOOGLE_CALENDAR_SCOPES;
