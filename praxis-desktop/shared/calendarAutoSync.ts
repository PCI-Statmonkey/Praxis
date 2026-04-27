import type { CalendarProvider } from "./settingsModel";

export type CalendarAutoSyncTrigger = "startup" | "oauth" | "brief" | "interval" | "user_request";

export type CalendarAutoSyncRequest = {
  triggeredBy?: CalendarAutoSyncTrigger;
  force?: boolean;
};

export type CalendarAutoSyncUpdate = {
  provider: Extract<CalendarProvider, "google" | "outlook">;
  connectionId: string;
  ok: boolean;
  message: string;
  fetched: number;
  imported: number;
  updated: number;
  skipped: number;
  triggeredBy: CalendarAutoSyncTrigger;
  syncedAt: string;
};
