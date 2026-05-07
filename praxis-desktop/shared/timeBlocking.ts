import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
  WorkStatus,
} from "./workModel";

export type TimeBlockStatus = "planned" | "completed" | "canceled";

export type TimeBlockSource = "local";

export type TimeBlockEntityKind = "todo" | "project" | "mission" | "manual";

export type TimeBlockRecord = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  entityKind: TimeBlockEntityKind;
  entityId: string | null;
  status: TimeBlockStatus;
  source: TimeBlockSource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListTimeBlocksInput = {
  startsAt?: string | null;
  endsAt?: string | null;
};

export type CreateTimeBlockInput = {
  title: string;
  startsAt: string;
  endsAt: string;
  entityKind: TimeBlockEntityKind;
  entityId?: string | null;
  notes?: string | null;
};

export type UpdateTimeBlockInput = {
  id: string;
  title?: string;
  startsAt?: string;
  endsAt?: string;
  entityKind?: TimeBlockEntityKind;
  entityId?: string | null;
  status?: TimeBlockStatus;
  notes?: string | null;
};

export type DeleteTimeBlockInput = {
  id: string;
};

export type TimeBlockSnapshot = {
  timeBlocks: TimeBlockRecord[];
};

export type PlanningDayViewInput = {
  targetDate: string;
  timeZone?: string | null;
  appointments: AppointmentRecord[];
  deadlines: DeadlineRecord[];
  todos: TodoRecord[];
  projects: ProjectRecord[];
  missions: MissionRecord[];
  timeBlocks: TimeBlockRecord[];
};

export type PlanningAppointmentItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  sourceSystem: string;
  notes: string | null;
};

export type PlanningDeadlineMarker = {
  id: string;
  title: string;
  dueAt: string;
  entityKind: DeadlineRecord["entityKind"];
  entityId: string | null;
  priority: WorkPriority;
  status: WorkStatus;
};

export type PlanningWorkCandidate = {
  id: string;
  title: string;
  dueAt: string | null;
  priority: WorkPriority;
  status: WorkStatus;
  projectId: string | null;
  projectTitle: string | null;
  missionId: string | null;
  missionTitle: string | null;
  estimatedMinutes: number | null;
  quickAction: boolean;
  moneyRelated: boolean;
  reason: "due_today" | "overdue" | "unscheduled_active";
};

export type PlanningTimeBlockItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: TimeBlockStatus;
  source: TimeBlockSource;
  entityKind: TimeBlockEntityKind;
  entityId: string | null;
  notes: string | null;
};

export type PlanningConflict = {
  id: string;
  itemIds: string[];
  kind: "overlap";
  severity: "info" | "warning";
  message: string;
};

export type PlanningDayView = {
  targetDate: string;
  timeZone: string | null;
  scheduledAppointments: PlanningAppointmentItem[];
  deadlineMarkers: PlanningDeadlineMarker[];
  unscheduledWork: PlanningWorkCandidate[];
  timeBlocks: PlanningTimeBlockItem[];
  conflicts: PlanningConflict[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const TIME_BLOCK_STATUSES: TimeBlockStatus[] = ["planned", "completed", "canceled"];

export const TIME_BLOCK_ENTITY_KINDS: TimeBlockEntityKind[] = [
  "todo",
  "project",
  "mission",
  "manual",
];

const normalizeLocalDate = (value: string) => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.trim();
  }

  return formatLocalDate(parsed);
};

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const parseDateTime = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isTimeBlockStatus = (value: unknown): value is TimeBlockStatus =>
  typeof value === "string" && TIME_BLOCK_STATUSES.includes(value as TimeBlockStatus);

export const isTimeBlockEntityKind = (value: unknown): value is TimeBlockEntityKind =>
  typeof value === "string" && TIME_BLOCK_ENTITY_KINDS.includes(value as TimeBlockEntityKind);

export const validateTimeBlockRange = (startsAt: string, endsAt: string): string | null => {
  const parsedStart = parseDateTime(startsAt);
  const parsedEnd = parseDateTime(endsAt);
  if (!parsedStart || !parsedEnd) {
    return "Time block start and end must be valid timestamps.";
  }
  if (parsedEnd.getTime() <= parsedStart.getTime()) {
    return "Time block end must be after the start.";
  }
  return null;
};

const isOnTargetDate = (value: string | null, targetDate: string) => {
  const parsed = parseDateTime(value);
  return parsed ? formatLocalDate(parsed) === targetDate : false;
};

const daysFromTarget = (value: string | null, targetDate: string) => {
  const parsed = parseDateTime(value);
  if (!parsed) {
    return null;
  }

  const target = parseDateTime(`${targetDate}T00:00:00`);
  if (!target) {
    return null;
  }

  const parsedDay = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.floor((parsedDay.getTime() - targetDay.getTime()) / DAY_MS);
};

const compareByStart = <T extends { startsAt: string }>(left: T, right: T) => {
  const leftTime = parseDateTime(left.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = parseDateTime(right.startsAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime || left.startsAt.localeCompare(right.startsAt);
};

const compareByDue = <T extends { dueAt: string | null; title: string }>(left: T, right: T) => {
  const leftTime = parseDateTime(left.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightTime = parseDateTime(right.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime || left.title.localeCompare(right.title);
};

const toAppointmentItem = (appointment: AppointmentRecord): PlanningAppointmentItem => ({
  id: appointment.id,
  title: appointment.title,
  startsAt: appointment.startsAt,
  endsAt: appointment.endsAt,
  allDay: appointment.allDay,
  sourceSystem: appointment.sourceSystem,
  notes: appointment.notes,
});

const toDeadlineMarker = (deadline: DeadlineRecord): PlanningDeadlineMarker => ({
  id: deadline.id,
  title: deadline.title,
  dueAt: deadline.dueAt,
  entityKind: deadline.entityKind,
  entityId: deadline.entityId,
  priority: deadline.priority,
  status: deadline.status,
});

const toTimeBlockItem = (timeBlock: TimeBlockRecord): PlanningTimeBlockItem => ({
  id: timeBlock.id,
  title: timeBlock.title,
  startsAt: timeBlock.startsAt,
  endsAt: timeBlock.endsAt,
  status: timeBlock.status,
  source: timeBlock.source,
  entityKind: timeBlock.entityKind,
  entityId: timeBlock.entityId,
  notes: timeBlock.notes,
});

const todoReason = (todo: TodoRecord, targetDate: string): PlanningWorkCandidate["reason"] => {
  const days = daysFromTarget(todo.dueAt, targetDate);
  if (days !== null && days < 0) {
    return "overdue";
  }
  if (days === 0) {
    return "due_today";
  }
  return "unscheduled_active";
};

const toWorkCandidate = (
  todo: TodoRecord,
  projectById: Map<string, ProjectRecord>,
  missionById: Map<string, MissionRecord>,
  targetDate: string
): PlanningWorkCandidate => {
  const project = todo.projectId ? projectById.get(todo.projectId) ?? null : null;
  const mission = project?.missionId ? missionById.get(project.missionId) ?? null : null;

  return {
    id: todo.id,
    title: todo.title,
    dueAt: todo.dueAt,
    priority: todo.priority,
    status: todo.status,
    projectId: todo.projectId,
    projectTitle: project?.title ?? null,
    missionId: project?.missionId ?? null,
    missionTitle: mission?.title ?? null,
    estimatedMinutes: todo.estimatedMinutes,
    quickAction: todo.quickAction,
    moneyRelated: todo.moneyRelated,
    reason: todoReason(todo, targetDate),
  };
};

const hasTimeRange = (item: { startsAt: string; endsAt: string | null }) => {
  const startsAt = parseDateTime(item.startsAt);
  const endsAt = parseDateTime(item.endsAt);
  return Boolean(startsAt && endsAt && endsAt.getTime() > startsAt.getTime());
};

const rangesOverlap = (
  left: { startsAt: string; endsAt: string | null },
  right: { startsAt: string; endsAt: string | null }
) => {
  if (!hasTimeRange(left) || !hasTimeRange(right)) {
    return false;
  }
  const leftStart = parseDateTime(left.startsAt)!.getTime();
  const leftEnd = parseDateTime(left.endsAt)!.getTime();
  const rightStart = parseDateTime(right.startsAt)!.getTime();
  const rightEnd = parseDateTime(right.endsAt)!.getTime();
  return leftStart < rightEnd && rightStart < leftEnd;
};

const buildConflicts = (
  appointments: PlanningAppointmentItem[],
  timeBlocks: PlanningTimeBlockItem[]
): PlanningConflict[] => {
  const timedItems = [
    ...appointments
      .filter((appointment) => !appointment.allDay)
      .map((appointment) => ({ planningId: `appointment:${appointment.id}`, ...appointment })),
    ...timeBlocks.map((timeBlock) => ({
      planningId: `time_block:${timeBlock.id}`,
      ...timeBlock,
    })),
  ];
  const conflicts: PlanningConflict[] = [];

  for (let leftIndex = 0; leftIndex < timedItems.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < timedItems.length; rightIndex += 1) {
      const left = timedItems[leftIndex];
      const right = timedItems[rightIndex];
      if (!rangesOverlap(left, right)) {
        continue;
      }
      conflicts.push({
        id: `${left.planningId}__${right.planningId}`,
        itemIds: [left.planningId, right.planningId],
        kind: "overlap",
        severity: "warning",
        message: "Scheduled items overlap.",
      });
    }
  }

  return conflicts;
};

export const buildPlanningDayView = (input: PlanningDayViewInput): PlanningDayView => {
  const targetDate = normalizeLocalDate(input.targetDate);
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const missionById = new Map(input.missions.map((mission) => [mission.id, mission]));
  const scheduledAppointments = input.appointments
    .filter((appointment) => isOnTargetDate(appointment.startsAt, targetDate))
    .map(toAppointmentItem)
    .sort(compareByStart);
  const deadlineMarkers = input.deadlines
    .filter((deadline) => deadline.status !== "completed")
    .filter((deadline) => isOnTargetDate(deadline.dueAt, targetDate))
    .map(toDeadlineMarker)
    .sort(compareByDue);
  const timeBlocks = input.timeBlocks
    .filter((timeBlock) => timeBlock.status !== "canceled")
    .filter((timeBlock) => isOnTargetDate(timeBlock.startsAt, targetDate))
    .map(toTimeBlockItem)
    .sort(compareByStart);
  const blockedTodoIds = new Set(
    timeBlocks
      .filter((timeBlock) => timeBlock.entityKind === "todo" && timeBlock.entityId)
      .map((timeBlock) => timeBlock.entityId)
  );
  const unscheduledWork = input.todos
    .filter((todo) => todo.status !== "completed")
    .filter((todo) => !blockedTodoIds.has(todo.id))
    .filter((todo) => {
      const days = daysFromTarget(todo.dueAt, targetDate);
      return days === null || days <= 0 || todo.quickAction;
    })
    .map((todo) => toWorkCandidate(todo, projectById, missionById, targetDate))
    .sort(compareByDue);

  return {
    targetDate,
    timeZone: input.timeZone ?? null,
    scheduledAppointments,
    deadlineMarkers,
    unscheduledWork,
    timeBlocks,
    conflicts: buildConflicts(scheduledAppointments, timeBlocks),
  };
};
