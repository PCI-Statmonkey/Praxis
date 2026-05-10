import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RainmeterSnapshotExportResult } from "../shared/rainmeterSnapshot";
import { buildRainmeterSnapshot } from "../shared/rainmeterSnapshot";
import { getCompanionSnapshot } from "./companionSnapshot";
import { resolveMemoryRoot } from "./praxisDb";
import { getPresenceSettings } from "./settingsRepository";
import { getTimeBlockSnapshot } from "./timeBlockRepository";

const rainmeterRelativePath = path.join("runtime", "rainmeter", "praxis-snapshot.json");

const localDayRange = (now: Date) => {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
};

export const writeRainmeterSnapshot = (): RainmeterSnapshotExportResult => {
  const now = new Date();
  const dayRange = localDayRange(now);
  const localBlocksToday = getTimeBlockSnapshot(dayRange).timeBlocks.filter(
    (block) => block.status !== "canceled"
  ).length;
  const snapshot = buildRainmeterSnapshot({
    companionSnapshot: getCompanionSnapshot(),
    presence: getPresenceSettings(),
    localBlocksToday,
    now,
  });
  const outputPath = path.join(resolveMemoryRoot(), rainmeterRelativePath);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return {
    ok: true,
    path: outputPath,
    snapshot,
  };
};
