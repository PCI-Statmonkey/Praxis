import type { AIReviewContextPacket } from "../shared/aiReviewContext";
import type { AssistantAIReviewMode } from "../shared/assistantRouter";
import { buildOllamaAIReviewPrompt } from "./ollamaClient";

const DEFAULT_AI_API_TIMEOUT_MS = 60000;

export type AiApiClientConfig = {
  provider: "openai_compatible";
  baseUrl: string;
  modelName: string;
  apiKey: string;
};

export type AiApiReviewGenerateStatus =
  | "ok"
  | "not_configured"
  | "timeout"
  | "http_error"
  | "unavailable"
  | "invalid_response"
  | "empty_response";

export type AiApiReviewGenerateResult =
  | {
      ok: true;
      status: "ok";
      modelName: string;
      text: string;
    }
  | {
      ok: false;
      status: Exclude<AiApiReviewGenerateStatus, "ok">;
      modelName: string | null;
      reason: string;
    };

export type GenerateAiApiReviewSummaryInput = {
  config: AiApiClientConfig;
  mode: AssistantAIReviewMode;
  packet: AIReviewContextPacket;
};

type GenerateAiApiReviewSummaryOptions = {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeConfig = (config: AiApiClientConfig) => ({
  provider: config.provider,
  baseUrl: config.baseUrl.trim().replace(/\/+$/, ""),
  modelName: config.modelName.trim(),
  apiKey: config.apiKey.trim(),
});

const chatCompletionsUrl = (baseUrl: string) => {
  if (baseUrl.endsWith("/chat/completions")) {
    return baseUrl;
  }
  if (baseUrl.endsWith("/v1")) {
    return `${baseUrl}/chat/completions`;
  }
  return `${baseUrl}/v1/chat/completions`;
};

const readChatCompletionText = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return null;
  }
  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return null;
  }
  const content = firstChoice.message.content;
  return typeof content === "string" ? content.trim() : null;
};

export const generateAiApiReviewSummary = async (
  input: GenerateAiApiReviewSummaryInput,
  options: GenerateAiApiReviewSummaryOptions = {}
): Promise<AiApiReviewGenerateResult> => {
  const config = normalizeConfig(input.config);
  if (!config.baseUrl || !config.modelName || !config.apiKey) {
    return {
      ok: false,
      status: "not_configured",
      modelName: config.modelName || null,
      reason: "API provider is not fully configured.",
    };
  }

  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_AI_API_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchFn(chatCompletionsUrl(config.baseUrl), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          {
            role: "system",
            content:
              "You rank only the provided PRAXIS packet stable IDs. Return JSON only. Never imply writes.",
          },
          {
            role: "user",
            content: buildOllamaAIReviewPrompt(input.mode, input.packet),
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 180,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: "http_error",
        modelName: config.modelName,
        reason: `API generation failed (HTTP ${response.status}).`,
      };
    }

    const text = readChatCompletionText(await response.json());
    if (text === null) {
      return {
        ok: false,
        status: "invalid_response",
        modelName: config.modelName,
        reason: "API provider returned an invalid generation response.",
      };
    }
    if (!text) {
      return {
        ok: false,
        status: "empty_response",
        modelName: config.modelName,
        reason: "API provider returned an empty review summary.",
      };
    }

    return {
      ok: true,
      status: "ok",
      modelName: config.modelName,
      text,
    };
  } catch {
    return {
      ok: false,
      status: timedOut ? "timeout" : "unavailable",
      modelName: config.modelName,
      reason: timedOut ? "API generation timed out." : "API generation is unavailable.",
    };
  } finally {
    clearTimeout(timeout);
  }
};
