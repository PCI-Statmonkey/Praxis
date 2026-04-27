import crypto from "node:crypto";
import type {
  CalendarImportResult,
  ImportCalendarEventsInput,
  NormalizedCalendarEvent,
} from "../shared/calendarImport";
import type { AppointmentRecord } from "../shared/workModel";
import { writeAppointmentsSummaryMarkdown } from "./memoryWriter";
import { getPraxisDatabase, refreshMemoryDocumentIndex } from "./praxisDb";

type DbAppointment = {
  id: string;
  source_system: string;
  external_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  notes_json: string | null;
  created_at: string;
  updated_at: string;
};

const nowIso = () => new Date().toISOString();
const createId = () => `appointment_${crypto.randomUUID()}`;

const normalizeOptional = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const toAppointment = (row: DbAppointment): AppointmentRecord => ({
  id: row.id,
  sourceSystem: row.source_system,
  externalId: row.external_id,
  title: row.title,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  allDay: row.all_day === 1,
  notes: row.notes_json,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const listAppointments = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM appointments ORDER BY starts_at ASC")
      .all() as DbAppointment[]
  ).map(toAppointment);

const isValidDateInput = (value: string) => !Number.isNaN(new Date(value).getTime());

const validateEvent = (event: NormalizedCalendarEvent) => {
  if (!event || typeof event !== "object") {
    return "Event must be an object.";
  }
  if (!normalizeOptional(event.title)) {
    return "Missing event title.";
  }
  const startsAt = normalizeOptional(event.startsAt);
  if (!startsAt || !isValidDateInput(startsAt)) {
    return "Missing or invalid start date.";
  }
  const endsAt = normalizeOptional(event.endsAt);
  if (endsAt && !isValidDateInput(endsAt)) {
    return "Invalid end date.";
  }
  return null;
};

export const importCalendarEvents = (input: ImportCalendarEventsInput): CalendarImportResult => {
  const sourceSystem = normalizeOptional(input.sourceSystem) ?? "manual_json";
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  let imported = 0;
  let updated = 0;
  const issues: CalendarImportResult["issues"] = [];

  db.transaction(() => {
    const events = Array.isArray(input.events) ? input.events : [];
    events.forEach((event, index) => {
      const issue = validateEvent(event);
      if (issue) {
        issues.push({ index, reason: issue });
        return;
      }

      const externalId = normalizeOptional(event.externalId);
      const existing = externalId
        ? (db
            .prepare("SELECT id FROM appointments WHERE source_system = ? AND external_id = ?")
            .get(sourceSystem, externalId) as { id: string } | undefined)
        : undefined;

      if (existing) {
        db.prepare(`
          UPDATE appointments
          SET title = ?,
              starts_at = ?,
              ends_at = ?,
              all_day = ?,
              notes_json = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          event.title.trim(),
          event.startsAt,
          normalizeOptional(event.endsAt),
          event.allDay === true ? 1 : 0,
          normalizeOptional(event.notes),
          timestamp,
          existing.id
        );
        updated += 1;
        return;
      }

      db.prepare(`
        INSERT INTO appointments (
          id,
          source_system,
          external_id,
          title,
          starts_at,
          ends_at,
          all_day,
          notes_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        createId(),
        sourceSystem,
        externalId,
        event.title.trim(),
        event.startsAt,
        normalizeOptional(event.endsAt),
        event.allDay === true ? 1 : 0,
        normalizeOptional(event.notes),
        timestamp,
        timestamp
      );
      imported += 1;
    });
  })();

  const appointments = listAppointments();
  writeAppointmentsSummaryMarkdown(appointments);
  refreshMemoryDocumentIndex();

  const skipped = issues.length;
  return {
    ok: imported + updated > 0,
    imported,
    updated,
    skipped,
    issues,
    appointments,
    message: `Calendar import finished: ${imported} imported, ${updated} updated, ${skipped} skipped.`,
  };
};
