import { promises as fs } from "fs";
import { BACKUP_EXPORT_FORMAT_VERSION, BACKUP_EXPORT_WARNING } from "../backupExport";

const MAX_REFERENCE_CHECKS = 25;

const readZipEntries = (buffer: Buffer) => {
  const sig = 0x06054b50;
  let eocdIndex = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === sig) {
      eocdIndex = i;
      break;
    }
  }
  if (eocdIndex === -1) throw new Error("zip_eocd_not_found");
  const cdSize = buffer.readUInt32LE(eocdIndex + 12);
  const cdOffset = buffer.readUInt32LE(eocdIndex + 16);
  const entries: { name: string; localHeaderOffset: number; uncompressedSize: number }[] = [];
  let offset = cdOffset;
  while (offset < cdOffset + cdSize) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("zip_central_dir_corrupt");
    }
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameStart = offset + 46;
    const name = buffer.slice(nameStart, nameStart + nameLen).toString("utf8");
    entries.push({ name, localHeaderOffset, uncompressedSize });
    offset = nameStart + nameLen + extraLen + commentLen;
  }
  return entries;
};

const readZipEntryData = (
  buffer: Buffer,
  entry: { localHeaderOffset: number; uncompressedSize: number }
) => {
  const localSig = buffer.readUInt32LE(entry.localHeaderOffset);
  if (localSig !== 0x04034b50) throw new Error("zip_local_header_corrupt");
  const nameLen = buffer.readUInt16LE(entry.localHeaderOffset + 26);
  const extraLen = buffer.readUInt16LE(entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + nameLen + extraLen;
  return buffer.slice(dataStart, dataStart + entry.uncompressedSize);
};

const readJsonEntry = (buffer: Buffer, entries: { name: string; localHeaderOffset: number; uncompressedSize: number }[], name: string) => {
  const entry = entries.find((item) => item.name === name);
  if (!entry) throw new Error(`missing_entry:${name}`);
  const data = readZipEntryData(buffer, entry);
  return JSON.parse(data.toString("utf8")) as Record<string, unknown>;
};

const validateManifest = (manifest: Record<string, unknown>) => {
  if (manifest.warning !== BACKUP_EXPORT_WARNING) throw new Error("manifest_warning_mismatch");
  const formatVersion = Number((manifest as { formatVersion?: unknown }).formatVersion ?? NaN);
  if (!Number.isFinite(formatVersion)) throw new Error("manifest_format_missing");
  const createdAt = (manifest as { createdAt?: unknown }).createdAt;
  if (typeof createdAt !== "string" || createdAt.length === 0) throw new Error("manifest_createdAt_missing");
  const contents = (manifest as { contents?: unknown }).contents;
  if (!Array.isArray(contents)) throw new Error("manifest_contents_missing");
  const checksums = (manifest as { checksums?: unknown }).checksums as { files?: unknown } | undefined;
  if (!checksums || !Array.isArray(checksums.files)) throw new Error("manifest_checksums_missing");
  return {
    formatVersion,
    createdAt,
    appVersion:
      typeof (manifest as { app?: { version?: unknown } }).app?.version === "string"
        ? ((manifest as { app?: { version?: string } }).app?.version ?? null)
        : null,
    appBuild:
      typeof (manifest as { app?: { build?: unknown } }).app?.build === "string"
        ? ((manifest as { app?: { build?: string } }).app?.build ?? null)
        : null,
    contentsCount: contents.length,
    contents,
  };
};

const validateInventory = (inventory: Record<string, unknown>) => {
  const warning = (inventory as { warning?: unknown }).warning;
  if (typeof warning !== "string" || warning.length === 0) throw new Error("inventory_warning_missing");
  const generatedAt = (inventory as { generatedAt?: unknown }).generatedAt;
  if (typeof generatedAt !== "string" || generatedAt.length === 0) throw new Error("inventory_generatedAt_missing");
  const statePaths = (inventory as { statePaths?: unknown }).statePaths;
  if (!Array.isArray(statePaths)) throw new Error("inventory_statePaths_missing");
};

const validateReferences = (
  entries: { name: string }[],
  manifestContents: Array<{ path?: unknown }>,
  maxChecks: number
) => {
  const names = new Set(entries.map((entry) => entry.name));
  const missing: string[] = [];
  const required: string[] = [
    "praxis-backup/manifest.json",
    "praxis-backup/inventory.json",
  ];
  const hasState = [...names].some((name) => name.startsWith("praxis-backup/state/"));
  const hasDb = [...names].some((name) => name.startsWith("praxis-backup/state/db/"));
  if (!hasState) required.push("praxis-backup/state/");
  if (!hasDb) required.push("praxis-backup/state/db/");
  for (const requiredPath of required) {
    if (!names.has(requiredPath) && requiredPath !== "praxis-backup/state/") {
      missing.push(requiredPath);
    }
  }
  if (!hasState) missing.push("praxis-backup/state/");
  if (!hasDb) missing.push("praxis-backup/state/db/");

  let checked = 0;
  for (const item of manifestContents) {
    if (checked >= maxChecks) break;
    const pathValue = typeof item.path === "string" ? item.path : null;
    if (!pathValue) continue;
    checked += 1;
    if (!names.has(pathValue)) {
      missing.push(pathValue);
    }
  }
  return { checkedCount: checked, missing };
};

export const inspectBackupArchive = async (archivePath: string) => {
  try {
    const buffer = await fs.readFile(archivePath);
    const entries = readZipEntries(buffer);
    const names = new Set(entries.map((entry) => entry.name));
    const hasManifest = names.has("praxis-backup/manifest.json");
    const hasInventory = names.has("praxis-backup/inventory.json");
    const hasState = [...names].some((name) => name.startsWith("praxis-backup/state/"));

    let formatVersion: number | undefined;
    let createdAt: string | undefined;
    let appVersion: string | null | undefined;
    let appBuild: string | null | undefined;
    let contentsCount: number | undefined;
    let checkedCount = 0;
    let missing: string[] = [];
    if (hasManifest) {
      const manifestData = readJsonEntry(buffer, entries, "praxis-backup/manifest.json");
      const validated = validateManifest(manifestData);
      formatVersion = validated.formatVersion;
      createdAt = validated.createdAt;
      appVersion = validated.appVersion;
      appBuild = validated.appBuild;
      contentsCount = validated.contentsCount;
      const referenceResult = validateReferences(entries, validated.contents as Array<{ path?: unknown }>, MAX_REFERENCE_CHECKS);
      checkedCount = referenceResult.checkedCount;
      missing = referenceResult.missing;
    }

    if (hasInventory) {
      const inventoryData = readJsonEntry(buffer, entries, "praxis-backup/inventory.json");
      validateInventory(inventoryData);
    }

    const formatMismatch =
      formatVersion !== undefined && formatVersion !== BACKUP_EXPORT_FORMAT_VERSION;
    return {
      ok: hasManifest && hasInventory && hasState && missing.length === 0 && !formatMismatch,
      formatVersion,
      createdAt,
      appVersion,
      appBuild,
      contentsCount,
      checkedCount,
      missingCount: missing.length,
      missingRequired: missing.filter((entry) =>
        entry === "praxis-backup/manifest.json" ||
        entry === "praxis-backup/inventory.json" ||
        entry === "praxis-backup/state/"
      ),
      error: formatMismatch
        ? `manifest_format_version_mismatch:${formatVersion}!=${BACKUP_EXPORT_FORMAT_VERSION}`
        : undefined,
      hasManifest,
      hasInventory,
      hasState,
    };
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    return { ok: false, hasManifest: false, hasInventory: false, hasState: false, error: message };
  }
};
