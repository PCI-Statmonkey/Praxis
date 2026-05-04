import type { NormalizedEmailMessage } from "../shared/emailModel";
import type { SyncOutlookEmailInput, SyncOutlookEmailResult } from "../shared/outlookEmailSync";
import { getPraxisDatabase } from "./praxisDb";
import { isSecretReadError, readSecret, storeSecret } from "./secretRepository";
import { importEmailMessages } from "./emailRepository";
import { getOutlookOAuthClientConfig } from "./settingsRepository";
import { normalizeOutlookSyncError } from "./outlookErrorHelpers";
import { fetchJsonWithRetry, recoverableSyncMessage } from "./syncRecovery";

const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";
const OUTLOOK_SCOPES = ["offline_access", "https://graph.microsoft.com/Mail.Read"];

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

type OutlookMessageSender = {
  emailAddress?: {
    name?: string;
    address?: string;
  };
};

type OutlookGraphMessage = {
  id?: string;
  conversationId?: string;
  subject?: string;
  bodyPreview?: string;
  receivedDateTime?: string;
  from?: OutlookMessageSender;
};

type OutlookMessagesResponse = {
  value?: OutlookGraphMessage[];
  "@odata.nextLink"?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

class OutlookEmailSyncError extends Error {
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
      `UPDATE email_connections
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
    .prepare("SELECT provider FROM email_connections WHERE id = ?")
    .get(connectionId) as { provider: string } | undefined;
  return row?.provider === "outlook" ? row : null;
};

const parseTokenSecret = (connectionId: string): OutlookTokenSecret | null => {
  let raw: string | null;
  try {
    raw = readSecret("email_connection", connectionId, "oauth_token");
  } catch (error) {
    if (isSecretReadError(error)) {
      throw new OutlookEmailSyncError(
        "Saved Outlook sign-in could not be decrypted by OS secure storage. Reconnect or refresh sign-in for this inbox.",
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
    throw new OutlookEmailSyncError(
      "Stored Outlook token data could not be read. Reconnect this inbox.",
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
    ownerKind: "email_connection",
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
    throw new OutlookEmailSyncError(
      "Outlook OAuth token is missing a refresh token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  }

  if (!configuredClientId()) {
    throw new OutlookEmailSyncError(
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
  }, "Outlook mail token refresh");

  if (!response.ok) {
    const reason = payload.error_description ?? payload.error ?? "Outlook token refresh failed.";
    const needsReconnect = payload.error === "invalid_grant";
    throw new OutlookEmailSyncError(
      needsReconnect
        ? "Outlook authorization was revoked or expired. Reconnect this inbox."
        : normalizeOutlookSyncError(`Outlook token refresh failed: ${reason}`, "Mail.Read", "mail"),
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
    throw new OutlookEmailSyncError(
      "No encrypted Outlook OAuth token is stored for this inbox. Connect Outlook first.",
      "needs_credentials",
      "blocked"
    );
  }

  const usableSecret =
    !secret.token.access_token || tokenExpiresSoon(secret)
      ? await refreshAccessToken(connectionId, secret)
      : secret;

  if (!usableSecret.token.access_token) {
    throw new OutlookEmailSyncError(
      "Outlook OAuth token does not include an access token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  }

  return usableSecret.token.access_token;
};

const normalizeMessage = (message: OutlookGraphMessage): NormalizedEmailMessage | null => {
  if (!message.subject || !message.receivedDateTime) {
    return null;
  }

  return {
    externalId: message.id,
    threadRef: message.conversationId,
    subject: message.subject,
    senderName: message.from?.emailAddress?.name,
    senderEmail: message.from?.emailAddress?.address,
    receivedAt: message.receivedDateTime,
    summary: message.bodyPreview?.trim(),
    snippet: message.bodyPreview?.trim(),
  };
};

const fetchOutlookMessages = async (accessToken: string) => {
  const url = new URL(`${MICROSOFT_GRAPH_BASE_URL}/me/mailFolders/inbox/messages`);
  url.searchParams.set(
    "$select",
    "id,conversationId,subject,bodyPreview,receivedDateTime,from"
  );
  url.searchParams.set("$top", "25");
  url.searchParams.set("$orderby", "receivedDateTime DESC");

  const { response, payload } = await fetchJsonWithRetry<OutlookMessagesResponse>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }, "Outlook inbox fetch");
  if (!response.ok) {
    const message = payload.error?.message ?? "Outlook inbox fetch failed.";
    if (response.status === 401) {
      throw new OutlookEmailSyncError(
        "Outlook authorization is no longer valid. Reconnect this inbox.",
        "needs_credentials",
        "blocked"
      );
    }
    if (response.status === 403) {
      throw new OutlookEmailSyncError(
        normalizeOutlookSyncError(`Outlook mail permission denied: ${message}`, "Mail.Read", "mail"),
        "error",
        "error"
      );
    }
    throw new OutlookEmailSyncError(
      normalizeOutlookSyncError(
        `Outlook inbox fetch failed (${payload.error?.code ?? response.status}): ${message}`,
        "Mail.Read",
        "mail"
      ),
      "error",
      "error"
    );
  }

  return (payload.value ?? [])
    .map(normalizeMessage)
    .filter((message): message is NormalizedEmailMessage => Boolean(message));
};

export const syncOutlookInbox = async (
  input: SyncOutlookEmailInput
): Promise<SyncOutlookEmailResult> => {
  const connection = getOutlookConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Outlook inbox row before syncing.",
      fetched: 0,
      imported: 0,
      updated: 0,
      suggestionsCreated: 0,
      skipped: 0,
    };
  }

  updateConnectionStatus(input.connectionId, "ready", "syncing", null);

  try {
    const accessToken = await ensureAccessToken(input.connectionId);
    const messages = await fetchOutlookMessages(accessToken);
    const importResult = importEmailMessages({
      sourceSystem: "outlook",
      connectionId: input.connectionId,
      messages,
    });
    updateConnectionStatus(input.connectionId, "ready", "ready_to_sync", null, new Date().toISOString());

    return {
      ok: true,
      message:
        messages.length === 0
          ? "Outlook inbox sync finished: no inbox summaries were found."
          : `Outlook inbox sync finished: ${messages.length} fetched, ${importResult.imported} imported, ${importResult.updated} updated, ${importResult.suggestionsCreated} follow-up candidates flagged, ${importResult.skipped} skipped.`,
      fetched: messages.length,
      imported: importResult.imported,
      updated: importResult.updated,
      suggestionsCreated: importResult.suggestionsCreated,
      skipped: importResult.skipped,
      importResult,
    };
  } catch (error) {
    const recoverableMessage = recoverableSyncMessage("Outlook inbox", error);
    const message = recoverableMessage ?? (error instanceof Error ? error.message : "Outlook inbox sync failed.");
    const authStatus = recoverableMessage
      ? "ready"
      : error instanceof OutlookEmailSyncError
        ? error.authStatus
        : "error";
    const syncStatus = recoverableMessage
      ? "error"
      : error instanceof OutlookEmailSyncError
        ? error.syncStatus
        : "error";
    updateConnectionStatus(input.connectionId, authStatus, syncStatus, message);
    return {
      ok: false,
      message,
      fetched: 0,
      imported: 0,
      updated: 0,
      suggestionsCreated: 0,
      skipped: 0,
    };
  }
};
