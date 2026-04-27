import type { CalendarImportResult } from "./calendarImport";

export type SyncGoogleCalendarInput = {
  connectionId: string;
};

export type SyncGoogleCalendarResult = {
  ok: boolean;
  message: string;
  fetched: number;
  imported: number;
  updated: number;
  skipped: number;
  importResult?: CalendarImportResult;
};
