import type {
  DailyBrief,
  DailyBriefItem,
  DailyBriefRecommendedMove,
} from "./dailyBrief";
import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
  WorkSnapshot,
} from "./workModel";

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

const isSameLocalDay = (value: string | null | undefined, date: Date) => {
  if (!value) {
    return false;
  }
  const candidate = new Date(value);
  if (Number.isNaN(candidate.getTime())) {
    return false;
  }
  return startOfLocalDay(candidate).getTime() === startOfLocalDay(date).getTime();
};

const daysUntil = (dueAt: string | null, now: Date) => {
  if (!dueAt) {
    return null;
  }

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return null;
  }

  return Math.floor((startOfLocalDay(due).getTime() - startOfLocalDay(now).getTime()) / DAY_MS);
};

const minutesUntil = (startsAt: string, now: Date) => {
  const starts = new Date(startsAt);
  if (Number.isNaN(starts.getTime())) {
    return null;
  }
  return Math.round((starts.getTime() - now.getTime()) / (60 * 1000));
};

const timeGreeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

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

const dueRank = (dueAt: string | null, priority: WorkPriority, now: Date) => {
  const days = daysUntil(dueAt, now);
  const base = priorityWeight[priority];
  if (days === null) {
    return 80 + base;
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
  return 60 + Math.min(days, 30) + base;
};

const appointmentReason = (appointment: AppointmentRecord, now: Date) => {
  const days = daysUntil(appointment.startsAt, now);
  const minutes = minutesUntil(appointment.startsAt, now);
  const time = appointment.allDay ? "" : ` at ${formatLocalTime(appointment.startsAt)}`;
  if (days === 0 && appointment.allDay) {
    return "Appointment today";
  }
  if (days === 0 && minutes !== null && minutes >= 0) {
    if (minutes < 60) {
      return `Appointment in ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }
    const hours = Math.round(minutes / 60);
    return `Appointment in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  if (days === 0) {
    return `Appointment today${time}`;
  }
  if (days === 1) {
    return `Appointment tomorrow${time}`;
  }
  return `Upcoming appointment${time}`;
};

const appointmentRank = (appointment: AppointmentRecord, now: Date) => {
  const days = daysUntil(appointment.startsAt, now);
  const minutes = minutesUntil(appointment.startsAt, now);
  if (days === 0 && appointment.allDay) {
    return -100;
  }
  if (days === 0 && minutes !== null && minutes >= 0) {
    return -90 + Math.min(minutes, 720) / 720;
  }
  if (days === 0) {
    return -80;
  }
  if (days === 1) {
    return 12;
  }
  return 75;
};

const toAppointmentItem = (appointment: AppointmentRecord, now: Date): DailyBriefItem => ({
  id: appointment.id,
  entityKind: "appointment",
  title: appointment.title,
  reason: appointmentReason(appointment, now),
  dueAt: appointment.startsAt,
  priority: "high",
  status: "active",
  rank: appointmentRank(appointment, now),
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  allDay: appointment.allDay,
  sourceSystem: appointment.sourceSystem,
  notes: appointment.notes ?? null,
});

const toDeadlineItem = (deadline: DeadlineRecord, now: Date): DailyBriefItem => ({
  id: deadline.id,
  entityKind: "deadline",
  title: deadline.title,
  reason: dueReason(deadline.dueAt, now),
  dueAt: deadline.dueAt,
  priority: deadline.priority,
  status: deadline.status,
  rank: dueRank(deadline.dueAt, deadline.priority, now),
});

const toTodoItem = (
  todo: TodoRecord,
  now: Date,
  personNameById: Map<string, string> = new Map()
): DailyBriefItem => ({
  id: todo.id,
  entityKind: "todo",
  title: todo.title,
  reason: todo.quickAction
    ? `Quick action${todo.estimatedMinutes ? `, about ${todo.estimatedMinutes} minutes` : ""}`
    : todo.dueAt
      ? dueReason(todo.dueAt, now)
      : "Active todo",
  dueAt: todo.dueAt,
  priority: todo.priority,
  status: todo.status,
  waitingOnPersonName: todo.waitingOnPersonId ? personNameById.get(todo.waitingOnPersonId) ?? null : null,
  rank:
    dueRank(todo.dueAt, todo.priority, now) +
    (todo.moneyRelated ? -4 : 0) +
    (todo.quickAction ? -6 : 0) +
    Math.min(todo.estimatedMinutes ?? 60, 60) / 60,
});

const isChangedToday = (
  record: Pick<MissionRecord | ProjectRecord | TodoRecord | DeadlineRecord, "createdAt" | "updatedAt">,
  now: Date
) =>
  isSameLocalDay(record.updatedAt, now) &&
  new Date(record.updatedAt).getTime() !== new Date(record.createdAt).getTime();

const buildCloseoutSummary = (
  snapshot: WorkSnapshot,
  activeDeadlines: DeadlineRecord[],
  activeTodos: TodoRecord[],
  now: Date,
  personNameById: Map<string, string>
) => {
  const changedTodayCount = [
    ...snapshot.missions,
    ...snapshot.projects,
    ...snapshot.todos,
    ...snapshot.deadlines,
  ].filter((record) => isChangedToday(record, now)).length;
  const completedTodayCount = [
    ...snapshot.missions,
    ...snapshot.projects,
    ...snapshot.todos,
    ...snapshot.deadlines,
  ].filter(
    (record) => record.status === "completed" && isSameLocalDay(record.updatedAt, now)
  ).length;
  const waitingOnCount = activeTodos.filter((todo) => Boolean(todo.waitingOnPersonId)).length;
  const overdueCount =
    activeDeadlines.filter((deadline) => daysUntil(deadline.dueAt, now) !== null && daysUntil(deadline.dueAt, now)! < 0).length +
    activeTodos.filter((todo) => daysUntil(todo.dueAt, now) !== null && daysUntil(todo.dueAt, now)! < 0).length;
  const dueTodayCount =
    activeDeadlines.filter((deadline) => daysUntil(deadline.dueAt, now) === 0).length +
    activeTodos.filter((todo) => daysUntil(todo.dueAt, now) === 0).length;
  const moveTomorrowCandidates = topDailyBriefItems(
    [
      ...activeDeadlines
        .filter((deadline) => {
          const days = daysUntil(deadline.dueAt, now);
          return days !== null && days <= 0;
        })
        .map((deadline) => toDeadlineItem(deadline, now)),
      ...activeTodos
        .filter((todo) => {
          const days = daysUntil(todo.dueAt, now);
          return days !== null && days <= 0;
        })
        .map((todo) => toTodoItem(todo, now, personNameById)),
    ],
    5
  ).map((item) => item.title);

  const pressure =
    overdueCount > 0
      ? `${overdueCount} overdue item${overdueCount === 1 ? "" : "s"}`
      : dueTodayCount > 0
        ? `${dueTodayCount} item${dueTodayCount === 1 ? "" : "s"} due today`
        : waitingOnCount > 0
          ? `${waitingOnCount} waiting-on item${waitingOnCount === 1 ? "" : "s"}`
          : "no closeout pressure";
  const completedLine =
    completedTodayCount > 0
      ? `${completedTodayCount} completed today`
      : "nothing completed today yet";

  return {
    changedTodayCount,
    completedTodayCount,
    waitingOnCount,
    overdueCount,
    dueTodayCount,
    moveTomorrowCandidates,
    summary: `${completedLine}; ${pressure}.`,
  };
};

export const topDailyBriefItems = (items: DailyBriefItem[], count: number) =>
  [...items].sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title)).slice(0, count);

const buildRecommendedMove = (priorityItems: DailyBriefItem[]): DailyBriefRecommendedMove => {
  const lead = priorityItems[0] ?? null;
  if (!lead) {
    return {
      item: null,
      directive: "Capture the first real mission, project, todo, or deadline.",
      rationale: "Praxis does not have enough active work recorded to make a useful recommendation yet.",
      actionHint: "Add a work item in Talk to Praxis.",
    };
  }

  if (lead.entityKind === "appointment") {
    return {
      item: lead,
      directive: `Protect the calendar item: ${lead.title}.`,
      rationale: lead.reason,
      actionHint: "Ask for today's appointments or tell Praxis what preparation is needed.",
    };
  }

  if (lead.entityKind === "mission" || lead.entityKind === "project") {
    return {
      item: lead,
      directive: `Open the focus report for ${lead.title}.`,
      rationale: lead.reason,
      actionHint: "Reply with `show me the project` or `open the focus report`.",
    };
  }

  if (lead.entityKind === "todo" && lead.waitingOnPersonName) {
    return {
      item: lead,
      directive: `Decide whether ${lead.title} is still waiting on ${lead.waitingOnPersonName}.`,
      rationale: lead.reason,
      actionHint: "Reply with `clear the waiting-on flag` if that blocker is gone.",
    };
  }

  if (lead.entityKind === "todo" && lead.reason.toLowerCase().includes("quick action")) {
    return {
      item: lead,
      directive: `Knock out ${lead.title}.`,
      rationale: lead.reason,
      actionHint: "Reply with `mark the first one done` after you finish it.",
    };
  }

  if (lead.entityKind === "deadline") {
    return {
      item: lead,
      directive: `Move ${lead.title} forward before the deadline gets louder.`,
      rationale: lead.reason,
      actionHint: "Reply with `move the first one to tomorrow` if the date needs to change.",
    };
  }

  return {
    item: lead,
    directive: `Work on ${lead.title}.`,
    rationale: lead.reason,
    actionHint: "Reply with the item number and what you want changed.",
  };
};

const buildSpokenBrief = (brief: Omit<DailyBrief, "spokenBrief" | "markdownPath">) => {
  const deadlineCount = brief.deadlines.length;
  const todoCount = brief.todos.length;
  const moneyCount = brief.moneyItems.length;
  const emailCount = brief.emailFollowUpCount;
  const lead = brief.priorityItems[0];
  const move = brief.recommendedMove;
  const nextAppointment = brief.appointments[0];
  const overdueCount = [...brief.deadlines, ...brief.todos].filter((item) =>
    item.reason.toLowerCase().includes("overdue")
  ).length;
  const waitingOnCount = brief.todos.filter((item) => Boolean(item.waitingOnPersonName)).length;
  const quickWinCount = brief.todos.filter((item) =>
    item.reason.toLowerCase().includes("quick action")
  ).length;

  if (!lead) {
    return `${brief.greeting}, sir. Status report: I do not have active work recorded yet. Add a mission, project, todo, or deadline and I will start tracking it.`;
  }

  const moneyLine = moneyCount > 0 ? ` You also have ${moneyCount} money-related item${moneyCount === 1 ? "" : "s"} in the queue.` : "";
  const emailLine =
    emailCount > 0
      ? ` I also flagged ${emailCount} email follow-up${emailCount === 1 ? "" : "s"} worth reviewing.`
      : "";
  const moreLine = brief.thereIsMore ? " There is more, sir, if you want to go over it." : "";

  const appointmentLine = nextAppointment
    ? ` First calendar item: ${nextAppointment.title}, ${nextAppointment.reason.toLowerCase()}.`
    : "";
  const overdueLine =
    overdueCount > 0
      ? ` ${overdueCount} item${overdueCount === 1 ? " is" : "s are"} overdue.`
      : "";
  const waitingLine =
    waitingOnCount > 0
      ? ` ${waitingOnCount} todo${waitingOnCount === 1 ? " is" : "s are"} still waiting on someone else.`
      : "";
  const quickWinLine =
    quickWinCount > 0
      ? ` I can also see ${quickWinCount} quick win${quickWinCount === 1 ? "" : "s"} in the stack.`
      : "";

  return `${brief.greeting}, sir. Status report: your top move is ${move.directive} Reason: ${move.rationale.toLowerCase()}.${appointmentLine} I see ${deadlineCount} active deadline${deadlineCount === 1 ? "" : "s"} and ${todoCount} active todo${todoCount === 1 ? "" : "s"}.${overdueLine}${waitingLine}${quickWinLine}${moneyLine}${emailLine}${moreLine}`;
};

export const buildDailyBriefFocusItems = (
  deadlines: DeadlineRecord[],
  todos: TodoRecord[],
  now: Date,
  personNameById: Map<string, string>
) => topDailyBriefItems([...deadlines.map((deadline) => toDeadlineItem(deadline, now)), ...todos.map((todo) => toTodoItem(todo, now, personNameById))], 20);

export const buildDailyBriefFromSnapshot = (
  snapshot: WorkSnapshot,
  emailFollowUpCount: number,
  now = new Date()
): DailyBrief => {
  const personNameById = new Map(snapshot.people.map((person) => [person.id, person.name]));
  const activeAppointments = snapshot.appointments.filter((appointment) => {
    const days = daysUntil(appointment.startsAt, now);
    return days !== null && days >= 0 && days <= 1;
  });
  const activeDeadlines = snapshot.deadlines.filter((deadline) => deadline.status !== "completed");
  const activeTodos = snapshot.todos.filter((todo) => todo.status !== "completed");
  const appointmentItems = topDailyBriefItems(
    activeAppointments.map((appointment) => toAppointmentItem(appointment, now)),
    5
  );
  const deadlineItems = topDailyBriefItems(activeDeadlines.map((deadline) => toDeadlineItem(deadline, now)), 8);
  const todoItems = topDailyBriefItems(activeTodos.map((todo) => toTodoItem(todo, now, personNameById)), 8);
  const moneyItems = topDailyBriefItems(
    activeTodos.filter((todo) => todo.moneyRelated).map((todo) => toTodoItem(todo, now, personNameById)),
    5
  );
  const priorityItems = topDailyBriefItems([...appointmentItems, ...deadlineItems, ...todoItems], 5);
  const recommendedMove = buildRecommendedMove(priorityItems);
  const closeout = buildCloseoutSummary(
    snapshot,
    activeDeadlines,
    activeTodos,
    now,
    personNameById
  );
  const totalItemCount = activeAppointments.length + activeDeadlines.length + activeTodos.length;
  const followUpTopics = [
    activeAppointments.length > appointmentItems.length ? "additional appointments" : null,
    activeDeadlines.length > deadlineItems.length ? "additional deadlines" : null,
    activeTodos.length > todoItems.length ? "additional todos" : null,
    moneyItems.length > 0 ? "money items" : null,
    emailFollowUpCount > 0 ? "email follow-ups" : null,
  ].filter((topic): topic is string => Boolean(topic));

  const partialBrief = {
    generatedAt: now.toISOString(),
    localDate: formatLocalDate(now),
    greeting: timeGreeting(now),
    recommendedMove,
    closeout,
    priorityItems,
    appointments: appointmentItems,
    deadlines: deadlineItems,
    todos: todoItems,
    moneyItems,
    emailFollowUpCount,
    followUpTopics,
    thereIsMore: totalItemCount > priorityItems.length,
  };

  return {
    ...partialBrief,
    spokenBrief: buildSpokenBrief(partialBrief),
    markdownPath: "",
  };
};
