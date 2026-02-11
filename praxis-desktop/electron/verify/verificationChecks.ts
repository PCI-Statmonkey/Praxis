import path from "node:path";
import type {
  VerificationCheck,
  VerificationCheckResult,
  VerificationContext,
  VerificationMeta,
} from "./verificationTypes";

const buildResult = (
  id: string,
  title: string,
  status: VerificationCheckResult["status"],
  evidence: string,
  remediation?: string
): VerificationCheckResult => ({
  id,
  title,
  status,
  evidence,
  remediation,
});

const checkProcessInfo = (): VerificationCheck => ({
  id: "process.info",
  title: "Process & build info",
  run: async (meta: VerificationMeta, _context: VerificationContext) => {
    const hasVersion = Boolean(meta.version);
    if (!hasVersion) {
      return buildResult(
        "process.info",
        "Process & build info",
        "WARN",
        "App version unavailable",
        "Ensure the app build provides a version string."
      );
    }
    const buildLabel = meta.build ?? "unknown";
    return buildResult(
      "process.info",
      "Process & build info",
      "PASS",
      `version=${meta.version} build=${buildLabel} timestamp=${meta.timestamp}`
    );
  },
});

const checkDbReadableSchema = (): VerificationCheck => ({
  id: "db.readable_and_schema_ok",
  title: "Database readable & schema/migrations match",
  run: async (_meta: VerificationMeta, context: VerificationContext) => {
    const dbPath = context.getDbFilePath();
    const result = await context.readDbSchemaVersion(dbPath);
    const policyNote = context.dbPolicy === "A" ? "policy=A (no new files)" : "policy=B (WAL/SHM ok)";
    if (!result.ok) {
      return buildResult(
        "db.readable_and_schema_ok",
        "Database readable & schema/migrations match",
        "FAIL",
        `DB unreadable at ${dbPath} (${result.error ?? "unknown"}) [read-only, ${policyNote}]`,
        "Ensure the DB exists and is readable by the app."
      );
    }
    const expected = context.expectedSchemaVersion;
    const actual = result.schemaVersion;
    if (actual !== expected) {
      return buildResult(
        "db.readable_and_schema_ok",
        "Database readable & schema/migrations match",
        "FAIL",
        `schema_version=${actual ?? "unknown"} expected=${expected} [read-only, ${policyNote}]`,
        "Use a compatible app build or restore a matching backup."
      );
    }
    return buildResult(
      "db.readable_and_schema_ok",
      "Database readable & schema/migrations match",
      "PASS",
      `DB readable at ${dbPath}; schema_version=${actual} expected=${expected} [read-only, ${policyNote}]`
    );
  },
});

const parseMirrorConfig = async (context: VerificationContext, configPath: string) => {
  const stat = await context.statPath(configPath);
  if (!stat.exists || !stat.isFile) {
    return { exists: false, ok: true, mirrorRoot: null as string | null };
  }
  try {
    const raw = await context.readTextFile(configPath);
    const parsed = JSON.parse(raw) as { mirrorRoot?: unknown };
    const mirrorRoot =
      typeof parsed?.mirrorRoot === "string" && parsed.mirrorRoot.trim().length > 0
        ? parsed.mirrorRoot.trim()
        : null;
    return { exists: true, ok: true, mirrorRoot };
  } catch (error) {
    return { exists: true, ok: false, mirrorRoot: null, error: (error as Error).message ?? String(error) };
  }
};

const summarizeHeadRecord = (line: string) => {
  try {
    const parsed = JSON.parse(line) as Record<string, unknown>;
    const type = typeof parsed.type === "string" ? parsed.type : undefined;
    const ts = typeof parsed.ts === "string" ? parsed.ts : undefined;
    const eventId = typeof parsed.event_id === "string" ? parsed.event_id : undefined;
    const parts = [
      type ? `type=${type}` : undefined,
      ts ? `ts=${ts}` : undefined,
      eventId ? `event_id=${eventId}` : undefined,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "head parsed";
  } catch {
    return null;
  }
};

const checkMirrorEventlog = (): VerificationCheck => ({
  id: "mirror.eventlog.readable",
  title: "Mirror configured & event log readable",
  run: async (_meta: VerificationMeta, context: VerificationContext) => {
    const configPath = context.getMirrorConfigPath();
    const configResult = await parseMirrorConfig(context, configPath);
    const mirrorRoot = await context.getMirrorRoot();

    if (!mirrorRoot) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "WARN",
        `Mirror not configured (config ${configResult.exists ? "present" : "missing"} at ${configPath})`
      );
    }

    if (configResult.exists && !configResult.ok) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "FAIL",
        `Mirror config unreadable at ${configPath}`,
        "Fix or replace the mirror config JSON."
      );
    }

    const rootStat = await context.statPath(mirrorRoot);
    if (!rootStat.exists || !rootStat.isDirectory) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "FAIL",
        `Mirror root not readable as directory: ${mirrorRoot}`
      );
    }

    const eventlogDir = path.join(mirrorRoot, "eventlog");
    const eventlogStat = await context.statPath(eventlogDir);
    if (!eventlogStat.exists || !eventlogStat.isDirectory) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "FAIL",
        `Event log directory missing: ${eventlogDir}`
      );
    }

    const entries = await context.listDir(eventlogDir);
    const logFiles = entries.filter((entry) => entry.toLowerCase().endsWith(".jsonl"));
    if (logFiles.length === 0) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "WARN",
        `Event log directory empty: ${eventlogDir}`
      );
    }

    let newest: { path: string; mtimeMs: number } | null = null;
    for (const entry of logFiles) {
      const fullPath = path.join(eventlogDir, entry);
      const stat = await context.statPath(fullPath);
      const mtime = stat.mtimeMs ?? 0;
      if (!newest || mtime > newest.mtimeMs) {
        newest = { path: fullPath, mtimeMs: mtime };
      }
    }

    const targetPath = newest?.path ?? path.join(eventlogDir, logFiles[0]);
    const tail = await context.readTailLine(targetPath, 64 * 1024);
    if (!tail.ok || !tail.line) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "FAIL",
        `Event log head unreadable at ${targetPath} (${tail.error ?? "empty"})`
      );
    }
    const summary = summarizeHeadRecord(tail.line);
    if (!summary) {
      return buildResult(
        "mirror.eventlog.readable",
        "Mirror configured & event log readable",
        "FAIL",
        `Event log head invalid JSON at ${targetPath}`
      );
    }

    return buildResult(
      "mirror.eventlog.readable",
      "Mirror configured & event log readable",
      "PASS",
      `Mirror root=${mirrorRoot}; eventlog=${eventlogDir}; head=${summary}`
    );
  },
});

const checkBackupReadiness = (): VerificationCheck => ({
  id: "dr.backup_readiness",
  title: "Backup artifacts present & parseable (dry readiness)",
  run: async (meta: VerificationMeta, context: VerificationContext) => {
    const root = context.getAppDataRoot();
    const archives = await context.listBackupArchives(root);
    if (archives.length === 0) {
      return buildResult(
        "dr.backup_readiness",
        "Backup artifacts present & parseable (dry readiness)",
        "WARN",
        `No backup archives detected under ${root}`
      );
    }

    let latest = archives[0]!;
    let latestMtime = -1;
    for (const archive of archives) {
      const stat = await context.statPath(archive);
      const mtime = stat.mtimeMs ?? 0;
      if (mtime > latestMtime) {
        latestMtime = mtime;
        latest = archive;
      }
    }

    const inspection = await context.inspectBackupArchive(latest);
    if (!inspection.ok) {
      return buildResult(
        "dr.backup_readiness",
        "Backup artifacts present & parseable (dry readiness)",
        "FAIL",
        `Backup manifest unreadable in ${latest} (${inspection.error ?? "invalid"})`
      );
    }

    const missingCount = inspection.missingCount ?? 0;
    if (missingCount > 0) {
      return buildResult(
        "dr.backup_readiness",
        "Backup artifacts present & parseable (dry readiness)",
        "FAIL",
        `Backup manifest references ${missingCount} missing entries in ${latest}`
      );
    }

    const formatVersion = inspection.formatVersion ?? "unknown";
    const createdAt = inspection.createdAt ?? "unknown";
    const contentsCount = inspection.contentsCount ?? 0;
    const checkedCount = inspection.checkedCount ?? 0;
    const appVersion = inspection.appVersion ?? "unknown";
    const versionNote = `manifest app=${appVersion} current=${meta.version}`;

    if (inspection.appVersion && inspection.appVersion !== meta.version) {
      return buildResult(
        "dr.backup_readiness",
        "Backup artifacts present & parseable (dry readiness)",
        "WARN",
        `Backup manifest version mismatch (${versionNote}); format=${formatVersion} createdAt=${createdAt} files=${contentsCount} checked=${checkedCount}`
      );
    }

    if (!inspection.appVersion) {
      return buildResult(
        "dr.backup_readiness",
        "Backup artifacts present & parseable (dry readiness)",
        "WARN",
        `Backup manifest missing app version (${versionNote}); format=${formatVersion} createdAt=${createdAt} files=${contentsCount} checked=${checkedCount}`
      );
    }

    return buildResult(
      "dr.backup_readiness",
      "Backup artifacts present & parseable (dry readiness)",
      "PASS",
      `Backup manifest OK (${versionNote}); format=${formatVersion} createdAt=${createdAt} files=${contentsCount} checked=${checkedCount}`
    );
  },
});

export const buildVerificationChecks = (): VerificationCheck[] => [
  checkProcessInfo(),
  checkDbReadableSchema(),
  checkMirrorEventlog(),
  checkBackupReadiness(),
];
