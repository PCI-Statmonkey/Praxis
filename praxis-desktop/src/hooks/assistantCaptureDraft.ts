import type {
  CaptureResult,
  SaveCaptureCandidateRequest,
} from "../../shared/naturalLanguageCapture";

export type CaptureDraft = SaveCaptureCandidateRequest;

export const draftFromResult = (result: CaptureResult): CaptureDraft | null => {
  if (result.candidate.intent === "appointment") {
    return {
      intent: "appointment",
      originalText: result.originalText,
      input: result.candidate.input,
    };
  }

  if (result.candidate.intent === "todo") {
    return {
      intent: "todo",
      originalText: result.originalText,
      input: result.candidate.input,
    };
  }

  if (result.candidate.intent === "mission") {
    return {
      intent: "mission",
      originalText: result.originalText,
      input: result.candidate.input,
    };
  }

  return null;
};
