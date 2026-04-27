import type { EmailMessageRecord } from "./emailModel";
import {
  buildPersonContactSuggestions,
  type PersonContactSuggestion,
  type PersonContactSuggestionDismissal,
} from "./personContactSuggestion";
import type {
  PersonLookupField,
  PersonLookupRequest,
  PersonLookupResult,
} from "./personLookup";
import type { PersonRecord, WorkSnapshot } from "./workModel";

export type PersonLookupEmailContext = {
  messages: EmailMessageRecord[];
  contactSuggestionDismissals: PersonContactSuggestionDismissal[];
};

const emptyEmailContext: PersonLookupEmailContext = {
  messages: [],
  contactSuggestionDismissals: [],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value: string) => normalize(value).split(" ").filter((word) => word.length >= 2);

const normalizeEmailAddress = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
};

const personCandidates = (person: PersonRecord) => [person.name, ...person.aliases];

const matchPersonForSender = (
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

  const normalizedSenderName = normalize(senderName ?? "");
  if (!normalizedSenderName) {
    return null;
  }

  const nameMatches = people.filter((person) =>
    personCandidates(person).some(
      (candidate) => normalize(candidate) === normalizedSenderName
    )
  );

  return nameMatches.length === 1 ? nameMatches[0] : null;
};

const findRecentSenderEmailForPerson = (
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

const requestedField = (text: string): PersonLookupField => {
  if (/\b(email|e mail|mail address)\b/i.test(text)) {
    return "email";
  }
  if (/\b(phone|cell|mobile|number|call)\b/i.test(text)) {
    return "phone";
  }
  if (/\b(billing address|bill address|invoice address|mailing address|address)\b/i.test(text)) {
    return "billingAddress";
  }
  if (/\b(contact|reach|get ahold|get hold)\b/i.test(text)) {
    return "contact";
  }
  if (/\b(project|projects|mission|missions|involved|working with|part of|relationship|relationships|tied to|connected to)\b/i.test(text)) {
    return "relationships";
  }
  return "profile";
};

const scorePerson = (text: string, person: PersonRecord) => {
  const normalizedText = normalize(text);
  const candidates = [person.name, ...person.aliases];
  const exactMatch = candidates.find((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return normalizedCandidate && normalizedText.includes(normalizedCandidate);
  });
  if (exactMatch) {
    return 100;
  }

  const nameWords = candidates.flatMap(words);
  const matched = nameWords.filter((word) => normalizedText.includes(word)).length;
  if (matched === 0) {
    return 0;
  }
  return Math.round((matched / nameWords.length) * 85);
};

const findPerson = (text: string, people: PersonRecord[]) => {
  const scored = people
    .map((person) => ({
      person,
      score: scorePerson(text, person),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name));

  if (scored.length === 0) {
    return null;
  }

  if (scored[1] && scored[1].score === scored[0].score) {
    return "ambiguous" as const;
  }

  return scored[0].person;
};

const contactSummary = (person: PersonRecord) => {
  const parts = [
    person.email ? `email: ${person.email}` : null,
    person.phone ? `phone: ${person.phone}` : null,
    person.billingAddress ? `billing address: ${person.billingAddress}` : null,
  ].filter((part): part is string => Boolean(part));
  return parts.join("; ");
};

const relationshipSummary = (person: PersonRecord, snapshot: WorkSnapshot) => {
  const projectById = new Map(snapshot.projects.map((project) => [project.id, project.title]));
  const missionById = new Map(snapshot.missions.map((mission) => [mission.id, mission.title]));
  const projectParts = snapshot.personWorkLinks
    .filter((link) => link.personId === person.id && link.entityKind === "project")
    .map((link) => {
      const title = projectById.get(link.entityId);
      return title ? `${title} (${link.relationship})` : null;
    })
    .filter((part): part is string => Boolean(part));
  const missionParts = snapshot.personWorkLinks
    .filter((link) => link.personId === person.id && link.entityKind === "mission")
    .map((link) => {
      const title = missionById.get(link.entityId);
      return title ? `${title} (${link.relationship})` : null;
    })
    .filter((part): part is string => Boolean(part));

  const parts = [
    projectParts.length > 0 ? `projects: ${[...new Set(projectParts)].join(", ")}` : null,
    missionParts.length > 0 ? `missions: ${[...new Set(missionParts)].join(", ")}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.join("; ");
};

const activeContactSuggestions = (
  people: PersonRecord[],
  emailContext: PersonLookupEmailContext
) => {
  const allSuggestions = buildPersonContactSuggestions(people, emailContext.messages);
  return allSuggestions.filter(
    (suggestion) =>
      !emailContext.contactSuggestionDismissals.some(
        (dismissal) =>
          dismissal.personId === suggestion.personId &&
          dismissal.field === suggestion.field &&
          dismissal.inferredValue.toLowerCase() === suggestion.inferredValue.toLowerCase()
      )
  );
};

const suggestionForField = (
  person: PersonRecord,
  field: Extract<PersonLookupField, "email" | "phone" | "billingAddress">,
  suggestions: PersonContactSuggestion[]
) =>
  suggestions.find(
    (suggestion) => suggestion.personId === person.id && suggestion.field === field
  ) ?? null;

const inferredFieldLabel = (field: "email" | "phone" | "billingAddress") => {
  if (field === "billingAddress") {
    return "billing address";
  }
  return field;
};

const fieldValue = (
  person: PersonRecord,
  field: Extract<PersonLookupField, "email" | "phone" | "billingAddress">,
  suggestions: PersonContactSuggestion[],
  recentMessages: EmailMessageRecord[]
) => {
  if (field === "email") {
    return {
      value: person.email ?? findRecentSenderEmailForPerson(person, recentMessages),
      inferred: !person.email,
    };
  }

  if (field === "phone") {
    if (person.phone) {
      return { value: person.phone, inferred: false };
    }
    const suggestion = suggestionForField(person, "phone", suggestions);
    return suggestion ? { value: suggestion.inferredValue, inferred: true } : { value: null, inferred: false };
  }

  if (person.billingAddress) {
    return { value: person.billingAddress, inferred: false };
  }
  const suggestion = suggestionForField(person, "billingAddress", suggestions);
  return suggestion ? { value: suggestion.inferredValue, inferred: true } : { value: null, inferred: false };
};

const valueForField = (
  person: PersonRecord,
  field: PersonLookupField,
  snapshot: WorkSnapshot,
  suggestions: PersonContactSuggestion[],
  recentMessages: EmailMessageRecord[]
) => {
  if (field === "email") {
    return fieldValue(person, "email", suggestions, recentMessages);
  }
  if (field === "phone") {
    return fieldValue(person, "phone", suggestions, recentMessages);
  }
  if (field === "billingAddress") {
    return fieldValue(person, "billingAddress", suggestions, recentMessages);
  }
  if (field === "contact") {
    const email = person.email
      ? `email: ${person.email}`
      : fieldValue(person, "email", suggestions, recentMessages).value
        ? `email (inferred): ${fieldValue(person, "email", suggestions, recentMessages).value}`
        : null;
    const phone = person.phone
      ? `phone: ${person.phone}`
      : fieldValue(person, "phone", suggestions, recentMessages).value
        ? `phone (inferred): ${fieldValue(person, "phone", suggestions, recentMessages).value}`
        : null;
    const billingAddress = person.billingAddress
      ? `billing address: ${person.billingAddress}`
      : fieldValue(person, "billingAddress", suggestions, recentMessages).value
        ? `billing address (inferred): ${fieldValue(person, "billingAddress", suggestions, recentMessages).value}`
        : null;
    const value = [email, phone, billingAddress].filter((part): part is string => Boolean(part)).join("; ");
    return { value: value || null, inferred: !person.email && !person.phone && !person.billingAddress };
  }
  if (field === "relationships") {
    return { value: relationshipSummary(person, snapshot) || null, inferred: false };
  }
  const profileValue = [
    person.roleSummary ? `role: ${person.roleSummary}` : null,
    contactSummary(person) || null,
    !person.email ? `email (inferred): ${fieldValue(person, "email", suggestions, recentMessages).value}` : null,
    !person.phone ? `phone (inferred): ${fieldValue(person, "phone", suggestions, recentMessages).value}` : null,
    !person.billingAddress
      ? `billing address (inferred): ${fieldValue(person, "billingAddress", suggestions, recentMessages).value}`
      : null,
    relationshipSummary(person, snapshot) || null,
    person.notes ? `notes: ${person.notes}` : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join("; ");
  return { value: profileValue || null, inferred: false };
};

const fieldLabel = (field: PersonLookupField) => {
  if (field === "billingAddress") {
    return "billing address";
  }
  if (field === "relationships") {
    return "relationships";
  }
  return field;
};

export const lookupPersonInSnapshot = (
  request: PersonLookupRequest,
  snapshot: WorkSnapshot,
  emailContext: PersonLookupEmailContext = emptyEmailContext
): PersonLookupResult => {
  const text = request.text.trim();
  if (!text) {
    return {
      ok: false,
      reason: "Ask for a person record first.",
    };
  }

  const person = findPerson(text, snapshot.people);
  if (!person) {
    return {
      ok: false,
      reason: "I could not match that to a saved person.",
    };
  }
  if (person === "ambiguous") {
    return {
      ok: false,
      reason: "I found more than one possible person. Use the full name.",
    };
  }

  const suggestions = activeContactSuggestions(snapshot.people, emailContext);
  const field = requestedField(text);
  const result = valueForField(person, field, snapshot, suggestions, emailContext.messages);
  if (!result.value) {
    return {
      ok: false,
      reason: `${person.name} does not have a saved ${fieldLabel(field)} yet.`,
    };
  }

  if (
    result.inferred &&
    (field === "email" || field === "phone" || field === "billingAddress")
  ) {
    return {
      ok: true,
      personId: person.id,
      personName: person.name,
      field,
      value: result.value,
      message: `${person.name}'s ${inferredFieldLabel(field)} from recent synced mail: ${result.value}. It is not saved on the person record yet.`,
    };
  }

  return {
    ok: true,
    personId: person.id,
    personName: person.name,
    field,
    value: result.value,
    message: `${person.name}'s ${fieldLabel(field)}: ${result.value}`,
  };
};
