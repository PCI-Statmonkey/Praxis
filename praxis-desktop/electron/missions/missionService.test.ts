import { describe, expect, test, vi } from "vitest";
import { createMissionService } from "./missionService";
import type { Mission } from "../../shared/missions/missionTypes";
import type { MissionStore } from "../persistence/missionStore";

const makeStore = (): MissionStore => {
  const missions: Mission[] = [];
  return {
    list: async (includeArchived?: boolean) =>
      includeArchived ? [...missions] : missions.filter((m) => m.status !== "archived"),
    get: async (id: string) => missions.find((m) => m.id === id) ?? null,
    create: async (mission: Mission) => {
      missions.push(mission);
      return mission;
    },
    update: async (id, patch) => {
      const idx = missions.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      missions[idx] = { ...missions[idx], ...patch };
      return missions[idx];
    },
    archive: async (id, updatedAt) => {
      const idx = missions.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      missions[idx] = { ...missions[idx], status: "archived", updatedAt };
      return missions[idx];
    },
    unarchive: async (id, updatedAt) => {
      const idx = missions.findIndex((m) => m.id === id);
      if (idx === -1) return null;
      missions[idx] = { ...missions[idx], status: "active", updatedAt };
      return missions[idx];
    },
  };
};

describe("missionService", () => {
  test("create -> list -> get roundtrip", async () => {
    const store = makeStore();
    const service = createMissionService({
      store,
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
      generateId: () => "mission-1",
    });

    const created = await service.create({ title: "First Mission" });
    expect(created.id).toBe("mission-1");

    const list = await service.list();
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("First Mission");

    const fetched = await service.get("mission-1");
    expect(fetched?.title).toBe("First Mission");
  });

  test("update bumps updatedAt", async () => {
    const store = makeStore();
    const service = createMissionService({
      store,
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
      generateId: () => "mission-1",
    });

    await service.create({ title: "Initial" });

    const service2 = createMissionService({
      store,
      clock: { now: () => "2026-02-12T01:00:00.000Z" },
      generateId: () => "mission-2",
    });

    const updated = await service2.update("mission-1", { title: "Updated" });
    expect(updated?.updatedAt).toBe("2026-02-12T01:00:00.000Z");
  });

  test("archive hides from default list", async () => {
    const store = makeStore();
    const service = createMissionService({
      store,
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
      generateId: () => "mission-1",
    });

    await service.create({ title: "Archived Mission" });
    await service.archive("mission-1");

    const list = await service.list();
    expect(list).toHaveLength(0);

    const withArchived = await service.list(true);
    expect(withArchived).toHaveLength(1);
  });

  test("list/get do not invoke write methods", async () => {
    const store: MissionStore = {
      list: vi.fn(async () => []),
      get: vi.fn(async () => null),
      create: vi.fn(async (mission) => mission),
      update: vi.fn(async () => null),
      archive: vi.fn(async () => null),
      unarchive: vi.fn(async () => null),
    };
    const service = createMissionService({
      store,
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
    });

    await service.list();
    await service.get("mission-x");

    expect(store.create).not.toHaveBeenCalled();
    expect(store.update).not.toHaveBeenCalled();
    expect(store.archive).not.toHaveBeenCalled();
    expect(store.unarchive).not.toHaveBeenCalled();
  });
});
