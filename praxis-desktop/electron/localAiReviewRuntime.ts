import type { AssistantAIReviewMode } from "../shared/assistantRouter";
import type { AIReviewResponse } from "./aiReviewService";
import { buildLocalAIReviewContextPacket } from "./aiReviewContext";
import { buildAIReviewResponseWithConfiguredModel } from "./aiReviewService";
import { getAiApiClientConfig, getAiSettings } from "./settingsRepository";

export const buildLocalAIReviewResponse = async (
  mode: AssistantAIReviewMode
): Promise<AIReviewResponse> =>
  buildAIReviewResponseWithConfiguredModel({
    mode,
    packet: buildLocalAIReviewContextPacket(),
    settings: getAiSettings(),
    apiConfig: getAiApiClientConfig(),
  });
