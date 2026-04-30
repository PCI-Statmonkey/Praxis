import {
  DEFAULT_AI_SETTINGS,
  normalizeAiSettings,
  type AiSettings,
} from "../shared/settingsModel";
import type {
  AIReviewAppointmentItem,
  AIReviewContextPacket,
  AIReviewInboxItem,
  AIReviewWorkItem,
} from "../shared/aiReviewContext";
import {
  assistantAIReviewModeFromRouteKind,
  type AssistantAIReviewGenerateResult,
  type AssistantAIReviewMode,
  type AssistantAIReviewModelPlan,
  type AssistantReviewRouteKind,
} from "../shared/assistantRouter";
import {
  generateOllamaReviewSummary,
  type OllamaReviewGenerateResult,
} from "./ollamaClient";

export type AIReviewResponse = {
  mode: AssistantAIReviewMode;
  message: string;
  packet: AIReviewContextPacket;
  modelPlan: AssistantAIReviewModelPlan;
  writeBoundary: "read_only";
  suggestedStableIds: string[];
  summarySource: "deterministic_fallback" | "ollama";
  fallbackReason: string | null;
};

export type BuildAIReviewResponseInput = {
  mode: AssistantAIReviewMode;
  packet: AIReviewContextPacket;
  settings?: Partial<AiSettings>;
  providerSecretsAvailable?: boolean;
};

export type BuildAIReviewResponseWithOllamaInput = BuildAIReviewResponseInput & {
  generateSummary?: typeof generateOllamaReviewSummary;
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
  return assistantAIReviewModeFromRouteKind(kind);
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

const workLines = (
  items: AIReviewWorkItem[],
  limit: number,
  emptyMessage: string,
  seenKeys?: Set<string>
) => {
  if (items.length === 0) {
    return emptyLine(emptyMessage);
  }
  return uniqueWorkItemsForPresentation(items, seenKeys).slice(0, limit).map(formatWorkItem);
};

const quickWinLines = (packet: AIReviewContextPacket, seenKeys?: Set<string>) => {
  return workLines(
    packet.quickWins.items,
    3,
    "No quick wins are currently marked. Use the due-soon list as the fallback.",
    seenKeys
  );
};

const pressureLines = (packet: AIReviewContextPacket, seenKeys?: Set<string>) => {
  return workLines(
    packet.overdueDueSoon.items,
    4,
    "No overdue or due-soon work is currently visible.",
    seenKeys
  );
};

const waitingLines = (packet: AIReviewContextPacket, seenKeys?: Set<string>) => {
  return workLines(
    packet.waitingOn.items,
    3,
    "No active waiting-on items are currently visible.",
    seenKeys
  );
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

const staleProjectLines = (packet: AIReviewContextPacket, seenKeys?: Set<string>) => {
  return workLines(
    packet.staleProjects.items,
    4,
    "No stale, paused, or blocked projects are currently visible.",
    seenKeys
  );
};

const section = (title: string, lines: string[]) => [
  title,
  ...lines,
].join("\n");

const sectionIfLines = (title: string, lines: string[]) =>
  lines.length > 0 ? section(title, lines) : null;

const compactSections = (sections: Array<string | null>) =>
  sections.filter((candidate): candidate is string => Boolean(candidate));

const modeSections = (mode: AssistantAIReviewMode, packet: AIReviewContextPacket) => {
  const seenKeys = new Set<string>();

  if (mode === "quick_wins") {
    return compactSections([sectionIfLines("Quick wins", quickWinLines(packet, seenKeys))]);
  }

  if (mode === "risk_review") {
    return compactSections([
      sectionIfLines("Overdue / due soon", pressureLines(packet, seenKeys)),
      section("Calendar pressure", appointmentLines(packet)),
      sectionIfLines("Waiting on", waitingLines(packet, seenKeys)),
    ]);
  }

  if (mode === "stale_projects") {
    return compactSections([sectionIfLines("Stale projects", staleProjectLines(packet, seenKeys))]);
  }

  if (mode === "forgetting") {
    return compactSections([
      sectionIfLines("Overdue / due soon", pressureLines(packet, seenKeys)),
      section("Review Inbox", inboxLines(packet)),
      section("Calendar pressure", appointmentLines(packet)),
    ]);
  }

  return compactSections([
    sectionIfLines("Start here", pressureLines(packet, seenKeys)),
    sectionIfLines("Then take a small win", quickWinLines(packet, seenKeys)),
    sectionIfLines("Waiting on", waitingLines(packet, seenKeys).slice(0, 2)),
    section("Review Inbox", inboxLines(packet).slice(0, 2)),
  ]);
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
  summarySource: "deterministic_fallback",
  fallbackReason: null,
});

const fallbackWithReason = (
  input: BuildAIReviewResponseInput,
  reason: string
): AIReviewResponse => ({
  ...buildAIReviewResponse(input),
  fallbackReason: reason,
});

const aiReviewEmphasisValues = new Set([
  "start_here",
  "quick_win",
  "risk",
  "waiting_on",
  "review_inbox",
  "stale",
] as const);

type AIReviewEmphasis = typeof aiReviewEmphasisValues extends Set<infer Value> ? Value : never;

type AIReviewModelSelection = {
  schemaVersion: 1;
  mode: AssistantAIReviewMode;
  priorityStableIds: string[];
  emphasis: AIReviewEmphasis;
  coachLine?: string;
};

type RenderableAIReviewItem = {
  stableId: string;
  title: string;
  line: string;
  presentationKeys: string[];
};

const normalizePresentationText = (value: string | null | undefined) =>
  (value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ");

const workPresentationKeys = (item: AIReviewWorkItem) => [
  `stable:${item.stableId}`,
  [
    "work",
    normalizePresentationText(item.title),
    normalizePresentationText(item.projectId ?? item.projectTitle),
    normalizePresentationText(item.missionId ?? item.missionTitle),
  ].join("|"),
];

const uniqueWorkItemsForPresentation = (
  items: AIReviewWorkItem[],
  seenKeys = new Set<string>()
) => {
  const uniqueItems: AIReviewWorkItem[] = [];
  for (const item of items) {
    const keys = workPresentationKeys(item);
    if (keys.some((key) => seenKeys.has(key))) {
      continue;
    }
    keys.forEach((key) => seenKeys.add(key));
    uniqueItems.push(item);
  }
  return uniqueItems;
};

const uniqueRenderableItemsForPresentation = (items: RenderableAIReviewItem[]) => {
  const seenKeys = new Set<string>();
  const uniqueItems: RenderableAIReviewItem[] = [];
  for (const item of items) {
    if (item.presentationKeys.some((key) => seenKeys.has(key))) {
      continue;
    }
    item.presentationKeys.forEach((key) => seenKeys.add(key));
    uniqueItems.push(item);
  }
  return uniqueItems;
};

const inboxItemLine = (item: AIReviewInboxItem) =>
  `- ${item.title} (Review Inbox: ${item.reason})`;

const appointmentItemLine = (item: AIReviewAppointmentItem) =>
  `- ${item.title}${formatReasons(item)}`;

const workRenderable = (item: AIReviewWorkItem): RenderableAIReviewItem => ({
  stableId: item.stableId,
  title: item.title,
  line: formatWorkItem(item),
  presentationKeys: workPresentationKeys(item),
});

const inboxRenderable = (item: AIReviewInboxItem): RenderableAIReviewItem => ({
  stableId: item.stableId,
  title: item.title,
  line: inboxItemLine(item),
  presentationKeys: [`stable:${item.stableId}`],
});

const appointmentRenderable = (item: AIReviewAppointmentItem): RenderableAIReviewItem => ({
  stableId: item.stableId,
  title: item.title,
  line: appointmentItemLine(item),
  presentationKeys: [`stable:${item.stableId}`],
});

const allowedModelItems = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
): RenderableAIReviewItem[] => {
  if (mode === "quick_wins") {
    return packet.quickWins.items.map(workRenderable);
  }
  if (mode === "stale_projects") {
    return packet.staleProjects.items.map(workRenderable);
  }
  if (mode === "risk_review") {
    return [
      ...packet.overdueDueSoon.items.map(workRenderable),
      ...packet.waitingOn.items.map(workRenderable),
      ...packet.calendarPressure.items.map(appointmentRenderable),
    ];
  }
  if (mode === "forgetting") {
    return [
      ...packet.overdueDueSoon.items.map(workRenderable),
      ...packet.reviewInbox.items.map(inboxRenderable),
      ...packet.calendarPressure.items.map(appointmentRenderable),
    ];
  }
  return [
    ...packet.overdueDueSoon.items.map(workRenderable),
    ...packet.quickWins.items.map(workRenderable),
    ...packet.waitingOn.items.map(workRenderable),
    ...packet.reviewInbox.items.map(inboxRenderable),
  ];
};

const knownStableIds = (packet: AIReviewContextPacket) =>
  new Set([
    ...packet.overdueDueSoon.items.map((item) => item.stableId),
    ...packet.quickWins.items.map((item) => item.stableId),
    ...packet.reviewInbox.items.map((item) => item.stableId),
    ...packet.staleProjects.items.map((item) => item.stableId),
    ...packet.waitingOn.items.map((item) => item.stableId),
    ...packet.calendarPressure.items.map((item) => item.stableId),
    ...packet.recentCloseoutChanges.items.map((item) => item.stableId),
  ]);

const packetDates = (packet: AIReviewContextPacket) =>
  new Set(
    [
      packet.localDate,
      ...packet.overdueDueSoon.items.map((item) => item.dueAt?.slice(0, 10) ?? ""),
      ...packet.quickWins.items.map((item) => item.dueAt?.slice(0, 10) ?? ""),
      ...packet.reviewInbox.items.map((item) => item.dueAt?.slice(0, 10) ?? ""),
      ...packet.staleProjects.items.map((item) => item.dueAt?.slice(0, 10) ?? ""),
      ...packet.waitingOn.items.map((item) => item.dueAt?.slice(0, 10) ?? ""),
      ...packet.calendarPressure.items.map((item) => item.startsAt.slice(0, 10)),
    ].filter((value) => value.length > 0)
  );

const hasOnlyPacketDates = (text: string, packet: AIReviewContextPacket) => {
  const monthNameDate = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i;
  if (monthNameDate.test(text)) {
    return false;
  }
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
  if (dates.length === 0) {
    return true;
  }
  const allowedDates = packetDates(packet);
  return dates.every((date) => allowedDates.has(date));
};

const mutationLanguage =
  /\b(create|created|creating|edit|edited|editing|update|updated|updating|complete|completed|mark done|schedule|scheduled|scheduling|send|sent|sending|delete|deleted|deleting|move|moved|moving|reschedule|rescheduled|change|changed|changing)\b/i;

const internalModeLanguage =
  /\b(?:review mode|route|mode|quick_wins|risk_review|stale_projects|start_here|quick_win|waiting_on|review_inbox)\b/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseAIReviewModelSelection = (
  text: string,
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket
):
  | { ok: true; selection: AIReviewModelSelection }
  | { ok: false; reason: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: "Ollama returned non-JSON AI review output.",
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      reason: "Ollama returned an invalid AI review selection shape.",
    };
  }

  if (parsed.schemaVersion !== 1) {
    return {
      ok: false,
      reason: "Ollama returned an unsupported AI review selection schema.",
    };
  }

  if (parsed.mode !== mode) {
    return {
      ok: false,
      reason: "Ollama returned an AI review selection for the wrong mode.",
    };
  }

  if (!aiReviewEmphasisValues.has(parsed.emphasis as AIReviewEmphasis)) {
    return {
      ok: false,
      reason: "Ollama returned an unsupported AI review emphasis.",
    };
  }

  if (!Array.isArray(parsed.priorityStableIds)) {
    return {
      ok: false,
      reason: "Ollama returned AI review IDs in an invalid shape.",
    };
  }

  const knownIds = knownStableIds(packet);
  const allowedIds = new Set(allowedModelItems(mode, packet).map((item) => item.stableId));
  const selectedIds: string[] = [];
  const seenIds = new Set<string>();

  for (const value of parsed.priorityStableIds) {
    if (typeof value !== "string" || value.trim().length === 0) {
      return {
        ok: false,
        reason: "Ollama returned an invalid AI review stable ID.",
      };
    }
    const stableId = value.trim();
    if (!knownIds.has(stableId)) {
      return {
        ok: false,
        reason: "Ollama selected an unknown AI review stable ID.",
      };
    }
    if (!allowedIds.has(stableId)) {
      return {
        ok: false,
        reason: "Ollama selected an AI review stable ID outside the requested mode.",
      };
    }
    if (seenIds.has(stableId)) {
      continue;
    }
    seenIds.add(stableId);
    if (selectedIds.length < 3) {
      selectedIds.push(stableId);
    }
  }

  if (selectedIds.length === 0) {
    return {
      ok: false,
      reason: "Ollama did not select any usable AI review stable IDs.",
    };
  }

  const rawCoachLine = typeof parsed.coachLine === "string" ? parsed.coachLine.trim() : "";
  const coachLine =
    rawCoachLine.length > 0 &&
    rawCoachLine.length <= 140 &&
    !mutationLanguage.test(rawCoachLine) &&
    !internalModeLanguage.test(rawCoachLine) &&
    hasOnlyPacketDates(rawCoachLine, packet)
      ? rawCoachLine
      : undefined;

  return {
    ok: true,
    selection: {
      schemaVersion: 1,
      mode,
      priorityStableIds: selectedIds,
      emphasis: parsed.emphasis as AIReviewEmphasis,
      ...(coachLine ? { coachLine } : {}),
    },
  };
};

const modeSelectionSectionTitles: Record<AssistantAIReviewMode, string> = {
  reset: "Start here",
  quick_wins: "Take this win",
  forgetting: "Do not let this slip",
  risk_review: "Watch this first",
  stale_projects: "Review this stale lane",
};

const renderAIReviewModelSelection = (
  mode: AssistantAIReviewMode,
  packet: AIReviewContextPacket,
  selection: AIReviewModelSelection
) => {
  const itemById = new Map(allowedModelItems(mode, packet).map((item) => [item.stableId, item]));
  const lines = uniqueRenderableItemsForPresentation(
    selection.priorityStableIds
      .map((stableId) => itemById.get(stableId))
      .filter((item): item is RenderableAIReviewItem => Boolean(item))
  ).map((item) => item.line);

  return [
    modeHeadlines[mode],
    section(modeSelectionSectionTitles[mode], lines),
    "No work has been changed.",
  ].join("\n\n");
};

export const buildAIReviewResponseWithOllama = async ({
  mode,
  packet,
  settings = DEFAULT_AI_SETTINGS,
  providerSecretsAvailable = false,
  generateSummary = generateOllamaReviewSummary,
}: BuildAIReviewResponseWithOllamaInput): Promise<AIReviewResponse> => {
  const normalizedSettings = normalizeAiSettings(settings, DEFAULT_AI_SETTINGS);
  const fallbackInput = {
    mode,
    packet,
    settings: normalizedSettings,
    providerSecretsAvailable,
  };

  if (!normalizedSettings.localModelName) {
    return fallbackWithReason(fallbackInput, "No saved Ollama model is selected.");
  }

  const generated: OllamaReviewGenerateResult = await generateSummary({
    modelName: normalizedSettings.localModelName,
    mode,
    packet,
  });

  if (!generated.ok) {
    return fallbackWithReason(fallbackInput, generated.reason);
  }

  const selectionResult = parseAIReviewModelSelection(generated.text, mode, packet);
  if (!selectionResult.ok) {
    return fallbackWithReason(fallbackInput, selectionResult.reason);
  }

  return {
    ...buildAIReviewResponse(fallbackInput),
    message: renderAIReviewModelSelection(mode, packet, selectionResult.selection),
    summarySource: "ollama",
    fallbackReason: null,
    suggestedStableIds: selectionResult.selection.priorityStableIds,
  };
};

export const toAssistantAIReviewGenerateResult = (
  response: AIReviewResponse
): AssistantAIReviewGenerateResult => ({
  ok: true,
  mode: response.mode,
  message: response.message,
  summarySource: response.summarySource,
  fallbackReason: response.fallbackReason,
  writeBoundary: response.writeBoundary,
  suggestedStableIds: response.suggestedStableIds,
  modelPlan: response.modelPlan,
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

  return buildAIReviewResponseWithOllama({
    mode,
    packet: buildLocalAIReviewContextPacket(),
    settings: getAiSettings(),
  });
};
