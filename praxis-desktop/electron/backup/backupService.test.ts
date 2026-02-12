import { describe, expect, test } from "vitest";
import { createBackupService } from "./backupService";
import type { BackupInventoryPreview, RestorePlanPreview } from "../../shared/backup/backupTypes";

describe("backupService", () => {
  test("getInventoryPreview returns scope + paths", async () => {
    const service = createBackupService({
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
      inventory: {
        getScopeSummary: () => ({ includes: ["db", "config"] }),
        getStatePaths: async () => [
          { label: "db", path: "C:\\db.sqlite", exists: true, type: "file" },
        ],
      },
      restore: {
        getPlanPreview: async () => ({
          summary: { files: 0, dirs: 0, conflicts: 0 },
          conflicts: [],
        }),
      },
    });

    const result = await service.getInventoryPreview();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.scope.includes).toContain("db");
      expect(result.value.generatedAt).toBe("2026-02-12T00:00:00.000Z");
    }
  });

  test("getRestorePlanPreview validates path", async () => {
    const service = createBackupService({
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
      inventory: {
        getScopeSummary: () => ({ includes: [] }),
        getStatePaths: async () => [],
      },
      restore: {
        getPlanPreview: async () => ({
          summary: { files: 0, dirs: 0, conflicts: 0 },
          conflicts: [],
        }),
      },
    });

    const result = await service.getRestorePlanPreview("");
    expect(result.ok).toBe(false);
  });

  test("getRestorePlanPreview returns preview details", async () => {
    const service = createBackupService({
      clock: { now: () => "2026-02-12T00:00:00.000Z" },
      inventory: {
        getScopeSummary: () => ({ includes: [] }),
        getStatePaths: async () => [],
      },
      restore: {
        getPlanPreview: async () => ({
          summary: { files: 2, dirs: 1, conflicts: 1 },
          conflicts: [{ path: "C:\\db.sqlite", reason: "exists" }],
        }),
      },
    });

    const result = await service.getRestorePlanPreview("C:\\backup.zip");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.backupZipPath).toBe("C:\\backup.zip");
      expect(result.value.summary.conflicts).toBe(1);
    }
  });
});
