import type { AssistantAIReviewMode } from "../shared/assistantRouter";
import type { AIReviewContextPacket } from "../shared/aiReviewContext";
import { checkOllamaModelAvailability } from "./ollamaProbe";

const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_GENERATE_URL = `${OLLAMA_BASE_URL}/api/generate`;
const DEFAULT_OLLAMA_GENERATE_TIMEOUT_MS = 8000;

export type OllamaReviewGenerateStatus =
  | "ok"
  | "no_model_selected"
  | "missing"
  | "unavailable"
  | "timeout"
  | "http_error"
  | "invalid_response"
  | "empty_response";

export type OllamaReviewGenerateResult =
  | {
      ok: true;
      status: "ok";
      modelName: string;
      text: string;
    }
  | {
      ok: false;
      status: Exclude<OllamaReviewGenerateStatus, "ok">;
      modelName: string | null;
      reason: string;
    };

export type GenerateOllamaReviewSummaryInput = {
  modelName: string | null;
  mode: AssistantAIReviewMode;
  packet: AIReviewContextPacket;
};

type GenerateOllamaReviewSummaryOptions = {
  fetchFn?: typeof fetch;
  generateUrl?: string;
  tagsUrl?: string;
  timeoutMs?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeModelName = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
};

const promptPacket = (packet: AIReviewContextPacket) => ({
  generatedAt: packet.generatedAt,
  localDate: packet.localDate,
  fallbackSummary: packet.fallbackSummary,
  workGraph: packet.workGraph,
  calendarPressure: packet.calendarPressure,
  reviewInbox: packet.reviewInbox,
  staleProjects: packet.staleProjects,
  waitingOn: packet.waitingOn,
  overdueDueSoon: packet.overdueDueSoon,
  quickWins: packet.quickWins,
  recentCloseoutChanges: packet.recentCloseoutChanges,
  serviceHealth: packet.serviceHealth,
});

export const buildOllamaAIReviewPrompt = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
) =>
  [
    "You are Praxis, a local-first assistant. Summarize the AI Task Review context packet.",
    `Review mode: ${mode}.`,
    "Use only facts in the packet. Do not invent tasks, dates, people, or commitments.",
    "Do not claim that work was changed. Do not ask the user to confirm a write.",
    "Keep the answer concise, practical, and read-only.",
    "Context packet JSON:",
    JSON.stringify(promptPacket(packet)),
  ].join("\n\n");

export const generateOllamaReviewSummary = async (
  input: GenerateOllamaReviewSummaryInput,
  options: GenerateOllamaReviewSummaryOptions = {}
): Promise<OllamaReviewGenerateResult> => {
  const modelName = normalizeModelName(input.modelName);
  if (!modelName) {
    return {
      ok: false,
      status: "no_model_selected",
      modelName: null,
      reason: "No saved Ollama model is selected.",
    };
  }

  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_OLLAMA_GENERATE_TIMEOUT_MS;
  const availability = await checkOllamaModelAvailability(
    { modelName },
    {
      fetchFn,
      tagsUrl: options.tagsUrl,
      timeoutMs,
    }
  );

  if (availability.status !== "available") {
    const status = availability.status === "no_model_selected" ? "no_model_selected" : availability.status;
    return {
      ok: false,
      status,
      modelName,
      reason: availability.message,
    };
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(options.generateUrl ?? OLLAMA_GENERATE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        prompt: buildOllamaAIReviewPrompt(input.mode, input.packet),
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: "http_error",
        modelName,
        reason: `Ollama generation failed at 127.0.0.1:11434 (HTTP ${response.status}).`,
      };
    }

    const payload = await response.json();
    if (!isRecord(payload) || typeof payload.response !== "string") {
      return {
        ok: false,
        status: "invalid_response",
        modelName,
        reason: "Ollama returned an invalid generation response.",
      };
    }

    const text = payload.response.trim();
    if (!text) {
      return {
        ok: false,
        status: "empty_response",
        modelName,
        reason: "Ollama returned an empty review summary.",
      };
    }

    return {
      ok: true,
      status: "ok",
      modelName,
      text,
    };
  } catch {
    return {
      ok: false,
      status: timedOut ? "timeout" : "unavailable",
      modelName,
      reason: timedOut
        ? "Ollama generation timed out."
        : "Ollama generation is unavailable at 127.0.0.1:11434.",
    };
  } finally {
    clearTimeout(timeout);
  }
};
