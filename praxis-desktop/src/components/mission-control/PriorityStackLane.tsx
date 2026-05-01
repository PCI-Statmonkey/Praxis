import type { DailyBrief } from "../../../shared/dailyBrief";
import { EmptyState } from "../EmptyState";

type PriorityStackLaneProps = {
  priorityItems: DailyBrief["priorityItems"];
  openCapture: () => void;
};

export function PriorityStackLane({ priorityItems, openCapture }: PriorityStackLaneProps) {
  return (
    <article className="brief-card priority-stack-card">
      <h3>Priority Stack</h3>
      {priorityItems.length > 0 ? (
        <ol className="operator-list priority-stack-list">
          {priorityItems.slice(0, 5).map((item) => (
            <li key={`${item.entityKind}-${item.id}`} className="operator-card">
              <div className="operator-card-header">
                <strong>{item.title}</strong>
                <span className="badge">{item.priority}</span>
              </div>
              <p>reason: {item.reason}</p>
              {item.waitingOnPersonName ? (
                <span className="badge waiting-badge">waiting on: {item.waitingOnPersonName}</span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title="No ranked priorities"
          detail="Praxis will populate this stack from active todos, deadlines, calendar pressure, and waiting-on work."
        >
          <button type="button" onClick={openCapture}>
            Capture Work
          </button>
        </EmptyState>
      )}
    </article>
  );
}
