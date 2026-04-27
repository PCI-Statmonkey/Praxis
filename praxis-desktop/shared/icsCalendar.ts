import type { CalendarImportIssue, NormalizedCalendarEvent } from "./calendarImport";

type IcsProperty = {
  name: string;
  params: Record<string, string>;
  value: string;
};

type IcsEventFields = {
  uid?: string;
  recurrenceId?: string;
  summary?: string;
  description?: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  allDay?: boolean;
  status?: string;
  rrule?: string;
  exDates?: string[];
};

export type IcsParseResult = {
  events: NormalizedCalendarEvent[];
  issues: CalendarImportIssue[];
};

const MAX_RECURRENCE_INSTANCES = 200;
const MAX_RECURRENCE_SCAN_STEPS = 2500;
const DEFAULT_RECURRENCE_HORIZON_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_BY_ICS_DAY: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

type ParsedRrule = {
  freq?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  count?: number;
  until?: string;
  interval: number;
  byDay: number[];
};

const unfoldIcsLines = (input: string) => {
  const rawLines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];

  rawLines.forEach((line) => {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
      return;
    }
    lines.push(line);
  });

  return lines;
};

const parseProperty = (line: string): IcsProperty | null => {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  const nameAndParams = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [rawName, ...rawParams] = nameAndParams.split(";");
  const params: Record<string, string> = {};

  rawParams.forEach((param) => {
    const [key, ...valueParts] = param.split("=");
    if (!key || valueParts.length === 0) {
      return;
    }
    params[key.toUpperCase()] = valueParts.join("=").replace(/^"|"$/g, "");
  });

  return {
    name: rawName.toUpperCase(),
    params,
    value,
  };
};

const unescapeIcsText = (value: string) =>
  value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();

const formatDateOnly = (value: string) => {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}T00:00:00` : null;
};

const parseDateTimeParts = (value: string) => {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    utc: match[7] === "Z",
  };
};

const formatDateTime = (value: string) => {
  const parts = parseDateTimeParts(value);
  if (!parts) {
    return null;
  }

  const formatted = `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(
    parts.minute
  )}:${pad(parts.second)}`;
  return parts.utc ? `${formatted}Z` : formatted;
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const values = new Map(
    formatter.formatToParts(date).map((part) => [part.type, Number(part.value)])
  );

  const asUtc = Date.UTC(
    values.get("year") ?? date.getUTCFullYear(),
    (values.get("month") ?? date.getUTCMonth() + 1) - 1,
    values.get("day") ?? date.getUTCDate(),
    values.get("hour") ?? date.getUTCHours(),
    values.get("minute") ?? date.getUTCMinutes(),
    values.get("second") ?? date.getUTCSeconds()
  );

  return asUtc - date.getTime();
};

const formatZonedDateTime = (value: string, timeZone: string) => {
  const parts = parseDateTimeParts(value);
  if (!parts || parts.utc) {
    return formatDateTime(value);
  }

  try {
    let utcTime = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    utcTime -= getTimeZoneOffsetMs(new Date(utcTime), timeZone);
    utcTime =
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
      getTimeZoneOffsetMs(new Date(utcTime), timeZone);

    return new Date(utcTime).toISOString().replace(".000Z", "Z");
  } catch {
    return formatDateTime(value);
  }
};

const parseIcsDate = (property: IcsProperty) => {
  const value = property.value.trim();
  if (property.params.VALUE?.toUpperCase() === "DATE" || /^\d{8}$/.test(value)) {
    return {
      value: formatDateOnly(value),
      allDay: true,
    };
  }

  if (property.params.TZID) {
    return {
      value: formatZonedDateTime(value, property.params.TZID),
      allDay: false,
    };
  }

  return {
    value: formatDateTime(value),
    allDay: false,
  };
};

const parseIcsDateList = (property: IcsProperty) =>
  property.value
    .split(",")
    .map((value) => parseIcsDate({ ...property, value }).value)
    .filter((value): value is string => Boolean(value));

const pad = (value: number) => String(value).padStart(2, "0");

const toDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatLikeOriginal = (date: Date, originalValue: string) => {
  if (originalValue.endsWith("Z")) {
    return date.toISOString().replace(".000Z", "Z");
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const parseRrule = (value: string): ParsedRrule | null => {
  const parsed: ParsedRrule = {
    interval: 1,
    byDay: [],
  };

  value.split(";").forEach((part) => {
    const [rawKey, rawValue] = part.split("=");
    const key = rawKey?.toUpperCase();
    const ruleValue = rawValue?.toUpperCase();
    if (!key || !ruleValue) {
      return;
    }

    if (key === "FREQ" && ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(ruleValue)) {
      parsed.freq = ruleValue as ParsedRrule["freq"];
    }
    if (key === "COUNT") {
      const count = Number(ruleValue);
      parsed.count = Number.isFinite(count) && count > 0 ? count : undefined;
    }
    if (key === "UNTIL") {
      const until = /^\d{8}$/.test(ruleValue)
        ? formatDateOnly(ruleValue)
        : formatDateTime(ruleValue);
      parsed.until = until ?? undefined;
    }
    if (key === "INTERVAL") {
      const interval = Number(ruleValue);
      parsed.interval = Number.isFinite(interval) && interval > 0 ? interval : 1;
    }
    if (key === "BYDAY") {
      parsed.byDay = ruleValue
        .split(",")
        .map((day) => WEEKDAY_BY_ICS_DAY[day.replace(/^-?\d+/, "")])
        .filter((day): day is number => typeof day === "number");
    }
  });

  return parsed.freq ? parsed : null;
};

const buildNotes = (fields: IcsEventFields) => {
  const notes: string[] = [];

  if (fields.location) {
    notes.push(`Location: ${fields.location}`);
  }
  if (fields.description) {
    notes.push(fields.description);
  }

  return notes.length > 0 ? notes.join("\n\n") : undefined;
};

const toNormalizedEvent = (
  fields: IcsEventFields,
  occurrenceKey = fields.recurrenceId
): NormalizedCalendarEvent | null => {
  if (fields.status?.toUpperCase() === "CANCELLED") {
    return null;
  }
  if (!fields.summary || !fields.startsAt) {
    return null;
  }

  const externalId = fields.uid
    ? [fields.uid, occurrenceKey].filter(Boolean).join("#")
    : undefined;

  return {
    externalId,
    title: fields.summary,
    startsAt: fields.startsAt,
    endsAt: fields.endsAt,
    allDay: fields.allDay,
    notes: buildNotes(fields),
  };
};

const cloneOccurrence = (
  fields: IcsEventFields,
  startsAt: Date,
  durationMs: number | null
): IcsEventFields => {
  const startsAtValue = fields.startsAt
    ? formatLikeOriginal(startsAt, fields.startsAt)
    : fields.startsAt;
  const endsAtValue =
    fields.endsAt && durationMs !== null
      ? formatLikeOriginal(new Date(startsAt.getTime() + durationMs), fields.endsAt)
      : fields.endsAt;

  return {
    ...fields,
    startsAt: startsAtValue,
    endsAt: endsAtValue,
  };
};

const addOccurrence = (
  events: NormalizedCalendarEvent[],
  fields: IcsEventFields,
  startsAt: Date,
  durationMs: number | null,
  excludedStarts: Set<string>
) => {
  const occurrence = cloneOccurrence(fields, startsAt, durationMs);
  if (!occurrence.startsAt || excludedStarts.has(occurrence.startsAt)) {
    return;
  }

  const normalizedEvent = toNormalizedEvent(occurrence, occurrence.startsAt);
  if (normalizedEvent) {
    events.push(normalizedEvent);
  }
};

const addDays = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds());

const addMonths = (date: Date, months: number) =>
  new Date(date.getFullYear(), date.getMonth() + months, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());

const addYears = (date: Date, years: number) =>
  new Date(date.getFullYear() + years, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());

const isPastLimit = (date: Date, untilDate: Date | null, fallbackLimit: Date) => {
  if (untilDate && date.getTime() > untilDate.getTime()) {
    return true;
  }
  return date.getTime() > fallbackLimit.getTime();
};

const weeksBetween = (start: Date, candidate: Date) => {
  const startWeek = new Date(start.getFullYear(), start.getMonth(), start.getDate() - start.getDay());
  const candidateWeek = new Date(
    candidate.getFullYear(),
    candidate.getMonth(),
    candidate.getDate() - candidate.getDay()
  );
  return Math.floor((candidateWeek.getTime() - startWeek.getTime()) / (7 * DAY_MS));
};

const expandRecurringEvent = (fields: IcsEventFields): NormalizedCalendarEvent[] | null => {
  if (!fields.rrule) {
    const event = toNormalizedEvent(fields);
    return event ? [event] : null;
  }

  const rule = parseRrule(fields.rrule);
  const startsAt = fields.startsAt ? toDate(fields.startsAt) : null;
  if (!rule || !startsAt) {
    return null;
  }

  const endsAt = fields.endsAt ? toDate(fields.endsAt) : null;
  const durationMs = endsAt ? endsAt.getTime() - startsAt.getTime() : null;
  const untilDate = rule.until ? toDate(rule.until) : null;
  const fallbackLimit = new Date(Date.now() + DEFAULT_RECURRENCE_HORIZON_DAYS * DAY_MS);
  const excludedStarts = new Set(fields.exDates ?? []);
  const events: NormalizedCalendarEvent[] = [];

  if (rule.freq === "WEEKLY") {
    const byDay = rule.byDay.length > 0 ? rule.byDay : [startsAt.getDay()];
    let cursor = new Date(startsAt);
    let scanned = 0;

    while (
      events.length < MAX_RECURRENCE_INSTANCES &&
      scanned < MAX_RECURRENCE_SCAN_STEPS &&
      (!rule.count || events.length < rule.count) &&
      !isPastLimit(cursor, untilDate, fallbackLimit)
    ) {
      const weekDistance = weeksBetween(startsAt, cursor);
      if (
        cursor.getTime() >= startsAt.getTime() &&
        weekDistance >= 0 &&
        weekDistance % rule.interval === 0 &&
        byDay.includes(cursor.getDay())
      ) {
        addOccurrence(events, fields, cursor, durationMs, excludedStarts);
      }
      cursor = addDays(cursor, 1);
      scanned += 1;
    }

    return events;
  }

  let cursor = new Date(startsAt);
  let scanned = 0;
  while (
    events.length < MAX_RECURRENCE_INSTANCES &&
    scanned < MAX_RECURRENCE_SCAN_STEPS &&
    (!rule.count || events.length < rule.count) &&
    !isPastLimit(cursor, untilDate, fallbackLimit)
  ) {
    addOccurrence(events, fields, cursor, durationMs, excludedStarts);
    if (rule.freq === "DAILY") {
      cursor = addDays(cursor, rule.interval);
    } else if (rule.freq === "MONTHLY") {
      cursor = addMonths(cursor, rule.interval);
    } else if (rule.freq === "YEARLY") {
      cursor = addYears(cursor, rule.interval);
    } else {
      break;
    }
    scanned += 1;
  }

  return events;
};

const applyPropertyToEvent = (fields: IcsEventFields, property: IcsProperty) => {
  switch (property.name) {
    case "UID":
      fields.uid = unescapeIcsText(property.value);
      break;
    case "RECURRENCE-ID":
      fields.recurrenceId = unescapeIcsText(property.value);
      break;
    case "SUMMARY":
      fields.summary = unescapeIcsText(property.value);
      break;
    case "DESCRIPTION":
      fields.description = unescapeIcsText(property.value);
      break;
    case "LOCATION":
      fields.location = unescapeIcsText(property.value);
      break;
    case "DTSTART": {
      const parsed = parseIcsDate(property);
      fields.startsAt = parsed.value ?? undefined;
      fields.allDay = parsed.allDay;
      break;
    }
    case "DTEND": {
      const parsed = parseIcsDate(property);
      fields.endsAt = parsed.value ?? undefined;
      break;
    }
    case "STATUS":
      fields.status = unescapeIcsText(property.value);
      break;
    case "RRULE":
      fields.rrule = property.value.trim();
      break;
    case "EXDATE":
      fields.exDates = [...(fields.exDates ?? []), ...parseIcsDateList(property)];
      break;
    default:
      break;
  }
};

export const parseIcsCalendar = (input: string): IcsParseResult => {
  const events: NormalizedCalendarEvent[] = [];
  const issues: CalendarImportIssue[] = [];
  let currentEvent: IcsEventFields | null = null;
  let eventIndex = -1;

  unfoldIcsLines(input).forEach((line) => {
    if (line === "BEGIN:VEVENT") {
      currentEvent = {};
      eventIndex += 1;
      return;
    }

    if (line === "END:VEVENT") {
      if (!currentEvent) {
        return;
      }

      const normalizedEvents = expandRecurringEvent(currentEvent);
      if (normalizedEvents && normalizedEvents.length > 0) {
        events.push(...normalizedEvents);
      } else if (currentEvent.status?.toUpperCase() !== "CANCELLED") {
        issues.push({ index: eventIndex, reason: "VEVENT is missing SUMMARY or DTSTART." });
      }
      currentEvent = null;
      return;
    }

    if (!currentEvent) {
      return;
    }

    const property = parseProperty(line);
    if (property) {
      applyPropertyToEvent(currentEvent, property);
    }
  });

  return { events, issues };
};
