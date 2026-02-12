import { describe, expect, test } from "vitest";
import { createRestoreService } from "./restoreService";

describe("restoreService", () => {
  test("getPlanPreview validates input path", async () => {
    const service = createRestoreService({
      restore: {
        buildPlanPreview: async () => ({
          conflicts: [],
          willOverwriteCount: 0,
          missingCount: 0,
          warnings: [],
        }),
      },
    });

    const result = await service.getPlanPreview("");
    expect(result.ok).toBe(false);
  });

  test("getPlanPreview returns preview details", async () => {
    const service = createRestoreService({
      restore: {
        buildPlanPreview: async () => ({
          conflicts: [{ path: "C:\\db.sqlite", reason: "exists" }],
          willOverwriteCount: 1,
          missingCount: 0,
          warnings: ["conflicts detected"],
        }),
      },
    });

    const result = await service.getPlanPreview("C:\\backup.zip");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.willOverwriteCount).toBe(1);
      expect(result.value.conflicts[0].path).toBe("C:\\db.sqlite");
    }
  });
});
