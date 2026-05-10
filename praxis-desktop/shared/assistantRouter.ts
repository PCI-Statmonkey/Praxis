import type {
  AiReliancePolicy,
  AiSettings,
} from "./settingsModel";

export type AssistantRouteRequest = {
  text: string;
  surface?: import("./skillRegistry").PraxisSkillSurface;
};

export type AssistantRouteSkillReference = {
  id: string;
  name: string;
  description: string;
  surfaces: import("./skillRegistry").PraxisSkillSurface[];
  relativePath: string;
};

export const formatAssistantChoiceReply = (choices: string[]) =>
  `Reply with ${choices.map((choice) => `\`${choice}\``).join(", ")}, or \`no\` to cancel.`;

export type AssistantReviewRouteKind =
  | "quick_wins"
  | "reset"
  | "forgetting"
  | "risk_review"
  | "stale_projects"
  | "change_review"
  | "person_project_lookup";

export type AssistantReviewRoute = {
  kind: AssistantReviewRouteKind;
  intent: "daily_report" | "person_lookup" | "work_lookup";
  confidence: number;
  message: string;
};

export type AssistantAIReviewMode =
  | "quick_wins"
  | "reset"
  | "forgetting"
  | "risk_review"
  | "stale_projects"
  | "change_review";

export type AssistantAIReviewModelPlan = {
  selectedProvider: "deterministic_fallback";
  plannedProvider: "none" | "ollama" | "api";
  localRuntime: AiSettings["localRuntime"];
  localModelName: string | null;
  reliancePolicy: AiReliancePolicy;
  externalApiAllowed: boolean;
  externalApiRequired: false;
  reason: string;
};

export type AssistantAIReviewRoutePayload = {
  mode: AssistantAIReviewMode;
  writeBoundary: "read_only";
  suggestedStableIds: string[];
  modelPlan: AssistantAIReviewModelPlan;
};

export type AssistantAIReviewGenerateRequest =
  | {
      mode: AssistantAIReviewMode;
      routeKind?: never;
    }
  | {
      mode?: never;
      routeKind: AssistantReviewRouteKind;
    };

export type AssistantAIReviewGenerateResult =
  | {
      ok: true;
      mode: AssistantAIReviewMode;
      message: string;
      summarySource: "deterministic_fallback" | "ollama";
      fallbackReason: string | null;
      writeBoundary: "read_only";
      suggestedStableIds: string[];
      modelPlan: AssistantAIReviewModelPlan;
    }
  | {
      ok: false;
      message: string;
      writeBoundary: "read_only";
    };

const assistantAIReviewModes = new Set<AssistantAIReviewMode>([
  "quick_wins",
  "reset",
  "forgetting",
  "risk_review",
  "stale_projects",
  "change_review",
]);

export const isAssistantAIReviewMode = (value: unknown): value is AssistantAIReviewMode =>
  typeof value === "string" && assistantAIReviewModes.has(value as AssistantAIReviewMode);

export const assistantAIReviewModeFromRouteKind = (
  kind: AssistantReviewRouteKind
): AssistantAIReviewMode | null => {
  if (kind === "person_project_lookup") {
    return null;
  }
  return kind;
};

export const resolveAssistantAIReviewGenerateMode = (
  input: AssistantAIReviewGenerateRequest
):
  | {
      ok: true;
      mode: AssistantAIReviewMode;
    }
  | {
      ok: false;
      message: string;
    } => {
  if (isAssistantAIReviewMode(input.mode)) {
    return {
      ok: true,
      mode: input.mode,
    };
  }

  if (typeof input.routeKind === "string") {
    const mode = assistantAIReviewModeFromRouteKind(input.routeKind);
    if (mode) {
      return {
        ok: true,
        mode,
      };
    }
  }

  return {
    ok: false,
    message: "AI review generation requires a supported review mode.",
  };
};

const normalizeReviewText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const classifyAssistantReviewRoute = (text: string): AssistantReviewRoute | null => {
  const normalized = normalizeReviewText(text);
  if (!normalized) {
    return null;
  }

  if (/\b(knock out|quick wins?|easy wins?)\b/.test(normalized)) {
    return {
      kind: "quick_wins",
      intent: "work_lookup",
      confidence: 0.84,
      message: "Checking the current work graph for quick wins.",
    };
  }

  if (/\b(give me|show me|find me)\b.*\b(few )?wins?\b/.test(normalized)) {
    return {
      kind: "quick_wins",
      intent: "daily_report",
      confidence: 0.8,
      message: "Opening the daily status report for a few safe wins.",
    };
  }

  if (/\b(overwhelmed|reset me|reset|adhd reset|triage me|recenter me)\b/.test(normalized)) {
    return {
      kind: "reset",
      intent: "daily_report",
      confidence: 0.84,
      message: "Opening the daily status report for a reset.",
    };
  }

  if (
    /\b(what should i do next|what do i do next|what next|next move|where should i start|what should i start)\b/.test(
      normalized
    )
  ) {
    return {
      kind: "reset",
      intent: "daily_report",
      confidence: 0.84,
      message: "Checking the current work graph for the next move.",
    };
  }

  if (/\b(forgetting|forgot|missed|missing)\b/.test(normalized)) {
    return {
      kind: "forgetting",
      intent: "daily_report",
      confidence: 0.82,
      message: "Checking the daily status report for anything easy to miss.",
    };
  }

  if (/\b(what changed|changed since|changed today|since yesterday|recent changes|what did i finish|what got done)\b/.test(normalized)) {
    return {
      kind: "change_review",
      intent: "daily_report",
      confidence: 0.8,
      message: "Checking recent work changes from the local packet.",
    };
  }

  if (/\b(bite me|about to bite|at risk|risk|risky|fire drill)\b/.test(normalized)) {
    return {
      kind: "risk_review",
      intent: "daily_report",
      confidence: 0.82,
      message: "Checking the daily status report for near-term pressure.",
    };
  }

  if (/\b(stale|stalled|stagnant|neglected)\b/.test(normalized) && /\b(project|projects)\b/.test(normalized)) {
    return {
      kind: "stale_projects",
      intent: "daily_report",
      confidence: 0.78,
      message: "Checking the daily status report for stale project pressure.",
    };
  }

  if (
    /\b(project|projects|mission|missions)\b/.test(normalized) &&
    /\b(with|for|by)\b\s+[a-z0-9]+\b/.test(normalized) &&
    /\b(hey|you have|that project|that mission|remember)\b/.test(normalized)
  ) {
    return {
      kind: "person_project_lookup",
      intent: "person_lookup",
      confidence: 0.78,
      message: "Looking up that person and related work.",
    };
  }

  return null;
};

type AssistantRouteSkillContext = {
  skillReferences?: AssistantRouteSkillReference[];
};

type AssistantRouteAIReviewContext = {
  aiReview?: AssistantAIReviewRoutePayload;
};

export type AssistantRouteResult = AssistantRouteSkillContext & AssistantRouteAIReviewContext & (
  | {
      intent: "focus_report";
      entityKind: "mission" | "project";
      entityId: string;
      title: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "daily_report";
      confidence: number;
      message: string;
    }
  | {
      intent: "appointment_report";
      range: "today" | "tomorrow" | "upcoming";
      confidence: number;
      message: string;
    }
  | {
      intent: "capture";
      confidence: number;
      message: string;
    }
  | {
      intent: "conversation_review";
      sourceSystem: "slack" | "whatsapp" | "sms" | "manual" | "unknown";
      confidence: number;
      message: string;
    }
  | {
      intent: "tell_more";
      confidence: number;
      message: string;
    }
  | {
      intent: "context_action";
      confidence: number;
      message: string;
    }
  | {
      intent: "work_update_status";
      entityKind: "todo" | "deadline";
      entityId: string;
      title: string;
      status: "completed";
      confidence: number;
      message: string;
    }
  | {
      intent: "work_update_due_date";
      entityKind: "todo" | "deadline";
      entityId: string;
      title: string;
      dueAt: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "work_clear_waiting_on";
      todoId: string;
      todoTitle: string;
      personId: string;
      personName: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "work_assign_waiting_on";
      todoId: string;
      todoTitle: string;
      personId: string;
      personName: string;
      confidence: number;
      message: string;
    }
  | {
      intent: "work_update_confirmation";
      title: string;
      prompt: string;
      actions: import("./assistantContext").AssistantContextAction[];
      confidence: number;
      message: string;
    }
  | {
      intent: "person_lookup";
      confidence: number;
      message: string;
    }
  | {
      intent: "work_lookup";
      confidence: number;
      message: string;
    }
  | {
      intent: "unresolved";
      confidence: number;
      message: string;
    }
);

export const buildAssistantAIReviewRouteResult = (
  reviewRoute: AssistantReviewRoute,
  response: {
    mode: AssistantAIReviewMode;
    message: string;
    writeBoundary: "read_only";
    suggestedStableIds: string[];
    modelPlan: AssistantAIReviewModelPlan;
  }
): AssistantRouteResult => ({
  intent: reviewRoute.intent,
  confidence: reviewRoute.confidence,
  message: response.message,
  aiReview: {
    mode: response.mode,
    writeBoundary: response.writeBoundary,
    suggestedStableIds: response.suggestedStableIds,
    modelPlan: response.modelPlan,
  },
});
