import type { PlanningDayView } from "../../shared/timeBlocking";
import { EmptyState } from "./EmptyState";

type PlanSurfacePanelProps = {
  isActive: boolean;
  planningDay: PlanningDayView;
  selectedDateLabel: string;
  formatDateTime: (value: string | null) => string;
  activeProjectCount: number;
  activeMissionCount: number;
  variant?: "full" | "compact";
};

const visibleWorkLimit = 6;
const compactItemLimit = 2;

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

export function PlanSurfacePanel({
  isActive,
  planningDay,
  selectedDateLabel,
  formatDateTime,
  activeProjectCount,
  activeMissionCount,
  variant = "full",
}: PlanSurfacePanelProps) {
  const isCompact = variant === "compact";
  const dayAppointments = planningDay.scheduledAppointments.slice(0, visibleWorkLimit);
  const dayDeadlines = planningDay.deadlineMarkers.slice(0, visibleWorkLimit);
  const unscheduledWork = planningDay.unscheduledWork.slice(0, visibleWorkLimit);
  const localBlocks = planningDay.timeBlocks.slice(0, visibleWorkLimit);
  const conflicts = planningDay.conflicts.slice(0, visibleWorkLimit);

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
            <span className="badge">Read-only</span>
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
            <span>Deadlines</span>
            <strong>{planningDay.deadlineMarkers.length}</strong>
            <p>day markers</p>
          </span>
          <span className="plan-compact-tile">
            <span>Unscheduled</span>
            <strong>{planningDay.unscheduledWork.length}</strong>
            <p>work candidates</p>
          </span>
          <span className="plan-compact-tile">
            <span>Conflicts</span>
            <strong>{planningDay.conflicts.length}</strong>
            <p>read-only warnings</p>
          </span>
        </div>

        <ol className="plan-compact-list" aria-label="Next plan items">
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
          <span className="badge">Read-only calendar</span>
          <span className="badge waiting-badge">No write-back</span>
        </div>
      </div>

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
                <li key={timeBlock.id} className="plan-time-block">
                  <span className="plan-time-range">{formatDateTime(timeBlock.startsAt)}</span>
                  <strong>{timeBlock.title}</strong>
                  <span className="badge">{timeBlock.status}</span>
                  <span className="badge">{timeBlock.source}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="plan-local-placeholder">
              <div>
                <span className="recommended-label">Local Blocks</span>
                <strong>Time blocks will land here after explicit review.</strong>
                <p>
                  V1 keeps blocks local. Google and Outlook write-back should wait for a separate
                  confirmation flow.
                </p>
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
                <strong>{activeProjectCount}</strong>
                <p>active candidates</p>
              </span>
              <span className="surface-tile">
                <span>Missions</span>
                <strong>{activeMissionCount}</strong>
                <p>active anchors</p>
              </span>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
