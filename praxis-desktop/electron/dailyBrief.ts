import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  DailyBrief,
  DailyBriefItem,
  FocusReport,
  FocusReportKind,
} from "../shared/dailyBrief";
import {
  buildDailyBriefFocusItems,
  buildDailyBriefFromSnapshot,
} from "../shared/dailyBriefBuilder";
import { listPendingEmailSuggestions } from "./emailRepository";
import { resolveMemoryRoot } from "./praxisDb";
import { getWorkSnapshot } from "./workRepository";

const focusPeople = (
  snapshot: ReturnType<typeof getWorkSnapshot>,
  entityKind: FocusReportKind,
  entityId: string,
  childProjectIds: Set<string> = new Set()
) => {
  const personById = new Map(snapshot.people.map((person) => [person.id, person]));
  const seen = new Set<string>();
  return snapshot.personWorkLinks
    .filter((link) => {
      if (link.entityKind === entityKind && link.entityId === entityId) {
        return true;
      }
      return entityKind === "mission" && link.entityKind === "project" && childProjectIds.has(link.entityId);
    })
    .map((link) => {
      const person = personById.get(link.personId);
      if (!person) {
        return null;
      }
      const key = `${person.id}:${link.relationship}`;
      if (seen.has(key)) {
        return null;
      }
      seen.add(key);
      return {
        personId: person.id,
        name: person.name,
        relationship: link.relationship,
      };
    })
    .filter((person): person is NonNullable<typeof person> => Boolean(person))
    .sort((a, b) => a.relationship.localeCompare(b.relationship) || a.name.localeCompare(b.name))
    .slice(0, 8);
};

const formatDue = (value: string | null) => value ?? "none";

const formatLocalTime = (value: string | null | undefined) => {
  if (!value) {
    return "none";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatAppointmentWindow = (item: DailyBriefItem) => {
  if (item.entityKind !== "appointment") {
    return "none";
  }
  if (item.allDay) {
    return "all day";
  }

  const start = formatLocalTime(item.startsAt ?? item.dueAt);
  const end = formatLocalTime(item.endsAt);
  return end === "none" ? start : `${start}-${end}`;
};

const formatBriefItem = (item: DailyBriefItem) =>
  `- ${item.title}
  - kind: ${item.entityKind}
  - reason: ${item.reason}
  - priority: ${item.priority}
  - due: ${formatDue(item.dueAt)}
  - time: ${formatAppointmentWindow(item)}
  - source: ${item.sourceSystem ?? "none"}
  - waiting_on: ${item.waitingOnPersonName ?? "none"}
  - status: ${item.status}`;

const writeDailyBriefMarkdown = (brief: DailyBrief) => {
  const memoryRoot = resolveMemoryRoot();
  const relativePath = `daily/${brief.localDate}.md`;
  const targetPath = path.join(memoryRoot, relativePath);
  const body = `# Daily Note - ${brief.localDate}

## Spoken Brief

${brief.spokenBrief}

## Priority Order

${brief.priorityItems.length > 0 ? brief.priorityItems.map(formatBriefItem).join("\n") : "- No priority work recorded yet."}

## Appointments

${brief.appointments.length > 0 ? brief.appointments.map(formatBriefItem).join("\n") : "- No appointments recorded for today or tomorrow."}

## Deadlines

${brief.deadlines.length > 0 ? brief.deadlines.map(formatBriefItem).join("\n") : "- No active deadlines recorded yet."}

## Waiting On You

${brief.todos.length > 0 ? brief.todos.map(formatBriefItem).join("\n") : "- No active todos recorded yet."}

## Money Items

${brief.moneyItems.length > 0 ? brief.moneyItems.map(formatBriefItem).join("\n") : "- No money-related todos recorded yet."}

## Recommended Next Move

- directive: ${brief.recommendedMove.directive}
- rationale: ${brief.recommendedMove.rationale}
- action_hint: ${brief.recommendedMove.actionHint}
- item: ${brief.recommendedMove.item ? `${brief.recommendedMove.item.entityKind}:${brief.recommendedMove.item.id}` : "none"}

## Closeout

- summary: ${brief.closeout.summary}
- changed_today: ${brief.closeout.changedTodayCount}
- completed_today: ${brief.closeout.completedTodayCount}
- waiting_on: ${brief.closeout.waitingOnCount}
- overdue: ${brief.closeout.overdueCount}
- due_today: ${brief.closeout.dueTodayCount}
- move_or_decide: ${brief.closeout.moveTomorrowCandidates.join(", ") || "none"}

## There Is More

- yes_or_no: ${brief.thereIsMore ? "yes" : "no"}
- follow_up_topics: ${brief.followUpTopics.join(", ") || "none"}
`;

  if (!existsSync(path.dirname(targetPath))) {
    mkdirSync(path.dirname(targetPath), { recursive: true });
  }
  writeFileSync(targetPath, body, "utf8");
  return relativePath;
};

export const generateDailyBrief = (): DailyBrief => {
  const snapshot = getWorkSnapshot();
  const emailSuggestions = listPendingEmailSuggestions();
  const briefWithoutPath = buildDailyBriefFromSnapshot(snapshot, emailSuggestions.length);
  const markdownPath = writeDailyBriefMarkdown({ ...briefWithoutPath, markdownPath: "" });

  return {
    ...briefWithoutPath,
    markdownPath,
  };
};

export const generateFocusReport = (
  entityKind: FocusReportKind,
  entityId: string
): FocusReport | null => {
  const now = new Date();
  const snapshot = getWorkSnapshot();
  const personNameById = new Map(snapshot.people.map((person) => [person.id, person.name]));

  if (entityKind === "mission") {
    const mission = snapshot.missions.find((candidate) => candidate.id === entityId);
    if (!mission) {
      return null;
    }

    const projects = snapshot.projects.filter(
      (project) => project.missionId === mission.id && project.status !== "completed"
    );
    const projectIds = new Set(projects.map((project) => project.id));
    const todos = snapshot.todos.filter(
      (todo) => todo.status !== "completed" && todo.projectId && projectIds.has(todo.projectId)
    );
    const deadlines = snapshot.deadlines.filter(
      (deadline) =>
        deadline.status !== "completed" &&
        ((deadline.entityKind === "mission" && deadline.entityId === mission.id) ||
          (deadline.entityKind === "project" && deadline.entityId && projectIds.has(deadline.entityId)) ||
          (deadline.entityKind === "todo" &&
            deadline.entityId &&
            todos.some((todo) => todo.id === deadline.entityId)))
    );
    const focusItems = buildDailyBriefFocusItems(deadlines, todos, now, personNameById);
    const topItems = focusItems.slice(0, 6);
    const people = focusPeople(snapshot, "mission", mission.id, projectIds);

    return {
      entityKind,
      entityId,
      title: mission.title,
      summary:
        mission.summary ??
        `${mission.title} has ${projects.length} active project${projects.length === 1 ? "" : "s"} and ${todos.length} active todo${todos.length === 1 ? "" : "s"}.`,
      status: mission.status,
      dueAt: mission.dueAt,
      activeProjectCount: projects.length,
      activeTodoCount: todos.length,
      upcomingDeadlineCount: deadlines.length,
      people,
      topItems,
      detailItems: focusItems,
      markdownPath: mission.markdownPath,
    };
  }

  const project = snapshot.projects.find((candidate) => candidate.id === entityId);
  if (!project) {
    return null;
  }

  const todos = snapshot.todos.filter(
    (todo) => todo.status !== "completed" && todo.projectId === project.id
  );
  const deadlines = snapshot.deadlines.filter(
    (deadline) =>
      deadline.status !== "completed" &&
      ((deadline.entityKind === "project" && deadline.entityId === project.id) ||
        (deadline.entityKind === "todo" &&
          deadline.entityId &&
          todos.some((todo) => todo.id === deadline.entityId)))
  );
  const focusItems = buildDailyBriefFocusItems(deadlines, todos, now, personNameById);
  const topItems = focusItems.slice(0, 6);
  const people = focusPeople(snapshot, "project", project.id);

  return {
    entityKind,
    entityId,
    title: project.title,
    summary:
      project.summary ??
      `${project.title} has ${todos.length} active todo${todos.length === 1 ? "" : "s"}.`,
    status: project.status,
    dueAt: project.dueAt,
    activeProjectCount: 0,
    activeTodoCount: todos.length,
    upcomingDeadlineCount: deadlines.length,
    people,
    topItems,
    detailItems: focusItems,
    markdownPath: project.markdownPath,
  };
};
