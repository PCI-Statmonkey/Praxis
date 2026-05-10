import type {
  MemoryDocumentSummary,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
} from "./workModel";

export type ChecklistContextGroupKind =
  | "top_move"
  | "due"
  | "waiting"
  | "project"
  | "money"
  | "quick"
  | "standalone";

export type ChecklistContextGroup = {
  id: string;
  kind: ChecklistContextGroupKind;
  label: string;
  count: number;
  todoIds: string[];
  projectId?: string | null;
  missionId?: string | null;
  personId?: string | null;
};

export type BuildChecklistContextGroupsInput = {
  todos: TodoRecord[];
  projects: ProjectRecord[];
  missions: MissionRecord[];
  people: PersonRecord[];
  topMoveTodoId?: string | null;
  now?: string;
};

export type MemoryContextLaneKind =
  | "today"
  | "project"
  | "mission"
  | "person"
  | "template"
  | "inbox";

export type MemoryContextLane = {
  id: string;
  kind: MemoryContextLaneKind;
  label: string;
  documentPaths: string[];
  relatedEntityIds: string[];
};

export type BuildMemoryContextLanesInput = {
  memoryDocuments: MemoryDocumentSummary[];
  projects: ProjectRecord[];
  missions: MissionRecord[];
  people: PersonRecord[];
};

const parseStableId = (stableId: string) => {
  const [kind, ...idParts] = stableId.split(":");
  const id = idParts.join(":");
  return kind && id ? { kind, id } : null;
};

const priorityRank: Record<WorkPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const compareTodos = (left: TodoRecord, right: TodoRecord) =>
  priorityRank[left.priority] - priorityRank[right.priority] ||
  (Date.parse(left.dueAt ?? "") || Number.MAX_SAFE_INTEGER) -
    (Date.parse(right.dueAt ?? "") || Number.MAX_SAFE_INTEGER) ||
  (left.estimatedMinutes ?? 999) - (right.estimatedMinutes ?? 999) ||
  left.title.localeCompare(right.title);

const isDueOrOverdue = (todo: TodoRecord, now: Date) => {
  if (!todo.dueAt) {
    return false;
  }
  const due = Date.parse(todo.dueAt);
  if (Number.isNaN(due)) {
    return false;
  }
  const dueDate = new Date(due);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return dueDate.getTime() <= todayEnd.getTime();
};

const groupFromTodos = (
  input: Omit<ChecklistContextGroup, "count"> & { todoIds: string[] }
): ChecklistContextGroup | null =>
  input.todoIds.length > 0
    ? {
        ...input,
        count: input.todoIds.length,
      }
    : null;

export const buildChecklistContextGroups = ({
  todos,
  projects,
  missions,
  people,
  topMoveTodoId = null,
  now = new Date().toISOString(),
}: BuildChecklistContextGroupsInput): ChecklistContextGroup[] => {
  const activeTodos = todos.filter((todo) => todo.status !== "completed").sort(compareTodos);
  const activeTodoById = new Map(activeTodos.map((todo) => [todo.id, todo]));
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const nowDate = new Date(now);
  const safeNow = Number.isNaN(nowDate.getTime()) ? new Date() : nowDate;
  const groups: ChecklistContextGroup[] = [];
  const addGroup = (group: ChecklistContextGroup | null) => {
    if (group) {
      groups.push(group);
    }
  };

  const topMoveTodo = topMoveTodoId ? activeTodoById.get(topMoveTodoId) ?? null : null;
  addGroup(
    topMoveTodo
      ? {
          id: "top_move",
          kind: "top_move",
          label: "Top Move",
          count: 1,
          todoIds: [topMoveTodo.id],
          projectId: topMoveTodo.projectId,
        }
      : null
  );

  addGroup(
    groupFromTodos({
      id: "due",
      kind: "due",
      label: "Due / Overdue",
      todoIds: activeTodos.filter((todo) => isDueOrOverdue(todo, safeNow)).map((todo) => todo.id),
    })
  );

  for (const person of people) {
    addGroup(
      groupFromTodos({
        id: `waiting:${person.id}`,
        kind: "waiting",
        label: `Waiting on ${person.name}`,
        personId: person.id,
        todoIds: activeTodos
          .filter((todo) => todo.waitingOnPersonId === person.id)
          .map((todo) => todo.id),
      })
    );
  }
  const unknownWaiting = activeTodos.filter(
    (todo) => todo.waitingOnPersonId && !personById.has(todo.waitingOnPersonId)
  );
  addGroup(
    groupFromTodos({
      id: "waiting:unknown",
      kind: "waiting",
      label: "Waiting on unknown",
      personId: null,
      todoIds: unknownWaiting.map((todo) => todo.id),
    })
  );

  for (const mission of missions.filter((mission) => mission.status !== "completed")) {
    const missionProjects = projects.filter((project) => project.missionId === mission.id);
    const missionTodoIds = activeTodos
      .filter((todo) => {
        const project = todo.projectId ? projectById.get(todo.projectId) : null;
        return project?.missionId === mission.id;
      })
      .map((todo) => todo.id);
    addGroup(
      groupFromTodos({
        id: `mission:${mission.id}`,
        kind: "project",
        label: mission.title,
        missionId: mission.id,
        todoIds: missionTodoIds,
      })
    );
    for (const project of missionProjects.filter((project) => project.status !== "completed")) {
      addGroup(
        groupFromTodos({
          id: `project:${project.id}`,
          kind: "project",
          label: `${mission.title} / ${project.title}`,
          projectId: project.id,
          missionId: mission.id,
          todoIds: activeTodos
            .filter((todo) => todo.projectId === project.id)
            .map((todo) => todo.id),
        })
      );
    }
  }

  for (const project of projects.filter(
    (project) => project.status !== "completed" && !project.missionId
  )) {
    addGroup(
      groupFromTodos({
        id: `project:${project.id}`,
        kind: "project",
        label: project.title,
        projectId: project.id,
        missionId: null,
        todoIds: activeTodos.filter((todo) => todo.projectId === project.id).map((todo) => todo.id),
      })
    );
  }

  addGroup(
    groupFromTodos({
      id: "money",
      kind: "money",
      label: "Money",
      todoIds: activeTodos.filter((todo) => todo.moneyRelated).map((todo) => todo.id),
    })
  );
  addGroup(
    groupFromTodos({
      id: "quick",
      kind: "quick",
      label: "Quick Wins",
      todoIds: activeTodos
        .filter((todo) => todo.quickAction || (todo.estimatedMinutes ?? 999) <= 15)
        .map((todo) => todo.id),
    })
  );
  addGroup(
    groupFromTodos({
      id: "standalone",
      kind: "standalone",
      label: "Standalone",
      todoIds: activeTodos.filter((todo) => !todo.projectId).map((todo) => todo.id),
    })
  );

  return groups;
};

export const highlightedChecklistContextGroupIds = (
  groups: ChecklistContextGroup[],
  suggestedStableIds: string[] = []
) => {
  const todoIds = new Set<string>();
  const directGroupIds = new Set<string>();
  for (const stableId of suggestedStableIds) {
    const parsed = parseStableId(stableId);
    if (!parsed) {
      continue;
    }
    if (parsed.kind === "todo") {
      todoIds.add(parsed.id);
    }
    if (parsed.kind === "project" || parsed.kind === "mission") {
      directGroupIds.add(`${parsed.kind}:${parsed.id}`);
    }
  }

  return groups
    .filter(
      (group) =>
        directGroupIds.has(group.id) ||
        group.todoIds.some((todoId) => todoIds.has(todoId)) ||
        Boolean(group.projectId && directGroupIds.has(`project:${group.projectId}`)) ||
        Boolean(group.missionId && directGroupIds.has(`mission:${group.missionId}`))
    )
    .map((group) => group.id);
};

const addLaneDocument = (
  lanes: Map<string, MemoryContextLane>,
  lane: Omit<MemoryContextLane, "documentPaths" | "relatedEntityIds">,
  document: MemoryDocumentSummary,
  relatedEntityId: string | null = null
) => {
  const current =
    lanes.get(lane.id) ??
    ({
      ...lane,
      documentPaths: [],
      relatedEntityIds: [],
    } satisfies MemoryContextLane);
  if (!current.documentPaths.includes(document.relativePath)) {
    current.documentPaths.push(document.relativePath);
  }
  if (relatedEntityId && !current.relatedEntityIds.includes(relatedEntityId)) {
    current.relatedEntityIds.push(relatedEntityId);
  }
  lanes.set(lane.id, current);
};

export const buildMemoryContextLanes = ({
  memoryDocuments,
  projects,
  missions,
  people,
}: BuildMemoryContextLanesInput): MemoryContextLane[] => {
  const lanes = new Map<string, MemoryContextLane>();
  const projectByPath = new Map(
    projects
      .filter((project) => project.markdownPath)
      .map((project) => [project.markdownPath as string, project])
  );
  const missionByPath = new Map(
    missions
      .filter((mission) => mission.markdownPath)
      .map((mission) => [mission.markdownPath as string, mission])
  );
  const personByPath = new Map(
    people.filter((person) => person.markdownPath).map((person) => [person.markdownPath as string, person])
  );

  for (const document of memoryDocuments) {
    const path = document.relativePath.toLowerCase();
    const docKind = document.docKind.toLowerCase();
    const project = projectByPath.get(document.relativePath);
    const mission = missionByPath.get(document.relativePath);
    const person = personByPath.get(document.relativePath);

    if (project) {
      addLaneDocument(
        lanes,
        { id: `project:${project.id}`, kind: "project", label: project.title },
        document,
        project.id
      );
    } else if (mission) {
      addLaneDocument(
        lanes,
        { id: `mission:${mission.id}`, kind: "mission", label: mission.title },
        document,
        mission.id
      );
    } else if (person) {
      addLaneDocument(
        lanes,
        { id: `person:${person.id}`, kind: "person", label: person.name },
        document,
        person.id
      );
    } else if (path.includes("template") || docKind.includes("template")) {
      addLaneDocument(lanes, { id: "templates", kind: "template", label: "Templates" }, document);
    } else if (
      path.includes("email") ||
      path.includes("chat") ||
      docKind.includes("email") ||
      docKind.includes("chat")
    ) {
      addLaneDocument(lanes, { id: "inbox", kind: "inbox", label: "Inbox Context" }, document);
    } else if (path.includes("daily") || path.includes("brief") || docKind.includes("daily")) {
      addLaneDocument(lanes, { id: "today", kind: "today", label: "Today" }, document);
    }
  }

  const laneOrder: Record<MemoryContextLaneKind, number> = {
    today: 0,
    project: 1,
    mission: 2,
    person: 3,
    template: 4,
    inbox: 5,
  };

  return [...lanes.values()].sort(
    (left, right) => laneOrder[left.kind] - laneOrder[right.kind] || left.label.localeCompare(right.label)
  );
};

export const highlightedMemoryContextLaneIds = (
  lanes: MemoryContextLane[],
  suggestedStableIds: string[] = []
) => {
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const highlighted = new Set<string>();
  for (const stableId of suggestedStableIds) {
    const parsed = parseStableId(stableId);
    if (!parsed) {
      continue;
    }
    const directLaneId = `${parsed.kind}:${parsed.id}`;
    if (laneIds.has(directLaneId)) {
      highlighted.add(directLaneId);
    }
    if (parsed.kind === "review_inbox" && laneIds.has("inbox")) {
      highlighted.add("inbox");
    }
  }
  return [...highlighted];
};
