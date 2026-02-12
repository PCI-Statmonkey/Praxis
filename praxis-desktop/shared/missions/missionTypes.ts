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
