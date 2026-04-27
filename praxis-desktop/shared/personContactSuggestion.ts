import type { EmailMessageRecord } from "./emailModel";
import type { PersonRecord } from "./workModel";

export type PersonContactSuggestionField = "email" | "phone" | "billingAddress";

export type PersonContactSuggestion = {
  personId: string;
  personName: string;
  field: PersonContactSuggestionField;
  inferredValue: string;
  messageCount: number;
  lastSeenAt: string;
  latestSubject: string;
  confidence: number;
};

export type PersonContactSuggestionDismissal = {
  personId: string;
  field: PersonContactSuggestionField;
  inferredValue: string;
  dismissedAt: string;
};

export type DismissPersonContactSuggestionInput = {
  personId: string;
  field: PersonContactSuggestionField;
  inferredValue: string;
};

export type DismissPersonContactSuggestionResult = {
  ok: boolean;
  message: string;
};

export type RestorePersonContactSuggestionInput = {
  personId: string;
  field: PersonContactSuggestionField;
  inferredValue: string;
};

export type RestorePersonContactSuggestionResult = {
  ok: boolean;
  message: string;
};

const normalizeEmail = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
};

const normalizePhone = (value: string | null | undefined) => {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return null;
};

const normalizeBillingAddress = (value: string | null | undefined) => {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized && normalized.length >= 12 ? normalized : null;
};

const uniqueValues = (values: Array<string | null>) =>
  [...new Set(values.filter((value): value is string => Boolean(value)))];

const extractPhoneCandidates = (text: string) => {
  const matches = text.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g) ?? [];
  return uniqueValues(matches.map(normalizePhone));
};

const extractBillingAddressCandidates = (text: string) => {
  const candidates: string[] = [];
  const patterns = [
    /\b(?:billing|invoice|mailing)\s+address(?:\s+is)?[:\s]+(.{12,140}?)(?:[.;]|$)/i,
    /\bsend\s+(?:the\s+)?(?:invoice|check|payment)\s+to[:\s]+(.{12,140}?)(?:[.;]|$)/i,
    /\bmail\s+(?:it|payment|invoice)\s+to[:\s]+(.{12,140}?)(?:[.;]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const raw = match?.[1];
    const normalized = normalizeBillingAddress(raw);
    if (!normalized) {
      continue;
    }
    if (!/\d/.test(normalized) || !/\b(?:st|street|ave|avenue|rd|road|blvd|drive|dr|lane|ln|way|suite|ste)\b/i.test(normalized)) {
      continue;
    }
    candidates.push(normalized);
  }

  return uniqueValues(candidates);
};

type GroupedEvidence = {
  value: string;
  messages: EmailMessageRecord[];
};

const latestMessage = (messages: EmailMessageRecord[]) =>
  [...messages].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  )[0] ?? null;

const groupEvidence = (
  messages: EmailMessageRecord[],
  valuesForMessage: (message: EmailMessageRecord) => string[]
) => {
  const groups = new Map<string, EmailMessageRecord[]>();

  for (const message of messages) {
    for (const value of valuesForMessage(message)) {
      groups.set(value, [...(groups.get(value) ?? []), message]);
    }
  }

  return [...groups.entries()].map(
    ([value, groupedMessages]): GroupedEvidence => ({
      value,
      messages: groupedMessages,
    })
  );
};

const buildSuggestion = (
  person: PersonRecord,
  field: PersonContactSuggestionField,
  evidence: GroupedEvidence,
  confidenceBase: number,
  confidencePerMessage: number
): PersonContactSuggestion | null => {
  const latest = latestMessage(evidence.messages);
  if (!latest) {
    return null;
  }

  return {
    personId: person.id,
    personName: person.name,
    field,
    inferredValue: evidence.value,
    messageCount: evidence.messages.length,
    lastSeenAt: latest.receivedAt,
    latestSubject: latest.subject,
    confidence: Math.min(confidenceBase + evidence.messages.length * confidencePerMessage, 0.97),
  };
};

export const buildPersonContactSuggestions = (
  people: PersonRecord[],
  messages: EmailMessageRecord[]
): PersonContactSuggestion[] => {
  const suggestions: PersonContactSuggestion[] = [];

  for (const person of people) {
    const matchedMessages = messages.filter((message) => message.matchedPersonId === person.id);
    if (matchedMessages.length === 0) {
      continue;
    }

    if (!person.email) {
      const emailGroups = groupEvidence(matchedMessages, (message) =>
        uniqueValues([normalizeEmail(message.senderEmail)])
      );
      if (emailGroups.length === 1) {
        const suggestion = buildSuggestion(person, "email", emailGroups[0], 0.78, 0.06);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    if (!person.phone) {
      const phoneGroups = groupEvidence(matchedMessages, (message) =>
        extractPhoneCandidates([message.summary ?? "", message.subject].join(" "))
      ).sort((a, b) => b.messages.length - a.messages.length || a.value.localeCompare(b.value));
      const topPhone = phoneGroups[0];
      if (
        topPhone &&
        topPhone.messages.length >= 1 &&
        (!phoneGroups[1] || phoneGroups[0].messages.length > phoneGroups[1].messages.length)
      ) {
        const suggestion = buildSuggestion(person, "phone", topPhone, 0.66, 0.08);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    if (!person.billingAddress) {
      const addressGroups = groupEvidence(matchedMessages, (message) =>
        extractBillingAddressCandidates([message.summary ?? "", message.subject].join(" "))
      ).sort((a, b) => b.messages.length - a.messages.length || a.value.localeCompare(b.value));
      const topAddress = addressGroups[0];
      if (
        topAddress &&
        topAddress.messages.length >= 1 &&
        (!addressGroups[1] || topAddress.messages.length > addressGroups[1].messages.length)
      ) {
        const suggestion = buildSuggestion(person, "billingAddress", topAddress, 0.7, 0.1);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
  }

  return suggestions.sort(
    (a, b) =>
      new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime() ||
      a.personName.localeCompare(b.personName) ||
      a.field.localeCompare(b.field)
  );
};
