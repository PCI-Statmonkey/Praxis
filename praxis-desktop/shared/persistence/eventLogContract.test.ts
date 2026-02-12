import { describe, expect, test } from "vitest";
import { validateEventRecord, type EventRecord } from "./eventLogContract";

const baseRecord: EventRecord = {
  event_id: "evt-1",
  device_id: "device-1",
  local_seq: 1,
  ts: "2026-02-12T00:00:00.000Z",
  type: "ITEM_CREATED",
  item_id: "item-1",
  payload: { title: "Hello" },
};

describe("validateEventRecord", () => {
  test("accepts a valid record", () => {
    const result = validateEventRecord(baseRecord);
    expect(result.ok).toBe(true);
  });

  test("rejects missing required fields", () => {
    const result = validateEventRecord({ ...baseRecord, event_id: "" });
    expect(result.ok).toBe(false);
  });

  test("rejects invalid type", () => {
    const result = validateEventRecord({ ...baseRecord, type: "UNKNOWN" as EventRecord["type"] });
    expect(result.ok).toBe(false);
  });

  test("rejects negative local_seq", () => {
    const result = validateEventRecord({ ...baseRecord, local_seq: -1 });
    expect(result.ok).toBe(false);
  });

  test("rejects invalid timestamps", () => {
    const result = validateEventRecord({ ...baseRecord, ts: "not-a-date" });
    expect(result.ok).toBe(false);
  });

  test("rejects non-monotonic context", () => {
    const result = validateEventRecord(
      { ...baseRecord, local_seq: 2, row_id: 5 },
      { previousLocalSeq: 3, previousRowId: 6, previousTimestamp: "2026-02-12T00:00:01.000Z" }
    );
    expect(result.ok).toBe(false);
  });
});
