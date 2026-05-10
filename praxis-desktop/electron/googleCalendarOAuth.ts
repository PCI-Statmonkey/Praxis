import { EventEmitter } from "node:events";
import type {
  CalendarOAuthReadiness,
  GoogleOAuthUpdate,
  StartCalendarOAuthInput,
  StartCalendarOAuthResult,
} from "../shared/calendarOAuth";
import { getSecretStorageStatus, storeSecret } from "./secretRepository";
import { getPraxisDatabase } from "./praxisDb";
import {
  getConfiguredGoogleClientId,
  getConfiguredGoogleRedirectUri,
  startGoogleOAuthFlow,
} from "./googleOAuthShared";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const GOOGLE_CALLBACK_SUCCESS_HTML =
  "<h1>Praxis connected Google Calendar.</h1><p>You can close this browser tab.</p>";
const GOOGLE_CALLBACK_ERROR_HTML =
  "<h1>Praxis could not connect Google Calendar.</h1><p>Return to Praxis Desk for details.</p>";

const googleOAuthEvents = new EventEmitter();

const emitGoogleOAuthUpdate = (update: GoogleOAuthUpdate) => {
  googleOAuthEvents.emit("update", update);
};

export const onGoogleCalendarOAuthUpdate = (listener: (update: GoogleOAuthUpdate) => void) => {
  googleOAuthEvents.on("update", listener);
  return () => googleOAuthEvents.off("update", listener);
};

export const getGoogleCalendarOAuthReadiness = (): CalendarOAuthReadiness => {
  const missing: string[] = [];
  const secretStorage = getSecretStorageStatus();
  const clientId = getConfiguredGoogleClientId();

  if (!secretStorage.available) {
    missing.push("OS-backed secret storage");
  }
  if (!clientId) {
    missing.push("PRAXIS_GOOGLE_CLIENT_ID");
  }

  return {
    provider: "google",
    ready: missing.length === 0,
    missing,
    redirectUri: getConfiguredGoogleRedirectUri(),
    scopes: GOOGLE_CALENDAR_SCOPES,
    message:
      missing.length === 0
        ? "Google OAuth is configured enough to start the authorization-code flow."
        : `Google OAuth needs setup: ${missing.join(", ")}.`,
  };
};

const getGoogleConnection = (connectionId: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?")
    .get(connectionId) as { provider: string; account_ref: string | null } | undefined;
  return row?.provider === "google" ? row : null;
};

const updateConnectionStatus = (
  connectionId: string,
  authStatus: "needs_credentials" | "ready" | "error",
  syncStatus: "blocked" | "ready_to_sync" | "error",
  error: string | null
) => {
  getPraxisDatabase()
    .prepare(
      `UPDATE calendar_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(authStatus, syncStatus, error, new Date().toISOString(), connectionId);
};

export const prepareGoogleCalendarOAuth = async (
  input: StartCalendarOAuthInput
): Promise<StartCalendarOAuthResult> => {
  const readiness = getGoogleCalendarOAuthReadiness();
  const connection = getGoogleConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Google calendar connection before starting OAuth.",
      readiness,
    };
  }

  if (!readiness.ready) {
    return {
      ok: false,
      message: readiness.message,
      readiness,
    };
  }

  try {
    const authorizationUrl = await startGoogleOAuthFlow({
      connectionId: input.connectionId,
      accountRef: connection.account_ref,
      scopes: GOOGLE_CALENDAR_SCOPES,
      successHtml: GOOGLE_CALLBACK_SUCCESS_HTML,
      errorHtml: GOOGLE_CALLBACK_ERROR_HTML,
      onSuccess: async ({ connectionId, tokenPayload }) => {
        storeSecret({
          ownerKind: "calendar_connection",
          ownerId: connectionId,
          secretKind: "oauth_token",
          value: JSON.stringify({
            provider: "google",
            receivedAt: new Date().toISOString(),
            token: tokenPayload,
          }),
        });
        updateConnectionStatus(connectionId, "ready", "ready_to_sync", null);
        emitGoogleOAuthUpdate({
          connectionId,
          ok: true,
        message: "Google Calendar connected. Praxis can sync events and publish confirmed local blocks.",
        });
      },
      onError: ({ connectionId, message }) => {
        updateConnectionStatus(connectionId, "error", "error", message);
        emitGoogleOAuthUpdate({
          connectionId,
          ok: false,
          message,
        });
      },
    });

    return {
      ok: true,
      message: "Google OAuth opened in your browser. Complete the Google consent flow there.",
      authorizationUrl,
      readiness,
    };
  } catch (oauthStartError) {
    const message =
      oauthStartError instanceof Error ? oauthStartError.message : "Google OAuth could not start.";
    updateConnectionStatus(input.connectionId, "error", "error", message);
    return {
      ok: false,
      message,
      readiness,
    };
  }
};
