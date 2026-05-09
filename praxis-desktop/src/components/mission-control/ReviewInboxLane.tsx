import type { ReviewInboxItem } from "../../../shared/reviewInbox";
import type { ProjectTemplateProposalActionInput } from "../../../shared/projectTemplateProposals";
import { ReviewInboxPanel } from "../ReviewInboxPanel";

type ReviewInboxLaneProps = {
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
  neverSuggestProjectTemplateProposal: (input: ProjectTemplateProposalActionInput) => Promise<void>;
};

export function ReviewInboxLane({
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
  neverSuggestProjectTemplateProposal,
}: ReviewInboxLaneProps) {
  return (
    <ReviewInboxPanel
      items={items}
      formatDateTime={formatDateTime}
      acceptEmailSuggestion={acceptEmailSuggestion}
      archiveEmailSuggestion={archiveEmailSuggestion}
      dismissEmailSuggestion={dismissEmailSuggestion}
      acceptChatSuggestion={acceptChatSuggestion}
      archiveChatSuggestion={archiveChatSuggestion}
      dismissChatSuggestion={dismissChatSuggestion}
      dismissProjectTemplateProposal={dismissProjectTemplateProposal}
      snoozeProjectTemplateProposal={snoozeProjectTemplateProposal}
      neverSuggestProjectTemplateProposal={neverSuggestProjectTemplateProposal}
    />
  );
}
