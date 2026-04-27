import type { AppointmentRecord } from "./workModel";

export type CalendarImportSource = "manual_json" | "google" | "outlook" | "ics";

export type NormalizedCalendarEvent = {
  externalId?: string;
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  notes?: string;
};

export type ImportCalendarEventsInput = {
  sourceSystem: CalendarImportSource | string;
  events: NormalizedCalendarEvent[];
};

export type CalendarImportIssue = {
  index: number;
  reason: string;
};

export type CalendarImportResult = {
  ok: boolean;
  imported: number;
  updated: number;
  skipped: number;
  issues: CalendarImportIssue[];
  appointments: AppointmentRecord[];
  message: string;
};
