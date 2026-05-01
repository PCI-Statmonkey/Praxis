import type { DashboardReadiness } from "../../dashboardSelectors";

type CommandStatusHeaderProps = {
  status: string;
  localDate: string;
  dashboardReadiness: DashboardReadiness;
  operationalLoad: number;
};

export function CommandStatusHeader({
  status,
  localDate,
  dashboardReadiness,
  operationalLoad,
}: CommandStatusHeaderProps) {
  return (
    <header className="mission-control-lane-header">
      <div>
        <span className="recommended-label">Now</span>
        <p className="panel-status-line">{status}</p>
      </div>
      <div className="rhythm-badges">
        <span className="badge">{localDate || "today"}</span>
        <span className="badge">{dashboardReadiness.title.toLowerCase()}</span>
        <span className="badge">{operationalLoad}% load</span>
      </div>
    </header>
  );
}
