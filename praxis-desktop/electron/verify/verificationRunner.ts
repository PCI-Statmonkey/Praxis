import type {
  VerificationCheck,
  VerificationCheckResult,
  VerificationContext,
  VerificationAttestation,
  VerificationMeta,
  VerificationReport,
  VerificationStatus,
} from "./verificationTypes";
import { buildVerificationChecks } from "./verificationChecks";

const summarizeCounts = (checks: VerificationCheckResult[]) => {
  return checks.reduce(
    (acc, check) => {
      if (check.status === "PASS") acc.pass += 1;
      if (check.status === "WARN") acc.warn += 1;
      if (check.status === "FAIL") acc.fail += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 }
  );
};

const deriveStatus = (counts: { pass: number; warn: number; fail: number }): VerificationStatus => {
  if (counts.fail > 0) return "FAIL";
  if (counts.warn > 0) return "WARN";
  return "PASS";
};

export const runVerification = async (
  meta: VerificationMeta,
  context: VerificationContext,
  checks: VerificationCheck[] = buildVerificationChecks()
): Promise<VerificationReport> => {
  const startedAt = Date.now();
  const results: VerificationCheckResult[] = [];
  for (const check of checks) {
    results.push(await check.run(meta, context));
  }
  const counts = summarizeCounts(results);
  const status = deriveStatus(counts);
  const durationMs = Date.now() - startedAt;
  return {
    meta,
    status,
    counts,
    checks: results,
    durationMs,
  };
};

export const getExitCode = (status: VerificationStatus) => {
  if (status === "PASS") return 0;
  if (status === "WARN") return 1;
  return 2;
};

const formatHeader = (meta: VerificationMeta) => {
  const build = meta.build ? `build ${meta.build}` : "build unknown";
  return `PRAXIS Verify - v${meta.version} (${build}) - ${meta.timestamp}`;
};

const resolveCheckStatus = (report: VerificationReport, id: string) =>
  report.checks.find((check) => check.id === id)?.status ?? "WARN";

const buildRiskFlags = (report: VerificationReport) => {
  const dbStatus = resolveCheckStatus(report, "db.readable_and_schema_ok");
  const mirrorStatus = resolveCheckStatus(report, "mirror.eventlog.readable");
  const backupStatus = resolveCheckStatus(report, "dr.backup_readiness");

  const dbLabel = dbStatus === "PASS" ? "DB: OK (PASS)" : `DB: ${dbStatus}`;
  const mirrorLabel =
    mirrorStatus === "WARN"
      ? "Mirror: NOT CONFIGURED (WARN)"
      : mirrorStatus === "PASS"
        ? "Mirror: OK (PASS)"
        : `Mirror: ${mirrorStatus}`;
  const backupLabel =
    backupStatus === "WARN"
      ? "Backups: NONE (WARN)"
      : backupStatus === "PASS"
        ? "Backups: OK (PASS)"
        : `Backups: ${backupStatus}`;

  return [dbLabel, mirrorLabel, backupLabel];
};

const buildAttestation = (report: VerificationReport): VerificationAttestation => ({
  timestamp: report.meta.timestamp,
  version: report.meta.version,
  build: report.meta.build,
  overallStatus: report.status,
  counts: report.counts,
  riskFlags: buildRiskFlags(report),
});

const formatAttestationText = (report: VerificationReport) => {
  const build = report.meta.build ? `build ${report.meta.build}` : "build unknown";
  const counts = `PASS=${report.counts.pass} WARN=${report.counts.warn} FAIL=${report.counts.fail}`;
  const attestation = [
    `Attestation: ${report.meta.timestamp} | v${report.meta.version} (${build}) | Overall=${report.status} | ${counts}`,
    `Risk flags: ${buildRiskFlags(report).join("; ")}`,
  ];
  return attestation.join("\n");
};

export const formatVerificationReportText = (report: VerificationReport) => {
  const lines: string[] = [];
  lines.push(formatHeader(report.meta));
  lines.push(`Summary: PASS=${report.counts.pass} WARN=${report.counts.warn} FAIL=${report.counts.fail}`);
  lines.push("");
  lines.push(formatAttestationText(report));
  lines.push("");
  for (const check of report.checks) {
    lines.push(`[${check.id}] ${check.status} - ${check.title}`);
    lines.push(`Evidence: ${check.evidence}`);
    if (check.remediation) {
      lines.push(`Remediation: ${check.remediation}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
};

export const formatVerificationReportJson = (report: VerificationReport) =>
  JSON.stringify({ ...report, attestation: buildAttestation(report) }, null, 2);
