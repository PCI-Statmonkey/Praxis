import type { AssistantAIReviewMode } from "../shared/assistantRouter";
import type { AIReviewContextPacket } from "../shared/aiReviewContext";
import { checkOllamaModelAvailability } from "./ollamaProbe";

const OLLAMA_BASE_URL = "http://127.0.0.1:11434";
const OLLAMA_GENERATE_URL = `${OLLAMA_BASE_URL}/api/generate`;
const DEFAULT_OLLAMA_GENERATE_TIMEOUT_MS = 60000;

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

type PromptAllowedItem = {
  stableId: string;
  label: string;
  facts: string[];
};

const compactFacts = (facts: Array<string | null | undefined>) =>
  facts.filter((fact): fact is string => Boolean(fact && fact.trim().length > 0)).slice(0, 4);

const workPromptItem = (
  item: AIReviewContextPacket["overdueDueSoon"]["items"][number]
): PromptAllowedItem => ({
  stableId: item.stableId,
  label: item.title,
  facts: compactFacts([
    item.entityKind,
    item.projectTitle ? `project: ${item.projectTitle}` : null,
    item.dueAt ? `due: ${item.dueAt.slice(0, 10)}` : null,
    item.reasons.join("; "),
  ]),
});

const inboxPromptItem = (
  item: AIReviewContextPacket["reviewInbox"]["items"][number]
): PromptAllowedItem => ({
  stableId: item.stableId,
  label: item.title,
  facts: compactFacts([
    "review_inbox",
    item.suggestedEntityKind,
    item.dueAt ? `due: ${item.dueAt.slice(0, 10)}` : null,
    item.reason,
  ]),
});

const appointmentPromptItem = (
  item: AIReviewContextPacket["calendarPressure"]["items"][number]
): PromptAllowedItem => ({
  stableId: item.stableId,
  label: item.title,
  facts: compactFacts([
    "appointment",
    `starts: ${item.startsAt.slice(0, 16)}`,
    item.reasons.join("; "),
  ]),
});

const allowedPromptItems = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
): PromptAllowedItem[] => {
  if (mode === "quick_wins") {
    return packet.quickWins.items.slice(0, 5).map(workPromptItem);
  }
  if (mode === "stale_projects") {
    return packet.staleProjects.items.slice(0, 5).map(workPromptItem);
  }
  if (mode === "risk_review") {
    return [
      ...packet.overdueDueSoon.items.slice(0, 5).map(workPromptItem),
      ...packet.waitingOn.items.slice(0, 3).map(workPromptItem),
      ...packet.calendarPressure.items.slice(0, 3).map(appointmentPromptItem),
    ];
  }
  if (mode === "forgetting") {
    return [
      ...packet.overdueDueSoon.items.slice(0, 5).map(workPromptItem),
      ...packet.reviewInbox.items.slice(0, 3).map(inboxPromptItem),
      ...packet.calendarPressure.items.slice(0, 2).map(appointmentPromptItem),
    ];
  }
  return [
    ...packet.overdueDueSoon.items.slice(0, 5).map(workPromptItem),
    ...packet.quickWins.items.slice(0, 3).map(workPromptItem),
    ...packet.waitingOn.items.slice(0, 3).map(workPromptItem),
    ...packet.reviewInbox.items.slice(0, 3).map(inboxPromptItem),
  ];
};

export const buildOllamaAIReviewPrompt = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
) => {
  const allowedItems = allowedPromptItems(mode, packet);
  const allowedStableIds = allowedItems.map((item) => item.stableId);
  const exampleStableIds = allowedStableIds.slice(0, 2);
  return [
    "Return JSON only. No markdown. No prose before or after JSON.",
    "You may only rank/select stable IDs from allowedStableIds.",
    "Copy stable IDs exactly. Do not use placeholder IDs such as stable-id-1.",
    "Do not create, edit, complete, schedule, send, delete, or imply any write.",
    "coachLine is optional and must be under 140 chars. It must not include dates unless copied as YYYY-MM-DD from facts.",
    "Schema:",
    JSON.stringify({
      schemaVersion: 1,
      mode,
      priorityStableIds: exampleStableIds,
      emphasis: "start_here",
      coachLine: "optional short read-only nudge",
    }),
    "Allowed emphasis values: start_here, quick_win, risk, waiting_on, review_inbox, stale.",
    "Context:",
    JSON.stringify({
      schemaVersion: 1,
      mode,
      localDate: packet.localDate,
      fallbackNextBestAction: packet.fallbackSummary.nextBestAction,
      counts: {
        activeTodos: packet.workGraph.activeTodoCount,
        activeProjects: packet.workGraph.activeProjectCount,
        reviewInbox: packet.reviewInbox.pendingCount,
        appointments: packet.calendarPressure.appointmentCount,
      },
      allowedStableIds,
      allowedItems,
    }),
  ].join("\n\n");
};

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
      timeoutMs: options.timeoutMs,
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
        format: "json",
        options: {
          num_predict: 140,
          temperature: 0,
        },
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
