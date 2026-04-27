import type { NormalizedEmailMessage } from "../shared/emailModel";
import type { SyncGmailEmailInput, SyncGmailEmailResult } from "../shared/gmailEmailSync";
import { getPraxisDatabase } from "./praxisDb";
import { readSecret, storeSecret } from "./secretRepository";
import { getGoogleOAuthClientConfig } from "./settingsRepository";
import { importEmailMessages } from "./emailRepository";
import { fetchJsonWithRetry, recoverableSyncMessage } from "./syncRecovery";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_MESSAGES_LIST_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const GMAIL_MESSAGE_GET_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";
const GMAIL_MAX_RESULTS = 25;

type GmailTokenSecret = {
  provider: "gmail";
  receivedAt: string;
  token: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
};

type GmailListResponse = {
  messages?: Array<{ id?: string; threadId?: string }>;
  resultSizeEstimate?: number;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

type GmailMessageHeader = {
  name?: string;
  value?: string;
};

type GmailGetMessageResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  payload?: {
    headers?: GmailMessageHeader[];
  };
  internalDate?: string;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

class GmailSyncError extends Error {
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

const getGmailConnection = (connectionId: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT provider FROM email_connections WHERE id = ?")
    .get(connectionId) as { provider: string } | undefined;
  return row?.provider === "gmail" ? row : null;
};

const parseTokenSecret = (connectionId: string): GmailTokenSecret | null => {
  const raw = readSecret("email_connection", connectionId, "oauth_token");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GmailTokenSecret;
    return parsed.provider === "gmail" ? parsed : null;
  } catch {
    throw new GmailSyncError(
      "Stored Gmail token data could not be read. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  }
};

const tokenExpiresSoon = (secret: GmailTokenSecret) => {
  if (!secret.token.expires_in) {
    return true;
  }
  const receivedAt = new Date(secret.receivedAt).getTime();
  if (Number.isNaN(receivedAt)) {
    return true;
  }

  return Date.now() > receivedAt + secret.token.expires_in * 1000 - 60_000;
};

const saveTokenSecret = (connectionId: string, token: GmailTokenSecret["token"]) => {
  storeSecret({
    ownerKind: "email_connection",
    ownerId: connectionId,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "gmail",
      receivedAt: new Date().toISOString(),
      token,
    }),
  });
};

const refreshAccessToken = async (
  connectionId: string,
  secret: GmailTokenSecret
): Promise<GmailTokenSecret> => {
  if (!secret.token.refresh_token) {
    throw new GmailSyncError(
      "Gmail OAuth token is missing a refresh token. Reconnect this inbox.",
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
    GmailTokenSecret["token"] & {
      error?: string;
      error_description?: string;
    }
  >(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }, "Gmail token refresh");
  if (!response.ok) {
    const reason = payload.error_description ?? payload.error ?? "Gmail token refresh failed.";
    const needsReconnect = payload.error === "invalid_grant";
    throw new GmailSyncError(
      needsReconnect
        ? "Google authorization was revoked or expired. Reconnect this inbox."
        : `Gmail token refresh failed: ${reason}`,
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
    provider: "gmail",
    receivedAt: new Date().toISOString(),
    token: mergedToken,
  };
};

const ensureAccessToken = async (connectionId: string): Promise<string> => {
  const secret = parseTokenSecret(connectionId);
  if (!secret) {
    throw new GmailSyncError(
      "No encrypted Gmail OAuth token is stored for this inbox. Connect Gmail first.",
      "needs_credentials",
      "blocked"
    );
  }

  const usableSecret =
    !secret.token.access_token || tokenExpiresSoon(secret)
      ? await refreshAccessToken(connectionId, secret)
      : secret;

  if (!usableSecret.token.access_token) {
    throw new GmailSyncError(
      "Gmail OAuth token does not include an access token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  }

  return usableSecret.token.access_token;
};

const fetchGmailJson = async <T>(url: string, accessToken: string, description: string) =>
  fetchJsonWithRetry<T>(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }, description);

const parseFromHeader = (value: string | null | undefined) => {
  if (!value) {
    return { senderName: null, senderEmail: null };
  }

  const match = value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const senderName = match[1]?.trim() || null;
    const senderEmail = match[2]?.trim() || null;
    return { senderName, senderEmail };
  }

  const emailMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return {
    senderName: value.replace(emailMatch?.[0] ?? "", "").replace(/[<>"]/g, "").trim() || null,
    senderEmail: emailMatch?.[0] ?? null,
  };
};

const extractHeader = (headers: GmailMessageHeader[] | undefined, target: string) =>
  headers?.find((header) => header.name?.toLowerCase() === target.toLowerCase())?.value ?? null;

const normalizeGmailMessage = (payload: GmailGetMessageResponse): NormalizedEmailMessage | null => {
  const subject = extractHeader(payload.payload?.headers, "subject");
  if (!subject) {
    return null;
  }

  const fromHeader = extractHeader(payload.payload?.headers, "from");
  const { senderName, senderEmail } = parseFromHeader(fromHeader);
  const internalDate = payload.internalDate ? Number(payload.internalDate) : NaN;

  return {
    externalId: payload.id,
    threadRef: payload.threadId,
    subject,
    senderName: senderName ?? undefined,
    senderEmail: senderEmail ?? undefined,
    receivedAt: Number.isNaN(internalDate)
      ? new Date().toISOString()
      : new Date(internalDate).toISOString(),
    summary: payload.snippet?.trim(),
    snippet: payload.snippet?.trim(),
  };
};

const fetchGmailMessages = async (accessToken: string) => {
  const listUrl = new URL(GMAIL_MESSAGES_LIST_URL);
  listUrl.searchParams.set("labelIds", "INBOX");
  listUrl.searchParams.set("maxResults", String(GMAIL_MAX_RESULTS));

  const { response, payload } = await fetchGmailJson<GmailListResponse>(
    listUrl.toString(),
    accessToken,
    "Gmail message list fetch"
  );
  if (!response.ok) {
    const message = payload.error?.message ?? "Gmail message list fetch failed.";
    if (response.status === 401) {
      throw new GmailSyncError(
        "Google authorization is no longer valid. Reconnect this inbox.",
        "needs_credentials",
        "blocked"
      );
    }
    throw new GmailSyncError(`Gmail message list failed: ${message}`, "error", "error");
  }

  const messages = payload.messages ?? [];
  const normalized: NormalizedEmailMessage[] = [];

  for (const message of messages) {
    if (!message.id) {
      continue;
    }
    const detailsUrl = new URL(`${GMAIL_MESSAGE_GET_URL}/${message.id}`);
    detailsUrl.searchParams.set("format", "metadata");
    detailsUrl.searchParams.append("metadataHeaders", "Subject");
    detailsUrl.searchParams.append("metadataHeaders", "From");
    detailsUrl.searchParams.append("metadataHeaders", "Date");
    const detailResult = await fetchGmailJson<GmailGetMessageResponse>(
      detailsUrl.toString(),
      accessToken,
      "Gmail message detail fetch"
    );
    if (!detailResult.response.ok) {
      const detailMessage =
        detailResult.payload.error?.message ?? "Gmail message detail fetch failed.";
      if (detailResult.response.status === 401) {
        throw new GmailSyncError(
          "Google authorization is no longer valid. Reconnect this inbox.",
          "needs_credentials",
          "blocked"
        );
      }
      throw new GmailSyncError(`Gmail message detail failed: ${detailMessage}`, "error", "error");
    }

    const normalizedMessage = normalizeGmailMessage(detailResult.payload);
    if (normalizedMessage) {
      normalized.push(normalizedMessage);
    }
  }

  return normalized;
};

export const syncGmailInbox = async (
  input: SyncGmailEmailInput
): Promise<SyncGmailEmailResult> => {
  const connection = getGmailConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Gmail row before syncing.",
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
    const messages = await fetchGmailMessages(accessToken);
    const importResult = importEmailMessages({
      sourceSystem: "gmail",
      connectionId: input.connectionId,
      messages,
    });
    updateConnectionStatus(input.connectionId, "ready", "ready_to_sync", null, new Date().toISOString());

    return {
      ok: true,
      message:
        messages.length === 0
          ? "Gmail sync finished: no inbox summaries were found."
          : `Gmail sync finished: ${messages.length} fetched, ${importResult.imported} imported, ${importResult.updated} updated, ${importResult.suggestionsCreated} follow-up candidates flagged, ${importResult.skipped} skipped.`,
      fetched: messages.length,
      imported: importResult.imported,
      updated: importResult.updated,
      suggestionsCreated: importResult.suggestionsCreated,
      skipped: importResult.skipped,
      importResult,
    };
  } catch (error) {
    const recoverableMessage = recoverableSyncMessage("Gmail", error);
    const message = recoverableMessage ?? (error instanceof Error ? error.message : "Gmail sync failed.");
    const authStatus = recoverableMessage
      ? "ready"
      : error instanceof GmailSyncError
        ? error.authStatus
        : "error";
    const syncStatus = recoverableMessage
      ? "error"
      : error instanceof GmailSyncError
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
