import type { ChatSuggestionRecord } from "./chatImport";
import type { EmailSuggestionRecord } from "./emailModel";

export type ReviewInboxSourceKind = "email" | "slack" | "chat_import";

export type ReviewInboxActionKind =
  | "todo"
  | "project"
  | "mission_note"
  | "deadline"
  | "contact_update";

export type ReviewInboxItemStatus = "pending" | "accepted" | "dismissed" | "archived";

export type ReviewInboxRecommendation =
  | "create_todo"
  | "create_project"
  | "archive"
  | "review";

export type ReviewInboxItem = {
  id: string;
  sourceKind: ReviewInboxSourceKind;
  sourceSystem: string;
  sourceLabel: string;
  sourceRecordId: string;
  title: string;
  suggestedActionKind: ReviewInboxActionKind;
  confidence: number;
  status: ReviewInboxItemStatus;
  dueAt: string | null;
  receivedAt: string;
  isOverdue: boolean;
  actorLabel: string;
  matchedPersonName: string | null;
  subject: string;
  snippet: string | null;
  reason: string;
  recommendedDecision: ReviewInboxRecommendation;
  recommendationReason: string;
};

const sourceLabelForEmail = (sourceSystem: string) => {
  if (sourceSystem === "gmail") {
    return "Gmail";
  }
  if (sourceSystem === "outlook") {
    return "Outlook Mail";
  }
  return "Email";
};

const sourceLabelForChat = (sourceSystem: string) => {
  if (sourceSystem === "slack") {
    return "Slack";
  }
  if (sourceSystem === "whatsapp") {
    return "WhatsApp";
  }
  if (sourceSystem === "sms") {
    return "SMS";
  }
  if (sourceSystem === "manual") {
    return "Manual chat";
  }
  return "Chat";
};

const isPastDue = (dueAt: string | null, now: Date) => {
  if (!dueAt) {
    return false;
  }

  const dueDate = new Date(dueAt);
  return !Number.isNaN(dueDate.getTime()) && dueDate.getTime() < now.getTime();
};

const hasOpenPendingSignal = (suggestion: EmailSuggestionRecord) =>
  /\b(open|pending|outstanding|unresolved|still waiting|waiting on|waiting for|blocked)\b/i.test(
    [suggestion.title, suggestion.subject, suggestion.summary ?? "", suggestion.reason].join("\n")
  );

const hasOpenPendingTextSignal = (parts: Array<string | null>) =>
  /\b(open|pending|outstanding|unresolved|still waiting|waiting on|waiting for|blocked)\b/i.test(
    parts.filter((part): part is string => Boolean(part)).join("\n")
  );

const recommendationForEmailSuggestion = (
  suggestion: EmailSuggestionRecord,
  now: Date
): {
  recommendedDecision: ReviewInboxRecommendation;
  recommendationReason: string;
} => {
  if (isPastDue(suggestion.dueAt, now) && !hasOpenPendingSignal(suggestion)) {
    return {
      recommendedDecision: "archive",
      recommendationReason:
        "The candidate points to a past date and does not show an open or waiting-on signal.",
    };
  }

  if (suggestion.suggestedEntityKind === "project") {
    return {
      recommendedDecision: "create_project",
      recommendationReason: "The candidate looks project-sized and is still worth operator review.",
    };
  }

  return {
    recommendedDecision: "create_todo",
    recommendationReason: "The candidate looks like actionable follow-up work.",
  };
};

const recommendationForChatSuggestion = (
  suggestion: ChatSuggestionRecord,
  now: Date
): {
  recommendedDecision: ReviewInboxRecommendation;
  recommendationReason: string;
} => {
  if (
    isPastDue(suggestion.dueAt, now) &&
    !hasOpenPendingTextSignal([suggestion.title, suggestion.summary, suggestion.reason])
  ) {
    return {
      recommendedDecision: "archive",
      recommendationReason:
        "The chat candidate points to a past date and does not show an open or waiting-on signal.",
    };
  }

  if (suggestion.suggestedEntityKind === "project") {
    return {
      recommendedDecision: "create_project",
      recommendationReason: "The chat candidate looks project-sized and needs operator review.",
    };
  }

  return {
    recommendedDecision: "create_todo",
    recommendationReason: "The chat candidate looks like actionable follow-up work.",
  };
};

const rankReviewInboxItem = (item: ReviewInboxItem) => {
  const dueAt = item.dueAt ? new Date(item.dueAt).getTime() : Number.POSITIVE_INFINITY;
  const receivedAt = new Date(item.receivedAt).getTime();
  return {
    overdue: item.isOverdue ? 0 : 1,
    dueAt: Number.isNaN(dueAt) ? Number.POSITIVE_INFINITY : dueAt,
    receivedAt: Number.isNaN(receivedAt) ? 0 : -receivedAt,
    confidence: -item.confidence,
  };
};

export const buildReviewInboxFromEmailSuggestions = (
  suggestions: EmailSuggestionRecord[],
  now = new Date()
): ReviewInboxItem[] =>
  suggestions
    .filter((suggestion) => suggestion.status === "pending")
    .map((suggestion) => {
      const recommendation = recommendationForEmailSuggestion(suggestion, now);
      return {
        id: `email:${suggestion.id}`,
        sourceKind: "email" as const,
        sourceSystem: suggestion.sourceSystem,
        sourceLabel: sourceLabelForEmail(suggestion.sourceSystem),
        sourceRecordId: suggestion.id,
        title: suggestion.title,
        suggestedActionKind: suggestion.suggestedEntityKind,
        confidence: suggestion.confidence,
        status: "pending" as const,
        dueAt: suggestion.dueAt,
        receivedAt: suggestion.receivedAt,
        isOverdue: isPastDue(suggestion.dueAt, now),
        actorLabel: suggestion.senderName ?? suggestion.senderEmail ?? "unknown sender",
        matchedPersonName: suggestion.matchedPersonName,
        subject: suggestion.subject,
        snippet: suggestion.summary,
        reason: suggestion.reason,
        ...recommendation,
      };
    })
    .sort((left, right) => {
      const leftRank = rankReviewInboxItem(left);
      const rightRank = rankReviewInboxItem(right);
      return (
        leftRank.overdue - rightRank.overdue ||
        leftRank.dueAt - rightRank.dueAt ||
        leftRank.receivedAt - rightRank.receivedAt ||
        leftRank.confidence - rightRank.confidence
      );
    });

export const sortReviewInboxItems = (items: ReviewInboxItem[]) =>
  [...items].sort((left, right) => {
    const leftRank = rankReviewInboxItem(left);
    const rightRank = rankReviewInboxItem(right);
    return (
      leftRank.overdue - rightRank.overdue ||
      leftRank.dueAt - rightRank.dueAt ||
      leftRank.receivedAt - rightRank.receivedAt ||
      leftRank.confidence - rightRank.confidence
    );
  });

export const buildReviewInboxFromChatSuggestions = (
  suggestions: ChatSuggestionRecord[],
  now = new Date()
): ReviewInboxItem[] =>
  sortReviewInboxItems(
    suggestions
      .filter((suggestion) => suggestion.status === "pending")
      .map((suggestion) => {
        const recommendation = recommendationForChatSuggestion(suggestion, now);
        return {
          id: `chat:${suggestion.id}`,
          sourceKind: "chat_import" as const,
          sourceSystem: suggestion.sourceSystem,
          sourceLabel: sourceLabelForChat(suggestion.sourceSystem),
          sourceRecordId: suggestion.id,
          title: suggestion.title,
          suggestedActionKind: suggestion.suggestedEntityKind,
          confidence: suggestion.confidence,
          status: "pending" as const,
          dueAt: suggestion.dueAt,
          receivedAt: suggestion.sentAt,
          isOverdue: isPastDue(suggestion.dueAt, now),
          actorLabel: suggestion.senderName ?? suggestion.conversationTitle,
          matchedPersonName: null,
          subject: suggestion.conversationTitle,
          snippet: suggestion.summary,
          reason: suggestion.reason,
          ...recommendation,
        };
      })
  );
