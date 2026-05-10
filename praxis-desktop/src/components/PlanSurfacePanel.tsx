import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  CreateTimeBlockInput,
  DraftPlanProposedBlock,
  GenerateDraftPlanRequest,
  GenerateDraftPlanResult,
  PlanningDayView,
  PlanningTimeBlockItem,
  PlanningWorkCandidate,
  ScheduleRecommendedBlock,
  ScheduleReview,
  TimeBlockEntityKind,
  UpdateTimeBlockInput,
} from "../../shared/timeBlocking";
import {
  formatPraxisTime,
  type CalendarConnectionRecord,
  type UiTimeFormat,
} from "../../shared/settingsModel";
import type {
  ConfirmTimeBlockPublishResult,
  TimeBlockPublishConfirmRequest,
  TimeBlockPublishPreview,
  TimeBlockPublishPreviewRequest,
  TimeBlockPublishProvider,
  TimeBlockPublishRecord,
} from "../../shared/calendarWriteback";
import type { MissionRecord, ProjectRecord } from "../../shared/workModel";
import { EmptyState } from "./EmptyState";

type PlanSurfacePanelProps = {
  isActive: boolean;
  planningDay: PlanningDayView;
  scheduleReview: ScheduleReview;
  selectedDateLabel: string;
  currentTimeLabel: string;
  timeFormat: UiTimeFormat;
  basePlanningDate: string;
  formatDateTime: (value: string | null) => string;
  activeProjects: ProjectRecord[];
  activeMissions: MissionRecord[];
  createTimeBlock: (input: CreateTimeBlockInput) => Promise<void>;
  updateTimeBlock: (input: UpdateTimeBlockInput) => Promise<void>;
  deleteTimeBlock: (id: string) => Promise<void>;
  generateDraftPlan: (input: GenerateDraftPlanRequest) => Promise<GenerateDraftPlanResult>;
  calendarConnections: CalendarConnectionRecord[];
  timeBlockPublishes: TimeBlockPublishRecord[];
  previewTimeBlockPublish: (
    input: TimeBlockPublishPreviewRequest
  ) => Promise<TimeBlockPublishPreview>;
  confirmTimeBlockPublish: (
    input: TimeBlockPublishConfirmRequest
  ) => Promise<ConfirmTimeBlockPublishResult>;
  onPlanningDateChange: (date: string) => void;
  onResetPlanningDate: () => void;
  variant?: "full" | "compact";
};

type TimeBlockFormState = {
  id: string | null;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  entityKind: TimeBlockEntityKind;
  entityId: string | null;
  notes: string;
  tags: string[];
};

type CompletionPromptState = {
  block: PlanningTimeBlockItem;
  actualMinutes: number;
};

type TimelineItem = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  source: "external" | "local";
  status?: string;
  meta: string;
};

const visibleWorkLimit = 6;
const compactItemLimit = 2;
const reviewItemLimit = 4;
const durationOptions = [15, 30, 45, 60, 90];
const timelineStartHour = 6;
const timelineEndHour = 23;

const reasonLabel = (reason: PlanningDayView["unscheduledWork"][number]["reason"]) => {
  switch (reason) {
    case "due_today":
      return "due today";
    case "overdue":
      return "overdue";
    case "unscheduled_active":
      return "active";
    default:
      return reason;
  }
};

const formatDateInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const formatTimeInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.slice(11, 16) || "09:00";
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}`;
};

const addMinutesToTime = (time: string, minutes: number) => {
  const [hour = "9", minute = "0"] = time.split(":");
  const date = new Date(2000, 0, 1, Number(hour), Number(minute) + minutes);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}`;
};

const combineLocalDateTime = (date: string, time: string) => `${date}T${time}:00`;

const addDaysToDate = (value: string, dayCount: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + dayCount);
  return formatDateInput(date.toISOString());
};

const minutesFromTime = (value: string) => {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
};

const minutesBetween = (startsAt: string, endsAt: string) => {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 30;
  }
  return Math.max(15, Math.round((end - start) / 60000));
};

const timelinePosition = (startsAt: string, endsAt: string) => {
  const startMinutes = minutesFromTime(formatTimeInput(startsAt));
  const endMinutes = minutesFromTime(formatTimeInput(endsAt));
  const dayStart = timelineStartHour * 60;
  const dayEnd = timelineEndHour * 60;
  const totalMinutes = dayEnd - dayStart;
  const top = ((Math.max(startMinutes, dayStart) - dayStart) / totalMinutes) * 100;
  const height = ((Math.min(Math.max(endMinutes, startMinutes + 15), dayEnd) - Math.max(startMinutes, dayStart)) / totalMinutes) * 100;

  return {
    top: `${Math.max(0, Math.min(top, 96))}%`,
    height: `${Math.max(7, Math.min(height, 38))}%`,
  };
};

const tagList = (items: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      items
        .flatMap((item) => (item ? item.split(";") : []))
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ).slice(0, 5);

const formatPlanTime = (value: string | Date, timeFormat: UiTimeFormat) => {
  const formatted = formatPraxisTime(value, timeFormat);
  return formatted || formatTimeInput(String(value));
};

const formatTimelineHour = (hour: number, timeFormat: UiTimeFormat) => {
  const date = new Date(2000, 0, 1, hour, 0);
  if (timeFormat === "standard") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: true,
    }).format(date);
  }

  return formatPraxisTime(date, timeFormat);
};

const blockRangeLabel = (
  block: PlanningTimeBlockItem,
  formatDateTime: (value: string) => string,
  timeFormat: UiTimeFormat
) => `${formatDateTime(block.startsAt)} - ${formatPlanTime(block.endsAt, timeFormat)}`;

const providerLabel = (provider: TimeBlockPublishProvider) =>
  provider === "google" ? "Google" : "Outlook";

const publishBadgeLabel = (publish: TimeBlockPublishRecord | null) => {
  if (!publish) {
    return "Not published";
  }
  if (publish.status === "published") {
    return `Published: ${providerLabel(publish.provider)}`;
  }
  if (publish.status === "publish_failed") {
    return `Publish failed: ${providerLabel(publish.provider)}`;
  }
  return `Publish ${publish.status.replace(/_/g, " ")}: ${providerLabel(publish.provider)}`;
};

const publishBadgeClass = (publish: TimeBlockPublishRecord | null) => {
  if (!publish || publish.status === "published") {
    return "badge";
  }
  return publish.status === "publish_failed" ? "badge urgent-badge" : "badge waiting-badge";
};

const emptyBlockForm = (targetDate: string): TimeBlockFormState => ({
  id: null,
  title: "",
  date: targetDate,
  startTime: "09:00",
  endTime: "09:30",
  durationMinutes: 30,
  entityKind: "manual",
  entityId: null,
  notes: "",
  tags: [],
});

const formFromBlock = (block: PlanningTimeBlockItem): TimeBlockFormState => ({
  id: block.id,
  title: block.title,
  date: formatDateInput(block.startsAt),
  startTime: formatTimeInput(block.startsAt),
  endTime: formatTimeInput(block.endsAt),
  durationMinutes: 30,
  entityKind: block.entityKind,
  entityId: block.entityId,
  notes: block.notes ?? "",
  tags: [],
});

const formFromRecommendation = (
  recommendation: ScheduleRecommendedBlock,
  targetDate: string
): TimeBlockFormState => ({
  id: null,
  title: recommendation.title,
  date: formatDateInput(recommendation.suggestedStartsAt || targetDate),
  startTime: formatTimeInput(recommendation.suggestedStartsAt),
  endTime: formatTimeInput(recommendation.suggestedEndsAt),
  durationMinutes: recommendation.estimatedMinutes,
  entityKind: recommendation.entityKind,
  entityId: recommendation.entityId,
  notes: "",
  tags: tagList([
    recommendation.reason,
    recommendation.projectTitle ? `Project: ${recommendation.projectTitle}` : null,
    recommendation.missionTitle ? `Mission: ${recommendation.missionTitle}` : null,
  ]),
});

const formFromDraftBlock = (block: DraftPlanProposedBlock): TimeBlockFormState => ({
  id: null,
  title: block.title,
  date: formatDateInput(block.startsAt),
  startTime: formatTimeInput(block.startsAt),
  endTime: formatTimeInput(block.endsAt),
  durationMinutes: block.estimatedMinutes,
  entityKind: block.entityKind,
  entityId: block.entityId,
  notes: block.explanation,
  tags: tagList(["AI draft", block.reason, block.priority]),
});

export function PlanSurfacePanel({
  isActive,
  planningDay,
  scheduleReview,
  selectedDateLabel,
  currentTimeLabel,
  timeFormat,
  basePlanningDate,
  formatDateTime,
  activeProjects,
  activeMissions,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  generateDraftPlan,
  calendarConnections,
  timeBlockPublishes,
  previewTimeBlockPublish,
  confirmTimeBlockPublish,
  onPlanningDateChange,
  onResetPlanningDate,
  variant = "full",
}: PlanSurfacePanelProps) {
  const isCompact = variant === "compact";
  const dayAppointments = planningDay.scheduledAppointments.slice(0, visibleWorkLimit);
  const dayDeadlines = planningDay.deadlineMarkers.slice(0, visibleWorkLimit);
  const unscheduledWork = planningDay.unscheduledWork.slice(0, visibleWorkLimit);
  const localBlocks = planningDay.timeBlocks.slice(0, visibleWorkLimit);
  const conflicts = planningDay.conflicts.slice(0, visibleWorkLimit);
  const topRisks = scheduleReview.risks
    .filter((risk) => risk.kind !== "waiting_on" && risk.kind !== "blocked")
    .slice(0, reviewItemLimit);
  const waitingOrBlockedRisks = scheduleReview.risks
    .filter((risk) => risk.kind === "waiting_on" || risk.kind === "blocked")
    .slice(0, reviewItemLimit);
  const recommendedBlocks = scheduleReview.recommendedBlocks.slice(0, reviewItemLimit);
  const openGaps = scheduleReview.openGaps.slice(0, reviewItemLimit);
  const [timeBlockForm, setTimeBlockForm] = useState<TimeBlockFormState | null>(null);
  const [completionPrompt, setCompletionPrompt] = useState<CompletionPromptState | null>(null);
  const [formError, setFormError] = useState("");
  const [draftPlanResult, setDraftPlanResult] = useState<GenerateDraftPlanResult | null>(null);
  const [draftPlanLoading, setDraftPlanLoading] = useState(false);
  const [draftPlanError, setDraftPlanError] = useState("");
  const [publishProvider, setPublishProvider] = useState<TimeBlockPublishProvider>("google");
  const [publishConnectionId, setPublishConnectionId] = useState("");
  const [selectedPublishBlockIds, setSelectedPublishBlockIds] = useState<string[]>([]);
  const [publishPreview, setPublishPreview] = useState<TimeBlockPublishPreview | null>(null);
  const [publishResult, setPublishResult] = useState<ConfirmTimeBlockPublishResult | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const draftRequestIdRef = useRef(0);
  const today = formatDateInput(new Date().toISOString());
  const now = new Date();
  const isViewingToday = planningDay.targetDate === today;
  const scheduleReviewFingerprint = [
    scheduleReview.targetDate,
    scheduleReview.summary.scheduledMinutes,
    scheduleReview.summary.openMinutes,
    scheduleReview.summary.recommendedBlockCount,
    scheduleReview.recommendedBlocks.map((recommendation) => recommendation.id).join("|"),
  ].join(":");
  const draftPlan = draftPlanResult?.draftPlan ?? null;
  const draftBlocks = draftPlan?.proposedBlocks.slice(0, reviewItemLimit) ?? [];
  const hourMarkers = Array.from(
    { length: timelineEndHour - timelineStartHour + 1 },
    (_, index) => timelineStartHour + index
  );
  const timelineItems: TimelineItem[] = [
    ...planningDay.scheduledAppointments
      .filter((appointment) => !appointment.allDay && Boolean(appointment.endsAt))
      .map((appointment) => ({
        id: appointment.id,
        title: appointment.title,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt ?? appointment.startsAt,
        source: "external" as const,
        meta: appointment.sourceSystem,
      })),
    ...planningDay.timeBlocks.map((block) => ({
      id: block.id,
      title: block.title,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      source: "local" as const,
      status: block.status,
      meta: block.entityKind,
    })),
  ].sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const missedLocalBlocks = timelineItems.filter(
    (item) =>
      item.source === "local" &&
      item.status === "planned" &&
      isViewingToday &&
      new Date(item.endsAt).getTime() < now.getTime()
  );
  const visibleTimelineItems = timelineItems.filter((item) => {
    if (!isViewingToday) {
      return true;
    }
    const endTime = new Date(item.endsAt).getTime();
    return endTime >= now.getTime();
  });
  const visibleAppointmentCards = dayAppointments.filter(
    (appointment) =>
      !isViewingToday ||
      !appointment.endsAt ||
      new Date(appointment.endsAt).getTime() >= now.getTime()
  );
  const visibleLocalBlockCards = localBlocks.filter((block) => {
    if (!isViewingToday) {
      return true;
    }
    const endTime = new Date(block.endsAt).getTime();
    return endTime >= now.getTime() || block.status === "planned";
  });
  const publishConnections = calendarConnections.filter(
    (connection) => connection.provider === publishProvider && connection.enabled
  );
  const latestPublishByBlock = new Map<string, TimeBlockPublishRecord>();
  for (const publish of [...timeBlockPublishes].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  )) {
    if (!latestPublishByBlock.has(publish.timeBlockId)) {
      latestPublishByBlock.set(publish.timeBlockId, publish);
    }
  }
  const selectedPublishConnection =
    (publishConnectionId
      ? publishConnections.find((connection) => connection.id === publishConnectionId)
      : publishConnections[0]) ?? null;
  const publishableBlocks = planningDay.timeBlocks.filter((block) => block.status === "planned");
  const publishPreviewReadyItems =
    publishPreview?.items.filter((item) => item.status === "ready") ?? [];

  const setPublishProviderSelection = (provider: TimeBlockPublishProvider) => {
    setPublishProvider(provider);
    setPublishConnectionId("");
    setPublishPreview(null);
    setPublishResult(null);
    setPublishError("");
  };

  const togglePublishBlock = (id: string) => {
    setSelectedPublishBlockIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id]
    );
    setPublishPreview(null);
    setPublishResult(null);
  };

  const retryFailedPublish = (publish: TimeBlockPublishRecord) => {
    setPublishProvider(publish.provider);
    setPublishConnectionId(publish.calendarConnectionId);
    setSelectedPublishBlockIds([publish.timeBlockId]);
    setPublishPreview(null);
    setPublishResult(null);
    setPublishError("Build a fresh preview before retrying this failed publish.");
  };

  const publishRequestInput = (): TimeBlockPublishPreviewRequest | null => {
    if (!selectedPublishConnection) {
      setPublishError("Choose a ready Google or Outlook calendar source before previewing publish.");
      return null;
    }
    if (selectedPublishBlockIds.length === 0) {
      setPublishError("Select at least one planned local block to publish.");
      return null;
    }
    return {
      selectedTimeBlockIds: selectedPublishBlockIds,
      provider: publishProvider,
      calendarConnectionId: selectedPublishConnection.id,
      providerCalendarId: selectedPublishConnection.accountRef,
    };
  };

  const requestPublishPreview = async () => {
    const input = publishRequestInput();
    if (!input) {
      return;
    }
    setPublishLoading(true);
    setPublishError("");
    setPublishResult(null);
    try {
      const preview = await previewTimeBlockPublish(input);
      setPublishPreview(preview);
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : "Praxis could not build a publish preview."
      );
    } finally {
      setPublishLoading(false);
    }
  };

  const confirmPublishPreview = async () => {
    const input = publishRequestInput();
    if (!input || !publishPreview) {
      return;
    }
    const confirmedTimeBlockIds = publishPreviewReadyItems.map((item) => item.timeBlockId);
    if (confirmedTimeBlockIds.length === 0) {
      setPublishError("No preview-ready blocks are available to publish.");
      return;
    }
    setPublishLoading(true);
    setPublishError("");
    try {
      const result = await confirmTimeBlockPublish({
        ...input,
        confirmedTimeBlockIds,
      });
      setPublishResult(result);
      setPublishPreview(null);
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Praxis could not publish blocks.");
    } finally {
      setPublishLoading(false);
    }
  };

  const openManualBlock = () => {
    setFormError("");
    setTimeBlockForm(emptyBlockForm(planningDay.targetDate));
  };

  const openWorkBlock = (work: PlanningWorkCandidate) => {
    const durationMinutes = work.estimatedMinutes ?? 30;
    setFormError("");
    setTimeBlockForm({
      ...emptyBlockForm(planningDay.targetDate),
      title: work.title,
      endTime: addMinutesToTime("09:00", durationMinutes),
      durationMinutes,
      entityKind: "todo",
      entityId: work.id,
      notes: "",
      tags: tagList([
        reasonLabel(work.reason),
        work.priority,
        work.quickAction ? "quick" : null,
        work.projectTitle ? `Project: ${work.projectTitle}` : null,
        work.missionTitle ? `Mission: ${work.missionTitle}` : null,
      ]),
    });
  };

  const openProjectBlock = (project: ProjectRecord) => {
    setFormError("");
    setTimeBlockForm({
      ...emptyBlockForm(planningDay.targetDate),
      title: project.title,
      entityKind: "project",
      entityId: project.id,
      notes: "",
      tags: tagList(["project", project.summary]),
    });
  };

  const openMissionBlock = (mission: MissionRecord) => {
    setFormError("");
    setTimeBlockForm({
      ...emptyBlockForm(planningDay.targetDate),
      title: mission.title,
      entityKind: "mission",
      entityId: mission.id,
      notes: "",
      tags: tagList(["mission", mission.summary]),
    });
  };

  const openEditBlock = (block: PlanningTimeBlockItem) => {
    setFormError("");
    setTimeBlockForm(formFromBlock(block));
  };

  const openRecommendationBlock = (recommendation: ScheduleRecommendedBlock) => {
    setFormError("");
    setTimeBlockForm(formFromRecommendation(recommendation, planningDay.targetDate));
  };

  const openDraftBlock = (block: DraftPlanProposedBlock) => {
    setFormError("");
    setTimeBlockForm(formFromDraftBlock(block));
  };

  useEffect(() => {
    draftRequestIdRef.current += 1;
    setDraftPlanResult(null);
    setDraftPlanError("");
  }, [scheduleReviewFingerprint]);

  const requestDraftPlan = async () => {
    const requestId = draftRequestIdRef.current + 1;
    draftRequestIdRef.current = requestId;
    setDraftPlanLoading(true);
    setDraftPlanError("");
    try {
      const result = await generateDraftPlan({ scheduleReview, maxBlocks: reviewItemLimit });
      if (draftRequestIdRef.current !== requestId) {
        return;
      }
      setDraftPlanResult(result);
    } catch (error) {
      if (draftRequestIdRef.current !== requestId) {
        return;
      }
      setDraftPlanError(
        error instanceof Error ? error.message : "Praxis could not build an AI draft plan."
      );
    } finally {
      if (draftRequestIdRef.current === requestId) {
        setDraftPlanLoading(false);
      }
    }
  };

  const shiftPlanningDay = (dayCount: number) => {
    setFormError("");
    setCompletionPrompt(null);
    setTimeBlockForm(null);
    setPublishPreview(null);
    setPublishResult(null);
    setPublishError("");
    onPlanningDateChange(addDaysToDate(planningDay.targetDate, dayCount));
  };

  const setDuration = (minutes: number) => {
    setTimeBlockForm((current) =>
      current
        ? {
            ...current,
            durationMinutes: minutes,
            endTime: addMinutesToTime(current.startTime, minutes),
          }
        : current
    );
  };

  const submitTimeBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!timeBlockForm) {
      return;
    }

    const title = timeBlockForm.title.trim();
    const startsAt = combineLocalDateTime(timeBlockForm.date, timeBlockForm.startTime);
    const endsAt = combineLocalDateTime(timeBlockForm.date, timeBlockForm.endTime);
    if (!title) {
      setFormError("Title is required.");
      return;
    }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setFormError("End time must be after start time.");
      return;
    }

    const input = {
      title,
      startsAt,
      endsAt,
      entityKind: timeBlockForm.entityKind,
      entityId: timeBlockForm.entityKind === "manual" ? null : timeBlockForm.entityId,
      notes: timeBlockForm.notes.trim() || null,
    };

    try {
      if (timeBlockForm.id) {
        await updateTimeBlock({ id: timeBlockForm.id, ...input });
      } else {
        await createTimeBlock(input);
      }
      setTimeBlockForm(null);
      setFormError("");
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Praxis could not save this block.");
    }
  };

  const updateBlockStatus = async (
    id: string,
    status: "canceled" | "completed",
    actualMinutes?: number
  ) => {
    try {
      const input: UpdateTimeBlockInput = { id, status };
      if (status === "completed" && actualMinutes !== undefined) {
        input.actualMinutes = actualMinutes;
      }
      await updateTimeBlock(input);
      setCompletionPrompt(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Praxis could not update this block.");
    }
  };

  const promptForCompletion = (block: PlanningTimeBlockItem) => {
    setFormError("");
    setCompletionPrompt({
      block,
      actualMinutes: minutesBetween(block.startsAt, block.endsAt),
    });
  };

  const removeBlock = async (id: string) => {
    try {
      await deleteTimeBlock(id);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Praxis could not delete this block.");
    }
  };

  if (isCompact) {
    return (
      <section
        className={`panel plan-surface-panel is-plan-compact${
          isActive ? " is-active-panel" : ""
        }`}
      >
        <div className="plan-surface-header">
          <div>
            <div className="plan-title-row">
              <span className="recommended-label">Plan</span>
              <span className="plan-current-time" aria-label={`Current time ${currentTimeLabel}`}>
                <span className="plan-current-time-label">Now</span>
                <strong>{currentTimeLabel}</strong>
              </span>
            </div>
            <h2>Day Plan</h2>
            <p className="brief-path">{selectedDateLabel}</p>
          </div>
          <div className="plan-surface-mode" aria-label="Planning mode">
            <span className="badge">Local {planningDay.timeBlocks.length}</span>
            <span className="badge waiting-badge">No write-back</span>
          </div>
        </div>

        <div className="plan-compact-grid" aria-label="Planning summary">
          <span className="plan-compact-tile">
            <span>External</span>
            <strong>{planningDay.scheduledAppointments.length}</strong>
            <p>locked appointments</p>
          </span>
          <span className="plan-compact-tile">
            <span>Local</span>
            <strong>{planningDay.timeBlocks.length}</strong>
            <p>Praxis blocks</p>
          </span>
          <span className="plan-compact-tile">
            <span>Unscheduled</span>
            <strong>{planningDay.unscheduledWork.length}</strong>
            <p>work candidates</p>
          </span>
          <span className="plan-compact-tile">
            <span>Review</span>
            <strong>{scheduleReview.summary.state}</strong>
            <p>{scheduleReview.summary.recommendedBlockCount} next blocks</p>
          </span>
        </div>

        <div className="plan-review-compact" aria-label="Schedule review summary">
          <span className={`badge plan-load-${scheduleReview.summary.state}`}>
            {scheduleReview.summary.state}
          </span>
          <p>{scheduleReview.summary.message}</p>
        </div>

        <ol className="plan-compact-list" aria-label="Next plan items">
          {localBlocks.slice(0, compactItemLimit).map((block) => (
            <li key={block.id}>
              <span>{block.status}</span>
              <strong>{block.title}</strong>
              <span className="badge">local</span>
            </li>
          ))}
          {dayAppointments.slice(0, compactItemLimit).map((appointment) => (
            <li key={appointment.id}>
              <span>{appointment.allDay ? "All day" : formatDateTime(appointment.startsAt)}</span>
              <strong>{appointment.title}</strong>
              <span className="badge">{appointment.sourceSystem}</span>
            </li>
          ))}
          {unscheduledWork.slice(0, compactItemLimit).map((work) => (
            <li key={work.id}>
              <span>{reasonLabel(work.reason)}</span>
              <strong>{work.title}</strong>
              <span className="badge">{work.priority}</span>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className={`panel plan-surface-panel${isActive ? " is-active-panel" : ""}`}>
      <div className="plan-surface-header">
        <div>
          <div className="plan-title-row">
            <span className="recommended-label">Plan</span>
            <span className="plan-current-time" aria-label={`Current time ${currentTimeLabel}`}>
              <span className="plan-current-time-label">Now</span>
              <strong>{currentTimeLabel}</strong>
            </span>
          </div>
          <h2>Day Plan</h2>
          <p className="brief-path">{selectedDateLabel}</p>
        </div>
        <div className="plan-date-controls" aria-label="Plan day controls">
          <button type="button" onClick={() => shiftPlanningDay(-1)}>
            Previous
          </button>
          <label>
            Day
            <input
              type="date"
              value={planningDay.targetDate}
              onChange={(event) => onPlanningDateChange(event.currentTarget.value)}
            />
          </label>
          <button type="button" onClick={() => shiftPlanningDay(1)}>
            Next
          </button>
          <button
            type="button"
            disabled={planningDay.targetDate === basePlanningDate}
            onClick={onResetPlanningDate}
          >
            Brief day
          </button>
        </div>
        <div className="plan-surface-mode" aria-label="Planning mode">
          <span className="badge">Local blocks</span>
          <span className="badge waiting-badge">No Google/Outlook write-back</span>
          <button type="button" onClick={openManualBlock}>
            Manual block
          </button>
        </div>
      </div>

      {timeBlockForm ? (
        <form className="plan-block-drawer" onSubmit={(event) => void submitTimeBlock(event)}>
          <div>
            <span className="recommended-label">
              {timeBlockForm.id ? "Edit Local Placement" : "Place Local Block"}
            </span>
            <strong>This creates only a local Praxis block.</strong>
            <p>It will not update Google, Outlook, or send invites.</p>
          </div>
          <label>
            Title
            <input
              value={timeBlockForm.title}
              onChange={(event) =>
                setTimeBlockForm({ ...timeBlockForm, title: event.currentTarget.value })
              }
            />
          </label>
          <div className="plan-block-form-grid">
            <label>
              Date
              <input
                type="date"
                value={timeBlockForm.date}
                onChange={(event) =>
                  setTimeBlockForm({ ...timeBlockForm, date: event.currentTarget.value })
                }
              />
            </label>
            <label>
              Start
              <input
                type="time"
                value={timeBlockForm.startTime}
                onChange={(event) =>
                  setTimeBlockForm({
                    ...timeBlockForm,
                    startTime: event.currentTarget.value,
                    endTime: addMinutesToTime(
                      event.currentTarget.value,
                      timeBlockForm.durationMinutes
                    ),
                  })
                }
              />
            </label>
          </div>
          <div className="plan-duration-buttons" aria-label="Duration presets">
            {durationOptions.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={timeBlockForm.durationMinutes === minutes ? "is-nav-active" : ""}
                onClick={() => setDuration(minutes)}
              >
                {minutes} min
              </button>
            ))}
          </div>
          {timeBlockForm.tags.length > 0 ? (
            <div className="plan-block-tags" aria-label="Scheduling tags">
              <span>Tags</span>
              {timeBlockForm.tags.map((tag) => (
                <span key={tag} className="plan-tag-chip">
                  {tag}
                </span>
              ))}
              <p>Tags are UI-only in this pass; notes stay freeform.</p>
            </div>
          ) : null}
          <details className="plan-advanced-drawer">
            <summary>Details</summary>
            <div className="plan-block-form-grid">
              <label>
                End
                <input
                  type="time"
                  value={timeBlockForm.endTime}
                  onChange={(event) =>
                    setTimeBlockForm({ ...timeBlockForm, endTime: event.currentTarget.value })
                  }
                />
              </label>
              <label>
                Type
                <input value={timeBlockForm.entityKind} readOnly />
              </label>
              <label>
                Link
                <input value={timeBlockForm.entityId ?? "manual"} readOnly />
              </label>
            </div>
            <label>
              Notes
              <textarea
                rows={3}
                placeholder="Freeform notes for doing the work."
                value={timeBlockForm.notes}
                onChange={(event) =>
                  setTimeBlockForm({ ...timeBlockForm, notes: event.currentTarget.value })
                }
              />
            </label>
          </details>
          {conflicts.length > 0 ? (
            <p className="plan-conflict-copy">
              This day already has {conflicts.length} overlap warning
              {conflicts.length === 1 ? "" : "s"}. Review the schedule before saving.
            </p>
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <div className="plan-block-form-actions">
            <button type="submit">{timeBlockForm.id ? "Save local block" : "Create local block"}</button>
            <button type="button" onClick={() => setTimeBlockForm(null)}>
              Close
            </button>
          </div>
        </form>
      ) : null}

      {completionPrompt ? (
        <section className="plan-completion-prompt" aria-label="Completion duration">
          <div>
            <span className="recommended-label">Complete Block</span>
            <strong>{completionPrompt.block.title}</strong>
            <p>How long did it actually take?</p>
          </div>
          <label>
            Actual duration
            <select
              value={completionPrompt.actualMinutes}
              onChange={(event) =>
                setCompletionPrompt({
                  ...completionPrompt,
                  actualMinutes: Number(event.currentTarget.value),
                })
              }
            >
              {[15, 30, 45, 60, 90, 120].map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes} min
                </option>
              ))}
            </select>
          </label>
          <p className="plan-conflict-copy">
            Actual duration is saved locally for future planning.
          </p>
          <div className="plan-block-form-actions">
            <button
              type="button"
              onClick={() =>
                void updateBlockStatus(
                  completionPrompt.block.id,
                  "completed",
                  completionPrompt.actualMinutes
                )
              }
            >
              Mark complete
            </button>
            <button type="button" onClick={() => setCompletionPrompt(null)}>
              Close
            </button>
          </div>
        </section>
      ) : null}

      <section className="plan-review-section" aria-label="Schedule review">
        <div className="plan-review-header">
          <div>
            <span className="recommended-label">Schedule Review</span>
            <h3>What needs attention</h3>
            <p>{scheduleReview.summary.message}</p>
          </div>
          <div className="plan-review-load">
            <span className={`badge plan-load-${scheduleReview.summary.state}`}>
              {scheduleReview.summary.state}
            </span>
            <strong>{scheduleReview.summary.scheduledMinutes} min scheduled</strong>
            <span>{scheduleReview.summary.openMinutes} min open</span>
          </div>
        </div>

        <div className="plan-review-grid">
          <section>
            <div className="plan-lane-header">
              <h4>Top Risks</h4>
              <span className="badge">{topRisks.length}</span>
            </div>
            {topRisks.length > 0 ? (
              <ol className="plan-review-list">
                {topRisks.map((risk) => (
                  <li key={risk.id} className={`plan-review-item is-${risk.severity}`}>
                    <strong>{risk.title}</strong>
                    <span className="badge">{risk.kind.replace(/_/g, " ")}</span>
                    <p>{risk.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brief-path">No top schedule risks detected.</p>
            )}
          </section>

          <section>
            <div className="plan-lane-header">
              <h4>Recommended Next Blocks</h4>
              <span className="badge">{recommendedBlocks.length}</span>
            </div>
            {recommendedBlocks.length > 0 ? (
              <ol className="plan-review-list">
                {recommendedBlocks.map((recommendation) => (
                  <li key={recommendation.id} className="plan-review-item">
                    <strong>{recommendation.title}</strong>
                    <span className="badge">{recommendation.estimatedMinutes} min</span>
                    <p>{recommendation.reason}</p>
                    {recommendation.projectTitle ? <p>{recommendation.projectTitle}</p> : null}
                    <button type="button" onClick={() => openRecommendationBlock(recommendation)}>
                      Schedule this
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brief-path">No recommended blocks fit the current open gaps.</p>
            )}
          </section>

          <section>
            <div className="plan-lane-header">
              <h4>Open Gaps</h4>
              <span className="badge">{openGaps.length}</span>
            </div>
            {openGaps.length > 0 ? (
              <ol className="plan-review-list">
                {openGaps.map((gap) => (
                  <li key={gap.id} className="plan-review-item">
                    <strong>{gap.minutes} minutes open</strong>
                    <p>
                      {formatDateTime(gap.startsAt)} - {formatPlanTime(gap.endsAt, timeFormat)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brief-path">No open planning gaps detected in the workday.</p>
            )}
          </section>

          <section>
            <div className="plan-lane-header">
              <h4>Blocked / Waiting</h4>
              <span className="badge">{scheduleReview.summary.waitingOrBlockedCount}</span>
            </div>
            {waitingOrBlockedRisks.length > 0 ? (
              <ol className="plan-review-list">
                {waitingOrBlockedRisks.map((risk) => (
                  <li key={risk.id} className="plan-review-item">
                    <strong>{risk.title}</strong>
                    <span className="badge">{risk.kind.replace(/_/g, " ")}</span>
                    <p>{risk.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brief-path">No blocked or waiting-on work in the review.</p>
            )}
          </section>
        </div>
      </section>

      <section className="plan-draft-section" aria-label="AI draft planning">
        <div className="plan-review-header">
          <div>
            <span className="recommended-label">AI Draft Plan</span>
            <h3>Staged planning suggestions</h3>
            <p>
              Drafts use Schedule Review recommendations and only prefill local block review.
            </p>
          </div>
          <div className="plan-review-load">
            <span className="badge waiting-badge">No auto-create</span>
            <strong>{draftPlan ? draftPlan.source.replace(/_/g, " ") : "not generated"}</strong>
            <span>Google and Outlook remain read-only.</span>
          </div>
        </div>
        <div className="plan-draft-actions">
          <button
            type="button"
            disabled={draftPlanLoading || scheduleReview.recommendedBlocks.length === 0}
            onClick={() => void requestDraftPlan()}
          >
            {draftPlanLoading ? "Drafting..." : "Build draft plan"}
          </button>
          {draftPlanResult?.fallbackReason ? (
            <span className="badge">Fallback: {draftPlanResult.fallbackReason}</span>
          ) : draftPlanResult?.summarySource ? (
            <span className="badge">Source: {draftPlanResult.summarySource}</span>
          ) : null}
        </div>
        {draftPlanError ? <p className="form-error">{draftPlanError}</p> : null}
        {scheduleReview.recommendedBlocks.length === 0 ? (
          <p className="brief-path">
            No draft can be built until Schedule Review has a schedulable recommendation.
          </p>
        ) : null}
        {draftPlan ? (
          <div className="plan-draft-body">
            <p>{draftPlan.explanation}</p>
            {draftPlan.rejectedProposalReasons.length > 0 ? (
              <p className="plan-conflict-copy">
                {draftPlan.rejectedProposalReasons.slice(0, 2).join(" ")}
              </p>
            ) : null}
            {draftBlocks.length > 0 ? (
              <ol className="plan-review-list">
                {draftBlocks.map((block) => (
                  <li key={block.id} className="plan-review-item">
                    <strong>{block.title}</strong>
                    <span className="badge">{block.estimatedMinutes} min</span>
                    <span className="badge">{block.priority}</span>
                    <p>
                      {formatDateTime(block.startsAt)} - {formatPlanTime(block.endsAt, timeFormat)}
                    </p>
                    <p>{block.explanation}</p>
                    <button type="button" onClick={() => openDraftBlock(block)}>
                      Review local block
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brief-path">The draft did not find a safe block to stage.</p>
            )}
          </div>
        ) : null}
      </section>

      <section className="plan-review-section" aria-label="Calendar publish">
        <div className="plan-review-header">
          <div>
            <span className="recommended-label">Publish</span>
            <h3>Provider calendar write-back</h3>
            <p>
              Publish selected planned local blocks to Google or Outlook after preview and
              confirmation.
            </p>
          </div>
          <div className="plan-review-load">
            <span className="badge waiting-badge">Create-only</span>
            <strong>{publishPreview ? `${publishPreview.readyCount} ready` : "not previewed"}</strong>
            <span>No update or delete write-back.</span>
          </div>
        </div>

        <div className="settings-field-grid">
          <label className="field-label">
            <span>Provider</span>
            <select
              value={publishProvider}
              onChange={(event) =>
                setPublishProviderSelection(event.currentTarget.value as TimeBlockPublishProvider)
              }
            >
              <option value="google">Google Calendar</option>
              <option value="outlook">Outlook Calendar</option>
            </select>
          </label>
          <label className="field-label">
            <span>Destination calendar</span>
            <select
              value={selectedPublishConnection?.id ?? ""}
              onChange={(event) => {
                setPublishConnectionId(event.currentTarget.value);
                setPublishPreview(null);
                setPublishResult(null);
              }}
            >
              {publishConnections.length === 0 ? (
                <option value="">No enabled {publishProvider} calendar source</option>
              ) : null}
              {publishConnections.map((connection) => (
                <option key={connection.id} value={connection.id}>
                  {connection.label} ({connection.authStatus})
                </option>
              ))}
            </select>
          </label>
        </div>

        {publishableBlocks.length > 0 ? (
          <ol className="plan-review-list">
            {publishableBlocks.slice(0, reviewItemLimit).map((block) => {
              const publish = latestPublishByBlock.get(block.id) ?? null;
              return (
                <li key={block.id} className="plan-review-item">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedPublishBlockIds.includes(block.id)}
                      onChange={() => togglePublishBlock(block.id)}
                    />
                    <span>
                      <strong>{block.title}</strong>
                      <br />
                      {blockRangeLabel(block, formatDateTime, timeFormat)}
                    </span>
                  </label>
                  <span className={publishBadgeClass(publish)}>{publishBadgeLabel(publish)}</span>
                  {publish?.status === "publish_failed" && publish.lastError ? (
                    <p className="plan-conflict-copy">{publish.lastError}</p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="brief-path">No planned local blocks are available to publish.</p>
        )}

        <div className="plan-draft-actions">
          <button
            type="button"
            disabled={publishLoading || publishableBlocks.length === 0}
            onClick={() => void requestPublishPreview()}
          >
            {publishLoading ? "Checking..." : "Preview publish"}
          </button>
          <button
            type="button"
            disabled={publishLoading || publishPreviewReadyItems.length === 0}
            onClick={() => void confirmPublishPreview()}
          >
            Confirm publish
          </button>
          {publishPreview ? (
            <span className="badge">
              {publishPreview.readyCount} ready / {publishPreview.blockedCount} blocked
            </span>
          ) : null}
        </div>
        {publishError ? <p className="form-error">{publishError}</p> : null}

        {publishPreview ? (
          <ol className="plan-marker-list">
            {publishPreview.items.map((item) => (
              <li key={item.timeBlockId} className="plan-marker-item">
                <strong>{item.title}</strong>
                <span className={item.status === "ready" ? "badge" : "badge waiting-badge"}>
                  {item.status.replace(/_/g, " ")}
                </span>
                <p>{item.reason}</p>
                {item.conflictIds.length > 0 ? (
                  <p className="plan-conflict-copy">
                    {item.conflictIds.length} imported appointment conflict
                    {item.conflictIds.length === 1 ? "" : "s"}.
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : null}

        {publishResult ? (
          <p className="brief-path">
            Publish result: {publishResult.publishedCount} created, {publishResult.skippedCount}{" "}
            skipped, {publishResult.failedCount} failed.
          </p>
        ) : null}
      </section>

      <div className="plan-surface-grid">
        <section className="plan-day-column" aria-label="Unified day schedule">
          <div className="plan-lane-header">
            <h3>Schedule</h3>
            <span className="badge">{planningDay.scheduledAppointments.length} external</span>
          </div>
          <div className="plan-placement-panel" aria-label="Visual block placement">
            <span className="recommended-label">Place Work</span>
            <div className="plan-placement-actions">
              {recommendedBlocks.slice(0, 3).map((recommendation) => (
                <button
                  key={recommendation.id}
                  type="button"
                  onClick={() => openRecommendationBlock(recommendation)}
                >
                  {recommendation.title}
                </button>
              ))}
              <button type="button" onClick={openManualBlock}>
                Manual
              </button>
            </div>
          </div>

          {missedLocalBlocks.length > 0 ? (
            <div className="plan-missed-strip" aria-label="Missed local blocks">
              <span className="badge urgent-badge">Missed earlier</span>
              {missedLocalBlocks.map((item) => (
                <strong key={item.id}>{item.title}</strong>
              ))}
            </div>
          ) : null}

          <div className="plan-visual-timeline" aria-label="Visual day timeline">
            <div className="plan-timeline-hours" aria-hidden="true">
              {hourMarkers.map((hour) => (
                <span key={hour}>{formatTimelineHour(hour, timeFormat)}</span>
              ))}
            </div>
            <div className="plan-timeline-lane">
              {visibleTimelineItems.length > 0 ? (
                visibleTimelineItems.map((item) => (
                  <div
                    key={`${item.source}-${item.id}`}
                    className={`plan-timeline-item is-${item.source}${
                      item.status ? ` is-${item.status}` : ""
                    }`}
                    style={timelinePosition(item.startsAt, item.endsAt)}
                  >
                    <span>{formatPlanTime(item.startsAt, timeFormat)}</span>
                    <strong>{item.title}</strong>
                    <em>{item.source === "external" ? "locked" : item.meta}</em>
                  </div>
                ))
              ) : (
                <div className="plan-timeline-empty">
                  <strong>No remaining scheduled blocks for this day.</strong>
                  <p>Past time is hidden unless a planned local block was missed.</p>
                </div>
              )}
            </div>
          </div>

          {visibleAppointmentCards.length > 0 ? (
            <ol className="plan-time-list">
              {visibleAppointmentCards.map((appointment) => (
                <li key={appointment.id} className="plan-time-block is-external">
                  <span className="plan-time-range">
                    {appointment.allDay ? "All day" : formatDateTime(appointment.startsAt)}
                  </span>
                  <strong>{appointment.title}</strong>
                  <span className="badge">locked</span>
                  <span className="badge">{appointment.sourceSystem}</span>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              title="No imported appointments"
              detail="Google and Outlook events will appear here as locked external blocks."
            />
          )}

          <div className="plan-lane-header">
            <h3>Local Blocks</h3>
            <span className="badge">{planningDay.timeBlocks.length} planned</span>
          </div>
          {visibleLocalBlockCards.length > 0 ? (
            <ol className="plan-time-list">
              {visibleLocalBlockCards.map((timeBlock) => {
                const publish = latestPublishByBlock.get(timeBlock.id) ?? null;
                return (
                  <li key={timeBlock.id} className="plan-time-block is-local">
                    <span className="plan-time-range">
                      {blockRangeLabel(timeBlock, formatDateTime, timeFormat)}
                    </span>
                    <strong>{timeBlock.title}</strong>
                    <span className="badge">{timeBlock.status}</span>
                    <span className="badge">{timeBlock.entityKind}</span>
                    <span className={publishBadgeClass(publish)}>{publishBadgeLabel(publish)}</span>
                    {timeBlock.status === "completed" && timeBlock.actualMinutes ? (
                      <span className="badge">Actual {timeBlock.actualMinutes} min</span>
                    ) : null}
                    {publish?.status === "publish_failed" && publish.lastError ? (
                      <p className="plan-conflict-copy">{publish.lastError}</p>
                    ) : null}
                    <div className="plan-block-actions">
                      <button type="button" onClick={() => openEditBlock(timeBlock)}>
                        Edit
                      </button>
                      {timeBlock.status !== "completed" ? (
                        <button type="button" onClick={() => promptForCompletion(timeBlock)}>
                          Complete
                        </button>
                      ) : null}
                      {publish?.status === "publish_failed" ? (
                        <button type="button" onClick={() => retryFailedPublish(publish)}>
                          Retry publish
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void updateBlockStatus(timeBlock.id, "canceled")}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => void removeBlock(timeBlock.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="plan-local-placeholder">
              <div>
                <span className="recommended-label">Local Blocks</span>
                <strong>Time blocks will land here after explicit review.</strong>
                <p>
                  V1 keeps blocks local. Google and Outlook write-back waits for a separate
                  confirmation flow.
                </p>
                <button type="button" onClick={openManualBlock}>
                  Manual block
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="plan-work-rail" aria-label="Work to schedule">
          <section>
            <div className="plan-lane-header">
              <h3>Deadlines</h3>
              <span className="badge">{planningDay.deadlineMarkers.length} markers</span>
            </div>
            {dayDeadlines.length > 0 ? (
              <ol className="plan-marker-list">
                {dayDeadlines.map((deadline) => (
                  <li key={deadline.id} className="plan-marker-item">
                    <strong>{deadline.title}</strong>
                    <span className="badge urgent-badge">{formatDateTime(deadline.dueAt)}</span>
                    <span className="badge">{deadline.entityKind}</span>
                    <span className="badge">{deadline.priority}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No deadline markers"
                detail="Deadlines stay as day markers until the operator schedules a work block."
              />
            )}
          </section>

          <section>
            <div className="plan-lane-header">
              <h3>Unscheduled Work</h3>
              <span className="badge">{planningDay.unscheduledWork.length} candidates</span>
            </div>
            {unscheduledWork.length > 0 ? (
              <ol className="plan-marker-list">
                {unscheduledWork.map((work) => (
                  <li key={work.id} className="plan-marker-item">
                    <strong>{work.title}</strong>
                    <span className="badge">{reasonLabel(work.reason)}</span>
                    <span className="badge">{work.priority}</span>
                    {work.estimatedMinutes ? (
                      <span className="badge">{work.estimatedMinutes} min</span>
                    ) : null}
                    {work.quickAction ? <span className="badge">quick</span> : null}
                    <button type="button" onClick={() => openWorkBlock(work)}>
                      Schedule
                    </button>
                    {work.projectTitle ? <p>{work.projectTitle}</p> : null}
                    {work.missionTitle ? <p>{work.missionTitle}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No unscheduled todos"
                detail="Active todos will queue here for click-to-schedule in a later slice."
              />
            )}
          </section>

          <section>
            <div className="plan-lane-header">
              <h3>Conflicts</h3>
              <span className="badge">{planningDay.conflicts.length} warnings</span>
            </div>
            {conflicts.length > 0 ? (
              <ol className="plan-marker-list">
                {conflicts.map((conflict) => (
                  <li key={conflict.id} className="plan-marker-item">
                    <strong>{conflict.message}</strong>
                    <span className="badge urgent-badge">{conflict.severity}</span>
                    <p>{conflict.itemIds.length} scheduled items overlap.</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="brief-path">No local block conflicts detected for this day.</p>
            )}
          </section>

          <section className="plan-context-strip" aria-label="Planning context">
            <h3>Context</h3>
            <div className="plan-context-grid">
              <span className="surface-tile">
                <span>Projects</span>
                <strong>{activeProjects.length}</strong>
                <p>active candidates</p>
              </span>
              <span className="surface-tile">
                <span>Missions</span>
                <strong>{activeMissions.length}</strong>
                <p>active anchors</p>
              </span>
            </div>
            <div className="plan-context-actions">
              {activeProjects.slice(0, 3).map((project) => (
                <button key={project.id} type="button" onClick={() => openProjectBlock(project)}>
                  Schedule project: {project.title}
                </button>
              ))}
              {activeMissions.slice(0, 3).map((mission) => (
                <button key={mission.id} type="button" onClick={() => openMissionBlock(mission)}>
                  Schedule mission: {mission.title}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
