import type { Dispatch, SetStateAction } from "react";

type ReviewResetEntryProps = {
  reviewInboxItemCount: number;
  closeoutSummary: string;
  setShowStatusReport: Dispatch<SetStateAction<boolean>>;
  setShowBriefDetails: Dispatch<SetStateAction<boolean>>;
};

export function ReviewResetEntry({
  reviewInboxItemCount,
  closeoutSummary,
  setShowStatusReport,
  setShowBriefDetails,
}: ReviewResetEntryProps) {
  return (
    <article className="brief-card mission-control-lane">
      <div className="mission-control-lane-header">
        <div>
          <span className="recommended-label">Review</span>
          <h3>Review / Reset</h3>
        </div>
        <span className="badge">
          {reviewInboxItemCount} candidate{reviewInboxItemCount === 1 ? "" : "s"}
        </span>
      </div>
      <p>{closeoutSummary}</p>
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
