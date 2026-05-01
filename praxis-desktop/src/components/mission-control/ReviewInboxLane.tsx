import type { ReviewInboxItem } from "../../../shared/reviewInbox";
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
    />
  );
}
