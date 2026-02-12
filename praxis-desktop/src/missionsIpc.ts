export type MissionStatus = "active" | "archived";

export type Mission = {
  id: string;
  title: string;
  description?: string;
  status: MissionStatus;
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  tags?: string[] | null;
};

export type MissionCreateInput = {
  title: string;
  description?: string;
  dueAt?: string | null;
  tags?: string[] | null;
};

export type MissionUpdatePatch = {
  title?: string;
  description?: string;
  dueAt?: string | null;
  tags?: string[] | null;
};

export type MissionApi = {
  missionsList: (includeArchived?: boolean) => Promise<unknown>;
  missionsGet: (id: string) => Promise<unknown>;
  missionsCreate: (input: MissionCreateInput) => Promise<unknown>;
  missionsUpdate: (id: string, patch: MissionUpdatePatch) => Promise<unknown>;
  missionsArchive: (id: string) => Promise<unknown>;
};

const getPraxis = (): MissionApi => {
  const api = (window as unknown as { praxis?: MissionApi }).praxis;
  if (!api) {
    throw new Error("praxis API unavailable");
  }
  return api;
};

export const callMissionsList = (includeArchived?: boolean) =>
  getPraxis().missionsList(includeArchived);
export const callMissionsGet = (id: string) => getPraxis().missionsGet(id);
export const callMissionsCreate = (input: MissionCreateInput) => getPraxis().missionsCreate(input);
export const callMissionsUpdate = (id: string, patch: MissionUpdatePatch) =>
  getPraxis().missionsUpdate(id, patch);
export const callMissionsArchive = (id: string) => getPraxis().missionsArchive(id);
