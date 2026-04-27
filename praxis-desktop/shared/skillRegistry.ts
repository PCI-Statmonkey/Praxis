export type PraxisSkillSurface = "desktop" | "slack" | "voice" | "companion";

export type PraxisSkillTrust = "built-in" | "workspace";

export type PraxisSkillRecord = {
  id: string;
  name: string;
  description: string;
  surfaces: PraxisSkillSurface[];
  dataSources: string[];
  trust: PraxisSkillTrust;
  relativePath: string;
  title: string;
  content: string;
  loadedAt: string;
  warnings: string[];
};

export type PraxisSkillRegistrySnapshot = {
  ok: boolean;
  skillsRoot: string;
  indexedAt: string;
  skillCount: number;
  skills: PraxisSkillRecord[];
  warnings: string[];
};
