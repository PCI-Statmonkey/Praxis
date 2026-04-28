import {
  buildAIReviewContextPacket,
  type AIReviewContextPacket,
} from "../shared/aiReviewContext";
import { getEmailSnapshot } from "./emailRepository";
import { checkStorageIntegrity } from "./storageIntegrity";
import { getWorkSnapshot } from "./workRepository";

export const buildLocalAIReviewContextPacket = (): AIReviewContextPacket => {
  const emailSnapshot = getEmailSnapshot();
  const storageIntegrity = checkStorageIntegrity();

  return buildAIReviewContextPacket({
    snapshot: getWorkSnapshot(),
    emailSuggestions: emailSnapshot.suggestions,
    emailConnections: emailSnapshot.connections,
    storage: {
      ok: storageIntegrity.ok,
      checkedAt: storageIntegrity.checkedAt,
      errorCount: storageIntegrity.issueCounts.error,
      warningCount: storageIntegrity.issueCounts.warning,
    },
  });
};
