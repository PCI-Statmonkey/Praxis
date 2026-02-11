import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "vitest";

test("CI gate scripts are pinned and verify entrypoint is intact", async () => {
  const raw = await readFile("package.json", "utf8");
  const pkg = JSON.parse(raw) as {
    scripts?: Record<string, string>;
  };
  const scripts = pkg.scripts ?? {};

  assert.equal(scripts.test, "npm run test:unit");
  assert.equal(scripts["test:unit"], "vitest run");
  assert.equal(scripts["test:verify-safety"], "npm run verify:safety");
  assert.ok(
    typeof scripts["verify:safety"] === "string" &&
      scripts["verify:safety"].includes("node ./electron/verify/runVerifySafety.cjs"),
    "verify:safety must keep using runVerifySafety.cjs"
  );
});

test("CI workflow order is npm ci -> npm test -> npm run test:verify-safety", async () => {
  const workflow = await readFile(".github/workflows/ci-gate.yml", "utf8");
  const npmCi = workflow.indexOf("run: npm ci");
  const npmTest = workflow.indexOf("run: npm test");
  const verify = workflow.indexOf("run: npm run test:verify-safety");

  assert.ok(npmCi >= 0, "workflow missing npm ci step");
  assert.ok(npmTest >= 0, "workflow missing npm test step");
  assert.ok(verify >= 0, "workflow missing verify step");
  assert.ok(npmCi < npmTest && npmTest < verify, "workflow order drift detected");
});
