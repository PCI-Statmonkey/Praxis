import { strict as assert } from "node:assert";
import { buildPersonContactSuggestions } from "../shared/personContactSuggestion";
import type { EmailMessageRecord } from "../shared/emailModel";
import type { PersonRecord } from "../shared/workModel";

const person = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: "person-1",
  slug: "max",
  name: "Max",
  aliases: [],
  roleSummary: null,
  email: null,
  phone: null,
  billingAddress: null,
  notes: null,
  markdownPath: null,
  createdAt: "2026-04-24T00:00:00.000Z",
  updatedAt: "2026-04-24T00:00:00.000Z",
  ...overrides,
});

const message = (overrides: Partial<EmailMessageRecord> = {}): EmailMessageRecord => ({
  id: "message-1",
  connectionId: null,
  sourceSystem: "gmail",
  externalId: "external-1",
  threadRef: "thread-1",
  subject: "Contact details",
  senderName: "Max",
  senderEmail: "max@example.com",
  matchedPersonId: "person-1",
  matchedPersonName: "Max",
  receivedAt: "2026-04-24T12:00:00.000Z",
  summary: "Call me at (555) 123-4567. Billing address is 123 Main St, Suite 4.",
  createdAt: "2026-04-24T12:00:00.000Z",
  updatedAt: "2026-04-24T12:00:00.000Z",
  ...overrides,
});

const suggestions = buildPersonContactSuggestions([person()], [message()]);
assert.equal(suggestions.some((suggestion) => suggestion.field === "email"), true);
assert.equal(
  suggestions.find((suggestion) => suggestion.field === "phone")?.inferredValue,
  "(555) 123-4567"
);
assert.equal(
  suggestions.find((suggestion) => suggestion.field === "billingAddress")?.inferredValue,
  "123 Main St, Suite 4"
);

const savedContactSuggestions = buildPersonContactSuggestions(
  [
    person({
      email: "saved@example.com",
      phone: "(555) 000-0000",
      billingAddress: "999 Saved St",
    }),
  ],
  [message()]
);
assert.equal(savedContactSuggestions.length, 0);

const ambiguousEmails = buildPersonContactSuggestions(
  [person()],
  [
    message({ id: "message-1", senderEmail: "max@example.com" }),
    message({ id: "message-2", senderEmail: "other@example.com" }),
  ]
);
assert.equal(ambiguousEmails.some((suggestion) => suggestion.field === "email"), false);

const ambiguousPhones = buildPersonContactSuggestions(
  [person()],
  [
    message({ id: "message-1", summary: "Call me at 555-111-1111." }),
    message({ id: "message-2", summary: "Call me at 555-222-2222." }),
  ]
);
assert.equal(ambiguousPhones.some((suggestion) => suggestion.field === "phone"), false);

const unmatched = buildPersonContactSuggestions(
  [person()],
  [message({ matchedPersonId: null, matchedPersonName: null })]
);
assert.equal(unmatched.length, 0);

const ordered = buildPersonContactSuggestions(
  [
    person({ id: "person-1", name: "Max" }),
    person({ id: "person-2", name: "Anna", slug: "anna" }),
  ],
  [
    message({ id: "old", matchedPersonId: "person-1", matchedPersonName: "Max", receivedAt: "2026-04-24T10:00:00.000Z" }),
    message({
      id: "new",
      matchedPersonId: "person-2",
      matchedPersonName: "Anna",
      senderName: "Anna",
      senderEmail: "anna@example.com",
      receivedAt: "2026-04-24T13:00:00.000Z",
    }),
  ]
);
assert.equal(ordered[0].personName, "Anna");
assert.equal(
  buildPersonContactSuggestions([person()], [message(), message({ id: "message-2" })]).find(
    (suggestion) => suggestion.field === "email"
  )?.confidence,
  0.9
);

console.log("person contact suggestion tests passed");
