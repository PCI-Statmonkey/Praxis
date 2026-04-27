import type {
  ChatImportMessageRecord,
  ChatImportRecord,
  ChatSuggestionEntityKind,
} from "./chatImport";
import { parseEmailSuggestionDueDate } from "./emailSuggestionExtraction";

export type ExtractedChatSuggestion = {
  title: string;
  suggestedEntityKind: ChatSuggestionEntityKind;
  reason: string;
  dueAt: string | null;
  senderName: string | null;
  subject: string;
  summary: string | null;
  sentAt: string;
  confidence: number;
};

const ACTION_PATTERNS = [
  /\bplease\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bneed (?:you|us|to)\b/i,
  /\bfollow up\b/i,
  /\bnext step\b/i,
  /\bnext action\b/i,
  /\breply\b/i,
  /\brespond\b/i,
  /\bsend\b/i,
  /\bcall\b/i,
  /\breview\b/i,
  /\bconfirm\b/i,
  /\bschedule\b/i,
  /\bbook\b/i,
  /\bapprove\b/i,
  /\bsubmit\b/i,
  /\bwaiting\s+(?:on|for)\b/i,
  /\bblocked\s+(?:on|by)\b/i,
];

const PROJECT_PATTERNS = [
  /\bproject\b/i,
  /\bmission\b/i,
  /\bproposal\b/i,
  /\bscope\b/i,
  /\bcontract\b/i,
  /\bestimate\b/i,
  /\bpermit\b/i,
  /\bimplementation\b/i,
  /\bintegration\b/i,
  /\brollout\b/i,
  /\blaunch\b/i,
  /\bphase\b/i,
];

const DEADLINE_PATTERNS = [
  /\btoday\b/i,
  /\btonight\b/i,
  /\btomorrow\b/i,
  /\bthis week\b/i,
  /\bnext week\b/i,
  /\bdue\b/i,
  /\bdeadline\b/i,
  /\bby\b/i,
  /\bbefore\b/i,
  /\beod\b/i,
  /\bend of day\b/i,
  /\bfriday\b/i,
  /\bmonday\b/i,
  /\btuesday\b/i,
  /\bwednesday\b/i,
  /\bthursday\b/i,
  /\bsaturday\b/i,
  /\bsunday\b/i,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i,
];

const IGNORE_PATTERNS = [
  /\bthanks\b/i,
  /\bthank you\b/i,
  /\bfyi\b/i,
  /\blol\b/i,
  /\bnewsletter\b/i,
  /\bverification code\b/i,
  /\bpassword\b/i,
];

const countPatternMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((count, pattern) => (pattern.test(text) ? count + 1 : count), 0);

const truncate = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}...`;

const firstLine = (value: string) =>
  value
    .split(/(?:[.!?]\s+|\n+)/)
    .map((candidate) => candidate.trim().replace(/[.!?]+$/g, ""))
    .find(Boolean) ?? "";

const cleanTitle = (
  conversationTitle: string,
  text: string,
  suggestedEntityKind: ChatSuggestionEntityKind
) => {
  const directRequest = firstLine(text).match(
    /\b(?:please|can you|could you|would you|need you to)\s+([^.!?\n]+)$/i
  )?.[1];
  const candidate = directRequest ?? firstLine(text);
  if (candidate && suggestedEntityKind === "todo") {
    return truncate(candidate.charAt(0).toUpperCase() + candidate.slice(1), 96);
  }
  return truncate(`Follow up: ${conversationTitle}`, 96);
};

export const extractChatFollowUpSuggestion = (
  chatImport: Pick<ChatImportRecord, "conversationTitle">,
  message: Pick<ChatImportMessageRecord, "senderName" | "sentAt" | "summary" | "snippet">,
  now = new Date()
): ExtractedChatSuggestion | null => {
  const summary = message.summary ?? message.snippet;
  if (!summary) {
    return null;
  }

  const text = summary.trim();
  if (!text) {
    return null;
  }

  const normalized = text.toLowerCase();
  const actionHits = countPatternMatches(text, ACTION_PATTERNS);
  const projectHits = countPatternMatches(text, PROJECT_PATTERNS);
  const deadlineHits = countPatternMatches(text, DEADLINE_PATTERNS);
  const ignoreHits = countPatternMatches(text, IGNORE_PATTERNS);

  if (ignoreHits > 0 && actionHits === 0 && projectHits === 0 && deadlineHits === 0) {
    return null;
  }
  if (normalized.startsWith("thanks") || normalized.startsWith("thank you") || normalized === "ok") {
    return null;
  }
  if (actionHits === 0 && projectHits === 0 && deadlineHits === 0) {
    return null;
  }

  const suggestedEntityKind: ChatSuggestionEntityKind =
    projectHits >= 2 || (projectHits >= 1 && (deadlineHits > 0 || actionHits > 0))
      ? "project"
      : "todo";
  const sentAtDate = new Date(message.sentAt);
  const dueAt = parseEmailSuggestionDueDate(
    text,
    Number.isNaN(sentAtDate.getTime()) ? now : sentAtDate
  );
  const confidence = Math.min(
    0.42 + actionHits * 0.14 + projectHits * 0.1 + deadlineHits * 0.1 - ignoreHits * 0.12,
    0.92
  );

  if (confidence < 0.62) {
    return null;
  }

  const reasonParts = [
    `Chat message in ${chatImport.conversationTitle} looks like ${
      suggestedEntityKind === "project" ? "project-sized work" : "a follow-up task"
    }.`,
    actionHits > 0 ? "It includes action-oriented language." : null,
    projectHits > 0 ? "It includes project or scope language." : null,
    deadlineHits > 0 ? "It includes timing or deadline language." : null,
  ].filter((part): part is string => Boolean(part));

  return {
    title: cleanTitle(chatImport.conversationTitle, text, suggestedEntityKind),
    suggestedEntityKind,
    reason: reasonParts.join(" "),
    dueAt,
    senderName: message.senderName,
    subject: chatImport.conversationTitle,
    summary,
    sentAt: message.sentAt,
    confidence,
  };
};
