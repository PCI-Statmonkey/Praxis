import crypto from "node:crypto";
import type { Mission, MissionCreateInput, MissionUpdatePatch } from "../../shared/missions/missionTypes";
import type { MissionStore } from "../persistence/missionStore";

type Clock = {
  now: () => string;
};

type Deps = {
  store: MissionStore;
  clock: Clock;
  generateId?: () => string;
};

export type MissionService = {
  list: (includeArchived?: boolean) => Promise<Mission[]>;
  get: (id: string) => Promise<Mission | null>;
  create: (input: MissionCreateInput) => Promise<Mission>;
  update: (id: string, patch: MissionUpdatePatch) => Promise<Mission | null>;
  archive: (id: string) => Promise<Mission | null>;
  unarchive: (id: string) => Promise<Mission | null>;
};

const requireTitle = (title: string) => {
  if (!title || typeof title !== "string" || !title.trim()) {
    throw new Error("mission_title_required");
  }
};

export const createMissionService = (deps: Deps): MissionService => {
  const generateId = deps.generateId ?? (() => crypto.randomUUID());

  const list = (includeArchived?: boolean) => deps.store.list(includeArchived);

  const get = (id: string) => deps.store.get(id);

  const create = async (input: MissionCreateInput): Promise<Mission> => {
    requireTitle(input.title);
    const now = deps.clock.now();
    const mission: Mission = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
      dueAt: input.dueAt ?? null,
      tags: input.tags ?? null,
    };
    return deps.store.create(mission);
  };

  const update = async (id: string, patch: MissionUpdatePatch): Promise<Mission | null> => {
    if (patch.title !== undefined) requireTitle(patch.title);
    const updatedAt = deps.clock.now();
    const nextPatch: MissionUpdatePatch & { updatedAt: string } = {
      ...patch,
      title: patch.title?.trim() ?? patch.title,
      description: patch.description?.trim() ?? patch.description,
      updatedAt,
    };
    return deps.store.update(id, nextPatch);
  };

  const archive = async (id: string): Promise<Mission | null> => {
    const updatedAt = deps.clock.now();
    return deps.store.archive(id, updatedAt);
  };

  const unarchive = async (id: string): Promise<Mission | null> => {
    const updatedAt = deps.clock.now();
    return deps.store.unarchive(id, updatedAt);
  };

  return { list, get, create, update, archive, unarchive };
};
