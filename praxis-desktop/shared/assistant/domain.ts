export type SurfaceId = "desktop" | "slack";

export type Idea = {
  id: string;
  title: string;
  summary: string;
  capturedAt: string;
  strategicFit: number;
  urgency: number;
  energy: number;
  novelty: number;
};

export type Mission = {
  id: string;
  title: string;
  outcome: string;
  sourceIdeaId: string;
  createdAt: string;
  status: "draft" | "active" | "completed";
};

export type Task = {
  id: string;
  title: string;
  missionId?: string;
  completed: boolean;
};

export type Signal = {
  id: string;
  kind: string;
  summary: string;
  detectedAt: string;
};

export type Insight = {
  id: string;
  kind: string;
  summary: string;
  createdAt: string;
};
