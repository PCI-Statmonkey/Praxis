import type {
  GenerateDraftPlanRequest,
  GenerateDraftPlanResult,
} from "../shared/timeBlocking";
import { buildPlanDraftResponseWithOllama } from "./planDraftService";
import { getAiSettings } from "./settingsRepository";

export const generateLocalPlanDraft = async (
  input: GenerateDraftPlanRequest
): Promise<GenerateDraftPlanResult> =>
  buildPlanDraftResponseWithOllama({
    ...input,
    settings: getAiSettings(),
  });
