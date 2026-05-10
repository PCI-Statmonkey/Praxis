import crypto from "node:crypto";
import { EventEmitter } from "node:events";
import http from "node:http";
import { shell } from "electron";
import type {
  CalendarOAuthReadiness,
  OutlookOAuthUpdate,
  StartCalendarOAuthInput,
  StartCalendarOAuthResult,
} from "../shared/calendarOAuth";
import { getPraxisDatabase } from "./praxisDb";
import { getSecretStorageStatus, storeSecret } from "./secretRepository";
import { getOutlookOAuthClientConfig } from "./settingsRepository";
import { normalizeOutlookOAuthError } from "./outlookErrorHelpers";

const MICROSOFT_AUTHORIZE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
export const OUTLOOK_CALENDAR_SCOPES = [
  "offline_access",
  "https://graph.microsoft.com/Calendars.ReadWrite",
];
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:47842/oauth/outlook/callback";
const OUTLOOK_CALLBACK_SUCCESS_HTML =
  "<h1>Praxis connected Outlook Calendar.</h1><p>You can close this browser tab.</p>";
const OUTLOOK_CALLBACK_ERROR_HTML =
  "<h1>Praxis could not connect Outlook Calendar.</h1><p>Return to Praxis Desk for details.</p>";

type PendingOutlookOAuthState = {
  state: string;
  codeVerifier: string;
  connectionId: string;
  createdAt: string;
};

let callbackServer: http.Server | null = null;
const pendingOutlookOAuthStates = new Map<string, PendingOutlookOAuthState>();
const outlookOAuthEvents = new EventEmitter();

const configuredClientId = () => getOutlookOAuthClientConfig().clientId;
const configuredClientSecret = () => getOutlookOAuthClientConfig().clientSecret;
const configuredRedirectUri = () =>
  process.env["PRAXIS_OUTLOOK_REDIRECT_URI"]?.trim() || DEFAULT_REDIRECT_URI;

const emitOutlookOAuthUpdate = (update: OutlookOAuthUpdate) => {
  outlookOAuthEvents.emit("update", update);
};

export const onOutlookCalendarOAuthUpdate = (listener: (update: OutlookOAuthUpdate) => void) => {
  outlookOAuthEvents.on("update", listener);
  return () => outlookOAuthEvents.off("update", listener);
};

export const getOutlookCalendarOAuthReadiness = (): CalendarOAuthReadiness => {
  const missing: string[] = [];
  const secretStorage = getSecretStorageStatus();
  const clientId = configuredClientId();

  if (!secretStorage.available) {
    missing.push("OS-backed secret storage");
  }
  if (!clientId) {
    missing.push("Outlook client ID");
  }

  return {
    provider: "outlook",
    ready: missing.length === 0,
    missing,
    redirectUri: configuredRedirectUri(),
    scopes: OUTLOOK_CALENDAR_SCOPES,
    message:
      missing.length === 0
        ? "Outlook OAuth is configured enough to start the authorization-code flow."
        : `Outlook OAuth needs setup: ${missing.join(", ")}.`,
  };
};

const getOutlookConnection = (connectionId: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?")
    .get(connectionId) as { provider: string; account_ref: string | null } | undefined;
  return row?.provider === "outlook" ? row : null;
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

const base64Url = (buffer: Buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const createCodeVerifier = () => base64Url(crypto.randomBytes(64));

const createCodeChallenge = (codeVerifier: string) =>
  base64Url(crypto.createHash("sha256").update(codeVerifier).digest());

const storePendingState = (pending: PendingOutlookOAuthState) => {
  pendingOutlookOAuthStates.set(pending.state, pending);
};

const buildAuthorizationUrl = (
  accountRef: string | null,
  state: string,
  codeChallenge: string
) => {
  const url = new URL(MICROSOFT_AUTHORIZE_URL);
  url.searchParams.set("client_id", configuredClientId());
  url.searchParams.set("redirect_uri", configuredRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", OUTLOOK_CALENDAR_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (accountRef) {
    url.searchParams.set("login_hint", accountRef);
  }
  return url.toString();
};

const exchangeCodeForTokens = async (
  connectionId: string,
  code: string,
  codeVerifier: string
) => {
  const body = new URLSearchParams({
    client_id: configuredClientId(),
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: configuredRedirectUri(),
    scope: OUTLOOK_CALENDAR_SCOPES.join(" "),
  });
  const clientSecret = configuredClientSecret();
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const tokenPayload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error =
      typeof tokenPayload.error_description === "string"
        ? tokenPayload.error_description
        : typeof tokenPayload.error === "string"
          ? tokenPayload.error
          : "outlook_token_exchange_failed";
    throw new Error(error);
  }

  storeSecret({
    ownerKind: "calendar_connection",
    ownerId: connectionId,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "outlook",
      receivedAt: new Date().toISOString(),
      token: tokenPayload,
    }),
  });
  updateConnectionStatus(connectionId, "ready", "ready_to_sync", null);
};

const respondHtml = (response: http.ServerResponse, statusCode: number, body: string) => {
  response.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
};

const handleCallback = async (request: http.IncomingMessage, response: http.ServerResponse) => {
  const redirectUri = new URL(configuredRedirectUri());
  const requestUrl = new URL(request.url ?? "/", redirectUri.origin);
  if (requestUrl.pathname !== redirectUri.pathname) {
    respondHtml(response, 404, OUTLOOK_CALLBACK_ERROR_HTML);
    return;
  }

  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const error =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error");

  if (error) {
    if (state) {
      const pending = pendingOutlookOAuthStates.get(state);
      if (pending) {
        pendingOutlookOAuthStates.delete(state);
        const message = normalizeOutlookOAuthError(
          `Outlook OAuth failed: ${error}.`,
          configuredRedirectUri(),
          "calendar"
        );
        updateConnectionStatus(pending.connectionId, "error", "error", message);
        emitOutlookOAuthUpdate({
          connectionId: pending.connectionId,
          ok: false,
          message,
        });
      }
    }
    respondHtml(response, 400, OUTLOOK_CALLBACK_ERROR_HTML);
    return;
  }
  if (!state || !code) {
    respondHtml(response, 400, OUTLOOK_CALLBACK_ERROR_HTML);
    return;
  }

  const pending = pendingOutlookOAuthStates.get(state);
  if (!pending) {
    respondHtml(response, 400, OUTLOOK_CALLBACK_ERROR_HTML);
    return;
  }

  try {
    await exchangeCodeForTokens(pending.connectionId, code, pending.codeVerifier);
    pendingOutlookOAuthStates.delete(state);
    emitOutlookOAuthUpdate({
      connectionId: pending.connectionId,
      ok: true,
    message: "Outlook Calendar connected. Praxis can sync events and publish confirmed local blocks.",
    });
    respondHtml(response, 200, OUTLOOK_CALLBACK_SUCCESS_HTML);
  } catch (exchangeError) {
    const message = normalizeOutlookOAuthError(
      exchangeError instanceof Error ? exchangeError.message : "Outlook OAuth token exchange failed.",
      configuredRedirectUri(),
      "calendar"
    );
    updateConnectionStatus(pending.connectionId, "error", "error", message);
    emitOutlookOAuthUpdate({
      connectionId: pending.connectionId,
      ok: false,
      message,
    });
    respondHtml(response, 500, OUTLOOK_CALLBACK_ERROR_HTML);
  }
};

const ensureCallbackServer = async () => {
  if (callbackServer?.listening) {
    return;
  }

  const redirectUri = new URL(configuredRedirectUri());
  const port = Number(redirectUri.port);
  if (!port || redirectUri.hostname !== "127.0.0.1") {
    throw new Error("Outlook OAuth redirect URI must use http://127.0.0.1:<port>/...");
  }

  callbackServer = http.createServer((request, response) => {
    void handleCallback(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    callbackServer?.once("error", reject);
    callbackServer?.listen(port, "127.0.0.1", () => resolve());
  });
};

export const prepareOutlookCalendarOAuth = async (
  input: StartCalendarOAuthInput
): Promise<StartCalendarOAuthResult> => {
  const readiness = getOutlookCalendarOAuthReadiness();
  const connection = getOutlookConnection(input.connectionId);
  if (!connection) {
    return {
      ok: false,
      message: "Choose a saved Outlook calendar connection before starting OAuth.",
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

  const state = `${input.connectionId}.${crypto.randomBytes(24).toString("base64url")}`;
  const codeVerifier = createCodeVerifier();
  storePendingState({
    state,
    codeVerifier,
    connectionId: input.connectionId,
    createdAt: new Date().toISOString(),
  });
  const authorizationUrl = buildAuthorizationUrl(
    connection.account_ref,
    state,
    createCodeChallenge(codeVerifier)
  );

  try {
    await ensureCallbackServer();
    await shell.openExternal(authorizationUrl);
  } catch (oauthStartError) {
    pendingOutlookOAuthStates.delete(state);
    const message =
      oauthStartError instanceof Error
        ? oauthStartError.message
        : "Outlook OAuth could not start.";
    updateConnectionStatus(input.connectionId, "error", "error", message);
    return {
      ok: false,
      message,
      readiness,
    };
  }

  return {
    ok: true,
    message: "Outlook OAuth opened in your browser. Complete the Microsoft consent flow there.",
    authorizationUrl,
    readiness,
  };
};
