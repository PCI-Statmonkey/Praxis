import type { Dispatch, SetStateAction } from "react";
import type { DailyBrief } from "../../../shared/dailyBrief";

type DailyRhythmCardProps = {
  dailyBrief: DailyBrief;
  quickWinCount: number;
  reviewInboxItemCount: number;
  closeoutSummary: string;
  setShowStatusReport: Dispatch<SetStateAction<boolean>>;
  setShowBriefDetails: Dispatch<SetStateAction<boolean>>;
};

export function DailyRhythmCard({
  dailyBrief,
  quickWinCount,
  reviewInboxItemCount,
  closeoutSummary,
  setShowStatusReport,
  setShowBriefDetails,
}: DailyRhythmCardProps) {
  const nextAppointment = dailyBrief.appointments[0] ?? null;
  const closeout = dailyBrief.closeout;

  return (
    <article className="brief-card daily-rhythm-card">
      <div className="rhythm-header">
        <div>
          <span className="recommended-label">Daily Operating Rhythm</span>
          <h3>Arrival / Triage / Closeout</h3>
        </div>
        <div className="rhythm-badges">
          <span className="badge">{dailyBrief.localDate || "today"}</span>
          <span className="badge">{closeout.changedTodayCount} changed</span>
          <span className="badge">{closeout.completedTodayCount} completed</span>
        </div>
      </div>
      <div className="rhythm-grid">
        <section className="rhythm-step">
          <span>Arrival</span>
          <strong>{dailyBrief.recommendedMove.directive}</strong>
          <p>{nextAppointment ? `First calendar pressure: ${nextAppointment.title}.` : "No near-term appointment pressure."}</p>
        </section>
        <section className="rhythm-step">
          <span>Triage</span>
          <strong>
            {reviewInboxItemCount > 0
              ? `${reviewInboxItemCount} review candidate${reviewInboxItemCount === 1 ? "" : "s"}`
              : "Review Inbox clear"}
          </strong>
          <p>
            {quickWinCount > 0
              ? `${quickWinCount} quick action${quickWinCount === 1 ? "" : "s"} available.`
              : "No quick-action pressure in the current stack."}
          </p>
        </section>
        <section className="rhythm-step">
          <span>Closeout</span>
          <strong>{closeoutSummary}</strong>
          <p>
            {closeout.moveTomorrowCandidates.length > 0
              ? `Move or decide: ${closeout.moveTomorrowCandidates.join(", ")}.`
              : dailyBrief.thereIsMore
                ? `Follow-up topics: ${dailyBrief.followUpTopics.join(", ") || "additional work"}.`
                : "The visible brief covers the current active stack."}
          </p>
        </section>
      </div>
      <div className="filter-actions">
        <button
          type="button"
          onClick={() => {
            setShowStatusReport(true);
            setShowBriefDetails(true);
          }}
        >
          Open Brief
        </button>
        <button type="button" onClick={() => setShowStatusReport(true)}>
          Show Status
        </button>
      </div>
    </article>
  );
}
