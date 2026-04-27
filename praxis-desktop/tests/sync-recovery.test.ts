import { strict as assert } from "node:assert";
import {
  fetchJsonWithRetry,
  isTransientHttpStatus,
  recoverableSyncMessage,
  recoverableSyncState,
  TransientSyncError,
} from "../electron/syncRecovery";

assert.equal(isTransientHttpStatus(429), true);
assert.equal(isTransientHttpStatus(503), true);
assert.equal(isTransientHttpStatus(401), false);
assert.equal(isTransientHttpStatus(403), false);

let attempts = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  attempts += 1;
  if (attempts === 1) {
    return new Response(JSON.stringify({ error: "temporary" }), { status: 503 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}) as typeof fetch;

const retryResult = await fetchJsonWithRetry<{ ok: boolean }>(
  "https://example.invalid/test",
  {},
  "test fetch",
  [1]
);
assert.equal(retryResult.response.status, 200);
assert.equal(retryResult.payload.ok, true);
assert.equal(attempts, 2);

globalThis.fetch = (async () =>
  new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })) as typeof fetch;
const authResult = await fetchJsonWithRetry<{ error: string }>(
  "https://example.invalid/auth",
  {},
  "auth fetch",
  [1]
);
assert.equal(authResult.response.status, 401);
assert.equal(authResult.payload.error, "unauthorized");

globalThis.fetch = originalFetch;

assert.match(
  recoverableSyncMessage("Gmail", new TransientSyncError("temporary", 429)) ?? "",
  /temporary provider error/
);
assert.equal(recoverableSyncMessage("Gmail", new Error("permission denied")), null);

assert.deepEqual(recoverableSyncState("Outlook inbox", new TransientSyncError("temporary", 503)), {
  message: "Outlook inbox sync hit a temporary provider error (503). Praxis will retry automatically.",
  authStatus: "ready",
  syncStatus: "error",
});
assert.equal(recoverableSyncState("Outlook inbox", new Error("invalid_grant")), null);

console.log("sync recovery regression tests passed");
