import { app } from "electron";
import {
  formatVerificationReportJson,
  formatVerificationReportText,
  getExitCode,
  runVerification,
} from "./verificationRunner";
import { promises as fs } from "fs";
import path from "node:path";
import { getAppDataRoot } from "../appPaths";
import { getMirrorConfigPath, getMirrorRoot } from "../persistence/mirrorConfig";
import { getDbFilePath, DB_SCHEMA_VERSION } from "../persistence/sqliteEventLog";
import { inspectBackupArchive } from "./backupInspector";
import { readDbSchemaVersion } from "./readOnlySqlite";
import type { VerificationContext, VerificationMeta } from "./verificationTypes";

const buildMeta = (): VerificationMeta => ({
  appName: app.getName(),
  version: app.getVersion(),
  build: process.env.PRAXIS_BUILD_ID ?? null,
  timestamp: new Date().toISOString(),
});

const statPath = async (targetPath: string) => {
  try {
    const stat = await fs.stat(targetPath);
    return {
      exists: true,
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === "ENOENT") {
      return { exists: false, isFile: false, isDirectory: false, size: 0 };
    }
    throw error;
  }
};

const readTextFile = async (targetPath: string) => fs.readFile(targetPath, "utf8");

const listDir = async (targetPath: string) => fs.readdir(targetPath);

const readTailLine = async (targetPath: string, maxBytes: number) => {
  try {
    const handle = await fs.open(targetPath, "r");
    try {
      const stat = await handle.stat();
      const size = stat.size;
      if (size === 0) {
        return { ok: true, line: null, size };
      }
      const chunkSize = Math.min(size, maxBytes);
      const buffer = Buffer.alloc(chunkSize);
      await handle.read(buffer, 0, chunkSize, size - chunkSize);
      const content = buffer.toString("utf8");
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const lastLine = lines[lines.length - 1] ?? null;
      return { ok: true, line: lastLine, size };
    } finally {
      await handle.close();
    }
  } catch (error) {
    return { ok: false, line: null, size: 0, error: (error as Error).message ?? String(error) };
  }
};

const listBackupArchives = async (rootPath: string) => {
  try {
    const entries = await fs.readdir(rootPath);
    return entries
      .filter((entry) => entry.startsWith("praxis-backup-") && entry.endsWith(".zip"))
      .map((entry) => path.join(rootPath, entry));
  } catch {
    return [];
  }
};

export const runVerifyCommand = async (options: { json?: boolean }) => {
  const meta = buildMeta();
  const context: VerificationContext = {
    expectedSchemaVersion: DB_SCHEMA_VERSION,
    dbPolicy: "A",
    getDbFilePath,
    readDbSchemaVersion,
    getMirrorRoot,
    getMirrorConfigPath,
    statPath,
    readTextFile,
    listDir,
    readTailLine,
    getAppDataRoot,
    listBackupArchives,
    inspectBackupArchive,
  };
  const report = await runVerification(meta, context);
  const output = options.json
    ? formatVerificationReportJson(report)
    : formatVerificationReportText(report);
  console.log(output);
  return getExitCode(report.status);
};
