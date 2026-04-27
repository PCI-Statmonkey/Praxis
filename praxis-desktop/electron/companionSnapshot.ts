import type {
  CompanionSnapshot,
  CompanionSnapshotAppointment,
  CompanionSnapshotEmailFollowUp,
  CompanionSnapshotFocusTarget,
  CompanionSnapshotIntegrationStatus,
  CompanionSnapshotPerson,
  CompanionSnapshotWorkItem,
} from "../shared/companionSnapshot";
import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
} from "../shared/workModel";
import { listPendingEmailSuggestions } from "./emailRepository";
import { getSettingsSnapshot } from "./settingsRepository";
import { getWorkSnapshot } from "./workRepository";

const DAY_MS = 24 * 60 * 60 * 1000;

const priorityWeight: Record<WorkPriority, number> = {
  critical: 0,
  high: 10,
  normal: 20,
  low: 30,
};

const formatLocalDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const daysUntil = (value: string | null, now: Date) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.floor((startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / DAY_MS);
};

const dueReason = (dueAt: string | null, now: Date) => {
  const days = daysUntil(dueAt, now);
  if (days === null) {
    return "No deadline recorded";
  }
  if (days < 0) {
    return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
  }
  if (days === 0) {
    return "Due today";
  }
  if (days === 1) {
    return "Due tomorrow";
  }
  return `Due in ${days} days`;
};

const workRank = (dueAt: string | null, priority: WorkPriority, now: Date) => {
  const days = daysUntil(dueAt, now);
  const base = priorityWeight[priority];
  if (days === null) {
    return 90 + base;
  }
  if (days < 0) {
    return base;
  }
  if (days === 0) {
    return 5 + base;
  }
  if (days === 1) {
    return 15 + base;
  }
  if (days <= 7) {
    return 30 + days + base;
  }
  return 70 + Math.min(days, 30) + base;
};

const appointmentRank = (appointment: AppointmentRecord, now: Date) => {
  const starts = new Date(appointment.startsAt);
  const days = daysUntil(appointment.startsAt, now);
  if (Number.isNaN(starts.getTime()) || days === null) {
    return 100;
  }
  if (days === 0 && appointment.allDay) {
    return -100;
  }
  if (days === 0) {
    return -80 + Math.max(0, starts.getTime() - now.getTime()) / DAY_MS;
  }
  if (days === 1) {
    return 12;
  }
  return 85;
};

const sortByRank = <T extends { rank: number; title?: string }>(items: T[]) =>
  [...items].sort((a, b) => a.rank - b.rank || (a.title ?? "").localeCompare(b.title ?? ""));

const toAppointment = (
  appointment: AppointmentRecord,
  now: Date
): CompanionSnapshotAppointment & { rank: number } => ({
  id: appointment.id,
  entityKind: "appointment",
  title: appointment.title,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  allDay: appointment.allDay,
  sourceSystem: appointment.sourceSystem,
  rank: appointmentRank(appointment, now),
});

const toMissionItem = (
  mission: MissionRecord,
  now: Date
): CompanionSnapshotWorkItem => ({
  id: mission.id,
  entityKind: "mission",
  title: mission.title,
  status: mission.status,
  priority: "normal",
  dueAt: mission.dueAt,
  reason: dueReason(mission.dueAt, now),
  rank: workRank(mission.dueAt, "normal", now) + 20,
});

const toProjectItem = (
  project: ProjectRecord,
  now: Date
): CompanionSnapshotWorkItem => ({
  id: project.id,
  entityKind: "project",
  title: project.title,
  status: project.status,
  priority: "normal",
  dueAt: project.dueAt,
  reason: dueReason(project.dueAt, now),
  rank: workRank(project.dueAt, "normal", now) + 10,
  missionId: project.missionId,
});

const toTodoItem = (
  todo: TodoRecord,
  now: Date,
  personNameById: Map<string, string>
): CompanionSnapshotWorkItem => ({
  id: todo.id,
  entityKind: "todo",
  title: todo.title,
  status: todo.status,
  priority: todo.priority,
  dueAt: todo.dueAt,
  reason: todo.quickAction
    ? `Quick action${todo.estimatedMinutes ? `, about ${todo.estimatedMinutes} minutes` : ""}`
    : dueReason(todo.dueAt, now),
  rank:
    workRank(todo.dueAt, todo.priority, now) +
    (todo.moneyRelated ? -4 : 0) +
    (todo.quickAction ? -6 : 0) +
    Math.min(todo.estimatedMinutes ?? 60, 60) / 60,
  projectId: todo.projectId,
  waitingOnPersonName: todo.waitingOnPersonId ? personNameById.get(todo.waitingOnPersonId) ?? null : null,
  moneyRelated: todo.moneyRelated,
  quickAction: todo.quickAction,
});

const toDeadlineItem = (
  deadline: DeadlineRecord,
  now: Date
): CompanionSnapshotWorkItem => ({
  id: deadline.id,
  entityKind: "deadline",
  title: deadline.title,
  status: deadline.status,
  priority: deadline.priority,
  dueAt: deadline.dueAt,
  reason: dueReason(deadline.dueAt, now),
  rank: workRank(deadline.dueAt, deadline.priority, now) - 2,
});

const stripAppointmentRank = (
  appointment: CompanionSnapshotAppointment & { rank: number }
): CompanionSnapshotAppointment => ({
  id: appointment.id,
  entityKind: appointment.entityKind,
  title: appointment.title,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  allDay: appointment.allDay,
  sourceSystem: appointment.sourceSystem,
});

const buildFocusTargets = (
  missions: MissionRecord[],
  projects: ProjectRecord[],
  todos: TodoRecord[]
): CompanionSnapshotFocusTarget[] => {
  const activeProjectsByMission = new Map<string, number>();
  const activeTodosByProject = new Map<string, number>();

  for (const project of projects) {
    if (project.status === "completed" || !project.missionId) {
      continue;
    }
    activeProjectsByMission.set(
      project.missionId,
      (activeProjectsByMission.get(project.missionId) ?? 0) + 1
    );
  }

  for (const todo of todos) {
    if (todo.status === "completed" || !todo.projectId) {
      continue;
    }
    activeTodosByProject.set(todo.projectId, (activeTodosByProject.get(todo.projectId) ?? 0) + 1);
  }

  const missionTargets = missions
    .filter((mission) => mission.status !== "completed")
    .map((mission) => ({
      id: mission.id,
      entityKind: "mission" as const,
      title: mission.title,
      status: mission.status,
      dueAt: mission.dueAt,
      activeChildCount: activeProjectsByMission.get(mission.id) ?? 0,
      markdownPath: mission.markdownPath,
    }));

  const projectTargets = projects
    .filter((project) => project.status !== "completed")
    .map((project) => ({
      id: project.id,
      entityKind: "project" as const,
      title: project.title,
      status: project.status,
      dueAt: project.dueAt,
      activeChildCount: activeTodosByProject.get(project.id) ?? 0,
      markdownPath: project.markdownPath,
    }));

  return [...missionTargets, ...projectTargets]
    .sort((a, b) => b.activeChildCount - a.activeChildCount || a.title.localeCompare(b.title))
    .slice(0, 12);
};

const buildHighlightedPeople = (
  snapshot: ReturnType<typeof getWorkSnapshot>
): CompanionSnapshotPerson[] => {
  const activeEntityIds = new Set([
    ...snapshot.missions.filter((mission) => mission.status !== "completed").map((mission) => mission.id),
    ...snapshot.projects.filter((project) => project.status !== "completed").map((project) => project.id),
  ]);
  const relationshipCountByPerson = new Map<string, number>();
  for (const link of snapshot.personWorkLinks) {
    if (activeEntityIds.has(link.entityId)) {
      relationshipCountByPerson.set(
        link.personId,
        (relationshipCountByPerson.get(link.personId) ?? 0) + 1
      );
    }
  }

  return snapshot.people
    .map((person) => ({
      id: person.id,
      name: person.name,
      roleSummary: person.roleSummary,
      emailAvailable: Boolean(person.email),
      phoneAvailable: Boolean(person.phone),
      billingAddressAvailable: Boolean(person.billingAddress),
      activeRelationshipCount: relationshipCountByPerson.get(person.id) ?? 0,
    }))
    .filter(
      (person) =>
        person.activeRelationshipCount > 0 ||
        person.emailAvailable ||
        person.phoneAvailable ||
        person.billingAddressAvailable
    )
    .sort((a, b) => b.activeRelationshipCount - a.activeRelationshipCount || a.name.localeCompare(b.name))
    .slice(0, 12);
};

const buildIntegrations = (): CompanionSnapshotIntegrationStatus[] => {
  const settings = getSettingsSnapshot();
  return [
    ...settings.calendarConnections.map((connection) => ({
      kind: "calendar" as const,
      id: connection.id,
      provider: connection.provider,
      label: connection.label,
      enabled: connection.enabled,
      authStatus: connection.authStatus,
      syncStatus: connection.syncStatus,
      lastSyncedAt: connection.lastSyncedAt,
    })),
    ...settings.emailConnections.map((connection) => ({
      kind: "email" as const,
      id: connection.id,
      provider: connection.provider,
      label: connection.label,
      enabled: connection.enabled,
      authStatus: connection.authStatus,
      syncStatus: connection.syncStatus,
      lastSyncedAt: connection.lastSyncedAt,
    })),
  ];
};

const buildEmailFollowUps = (): CompanionSnapshotEmailFollowUp[] => {
  const suggestions = listPendingEmailSuggestions();
  return suggestions
    .map((suggestion) => ({
      id: suggestion.id,
      title: suggestion.title,
      suggestedEntityKind: suggestion.suggestedEntityKind,
      reason: suggestion.reason,
      dueAt: suggestion.dueAt,
      receivedAt: suggestion.receivedAt,
      sourceSystem: suggestion.sourceSystem,
      matchedPersonName: suggestion.matchedPersonName,
    }))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, 8);
};

export const getCompanionSnapshot = (): CompanionSnapshot => {
  const now = new Date();
  const snapshot = getWorkSnapshot();
  const personNameById = new Map(snapshot.people.map((person) => [person.id, person.name]));
  const activeMissions = snapshot.missions.filter((mission) => mission.status !== "completed");
  const activeProjects = snapshot.projects.filter((project) => project.status !== "completed");
  const activeTodos = snapshot.todos.filter((todo) => todo.status !== "completed");
  const activeDeadlines = snapshot.deadlines.filter((deadline) => deadline.status !== "completed");
  const todaysAppointments = sortByRank(
    snapshot.appointments
      .filter((appointment) => {
        const days = daysUntil(appointment.startsAt, now);
        return days !== null && days >= 0 && days <= 1;
      })
      .map((appointment) => toAppointment(appointment, now))
  ).slice(0, 8);
  const workItems = sortByRank([
    ...activeDeadlines.map((deadline) => toDeadlineItem(deadline, now)),
    ...activeTodos.map((todo) => toTodoItem(todo, now, personNameById)),
    ...activeProjects.map((project) => toProjectItem(project, now)),
    ...activeMissions.map((mission) => toMissionItem(mission, now)),
  ]).slice(0, 12);
  const topAppointment = todaysAppointments[0];
  const topWorkItem = workItems[0] ?? null;
  const pendingEmailFollowUps = buildEmailFollowUps();

  return {
    schemaVersion: "companion.snapshot.v1",
    version: 1,
    generatedAt: now.toISOString(),
    localDate: formatLocalDate(now),
    source: "praxis-home-node",
    capability: {
      readOnly: true,
      commandsAccepted: true,
      explicitCommandOnly: true,
      directStorageAccess: false,
      notes: "Companion clients may request snapshots and submit explicit assistant commands. They cannot directly read or mutate SQLite, markdown memory, or secrets.",
    },
    summary: {
      activeMissionCount: activeMissions.length,
      activeProjectCount: activeProjects.length,
      activeTodoCount: activeTodos.length,
      activeDeadlineCount: activeDeadlines.length,
      waitingOnCount: activeTodos.filter((todo) => Boolean(todo.waitingOnPersonId)).length,
      blockedCount: [...activeMissions, ...activeProjects, ...activeTodos, ...activeDeadlines].filter(
        (item) => item.status === "blocked"
      ).length,
      pausedCount: [...activeMissions, ...activeProjects, ...activeTodos, ...activeDeadlines].filter(
        (item) => item.status === "paused"
      ).length,
      moneyRelatedCount: activeTodos.filter((todo) => todo.moneyRelated).length,
      quickActionCount: activeTodos.filter((todo) => todo.quickAction).length,
    },
    topMove:
      topAppointment && (!topWorkItem || topAppointment.rank <= topWorkItem.rank)
        ? stripAppointmentRank(topAppointment)
        : topWorkItem,
    today: {
      appointments: todaysAppointments.map(stripAppointmentRank),
      workItems,
    },
    focusTargets: buildFocusTargets(snapshot.missions, snapshot.projects, snapshot.todos),
    people: {
      totalCount: snapshot.people.length,
      highlighted: buildHighlightedPeople(snapshot),
    },
    inbox: {
      pendingEmailFollowUpCount: listPendingEmailSuggestions().length,
      latestEmailFollowUps: pendingEmailFollowUps,
    },
    integrations: buildIntegrations(),
  };
};
