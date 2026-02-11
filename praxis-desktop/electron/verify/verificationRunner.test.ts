import assert from "node:assert/strict";
import { test, vi } from "vitest";
import * as fs from "node:fs/promises";
import { buildVerificationChecks } from "./verificationChecks";
import { formatVerificationReportJson, formatVerificationReportText, getExitCode, runVerification } from "./verificationRunner";
import type { VerificationContext, VerificationMeta } from "./verificationTypes";

vi.mock("node:fs/promises", async () => {
  const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
  return {
    ...actual,
    writeFile: vi.fn(actual.writeFile),
    appendFile: vi.fn(actual.appendFile),
    mkdir: vi.fn(actual.mkdir),
    unlink: vi.fn(actual.unlink),
  };
});

test("exit codes map to status", () => {
  assert.equal(getExitCode("PASS"), 0);
  assert.equal(getExitCode("WARN"), 1);
  assert.equal(getExitCode("FAIL"), 2);
});

test("verification runner performs no filesystem writes", async () => {
  let writeCalls = 0;

  const writeFileMock = vi.mocked(fs.writeFile);
  const appendFileMock = vi.mocked(fs.appendFile);
  const mkdirMock = vi.mocked(fs.mkdir);
  const unlinkMock = vi.mocked(fs.unlink);
  const originalWriteFile = writeFileMock.getMockImplementation();
  const originalAppendFile = appendFileMock.getMockImplementation();
  const originalMkdir = mkdirMock.getMockImplementation();
  const originalUnlink = unlinkMock.getMockImplementation();

  writeFileMock.mockImplementation(async (...args) => {
    writeCalls += 1;
    throw new Error(`unexpected writeFile:${args[0]}`);
  });
  appendFileMock.mockImplementation(async (...args) => {
    writeCalls += 1;
    throw new Error(`unexpected appendFile:${args[0]}`);
  });
  mkdirMock.mockImplementation(async (...args) => {
    writeCalls += 1;
    throw new Error(`unexpected mkdir:${args[0]}`);
  });
  unlinkMock.mockImplementation(async (...args) => {
    writeCalls += 1;
    throw new Error(`unexpected unlink:${args[0]}`);
  });

  try {
    const meta: VerificationMeta = {
      appName: "PRAXIS",
      version: "0.0.0",
      build: null,
      timestamp: "2026-02-06T00:00:00.000Z",
    };
    const context: VerificationContext = {
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
    };
    const report = await runVerification(meta, context, buildVerificationChecks());
    assert.equal(report.status, "WARN");
    assert.equal(writeCalls, 0);
  } finally {
    if (originalWriteFile) writeFileMock.mockImplementation(originalWriteFile);
    if (originalAppendFile) appendFileMock.mockImplementation(originalAppendFile);
    if (originalMkdir) mkdirMock.mockImplementation(originalMkdir);
    if (originalUnlink) unlinkMock.mockImplementation(originalUnlink);
  }
});

test("attestation is printed before per-check blocks", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const text = formatVerificationReportText(report);
  const attestationIndex = text.indexOf("Attestation:");
  const firstCheckIndex = text.indexOf("[process.info]");
  assert.ok(attestationIndex >= 0);
  assert.ok(firstCheckIndex > attestationIndex);
});

test("attestation is included in JSON output with stable fields", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const json = JSON.parse(formatVerificationReportJson(report)) as {
    attestation: {
      timestamp: string;
      version: string;
      build: string | null;
      overallStatus: string;
      counts: { pass: number; warn: number; fail: number };
      riskFlags: string[];
    };
    checks: Array<{ id: string }>;
  };
  assert.equal(json.attestation.timestamp, meta.timestamp);
  assert.equal(json.attestation.version, meta.version);
  assert.equal(json.attestation.build, meta.build);
  assert.equal(json.attestation.overallStatus, report.status);
  assert.equal(json.attestation.counts.pass, report.counts.pass);
  assert.equal(json.attestation.counts.warn, report.counts.warn);
  assert.equal(json.attestation.counts.fail, report.counts.fail);
  assert.ok(Array.isArray(json.attestation.riskFlags));
  assert.deepEqual(
    json.checks.map((check) => check.id),
    report.checks.map((check) => check.id)
  );
});

test("db check passes when schema matches expected", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const dbCheck = report.checks.find((check) => check.id === "db.readable_and_schema_ok");
  assert.equal(dbCheck?.status, "PASS");
});

test("db check fails when DB is missing/unreadable", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
    expectedSchemaVersion: 1,
    dbPolicy: "A",
    getDbFilePath: () => "/app/eventlog.sqlite",
    readDbSchemaVersion: async () => ({ ok: false, error: "db_missing" }),
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const dbCheck = report.checks.find((check) => check.id === "db.readable_and_schema_ok");
  assert.equal(dbCheck?.status, "FAIL");
});

test("db check fails when schema mismatches expected", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
    expectedSchemaVersion: 2,
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const dbCheck = report.checks.find((check) => check.id === "db.readable_and_schema_ok");
  assert.equal(dbCheck?.status, "FAIL");
});

test("mirror check passes when configured and head readable", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
    expectedSchemaVersion: 1,
    dbPolicy: "A",
    getDbFilePath: () => "/app/eventlog.sqlite",
    readDbSchemaVersion: async () => ({ ok: true, schemaVersion: 1, driver: "mock" }),
    getMirrorRoot: async () => "/mirror",
    getMirrorConfigPath: () => "/app/config.json",
    statPath: async (targetPath: string) => {
      const normalized = targetPath.replaceAll("\\", "/");
      if (normalized === "/app/config.json") {
        return { exists: true, isFile: true, isDirectory: false, size: 12 };
      }
      if (normalized === "/mirror") {
        return { exists: true, isFile: false, isDirectory: true, size: 0, mtimeMs: 10 };
      }
      if (normalized === "/mirror/eventlog") {
        return { exists: true, isFile: false, isDirectory: true, size: 0, mtimeMs: 20 };
      }
      if (normalized === "/mirror/eventlog/device.jsonl") {
        return { exists: true, isFile: true, isDirectory: false, size: 100, mtimeMs: 30 };
      }
      return { exists: false, isFile: false, isDirectory: false, size: 0 };
    },
    readTextFile: async () => "{\"mirrorRoot\":\"/mirror\"}",
    listDir: async () => ["device.jsonl"],
    readTailLine: async () => ({
      ok: true,
      line: "{\"type\":\"ITEM_CREATED\",\"ts\":\"2026-02-06T00:00:00Z\",\"event_id\":\"abc\"}",
      size: 100,
    }),
    getAppDataRoot: () => "/app",
    listBackupArchives: async () => [],
    inspectBackupArchive: async () => ({ ok: true }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const mirrorCheck = report.checks.find((check) => check.id === "mirror.eventlog.readable");
  assert.equal(mirrorCheck?.status, "PASS");
});

test("mirror check warns when mirror not configured", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const mirrorCheck = report.checks.find((check) => check.id === "mirror.eventlog.readable");
  assert.equal(mirrorCheck?.status, "WARN");
});

test("mirror check fails when mirror root missing", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
    expectedSchemaVersion: 1,
    dbPolicy: "A",
    getDbFilePath: () => "/app/eventlog.sqlite",
    readDbSchemaVersion: async () => ({ ok: true, schemaVersion: 1, driver: "mock" }),
    getMirrorRoot: async () => "/mirror",
    getMirrorConfigPath: () => "/app/config.json",
    statPath: async (targetPath: string) => {
      if (targetPath === "/app/config.json") {
        return { exists: true, isFile: true, isDirectory: false, size: 12 };
      }
      return { exists: false, isFile: false, isDirectory: false, size: 0 };
    },
    readTextFile: async () => "{\"mirrorRoot\":\"/mirror\"}",
    listDir: async () => [],
    readTailLine: async () => ({ ok: true, line: null, size: 0 }),
    getAppDataRoot: () => "/app",
    listBackupArchives: async () => [],
    inspectBackupArchive: async () => ({ ok: true }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const mirrorCheck = report.checks.find((check) => check.id === "mirror.eventlog.readable");
  assert.equal(mirrorCheck?.status, "FAIL");
});

test("mirror check fails when event log dir missing", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
    expectedSchemaVersion: 1,
    dbPolicy: "A",
    getDbFilePath: () => "/app/eventlog.sqlite",
    readDbSchemaVersion: async () => ({ ok: true, schemaVersion: 1, driver: "mock" }),
    getMirrorRoot: async () => "/mirror",
    getMirrorConfigPath: () => "/app/config.json",
    statPath: async (targetPath: string) => {
      if (targetPath === "/app/config.json") {
        return { exists: true, isFile: true, isDirectory: false, size: 12 };
      }
      if (targetPath === "/mirror") {
        return { exists: true, isFile: false, isDirectory: true, size: 0 };
      }
      return { exists: false, isFile: false, isDirectory: false, size: 0 };
    },
    readTextFile: async () => "{\"mirrorRoot\":\"/mirror\"}",
    listDir: async () => [],
    readTailLine: async () => ({ ok: true, line: null, size: 0 }),
    getAppDataRoot: () => "/app",
    listBackupArchives: async () => [],
    inspectBackupArchive: async () => ({ ok: true }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const mirrorCheck = report.checks.find((check) => check.id === "mirror.eventlog.readable");
  assert.equal(mirrorCheck?.status, "FAIL");
});

test("mirror check fails when head marker unreadable", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
    expectedSchemaVersion: 1,
    dbPolicy: "A",
    getDbFilePath: () => "/app/eventlog.sqlite",
    readDbSchemaVersion: async () => ({ ok: true, schemaVersion: 1, driver: "mock" }),
    getMirrorRoot: async () => "/mirror",
    getMirrorConfigPath: () => "/app/config.json",
    statPath: async (targetPath: string) => {
      if (targetPath === "/app/config.json") {
        return { exists: true, isFile: true, isDirectory: false, size: 12 };
      }
      if (targetPath === "/mirror") {
        return { exists: true, isFile: false, isDirectory: true, size: 0, mtimeMs: 10 };
      }
      if (targetPath === "/mirror/eventlog") {
        return { exists: true, isFile: false, isDirectory: true, size: 0, mtimeMs: 20 };
      }
      if (targetPath === "/mirror/eventlog/device.jsonl") {
        return { exists: true, isFile: true, isDirectory: false, size: 100, mtimeMs: 30 };
      }
      return { exists: false, isFile: false, isDirectory: false, size: 0 };
    },
    readTextFile: async () => "{\"mirrorRoot\":\"/mirror\"}",
    listDir: async () => ["device.jsonl"],
    readTailLine: async () => ({ ok: false, line: null, size: 0, error: "read_failed" }),
    getAppDataRoot: () => "/app",
    listBackupArchives: async () => [],
    inspectBackupArchive: async () => ({ ok: true }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const mirrorCheck = report.checks.find((check) => check.id === "mirror.eventlog.readable");
  assert.equal(mirrorCheck?.status, "FAIL");
});

test("backup readiness warns when no backups found", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const backupCheck = report.checks.find((check) => check.id === "dr.backup_readiness");
  assert.equal(backupCheck?.status, "WARN");
});

test("backup readiness fails when manifest unreadable", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
    listBackupArchives: async () => ["/app/praxis-backup-20260101-000000.zip"],
    inspectBackupArchive: async () => ({ ok: false, error: "corrupt" }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const backupCheck = report.checks.find((check) => check.id === "dr.backup_readiness");
  assert.equal(backupCheck?.status, "FAIL");
});

test("backup readiness fails when manifest references missing artifacts", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
    listBackupArchives: async () => ["/app/praxis-backup-20260101-000000.zip"],
    inspectBackupArchive: async () => ({
      ok: true,
      formatVersion: 1,
      createdAt: "2026-02-01T00:00:00Z",
      appVersion: "0.0.0",
      contentsCount: 3,
      checkedCount: 3,
      missingCount: 1,
      missingRequired: ["praxis-backup/manifest.json"],
    }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const backupCheck = report.checks.find((check) => check.id === "dr.backup_readiness");
  assert.equal(backupCheck?.status, "FAIL");
});

test("backup readiness passes when manifest is parseable and references are present", async () => {
  const meta: VerificationMeta = {
    appName: "PRAXIS",
    version: "0.0.0",
    build: null,
    timestamp: "2026-02-06T00:00:00.000Z",
  };
  const context: VerificationContext = {
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
    listBackupArchives: async () => ["/app/praxis-backup-20260101-000000.zip"],
    inspectBackupArchive: async () => ({
      ok: true,
      formatVersion: 1,
      createdAt: "2026-02-01T00:00:00Z",
      appVersion: "0.0.0",
      contentsCount: 3,
      checkedCount: 3,
      missingCount: 0,
      missingRequired: [],
    }),
  };
  const report = await runVerification(meta, context, buildVerificationChecks());
  const backupCheck = report.checks.find((check) => check.id === "dr.backup_readiness");
  assert.equal(backupCheck?.status, "PASS");
});
