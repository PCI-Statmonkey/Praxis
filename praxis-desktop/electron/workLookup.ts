import type {
  DeadlineRecord,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkEntityKind,
  WorkPriority,
  WorkSnapshot,
  WorkStatus,
} from "../shared/workModel";
import type { WorkLookupItem, WorkLookupRequest, WorkLookupResult } from "../shared/workLookup";
import { getWorkSnapshot } from "./workRepository";

const DAY_MS = 24 * 60 * 60 * 1000;

const priorityWeight: Record<WorkPriority, number> = {
  critical: 0,
  high: 10,
  normal: 20,
  low: 30,
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value: string) => normalize(value).split(" ").filter((word) => word.length >= 2);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysUntil = (value: string | null, now: Date) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
};

const daysSince = (value: string | null, now: Date) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
};

const scorePerson = (text: string, person: PersonRecord) => {
  const normalizedText = normalize(text);
  const candidates = [person.name, ...person.aliases];
  const exactMatch = candidates.find((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return normalizedCandidate && normalizedText.includes(normalizedCandidate);
  });
  if (exactMatch) {
    return 100;
  }

  const personWords = candidates.flatMap(words);
  if (personWords.length === 0) {
    return 0;
  }

  const matched = personWords.filter((word) => normalizedText.includes(word)).length;
  if (matched === 0) {
    return 0;
  }

  return Math.round((matched / personWords.length) * 85);
};

const findPerson = (text: string, people: PersonRecord[]) => {
  const scored = people
    .map((person) => ({
      person,
      score: scorePerson(text, person),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name));

  if (scored.length === 0) {
    return null;
  }

  if (scored[1] && scored[1].score === scored[0].score) {
    return "ambiguous" as const;
  }

  return scored[0].person;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "no date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const dueSummary = (value: string | null, now: Date) => {
  const days = daysUntil(value, now);
  if (days === null) {
    return "no due date";
  }
  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) {
    return "due today";
  }
  if (days === 1) {
    return "due tomorrow";
  }
  if (days <= 7) {
    return `due in ${days} days`;
  }
  return `due ${formatDate(value)}`;
};

const missionTitleByProjectId = (projects: ProjectRecord[], missions: MissionRecord[]) => {
  const missionTitleById = new Map(missions.map((mission) => [mission.id, mission.title] as const));
  const entries: Array<readonly [string, string]> = [];

  for (const project of projects) {
    if (!project.missionId) {
      continue;
    }
    const missionTitle = missionTitleById.get(project.missionId);
    if (!missionTitle) {
      continue;
    }
    entries.push([project.id, missionTitle] as const);
  }

  return new Map<string, string>(entries);
};

const todoContextSummary = (
  todo: TodoRecord,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => {
  if (!todo.projectId) {
    return "standalone";
  }

  const project = projectById.get(todo.projectId);
  if (!project) {
    return "standalone";
  }

  const missionTitle = missionTitleByProjectId.get(project.id);
  return missionTitle
    ? `project ${project.title}, mission ${missionTitle}`
    : `project ${project.title}`;
};

const entityContextDetail = (
  entityKind: WorkEntityKind,
  entityId: string,
  snapshot: WorkSnapshot,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => {
  if (entityKind === "todo") {
    const todo = snapshot.todos.find((candidate) => candidate.id === entityId);
    return todo ? todoContextSummary(todo, projectById, missionTitleByProjectId) : "todo";
  }

  if (entityKind === "deadline") {
    const deadline = snapshot.deadlines.find((candidate) => candidate.id === entityId);
    return deadline ? `${deadline.entityKind} deadline` : "deadline";
  }

  if (entityKind === "project") {
    const project = projectById.get(entityId);
    if (!project) {
      return "project";
    }
    const missionTitle = missionTitleByProjectId.get(project.id);
    return missionTitle ? `project in ${missionTitle}` : "project";
  }

  const mission = snapshot.missions.find((candidate) => candidate.id === entityId);
  return mission ? "mission" : "work item";
};

const withoutRank = <T extends WorkLookupItem & { rank: number }>(item: T): WorkLookupItem => ({
  entityKind: item.entityKind,
  entityId: item.entityId,
  title: item.title,
  detail: item.detail,
});

const topLines = (items: WorkLookupItem[]) =>
  items.map((item, index) => `${index + 1}. ${item.title} (${item.detail})`).join("\n");

const waitingRank = (todo: TodoRecord, now: Date, staleDays: number) => {
  const dueDays = daysUntil(todo.dueAt, now);
  const dueWeight =
    dueDays === null ? 80 : dueDays < 0 ? 0 : dueDays === 0 ? 5 : dueDays === 1 ? 15 : 30 + dueDays;
  return dueWeight + priorityWeight[todo.priority] - Math.min(staleDays, 30);
};

const waitingItem = (
  todo: TodoRecord,
  now: Date,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>,
  personNameById?: Map<string, string>
) => {
  const staleDays = Math.max(daysSince(todo.updatedAt, now) ?? 0, 0);
  const detailParts = [
    dueSummary(todo.dueAt, now),
    staleDays > 0 ? `waiting ${staleDays} day${staleDays === 1 ? "" : "s"}` : null,
    todo.waitingOnPersonId && personNameById
      ? `waiting on ${personNameById.get(todo.waitingOnPersonId) ?? "someone"}`
      : null,
    todoContextSummary(todo, projectById, missionTitleByProjectId),
  ].filter((part): part is string => Boolean(part));

  return {
    entityKind: "todo" as const,
    entityId: todo.id,
    title: todo.title,
    detail: detailParts.join(", "),
    rank: waitingRank(todo, now, staleDays),
  };
};

const slippingTodoItem = (
  todo: TodoRecord,
  now: Date,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => ({
  entityKind: "todo" as const,
  entityId: todo.id,
  title: todo.title,
  detail: `${dueSummary(todo.dueAt, now)}, ${todoContextSummary(todo, projectById, missionTitleByProjectId)}`,
  rank: (daysUntil(todo.dueAt, now) ?? 99) + priorityWeight[todo.priority],
});

const slippingDeadlineItem = (deadline: DeadlineRecord, now: Date) => ({
  entityKind: "deadline" as const,
  entityId: deadline.id,
  title: deadline.title,
  detail: `${dueSummary(deadline.dueAt, now)}, ${deadline.entityKind} deadline`,
  rank: (daysUntil(deadline.dueAt, now) ?? 99) + priorityWeight[deadline.priority],
});

const quickWinRank = (todo: TodoRecord, now: Date) => {
  const dueDays = daysUntil(todo.dueAt, now);
  const estimate = todo.estimatedMinutes ?? 20;

  return (
    priorityWeight[todo.priority] +
    (dueDays !== null && dueDays <= 0 ? -10 : dueDays !== null && dueDays <= 1 ? -5 : 0) +
    estimate
  );
};

const quickWinItem = (
  todo: TodoRecord,
  now: Date,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => ({
  entityKind: "todo" as const,
  entityId: todo.id,
  title: todo.title,
  detail: [
    todo.estimatedMinutes ? `about ${todo.estimatedMinutes} minutes` : "quick action",
    dueSummary(todo.dueAt, now),
    todoContextSummary(todo, projectById, missionTitleByProjectId),
  ].join(", "),
  rank: quickWinRank(todo, now),
});

const moneyItem = (
  todo: TodoRecord,
  now: Date,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => ({
  entityKind: "todo" as const,
  entityId: todo.id,
  title: todo.title,
  detail: [dueSummary(todo.dueAt, now), todoContextSummary(todo, projectById, missionTitleByProjectId)].join(
    ", "
  ),
  rank: (daysUntil(todo.dueAt, now) ?? 99) + priorityWeight[todo.priority],
});

const blockedRank = (
  status: WorkStatus,
  dueAt: string | null,
  priority: WorkPriority,
  updatedAt: string,
  now: Date
) => {
  const dueDays = daysUntil(dueAt, now);
  const staleDays = daysSince(updatedAt, now) ?? 0;

  return (
    (status === "blocked" ? 0 : 20) +
    (dueDays === null ? 50 : dueDays < 0 ? -10 : dueDays === 0 ? 0 : dueDays) +
    priorityWeight[priority] -
    staleDays
  );
};

const blockedTodoItem = (
  todo: TodoRecord,
  now: Date,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>,
  personNameById: Map<string, string>
) => ({
  entityKind: "todo" as const,
  entityId: todo.id,
  title: todo.title,
  detail: [
    todo.status,
    dueSummary(todo.dueAt, now),
    todo.waitingOnPersonId ? `waiting on ${personNameById.get(todo.waitingOnPersonId) ?? "someone"}` : null,
    todoContextSummary(todo, projectById, missionTitleByProjectId),
  ]
    .filter((part): part is string => Boolean(part))
    .join(", "),
  rank: blockedRank(todo.status, todo.dueAt, todo.priority, todo.updatedAt, now),
});

const blockedProjectItem = (
  project: ProjectRecord,
  now: Date,
  snapshot: WorkSnapshot,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => ({
  entityKind: "project" as const,
  entityId: project.id,
  title: project.title,
  detail: [
    project.status,
    dueSummary(project.dueAt, now),
    entityContextDetail("project", project.id, snapshot, projectById, missionTitleByProjectId),
  ].join(", "),
  rank: blockedRank(project.status, project.dueAt, "high", project.updatedAt, now),
});

const blockedMissionItem = (
  mission: MissionRecord,
  now: Date,
  snapshot: WorkSnapshot,
  projectById: Map<string, ProjectRecord>,
  missionTitleByProjectId: Map<string, string>
) => ({
  entityKind: "mission" as const,
  entityId: mission.id,
  title: mission.title,
  detail: [
    mission.status,
    dueSummary(mission.dueAt, now),
    entityContextDetail("mission", mission.id, snapshot, projectById, missionTitleByProjectId),
  ].join(", "),
  rank: blockedRank(mission.status, mission.dueAt, "high", mission.updatedAt, now),
});

const genericWaitingOnMessage = (items: WorkLookupItem[]) => {
  if (items.length === 0) {
    return "You do not have any active todos currently marked as waiting on someone else.";
  }

  return `You have ${items.length} active waiting-on item${items.length === 1 ? "" : "s"}:\n${topLines(items)}`;
};

const waitingOnPersonMessage = (personName: string, items: WorkLookupItem[]) => {
  if (items.length === 0) {
    return `Nothing active is currently waiting on ${personName}.`;
  }

  return `You are waiting on ${personName} for ${items.length} active item${items.length === 1 ? "" : "s"}:\n${topLines(items)}`;
};

const slippingMessage = (items: WorkLookupItem[], pressurePoints: WorkLookupItem[]) => {
  if (items.length === 0 && pressurePoints.length === 0) {
    return "Nothing active looks overdue right now.";
  }

  if (items.length === 0) {
    return `Nothing is technically overdue right now. Closest pressure points:\n${topLines(pressurePoints)}`;
  }

  return `I see ${items.length} slipping item${items.length === 1 ? "" : "s"} right now:\n${topLines(items)}`;
};

const quickWinsMessage = (items: WorkLookupItem[]) => {
  if (items.length === 0) {
    return "I do not see any clean quick wins right now.";
  }

  return `Best quick wins right now:\n${topLines(items)}`;
};

const moneyMessage = (items: WorkLookupItem[]) => {
  if (items.length === 0) {
    return "No active money-related todos are recorded right now.";
  }

  return `Money-related items in play:\n${topLines(items)}`;
};

const blockedMessage = (items: WorkLookupItem[]) => {
  if (items.length === 0) {
    return "I do not see any blocked or paused work right now.";
  }

  return `Blocked or paused work right now:\n${topLines(items)}`;
};

const waitingOnLookup = (text: string, now: Date): WorkLookupResult => {
  const snapshot = getWorkSnapshot();
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionTitles = missionTitleByProjectId(snapshot.projects, snapshot.missions);
  const personNameById = new Map(snapshot.people.map((person) => [person.id, person.name]));
  const activeWaitingTodos = snapshot.todos.filter(
    (todo) => todo.status !== "completed" && Boolean(todo.waitingOnPersonId)
  );

  const matchedPerson = findPerson(text, snapshot.people);
  if (matchedPerson === "ambiguous") {
    return {
      ok: false,
      reason: "I found more than one possible person. Use the full name.",
    };
  }

  if (matchedPerson) {
    const items = activeWaitingTodos
      .filter((todo) => todo.waitingOnPersonId === matchedPerson.id)
      .map((todo) => waitingItem(todo, now, projectById, missionTitles))
      .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
      .slice(0, 5)
      .map(withoutRank);

    return {
      ok: true,
      kind: "waiting_on",
      itemCount: items.length,
      items,
      message: waitingOnPersonMessage(matchedPerson.name, items),
    };
  }

  const genericItems = activeWaitingTodos
    .map((todo) => waitingItem(todo, now, projectById, missionTitles, personNameById))
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map(withoutRank);

  return {
    ok: true,
    kind: "waiting_on",
    itemCount: genericItems.length,
    items: genericItems,
    message: genericWaitingOnMessage(genericItems),
  };
};

const slippingLookup = (now: Date): WorkLookupResult => {
  const snapshot = getWorkSnapshot();
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionTitles = missionTitleByProjectId(snapshot.projects, snapshot.missions);

  const overdueItems = [
    ...snapshot.todos
      .filter((todo) => todo.status !== "completed" && (daysUntil(todo.dueAt, now) ?? 1) < 0)
      .map((todo) => slippingTodoItem(todo, now, projectById, missionTitles)),
    ...snapshot.deadlines
      .filter(
        (deadline) => deadline.status !== "completed" && (daysUntil(deadline.dueAt, now) ?? 1) < 0
      )
      .map((deadline) => slippingDeadlineItem(deadline, now)),
  ]
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map(withoutRank);

  const pressurePoints = [
    ...snapshot.todos
      .filter((todo) => {
        if (todo.status === "completed") {
          return false;
        }
        const dueDays = daysUntil(todo.dueAt, now);
        return dueDays !== null && dueDays >= 0 && dueDays <= 1 && todo.priority !== "low";
      })
      .map((todo) => slippingTodoItem(todo, now, projectById, missionTitles)),
    ...snapshot.deadlines
      .filter((deadline) => {
        if (deadline.status === "completed") {
          return false;
        }
        const dueDays = daysUntil(deadline.dueAt, now);
        return dueDays !== null && dueDays >= 0 && dueDays <= 1 && deadline.priority !== "low";
      })
      .map((deadline) => slippingDeadlineItem(deadline, now)),
  ]
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map(withoutRank);

  return {
    ok: true,
    kind: "slipping",
    itemCount: overdueItems.length,
    items: overdueItems,
    message: slippingMessage(overdueItems, pressurePoints),
  };
};

const quickWinsLookup = (now: Date): WorkLookupResult => {
  const snapshot = getWorkSnapshot();
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionTitles = missionTitleByProjectId(snapshot.projects, snapshot.missions);

  const items = snapshot.todos
    .filter(
      (todo) =>
        todo.status === "active" &&
        todo.quickAction &&
        !todo.waitingOnPersonId &&
        (todo.estimatedMinutes === null || todo.estimatedMinutes <= 20)
    )
    .map((todo) => quickWinItem(todo, now, projectById, missionTitles))
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map(withoutRank);

  return {
    ok: true,
    kind: "quick_wins",
    itemCount: items.length,
    items,
    message: quickWinsMessage(items),
  };
};

const moneyLookup = (now: Date): WorkLookupResult => {
  const snapshot = getWorkSnapshot();
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionTitles = missionTitleByProjectId(snapshot.projects, snapshot.missions);

  const items = snapshot.todos
    .filter((todo) => todo.status !== "completed" && todo.moneyRelated)
    .map((todo) => moneyItem(todo, now, projectById, missionTitles))
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 5)
    .map(withoutRank);

  return {
    ok: true,
    kind: "money",
    itemCount: items.length,
    items,
    message: moneyMessage(items),
  };
};

const blockedLookup = (now: Date): WorkLookupResult => {
  const snapshot = getWorkSnapshot();
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionTitles = missionTitleByProjectId(snapshot.projects, snapshot.missions);
  const personNameById = new Map(snapshot.people.map((person) => [person.id, person.name]));

  const items = [
    ...snapshot.todos
      .filter((todo) => todo.status === "blocked" || todo.status === "paused")
      .map((todo) =>
        blockedTodoItem(todo, now, projectById, missionTitles, personNameById)
      ),
    ...snapshot.projects
      .filter((project) => project.status === "blocked" || project.status === "paused")
      .map((project) => blockedProjectItem(project, now, snapshot, projectById, missionTitles)),
    ...snapshot.missions
      .filter((mission) => mission.status === "blocked" || mission.status === "paused")
      .map((mission) => blockedMissionItem(mission, now, snapshot, projectById, missionTitles)),
  ]
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))
    .slice(0, 6)
    .map(withoutRank);

  return {
    ok: true,
    kind: "blocked",
    itemCount: items.length,
    items,
    message: blockedMessage(items),
  };
};

export const lookupWork = (request: WorkLookupRequest): WorkLookupResult => {
  const text = request.text.trim();
  if (!text) {
    return {
      ok: false,
      reason: "Ask about the work graph first.",
    };
  }

  const now = new Date();
  if (/\b(waiting on|waiting for|waiting\b)\b/i.test(text)) {
    return waitingOnLookup(text, now);
  }

  if (/\b(slipping|overdue|falling behind|behind on|at risk)\b/i.test(text)) {
    return slippingLookup(now);
  }

  if (/\b(quick win|quick wins|knock out quickly|knock out|easy win|easy wins)\b/i.test(text)) {
    return quickWinsLookup(now);
  }

  if (/\b(money related|money-related|billing items|invoice items|finance items)\b/i.test(text)) {
    return moneyLookup(now);
  }

  if (/\b(blocked|stuck|paused)\b/i.test(text)) {
    return blockedLookup(now);
  }

  return {
    ok: false,
    reason:
      "I can answer waiting-on, slipping, quick-win, money-related, and blocked-work questions from the current work graph.",
  };
};
