import type { ReviewInboxItem } from "../../shared/reviewInbox";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./EmptyState";

type ReviewInboxPanelProps = {
  items: ReviewInboxItem[];
  formatDateTime: (value: string | null) => string;
  acceptEmailSuggestion: (suggestionId: string, mode: "todo" | "project") => Promise<void>;
  archiveEmailSuggestion: (suggestionId: string) => Promise<void>;
  dismissEmailSuggestion: (suggestionId: string) => Promise<void>;
  acceptChatSuggestion: (suggestionId: string, mode: "todo" | "project") => Promise<void>;
  archiveChatSuggestion: (suggestionId: string) => Promise<void>;
  dismissChatSuggestion: (suggestionId: string) => Promise<void>;
};

export function ReviewInboxPanel({
  items,
  formatDateTime,
  acceptEmailSuggestion,
  archiveEmailSuggestion,
  dismissEmailSuggestion,
  acceptChatSuggestion,
  archiveChatSuggestion,
  dismissChatSuggestion,
}: ReviewInboxPanelProps) {
  const isActionableSource = (sourceKind: ReviewInboxItem["sourceKind"]) =>
    sourceKind === "email" || sourceKind === "chat_import";
  const acceptSuggestion = (
    sourceKind: ReviewInboxItem["sourceKind"],
    suggestionId: string,
    mode: "todo" | "project"
  ) =>
    sourceKind === "chat_import"
      ? acceptChatSuggestion(suggestionId, mode)
      : acceptEmailSuggestion(suggestionId, mode);
  const archiveSuggestion = (item: ReviewInboxItem) =>
    item.sourceKind === "chat_import"
      ? archiveChatSuggestion(item.sourceRecordId)
      : archiveEmailSuggestion(item.sourceRecordId);
  const dismissSuggestion = (item: ReviewInboxItem) =>
    item.sourceKind === "chat_import"
      ? dismissChatSuggestion(item.sourceRecordId)
      : dismissEmailSuggestion(item.sourceRecordId);

  return (
    <>
      <h3>Review Inbox</h3>
      <article className="brief-card review-inbox-card">
        {items.length > 0 ? (
          <ol className="review-inbox-list">
            {items.slice(0, 6).map((item) => (
              <li key={item.id} className="review-inbox-item">
                <div className="review-inbox-header">
                  <div>
                    <strong>{item.title}</strong>
                    <p>
                      {item.sourceLabel} from {item.actorLabel}
                    </p>
                  </div>
                  <ActionMenu>
                    {isActionableSource(item.sourceKind) &&
                    (item.suggestedActionKind === "todo" || item.suggestedActionKind === "project") ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void acceptSuggestion(item.sourceKind, item.sourceRecordId, "todo")
                          }
                        >
                          Create Todo
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void acceptSuggestion(item.sourceKind, item.sourceRecordId, "project")
                          }
                        >
                          Create Project
                        </button>
                      </>
                    ) : null}
                    {isActionableSource(item.sourceKind) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void archiveSuggestion(item)}
                        >
                          {item.recommendedDecision === "archive" ? "Agree: Archive" : "Archive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void dismissSuggestion(item)}
                        >
                          Dismiss
                        </button>
                      </>
                    ) : null}
                  </ActionMenu>
                </div>
                <p className="review-inbox-recommendation">
                  Praxis recommends: <strong>{item.recommendedDecision.replace("_", " ")}</strong>.{" "}
                  {item.recommendationReason}
                </p>
                <div className="review-inbox-badges">
                  <span className="badge">{item.suggestedActionKind}</span>
                  <span className="badge">{item.confidence.toFixed(2)}</span>
                  <span className="badge">{formatDateTime(item.receivedAt)}</span>
                  {item.dueAt ? (
                    <span className={item.isOverdue ? "badge urgent-badge" : "badge"}>
                      due {formatDateTime(item.dueAt)}
                    </span>
                  ) : null}
                  {item.matchedPersonName ? (
                    <span className="badge waiting-badge">matched: {item.matchedPersonName}</span>
                  ) : null}
                </div>
                {item.isOverdue ? (
                  <p className="review-inbox-warning">
                    This candidate points to a date that has already passed; confirm before creating work.
                  </p>
                ) : null}
                <p className="brief-path">Subject: {item.subject}</p>
                {item.snippet ? <p className="brief-path">Summary: {item.snippet}</p> : null}
                <p className="brief-path">{item.reason}</p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Review inbox clear"
            detail="Pending email, Slack, and future chat-import suggestions will collect here for accept or dismiss decisions."
          />
        )}
      </article>
    </>
  );
}
