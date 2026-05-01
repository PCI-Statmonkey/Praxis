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

  return (
    <article className={`brief-card readiness-card is-${dashboardReadiness.state}`}>
      <div className="readiness-copy">
        <span className="recommended-label">At Risk</span>
        <h3>{dashboardReadiness.title}</h3>
        <p>{dashboardReadiness.detail}</p>
        <p className="brief-path">{dashboardReadiness.action}</p>
        <div className="review-inbox-badges">
          <span className="badge">{closeout.overdueCount} overdue</span>
          <span className="badge">{closeout.waitingOnCount} waiting</span>
          <span className="badge">{closeout.dueTodayCount} due today</span>
        </div>
      </div>
      {attentionItems.length > 0 ? (
        <ul className="readiness-list" aria-label="Services needing attention">
          {attentionItems.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span className={`badge ${item.state === "problem" ? "urgent-badge" : ""}`}>
                {item.state}
              </span>
              <p>{item.detail}</p>
              <small>{item.action}</small>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="readiness-list" aria-label="Upcoming risk deadlines">
          {riskDeadlines.length > 0 ? (
            riskDeadlines.map((deadline) => (
              <li key={deadline.id}>
                <strong>{deadline.title}</strong>
                <span className="badge urgent-badge">{deadline.priority}</span>
                <p>{formatDateTime(deadline.dueAt)}</p>
                <small>{deadline.status}</small>
              </li>
            ))
          ) : (
            <li>
              <strong>No active deadline risk</strong>
              <span className="badge">clear</span>
              <p>No configured service is reporting a problem.</p>
              <small>Full appointment and deadline lists remain below.</small>
            </li>
          )}
        </ul>
      )}
    </article>
  );
}
