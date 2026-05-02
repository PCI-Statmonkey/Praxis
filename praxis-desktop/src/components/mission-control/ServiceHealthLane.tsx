import type { ServiceHealthItem } from "../../dashboardSelectors";

type ServiceHealthLaneProps = {
  serviceHealthItems: ServiceHealthItem[];
};

export function ServiceHealthLane({ serviceHealthItems }: ServiceHealthLaneProps) {
  const degradedItems = serviceHealthItems.filter(
    (item) => item.state === "problem" || item.state === "setup" || item.state === "loading"
  );
  const onlineCount = serviceHealthItems.filter((item) => item.state === "online").length;

  return (
    <section className="brief-card mission-control-lane" aria-label="Service health">
      <div className="mission-control-lane-header">
        <div>
          <span className="recommended-label">Health</span>
          <h3>Service Health</h3>
        </div>
        <span className={degradedItems.length > 0 ? "badge urgent-badge" : "badge"}>
          {degradedItems.length > 0 ? `${degradedItems.length} degraded` : `${onlineCount} online`}
        </span>
      </div>
      {degradedItems.length > 0 ? (
        <div className="mission-control-status-strip">
          {degradedItems.map((item) => (
            <article key={item.label} className={`service-health-card is-${item.state}`}>
              <div className="service-health-card-header">
                <span>{item.label}</span>
                <strong>{item.state}</strong>
              </div>
              <small>{item.detail}</small>
              <em>{item.action}</em>
            </article>
          ))}
        </div>
      ) : (
        <p className="brief-path">No degraded service is blocking the Today lane.</p>
      )}
    </section>
  );
}
