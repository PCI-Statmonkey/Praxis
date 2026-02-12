import { describe, expect, test, vi } from "vitest";
import { createSyncOrchestrator } from "./syncOrchestrator";
import { validateEventRecord } from "../../shared/persistence/eventLogContract";
import type { EventRecord } from "../../shared/persistence/eventLogContract";

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
  const eventLogRead = {
    getLocalCursor: vi.fn(async () => ({ maxRowId: 0 })),
    readEventsAfterRowId: vi.fn(async () => [] as EventRecord[]),
  };
  const eventLogWrite = {
    insertEventIfMissing: vi.fn(async () => true),
  };
  const mirrorTransport = {
    listDeviceLogs: vi.fn(async () => [] as string[]),
    readFromOffset: vi.fn(async () => ({ lines: [], nextOffset: 0 })),
    appendLines: vi.fn(async () => ({ appended: 0 })),
  };
  const lock = {
    withMirrorLock: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  };
  const clock = { now: () => Date.now() };
  const getMirrorRoot = () => "C:\\mirror";
  return { eventLogRead, eventLogWrite, mirrorTransport, lock, clock, getMirrorRoot };
};

describe("syncOrchestrator.getStatus", () => {
  test("returns blocked when mirror not configured", async () => {
    const deps = makeDeps();
    deps.getMirrorRoot = () => null;
    const orchestrator = createSyncOrchestrator(deps);

    const status = await orchestrator.getStatus();
    expect(status.status).toBe("blocked");
    expect(status.issues).toContain("mirror root not configured");
  });

  test("reflects cursors from eventLogRead", async () => {
    const deps = makeDeps();
    deps.eventLogRead.getLocalCursor = vi.fn(async () => ({
      maxRowId: 12,
      lastUploadedRowId: 8,
      lastImportedRowId: 7,
    }));
    const orchestrator = createSyncOrchestrator(deps);

    const status = await orchestrator.getStatus();
    expect(status.localCursor.maxRowId).toBe(12);
    expect(status.syncState.lastUploadedRowId).toBe(8);
    expect(status.syncState.lastImportedRowId).toBe(7);
  });
});

describe("syncOrchestrator.tick", () => {
  test("blocks when lock cannot be acquired", async () => {
    const deps = makeDeps();
    deps.lock.withMirrorLock = vi.fn(async () => null);
    const orchestrator = createSyncOrchestrator(deps);

    const result = await orchestrator.tick();
    expect(result.status).toBe("blocked");
    expect(result.warnings).toContain("mirror lock unavailable");
  });

  test("imports remote lines using validator (lenient)", async () => {
    const deps = makeDeps();
    deps.mirrorTransport.listDeviceLogs = vi.fn(async () => ["remote-a"]);
    deps.mirrorTransport.readFromOffset = vi.fn(async () => ({
      lines: [
        JSON.stringify({ ...baseEvent, extra: "ok" }),
        JSON.stringify({ ...baseEvent, event_id: "" }),
        "not-json",
      ],
      nextOffset: 3,
    }));

    const orchestrator = createSyncOrchestrator({
      ...deps,
      validateEventRecord,
    });

    const result = await orchestrator.tick();
    expect(result.status).toBe("idle");
    expect(deps.eventLogWrite.insertEventIfMissing).toHaveBeenCalledTimes(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
