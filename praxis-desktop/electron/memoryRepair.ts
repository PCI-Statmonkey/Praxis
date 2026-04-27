import type { MemoryMirrorRepairReport, MemoryRepairReport } from "../shared/storage/hybridStorage";
import {
  getStorageOverview,
  repairMemoryDocumentIndex,
} from "./praxisDb";
import {
  writeAppointmentsSummaryMarkdown,
  writeDeadlinesSummaryMarkdown,
  writeMissionMarkdown,
  writePersonMarkdown,
  writeProjectMarkdown,
  writeTodosSummaryMarkdown,
} from "./memoryWriter";
import { getWorkSnapshot } from "./workRepository";

const repairMemoryMirrors = (): MemoryMirrorRepairReport => {
  const snapshot = getWorkSnapshot();
  const missionTitleById = new Map(snapshot.missions.map((mission) => [mission.id, mission.title]));

  for (const mission of snapshot.missions) {
    writeMissionMarkdown(mission);
  }
  for (const project of snapshot.projects) {
    writeProjectMarkdown(project, project.missionId ? missionTitleById.get(project.missionId) ?? null : null);
  }
  for (const person of snapshot.people) {
    writePersonMarkdown(person);
  }

  writeTodosSummaryMarkdown(snapshot.todos);
  writeDeadlinesSummaryMarkdown(snapshot.deadlines);
  writeAppointmentsSummaryMarkdown(snapshot.appointments);

  return {
    missionDocumentsWritten: snapshot.missions.length,
    projectDocumentsWritten: snapshot.projects.length,
    personDocumentsWritten: snapshot.people.length,
    summaryDocumentsWritten: 3,
  };
};

export const repairMemorySystem = (): MemoryRepairReport => {
  const mirrors = repairMemoryMirrors();
  const index = repairMemoryDocumentIndex();
  const overview = getStorageOverview();
  return {
    ok: true,
    repairedAt: new Date().toISOString(),
    databasePath: overview.databasePath,
    index,
    mirrors,
  };
};
