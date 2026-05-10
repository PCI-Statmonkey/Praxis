import type { NormalizedCalendarEvent } from "../shared/calendarImport";
import type {
  SyncOutlookCalendarInput,
  SyncOutlookCalendarResult,
} from "../shared/outlookCalendarSync";
import {
  normalizeOutlookCalendarEvent,
  type OutlookCalendarSourceEvent,
} from "../shared/calendarProviderNormalization";
import { importCalendarEvents } from "./calendarImport";
import { getPraxisDatabase } from "./praxisDb";
import { isSecretReadError, readSecret, storeSecret } from "./secretRepository";
import { getOutlookOAuthClientConfig } from "./settingsRepository";
import { normalizeOutlookSyncError } from "./outlookErrorHelpers";
import { fetchJsonWithRetry, recoverableSyncMessage } from "./syncRecovery";
import { OUTLOOK_CALENDAR_SCOPES } from "./outlookCalendarOAuth";
import type { ProviderEventDraft } from "../shared/calendarWriteback";

const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const OUTLOOK_SCOPES = OUTLOOK_CALENDAR_SCOPES;
const OUTLOOK_CALENDAR_WRITE_SCOPE = "Calendars.ReadWrite";
const SYNC_WINDOW_PAST_DAYS = 1;
const SYNC_WINDOW_FUTURE_DAYS = 90;

type OutlookTokenSecret = {
  provider: "outlook";
  receivedAt: string;
  token: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
};

type OutlookCalendarViewResponse = {
  value?: OutlookCalendarSourceEvent[];
  "@odata.nextLink"?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

type OutlookCreateEventResponse = {
  id?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

class OutlookCalendarSyncError extends Error {
  constructor(
    message: string,
    readonly authStatus: "needs_credentials" | "ready" | "error",
    readonly syncStatus: "blocked" | "ready_to_sync" | "error"
  ) {
    super(message);
  }
}

const configuredClientId = () => getOutlookOAuthClientConfig().clientId;
const configuredClientSecret = () => getOutlookOAuthClientConfig().clientSecret;

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

const getOutlookConnection = (connectionId: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?")
    .get(connectionId) as { provider: string; account_ref: string | null } | undefined;
  return row?.provider === "outlook" ? row : null;
};

const parseTokenSecret = (connectionId: string): OutlookTokenSecret | null => {
  let raw: string | null;
  try {
    raw = readSecret("calendar_connection", connectionId, "oauth_token");
  } catch (error) {
    if (isSecretReadError(error)) {
      throw new OutlookCalendarSyncError(
        "Saved Outlook sign-in could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this calendar.",
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
    const parsed = JSON.parse(raw) as OutlookTokenSecret;
    return parsed.provider === "outlook" ? parsed : null;
  } catch {
    throw new OutlookCalendarSyncError(
      "Stored Outlook token data could not be read. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }
};

const tokenExpiresSoon = (secret: OutlookTokenSecret) => {
  if (!secret.token.expires_in) {
    return true;
  }
  const receivedAt = new Date(secret.receivedAt).getTime();
  if (Number.isNaN(receivedAt)) {
    return true;
  }

  return Date.now() > receivedAt + secret.token.expires_in * 1000 - 60_000;
};

const saveTokenSecret = (connectionId: string, token: OutlookTokenSecret["token"]) => {
  storeSecret({
    ownerKind: "calendar_connection",
    ownerId: connectionId,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "outlook",
      receivedAt: new Date().toISOString(),
      token,
    }),
  });
};

const refreshAccessToken = async (
  connectionId: string,
  secret: OutlookTokenSecret
): Promise<OutlookTokenSecret> => {
  if (!secret.token.refresh_token) {
    throw new OutlookCalendarSyncError(
      "Outlook OAuth token is missing a refresh token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }

  if (!configuredClientId()) {
    throw new OutlookCalendarSyncError(
      "Outlook client ID is not configured. Save the Microsoft app setup in Settings first.",
      "needs_credentials",
      "blocked"
    );
  }

  const body = new URLSearchParams({
    client_id: configuredClientId(),
    grant_type: "refresh_token",
    refresh_token: secret.token.refresh_token,
    scope: OUTLOOK_SCOPES.join(" "),
  });
  const clientSecret = configuredClientSecret();
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const { response, payload } = await fetchJsonWithRetry<
    OutlookTokenSecret["token"] & {
      error?: string;
      error_description?: string;
    }
  >(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }, "Outlook Calendar token refresh");

  if (!response.ok) {
    const reason = payload.error_description ?? payload.error ?? "Outlook token refresh failed.";
    const needsReconnect = payload.error === "invalid_grant";
    throw new OutlookCalendarSyncError(
      needsReconnect
        ? "Outlook authorization was revoked or expired. Reconnect this calendar."
        : normalizeOutlookSyncError(
            `Outlook token refresh failed: ${reason}`,
            "Calendars.Read",
            "calendar"
          ),
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
    provider: "outlook",
    receivedAt: new Date().toISOString(),
    token: mergedToken,
  };
};

const ensureAccessToken = async (connectionId: string): Promise<string> => {
  const secret = parseTokenSecret(connectionId);
  if (!secret) {
    throw new OutlookCalendarSyncError(
      "No encrypted Outlook OAuth token is stored for this calendar. Connect Outlook first.",
      "needs_credentials",
      "blocked"
    );
  }

  const usableSecret = !secret.token.access_token || tokenExpiresSoon(secret)
    ? await refreshAccessToken(connectionId, secret)
    : secret;

  if (!usableSecret.token.access_token) {
    throw new OutlookCalendarSyncError(
      "Outlook OAuth token does not include an access token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }

  return usableSecret.token.access_token;
};

const tokenScopes = (secret: OutlookTokenSecret | null) =>
  new Set(
    (secret?.token.scope ?? "")
      .split(/\s+/)
      .map((scope) => scope.replace(/^https:\/\/graph\.microsoft\.com\//, ""))
      .filter(Boolean)
  );

export const outlookCalendarHasWriteScope = (connectionId: string) => {
  try {
    const scopes = tokenScopes(parseTokenSecret(connectionId));
    return scopes.has(OUTLOOK_CALENDAR_WRITE_SCOPE);
  } catch {
    return false;
  }
};

const ensureWriteScope = (connectionId: string) => {
  if (!outlookCalendarHasWriteScope(connectionId)) {
    throw new OutlookCalendarSyncError(
      "Outlook Calendar write access is missing. Refresh sign-in for this calendar before publishing local blocks.",
      "needs_credentials",
      "blocked"
    );
  }
};

const fetchOutlookEvents = async (accessToken: string, calendarId: string) => {
  const timeMin = new Date(Date.now() - SYNC_WINDOW_PAST_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const timeMax = new Date(Date.now() + SYNC_WINDOW_FUTURE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const events: OutlookCalendarSourceEvent[] = [];
  let nextUrl: string | undefined;

  do {
    const calendarPath =
      calendarId === "primary"
        ? "/me/calendarView"
        : `/me/calendars/${encodeURIComponent(calendarId)}/calendarView`;
    const url = nextUrl ? new URL(nextUrl) : new URL(`${MICROSOFT_GRAPH_BASE_URL}${calendarPath}`);
    if (!nextUrl) {
      url.searchParams.set("startDateTime", timeMin);
      url.searchParams.set("endDateTime", timeMax);
      url.searchParams.set("$top", "250");
      url.searchParams.set("$orderby", "start/dateTime");
    }

    const { response, payload } = await fetchJsonWithRetry<OutlookCalendarViewResponse>(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Prefer: 'outlook.timezone="UTC"',
      },
    }, "Outlook Calendar events fetch");
    if (!response.ok) {
      const message = payload.error?.message ?? "Outlook Calendar events fetch failed.";
      if (response.status === 401) {
        throw new OutlookCalendarSyncError(
          "Outlook authorization is no longer valid. Reconnect this calendar.",
          "needs_credentials",
          "blocked"
        );
      }
      if (response.status === 403) {
        throw new OutlookCalendarSyncError(
          normalizeOutlookSyncError(
            `Outlook Calendar permission denied: ${message}`,
            "Calendars.Read",
            "calendar"
          ),
          "error",
          "error"
        );
      }
      throw new OutlookCalendarSyncError(
        normalizeOutlookSyncError(
          `Outlook Calendar events fetch failed (${payload.error?.code ?? response.status}): ${message}`,
          "Calendars.Read",
          "calendar"
        ),
        "error",
        "error"
      );
    }

    events.push(...(payload.value ?? []));
    nextUrl = payload["@odata.nextLink"];
  } while (nextUrl);

  return events;
};

export const syncOutlookCalendar = async (
  input: SyncOutlookCalendarInput
): Promise<SyncOutlookCalendarResult> => {
  const connection = getOutlookConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Outlook calendar connection before syncing.",
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
    const outlookEvents = await fetchOutlookEvents(accessToken, calendarId);
    const normalizedEvents = outlookEvents
      .map((event) => normalizeOutlookCalendarEvent(event, calendarId))
      .filter((event): event is NormalizedCalendarEvent => Boolean(event));
    const importResult = importCalendarEvents({
      sourceSystem: "outlook",
      events: normalizedEvents,
    });
    updateConnectionStatus(input.connectionId, "ready", "ready_to_sync", null, new Date().toISOString());
    const message =
      outlookEvents.length === 0
        ? `Outlook Calendar sync finished: no events found in the next ${SYNC_WINDOW_FUTURE_DAYS} days.`
        : `Outlook Calendar sync finished: ${outlookEvents.length} fetched, ${importResult.imported} imported, ${importResult.updated} updated, ${importResult.skipped} skipped.`;

    return {
      ok: true,
      message,
      fetched: outlookEvents.length,
      imported: importResult.imported,
      updated: importResult.updated,
      skipped: importResult.skipped,
      importResult,
    };
  } catch (error) {
    const recoverableMessage = recoverableSyncMessage("Outlook Calendar", error);
    const message = recoverableMessage ?? (error instanceof Error ? error.message : "Outlook Calendar sync failed.");
    const authStatus =
      recoverableMessage
        ? "ready"
        : error instanceof OutlookCalendarSyncError
          ? error.authStatus
          : "error";
    const syncStatus =
      recoverableMessage
        ? "error"
        : error instanceof OutlookCalendarSyncError
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

export const createOutlookCalendarEvent = async ({
  connectionId,
  calendarId,
  event,
}: {
  connectionId: string;
  calendarId: string;
  event: ProviderEventDraft;
}): Promise<{ providerEventId: string }> => {
  const connection = getOutlookConnection(connectionId);
  if (!connection) {
    throw new OutlookCalendarSyncError(
      "Choose a saved Outlook calendar connection before publishing.",
      "needs_credentials",
      "blocked"
    );
  }

  ensureWriteScope(connectionId);
  const accessToken = await ensureAccessToken(connectionId);
  const targetCalendarId = calendarId.trim() || connection.account_ref?.trim() || "primary";
  const calendarPath =
    targetCalendarId === "primary"
      ? "/me/events"
      : `/me/calendars/${encodeURIComponent(targetCalendarId)}/events`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const { response, payload } = await fetchJsonWithRetry<OutlookCreateEventResponse>(
    new URL(`${MICROSOFT_GRAPH_BASE_URL}${calendarPath}`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: `outlook.timezone="${timeZone}"`,
      },
      body: JSON.stringify({
        subject: event.title,
        body: {
          contentType: "text",
          content: event.body,
        },
        start: {
          dateTime: event.startsAt,
          timeZone,
        },
        end: {
          dateTime: event.endsAt,
          timeZone,
        },
        singleValueExtendedProperties: [
          {
            id: "String {00020329-0000-0000-C000-000000000046} Name PRAXIS-TimeBlockId",
            value: event.localTimeBlockId,
          },
        ],
      }),
    },
    "Outlook Calendar event create"
  );

  if (!response.ok || !payload.id) {
    if (response.status === 401) {
      throw new OutlookCalendarSyncError(
        "Outlook authorization is no longer valid. Reconnect this calendar.",
        "needs_credentials",
        "blocked"
      );
    }
    if (response.status === 403) {
      throw new OutlookCalendarSyncError(
        normalizeOutlookSyncError(
          "Outlook Calendar write access was denied. Refresh sign-in for this calendar.",
          "Calendars.ReadWrite",
          "calendar"
        ),
        "error",
        "error"
      );
    }
    throw new OutlookCalendarSyncError(
      normalizeOutlookSyncError(
        payload.error?.message ?? "Outlook Calendar could not create the event.",
        "Calendars.ReadWrite",
        "calendar"
      ),
      "error",
      "error"
    );
  }

  return { providerEventId: payload.id };
};
