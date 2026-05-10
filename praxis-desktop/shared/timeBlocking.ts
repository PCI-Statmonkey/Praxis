import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
  WorkStatus,
} from "./workModel";
import type { TimeBlockPublishRecord } from "./calendarWriteback";

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
  actualMinutes: number | null;
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
  actualMinutes?: number | null;
};

export type DeleteTimeBlockInput = {
  id: string;
};

export type TimeBlockSnapshot = {
  timeBlocks: TimeBlockRecord[];
  publishes: TimeBlockPublishRecord[];
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
  actualMinutes: number | null;
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

export type ScheduleReviewInput = PlanningDayViewInput & {
  workdayStartsAt?: string | null;
  workdayEndsAt?: string | null;
  minimumGapMinutes?: number;
};

export type ScheduleReviewRiskKind =
  | "overloaded_day"
  | "conflict"
  | "urgent_unscheduled"
  | "overdue"
  | "due_today"
  | "waiting_on"
  | "blocked";

export type ScheduleReviewRisk = {
  id: string;
  kind: ScheduleReviewRiskKind;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  entityKind: "todo" | "deadline" | "schedule" | "day";
  entityId: string | null;
};

export type ScheduleOpenGap = {
  id: string;
  startsAt: string;
  endsAt: string;
  minutes: number;
};

export type ScheduleRecommendedBlock = {
  id: string;
  title: string;
  entityKind: "todo";
  entityId: string;
  suggestedStartsAt: string;
  suggestedEndsAt: string;
  estimatedMinutes: number;
  priority: WorkPriority;
  reason: string;
  projectTitle: string | null;
  missionTitle: string | null;
};

export type ScheduleReviewSummary = {
  state: "clear" | "watch" | "overloaded";
  message: string;
  scheduledMinutes: number;
  openMinutes: number;
  conflictCount: number;
  urgentUnscheduledCount: number;
  waitingOrBlockedCount: number;
  recommendedBlockCount: number;
};

export type ScheduleReview = {
  targetDate: string;
  timeZone: string | null;
  summary: ScheduleReviewSummary;
  risks: ScheduleReviewRisk[];
  openGaps: ScheduleOpenGap[];
  recommendedBlocks: ScheduleRecommendedBlock[];
};

export type AiDraftPlanCandidateBlock = {
  recommendationId: string;
  openGapId?: string | null;
  explanation?: string | null;
};

export type AiDraftPlanCandidate = {
  explanation?: string | null;
  blocks?: AiDraftPlanCandidateBlock[];
};

export type DraftPlanCitation = {
  kind: "recommendation" | "work_item" | "open_gap";
  id: string;
};

export type DraftPlanProposedBlock = {
  id: string;
  title: string;
  entityKind: "todo";
  entityId: string;
  startsAt: string;
  endsAt: string;
  estimatedMinutes: number;
  priority: WorkPriority;
  reason: string;
  explanation: string;
  sourceRecommendationId: string;
  sourceOpenGapId: string;
  citations: DraftPlanCitation[];
};

export type DraftPlan = {
  targetDate: string;
  timeZone: string | null;
  source: "ai_proposal" | "deterministic_fallback";
  writeBoundary: "requires_user_confirmation";
  explanation: string;
  proposedBlocks: DraftPlanProposedBlock[];
  rejectedProposalReasons: string[];
};

export type BuildDraftPlanInput = {
  scheduleReview: ScheduleReview;
  aiCandidate?: AiDraftPlanCandidate | null;
  aiAvailable?: boolean;
  maxBlocks?: number;
};

export type DraftPlanSummarySource = "ollama" | "deterministic_fallback";

export type GenerateDraftPlanRequest = {
  scheduleReview: ScheduleReview;
  maxBlocks?: number;
};

export type GenerateDraftPlanResult = {
  ok: true;
  draftPlan: DraftPlan;
  summarySource: DraftPlanSummarySource;
  fallbackReason: string | null;
  writeBoundary: DraftPlan["writeBoundary"];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

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

const pad = (value: number) => String(value).padStart(2, "0");

const formatLocalDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const minutesBetween = (startsAt: Date, endsAt: Date) =>
  Math.max(0, Math.round((endsAt.getTime() - startsAt.getTime()) / MINUTE_MS));

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

export const validateTimeBlockActualMinutes = (
  actualMinutes: number | null | undefined
): string | null => {
  if (actualMinutes === null || actualMinutes === undefined) {
    return null;
  }

  if (!Number.isInteger(actualMinutes) || actualMinutes <= 0) {
    return "Actual duration must be a positive whole number of minutes.";
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
  actualMinutes: timeBlock.actualMinutes,
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

const priorityScore: Record<WorkPriority, number> = {
  critical: 40,
  high: 28,
  normal: 14,
  low: 4,
};

const priorityLabel = (priority: WorkPriority) =>
  priority === "critical" ? "critical priority" : `${priority} priority`;

const defaultWorkdayBoundary = (targetDate: string, hour: number) =>
  `${targetDate}T${pad(hour)}:00:00`;

const rangeWithinDay = (targetDate: string, startsAt?: string | null, endsAt?: string | null) => {
  const start = parseDateTime(startsAt ?? defaultWorkdayBoundary(targetDate, 9));
  const end = parseDateTime(endsAt ?? defaultWorkdayBoundary(targetDate, 17));
  if (start && end && end.getTime() > start.getTime()) {
    return { start, end };
  }
  return {
    start: parseDateTime(defaultWorkdayBoundary(targetDate, 9))!,
    end: parseDateTime(defaultWorkdayBoundary(targetDate, 17))!,
  };
};

const clampRangeToDay = (
  item: { startsAt: string; endsAt: string | null },
  dayStart: Date,
  dayEnd: Date
) => {
  const start = parseDateTime(item.startsAt);
  const end = parseDateTime(item.endsAt);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return null;
  }
  const clampedStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
  const clampedEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));
  return clampedEnd.getTime() > clampedStart.getTime()
    ? { start: clampedStart, end: clampedEnd }
    : null;
};

const mergeBusyRanges = (ranges: Array<{ start: Date; end: Date }>) => {
  const sortedRanges = [...ranges].sort(
    (left, right) => left.start.getTime() - right.start.getTime()
  );
  const mergedRanges: Array<{ start: Date; end: Date }> = [];

  for (const range of sortedRanges) {
    const previous = mergedRanges[mergedRanges.length - 1];
    if (!previous || range.start.getTime() > previous.end.getTime()) {
      mergedRanges.push({ ...range });
      continue;
    }
    if (range.end.getTime() > previous.end.getTime()) {
      previous.end = range.end;
    }
  }

  return mergedRanges;
};

const buildOpenGaps = (
  busyRanges: Array<{ start: Date; end: Date }>,
  dayStart: Date,
  dayEnd: Date,
  minimumGapMinutes: number
): ScheduleOpenGap[] => {
  const gaps: ScheduleOpenGap[] = [];
  let cursor = new Date(dayStart);
  const addGap = (start: Date, end: Date) => {
    const minutes = minutesBetween(start, end);
    if (minutes < minimumGapMinutes) {
      return;
    }
    gaps.push({
      id: `gap:${formatLocalDateTime(start)}:${formatLocalDateTime(end)}`,
      startsAt: formatLocalDateTime(start),
      endsAt: formatLocalDateTime(end),
      minutes,
    });
  };

  for (const range of mergeBusyRanges(busyRanges)) {
    addGap(cursor, range.start);
    if (range.end.getTime() > cursor.getTime()) {
      cursor = new Date(range.end);
    }
  }

  addGap(cursor, dayEnd);
  return gaps;
};

const todoPlanningScore = (todo: TodoRecord, targetDate: string) => {
  const days = daysFromTarget(todo.dueAt, targetDate);
  const dueScore = days === null ? 0 : days < 0 ? 100 + Math.min(Math.abs(days), 14) : days === 0 ? 80 : Math.max(0, 28 - days * 4);
  const quickWinScore = todo.quickAction ? 18 : 0;
  const estimateScore = todo.estimatedMinutes ? Math.max(0, 18 - Math.ceil(todo.estimatedMinutes / 10)) : 4;
  return dueScore + priorityScore[todo.priority] + quickWinScore + estimateScore;
};

const executableTodo = (todo: TodoRecord) =>
  todo.status !== "completed" && todo.status !== "blocked" && !todo.waitingOnPersonId;

const estimatedMinutesFor = (todo: TodoRecord) =>
  Math.min(Math.max(todo.estimatedMinutes ?? (todo.quickAction ? 15 : 45), 10), 120);

const todoScheduleReason = (todo: TodoRecord, targetDate: string) => {
  const days = daysFromTarget(todo.dueAt, targetDate);
  const reasons = [
    days !== null && days < 0 ? "overdue" : null,
    days === 0 ? "due today" : null,
    priorityLabel(todo.priority),
    todo.quickAction ? "quick win" : null,
    todo.estimatedMinutes ? `${todo.estimatedMinutes} minute estimate` : "default planning estimate",
  ].filter((reason): reason is string => Boolean(reason));
  return reasons.join("; ");
};

const scheduledTodoIds = (timeBlocks: PlanningTimeBlockItem[]) =>
  new Set(
    timeBlocks
      .filter((timeBlock) => timeBlock.entityKind === "todo" && timeBlock.entityId)
      .map((timeBlock) => timeBlock.entityId)
  );

const blockEndFrom = (startsAt: string, minutes: number) => {
  const start = parseDateTime(startsAt)!;
  return formatLocalDateTime(new Date(start.getTime() + minutes * MINUTE_MS));
};

const gapForRecommendation = (
  recommendation: ScheduleRecommendedBlock,
  openGaps: ScheduleOpenGap[]
) =>
  openGaps.find(
    (gap) =>
      recommendation.suggestedStartsAt >= gap.startsAt &&
      recommendation.suggestedEndsAt <= gap.endsAt
  ) ?? null;

const toDraftPlanBlock = (
  recommendation: ScheduleRecommendedBlock,
  openGap: ScheduleOpenGap,
  explanation: string | null | undefined
): DraftPlanProposedBlock => ({
  id: `draft:${recommendation.id}`,
  title: recommendation.title,
  entityKind: recommendation.entityKind,
  entityId: recommendation.entityId,
  startsAt: recommendation.suggestedStartsAt,
  endsAt: recommendation.suggestedEndsAt,
  estimatedMinutes: recommendation.estimatedMinutes,
  priority: recommendation.priority,
  reason: recommendation.reason,
  explanation:
    explanation?.trim() ||
    `Schedule ${recommendation.title} because ${recommendation.reason}.`,
  sourceRecommendationId: recommendation.id,
  sourceOpenGapId: openGap.id,
  citations: [
    { kind: "recommendation", id: recommendation.id },
    { kind: "work_item", id: recommendation.entityId },
    { kind: "open_gap", id: openGap.id },
  ],
});

const fallbackDraftExplanation = (review: ScheduleReview) => {
  if (review.recommendedBlocks.length === 0) {
    return review.summary.state === "clear"
      ? "No draft blocks are needed because the deterministic review found no pressure."
      : "No safe draft blocks are available from the deterministic review.";
  }
  return "Draft uses the deterministic schedule review order; no AI proposal was applied.";
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

export const buildScheduleReview = (input: ScheduleReviewInput): ScheduleReview => {
  const dayView = buildPlanningDayView(input);
  const { start: dayStart, end: dayEnd } = rangeWithinDay(
    dayView.targetDate,
    input.workdayStartsAt,
    input.workdayEndsAt
  );
  const minimumGapMinutes = Math.max(Math.floor(input.minimumGapMinutes ?? 15), 5);
  const appointmentBusyRanges = dayView.scheduledAppointments
    .filter((appointment) => !appointment.allDay)
    .map((appointment) => clampRangeToDay(appointment, dayStart, dayEnd))
    .filter((range): range is { start: Date; end: Date } => Boolean(range));
  const timeBlockBusyRanges = dayView.timeBlocks
    .map((timeBlock) => clampRangeToDay(timeBlock, dayStart, dayEnd))
    .filter((range): range is { start: Date; end: Date } => Boolean(range));
  const busyRanges = [...appointmentBusyRanges, ...timeBlockBusyRanges];
  const openGaps = buildOpenGaps(busyRanges, dayStart, dayEnd, minimumGapMinutes);
  const scheduledMinutes = mergeBusyRanges(busyRanges).reduce(
    (total, range) => total + minutesBetween(range.start, range.end),
    0
  );
  const openMinutes = openGaps.reduce((total, gap) => total + gap.minutes, 0);
  const projectById = new Map(input.projects.map((project) => [project.id, project]));
  const missionById = new Map(input.missions.map((mission) => [mission.id, mission]));
  const alreadyScheduledTodoIds = scheduledTodoIds(dayView.timeBlocks);
  const activeTodos = input.todos.filter((todo) => todo.status !== "completed");
  const waitingOrBlockedTodos = activeTodos.filter(
    (todo) => todo.status === "blocked" || Boolean(todo.waitingOnPersonId)
  );
  const executableTodos = activeTodos
    .filter(executableTodo)
    .filter((todo) => !alreadyScheduledTodoIds.has(todo.id));
  const urgentTodos = executableTodos.filter((todo) => {
    const days = daysFromTarget(todo.dueAt, dayView.targetDate);
    return days !== null && days <= 0;
  });
  const recommendedCandidates = executableTodos
    .map((todo) => ({
      todo,
      score: todoPlanningScore(todo, dayView.targetDate),
      estimatedMinutes: estimatedMinutesFor(todo),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        (parseDateTime(left.todo.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (parseDateTime(right.todo.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) ||
        left.todo.title.localeCompare(right.todo.title)
    );
  const remainingGaps = [...openGaps];
  const recommendedBlocks: ScheduleRecommendedBlock[] = [];

  for (const candidate of recommendedCandidates) {
    const gapIndex = remainingGaps.findIndex((gap) => gap.minutes >= candidate.estimatedMinutes);
    if (gapIndex === -1) {
      continue;
    }
    const gap = remainingGaps[gapIndex];
    const project = candidate.todo.projectId
      ? projectById.get(candidate.todo.projectId) ?? null
      : null;
    const mission = project?.missionId ? missionById.get(project.missionId) ?? null : null;
    const suggestedEndsAt = blockEndFrom(gap.startsAt, candidate.estimatedMinutes);
    recommendedBlocks.push({
      id: `recommendation:${candidate.todo.id}:${gap.startsAt}`,
      title: candidate.todo.title,
      entityKind: "todo",
      entityId: candidate.todo.id,
      suggestedStartsAt: gap.startsAt,
      suggestedEndsAt,
      estimatedMinutes: candidate.estimatedMinutes,
      priority: candidate.todo.priority,
      reason: todoScheduleReason(candidate.todo, dayView.targetDate),
      projectTitle: project?.title ?? null,
      missionTitle: mission?.title ?? null,
    });

    const leftoverMinutes = gap.minutes - candidate.estimatedMinutes;
    if (leftoverMinutes >= minimumGapMinutes) {
      remainingGaps[gapIndex] = {
        id: `gap:${suggestedEndsAt}:${gap.endsAt}`,
        startsAt: suggestedEndsAt,
        endsAt: gap.endsAt,
        minutes: leftoverMinutes,
      };
    } else {
      remainingGaps.splice(gapIndex, 1);
    }
  }

  const risks: ScheduleReviewRisk[] = [];
  for (const conflict of dayView.conflicts) {
    risks.push({
      id: conflict.id,
      kind: "conflict",
      severity: "warning",
      title: "Schedule conflict",
      detail: conflict.message,
      entityKind: "schedule",
      entityId: null,
    });
  }

  for (const deadline of dayView.deadlineMarkers) {
    risks.push({
      id: `deadline:${deadline.id}`,
      kind: "due_today",
      severity: deadline.priority === "critical" ? "critical" : "warning",
      title: deadline.title,
      detail: `Deadline is due today at ${deadline.dueAt}.`,
      entityKind: "deadline",
      entityId: deadline.id,
    });
  }

  for (const todo of urgentTodos) {
    const days = daysFromTarget(todo.dueAt, dayView.targetDate);
    const overdue = days !== null && days < 0;
    risks.push({
      id: `todo:${todo.id}:${overdue ? "overdue" : "due_today"}`,
      kind: overdue ? "overdue" : "due_today",
      severity: overdue || todo.priority === "critical" ? "critical" : "warning",
      title: todo.title,
      detail: overdue
        ? `${todo.title} is ${Math.abs(days ?? 0)} day${
            Math.abs(days ?? 0) === 1 ? "" : "s"
          } overdue.`
        : `${todo.title} is due today.`,
      entityKind: "todo",
      entityId: todo.id,
    });
  }

  for (const todo of waitingOrBlockedTodos) {
    const waiting = Boolean(todo.waitingOnPersonId);
    risks.push({
      id: `todo:${todo.id}:${waiting ? "waiting_on" : "blocked"}`,
      kind: waiting ? "waiting_on" : "blocked",
      severity: "info",
      title: todo.title,
      detail: waiting
        ? "Waiting-on item is not scheduled as executable work."
        : "Blocked item is not scheduled as executable work.",
      entityKind: "todo",
      entityId: todo.id,
    });
  }

  const workdayMinutes = minutesBetween(dayStart, dayEnd);
  const urgentEstimateMinutes = urgentTodos.reduce(
    (total, todo) => total + estimatedMinutesFor(todo),
    0
  );
  const overloaded =
    dayView.conflicts.length > 0 ||
    scheduledMinutes + urgentEstimateMinutes > Math.max(workdayMinutes, 1) ||
    (urgentTodos.length > 0 && recommendedBlocks.length === 0);

  if (overloaded) {
    risks.unshift({
      id: "day:overloaded",
      kind: "overloaded_day",
      severity: "critical",
      title: "Day is overloaded",
      detail: `${scheduledMinutes} minutes are already scheduled and ${urgentEstimateMinutes} minutes of urgent unscheduled work remain.`,
      entityKind: "day",
      entityId: null,
    });
  }

  const state: ScheduleReviewSummary["state"] = overloaded
    ? "overloaded"
    : risks.some((risk) => risk.severity === "warning" || risk.severity === "critical")
      ? "watch"
      : "clear";
  const message =
    activeTodos.length === 0 &&
    dayView.deadlineMarkers.length === 0 &&
    dayView.scheduledAppointments.length === 0 &&
    dayView.timeBlocks.length === 0
      ? "No schedule pressure detected. The day is open for planning."
      : state === "overloaded"
        ? "Schedule pressure is high. Resolve conflicts or schedule urgent work first."
        : state === "watch"
          ? "Some work needs attention, but there is room to plan."
          : "Schedule looks clear. Use open gaps for optional work.";

  return {
    targetDate: dayView.targetDate,
    timeZone: dayView.timeZone,
    summary: {
      state,
      message,
      scheduledMinutes,
      openMinutes,
      conflictCount: dayView.conflicts.length,
      urgentUnscheduledCount: urgentTodos.length,
      waitingOrBlockedCount: waitingOrBlockedTodos.length,
      recommendedBlockCount: recommendedBlocks.length,
    },
    risks,
    openGaps,
    recommendedBlocks,
  };
};

export const buildAiDraftPlan = (input: BuildDraftPlanInput): DraftPlan => {
  const review = input.scheduleReview;
  const maxBlocks = Math.max(Math.floor(input.maxBlocks ?? 4), 0);
  const recommendationsById = new Map(
    review.recommendedBlocks.map((recommendation) => [recommendation.id, recommendation])
  );
  const openGapsById = new Map(review.openGaps.map((gap) => [gap.id, gap]));
  const rejectedProposalReasons: string[] = [];
  const proposedBlocks: DraftPlanProposedBlock[] = [];
  const usedRecommendationIds = new Set<string>();
  const aiBlocks = input.aiAvailable === false ? null : input.aiCandidate?.blocks ?? null;

  if (input.aiAvailable === false) {
    rejectedProposalReasons.push("AI unavailable; deterministic fallback used.");
  }

  if (aiBlocks && aiBlocks.length > 0) {
    for (const candidate of aiBlocks) {
      if (proposedBlocks.length >= maxBlocks) {
        break;
      }
      const recommendation = recommendationsById.get(candidate.recommendationId);
      if (!recommendation) {
        rejectedProposalReasons.push(
          `Ignored AI block with unknown recommendation ${candidate.recommendationId}.`
        );
        continue;
      }
      if (usedRecommendationIds.has(recommendation.id)) {
        rejectedProposalReasons.push(
          `Ignored duplicate AI block for recommendation ${recommendation.id}.`
        );
        continue;
      }

      const inferredGap = gapForRecommendation(recommendation, review.openGaps);
      const citedGap = candidate.openGapId ? openGapsById.get(candidate.openGapId) ?? null : null;
      const openGap = citedGap ?? inferredGap;
      if (!openGap) {
        rejectedProposalReasons.push(
          `Ignored AI block for ${recommendation.title} because it did not cite a valid open gap.`
        );
        continue;
      }
      if (
        recommendation.suggestedStartsAt < openGap.startsAt ||
        recommendation.suggestedEndsAt > openGap.endsAt
      ) {
        rejectedProposalReasons.push(
          `Ignored AI block for ${recommendation.title} because the cited gap does not contain the recommendation.`
        );
        continue;
      }

      proposedBlocks.push(toDraftPlanBlock(recommendation, openGap, candidate.explanation));
      usedRecommendationIds.add(recommendation.id);
    }
  } else if (input.aiAvailable !== false && input.aiCandidate) {
    rejectedProposalReasons.push("AI proposal did not include usable block citations.");
  }

  const source = proposedBlocks.length > 0 ? "ai_proposal" : "deterministic_fallback";
  if (proposedBlocks.length === 0) {
    for (const recommendation of review.recommendedBlocks) {
      if (proposedBlocks.length >= maxBlocks) {
        break;
      }
      const openGap = gapForRecommendation(recommendation, review.openGaps);
      if (!openGap) {
        rejectedProposalReasons.push(
          `Skipped fallback block for ${recommendation.title} because no containing open gap exists.`
        );
        continue;
      }
      proposedBlocks.push(toDraftPlanBlock(recommendation, openGap, null));
    }
  }

  return {
    targetDate: review.targetDate,
    timeZone: review.timeZone,
    source,
    writeBoundary: "requires_user_confirmation",
    explanation:
      source === "ai_proposal"
        ? input.aiCandidate?.explanation?.trim() ||
          "AI reordered deterministic recommendations without creating writes."
        : fallbackDraftExplanation(review),
    proposedBlocks,
    rejectedProposalReasons,
  };
};
