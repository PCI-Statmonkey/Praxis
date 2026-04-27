import type { CommandInvocation } from "./commands";
import type { Idea, SurfaceId } from "./domain";

export type SuggestedAction = {
  id: string;
  label: string;
  targetId: string;
  targetTitle: string;
  score: number;
  reason: string;
  command: CommandInvocation;
};

export type PendingSuggestion = {
  id: string;
  prompt: string;
  surface: SurfaceId;
  threadId: string;
  createdAt: string;
  actions: SuggestedAction[];
};

export type ContextualReplyResolution =
  | {
      kind: "execute";
      action: SuggestedAction;
      command: CommandInvocation;
      message: string;
    }
  | {
      kind: "clarify";
      message: string;
    }
  | {
      kind: "decline";
      message: string;
    }
  | {
      kind: "ignore";
      message: string;
    };

const ACCEPT_TOKENS = new Set([
  "yes",
  "y",
  "yeah",
  "yep",
  "sure",
  "ok",
  "okay",
  "do it",
  "go ahead",
  "sounds good",
  "please do",
]);

const DECLINE_TOKENS = new Set([
  "no",
  "n",
  "nope",
  "not now",
  "stop",
  "cancel",
  "never mind",
]);

const ORDINAL_ALIASES: Record<number, string[]> = {
  1: ["1", "first", "the first one", "first one"],
  2: ["2", "second", "the second one", "second one"],
  3: ["3", "third", "the third one", "third one"],
  4: ["4", "fourth", "the fourth one", "fourth one"],
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const clampScore = (value: number) => Math.max(0, Math.min(1, value));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isAffirmative = (reply: string) => ACCEPT_TOKENS.has(normalize(reply));

const isDecline = (reply: string) => DECLINE_TOKENS.has(normalize(reply));

const extractOrdinal = (reply: string) => {
  const normalized = normalize(reply);
  for (const [indexText, aliases] of Object.entries(ORDINAL_ALIASES)) {
    if (aliases.includes(normalized)) {
      return Number(indexText);
    }
  }

  const inlineMatch = normalized.match(/\b([1-4])\b/);
  return inlineMatch ? Number(inlineMatch[1]) : null;
};

const findReferencedAction = (reply: string, suggestion: PendingSuggestion) => {
  const normalizedReply = normalize(reply);
  return (
    suggestion.actions.find((action) => {
      const label = normalize(action.label);
      const target = normalize(action.targetTitle);
      return (
        (label.length > 3 && normalizedReply.includes(label)) ||
        (target.length > 3 && normalizedReply.includes(target))
      );
    }) ?? null
  );
};

const createMissionScore = (idea: Idea) =>
  clampScore(
    idea.strategicFit * 0.38 +
      idea.urgency * 0.24 +
      idea.energy * 0.22 +
      idea.novelty * 0.16
  );

const describeScore = (idea: Idea) => {
  if (idea.strategicFit >= 0.85 && idea.urgency >= 0.7) {
    return "highest leverage and time-sensitive";
  }
  if (idea.strategicFit >= 0.85) {
    return "strong strategic fit";
  }
  if (idea.urgency >= 0.75) {
    return "time-sensitive";
  }
  if (idea.energy >= 0.75) {
    return "easy to start while momentum is high";
  }
  return "worth advancing next";
};

export const buildMissionSuggestion = (
  ideas: Idea[],
  surface: SurfaceId,
  threadId: string
): PendingSuggestion | null => {
  if (ideas.length === 0) {
    return null;
  }

  const actions = [...ideas]
    .map((idea) => {
      const score = createMissionScore(idea);
      const actionId = createId("action");
      return {
        id: actionId,
        label: `Create mission from "${idea.title}"`,
        targetId: idea.id,
        targetTitle: idea.title,
        score,
        reason: describeScore(idea),
        command: {
          name: "create_mission" as const,
          args: {
            ideaId: idea.id,
            title: idea.title,
            summary: idea.summary,
          },
          source: {
            surface,
            actionId,
          },
        },
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);

  const suggestionId = createId("suggestion");
  return {
    id: suggestionId,
    prompt: "Want me to turn one of these into a mission?",
    surface,
    threadId,
    createdAt: new Date().toISOString(),
    actions: actions.map((action) => ({
      ...action,
      command: {
        ...action.command,
        source: {
          ...action.command.source,
          suggestionId,
        },
      },
    })),
  };
};

export const formatSuggestionChoices = (suggestion: PendingSuggestion) =>
  suggestion.actions.map(
    (action, index) =>
      `${index + 1}. ${action.targetTitle} (${Math.round(action.score * 100)}%) - ${action.reason}`
  );

export const resolveContextualReply = (
  reply: string,
  suggestion: PendingSuggestion
): ContextualReplyResolution => {
  const trimmedReply = reply.trim();
  if (!trimmedReply) {
    return {
      kind: "ignore",
      message: "Reply with `yes`, a number like `1`, or a more specific choice.",
    };
  }

  if (isDecline(trimmedReply)) {
    return {
      kind: "decline",
      message: "Okay. I will leave the ideas alone for now.",
    };
  }

  const ordinal = extractOrdinal(trimmedReply);
  if (ordinal !== null) {
    const action = suggestion.actions[ordinal - 1];
    if (!action) {
      return {
        kind: "clarify",
        message: "That number does not match an available option. Reply with one of the listed choices.",
      };
    }
    return {
      kind: "execute",
      action,
      command: action.command,
      message: `Creating a mission from "${action.targetTitle}".`,
    };
  }

  const referencedAction = findReferencedAction(trimmedReply, suggestion);
  if (referencedAction) {
    return {
      kind: "execute",
      action: referencedAction,
      command: referencedAction.command,
      message: `Creating a mission from "${referencedAction.targetTitle}".`,
    };
  }

  if (isAffirmative(trimmedReply)) {
    if (suggestion.actions.length === 1) {
      const [action] = suggestion.actions;
      return {
        kind: "execute",
        action,
        command: action.command,
        message: `Creating a mission from "${action.targetTitle}".`,
      };
    }

    const [first, second] = suggestion.actions;
    if (first && second && first.score - second.score >= 0.12) {
      return {
        kind: "execute",
        action: first,
        command: first.command,
        message: `The best-ranked option is "${first.targetTitle}", so I am using that.`,
      };
    }

    return {
      kind: "clarify",
      message: "I have a few close options. Reply with `1`, `2`, or `3` so I pick the right one.",
    };
  }

  return {
    kind: "ignore",
    message: "I could not safely map that reply to an action. Reply with `yes`, `1`, `2`, or a specific idea title.",
  };
};
