import type { ServiceHealthItem } from "../../dashboardSelectors";

type ServiceHealthLaneProps = {
  serviceHealthItems: ServiceHealthItem[];
};

export function ServiceHealthLane({ serviceHealthItems }: ServiceHealthLaneProps) {
  return (
    <section className="mission-control-lane" aria-label="Service health">
      <div className="mission-control-lane-header">
        <div>
          <span className="recommended-label">Health</span>
          <h3>Service Health</h3>
        </div>
        <span className="badge">
          {serviceHealthItems.filter((item) => item.state === "online").length} online
        </span>
      </div>
      <div className="mission-control-status-strip">
        {serviceHealthItems.map((item) => (
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
    </section>
  );
}
