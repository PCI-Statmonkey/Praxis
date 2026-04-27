import { app } from "electron";
import { promises as fs } from "fs";
import path from "path";
import type { ChecklistEvent } from "../shared/persistence/checklistEvents";
import { replayChecklistEvents } from "../shared/persistence/checklistEvents";
import type { MasterChecklistState } from "../shared/persistence/masterChecklistTypes";

const EVENTS_FILENAME = "checklist.events.jsonl";
const SNAPSHOT_FILENAME = "checklist.snapshot.json";
const SNAPSHOT_TMP_FILENAME = "checklist.snapshot.json.tmp";

let writeQueue: Promise<void> = Promise.resolve();

export const getChecklistPaths = () => {
  const userData = app.getPath("userData");
  return {
    eventsPath: path.join(userData, EVENTS_FILENAME),
    snapshotPath: path.join(userData, SNAPSHOT_FILENAME),
    snapshotTmpPath: path.join(userData, SNAPSHOT_TMP_FILENAME),
  };
};

const enqueueWrite = (task: () => Promise<void>) => {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
};

export const appendChecklistEvent = async (event: ChecklistEvent): Promise<void> => {
  const { eventsPath } = getChecklistPaths();
  await enqueueWrite(async () => {
    const line = `${JSON.stringify(event)}\n`;
    await fs.appendFile(eventsPath, line, "utf8");
  });
};

export const readAllChecklistEvents = async (): Promise<ChecklistEvent[]> => {
  const { eventsPath } = getChecklistPaths();
  let content = "";
  try {
    content = await fs.readFile(eventsPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const events: ChecklistEvent[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as ChecklistEvent);
    } catch {
      // Skip invalid lines.
    }
  }
  return events;
};

export const readChecklistSnapshot = async (): Promise<{
  state: MasterChecklistState;
  lastEventIndex: number;
} | null> => {
  const { snapshotPath } = getChecklistPaths();
  try {
    const raw = await fs.readFile(snapshotPath, "utf8");
    const parsed = JSON.parse(raw) as { state: MasterChecklistState; lastEventIndex: number };
    if (!parsed || !Array.isArray(parsed.state) || typeof parsed.lastEventIndex !== "number") {
      return null;
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    return null;
  }
};

export const writeChecklistSnapshot = async (
  state: MasterChecklistState,
  lastEventIndex: number
): Promise<void> => {
  const { snapshotPath, snapshotTmpPath } = getChecklistPaths();
  const payload = JSON.stringify({ state, lastEventIndex });
  await fs.writeFile(snapshotTmpPath, payload, "utf8");
  await fs.rename(snapshotTmpPath, snapshotPath);
};

export const loadChecklistState = async (): Promise<{
  state: MasterChecklistState;
  lastEventIndex: number;
  eventCount: number;
}> => {
  const snapshot = await readChecklistSnapshot();
  const events = await readAllChecklistEvents();
  const baseState = snapshot?.state ?? [];
  const startIndex = snapshot?.lastEventIndex ?? 0;
  const safeStart = Math.min(Math.max(startIndex, 0), events.length);
  const state = replayChecklistEvents(baseState, events.slice(safeStart));

  return {
    state,
    lastEventIndex: events.length,
    eventCount: events.length,
  };
};
