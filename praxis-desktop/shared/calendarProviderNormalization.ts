import type { NormalizedCalendarEvent } from "./calendarImport";

export type GoogleCalendarSourceEvent = {
  id?: string;
  iCalUID?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  hangoutLink?: string;
  start?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

export type OutlookCalendarSourceEvent = {
  id?: string;
  iCalUId?: string;
  subject?: string;
  bodyPreview?: string;
  webLink?: string;
  location?: {
    displayName?: string;
  };
  isCancelled?: boolean;
  isAllDay?: boolean;
  start?: {
    dateTime?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    timeZone?: string;
  };
  onlineMeeting?: {
    joinUrl?: string;
  };
};

const normalizeGoogleDate = (date: string | undefined) => (date ? `${date}T00:00:00` : undefined);

const normalizeOutlookDateTime = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }
  return value.endsWith("Z") ? value : `${value}Z`;
};

const buildGoogleNotes = (event: GoogleCalendarSourceEvent) => {
  const notes: string[] = [];
  if (event.location) {
    notes.push(`Location: ${event.location}`);
  }
  if (event.hangoutLink) {
    notes.push(`Meet: ${event.hangoutLink}`);
  }
  if (event.htmlLink) {
    notes.push(`Google Calendar: ${event.htmlLink}`);
  }
  if (event.description) {
    notes.push(event.description);
  }
  return notes.length > 0 ? notes.join("\n\n") : undefined;
};

const buildOutlookNotes = (event: OutlookCalendarSourceEvent) => {
  const notes: string[] = [];
  if (event.location?.displayName) {
    notes.push(`Location: ${event.location.displayName}`);
  }
  if (event.onlineMeeting?.joinUrl) {
    notes.push(`Meeting: ${event.onlineMeeting.joinUrl}`);
  }
  if (event.webLink) {
    notes.push(`Outlook Calendar: ${event.webLink}`);
  }
  if (event.bodyPreview) {
    notes.push(event.bodyPreview);
  }
  return notes.length > 0 ? notes.join("\n\n") : undefined;
};

export const normalizeGoogleCalendarEvent = (
  event: GoogleCalendarSourceEvent,
  calendarId: string
): NormalizedCalendarEvent | null => {
  if (event.status === "cancelled") {
    return null;
  }

  const startsAt = event.start?.dateTime ?? normalizeGoogleDate(event.start?.date);
  if (!startsAt) {
    return null;
  }

  return {
    externalId: event.id || event.iCalUID ? `${calendarId}:${event.id ?? event.iCalUID}` : undefined,
    title: event.summary?.trim() || "Untitled Google Calendar event",
    startsAt,
    endsAt: event.end?.dateTime ?? normalizeGoogleDate(event.end?.date),
    allDay: Boolean(event.start?.date),
    notes: buildGoogleNotes(event),
  };
};

export const normalizeOutlookCalendarEvent = (
  event: OutlookCalendarSourceEvent,
  calendarId: string
): NormalizedCalendarEvent | null => {
  if (event.isCancelled) {
    return null;
  }

  const startsAt = normalizeOutlookDateTime(event.start?.dateTime);
  if (!startsAt) {
    return null;
  }

  return {
    externalId: event.id || event.iCalUId ? `${calendarId}:${event.id ?? event.iCalUId}` : undefined,
    title: event.subject?.trim() || "Untitled Outlook Calendar event",
    startsAt,
    endsAt: normalizeOutlookDateTime(event.end?.dateTime),
    allDay: event.isAllDay === true,
    notes: buildOutlookNotes(event),
  };
};
