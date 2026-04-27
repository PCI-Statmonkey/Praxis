import crypto from "node:crypto";
import http from "node:http";
import { shell } from "electron";
import { getGoogleOAuthClientConfig } from "./settingsRepository";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:47841/oauth/google/callback";

type PendingGoogleOAuthState = {
  state: string;
  codeVerifier: string;
  connectionId: string;
  onSuccess: (input: {
    connectionId: string;
    tokenPayload: Record<string, unknown>;
  }) => Promise<void>;
  onError: (input: { connectionId: string; message: string }) => void;
  successHtml: string;
  errorHtml: string;
};

type StartGoogleOAuthFlowOptions = {
  connectionId: string;
  accountRef: string | null;
  scopes: string[];
  onSuccess: PendingGoogleOAuthState["onSuccess"];
  onError: PendingGoogleOAuthState["onError"];
  successHtml: string;
  errorHtml: string;
};

let callbackServer: http.Server | null = null;
const pendingGoogleOAuthStates = new Map<string, PendingGoogleOAuthState>();

const configuredClientId = () => getGoogleOAuthClientConfig().clientId;
const configuredClientSecret = () => getGoogleOAuthClientConfig().clientSecret;
const configuredRedirectUri = () => getGoogleOAuthClientConfig().redirectUri || DEFAULT_REDIRECT_URI;

const base64Url = (buffer: Buffer) =>
  buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const createCodeVerifier = () => base64Url(crypto.randomBytes(64));

const createCodeChallenge = (codeVerifier: string) =>
  base64Url(crypto.createHash("sha256").update(codeVerifier).digest());

const respondHtml = (response: http.ServerResponse, statusCode: number, body: string) => {
  response.writeHead(statusCode, { "Content-Type": "text/html; charset=utf-8" });
  response.end(body);
};

const buildAuthorizationUrl = (
  accountRef: string | null,
  state: string,
  codeChallenge: string,
  scopes: string[]
) => {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.searchParams.set("client_id", configuredClientId());
  url.searchParams.set("redirect_uri", configuredRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  if (accountRef) {
    url.searchParams.set("login_hint", accountRef);
  }
  return url.toString();
};

const exchangeCodeForTokens = async (code: string, codeVerifier: string) => {
  const body = new URLSearchParams({
    client_id: configuredClientId(),
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: configuredRedirectUri(),
  });
  const clientSecret = configuredClientSecret();
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const tokenPayload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error =
      typeof tokenPayload.error === "string" ? tokenPayload.error : "token_exchange_failed";
    throw new Error(error);
  }

  return tokenPayload;
};

const handleCallback = async (request: http.IncomingMessage, response: http.ServerResponse) => {
  const redirectUri = new URL(configuredRedirectUri());
  const requestUrl = new URL(request.url ?? "/", redirectUri.origin);
  const defaultErrorHtml = "<h1>Praxis could not complete Google sign-in.</h1>";
  if (requestUrl.pathname !== redirectUri.pathname) {
    respondHtml(response, 404, defaultErrorHtml);
    return;
  }

  const state = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  if (!state) {
    respondHtml(response, 400, defaultErrorHtml);
    return;
  }

  const pending = pendingGoogleOAuthStates.get(state);
  if (!pending) {
    respondHtml(response, 400, defaultErrorHtml);
    return;
  }

  if (error) {
    pendingGoogleOAuthStates.delete(state);
    pending.onError({
      connectionId: pending.connectionId,
      message: `Google OAuth failed: ${error}.`,
    });
    respondHtml(response, 400, pending.errorHtml);
    return;
  }

  if (!code) {
    pendingGoogleOAuthStates.delete(state);
    pending.onError({
      connectionId: pending.connectionId,
      message: "Google OAuth callback did not include an authorization code.",
    });
    respondHtml(response, 400, pending.errorHtml);
    return;
  }

  try {
    const tokenPayload = await exchangeCodeForTokens(code, pending.codeVerifier);
    pendingGoogleOAuthStates.delete(state);
    await pending.onSuccess({
      connectionId: pending.connectionId,
      tokenPayload,
    });
    respondHtml(response, 200, pending.successHtml);
  } catch (exchangeError) {
    pendingGoogleOAuthStates.delete(state);
    pending.onError({
      connectionId: pending.connectionId,
      message:
        exchangeError instanceof Error
          ? exchangeError.message
          : "Google OAuth token exchange failed.",
    });
    respondHtml(response, 500, pending.errorHtml);
  }
};

const ensureCallbackServer = async () => {
  if (callbackServer?.listening) {
    return;
  }

  const redirectUri = new URL(configuredRedirectUri());
  const port = Number(redirectUri.port);
  if (!port || redirectUri.hostname !== "127.0.0.1") {
    throw new Error("Google OAuth redirect URI must use http://127.0.0.1:<port>/...");
  }

  callbackServer = http.createServer((request, response) => {
    void handleCallback(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    callbackServer?.once("error", reject);
    callbackServer?.listen(port, "127.0.0.1", () => resolve());
  });
};

export const getConfiguredGoogleRedirectUri = () => configuredRedirectUri();

export const getConfiguredGoogleClientId = () => configuredClientId();

export const startGoogleOAuthFlow = async ({
  connectionId,
  accountRef,
  scopes,
  onSuccess,
  onError,
  successHtml,
  errorHtml,
}: StartGoogleOAuthFlowOptions) => {
  const state = `${connectionId}.${crypto.randomBytes(24).toString("base64url")}`;
  const codeVerifier = createCodeVerifier();
  pendingGoogleOAuthStates.set(state, {
    state,
    codeVerifier,
    connectionId,
    onSuccess,
    onError,
    successHtml,
    errorHtml,
  });

  const authorizationUrl = buildAuthorizationUrl(
    accountRef,
    state,
    createCodeChallenge(codeVerifier),
    scopes
  );

  try {
    await ensureCallbackServer();
    await shell.openExternal(authorizationUrl);
    return authorizationUrl;
  } catch (oauthStartError) {
    pendingGoogleOAuthStates.delete(state);
    throw oauthStartError;
  }
};
