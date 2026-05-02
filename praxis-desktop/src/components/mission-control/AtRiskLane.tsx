import type { DailyBrief } from "../../../shared/dailyBrief";
import type { DeadlineRecord } from "../../../shared/workModel";
import type { DashboardReadiness, ServiceHealthItem } from "../../dashboardSelectors";

type AtRiskLaneProps = {
  dashboardReadiness: DashboardReadiness;
  serviceHealthItems: ServiceHealthItem[];
  closeout: DailyBrief["closeout"];
  upcomingDeadlines: DeadlineRecord[];
  formatDateTime: (value: string | null) => string;
};

export function AtRiskLane({
  dashboardReadiness,
  serviceHealthItems,
  closeout,
  upcomingDeadlines,
  formatDateTime,
}: AtRiskLaneProps) {
  const attentionItems = serviceHealthItems.filter(
    (item) => item.state === "problem" || item.state === "setup" || item.state === "loading"
  );
  const riskDeadlines = upcomingDeadlines.slice(0, 3);
  const workRiskCount =
    closeout.overdueCount + closeout.waitingOnCount + closeout.dueTodayCount + riskDeadlines.length;
  const supportRiskItems = [
    ...riskDeadlines.map((deadline) => ({
      id: `deadline-${deadline.id}`,
      title: deadline.title,
      badge: deadline.priority,
      detail: formatDateTime(deadline.dueAt),
      support: deadline.status,
      urgent: true,
    })),
    ...attentionItems.map((item) => ({
      id: `service-${item.label}`,
      title: item.label,
      badge: item.state,
      detail: item.detail,
      support: item.action,
      urgent: item.state === "problem",
    })),
  ].slice(0, 3);

  return (
    <article className={`brief-card readiness-card is-${dashboardReadiness.state}`}>
      <div className="readiness-copy">
        <span className="recommended-label">At Risk</span>
        <h3>
          {workRiskCount > 0
            ? `${workRiskCount} work pressure signal${workRiskCount === 1 ? "" : "s"}`
            : "Work risk clear"}
        </h3>
        <p>
          {closeout.overdueCount} overdue, {closeout.waitingOnCount} waiting,{" "}
          {closeout.dueTodayCount} due today.
        </p>
        <p className="brief-path">
          Service blind spots: {attentionItems.length > 0 ? dashboardReadiness.detail : "none blocking current work."}
        </p>
        <div className="review-inbox-badges">
          <span className="badge">{closeout.overdueCount} overdue</span>
          <span className="badge">{closeout.waitingOnCount} waiting</span>
          <span className="badge">{closeout.dueTodayCount} due today</span>
        </div>
      </div>
      {supportRiskItems.length > 0 ? (
        <ul className="readiness-list" aria-label="Work risks and service blind spots">
          {supportRiskItems.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <span className={`badge ${item.urgent ? "urgent-badge" : ""}`}>{item.badge}</span>
              <p>{item.detail}</p>
              <small>{item.support}</small>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="readiness-list" aria-label="Upcoming risk deadlines">
          <li>
            <strong>No active work risk</strong>
            <span className="badge">clear</span>
            <p>No deadline or service blind spot is blocking the first screen.</p>
            <small>Full appointment and deadline lists remain below.</small>
          </li>
        </ul>
      )}
    </article>
  );
}
