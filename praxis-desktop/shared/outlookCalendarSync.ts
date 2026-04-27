import type { CalendarImportResult } from "./calendarImport";

export type SyncOutlookCalendarInput = {
  connectionId: string;
};

export type SyncOutlookCalendarResult = {
  ok: boolean;
  message: string;
  fetched: number;
  imported: number;
  updated: number;
  skipped: number;
  importResult?: CalendarImportResult;
};
