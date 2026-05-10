import crypto from "node:crypto";
import type {
  TimeBlockPublishProvider,
  TimeBlockPublishRecord,
  TimeBlockPublishStatus,
} from "../shared/calendarWriteback";
import { getPraxisDatabase } from "./praxisDb";

type DbTimeBlockPublish = {
  id: string;
  time_block_id: string;
  provider: TimeBlockPublishProvider;
  calendar_connection_id: string;
  provider_calendar_id: string;
  provider_event_id: string | null;
  status: TimeBlockPublishStatus;
  last_published_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type ListTimeBlockPublishesInput = {
  timeBlockIds?: string[];
  provider?: TimeBlockPublishProvider;
  calendarConnectionId?: string;
};

export type StoreTimeBlockPublishInput = Omit<
  TimeBlockPublishRecord,
  "id" | "createdAt" | "updatedAt"
>;

const nowIso = () => new Date().toISOString();
const createId = () => `time_block_publish_${crypto.randomUUID()}`;

const toRecord = (row: DbTimeBlockPublish): TimeBlockPublishRecord => ({
  id: row.id,
  timeBlockId: row.time_block_id,
  provider: row.provider,
  calendarConnectionId: row.calendar_connection_id,
  providerCalendarId: row.provider_calendar_id,
  providerEventId: row.provider_event_id,
  status: row.status,
  lastPublishedAt: row.last_published_at,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listTimeBlockPublishes = (
  input: ListTimeBlockPublishesInput = {}
): TimeBlockPublishRecord[] => {
  const rows = getPraxisDatabase()
    .prepare(
      `SELECT *
       FROM time_block_publishes
       WHERE (? IS NULL OR provider = ?)
         AND (? IS NULL OR calendar_connection_id = ?)
       ORDER BY updated_at DESC`
    )
    .all(
      input.provider ?? null,
      input.provider ?? null,
      input.calendarConnectionId ?? null,
      input.calendarConnectionId ?? null
    ) as DbTimeBlockPublish[];
  const timeBlockIds = new Set(input.timeBlockIds ?? []);
  return rows
    .filter((row) => timeBlockIds.size === 0 || timeBlockIds.has(row.time_block_id))
    .map(toRecord);
};

export const storeTimeBlockPublish = (
  input: StoreTimeBlockPublishInput
): TimeBlockPublishRecord => {
  const timestamp = nowIso();
  const id = createId();
  getPraxisDatabase()
    .prepare(
      `INSERT INTO time_block_publishes (
        id,
        time_block_id,
        provider,
        calendar_connection_id,
        provider_calendar_id,
        provider_event_id,
        status,
        last_published_at,
        last_error,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.timeBlockId,
      input.provider,
      input.calendarConnectionId,
      input.providerCalendarId,
      input.providerEventId,
      input.status,
      input.lastPublishedAt,
      input.lastError,
      timestamp,
      timestamp
    );

  return {
    id,
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};
