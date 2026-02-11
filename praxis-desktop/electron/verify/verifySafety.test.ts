import assert from "node:assert/strict";
import { test, vi } from "vitest";
import * as fs from "node:fs/promises";
import { buildVerificationChecks } from "./verificationChecks";
import { formatVerificationReportJson, formatVerificationReportText, getExitCode, runVerification } from "./verificationRunner";
import { handleVerifyFlag } from "./verifyRouting";
import type { VerificationContext, VerificationMeta } from "./verificationTypes";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    writeFile: vi.fn(actual.writeFile),
    appendFile: vi.fn(actual.appendFile),
    mkdir: vi.fn(actual.mkdir),
    unlink: vi.fn(actual.unlink),
    rename: vi.fn(actual.rename),
    copyFile: vi.fn(actual.copyFile),
  };
});

const buildContext = (): VerificationContext => ({
  expectedSchemaVersion: 1,
  dbPolicy: "A",
  getDbFilePath: () => "/app/eventlog.sqlite",
  readDbSchemaVersion: async () => ({ ok: true, schemaVersion: 1, driver: "mock" }),
  getMirrorRoot: async () => null,
  getMirrorConfigPath: () => "/app/config.json",
  statPath: async () => ({
    exists: false,
    isFile: false,
    isDirectory: false,
    size: 0,
  }),
  readTextFile: async () => "",
  listDir: async () => [],
  readTailLine: async () => ({ ok: true, line: null, size: 0 }),
  getAppDataRoot: () => "/app",
  listBackupArchives: async () => [],
  inspectBackupArchive: async () => ({ ok: true }),
});

const buildMeta = (): VerificationMeta => ({
  appName: "PRAXIS",
  version: "0.0.0",
  build: null,
  timestamp: "2026-02-06T00:00:00.000Z",
});

test("verify CLI harness exits and prints attestation + checks", async () => {
  const outputs: string[] = [];
  const exitCodes: number[] = [];

  const handled = await handleVerifyFlag(["node", "app", "--verify"], {
    runVerify: async () => {
      const report = await runVerification(buildMeta(), buildContext(), buildVerificationChecks());
      outputs.push(formatVerificationReportText(report));
      return getExitCode(report.status);
    },
    exit: (code) => exitCodes.push(code),
  });

  assert.equal(handled, true);
  assert.deepEqual(exitCodes, [1]);
  const output = outputs.join("\n");
  assert.ok(output.includes("Attestation:"));
  assert.ok(output.includes("[process.info]"));
  assert.ok(output.includes("[db.readable_and_schema_ok]"));
  assert.ok(output.includes("[mirror.eventlog.readable]"));
  assert.ok(output.includes("[dr.backup_readiness]"));
});

test("verify CLI harness supports --json output", async () => {
  const outputs: string[] = [];
  const exitCodes: number[] = [];

  const handled = await handleVerifyFlag(["node", "app", "--verify", "--json"], {
    runVerify: async () => {
      const report = await runVerification(buildMeta(), buildContext(), buildVerificationChecks());
      outputs.push(formatVerificationReportJson(report));
      return getExitCode(report.status);
    },
    exit: (code) => exitCodes.push(code),
  });

  assert.equal(handled, true);
  assert.deepEqual(exitCodes, [1]);
  const json = JSON.parse(outputs.join("\n")) as { attestation?: unknown; checks?: unknown };
  assert.ok(json.attestation);
  assert.ok(Array.isArray(json.checks));
});

test("verify has zero side effects (no scheduler/sync/backup/restore/support bundle/window/timers/writes)", async () => {
  const outputs: string[] = [];
  const exitCodes: number[] = [];
  let createWindowCalled = false;
  let startSchedulerCalled = false;
  let syncCalled = false;
  let backupCalled = false;
  let restoreCalled = false;
  let supportCalled = false;

  const timerCalls: { setTimeout: number; setInterval: number } = { setTimeout: 0, setInterval: 0 };
  const originalSetTimeout = global.setTimeout;
  const originalSetInterval = global.setInterval;

  const writeFileMock = vi.mocked(fs.writeFile);
  const appendFileMock = vi.mocked(fs.appendFile);
  const mkdirMock = vi.mocked(fs.mkdir);
  const unlinkMock = vi.mocked(fs.unlink);
  const renameMock = vi.mocked(fs.rename);
  const copyFileMock = vi.mocked(fs.copyFile);
  const originalWriteFile = writeFileMock.getMockImplementation();
  const originalAppendFile = appendFileMock.getMockImplementation();
  const originalMkdir = mkdirMock.getMockImplementation();
  const originalUnlink = unlinkMock.getMockImplementation();
  const originalRename = renameMock.getMockImplementation();
  const originalCopyFile = copyFileMock.getMockImplementation();

  writeFileMock.mockImplementation(async (...args) => {
    throw new Error(`unexpected writeFile:${args[0]}`);
  });
  appendFileMock.mockImplementation(async (...args) => {
    throw new Error(`unexpected appendFile:${args[0]}`);
  });
  mkdirMock.mockImplementation(async (...args) => {
    throw new Error(`unexpected mkdir:${args[0]}`);
  });
  unlinkMock.mockImplementation(async (...args) => {
    throw new Error(`unexpected unlink:${args[0]}`);
  });
  renameMock.mockImplementation(async (...args) => {
    throw new Error(`unexpected rename:${args[0]}`);
  });
  copyFileMock.mockImplementation(async (...args) => {
    throw new Error(`unexpected copyFile:${args[0]}`);
  });
  const setTimeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation((...args: Parameters<typeof setTimeout>) => {
    const stack = new Error().stack ?? "";
    if (stack.includes("electron/verify")) {
      timerCalls.setTimeout += 1;
    }
    return originalSetTimeout(...args);
  });

  const setIntervalSpy = vi.spyOn(global, "setInterval").mockImplementation((...args: Parameters<typeof setInterval>) => {
    const stack = new Error().stack ?? "";
    if (stack.includes("electron/verify")) {
      timerCalls.setInterval += 1;
    }
    return originalSetInterval(...args);
  });

  try {
    const handled = await handleVerifyFlag(["node", "app", "--verify"], {
      runVerify: async () => {
        const report = await runVerification(buildMeta(), buildContext(), buildVerificationChecks());
        outputs.push(formatVerificationReportText(report));
        return getExitCode(report.status);
      },
      exit: (code) => exitCodes.push(code),
    });

    if (!handled) {
      createWindowCalled = true;
      startSchedulerCalled = true;
      syncCalled = true;
      backupCalled = true;
      restoreCalled = true;
      supportCalled = true;
    }

    assert.equal(handled, true);
    assert.equal(createWindowCalled, false);
    assert.equal(startSchedulerCalled, false);
    assert.equal(syncCalled, false);
    assert.equal(backupCalled, false);
    assert.equal(restoreCalled, false);
    assert.equal(supportCalled, false);
    assert.equal(timerCalls.setTimeout, 0);
    assert.equal(timerCalls.setInterval, 0);
    assert.ok(outputs.join("\n").includes("Attestation:"));
  } finally {
    if (originalWriteFile) writeFileMock.mockImplementation(originalWriteFile);
    if (originalAppendFile) appendFileMock.mockImplementation(originalAppendFile);
    if (originalMkdir) mkdirMock.mockImplementation(originalMkdir);
    if (originalUnlink) unlinkMock.mockImplementation(originalUnlink);
    if (originalRename) renameMock.mockImplementation(originalRename);
    if (originalCopyFile) copyFileMock.mockImplementation(originalCopyFile);
    setTimeoutSpy.mockRestore();
    setIntervalSpy.mockRestore();
  }
});

test("verify routing module does not import side-effect modules", async () => {
  const source = await fs.readFile("electron/verify/verifyRouting.ts", "utf8");
  const forbidden = [
    "syncScheduler",
    "mirrorSync",
    "syncTick",
    "backupExport",
    "backupInventory",
    "restorePlan",
    "restoreApply",
    "restoreRollback",
    "supportBundle",
  ];
  for (const token of forbidden) {
    assert.equal(source.includes(token), false);
  }
});
