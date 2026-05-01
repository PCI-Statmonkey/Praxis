import { forwardRef, type Dispatch, type SetStateAction, type ReactNode } from "react";
import type { AppointmentReport } from "../../shared/appointmentReport";
import type { DailyBrief, FocusReport } from "../../shared/dailyBrief";
import type { ProactiveSuggestion } from "../../shared/proactiveSuggestion";
import type { ReviewInboxItem } from "../../shared/reviewInbox";
import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  ProjectRecord,
  WorkStatus,
} from "../../shared/workModel";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./EmptyState";
import { DailyBriefHero } from "./mission-control/DailyBriefHero";
import { DailyRhythmCard } from "./mission-control/DailyRhythmCard";
import { DashboardReadinessCard } from "./mission-control/DashboardReadinessCard";
import { PriorityStackLane } from "./mission-control/PriorityStackLane";
import { ReviewInboxLane } from "./mission-control/ReviewInboxLane";

type TodayTimelinePanelProps = {
  isActive: boolean;
  status: string;
  dailyBrief: DailyBrief;
  focusSelection: string;
  missions: MissionRecord[];
  projects: ProjectRecord[];
  proactiveSuggestion: ProactiveSuggestion | null;
  focusReport: FocusReport | null;
  dashboardReadiness: {
    state: "online" | "setup" | "problem";
    title: string;
    detail: string;
    action: string;
  };
  serviceHealthItems: Array<{
    label: string;
    state: "online" | "setup" | "idle" | "problem" | "loading";
    detail: string;
    action: string;
  }>;
  openCapture: () => void;
  showFocusDetails: boolean;
  showStatusReport: boolean;
  showAppointmentReport: boolean;
  appointmentReport: AppointmentReport;
  showBriefDetails: boolean;
  reviewInboxItems: ReviewInboxItem[];
  upcomingAppointments: AppointmentRecord[];
  upcomingDeadlines: DeadlineRecord[];
  memoryDocuments: Array<{ relativePath: string; docKind: string }>;
  formatDateTime: (value: string | null) => string;
  renderStatusActions: (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => ReactNode;
  setFocusSelection: Dispatch<SetStateAction<string>>;
  setShowFocusDetails: Dispatch<SetStateAction<boolean>>;
  setShowStatusReport: Dispatch<SetStateAction<boolean>>;
  setShowBriefDetails: Dispatch<SetStateAction<boolean>>;
  setProactiveSuggestion: Dispatch<SetStateAction<ProactiveSuggestion | null>>;
  setEditingAppointment: Dispatch<SetStateAction<AppointmentRecord | null>>;
  setEditingDeadline: Dispatch<SetStateAction<DeadlineRecord | null>>;
  loadFocusReport: () => Promise<void>;
  clearWaitingOn: (todoId: string, message: string) => Promise<void>;
  updateStatus: (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => Promise<void>;
  acceptEmailSuggestion: (suggestionId: string, mode: "todo" | "project") => Promise<void>;
  archiveEmailSuggestion: (suggestionId: string) => Promise<void>;
  dismissEmailSuggestion: (suggestionId: string) => Promise<void>;
  acceptChatSuggestion: (suggestionId: string, mode: "todo" | "project") => Promise<void>;
  archiveChatSuggestion: (suggestionId: string) => Promise<void>;
  dismissChatSuggestion: (suggestionId: string) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  deleteDeadline: (id: string) => Promise<void>;
};

export const TodayTimelinePanel = forwardRef<HTMLElement, TodayTimelinePanelProps>(
  function TodayTimelinePanel(
    {
      isActive,
      status,
      dailyBrief,
      focusSelection,
      missions,
      projects,
      proactiveSuggestion,
      focusReport,
      dashboardReadiness,
      serviceHealthItems,
      openCapture,
      showFocusDetails,
      showStatusReport,
      showAppointmentReport,
      appointmentReport,
      showBriefDetails,
      reviewInboxItems,
      upcomingAppointments,
      upcomingDeadlines,
      memoryDocuments,
      formatDateTime,
      renderStatusActions,
      setFocusSelection,
      setShowFocusDetails,
      setShowStatusReport,
      setShowBriefDetails,
      setProactiveSuggestion,
      setEditingAppointment,
      setEditingDeadline,
      loadFocusReport,
      clearWaitingOn,
      updateStatus,
      acceptEmailSuggestion,
      archiveEmailSuggestion,
      dismissEmailSuggestion,
      acceptChatSuggestion,
      archiveChatSuggestion,
      dismissChatSuggestion,
      deleteAppointment,
      deleteDeadline,
    },
    ref
  ) {
    const operationalSignals =
      dailyBrief.priorityItems.length +
      upcomingAppointments.length +
      upcomingDeadlines.length +
      reviewInboxItems.length;
    const operationalLoad = Math.min(92, Math.max(18, 26 + operationalSignals * 7));
    const quickWinCount = dailyBrief.todos.filter((item) =>
      item.reason.toLowerCase().includes("quick action")
    ).length;
    const closeout = dailyBrief.closeout;
    const closeoutSummary =
      closeout.summary ||
      (reviewInboxItems.length > 0
        ? `${reviewInboxItems.length} review candidate${reviewInboxItems.length === 1 ? "" : "s"} need accept or archive.`
        : "No overdue, waiting-on, or review-inbox pressure in the current brief.");
    const shortTime = (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };
    const timelineItems = [
      ...upcomingAppointments.slice(0, 4).map((appointment) => ({
        id: `appointment-${appointment.id}`,
        title: appointment.title,
        at: appointment.startsAt,
        meta: appointment.allDay ? "all day" : "appointment",
        kind: "appointment",
      })),
      ...upcomingDeadlines.slice(0, 3).map((deadline) => ({
        id: `deadline-${deadline.id}`,
        title: deadline.title,
        at: deadline.dueAt,
        meta: deadline.priority,
        kind: "deadline",
      })),
    ]
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
      .slice(0, 5);

    return (
      <section ref={ref} className={`panel center${isActive ? " is-active-panel" : ""}`}>
        <p className="panel-status-line">{status}</p>

        <DailyBriefHero
          recommendedMove={dailyBrief.recommendedMove}
          operationalLoad={operationalLoad}
          showBriefDetails={showBriefDetails}
          setShowStatusReport={setShowStatusReport}
          setShowBriefDetails={setShowBriefDetails}
        />

        <DashboardReadinessCard
          dashboardReadiness={dashboardReadiness}
          serviceHealthItems={serviceHealthItems}
        />

        <div className="operator-main-grid">
          <article className="brief-card timeline-card">
            <h3>Today Timeline</h3>
            {timelineItems.length > 0 ? (
              <ol className="timeline-list">
                {timelineItems.map((item) => (
                  <li key={item.id} className={`timeline-item is-${item.kind}`}>
                    <div>
                      <strong>{shortTime(item.at)}</strong>
                      <p>{item.title}</p>
                    </div>
                    <span className={item.kind === "deadline" ? "badge urgent-badge" : "badge"}>
                      {item.meta}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Timeline clear"
                detail="Upcoming appointments and active deadlines will appear here once they are recorded or synced."
              >
                <button type="button" onClick={openCapture}>
                  Capture Appointment
                </button>
              </EmptyState>
            )}
          </article>

          <PriorityStackLane priorityItems={dailyBrief.priorityItems} openCapture={openCapture} />
        </div>

        <DailyRhythmCard
          dailyBrief={dailyBrief}
          quickWinCount={quickWinCount}
          reviewInboxItemCount={reviewInboxItems.length}
          closeoutSummary={closeoutSummary}
          setShowStatusReport={setShowStatusReport}
          setShowBriefDetails={setShowBriefDetails}
        />

        <article className="brief-card focus-card">
          <h3>Focus Controls</h3>
          <p className="brief-path">{dailyBrief.greeting}, sir. Status report?</p>
          <div className="focus-row">
            <select
              value={focusSelection}
              onChange={(event) => setFocusSelection(event.target.value)}
            >
              <option value="">Focus on mission/project...</option>
              {missions.map((mission) => (
                <option key={mission.id} value={`mission:${mission.id}`}>
                  Mission: {mission.title}
                </option>
              ))}
              {projects.map((project) => (
                <option key={project.id} value={`project:${project.id}`}>
                  Project: {project.title}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void loadFocusReport()}>
              Where am I?
            </button>
          </div>
        </article>

        {proactiveSuggestion ? (
          <article className="brief-card suggestion-card">
            <h3>{proactiveSuggestion.title}</h3>
            <p>{proactiveSuggestion.prompt}</p>
            <p className="brief-path">
              You can reply in Talk to Praxis with `yes`, `do it`, `no`, or the item number.
            </p>
            <div className="filter-actions">
              <button
                type="button"
                onClick={() => {
                  const [action] = proactiveSuggestion.actions;
                  if (action) {
                    if (action.command === "clear_waiting_on" && action.entityKind === "todo") {
                      void clearWaitingOn(action.entityId, `Cleared waiting-on for ${action.title}.`);
                    } else if (action.command === "complete") {
                      void updateStatus(action.entityKind, action.entityId, "completed");
                    }
                    setProactiveSuggestion(null);
                  }
                }}
              >
                {proactiveSuggestion.actions[0]?.command === "clear_waiting_on"
                  ? "Clear Waiting"
                  : "Mark Done"}
              </button>
              <button
                type="button"
                onClick={() => {
                  void window.praxis.assistant.resolveContext({
                    surface: "proactive_suggestion",
                    text: "no",
                  });
                  setProactiveSuggestion(null);
                }}
              >
                Not Now
              </button>
            </div>
          </article>
        ) : null}

        {focusReport ? (
          <article className="brief-card">
            <h3>{focusReport.title}</h3>
            <p>{focusReport.summary}</p>
            <p>
              Status: <span className="badge">{focusReport.status}</span>
              {focusReport.dueAt ? (
                <span className="badge urgent-badge">{formatDateTime(focusReport.dueAt)}</span>
              ) : null}
              <span className="badge">{focusReport.activeTodoCount} active todos</span>
              {focusReport.activeProjectCount > 0 ? (
                <span className="badge">{focusReport.activeProjectCount} active projects</span>
              ) : null}
              <span className="badge">{focusReport.upcomingDeadlineCount} deadlines</span>
            </p>
            {focusReport.people.length > 0 ? (
              <p>
                People:
                {focusReport.people.map((person) => (
                  <span
                    key={`${person.personId}-${person.relationship}`}
                    className="badge waiting-badge"
                  >
                    {person.relationship}: {person.name}
                  </span>
                ))}
              </p>
            ) : null}
            {focusReport.topItems.length > 0 ? (
              <ol className="brief-priority-list">
                {focusReport.topItems.map((item) => (
                  <li key={`${item.entityKind}-${item.id}`} className="item">
                    {item.title}
                    <span className="badge">{item.reason}</span>
                    <span className="badge">{item.priority}</span>
                    {item.waitingOnPersonName ? (
                      <span className="badge waiting-badge">
                        waiting on: {item.waitingOnPersonName}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="No active focus items"
                detail="This focus has no active todos or deadlines in the current work graph."
              />
            )}
            <div className="filter-actions">
              <button type="button" onClick={() => setShowFocusDetails((current) => !current)}>
                {showFocusDetails ? "Hide Details" : "Tell Me More"}
              </button>
            </div>
            {showFocusDetails ? (
              <div className="brief-details">
                <h4>Expanded Focus</h4>
                {focusReport.detailItems.length > focusReport.topItems.length ? (
                  <ol className="brief-priority-list">
                    {focusReport.detailItems.map((item) => (
                      <li key={`detail-${item.entityKind}-${item.id}`} className="item">
                        {item.title}
                        <span className="badge">{item.entityKind}</span>
                        <span className="badge">{item.reason}</span>
                        <span className="badge">{item.status}</span>
                        {item.waitingOnPersonName ? (
                          <span className="badge waiting-badge">
                            waiting on: {item.waitingOnPersonName}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>The short report already includes every active item I found for this focus.</p>
                )}
              </div>
            ) : null}
            {focusReport.markdownPath ? (
              <p className="brief-path">Memory: {focusReport.markdownPath}</p>
            ) : null}
          </article>
        ) : null}

        {showStatusReport ? (
          <>
            {showAppointmentReport ? (
              <>
                <h3>{appointmentReport.title}</h3>
                <article className="brief-card">
                  <p className="brief-spoken">{appointmentReport.spokenSummary}</p>
                  {appointmentReport.appointments.length > 0 ? (
                    <ol className="brief-priority-list">
                      {appointmentReport.appointments.map((appointment) => (
                        <li key={`appointment-report-${appointment.id}`} className="item">
                          {appointment.title}
                          <span className="badge">{appointment.reason}</span>
                          <span className="badge">{appointment.sourceSystem}</span>
                          {appointment.allDay ? <span className="badge">all day</span> : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState
                      title="No appointments found"
                      detail="The requested appointment window did not match any stored calendar items."
                    />
                  )}
                  {appointmentReport.thereIsMore ? (
                    <p className="brief-more">There are more appointments beyond this short list.</p>
                  ) : null}
                </article>
              </>
            ) : null}

            {showBriefDetails ? (
              <>
                <h3>Daily Brief</h3>
                <article className="brief-card daily-brief-details-card">
                  <p className="brief-spoken">{dailyBrief.spokenBrief}</p>
                  {dailyBrief.thereIsMore ? (
                    <p className="brief-more">There is more, sir, if you want to go over it.</p>
                  ) : null}
                  {dailyBrief.emailFollowUpCount > 0 ? (
                    <p className="brief-path">
                      Praxis flagged {dailyBrief.emailFollowUpCount} email follow-up
                      {dailyBrief.emailFollowUpCount === 1 ? "" : "s"}.
                    </p>
                  ) : null}
                <div className="brief-details">
                  <h4>Appointments</h4>
                  {dailyBrief.appointments.length > 0 ? (
                    <ol className="brief-priority-list">
                      {dailyBrief.appointments.map((item) => (
                        <li key={`appointment-detail-${item.id}`} className="item">
                          {item.title}
                          <span className="badge">{item.reason}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState
                      title="No near-term appointments"
                      detail="Calendar items will appear after manual import, provider sync, or direct capture."
                    />
                  )}
                  <h4>Deadlines</h4>
                  {dailyBrief.deadlines.length > 0 ? (
                    <ol className="brief-priority-list">
                      {dailyBrief.deadlines.map((item) => (
                        <li key={`deadline-detail-${item.id}`} className="item">
                          {item.title}
                          <span className="badge">{item.reason}</span>
                          <span className="badge">{item.priority}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState
                      title="No active deadlines"
                      detail="Standalone and linked deadlines will collect here when they are active."
                    />
                  )}
                  <h4>Todos</h4>
                  {dailyBrief.todos.length > 0 ? (
                    <ol className="brief-priority-list">
                      {dailyBrief.todos.map((item) => (
                        <li key={`todo-detail-${item.id}`} className="item">
                          {item.title}
                          <span className="badge">{item.reason}</span>
                          <span className="badge">{item.priority}</span>
                          {item.waitingOnPersonName ? (
                            <span className="badge waiting-badge">
                              waiting on: {item.waitingOnPersonName}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <EmptyState
                      title="No active todos"
                      detail="Todos created through Talk to Praxis or manual capture will appear in the daily brief."
                    />
                  )}
                </div>
                  {dailyBrief.markdownPath ? (
                    <p className="brief-path">Written to memory/{dailyBrief.markdownPath}</p>
                  ) : null}
                </article>
              </>
            ) : null}
          </>
        ) : null}

        <ReviewInboxLane
          items={reviewInboxItems}
          formatDateTime={formatDateTime}
          acceptEmailSuggestion={acceptEmailSuggestion}
          archiveEmailSuggestion={archiveEmailSuggestion}
          dismissEmailSuggestion={dismissEmailSuggestion}
          acceptChatSuggestion={acceptChatSuggestion}
          archiveChatSuggestion={archiveChatSuggestion}
          dismissChatSuggestion={dismissChatSuggestion}
        />

        <h3>Upcoming Appointments</h3>
        {upcomingAppointments.length > 0 ? (
          <ul>
            {upcomingAppointments.slice(0, 6).map((appointment) => (
              <li key={appointment.id} className="item">
                {appointment.title}
                <span className="badge urgent-badge">{formatDateTime(appointment.startsAt)}</span>
                {appointment.allDay ? <span className="badge">all day</span> : null}
                <ActionMenu>
                  <button type="button" onClick={() => setEditingAppointment(appointment)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => void deleteAppointment(appointment.id)}>
                    Delete
                  </button>
                </ActionMenu>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No upcoming appointments"
            detail="Sync Google or Outlook calendars, import an ICS file, or capture an appointment to fill this lane."
          >
            <button type="button" onClick={openCapture}>
              Capture Appointment
            </button>
          </EmptyState>
        )}

        <h3>Upcoming Deadlines</h3>
        {upcomingDeadlines.length > 0 ? (
          <ul>
            {upcomingDeadlines.slice(0, 8).map((deadline) => (
              <li key={deadline.id} className="item">
                {deadline.title}
                <span className="badge urgent-badge">{formatDateTime(deadline.dueAt)}</span>
                <span className="badge">{deadline.priority}</span>
                {renderStatusActions("deadline", deadline.id, deadline.status)}
                <ActionMenu>
                  <button type="button" onClick={() => setEditingDeadline(deadline)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => void deleteDeadline(deadline.id)}>
                    Delete
                  </button>
                </ActionMenu>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No deadlines"
            detail="Deadlines are quiet right now. New standalone or linked deadlines will appear here."
          >
            <button type="button" onClick={openCapture}>
              Capture Deadline
            </button>
          </EmptyState>
        )}

        <h3>Memory-Backed Documents</h3>
        {memoryDocuments.length > 0 ? (
          <ul>
            {memoryDocuments.slice(0, 8).map((document) => (
              <li key={document.relativePath} className="item">
                {document.relativePath}
                <span className="badge">{document.docKind}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No indexed memory documents"
            detail="Markdown memory appears here after startup indexing or a manual memory reindex."
          />
        )}
      </section>
    );
  }
);
