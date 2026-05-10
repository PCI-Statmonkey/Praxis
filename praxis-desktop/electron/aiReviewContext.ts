import {
  buildAIReviewContextPacket,
  type AIReviewContextPacket,
} from "../shared/aiReviewContext";
import {
  buildReviewInboxFromChatSuggestions,
  buildReviewInboxFromEmailSuggestions,
  buildReviewInboxFromProjectTemplateProposals,
  sortReviewInboxItems,
} from "../shared/reviewInbox";
import { getChatImportSnapshot } from "./chatImportRepository";
import { getEmailSnapshot } from "./emailRepository";
import { getProjectTemplateProposalSnapshot } from "./projectTemplateProposalRepository";
import { getSettingsSnapshot } from "./settingsRepository";
import { getSlackAdapterStatus } from "./slackAdapter";
import { checkStorageIntegrity } from "./storageIntegrity";
import { getTimeBlockSnapshot } from "./timeBlockRepository";
import { getWorkSnapshot } from "./workRepository";

export const buildLocalAIReviewContextPacket = (): AIReviewContextPacket => {
  const emailSnapshot = getEmailSnapshot();
  const chatSnapshot = getChatImportSnapshot();
  const projectTemplateProposalSnapshot = getProjectTemplateProposalSnapshot();
  const settingsSnapshot = getSettingsSnapshot();
  const storageIntegrity = checkStorageIntegrity();
  const pendingEmailSuggestions = emailSnapshot.suggestions.filter(
    (suggestion) => suggestion.status === "pending"
  );
  const pendingChatSuggestions = chatSnapshot.suggestions.filter(
    (suggestion) => suggestion.status === "pending"
  );

  return buildAIReviewContextPacket({
    snapshot: getWorkSnapshot(),
    emailSuggestions: emailSnapshot.suggestions,
    reviewInboxItems: sortReviewInboxItems([
      ...buildReviewInboxFromEmailSuggestions(pendingEmailSuggestions),
      ...buildReviewInboxFromChatSuggestions(pendingChatSuggestions),
      ...buildReviewInboxFromProjectTemplateProposals(projectTemplateProposalSnapshot.proposals),
    ]),
    emailConnections: emailSnapshot.connections,
    calendarConnections: settingsSnapshot.calendarConnections,
    slack: getSlackAdapterStatus(),
    timeBlocks: getTimeBlockSnapshot().timeBlocks,
    storage: {
      ok: storageIntegrity.ok,
      checkedAt: storageIntegrity.checkedAt,
      errorCount: storageIntegrity.issueCounts.error,
      warningCount: storageIntegrity.issueCounts.warning,
    },
  });
};
