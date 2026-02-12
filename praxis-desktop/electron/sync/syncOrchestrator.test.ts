import { describe, expect, test, vi } from "vitest";
import { createSyncOrchestrator } from "./syncOrchestrator";
import { validateEventRecord } from "../../shared/persistence/eventLogContract";
import type { EventRecord, EventLogResult } from "../../shared/persistence/eventLogContract";

const ok = <T>(value: T): EventLogResult<T> => ({ ok: true, value });

const baseEvent: EventRecord = {
  event_id: "evt-1",
  device_id: "device-1",
  local_seq: 1,
  ts: "2026-02-12T00:00:00.000Z",
  type: "ITEM_CREATED",
  item_id: "item-1",
  payload: { title: "Hello" },
};

const makeDeps = () => {
  const eventLog = {
    getLocalEventCursor: vi.fn(async () => ok({ maxRowId: 0 })),
    readEventsAfterRowId: vi.fn(async () => ok([])),
    validateEventRecord: vi.fn((record: EventRecord) => validateEventRecord(record)),
    appendEvent: vi.fn(async () => ok(baseEvent)),
    insertEventIfMissing: vi.fn(async () => ok(true)),
  };
  const mirrorTransport = {
    listDeviceLogs: vi.fn(async () => [] as string[]),
    readFromOffset: vi.fn(async () => ({ entries: [], nextOffset: 0 })),
    append: vi.fn(async () => ({ appended: 0, nextOffset: 0 })),
  };
  const mirrorLock = {
    withMirrorLock: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  };
  const clock = { now: () => "2026-02-12T00:00:00.000Z" };
  const config = {
    isMirrorConfigured: () => true,
    getLocalDeviceId: () => "device-1",
  };
  return { eventLog, mirrorTransport, mirrorLock, clock, config };
};

describe("syncOrchestrator.tick", () => {
  test("blocks when mirror not configured", async () => {
    const deps = makeDeps();
    deps.config.isMirrorConfigured = () => false;
    const orchestrator = createSyncOrchestrator(deps);

    const result = await orchestrator.tick();
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("mirror_not_configured");
    expect(deps.mirrorLock.withMirrorLock).not.toHaveBeenCalled();
  });

  test("blocks when mirror lock unavailable", async () => {
    const deps = makeDeps();
    deps.mirrorLock.withMirrorLock = vi.fn(async () => null);
    const orchestrator = createSyncOrchestrator(deps);

    const result = await orchestrator.tick();
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("mirror_lock_unavailable");
  });

  test("returns success when remote has no new events", async () => {
    const deps = makeDeps();
    deps.eventLog.getLocalEventCursor = vi.fn(async () => ok({ maxRowId: 0 }));
    deps.mirrorTransport.listDeviceLogs = vi.fn(async () => []);
    const orchestrator = createSyncOrchestrator(deps);

    const result = await orchestrator.tick();
    expect(result.status).toBe("idle");
    expect(result.imported).toBe(0);
  });

  test("upload path calls deps in order", async () => {
    const deps = makeDeps();
    const calls: string[] = [];
    deps.eventLog.getLocalEventCursor = vi.fn(async () => {
      calls.push("getLocalEventCursor");
      return ok({ maxRowId: 2, lastSyncRowId: 0 });
    });
    deps.eventLog.readEventsAfterRowId = vi.fn(async (rowId: number) => {
      calls.push("readEventsAfterRowId");
      expect(rowId).toBe(0);
      return ok([baseEvent]);
    });
    deps.mirrorTransport.append = vi.fn(async () => {
      calls.push("mirrorAppend");
      return { appended: 1, nextOffset: 2 };
    });

    const orchestrator = createSyncOrchestrator(deps);
    const result = await orchestrator.tick();
    expect(result.uploaded).toBe(1);
    expect(calls).toEqual(["getLocalEventCursor", "readEventsAfterRowId", "mirrorAppend"]);
  });

  test("lenient validation allows unknown fields but enforces core schema", async () => {
    const deps = makeDeps();
    deps.mirrorTransport.listDeviceLogs = vi.fn(async () => ["remote-a"]);
    deps.mirrorTransport.readFromOffset = vi.fn(async () => ({
      entries: [
        { offset: 0, record: { ...baseEvent, extra: "ok" } },
        { offset: 1, record: { ...baseEvent, event_id: "" } },
      ],
      nextOffset: 2,
    }));
    const orchestrator = createSyncOrchestrator(deps);

    const result = await orchestrator.tick();
    expect(result.status).toBe("idle");
    expect(deps.eventLog.insertEventIfMissing).toHaveBeenCalledTimes(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
