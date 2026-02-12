import { expect, test, vi } from "vitest";
import {
  callGetStatus,
  callPersistenceGetDbStatus,
  callPing,
  callSyncGetStatus,
} from "./ipcSmoke";

test("ipc smoke helpers call window.praxis methods", async () => {
  const ping = vi.fn(async () => ({ ok: true }));
  const getStatus = vi.fn(async () => ({ ok: true }));
  const persistenceGetDbStatus = vi.fn(async () => ({ ok: true }));
  const syncGetStatus = vi.fn(async () => ({ ok: true }));

  (globalThis as unknown as { window: unknown }).window = {
    praxis: {
      ping,
      getStatus,
      persistenceGetDbStatus,
      syncGetStatus,
    },
  };

  await callPing();
  await callGetStatus();
  await callPersistenceGetDbStatus();
  await callSyncGetStatus();

  expect(ping).toHaveBeenCalledTimes(1);
  expect(getStatus).toHaveBeenCalledTimes(1);
  expect(persistenceGetDbStatus).toHaveBeenCalledTimes(1);
  expect(syncGetStatus).toHaveBeenCalledTimes(1);
});
