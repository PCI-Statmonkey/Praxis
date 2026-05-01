import type { DashboardReadiness, ServiceHealthItem } from "../../dashboardSelectors";

type DashboardReadinessCardProps = {
  dashboardReadiness: DashboardReadiness;
  serviceHealthItems: ServiceHealthItem[];
};

export function DashboardReadinessCard({
  dashboardReadiness,
  serviceHealthItems,
}: DashboardReadinessCardProps) {
  const servicesNeedingAttention = serviceHealthItems.filter(
    (item) => item.state === "problem" || item.state === "setup" || item.state === "loading"
  );

  return (
    <article className={`brief-card readiness-card is-${dashboardReadiness.state}`}>
      <div className="readiness-copy">
        <span className="recommended-label">Dashboard Readiness</span>
        <h3>{dashboardReadiness.title}</h3>
        <p>{dashboardReadiness.detail}</p>
        <p className="brief-path">{dashboardReadiness.action}</p>
      </div>
      {servicesNeedingAttention.length > 0 ? (
        <ul className="readiness-list" aria-label="Services needing attention">
          {servicesNeedingAttention.map((item) => (
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
        <div className="readiness-clear">
          <strong>{serviceHealthItems.filter((item) => item.state === "online").length}</strong>
          <span>services ready</span>
        </div>
      )}
    </article>
  );
}
