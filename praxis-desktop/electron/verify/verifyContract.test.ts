import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "vitest";

const stripAnsi = (input: string) => input.replace(/\x1b\[[0-9;]*m/g, "");

const extractVerifyJson = (output: string) => {
  const cleaned = stripAnsi(output);
  const candidates: unknown[] = [];
  for (let i = 0; i < cleaned.length; i += 1) {
    if (cleaned[i] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < cleaned.length; j += 1) {
      const ch = cleaned[j];
      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === "\\") {
          escaped = true;
          continue;
        }
        if (ch === "\"") inString = false;
        continue;
      }
      if (ch === "\"") {
        inString = true;
        continue;
      }
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const slice = cleaned.slice(i, j + 1);
          try {
            candidates.push(JSON.parse(slice));
          } catch {
            // ignore non-JSON brace groups
          }
          i = j;
          break;
        }
      }
    }
  }
  const match = candidates.find((item) => {
    if (!item || typeof item !== "object") return false;
    const obj = item as Record<string, unknown>;
    return "status" in obj && "attestation" in obj && Array.isArray(obj.checks);
  });
  return (match ?? null) as Record<string, unknown> | null;
};

test("verify JSON contract shape is stable", () => {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  const run = spawnSync(command, ["run", "test:verify-safety"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  const parsed = extractVerifyJson(output);
  assert.ok(parsed, "verify JSON payload not found in output");

  const attestationRaw =
    parsed && typeof parsed.attestation === "object" && parsed.attestation !== null
      ? (parsed.attestation as Record<string, unknown>)
      : {};

  // Canonicalized shape guard: tolerate legacy field names while freezing key contract.
  const canonical = {
    status: parsed.status,
    overallStatus:
      (parsed.overallStatus as string | undefined) ??
      (attestationRaw.overallStatus as string | undefined),
    attestation: {
      generatedAt:
        (attestationRaw.generatedAt as string | undefined) ??
        (attestationRaw.timestamp as string | undefined) ??
        (((parsed.meta as Record<string, unknown> | undefined)?.timestamp as string | undefined) ?? undefined),
      environment:
        (attestationRaw.environment as string | undefined) ??
        (((parsed.meta as Record<string, unknown> | undefined)?.appName as string | undefined) ?? undefined),
      overallStatus: (attestationRaw.overallStatus as string | undefined) ?? (parsed.overallStatus as string | undefined),
    },
    checks: parsed.checks,
  };

  const topLevelKeys = ["status", "overallStatus", "attestation", "checks"] as const;
  for (const key of topLevelKeys) {
    assert.ok(canonical[key] !== undefined, `missing top-level contract key: ${key}`);
  }

  const attestationKeys = ["generatedAt", "environment", "overallStatus"] as const;
  for (const key of attestationKeys) {
    assert.ok(canonical.attestation[key] !== undefined, `missing attestation contract key: ${key}`);
  }

  assert.ok(Array.isArray(canonical.checks), "checks must be an array");
  for (const check of canonical.checks as unknown[]) {
    assert.equal(typeof check, "object");
    assert.ok(check !== null);
    const obj = check as Record<string, unknown>;
    assert.ok(obj.id !== undefined, "check missing id");
    assert.ok(obj.status !== undefined, "check missing status");
  }
}, 180_000);
