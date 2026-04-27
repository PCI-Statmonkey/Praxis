export type WorkStatus = "active" | "blocked" | "completed" | "paused";

export type WorkPriority = "low" | "normal" | "high" | "critical";

export type WorkEntityKind = "mission" | "project" | "todo" | "deadline";

export type EditableWorkEntityKind = WorkEntityKind | "appointment" | "person";

export type DeadlineEntityKind = "mission" | "project" | "todo" | "standalone";

export type MissionRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  dueAt: string | null;
  markdownPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRecord = {
  id: string;
  missionId: string | null;
  slug: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  dueAt: string | null;
  markdownPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoRecord = {
  id: string;
  projectId: string | null;
  title: string;
  status: WorkStatus;
  priority: WorkPriority;
  dueAt: string | null;
  moneyRelated: boolean;
  quickAction: boolean;
  estimatedMinutes: number | null;
  waitingOnPersonId: string | null;
  sourceKind: string | null;
  sourceRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeadlineRecord = {
  id: string;
  entityKind: DeadlineEntityKind;
  entityId: string | null;
  title: string;
  dueAt: string;
  status: WorkStatus;
  priority: WorkPriority;
  sourceKind: string | null;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentRecord = {
  id: string;
  sourceSystem: string;
  externalId: string | null;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonRecord = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  roleSummary: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  notes: string | null;
  markdownPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonWorkLinkRecord = {
  id: string;
  personId: string;
  entityKind: "mission" | "project";
  entityId: string;
  relationship: string;
  sourceKind: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePersonWorkLinkInput = {
  personId: string;
  entityKind: "mission" | "project";
  entityId: string;
  relationship: string;
};

export type DeletePersonWorkLinkInput = {
  id: string;
};

export type MemoryDocumentSummary = {
  title: string;
  relativePath: string;
  docKind: string;
  entityKind: string;
};

export type WorkSnapshot = {
  missions: MissionRecord[];
  projects: ProjectRecord[];
  todos: TodoRecord[];
  deadlines: DeadlineRecord[];
  appointments: AppointmentRecord[];
  people: PersonRecord[];
  personWorkLinks: PersonWorkLinkRecord[];
  memoryDocuments: MemoryDocumentSummary[];
};

export type CreateMissionInput = {
  title: string;
  summary?: string;
  dueAt?: string;
};

export type CreateProjectInput = {
  title: string;
  summary?: string;
  missionId?: string;
  dueAt?: string;
};

export type CreateTodoInput = {
  title: string;
  projectId?: string;
  priority?: WorkPriority;
  dueAt?: string;
  moneyRelated?: boolean;
  quickAction?: boolean;
  estimatedMinutes?: number;
  waitingOnPersonId?: string;
  sourceKind?: string;
  sourceRef?: string;
  notes?: string;
};

export type CreatePersonInput = {
  name: string;
  aliases?: string[];
  roleSummary?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  notes?: string;
};

export type CreateDeadlineInput = {
  title: string;
  dueAt: string;
  entityKind?: DeadlineEntityKind;
  entityId?: string;
  priority?: WorkPriority;
  sourceKind?: string;
  sourceRef?: string;
};

export type CreateAppointmentInput = {
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  notes?: string;
  sourceSystem?: string;
  externalId?: string;
};

export type UpdateWorkStatusInput = {
  entityKind: WorkEntityKind;
  id: string;
  status: WorkStatus;
};

export type UpdateWorkRecordInput =
  | {
      entityKind: "mission";
      id: string;
      title: string;
      summary?: string;
      dueAt?: string;
    }
  | {
      entityKind: "project";
      id: string;
      title: string;
      summary?: string;
      missionId?: string;
      dueAt?: string;
    }
  | {
      entityKind: "todo";
      id: string;
      title: string;
      projectId?: string;
      priority?: WorkPriority;
      dueAt?: string;
      moneyRelated?: boolean;
      quickAction?: boolean;
      estimatedMinutes?: number;
      waitingOnPersonId?: string;
      notes?: string;
    }
  | {
      entityKind: "person";
      id: string;
      name: string;
      aliases?: string[];
      roleSummary?: string;
      email?: string;
      phone?: string;
      billingAddress?: string;
      notes?: string;
    }
  | {
      entityKind: "deadline";
      id: string;
      title: string;
      dueAt: string;
      priority?: WorkPriority;
    }
  | {
      entityKind: "appointment";
      id: string;
      title: string;
      startsAt: string;
      endsAt?: string;
      allDay?: boolean;
      notes?: string;
    };

export type DeleteWorkRecordInput = {
  entityKind: EditableWorkEntityKind;
  id: string;
};
