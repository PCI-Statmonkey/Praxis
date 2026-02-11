export type VerificationStatus = "PASS" | "WARN" | "FAIL";

export type VerificationCheckResult = {
  id: string;
  title: string;
  status: VerificationStatus;
  evidence: string;
  remediation?: string;
};

export type VerificationCounts = {
  pass: number;
  warn: number;
  fail: number;
};

export type VerificationMeta = {
  appName: string;
  version: string;
  build: string | null;
  timestamp: string;
};

export type VerificationReport = {
  meta: VerificationMeta;
  status: VerificationStatus;
  counts: VerificationCounts;
  checks: VerificationCheckResult[];
  durationMs: number;
};

export type VerificationAttestation = {
  timestamp: string;
  version: string;
  build: string | null;
  overallStatus: VerificationStatus;
  counts: VerificationCounts;
  riskFlags: string[];
};

export type VerificationContext = {
  expectedSchemaVersion: number;
  dbPolicy: "A" | "B";
  getDbFilePath: () => string;
  readDbSchemaVersion: (dbPath: string) => Promise<{
    ok: boolean;
    schemaVersion?: number;
    driver?: string;
    error?: string;
  }>;
  getMirrorRoot: () => Promise<string | null>;
  getMirrorConfigPath: () => string;
  statPath: (targetPath: string) => Promise<{
    exists: boolean;
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    mtimeMs?: number;
  }>;
  readTextFile: (targetPath: string) => Promise<string>;
  listDir: (targetPath: string) => Promise<string[]>;
  readTailLine: (targetPath: string, maxBytes: number) => Promise<{
    ok: boolean;
    line: string | null;
    size: number;
    error?: string;
  }>;
  getAppDataRoot: () => string;
  listBackupArchives: (rootPath: string) => Promise<string[]>;
  inspectBackupArchive: (archivePath: string) => Promise<{
    ok: boolean;
    formatVersion?: number;
    createdAt?: string;
    appVersion?: string | null;
    appBuild?: string | null;
    contentsCount?: number;
    checkedCount?: number;
    missingCount?: number;
    missingRequired?: string[];
    error?: string;
  }>;
};

export type VerificationCheck = {
  id: string;
  title: string;
  run: (meta: VerificationMeta, context: VerificationContext) => Promise<VerificationCheckResult>;
};
