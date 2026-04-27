import type { ImportEmailMessagesResult } from "./emailModel";

export type SyncOutlookEmailInput = {
  connectionId: string;
};

export type SyncOutlookEmailResult = {
  ok: boolean;
  message: string;
  fetched: number;
  imported: number;
  updated: number;
  suggestionsCreated: number;
  skipped: number;
  importResult?: ImportEmailMessagesResult;
};
