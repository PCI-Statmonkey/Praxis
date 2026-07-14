import {
  DEFAULT_AI_SETTINGS,
  normalizeAiSettings,
  type AiSettings,
} from "../shared/settingsModel";
import {
  buildAiDraftPlan,
  type GenerateDraftPlanRequest,
  type GenerateDraftPlanResult,
} from "../shared/timeBlocking";
import {
  generateOllamaDraftPlanCandidate,
  type OllamaDraftPlanGenerateResult,
} from "./ollamaClient";
import { getAiSettings } from "./settingsRepository";

export type BuildPlanDraftResponseWithOllamaInput = GenerateDraftPlanRequest & {
  settings?: Partial<AiSettings>;
  generateCandidate?: typeof generateOllamaDraftPlanCandidate;
};

const fallbackWithReason = (
  input: GenerateDraftPlanRequest,
  reason: string
): GenerateDraftPlanResult => {
  const draftPlan = buildAiDraftPlan({
    scheduleReview: input.scheduleReview,
    aiAvailable: false,
    maxBlocks: input.maxBlocks,
  });

  return {
    ok: true,
    draftPlan,
    summarySource: "deterministic_fallback",
    fallbackReason: reason,
    writeBoundary: draftPlan.writeBoundary,
  };
};

export const buildPlanDraftResponseWithOllama = async ({
  scheduleReview,
  maxBlocks,
  settings = DEFAULT_AI_SETTINGS,
  generateCandidate = generateOllamaDraftPlanCandidate,
}: BuildPlanDraftResponseWithOllamaInput): Promise<GenerateDraftPlanResult> => {
  const normalizedSettings = normalizeAiSettings(settings, DEFAULT_AI_SETTINGS);
  const fallbackInput = { scheduleReview, maxBlocks };

  if (!normalizedSettings.localModelName) {
    return fallbackWithReason(fallbackInput, "No saved Ollama model is selected.");
  }

  const generated: OllamaDraftPlanGenerateResult = await generateCandidate({
    modelName: normalizedSettings.localModelName,
    scheduleReview,
  });

  if (!generated.ok) {
    return fallbackWithReason(fallbackInput, generated.reason);
  }

  const draftPlan = buildAiDraftPlan({
    scheduleReview,
    aiCandidate: generated.candidate,
    maxBlocks,
  });

  if (draftPlan.source !== "ai_proposal") {
    return {
      ok: true,
      draftPlan,
      summarySource: "deterministic_fallback",
      fallbackReason:
        draftPlan.rejectedProposalReasons[0] ?? "AI proposal did not include usable citations.",
      writeBoundary: draftPlan.writeBoundary,
    };
  }

  return {
    ok: true,
    draftPlan,
    summarySource: "ollama",
    fallbackReason: null,
    writeBoundary: draftPlan.writeBoundary,
  };
};

export const generateLocalPlanDraft = async (
  input: GenerateDraftPlanRequest
): Promise<GenerateDraftPlanResult> => {
  return buildPlanDraftResponseWithOllama({
    ...input,
    settings: getAiSettings(),
  });
};
