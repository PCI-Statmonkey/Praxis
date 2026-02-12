export type EventType =
  | "ITEM_CREATED"
  | "ITEM_EDITED"
  | "ITEM_COMPLETED"
  | "ITEM_UNCOMPLETED"
  | "ITEM_ARCHIVED"
  | "ITEM_RESTORED"
  | "ITEM_SNOOZED"
  | "ITEM_UNSNOOZED"
  | "ITEM_PINNED"
  | "ITEM_UNPINNED"
  | "ITEM_REORDERED";

export type EventPayload = Record<string, unknown>;

export type EventRecord = {
  event_id: string;
  device_id: string;
  local_seq: number;
  ts: string;
  type: EventType;
  item_id: string;
  payload: EventPayload;
  prev_hash?: string | null;
  hash?: string | null;
  row_id?: number;
};

export type EventLogErrorCode =
  | "invalid_request"
  | "unknown_error"
  | "not_implemented"
  | "db_missing"
  | "io_error";

export type EventLogError = {
  code: EventLogErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

export type EventLogResult<T> = { ok: true; value: T } | { ok: false; error: EventLogError };

export type EventLogValidationContext = {
  previousLocalSeq?: number;
  previousRowId?: number;
  previousTimestamp?: string;
};

export type EventLogValidationResult = { ok: true } | { ok: false; error: EventLogError };

const EVENT_TYPES = new Set<EventType>([
  "ITEM_CREATED",
  "ITEM_EDITED",
  "ITEM_COMPLETED",
  "ITEM_UNCOMPLETED",
  "ITEM_ARCHIVED",
  "ITEM_RESTORED",
  "ITEM_SNOOZED",
  "ITEM_UNSNOOZED",
  "ITEM_PINNED",
  "ITEM_UNPINNED",
  "ITEM_REORDERED",
]);

const MAX_ID_LENGTH = 128;

const invalid = (message: string, details?: Record<string, unknown>): EventLogValidationResult => ({
  ok: false,
  error: { code: "invalid_request", message, details },
});

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isCleanId = (value: string) =>
  value.length <= MAX_ID_LENGTH && value.trim() === value;

const isValidIsoTimestamp = (value: string) => !Number.isNaN(Date.parse(value));

export const validateEventRecord = (
  record: EventRecord,
  context: EventLogValidationContext = {}
): EventLogValidationResult => {
  if (!isNonEmptyString(record.event_id)) return invalid("event_id is required");
  if (!isCleanId(record.event_id))
    return invalid("event_id must be trimmed and <= 128 chars");
  if (!isNonEmptyString(record.device_id)) return invalid("device_id is required");
  if (!isCleanId(record.device_id))
    return invalid("device_id must be trimmed and <= 128 chars");
  if (!isNonEmptyString(record.item_id)) return invalid("item_id is required");
  if (!isCleanId(record.item_id))
    return invalid("item_id must be trimmed and <= 128 chars");
  if (!EVENT_TYPES.has(record.type)) return invalid("type is invalid");
  if (!Number.isFinite(record.local_seq) || record.local_seq < 0)
    return invalid("local_seq must be a non-negative number");
  if (!isNonEmptyString(record.ts) || !isValidIsoTimestamp(record.ts))
    return invalid("ts must be a valid timestamp");
  if (typeof record.payload !== "object" || record.payload === null)
    return invalid("payload must be an object");
  if (record.row_id !== undefined) {
    if (!Number.isFinite(record.row_id) || record.row_id <= 0)
      return invalid("row_id must be a positive number");
    if (
      context.previousRowId !== undefined &&
      Number.isFinite(context.previousRowId) &&
      record.row_id < context.previousRowId
    ) {
      return invalid("row_id must be monotonic", {
        previousRowId: context.previousRowId,
        row_id: record.row_id,
      });
    }
  }
  if (
    context.previousLocalSeq !== undefined &&
    Number.isFinite(context.previousLocalSeq) &&
    record.local_seq < context.previousLocalSeq
  ) {
    return invalid("local_seq must be monotonic", {
      previousLocalSeq: context.previousLocalSeq,
      local_seq: record.local_seq,
    });
  }
  if (context.previousTimestamp && isValidIsoTimestamp(context.previousTimestamp)) {
    const prev = Date.parse(context.previousTimestamp);
    const next = Date.parse(record.ts);
    if (next < prev) {
      return invalid("ts must be monotonic", {
        previousTimestamp: context.previousTimestamp,
        ts: record.ts,
      });
    }
  }
  return { ok: true };
};
