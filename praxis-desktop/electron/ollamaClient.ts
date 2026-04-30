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

const itemLine = (item: AIReviewContextPacket["overdueDueSoon"]["items"][number]) => {
  const context = item.projectTitle ? ` / ${item.projectTitle}` : "";
  const due = item.dueAt ? ` / due ${item.dueAt.slice(0, 10)}` : "";
  const reasons = item.reasons.length > 0 ? ` / ${item.reasons.join(", ")}` : "";
  return `- ${item.title}${context}${due}${reasons}`;
};

const inboxLine = (item: AIReviewContextPacket["reviewInbox"]["items"][number]) => {
  const due = item.dueAt ? ` / due ${item.dueAt.slice(0, 10)}` : "";
  return `- ${item.title}${due} / ${item.reason}`;
};

const appointmentLine = (item: AIReviewContextPacket["calendarPressure"]["items"][number]) =>
  `- ${item.title} / ${item.startsAt.slice(0, 16)} / ${item.reasons.join(", ")}`;

const linesOrNone = <T>(items: T[], formatter: (item: T) => string, empty: string) =>
  items.length > 0 ? items.map(formatter) : [`- ${empty}`];

const promptAnchor = (mode: AssistantAIReviewMode, packet: AIReviewContextPacket) => {
  if (mode === "quick_wins") {
    return packet.quickWins.items[0]?.title ?? "No quick wins are currently marked.";
  }
  if (mode === "stale_projects") {
    return packet.staleProjects.items[0]?.title ?? "No stale, paused, or blocked projects are currently visible.";
  }
  if (mode === "forgetting") {
    return (
      packet.overdueDueSoon.items[0]?.title ??
      packet.reviewInbox.items[0]?.title ??
      packet.fallbackSummary.nextBestAction
    );
  }
  if (mode === "risk_review") {
    return (
      packet.overdueDueSoon.items[0]?.title ??
      packet.waitingOn.items[0]?.title ??
      packet.calendarPressure.items[0]?.title ??
      packet.fallbackSummary.nextBestAction
    );
  }
  return (
    packet.overdueDueSoon.items[0]?.title ??
    packet.quickWins.items[0]?.title ??
    packet.reviewInbox.items[0]?.title ??
    packet.fallbackSummary.nextBestAction
  );
};

const promptContext = (mode: AssistantAIReviewMode, packet: AIReviewContextPacket) => {
  const base = [
    `Date: ${packet.localDate}`,
    `Counts: ${packet.workGraph.activeTodoCount} active todos, ${packet.workGraph.activeProjectCount} active projects, ${packet.reviewInbox.pendingCount} Review Inbox suggestions, ${packet.calendarPressure.appointmentCount} near-term appointments.`,
    `Next best action from rules: ${packet.fallbackSummary.nextBestAction}`,
  ];

  if (mode === "quick_wins") {
    return [
      ...base,
      "Quick wins:",
      ...linesOrNone(packet.quickWins.items.slice(0, 3), itemLine, "No quick wins are currently marked."),
    ].join("\n");
  }

  if (mode === "stale_projects") {
    return [
      ...base,
      "Stale projects:",
      ...linesOrNone(packet.staleProjects.items.slice(0, 3), itemLine, "No stale, paused, or blocked projects are currently visible."),
    ].join("\n");
  }

  if (mode === "forgetting") {
    return [
      ...base,
      "Easy-to-miss pressure:",
      ...linesOrNone(packet.overdueDueSoon.items.slice(0, 3), itemLine, "No overdue or due-soon items are visible."),
      "Review Inbox:",
      ...linesOrNone(packet.reviewInbox.items.slice(0, 2), inboxLine, "No pending Review Inbox suggestions are visible."),
    ].join("\n");
  }

  if (mode === "risk_review") {
    return [
      ...base,
      "Risk pressure:",
      ...linesOrNone(packet.overdueDueSoon.items.slice(0, 4), itemLine, "No overdue or due-soon items are visible."),
      "Waiting on:",
      ...linesOrNone(packet.waitingOn.items.slice(0, 2), itemLine, "No waiting-on items are currently visible."),
      "Appointments:",
      ...linesOrNone(packet.calendarPressure.items.slice(0, 2), appointmentLine, "No near-term appointments are visible."),
    ].join("\n");
  }

  return [
    ...base,
    "Start here:",
    ...linesOrNone(packet.overdueDueSoon.items.slice(0, 3), itemLine, "No overdue or due-soon items are visible."),
    "Then take a small win:",
    ...linesOrNone(packet.quickWins.items.slice(0, 2), itemLine, "No quick wins are currently marked."),
    "Review Inbox:",
    ...linesOrNone(packet.reviewInbox.items.slice(0, 2), inboxLine, "No pending Review Inbox suggestions are visible."),
  ].join("\n");
};

export const buildOllamaAIReviewPrompt = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
) =>
  [
    "You are Praxis, a local-first assistant giving an AI Task Review.",
    `Review mode: ${mode}.`,
    "Write like a direct coach: factual, specific, and directive about what deserves attention next.",
    "Use copied facts only. Do not add explanatory sentences beyond copied fact lines.",
    "Use only facts in the packet. Do not invent tasks, dates, people, relationships, or commitments.",
    "Use exact task/project/inbox titles from the facts when naming work.",
    "Copy at least one exact title or exact empty-state sentence from the facts.",
    "Do not turn a follow-up title into a meeting, schedule change, message, or new task.",
    "Do not convert dates to prose. If you mention a date, copy the YYYY-MM-DD date exactly from the facts.",
    "If the packet does not support a detail, say what is missing instead of guessing.",
    "Stay read-only. Do not claim writes, edits, scheduling, sending, deletion, or any other mutation.",
    "Do not ask the user to confirm a write, and do not imply that silent changes were made.",
    "Keep the answer to 2 short bullets or fewer.",
    "Start with `Do this first:` followed by an exact title or exact empty-state sentence from the facts.",
    `Required opening line: Do this first: ${promptAnchor(mode, packet)}`,
    "Facts:",
    promptContext(mode, packet),
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
        options: {
          num_predict: 70,
          temperature: 0.2,
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
