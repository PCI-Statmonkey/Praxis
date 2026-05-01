import type { Dispatch, SetStateAction } from "react";
import type { DailyBrief } from "../../../shared/dailyBrief";

type DailyBriefHeroProps = {
  recommendedMove: DailyBrief["recommendedMove"];
  operationalLoad: number;
  showBriefDetails: boolean;
  setShowStatusReport: Dispatch<SetStateAction<boolean>>;
  setShowBriefDetails: Dispatch<SetStateAction<boolean>>;
};

export function DailyBriefHero({
  recommendedMove,
  operationalLoad,
  showBriefDetails,
  setShowStatusReport,
  setShowBriefDetails,
}: DailyBriefHeroProps) {
  return (
    <article className="brief-card daily-brief-hero">
      <div className="daily-brief-copy">
        <span className="recommended-label">Daily Brief / Top Move</span>
        <h2>{recommendedMove.directive}</h2>
        <p className="brief-spoken">{recommendedMove.rationale}</p>
        <p className="brief-path">{recommendedMove.actionHint}</p>
        <div className="filter-actions">
          <button type="button" className="primary-action-button" onClick={() => setShowStatusReport(true)}>
            Start Top Move
          </button>
          <button type="button" onClick={() => setShowBriefDetails((current) => !current)}>
            {showBriefDetails ? "Hide Brief" : "Read Brief"}
          </button>
          <button type="button" onClick={() => setShowStatusReport(false)}>
            Later
          </button>
        </div>
      </div>
      <div className="operational-load">
        <span>Operational Load</span>
        <strong>{operationalLoad}%</strong>
        <div className="progress-meter" aria-hidden="true">
          <span style={{ width: `${operationalLoad}%` }} />
        </div>
        <p>appointments, overdue work, people waiting, money tasks</p>
      </div>
    </article>
  );
}
