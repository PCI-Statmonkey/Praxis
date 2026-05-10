import crypto from "node:crypto";
import type {
  CreateTimeBlockInput,
  DeleteTimeBlockInput,
  ListTimeBlocksInput,
  TimeBlockEntityKind,
  TimeBlockRecord,
  TimeBlockSnapshot,
  TimeBlockStatus,
  UpdateTimeBlockInput,
} from "../shared/timeBlocking";
import {
  isTimeBlockEntityKind,
  isTimeBlockStatus,
  validateTimeBlockActualMinutes,
  validateTimeBlockRange,
} from "../shared/timeBlocking";
import { getPraxisDatabase } from "./praxisDb";
import { listTimeBlockPublishes } from "./timeBlockPublishRepository";

type DbTimeBlock = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  entity_kind: TimeBlockEntityKind;
  entity_id: string | null;
  status: TimeBlockStatus;
  source: "local";
  notes: string | null;
  actual_minutes: number | null;
  created_at: string;
  updated_at: string;
};

const nowIso = () => new Date().toISOString();

const createId = () => `time_block_${crypto.randomUUID()}`;

const normalizeOptional = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const normalizeTitle = (value: string | undefined, fallback?: string) => {
  const normalized = value?.trim() ?? fallback?.trim() ?? "";
  if (!normalized) {
    throw new Error("Time block title is required.");
  }
  return normalized;
};

const normalizeEntityId = (entityKind: TimeBlockEntityKind, entityId: string | null | undefined) =>
  entityKind === "manual" ? null : normalizeOptional(entityId);

const toTimeBlock = (row: DbTimeBlock): TimeBlockRecord => ({
  id: row.id,
  title: row.title,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  entityKind: row.entity_kind,
  entityId: row.entity_id,
  status: row.status,
  source: row.source,
  notes: row.notes,
  actualMinutes: row.actual_minutes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const assertValidRange = (startsAt: string, endsAt: string) => {
  const issue = validateTimeBlockRange(startsAt, endsAt);
  if (issue) {
    throw new Error(issue);
  }
};

const normalizeEntityKind = (value: unknown, fallback?: TimeBlockEntityKind) => {
  if (isTimeBlockEntityKind(value)) {
    return value;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error("Time block entity kind must be todo, project, mission, or manual.");
};

const normalizeStatus = (value: unknown, fallback: TimeBlockStatus = "planned") => {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (isTimeBlockStatus(value)) {
    return value;
  }
  throw new Error("Time block status must be planned, completed, or canceled.");
};

const normalizeActualMinutes = (value: number | null | undefined, fallback: number | null) => {
  if (value === undefined) {
    return fallback;
  }
  const issue = validateTimeBlockActualMinutes(value);
  if (issue) {
    throw new Error(issue);
  }
  return value ?? null;
};

const listTimeBlockRecords = (input: ListTimeBlocksInput = {}) => {
  const db = getPraxisDatabase();
  if (input.startsAt && input.endsAt) {
    assertValidRange(input.startsAt, input.endsAt);
    return (
      db
        .prepare(
          `SELECT * FROM time_blocks
           WHERE starts_at < ?
             AND ends_at > ?
           ORDER BY starts_at ASC, created_at ASC`
        )
        .all(input.endsAt, input.startsAt) as DbTimeBlock[]
    ).map(toTimeBlock);
  }

  if (input.startsAt) {
    return (
      db
        .prepare(
          `SELECT * FROM time_blocks
           WHERE ends_at > ?
           ORDER BY starts_at ASC, created_at ASC`
        )
        .all(input.startsAt) as DbTimeBlock[]
    ).map(toTimeBlock);
  }

  if (input.endsAt) {
    return (
      db
        .prepare(
          `SELECT * FROM time_blocks
           WHERE starts_at < ?
           ORDER BY starts_at ASC, created_at ASC`
        )
        .all(input.endsAt) as DbTimeBlock[]
    ).map(toTimeBlock);
  }

  return (
    db.prepare("SELECT * FROM time_blocks ORDER BY starts_at ASC, created_at ASC").all() as
      DbTimeBlock[]
  ).map(toTimeBlock);
};

export const getTimeBlockSnapshot = (input: ListTimeBlocksInput = {}): TimeBlockSnapshot => {
  const timeBlocks = listTimeBlockRecords(input);
  return {
    timeBlocks,
    publishes:
      timeBlocks.length > 0
        ? listTimeBlockPublishes({ timeBlockIds: timeBlocks.map((timeBlock) => timeBlock.id) })
        : [],
  };
};

export const createTimeBlock = (input: CreateTimeBlockInput): TimeBlockSnapshot => {
  const title = normalizeTitle(input.title);
  const entityKind = normalizeEntityKind(input.entityKind);
  const entityId = normalizeEntityId(entityKind, input.entityId);
  const notes = normalizeOptional(input.notes);
  assertValidRange(input.startsAt, input.endsAt);

  const timestamp = nowIso();
  getPraxisDatabase()
    .prepare(
      `INSERT INTO time_blocks (
        id,
        title,
        starts_at,
        ends_at,
        entity_kind,
        entity_id,
        status,
        source,
        notes,
        actual_minutes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'local', ?, ?, ?, ?)`
    )
    .run(
      createId(),
      title,
      input.startsAt,
      input.endsAt,
      entityKind,
      entityId,
      "planned",
      notes,
      null,
      timestamp,
      timestamp
    );

  return getTimeBlockSnapshot();
};

export const updateTimeBlock = (input: UpdateTimeBlockInput): TimeBlockSnapshot => {
  const current = getPraxisDatabase()
    .prepare("SELECT * FROM time_blocks WHERE id = ?")
    .get(input.id) as DbTimeBlock | undefined;
  if (!current) {
    return getTimeBlockSnapshot();
  }

  const title = normalizeTitle(input.title, current.title);
  const startsAt = input.startsAt ?? current.starts_at;
  const endsAt = input.endsAt ?? current.ends_at;
  const entityKind = normalizeEntityKind(input.entityKind, current.entity_kind);
  const entityId =
    input.entityId === undefined
      ? normalizeEntityId(entityKind, current.entity_id)
      : normalizeEntityId(entityKind, input.entityId);
  const status = normalizeStatus(input.status, current.status);
  const notes = input.notes === undefined ? current.notes : normalizeOptional(input.notes);
  const requestedActualMinutes = normalizeActualMinutes(input.actualMinutes, current.actual_minutes);
  const actualMinutes = status === "completed" ? requestedActualMinutes : null;
  assertValidRange(startsAt, endsAt);

  getPraxisDatabase()
    .prepare(
      `UPDATE time_blocks
       SET title = ?,
           starts_at = ?,
           ends_at = ?,
           entity_kind = ?,
           entity_id = ?,
           status = ?,
           notes = ?,
           actual_minutes = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      title,
      startsAt,
      endsAt,
      entityKind,
      entityId,
      status,
      notes,
      actualMinutes,
      nowIso(),
      input.id
    );

  return getTimeBlockSnapshot();
};

export const deleteTimeBlock = (input: DeleteTimeBlockInput): TimeBlockSnapshot => {
  getPraxisDatabase().prepare("DELETE FROM time_blocks WHERE id = ?").run(input.id);
  return getTimeBlockSnapshot();
};
