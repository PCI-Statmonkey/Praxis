import type { EmailMessageRecord } from "../shared/emailModel";
import type { PersonRecord } from "../shared/workModel";

const normalizeText = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const normalizeEmailAddress = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
};

const personCandidates = (person: PersonRecord) => [person.name, ...person.aliases];

export const matchPersonForSender = (
  senderName: string | null | undefined,
  senderEmail: string | null | undefined,
  people: PersonRecord[]
) => {
  const normalizedSenderEmail = normalizeEmailAddress(senderEmail);
  if (normalizedSenderEmail) {
    const emailMatches = people.filter(
      (person) => normalizeEmailAddress(person.email) === normalizedSenderEmail
    );
    if (emailMatches.length === 1) {
      return emailMatches[0];
    }
  }

  const normalizedSenderName = normalizeText(senderName);
  if (!normalizedSenderName) {
    return null;
  }

  const nameMatches = people.filter((person) =>
    personCandidates(person).some(
      (candidate) => normalizeText(candidate) === normalizedSenderName
    )
  );

  return nameMatches.length === 1 ? nameMatches[0] : null;
};

export const findRecentSenderEmailForPerson = (
  person: PersonRecord,
  messages: EmailMessageRecord[]
) => {
  const seen = new Set<string>();
  for (const message of messages) {
    const normalizedSenderEmail = normalizeEmailAddress(message.senderEmail);
    if (!normalizedSenderEmail || seen.has(normalizedSenderEmail)) {
      continue;
    }
    seen.add(normalizedSenderEmail);

    const matchedPerson = matchPersonForSender(
      message.senderName,
      message.senderEmail,
      [person]
    );
    if (matchedPerson) {
      return normalizedSenderEmail;
    }
  }

  return null;
};
