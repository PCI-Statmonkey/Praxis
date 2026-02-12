import { expect, test, vi } from "vitest";
import {
  callMissionsArchive,
  callMissionsCreate,
  callMissionsGet,
  callMissionsList,
  callMissionsUpdate,
} from "./missionsIpc";

test("mission helpers call window.praxis mission methods", async () => {
  const missionsList = vi.fn(async () => ({ ok: true }));
  const missionsGet = vi.fn(async () => ({ ok: true }));
  const missionsCreate = vi.fn(async () => ({ ok: true }));
  const missionsUpdate = vi.fn(async () => ({ ok: true }));
  const missionsArchive = vi.fn(async () => ({ ok: true }));

  (globalThis as unknown as { window: unknown }).window = {
    praxis: {
      missionsList,
      missionsGet,
      missionsCreate,
      missionsUpdate,
      missionsArchive,
    },
  };

  await callMissionsList(true);
  await callMissionsGet("mission-1");
  await callMissionsCreate({ title: "Mission" });
  await callMissionsUpdate("mission-1", { title: "Updated" });
  await callMissionsArchive("mission-1");

  expect(missionsList).toHaveBeenCalledWith(true);
  expect(missionsGet).toHaveBeenCalledWith("mission-1");
  expect(missionsCreate).toHaveBeenCalledWith({ title: "Mission" });
  expect(missionsUpdate).toHaveBeenCalledWith("mission-1", { title: "Updated" });
  expect(missionsArchive).toHaveBeenCalledWith("mission-1");
});
