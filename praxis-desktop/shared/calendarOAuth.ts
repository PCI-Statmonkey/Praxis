export type CalendarOAuthProvider = "google" | "outlook";

export type CalendarOAuthReadiness = {
  provider: CalendarOAuthProvider;
  ready: boolean;
  missing: string[];
  redirectUri: string;
  scopes: string[];
  message: string;
};

export type StartCalendarOAuthInput = {
  connectionId: string;
};

export type StartCalendarOAuthResult = {
  ok: boolean;
  message: string;
  authorizationUrl?: string;
  readiness: CalendarOAuthReadiness;
};

export type GoogleOAuthUpdate = {
  connectionId: string;
  ok: boolean;
  message: string;
};

export type OutlookOAuthUpdate = {
  connectionId: string;
  ok: boolean;
  message: string;
};
