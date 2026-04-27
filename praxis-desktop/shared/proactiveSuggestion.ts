import type { AssistantContextAction } from "./assistantContext";
import type { DailyBriefItem } from "./dailyBrief";
import type { TodoRecord, WorkEntityKind, WorkPriority, WorkSnapshot } from "./workModel";

export type ProactiveSuggestion = {
  surface: "proactive_suggestion";
  title: string;
  prompt: string;
  actions: AssistantContextAction[];
};

const proactiveCompletionKinds = new Set<WorkEntityKind>(["todo", "deadline"]);
const priorityRank: Record<WorkPriority, number> = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4,
};
const DAY_MS = 24 * 60 * 60 * 1000;

const isProactiveCompletionKind = (kind: DailyBriefItem["entityKind"]): kind is WorkEntityKind =>
  proactiveCompletionKinds.has(kind as WorkEntityKind);

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayDeltaFromNow = (value: string | null | undefined, now = new Date()) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS
  );
};

const staleDaysSince = (value: string | null | undefined, now = new Date()) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / DAY_MS
  );
};

const projectMissionContext = (snapshot: WorkSnapshot, projectId: string | null) => {
  if (!projectId) {
    return null;
  }

  const project = snapshot.projects.find((candidate) => candidate.id === projectId) ?? null;
  if (!project) {
    return null;
  }

  const mission = project.missionId
    ? snapshot.missions.find((candidate) => candidate.id === project.missionId) ?? null
    : null;

  return {
    projectTitle: project.title,
    missionTitle: mission?.title ?? null,
  };
};

export const buildTopCompletionSuggestion = (
  items: DailyBriefItem[]
): ProactiveSuggestion | null => {
  const indexedItem = items
    .map((item, index) => ({ item, index }))
    .find(({ item }) => isProactiveCompletionKind(item.entityKind));

  if (!indexedItem) {
    return null;
  }

  const { item, index } = indexedItem;
  if (!isProactiveCompletionKind(item.entityKind)) {
    return null;
  }

  return {
    surface: "proactive_suggestion",
    title: "Top Action Check",
    prompt: `I see "${item.title}" near the top of your report. If you have handled it, want me to mark it done?`,
    actions: [
      {
        actionId: `${item.entityKind}:${item.id}:complete:proactive`,
        ordinal: index + 1,
        title: item.title,
        entityKind: item.entityKind,
        entityId: item.id,
        command: "complete",
      },
    ],
  };
};

const waitingTodoRank = (todo: TodoRecord) => {
  const dueRank = todo.dueAt ? -new Date(todo.dueAt).getTime() / 100000000000 : 0;
  const staleRank = staleDaysSince(todo.updatedAt) ?? 0;
  return priorityRank[todo.priority] * 10 + staleRank * 2 + (todo.quickAction ? 2 : 0) + dueRank;
};

export const buildWaitingOnSuggestion = (snapshot: WorkSnapshot): ProactiveSuggestion | null => {
  const waitingTodo = [...snapshot.todos]
    .filter((todo) => todo.status !== "completed" && todo.waitingOnPersonId)
    .sort((a, b) => waitingTodoRank(b) - waitingTodoRank(a) || a.title.localeCompare(b.title))[0];

  if (!waitingTodo?.waitingOnPersonId) {
    return null;
  }

  const person = snapshot.people.find((candidate) => candidate.id === waitingTodo.waitingOnPersonId);
  if (!person) {
    return null;
  }

  const staleDays = staleDaysSince(waitingTodo.updatedAt);
  const context = projectMissionContext(snapshot, waitingTodo.projectId);
  const stalePhrase =
    staleDays && staleDays > 0
      ? ` for ${staleDays} day${staleDays === 1 ? "" : "s"}`
      : "";
  const contextPhrase = context
    ? ` It sits under ${context.projectTitle}${context.missionTitle ? ` in ${context.missionTitle}` : ""}.`
    : "";

  return {
    surface: "proactive_suggestion",
    title: "Waiting-On Nudge",
    prompt: `I still have "${waitingTodo.title}" marked as waiting on ${person.name}${stalePhrase}.${contextPhrase} If that came through, want me to clear the waiting-on flag?`,
    actions: [
      {
        actionId: `todo:${waitingTodo.id}:clear_waiting_on:proactive`,
        ordinal: 1,
        title: waitingTodo.title,
        entityKind: "todo",
        entityId: waitingTodo.id,
        command: "clear_waiting_on",
        personId: person.id,
      },
    ],
  };
};

export const buildOverdueSuggestion = (items: DailyBriefItem[]): ProactiveSuggestion | null => {
  const overdueItem = items
    .filter(
      (item) =>
        isProactiveCompletionKind(item.entityKind) &&
        (dayDeltaFromNow(item.dueAt) ?? 1) < 0 &&
        item.status !== "completed"
    )
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title))[0];

  if (!overdueItem || !isProactiveCompletionKind(overdueItem.entityKind)) {
    return null;
  }

  return {
    surface: "proactive_suggestion",
    title: "Overdue Check",
    prompt: `"${overdueItem.title}" is still showing as ${overdueItem.reason.toLowerCase()}. If you already handled it, want me to mark it done?`,
    actions: [
      {
        actionId: `${overdueItem.entityKind}:${overdueItem.id}:complete:overdue`,
        ordinal: 1,
        title: overdueItem.title,
        entityKind: overdueItem.entityKind,
        entityId: overdueItem.id,
        command: "complete",
      },
    ],
  };
};

const quickWinRank = (todo: TodoRecord, now = new Date()) => {
  const dueDays = dayDeltaFromNow(todo.dueAt, now);
  const estimated = todo.estimatedMinutes ?? 20;
  return (
    priorityRank[todo.priority] * 10 +
    (todo.quickAction ? 10 : 0) +
    (todo.moneyRelated ? 4 : 0) +
    (dueDays !== null && dueDays <= 0 ? 6 : dueDays !== null && dueDays <= 1 ? 4 : 0) -
    Math.min(estimated, 30) / 10
  );
};

export const buildQuickWinSuggestion = (snapshot: WorkSnapshot): ProactiveSuggestion | null => {
  const quickTodo = [...snapshot.todos]
    .filter(
      (todo) =>
        todo.status === "active" &&
        todo.quickAction &&
        !todo.waitingOnPersonId &&
        (todo.estimatedMinutes === null || todo.estimatedMinutes <= 20)
    )
    .sort((a, b) => quickWinRank(b) - quickWinRank(a) || a.title.localeCompare(b.title))[0];

  if (!quickTodo) {
    return null;
  }

  const context = projectMissionContext(snapshot, quickTodo.projectId);
  const estimatePhrase = quickTodo.estimatedMinutes
    ? ` It looks like about ${quickTodo.estimatedMinutes} minute${quickTodo.estimatedMinutes === 1 ? "" : "s"}.`
    : "";
  const duePhrase =
    quickTodo.dueAt && dayDeltaFromNow(quickTodo.dueAt) === 0
      ? " It is due today."
      : quickTodo.dueAt && dayDeltaFromNow(quickTodo.dueAt) === 1
        ? " It is due tomorrow."
        : "";
  const contextPhrase = context
    ? ` It belongs to ${context.projectTitle}${context.missionTitle ? ` in ${context.missionTitle}` : ""}.`
    : "";

  return {
    surface: "proactive_suggestion",
    title: "Quick Win Nudge",
    prompt: `"${quickTodo.title}" looks like a quick hit.${estimatePhrase}${duePhrase}${contextPhrase} If you already knocked it out, want me to mark it done?`,
    actions: [
      {
        actionId: `todo:${quickTodo.id}:complete:quick_win`,
        ordinal: 1,
        title: quickTodo.title,
        entityKind: "todo",
        entityId: quickTodo.id,
        command: "complete",
      },
    ],
  };
};

export const buildBestProactiveSuggestion = (
  snapshot: WorkSnapshot,
  items: DailyBriefItem[]
): ProactiveSuggestion | null =>
  buildOverdueSuggestion(items) ??
  buildWaitingOnSuggestion(snapshot) ??
  buildQuickWinSuggestion(snapshot) ??
  buildTopCompletionSuggestion(items);
