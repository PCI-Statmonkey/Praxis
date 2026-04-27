import { EventEmitter } from "node:events";
import type {
  EmailOAuthReadiness,
  GmailOAuthUpdate,
  StartEmailOAuthInput,
  StartEmailOAuthResult,
} from "../shared/emailOAuth";
import { getSecretStorageStatus, storeSecret } from "./secretRepository";
import { getPraxisDatabase } from "./praxisDb";
import {
  getConfiguredGoogleClientId,
  getConfiguredGoogleRedirectUri,
  startGoogleOAuthFlow,
} from "./googleOAuthShared";

const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const GMAIL_CALLBACK_SUCCESS_HTML =
  "<h1>Praxis connected Gmail.</h1><p>You can close this browser tab.</p>";
const GMAIL_CALLBACK_ERROR_HTML =
  "<h1>Praxis could not connect Gmail.</h1><p>Return to Praxis Desk for details.</p>";

const gmailOAuthEvents = new EventEmitter();

const emitGmailOAuthUpdate = (update: GmailOAuthUpdate) => {
  gmailOAuthEvents.emit("update", update);
};

export const onGmailOAuthUpdate = (listener: (update: GmailOAuthUpdate) => void) => {
  gmailOAuthEvents.on("update", listener);
  return () => gmailOAuthEvents.off("update", listener);
};

export const getGmailOAuthReadiness = (): EmailOAuthReadiness => {
  const missing: string[] = [];
  const secretStorage = getSecretStorageStatus();
  const clientId = getConfiguredGoogleClientId();

  if (!secretStorage.available) {
    missing.push("OS-backed secret storage");
  }
  if (!clientId) {
    missing.push("Google OAuth client ID");
  }

  return {
    provider: "gmail",
    ready: missing.length === 0,
    missing,
    redirectUri: getConfiguredGoogleRedirectUri(),
    scopes: GMAIL_SCOPES,
    message:
      missing.length === 0
        ? "Google OAuth is configured enough to connect Gmail. Make sure the Gmail API is enabled in Google Cloud."
        : `Gmail OAuth needs setup: ${missing.join(", ")}.`,
  };
};

const getGmailConnection = (connectionId: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT provider, account_ref FROM email_connections WHERE id = ?")
    .get(connectionId) as { provider: string; account_ref: string | null } | undefined;
  return row?.provider === "gmail" ? row : null;
};

const updateConnectionStatus = (
  connectionId: string,
  authStatus: "needs_credentials" | "ready" | "error",
  syncStatus: "blocked" | "ready_to_sync" | "error",
  error: string | null
) => {
  getPraxisDatabase()
    .prepare(
      `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(authStatus, syncStatus, error, new Date().toISOString(), connectionId);
};

export const prepareGmailOAuth = async (
  input: StartEmailOAuthInput
): Promise<StartEmailOAuthResult> => {
  const readiness = getGmailOAuthReadiness();
  const connection = getGmailConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Gmail row before starting OAuth.",
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
      scopes: GMAIL_SCOPES,
      successHtml: GMAIL_CALLBACK_SUCCESS_HTML,
      errorHtml: GMAIL_CALLBACK_ERROR_HTML,
      onSuccess: async ({ connectionId, tokenPayload }) => {
        storeSecret({
          ownerKind: "email_connection",
          ownerId: connectionId,
          secretKind: "oauth_token",
          value: JSON.stringify({
            provider: "gmail",
            receivedAt: new Date().toISOString(),
            token: tokenPayload,
          }),
        });
        updateConnectionStatus(connectionId, "ready", "ready_to_sync", null);
        emitGmailOAuthUpdate({
          connectionId,
          ok: true,
          message: "Gmail connected. Praxis will auto-sync inbox summaries.",
        });
      },
      onError: ({ connectionId, message }) => {
        updateConnectionStatus(connectionId, "error", "error", message);
        emitGmailOAuthUpdate({
          connectionId,
          ok: false,
          message,
        });
      },
    });

    return {
      ok: true,
      message: "Google OAuth opened in your browser. Complete the Gmail consent flow there.",
      authorizationUrl,
      readiness,
    };
  } catch (oauthStartError) {
    const message =
      oauthStartError instanceof Error ? oauthStartError.message : "Gmail OAuth could not start.";
    updateConnectionStatus(input.connectionId, "error", "error", message);
    return {
      ok: false,
      message,
      readiness,
    };
  }
};
