import type { ImportEmailMessagesResult } from "./emailModel";

export type SyncGmailEmailInput = {
  connectionId: string;
};

export type SyncGmailEmailResult = {
  ok: boolean;
  message: string;
  fetched: number;
  imported: number;
  updated: number;
  suggestionsCreated: number;
  skipped: number;
  importResult?: ImportEmailMessagesResult;
};
