export type EmailOAuthProvider = "gmail" | "outlook";

export type EmailOAuthReadiness = {
  provider: EmailOAuthProvider;
  ready: boolean;
  missing: string[];
  redirectUri: string;
  scopes: string[];
  message: string;
};

export type StartEmailOAuthInput = {
  connectionId: string;
};

export type StartEmailOAuthResult = {
  ok: boolean;
  message: string;
  authorizationUrl?: string;
  readiness: EmailOAuthReadiness;
};

export type GmailOAuthUpdate = {
  connectionId: string;
  ok: boolean;
  message: string;
};

export type OutlookEmailOAuthUpdate = {
  connectionId: string;
  ok: boolean;
  message: string;
};
