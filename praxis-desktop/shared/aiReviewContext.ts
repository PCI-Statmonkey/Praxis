import type {
  EmailConnectionRecord,
  EmailSuggestionRecord,
} from "./emailModel";
import type {
  AppointmentRecord,
  DeadlineEntityKind,
  DeadlineRecord,
  ProjectRecord,
  TodoRecord,
  WorkEntityKind,
  WorkPriority,
  WorkSnapshot,
  WorkStatus,
} from "./workModel";

export type AIReviewActionCommand =
  | "complete"
  | "pause"
  | "reactivate"
  | "update_due_date"
  | "clear_waiting_on"
  | "open_focus_report"
  | "review_inbox_accept_todo"
  | "review_inbox_accept_project"
  | "review_inbox_dismiss";

export type AIReviewActionHint = {
  command: AIReviewActionCommand;
  label: string;
  requiresConfirmation: true;
};

export type AIReviewWorkItem = {
  stableId: string;
  entityKind: WorkEntityKind;
  entityId: string;
  title: string;
  status: WorkStatus;
  priority: WorkPriority;
  rank: number;
  reasons: string[];
  dueAt: string | null;
  projectId?: string | null;
  projectTitle?: string | null;
  missionId?: string | null;
  missionTitle?: string | null;
  waitingOnPersonId?: string | null;
  waitingOnPersonName?: string | null;
  estimatedMinutes?: number | null;
  linkedEntityKind?: DeadlineEntityKind | null;
  linkedEntityId?: string | null;
  allowedFollowUpActions: AIReviewActionHint[];
};

export type AIReviewAppointmentItem = {
  stableId: string;
  appointmentId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  sourceSystem: string;
  rank: number;
  reasons: string[];
};

export type AIReviewInboxItem = {
  stableId: string;
  suggestionId: string;
  title: string;
  suggestedEntityKind: "todo" | "project";
  reason: string;
  confidence: number;
  dueAt: string | null;
  sourceSystem: string;
  receivedAt: string;
  matchedPersonId: string | null;
  matchedPersonName: string | null;
  rank: number;
  allowedFollowUpActions: AIReviewActionHint[];
};

export type AIReviewServiceHealth = {
  storage: {
    ok: boolean;
    checkedAt: string | null;
    errorCount: number;
    warningCount: number;
  } | null;
  email: {
    connectionCount: number;
    readyCount: number;
    blockedCount: number;
    errorCount: number;
    latestSyncAt: string | null;
  };
};

export type AIReviewContextPacket = {
  schemaVersion: 1;
  generatedAt: string;
  localDate: string;
  fallbackSummary: {
    headline: string;
    bullets: string[];
    nextBestAction: string;
  };
  workGraph: {
    activeMissionCount: number;
    activeProjectCount: number;
    activeTodoCount: number;
    activeDeadlineCount: number;
    peopleCount: number;
  };
  calendarPressure: {
    appointmentCount: number;
    items: AIReviewAppointmentItem[];
  };
  reviewInbox: {
    pendingCount: number;
    items: AIReviewInboxItem[];
  };
  staleProjects: {
    staleCount: number;
    items: AIReviewWorkItem[];
  };
  waitingOn: {
    waitingCount: number;
    items: AIReviewWorkItem[];
  };
  overdueDueSoon: {
    overdueCount: number;
    dueSoonCount: number;
    items: AIReviewWorkItem[];
  };
  quickWins: {
    itemCount: number;
    items: AIReviewWorkItem[];
  };
  recentCloseoutChanges: {
    changedTodayCount: number;
    completedTodayCount: number;
    items: AIReviewWorkItem[];
  };
  serviceHealth: AIReviewServiceHealth;
};

export type BuildAIReviewContextPacketInput = {
  snapshot: WorkSnapshot;
  emailSuggestions?: EmailSuggestionRecord[];
  emailConnections?: EmailConnectionRecord[];
  storage?: AIReviewServiceHealth["storage"];
  generatedAt?: string;
  staleProjectDays?: number;
  dueSoonDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const priorityWeight: Record<WorkPriority, number> = {
  critical: 0,
  high: 10,
  normal: 20,
  low: 30,
};

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

const isActive = (status: WorkStatus) => status !== "completed";

const action = (command: AIReviewActionCommand, label: string): AIReviewActionHint => ({
  command,
  label,
  requiresConfirmation: true,
});

const workActions = (
  entityKind: WorkEntityKind,
  status: WorkStatus,
  waitingOnPersonId?: string | null
) => {
  const actions: AIReviewActionHint[] = [];
  if (status !== "completed") {
    actions.push(action("complete", "Mark complete"));
  }
  if (status === "active") {
    actions.push(action("pause", "Pause"));
  }
  if (status !== "active") {
    actions.push(action("reactivate", "Reactivate"));
  }
  if (entityKind === "todo" || entityKind === "deadline") {
    actions.push(action("update_due_date", "Move due date"));
  }
  if (entityKind === "todo" && waitingOnPersonId) {
    actions.push(action("clear_waiting_on", "Clear waiting-on"));
  }
  if (entityKind === "project" || entityKind === "mission") {
    actions.push(action("open_focus_report", "Open focus report"));
  }
  return actions;
};

const projectContext = (snapshot: WorkSnapshot, projectId: string | null) => {
  const project = projectId
    ? snapshot.projects.find((candidate) => candidate.id === projectId) ?? null
    : null;
  const mission = project?.missionId
    ? snapshot.missions.find((candidate) => candidate.id === project.missionId) ?? null
    : null;
  return { project, mission };
};

const projectByLinkedDeadline = (snapshot: WorkSnapshot, deadline: DeadlineRecord) => {
  if (deadline.entityKind === "project" && deadline.entityId) {
    return snapshot.projects.find((project) => project.id === deadline.entityId) ?? null;
  }
  if (deadline.entityKind === "todo" && deadline.entityId) {
    const todo = snapshot.todos.find((candidate) => candidate.id === deadline.entityId);
    return todo?.projectId
      ? snapshot.projects.find((project) => project.id === todo.projectId) ?? null
      : null;
  }
  return null;
};

const personName = (snapshot: WorkSnapshot, personId: string | null | undefined) =>
  personId
    ? snapshot.people.find((person) => person.id === personId)?.name ?? null
    : null;

const todoItem = (
  snapshot: WorkSnapshot,
  todo: TodoRecord,
  rank: number,
  reasons: string[]
): AIReviewWorkItem => {
  const { project, mission } = projectContext(snapshot, todo.projectId);
  return {
    stableId: `todo:${todo.id}`,
    entityKind: "todo",
    entityId: todo.id,
    title: todo.title,
    status: todo.status,
    priority: todo.priority,
    rank,
    reasons,
    dueAt: todo.dueAt,
    projectId: project?.id ?? null,
    projectTitle: project?.title ?? null,
    missionId: mission?.id ?? null,
    missionTitle: mission?.title ?? null,
    waitingOnPersonId: todo.waitingOnPersonId,
    waitingOnPersonName: personName(snapshot, todo.waitingOnPersonId),
    estimatedMinutes: todo.estimatedMinutes,
    allowedFollowUpActions: workActions("todo", todo.status, todo.waitingOnPersonId),
  };
};

const deadlineItem = (
  snapshot: WorkSnapshot,
  deadline: DeadlineRecord,
  rank: number,
  reasons: string[]
): AIReviewWorkItem => {
  const project = projectByLinkedDeadline(snapshot, deadline);
  const mission = project?.missionId
    ? snapshot.missions.find((candidate) => candidate.id === project.missionId) ?? null
    : deadline.entityKind === "mission" && deadline.entityId
      ? snapshot.missions.find((candidate) => candidate.id === deadline.entityId) ?? null
      : null;
  return {
    stableId: `deadline:${deadline.id}`,
    entityKind: "deadline",
    entityId: deadline.id,
    title: deadline.title,
    status: deadline.status,
    priority: deadline.priority,
    rank,
    reasons,
    dueAt: deadline.dueAt,
    projectId: project?.id ?? null,
    projectTitle: project?.title ?? null,
    missionId: mission?.id ?? null,
    missionTitle: mission?.title ?? null,
    linkedEntityKind: deadline.entityKind,
    linkedEntityId: deadline.entityId,
    allowedFollowUpActions: workActions("deadline", deadline.status),
  };
};

const projectItem = (
  snapshot: WorkSnapshot,
  project: ProjectRecord,
  rank: number,
  reasons: string[]
): AIReviewWorkItem => {
  const mission = project.missionId
    ? snapshot.missions.find((candidate) => candidate.id === project.missionId) ?? null
    : null;
  return {
    stableId: `project:${project.id}`,
    entityKind: "project",
    entityId: project.id,
    title: project.title,
    status: project.status,
    priority: project.status === "blocked" ? "high" : "normal",
    rank,
    reasons,
    dueAt: project.dueAt,
    projectId: project.id,
    projectTitle: project.title,
    missionId: mission?.id ?? null,
    missionTitle: mission?.title ?? null,
    allowedFollowUpActions: workActions("project", project.status),
  };
};

const top = <T extends { rank: number; title?: string }>(items: T[], limit: number) =>
  [...items].sort((a, b) => a.rank - b.rank || (a.title ?? "").localeCompare(b.title ?? "")).slice(0, limit);

const buildOverdueDueSoon = (
  snapshot: WorkSnapshot,
  now: Date,
  dueSoonDays: number
) => {
  const todoItems = snapshot.todos
    .filter((todo) => isActive(todo.status))
    .flatMap((todo) => {
      const dueDays = daysUntil(todo.dueAt, now);
      if (dueDays === null || dueDays > dueSoonDays) {
        return [];
      }
      const reasons = [
        dueDays < 0
          ? `${Math.abs(dueDays)} day${Math.abs(dueDays) === 1 ? "" : "s"} overdue`
          : dueDays === 0
            ? "due today"
            : `due in ${dueDays} day${dueDays === 1 ? "" : "s"}`,
      ];
      return [todoItem(snapshot, todo, (dueDays < 0 ? dueDays : dueDays + 5) + priorityWeight[todo.priority], reasons)];
    });

  const deadlineItems = snapshot.deadlines
    .filter((deadline) => isActive(deadline.status))
    .flatMap((deadline) => {
      const dueDays = daysUntil(deadline.dueAt, now);
      if (dueDays === null || dueDays > dueSoonDays) {
        return [];
      }
      const reasons = [
        dueDays < 0
          ? `${Math.abs(dueDays)} day${Math.abs(dueDays) === 1 ? "" : "s"} overdue`
          : dueDays === 0
            ? "due today"
            : `due in ${dueDays} day${dueDays === 1 ? "" : "s"}`,
      ];
      return [
        deadlineItem(
          snapshot,
          deadline,
          (dueDays < 0 ? dueDays : dueDays + 5) + priorityWeight[deadline.priority],
          reasons
        ),
      ];
    });

  const items = top([...todoItems, ...deadlineItems], 8);
  return {
    overdueCount: [...todoItems, ...deadlineItems].filter((item) =>
      item.reasons.some((reason) => reason.includes("overdue"))
    ).length,
    dueSoonCount: [...todoItems, ...deadlineItems].filter((item) =>
      !item.reasons.some((reason) => reason.includes("overdue"))
    ).length,
    items,
  };
};

const buildQuickWins = (snapshot: WorkSnapshot, now: Date) => {
  const items = snapshot.todos
    .filter(
      (todo) =>
        todo.status === "active" &&
        todo.quickAction &&
        !todo.waitingOnPersonId &&
        (todo.estimatedMinutes === null || todo.estimatedMinutes <= 20)
    )
    .map((todo) => {
      const dueDays = daysUntil(todo.dueAt, now);
      const estimate = todo.estimatedMinutes ?? 20;
      const reasons = [
        todo.estimatedMinutes ? `${todo.estimatedMinutes} minute estimate` : "quick action",
        dueDays !== null && dueDays <= 0 ? "urgent timing" : null,
      ].filter((reason): reason is string => Boolean(reason));
      return todoItem(snapshot, todo, estimate + priorityWeight[todo.priority], reasons);
    });

  return {
    itemCount: items.length,
    items: top(items, 5),
  };
};

const buildWaitingOn = (snapshot: WorkSnapshot, now: Date) => {
  const items = snapshot.todos
    .filter((todo) => isActive(todo.status) && Boolean(todo.waitingOnPersonId))
    .map((todo) => {
      const staleDays = Math.max(daysSince(todo.updatedAt, now) ?? 0, 0);
      const reasons = [
        `waiting on ${personName(snapshot, todo.waitingOnPersonId) ?? "someone"}`,
        staleDays > 0 ? `unchanged for ${staleDays} day${staleDays === 1 ? "" : "s"}` : null,
      ].filter((reason): reason is string => Boolean(reason));
      return todoItem(snapshot, todo, priorityWeight[todo.priority] - Math.min(staleDays, 30), reasons);
    });

  return {
    waitingCount: items.length,
    items: top(items, 6),
  };
};

const buildStaleProjects = (
  snapshot: WorkSnapshot,
  now: Date,
  staleProjectDays: number
) => {
  const items = snapshot.projects
    .filter((project) => project.status !== "completed")
    .flatMap((project) => {
      const staleDays = daysSince(project.updatedAt, now) ?? 0;
      const isStale = staleDays >= staleProjectDays || project.status === "paused" || project.status === "blocked";
      if (!isStale) {
        return [];
      }
      const reasons = [
        staleDays >= staleProjectDays
          ? `unchanged for ${staleDays} day${staleDays === 1 ? "" : "s"}`
          : null,
        project.status === "paused" || project.status === "blocked" ? project.status : null,
      ].filter((reason): reason is string => Boolean(reason));
      return [
        projectItem(
          snapshot,
          project,
          (project.status === "blocked" ? 0 : project.status === "paused" ? 10 : 20) - staleDays,
          reasons
        ),
      ];
    });

  return {
    staleCount: items.length,
    items: top(items, 6),
  };
};

const buildCalendarPressure = (snapshot: WorkSnapshot, now: Date, dueSoonDays: number) => {
  const items = snapshot.appointments
    .flatMap((appointment: AppointmentRecord) => {
      const startsIn = daysUntil(appointment.startsAt, now);
      if (startsIn === null || startsIn < 0 || startsIn > dueSoonDays) {
        return [];
      }
      return [
        {
          stableId: `appointment:${appointment.id}`,
          appointmentId: appointment.id,
          title: appointment.title,
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          allDay: appointment.allDay,
          sourceSystem: appointment.sourceSystem,
          rank: startsIn,
          reasons: [startsIn === 0 ? "today" : `in ${startsIn} day${startsIn === 1 ? "" : "s"}`],
        },
      ];
    });
  return {
    appointmentCount: items.length,
    items: top(items, 6),
  };
};

const buildReviewInbox = (
  suggestions: EmailSuggestionRecord[],
  now: Date
) => {
  const items = suggestions
    .filter((suggestion) => suggestion.status === "pending")
    .map((suggestion) => {
      const dueDays = daysUntil(suggestion.dueAt, now);
      return {
        stableId: `review_inbox:${suggestion.id}`,
        suggestionId: suggestion.id,
        title: suggestion.title,
        suggestedEntityKind: suggestion.suggestedEntityKind,
        reason: suggestion.reason,
        confidence: suggestion.confidence,
        dueAt: suggestion.dueAt,
        sourceSystem: suggestion.sourceSystem,
        receivedAt: suggestion.receivedAt,
        matchedPersonId: suggestion.matchedPersonId,
        matchedPersonName: suggestion.matchedPersonName,
        rank: (dueDays ?? 30) - Math.round(suggestion.confidence * 10),
        allowedFollowUpActions: [
          suggestion.suggestedEntityKind === "project"
            ? action("review_inbox_accept_project", "Create project from suggestion")
            : action("review_inbox_accept_todo", "Create todo from suggestion"),
          action("review_inbox_dismiss", "Dismiss suggestion"),
        ],
      };
    });

  return {
    pendingCount: items.length,
    items: top(items, 6),
  };
};

const buildRecentCloseout = (snapshot: WorkSnapshot, now: Date) => {
  const changedTodos = snapshot.todos
    .filter((todo) => (daysSince(todo.updatedAt, now) ?? 99) === 0)
    .map((todo) =>
      todoItem(snapshot, todo, todo.status === "completed" ? 10 : 20 + priorityWeight[todo.priority], [
        todo.status === "completed" ? "completed today" : "changed today",
      ])
    );
  return {
    changedTodayCount: changedTodos.length,
    completedTodayCount: changedTodos.filter((item) => item.status === "completed").length,
    items: top(changedTodos, 6),
  };
};

const buildEmailHealth = (connections: EmailConnectionRecord[]) => {
  const syncedAtValues = connections
    .map((connection) => connection.lastSyncedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latestSyncAt = syncedAtValues.length > 0 ? syncedAtValues[syncedAtValues.length - 1] : null;
  return {
    connectionCount: connections.length,
    readyCount: connections.filter((connection) => connection.authStatus === "ready").length,
    blockedCount: connections.filter((connection) => connection.syncStatus === "blocked").length,
    errorCount: connections.filter(
      (connection) => connection.authStatus === "error" || connection.syncStatus === "error"
    ).length,
    latestSyncAt,
  };
};

const fallbackSummary = (
  overdueDueSoon: AIReviewContextPacket["overdueDueSoon"],
  waitingOn: AIReviewContextPacket["waitingOn"],
  quickWins: AIReviewContextPacket["quickWins"],
  reviewInbox: AIReviewContextPacket["reviewInbox"],
  calendarPressure: AIReviewContextPacket["calendarPressure"]
) => {
  const bullets = [
    overdueDueSoon.overdueCount > 0
      ? `${overdueDueSoon.overdueCount} overdue item${overdueDueSoon.overdueCount === 1 ? "" : "s"}`
      : `${overdueDueSoon.dueSoonCount} due-soon item${overdueDueSoon.dueSoonCount === 1 ? "" : "s"}`,
    `${quickWins.itemCount} quick win${quickWins.itemCount === 1 ? "" : "s"}`,
    `${waitingOn.waitingCount} waiting-on item${waitingOn.waitingCount === 1 ? "" : "s"}`,
    `${reviewInbox.pendingCount} Review Inbox suggestion${reviewInbox.pendingCount === 1 ? "" : "s"}`,
    `${calendarPressure.appointmentCount} upcoming appointment${calendarPressure.appointmentCount === 1 ? "" : "s"}`,
  ];
  const nextBestAction =
    overdueDueSoon.items[0]?.title ??
    quickWins.items[0]?.title ??
    reviewInbox.items[0]?.title ??
    "Review the daily status report.";

  return {
    headline: "AI Task Review context packet is ready from local structured data.",
    bullets,
    nextBestAction,
  };
};

export const buildAIReviewContextPacket = ({
  snapshot,
  emailSuggestions = [],
  emailConnections = [],
  storage = null,
  generatedAt = new Date().toISOString(),
  staleProjectDays = 14,
  dueSoonDays = 2,
}: BuildAIReviewContextPacketInput): AIReviewContextPacket => {
  const now = new Date(generatedAt);
  const localDate = startOfDay(now).toISOString().slice(0, 10);
  const calendarPressure = buildCalendarPressure(snapshot, now, dueSoonDays);
  const reviewInbox = buildReviewInbox(emailSuggestions, now);
  const staleProjects = buildStaleProjects(snapshot, now, staleProjectDays);
  const waitingOn = buildWaitingOn(snapshot, now);
  const overdueDueSoon = buildOverdueDueSoon(snapshot, now, dueSoonDays);
  const quickWins = buildQuickWins(snapshot, now);
  const recentCloseoutChanges = buildRecentCloseout(snapshot, now);

  return {
    schemaVersion: 1,
    generatedAt,
    localDate,
    fallbackSummary: fallbackSummary(
      overdueDueSoon,
      waitingOn,
      quickWins,
      reviewInbox,
      calendarPressure
    ),
    workGraph: {
      activeMissionCount: snapshot.missions.filter((mission) => mission.status !== "completed").length,
      activeProjectCount: snapshot.projects.filter((project) => project.status !== "completed").length,
      activeTodoCount: snapshot.todos.filter((todo) => todo.status !== "completed").length,
      activeDeadlineCount: snapshot.deadlines.filter((deadline) => deadline.status !== "completed").length,
      peopleCount: snapshot.people.length,
    },
    calendarPressure,
    reviewInbox,
    staleProjects,
    waitingOn,
    overdueDueSoon,
    quickWins,
    recentCloseoutChanges,
    serviceHealth: {
      storage,
      email: buildEmailHealth(emailConnections),
    },
  };
};
