import { useState } from "react";
import type {
  ProjectTemplateProposalActionInput,
  ProjectTemplateProposalSaveInput,
} from "../../shared/projectTemplateProposals";
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
  dismissProjectTemplateProposal: (input: ProjectTemplateProposalActionInput) => Promise<void>;
  snoozeProjectTemplateProposal: (input: ProjectTemplateProposalActionInput) => Promise<void>;
  rejectProjectTemplateProposal: (input: ProjectTemplateProposalActionInput) => Promise<void>;
  neverSuggestProjectTemplateProposal: (input: ProjectTemplateProposalActionInput) => Promise<void>;
  saveProjectTemplateProposal: (input: ProjectTemplateProposalSaveInput) => Promise<void>;
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
  dismissProjectTemplateProposal,
  snoozeProjectTemplateProposal,
  rejectProjectTemplateProposal,
  neverSuggestProjectTemplateProposal,
  saveProjectTemplateProposal,
}: ReviewInboxPanelProps) {
  const [openProjectTemplateProposalId, setOpenProjectTemplateProposalId] =
    useState<string | null>(null);
  const [pendingProjectTemplateProposalActionId, setPendingProjectTemplateProposalActionId] =
    useState<string | null>(null);
  const [projectTemplateProposalDrafts, setProjectTemplateProposalDrafts] = useState<
    Record<string, string>
  >({});
  const [
    confirmingProjectTemplateProposalSaveId,
    setConfirmingProjectTemplateProposalSaveId,
  ] = useState<string | null>(null);
  const isActionableSource = (sourceKind: ReviewInboxItem["sourceKind"]) =>
    sourceKind === "email" || sourceKind === "chat_import";
  const isProjectTemplateProposal = (item: ReviewInboxItem) =>
    item.sourceKind === "project_template_proposal" && Boolean(item.projectTemplateProposal);
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
  const proposalActionInput = (
    item: ReviewInboxItem
  ): ProjectTemplateProposalActionInput | null =>
    item.projectTemplateProposal
      ? {
          fingerprint: item.projectTemplateProposal.fingerprint,
          clusterId: item.projectTemplateProposal.clusterId,
          materialChangeHash: item.projectTemplateProposal.materialChangeHash,
        }
      : null;
  const proposalDraftFor = (item: ReviewInboxItem) =>
    projectTemplateProposalDrafts[item.id] ??
    item.projectTemplateProposal?.markdownDraft ??
    "";
  const updateProposalDraft = (item: ReviewInboxItem, markdown: string) => {
    setProjectTemplateProposalDrafts((currentDrafts) => ({
      ...currentDrafts,
      [item.id]: markdown,
    }));
    setConfirmingProjectTemplateProposalSaveId(null);
  };
  const runProjectTemplateProposalAction = async (
    item: ReviewInboxItem,
    action: (input: ProjectTemplateProposalActionInput) => Promise<void>
  ) => {
    const input = proposalActionInput(item);
    if (!input) {
      return;
    }
    setPendingProjectTemplateProposalActionId(item.id);
    try {
      await action(input);
    } finally {
      setPendingProjectTemplateProposalActionId(null);
    }
  };
  const runProjectTemplateProposalSave = async (item: ReviewInboxItem) => {
    const input = proposalActionInput(item);
    if (!input) {
      return;
    }
    setPendingProjectTemplateProposalActionId(item.id);
    try {
      await saveProjectTemplateProposal({
        ...input,
        markdown: proposalDraftFor(item),
      });
      setProjectTemplateProposalDrafts((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[item.id];
        return nextDrafts;
      });
      setConfirmingProjectTemplateProposalSaveId(null);
      setOpenProjectTemplateProposalId(null);
    } finally {
      setPendingProjectTemplateProposalActionId(null);
    }
  };

  return (
    <details className="review-inbox-disclosure">
      <summary>
        <span>Review Inbox</span>
        <span className="badge">
          {items.length} candidate{items.length === 1 ? "" : "s"}
        </span>
      </summary>
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
                    {isProjectTemplateProposal(item) ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenProjectTemplateProposalId((currentId) =>
                              currentId === item.id ? null : item.id
                            )
                          }
                        >
                          Edit draft
                        </button>
                        <button
                          type="button"
                          disabled={pendingProjectTemplateProposalActionId === item.id}
                          onClick={() =>
                            void runProjectTemplateProposalAction(
                              item,
                              dismissProjectTemplateProposal
                            )
                          }
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={pendingProjectTemplateProposalActionId === item.id}
                          onClick={() =>
                            void runProjectTemplateProposalAction(
                              item,
                              snoozeProjectTemplateProposal
                            )
                          }
                        >
                          Snooze 30 days
                        </button>
                        <button
                          type="button"
                          disabled={pendingProjectTemplateProposalActionId === item.id}
                          onClick={() =>
                            void runProjectTemplateProposalAction(
                              item,
                              rejectProjectTemplateProposal
                            )
                          }
                        >
                          Not this template
                        </button>
                        <button
                          type="button"
                          disabled={pendingProjectTemplateProposalActionId === item.id}
                          onClick={() =>
                            void runProjectTemplateProposalAction(
                              item,
                              neverSuggestProjectTemplateProposal
                            )
                          }
                        >
                          Do not suggest this again
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
                  {item.sourceKind !== "project_template_proposal" ? (
                    <span className="badge">{formatDateTime(item.receivedAt)}</span>
                  ) : null}
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
                {item.projectTemplateProposal ? (
                  <div className="brief-path">
                    <p>
                      {item.projectTemplateProposal.evidenceSummary};{" "}
                      {item.projectTemplateProposal.taskOverlapPercent}% task overlap across{" "}
                      {item.projectTemplateProposal.matchedProjectCount} projects.
                    </p>
                    <p>
                      Projects: {item.projectTemplateProposal.matchedProjectTitles.join(", ")}
                    </p>
                    {openProjectTemplateProposalId === item.id ? (
                      <>
                        <p>
                          Edit the markdown if needed. Nothing is written until you confirm save.
                        </p>
                        <textarea
                          className="project-template-draft-editor"
                          value={proposalDraftFor(item)}
                          onChange={(event) => updateProposalDraft(item, event.target.value)}
                        />
                        <pre className="project-template-draft-preview">
                          {proposalDraftFor(item)}
                        </pre>
                        <div className="capture-confirmation-actions project-template-save-actions">
                          <button
                            type="button"
                            disabled={pendingProjectTemplateProposalActionId === item.id}
                            onClick={() =>
                              setConfirmingProjectTemplateProposalSaveId(item.id)
                            }
                          >
                            Save template
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProjectTemplateProposalDrafts((currentDrafts) => {
                                const nextDrafts = { ...currentDrafts };
                                delete nextDrafts[item.id];
                                return nextDrafts;
                              });
                              setConfirmingProjectTemplateProposalSaveId(null);
                            }}
                          >
                            Reset draft
                          </button>
                        </div>
                        {confirmingProjectTemplateProposalSaveId === item.id ? (
                          <div className="capture-confirmation project-template-save-confirmation">
                            <p>
                              Confirm save writes one markdown template file under memory templates.
                              Existing projects and connected providers will not change.
                            </p>
                            <div className="capture-confirmation-actions">
                              <button
                                type="button"
                                disabled={pendingProjectTemplateProposalActionId === item.id}
                                onClick={() => void runProjectTemplateProposalSave(item)}
                              >
                                Confirm save
                              </button>
                              <button
                                type="button"
                                disabled={pendingProjectTemplateProposalActionId === item.id}
                                onClick={() => setConfirmingProjectTemplateProposalSaveId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Review inbox clear"
            detail="Pending email, chat, Slack, and project-template suggestions will collect here for review decisions."
          />
        )}
      </article>
    </details>
  );
}
