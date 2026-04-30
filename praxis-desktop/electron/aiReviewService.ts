import {
  DEFAULT_AI_SETTINGS,
  normalizeAiSettings,
  type AiSettings,
} from "../shared/settingsModel";
import type {
  AIReviewContextPacket,
  AIReviewWorkItem,
} from "../shared/aiReviewContext";
import type {
  AssistantAIReviewMode,
  AssistantAIReviewModelPlan,
  AssistantReviewRouteKind,
} from "../shared/assistantRouter";

export type AIReviewResponse = {
  mode: AssistantAIReviewMode;
  message: string;
  packet: AIReviewContextPacket;
  modelPlan: AssistantAIReviewModelPlan;
  writeBoundary: "read_only";
  suggestedStableIds: string[];
};

export type BuildAIReviewResponseInput = {
  mode: AssistantAIReviewMode;
  packet: AIReviewContextPacket;
  settings?: Partial<AiSettings>;
  providerSecretsAvailable?: boolean;
};

export type BuildLocalAIReviewResponseSources = {
  buildPacket: () => AIReviewContextPacket;
  getSettings: () => AiSettings;
};

const modeHeadlines: Record<AssistantAIReviewMode, string> = {
  quick_wins: "A few safe wins from the current work graph:",
  reset: "Reset from the current work graph:",
  forgetting: "Easy-to-miss pressure from the current work graph:",
  risk_review: "Near-term pressure from the current work graph:",
  stale_projects: "Stale project pressure from the current work graph:",
};

const modelConfigured = (settings: AiSettings) => Boolean(settings.localModelName);

export const aiReviewModeFromRouteKind = (
  kind: AssistantReviewRouteKind
): AssistantAIReviewMode | null => {
  if (kind === "person_project_lookup") {
    return null;
  }
  return kind;
};

export const planAIReviewModelRoute = (
  input: Partial<AiSettings> = {},
  providerSecretsAvailable = false
): AssistantAIReviewModelPlan => {
  const settings = normalizeAiSettings(input, DEFAULT_AI_SETTINGS);
  const externalApiAllowed =
    settings.reliancePolicy === "balanced" ||
    settings.reliancePolicy === "prefer_api" ||
    settings.reliancePolicy === "api_only";

  if (
    settings.reliancePolicy === "local_only" ||
    settings.reliancePolicy === "prefer_local"
  ) {
    return {
      selectedProvider: "deterministic_fallback",
      plannedProvider: modelConfigured(settings) ? "ollama" : "none",
      localRuntime: settings.localRuntime,
      localModelName: settings.localModelName,
      reliancePolicy: settings.reliancePolicy,
      externalApiAllowed: false,
      externalApiRequired: false,
      reason: modelConfigured(settings)
        ? "Ollama/local model route is planned, but this skeleton uses deterministic fallback only."
        : "No local model is configured, so deterministic fallback is used without API reliance.",
    };
  }

  if (providerSecretsAvailable) {
    return {
      selectedProvider: "deterministic_fallback",
      plannedProvider: settings.reliancePolicy === "prefer_api" || settings.reliancePolicy === "api_only"
        ? "api"
        : modelConfigured(settings)
          ? "ollama"
          : "api",
      localRuntime: settings.localRuntime,
      localModelName: settings.localModelName,
      reliancePolicy: settings.reliancePolicy,
      externalApiAllowed,
      externalApiRequired: false,
      reason:
        "Model/API route is available in policy, but this skeleton intentionally returns deterministic fallback only.",
    };
  }

  return {
    selectedProvider: "deterministic_fallback",
    plannedProvider: modelConfigured(settings) ? "ollama" : "api",
    localRuntime: settings.localRuntime,
    localModelName: settings.localModelName,
    reliancePolicy: settings.reliancePolicy,
    externalApiAllowed,
    externalApiRequired: false,
    reason:
      "API-capable policy is configured, but provider secrets are not available; deterministic fallback remains active.",
  };
};

const formatReasons = (item: { reasons: string[] }) =>
  item.reasons.length > 0 ? ` (${item.reasons.join("; ")})` : "";

const formatWorkItem = (item: AIReviewWorkItem) => {
  const context = item.projectTitle ? ` - ${item.projectTitle}` : "";
  return `- ${item.title}${context}${formatReasons(item)}`;
};

const emptyLine = (message: string) => [`- ${message}`];

const quickWinLines = (packet: AIReviewContextPacket) => {
  if (packet.quickWins.items.length === 0) {
    return emptyLine("No quick wins are currently marked. Use the due-soon list as the fallback.");
  }
  return packet.quickWins.items.slice(0, 3).map(formatWorkItem);
};

const pressureLines = (packet: AIReviewContextPacket) => {
  const items = packet.overdueDueSoon.items.slice(0, 4);
  if (items.length === 0) {
    return emptyLine("No overdue or due-soon work is currently visible.");
  }
  return items.map(formatWorkItem);
};

const waitingLines = (packet: AIReviewContextPacket) => {
  if (packet.waitingOn.items.length === 0) {
    return emptyLine("No active waiting-on items are currently visible.");
  }
  return packet.waitingOn.items.slice(0, 3).map(formatWorkItem);
};

const inboxLines = (packet: AIReviewContextPacket) => {
  if (packet.reviewInbox.items.length === 0) {
    return emptyLine("Review Inbox has no pending structured suggestions.");
  }
  return packet.reviewInbox.items
    .slice(0, 3)
    .map((item) => `- ${item.title} (${item.reason})`);
};

const appointmentLines = (packet: AIReviewContextPacket) => {
  if (packet.calendarPressure.items.length === 0) {
    return emptyLine("No upcoming appointments are visible in the packet window.");
  }
  return packet.calendarPressure.items
    .slice(0, 3)
    .map((item) => `- ${item.title}${formatReasons(item)}`);
};

const staleProjectLines = (packet: AIReviewContextPacket) => {
  if (packet.staleProjects.items.length === 0) {
    return emptyLine("No stale, paused, or blocked projects are currently visible.");
  }
  return packet.staleProjects.items.slice(0, 4).map(formatWorkItem);
};

const section = (title: string, lines: string[]) => [
  title,
  ...lines,
].join("\n");

const modeSections = (mode: AssistantAIReviewMode, packet: AIReviewContextPacket) => {
  if (mode === "quick_wins") {
    return [section("Quick wins", quickWinLines(packet))];
  }

  if (mode === "risk_review") {
    return [
      section("Overdue / due soon", pressureLines(packet)),
      section("Calendar pressure", appointmentLines(packet)),
      section("Waiting on", waitingLines(packet)),
    ];
  }

  if (mode === "stale_projects") {
    return [section("Stale projects", staleProjectLines(packet))];
  }

  if (mode === "forgetting") {
    return [
      section("Overdue / due soon", pressureLines(packet)),
      section("Review Inbox", inboxLines(packet)),
      section("Calendar pressure", appointmentLines(packet)),
    ];
  }

  return [
    section("Start here", pressureLines(packet)),
    section("Then take a small win", quickWinLines(packet)),
    section("Waiting on", waitingLines(packet).slice(0, 2)),
    section("Review Inbox", inboxLines(packet).slice(0, 2)),
  ];
};

const suggestedStableIds = (mode: AssistantAIReviewMode, packet: AIReviewContextPacket) => {
  const candidates =
    mode === "quick_wins"
      ? packet.quickWins.items
      : mode === "stale_projects"
        ? packet.staleProjects.items
        : mode === "risk_review"
          ? [...packet.overdueDueSoon.items, ...packet.waitingOn.items]
          : [
              ...packet.overdueDueSoon.items,
              ...packet.quickWins.items,
              ...packet.waitingOn.items,
              ...packet.reviewInbox.items,
            ];
  return candidates.slice(0, 5).map((item) => item.stableId);
};

export const buildAIReviewFallbackMessage = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
) =>
  [
    modeHeadlines[mode],
    ...modeSections(mode, packet),
    `Next best action: ${packet.fallbackSummary.nextBestAction}`,
    "No work has been changed.",
  ].join("\n\n");

export const buildAIReviewResponse = ({
  mode,
  packet,
  settings = DEFAULT_AI_SETTINGS,
  providerSecretsAvailable = false,
}: BuildAIReviewResponseInput): AIReviewResponse => ({
  mode,
  message: buildAIReviewFallbackMessage(mode, packet),
  packet,
  modelPlan: planAIReviewModelRoute(settings, providerSecretsAvailable),
  writeBoundary: "read_only",
  suggestedStableIds: suggestedStableIds(mode, packet),
});

export const buildLocalAIReviewResponseFromSources = (
  mode: AssistantAIReviewMode,
  sources: BuildLocalAIReviewResponseSources
): AIReviewResponse =>
  buildAIReviewResponse({
    mode,
    packet: sources.buildPacket(),
    settings: sources.getSettings(),
  });

export const buildLocalAIReviewResponse = async (
  mode: AssistantAIReviewMode
): Promise<AIReviewResponse> => {
  const [{ buildLocalAIReviewContextPacket }, { getAiSettings }] = await Promise.all([
    import("./aiReviewContext"),
    import("./settingsRepository"),
  ]);

  return buildLocalAIReviewResponseFromSources(mode, {
    buildPacket: buildLocalAIReviewContextPacket,
    getSettings: getAiSettings,
  });
};
