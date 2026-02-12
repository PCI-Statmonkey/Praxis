import { describe, expect, test, vi } from "vitest";
import { createEventLogService } from "./eventLogService";
import type { EventRecord } from "../../shared/persistence/eventLogContract";

const makeStat = (exists: boolean) => async () => ({
  isFile: () => exists,
});

const baseEvent: EventRecord = {
  event_id: "evt-1",
  device_id: "device-1",
  local_seq: 1,
  ts: "2026-02-12T00:00:00.000Z",
  type: "ITEM_CREATED",
  item_id: "item-1",
  payload: { title: "Hello" },
};

describe("eventLogService read-only behavior", () => {
  test("returns safe empties when DB missing", async () => {
    let openCalled = false;
    const service = createEventLogService({
      getDbPath: () => "C:\\missing\\eventlog.sqlite",
      fs: {
        stat: async () => {
          const err = new Error("missing") as NodeJS.ErrnoException;
          err.code = "ENOENT";
          throw err;
        },
      },
      openDb: async () => {
        openCalled = true;
        throw new Error("should not open");
      },
    });

    const cursor = await service.getLocalEventCursor();
    expect(cursor.ok).toBe(true);
    if (cursor.ok) {
      expect(cursor.value.maxRowId).toBe(0);
    }

    const events = await service.readEventsAfterRowId(0, 10);
    expect(events.ok).toBe(true);
    if (events.ok) {
      expect(events.value).toEqual([]);
    }

    expect(openCalled).toBe(false);
  });

  test("reads events and cursor when DB exists", async () => {
    const db = {
      prepare: (sql: string) => {
        if (sql.includes("MAX(rowid)")) {
          return { get: () => ({ max_rowid: 12 }) };
        }
        if (sql.includes("MAX(last_event_rowid)")) {
          return { get: () => ({ last_event_rowid: 9 }) };
        }
        if (sql.includes("FROM events")) {
          return {
            all: () => [
              {
                row_id: 10,
                event_id: "evt-1",
                device_id: "device-1",
                local_seq: 1,
                ts: "2026-02-12T00:00:00.000Z",
                type: "ITEM_CREATED",
                item_id: "item-1",
                payload: "{\"title\":\"Hello\"}",
                prev_hash: null,
                hash: "abc",
              },
            ],
          };
        }
        return { get: () => ({}), all: () => [] };
      },
      close: vi.fn(),
    };

    const service = createEventLogService({
      getDbPath: () => "C:\\exists\\eventlog.sqlite",
      fs: { stat: makeStat(true) },
      openDb: async () => db,
    });

    const cursor = await service.getLocalEventCursor();
    expect(cursor.ok).toBe(true);
    if (cursor.ok) {
      expect(cursor.value.maxRowId).toBe(12);
      expect(cursor.value.lastSyncRowId).toBe(9);
    }

    const events = await service.readEventsAfterRowId(5, 10);
    expect(events.ok).toBe(true);
    if (events.ok) {
      expect(events.value[0].event_id).toBe("evt-1");
      expect(events.value[0].row_id).toBe(10);
    }
  });
});

describe("eventLogService write passthrough (not wired)", () => {
  test("delegates to writer when provided", async () => {
    const appendEvent = vi.fn(async () => baseEvent);
    const insertEventIfMissing = vi.fn(async () => true);
    const service = createEventLogService({
      getDbPath: () => "C:\\exists\\eventlog.sqlite",
      fs: { stat: makeStat(true) },
      openDb: async () => ({
        prepare: () => ({ get: () => ({}), all: () => [] }),
        close: vi.fn(),
      }),
      writer: { appendEvent, insertEventIfMissing },
    });

    const appendResult = await service.appendEvent(baseEvent);
    expect(appendResult.ok).toBe(true);
    expect(appendEvent).toHaveBeenCalledWith(baseEvent);

    const insertResult = await service.insertEventIfMissing(baseEvent);
    expect(insertResult.ok).toBe(true);
    expect(insertEventIfMissing).toHaveBeenCalledWith(baseEvent);
  });
});
