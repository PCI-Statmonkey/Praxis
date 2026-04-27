import crypto from "node:crypto";
import type { EmailSuggestionEntityKind } from "./emailModel";

export type EmailSuggestionFingerprintMessage = {
  sourceSystem: string;
  senderEmail?: string | null;
  senderName?: string | null;
  threadRef?: string | null;
};

export type EmailSuggestionFingerprint = {
  title: string;
  suggestedEntityKind: EmailSuggestionEntityKind;
};

export type EmailSuggestionStalenessInput = {
  receivedAt: string;
  dueAt: string | null;
};

export const normalizeEmailSuggestionSubject = (value: string) =>
  value
    .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeFingerprintPart = (value: string | null | undefined) =>
  value
    ?.toLowerCase()
    .replace(/[^a-z0-9@.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim() ?? "";

export const buildEmailSuggestionDuplicateKey = (
  message: EmailSuggestionFingerprintMessage,
  suggestion: EmailSuggestionFingerprint
) =>
  crypto
    .createHash("sha1")
    .update(
      [
        message.sourceSystem,
        normalizeFingerprintPart(message.threadRef),
        normalizeFingerprintPart(message.senderEmail ?? message.senderName),
        normalizeFingerprintPart(suggestion.title),
        suggestion.suggestedEntityKind,
      ].join("|")
    )
    .digest("hex");

export const isStaleEmailSuggestion = (
  suggestion: EmailSuggestionStalenessInput,
  now = new Date()
) => {
  const receivedAt = new Date(suggestion.receivedAt);
  if (Number.isNaN(receivedAt.getTime())) {
    return false;
  }

  const daysOld = Math.floor((now.getTime() - receivedAt.getTime()) / (24 * 60 * 60 * 1000));
  if (daysOld <= 45) {
    return false;
  }

  if (!suggestion.dueAt) {
    return true;
  }

  const dueAt = new Date(suggestion.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    return false;
  }

  return dueAt.getTime() < now.getTime();
};
