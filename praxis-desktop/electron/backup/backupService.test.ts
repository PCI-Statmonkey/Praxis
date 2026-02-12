import { describe, expect, test } from "vitest";
import { createBackupService } from "./backupService";

describe("backupService", () => {
  test("getInventoryPreview returns scope + paths", async () => {
    const service = createBackupService({
      inventory: {
        buildPreview: async () => ({
          items: [{ category: "db", path: "C:\\db.sqlite", exists: true, sizeBytes: 12 }],
          warnings: [],
        }),
      },
    });

    const result = await service.getInventoryPreview();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items[0].category).toBe("db");
    }
  });
});
