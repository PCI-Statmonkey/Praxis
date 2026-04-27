export type EmailAutoSyncTrigger = "startup" | "interval" | "oauth" | "brief" | "user_request";

export type EmailAutoSyncUpdate = {
  provider: "gmail" | "outlook";
  connectionId: string;
  ok: boolean;
  message: string;
  fetched: number;
  imported: number;
  updated: number;
  suggestionsCreated: number;
  skipped: number;
  triggeredBy: EmailAutoSyncTrigger;
  syncedAt: string;
};
