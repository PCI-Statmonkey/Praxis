import { useState, type FormEvent } from "react";
import type {
  CreateTimeBlockInput,
  PlanningDayView,
  PlanningTimeBlockItem,
  PlanningWorkCandidate,
  TimeBlockEntityKind,
  UpdateTimeBlockInput,
} from "../../shared/timeBlocking";
import type { MissionRecord, ProjectRecord } from "../../shared/workModel";
import { EmptyState } from "./EmptyState";

type PlanSurfacePanelProps = {
  isActive: boolean;
  planningDay: PlanningDayView;
  selectedDateLabel: string;
  formatDateTime: (value: string | null) => string;
  activeProjects: ProjectRecord[];
  activeMissions: MissionRecord[];
  createTimeBlock: (input: CreateTimeBlockInput) => Promise<void>;
  updateTimeBlock: (input: UpdateTimeBlockInput) => Promise<void>;
  deleteTimeBlock: (id: string) => Promise<void>;
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
};

const visibleWorkLimit = 6;
const compactItemLimit = 2;
const durationOptions = [15, 30, 45, 60, 90];

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

const blockRangeLabel = (block: PlanningTimeBlockItem, formatDateTime: (value: string) => string) =>
  `${formatDateTime(block.startsAt)} - ${formatTimeInput(block.endsAt)}`;

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
});

export function PlanSurfacePanel({
  isActive,
  planningDay,
  selectedDateLabel,
  formatDateTime,
  activeProjects,
  activeMissions,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  variant = "full",
}: PlanSurfacePanelProps) {
  const isCompact = variant === "compact";
  const dayAppointments = planningDay.scheduledAppointments.slice(0, visibleWorkLimit);
  const dayDeadlines = planningDay.deadlineMarkers.slice(0, visibleWorkLimit);
  const unscheduledWork = planningDay.unscheduledWork.slice(0, visibleWorkLimit);
  const localBlocks = planningDay.timeBlocks.slice(0, visibleWorkLimit);
  const conflicts = planningDay.conflicts.slice(0, visibleWorkLimit);
  const [timeBlockForm, setTimeBlockForm] = useState<TimeBlockFormState | null>(null);
  const [formError, setFormError] = useState("");

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
      notes: work.projectTitle ?? work.missionTitle ?? "",
    });
  };

  const openProjectBlock = (project: ProjectRecord) => {
    setFormError("");
    setTimeBlockForm({
      ...emptyBlockForm(planningDay.targetDate),
      title: project.title,
      entityKind: "project",
      entityId: project.id,
      notes: project.summary ?? "",
    });
  };

  const openMissionBlock = (mission: MissionRecord) => {
    setFormError("");
    setTimeBlockForm({
      ...emptyBlockForm(planningDay.targetDate),
      title: mission.title,
      entityKind: "mission",
      entityId: mission.id,
      notes: mission.summary ?? "",
    });
  };

  const openEditBlock = (block: PlanningTimeBlockItem) => {
    setFormError("");
    setTimeBlockForm(formFromBlock(block));
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

  const updateBlockStatus = async (id: string, status: "canceled" | "completed") => {
    try {
      await updateTimeBlock({ id, status });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Praxis could not update this block.");
    }
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
            <span className="recommended-label">Plan</span>
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
            <span>Conflicts</span>
            <strong>{planningDay.conflicts.length}</strong>
            <p>overlap warnings</p>
          </span>
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
          <span className="recommended-label">Plan</span>
          <h2>Day Plan</h2>
          <p className="brief-path">{selectedDateLabel}</p>
        </div>
        <div className="plan-surface-mode" aria-label="Planning mode">
          <span className="badge">Day</span>
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
              {timeBlockForm.id ? "Edit Local Block" : "Create Local Block"}
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
          <label>
            Notes
            <textarea
              rows={3}
              value={timeBlockForm.notes}
              onChange={(event) =>
                setTimeBlockForm({ ...timeBlockForm, notes: event.currentTarget.value })
              }
            />
          </label>
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

      <div className="plan-surface-grid">
        <section className="plan-day-column" aria-label="Unified day schedule">
          <div className="plan-lane-header">
            <h3>Schedule</h3>
            <span className="badge">{planningDay.scheduledAppointments.length} external</span>
          </div>
          {dayAppointments.length > 0 ? (
            <ol className="plan-time-list">
              {dayAppointments.map((appointment) => (
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
          {localBlocks.length > 0 ? (
            <ol className="plan-time-list">
              {localBlocks.map((timeBlock) => (
                <li key={timeBlock.id} className="plan-time-block is-local">
                  <span className="plan-time-range">{blockRangeLabel(timeBlock, formatDateTime)}</span>
                  <strong>{timeBlock.title}</strong>
                  <span className="badge">{timeBlock.status}</span>
                  <span className="badge">{timeBlock.entityKind}</span>
                  <div className="plan-block-actions">
                    <button type="button" onClick={() => openEditBlock(timeBlock)}>
                      Edit
                    </button>
                    {timeBlock.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() => void updateBlockStatus(timeBlock.id, "completed")}
                      >
                        Complete
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
              ))}
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
