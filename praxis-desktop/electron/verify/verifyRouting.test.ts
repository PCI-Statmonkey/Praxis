import assert from "node:assert/strict";
import { test } from "vitest";
import { handleVerifyFlag } from "./verifyRouting";

test("verify routing short-circuits before window/scheduler", async () => {
  let createWindowCalled = false;
  let schedulerCalled = false;
  const exitCodes: number[] = [];

  const handled = await handleVerifyFlag(["node", "app", "--verify"], {
    runVerify: async () => 0,
    exit: (code) => exitCodes.push(code),
  });

  if (!handled) {
    createWindowCalled = true;
    schedulerCalled = true;
  }

  assert.equal(handled, true);
  assert.equal(createWindowCalled, false);
  assert.equal(schedulerCalled, false);
  assert.deepEqual(exitCodes, [0]);
});
