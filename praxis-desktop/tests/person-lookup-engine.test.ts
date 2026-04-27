import { strict as assert } from "node:assert";
import { lookupPersonInSnapshot } from "../shared/personLookupEngine";
import type { EmailMessageRecord } from "../shared/emailModel";
import type { PersonRecord, WorkSnapshot } from "../shared/workModel";

const timestamp = "2026-04-24T00:00:00.000Z";

const person = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: "person-1",
  slug: "max",
  name: "Max Rivera",
  aliases: ["Max"],
  roleSummary: "Client lead",
  email: null,
  phone: null,
  billingAddress: null,
  notes: "Prefers short calls.",
  markdownPath: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const snapshot = (people: PersonRecord[] = [person()]): WorkSnapshot => ({
  missions: [
    {
      id: "mission-1",
      slug: "launch",
      title: "Launch Mission",
      summary: null,
      status: "active",
      dueAt: null,
      markdownPath: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  projects: [
    {
      id: "project-1",
      missionId: "mission-1",
      slug: "sourcebook",
      title: "Sourcebook Project",
      summary: null,
      status: "active",
      dueAt: null,
      markdownPath: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  todos: [],
  deadlines: [],
  appointments: [],
  people,
  personWorkLinks: [
    {
      id: "link-1",
      personId: "person-1",
      entityKind: "project",
      entityId: "project-1",
      relationship: "approver",
      sourceKind: "manual",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "link-2",
      personId: "person-1",
      entityKind: "project",
      entityId: "project-1",
      relationship: "approver",
      sourceKind: "manual",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "link-3",
      personId: "person-1",
      entityKind: "mission",
      entityId: "mission-1",
      relationship: "stakeholder",
      sourceKind: "manual",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  memoryDocuments: [],
});

const message = (overrides: Partial<EmailMessageRecord> = {}): EmailMessageRecord => ({
  id: "message-1",
  connectionId: null,
  sourceSystem: "gmail",
  externalId: "external-1",
  threadRef: "thread-1",
  subject: "Contact details",
  senderName: "Max Rivera",
  senderEmail: "max@example.com",
  matchedPersonId: "person-1",
  matchedPersonName: "Max Rivera",
  receivedAt: "2026-04-24T12:00:00.000Z",
  summary: "Call me at 555-123-4567. Billing address is 123 Main St, Suite 4.",
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const emailContext = {
  messages: [message()],
  contactSuggestionDismissals: [],
};

const aliasLookup = lookupPersonInSnapshot({ text: "what's Max's email?" }, snapshot(), emailContext);
assert.equal(aliasLookup.ok, true);
assert.equal(aliasLookup.ok ? aliasLookup.field : null, "email");
assert.equal(aliasLookup.ok ? aliasLookup.value : null, "max@example.com");
assert.match(aliasLookup.ok ? aliasLookup.message : "", /not saved/);

const savedPreferred = lookupPersonInSnapshot(
  { text: "what is Max's email?" },
  snapshot([person({ email: "saved@example.com" })]),
  emailContext
);
assert.equal(savedPreferred.ok, true);
assert.equal(savedPreferred.ok ? savedPreferred.value : null, "saved@example.com");
assert.doesNotMatch(savedPreferred.ok ? savedPreferred.message : "", /not saved/);

const phoneLookup = lookupPersonInSnapshot({ text: "what phone do I have for Max?" }, snapshot(), emailContext);
assert.equal(phoneLookup.ok, true);
assert.equal(phoneLookup.ok ? phoneLookup.field : null, "phone");
assert.equal(phoneLookup.ok ? phoneLookup.value : null, "(555) 123-4567");

const dismissedPhone = lookupPersonInSnapshot(
  { text: "what phone do I have for Max?" },
  snapshot(),
  {
    messages: [message()],
    contactSuggestionDismissals: [
      {
        personId: "person-1",
        field: "phone",
        inferredValue: "(555) 123-4567",
        dismissedAt: "2026-04-24T13:00:00.000Z",
      },
    ],
  }
);
assert.equal(dismissedPhone.ok, false);
assert.match(dismissedPhone.ok ? "" : dismissedPhone.reason, /does not have a saved phone/);

const billingLookup = lookupPersonInSnapshot({ text: "billing address for Max" }, snapshot(), emailContext);
assert.equal(billingLookup.ok, true);
assert.equal(billingLookup.ok ? billingLookup.field : null, "billingAddress");
assert.equal(billingLookup.ok ? billingLookup.value : null, "123 Main St, Suite 4");

const contactLookup = lookupPersonInSnapshot(
  { text: "contact info for Max" },
  snapshot([person({ email: "saved@example.com" })]),
  emailContext
);
assert.equal(contactLookup.ok, true);
assert.match(contactLookup.ok ? contactLookup.value : "", /email: saved@example.com/);
assert.match(contactLookup.ok ? contactLookup.value : "", /phone \(inferred\): \(555\) 123-4567/);

const relationshipLookup = lookupPersonInSnapshot(
  { text: "which projects is Max tied to?" },
  snapshot(),
  emailContext
);
assert.equal(relationshipLookup.ok, true);
assert.match(relationshipLookup.ok ? relationshipLookup.value : "", /projects: Sourcebook Project \(approver\)/);
assert.match(relationshipLookup.ok ? relationshipLookup.value : "", /missions: Launch Mission \(stakeholder\)/);
assert.equal((relationshipLookup.ok ? relationshipLookup.value : "").match(/Sourcebook Project/g)?.length, 1);

const profileLookup = lookupPersonInSnapshot({ text: "tell me about Max" }, snapshot(), emailContext);
assert.equal(profileLookup.ok, true);
assert.match(profileLookup.ok ? profileLookup.value : "", /role: Client lead/);
assert.match(profileLookup.ok ? profileLookup.value : "", /notes: Prefers short calls/);

const ambiguousLookup = lookupPersonInSnapshot(
  { text: "what is Sam's email?" },
  snapshot([
    person({ id: "person-1", name: "Sam Lee", aliases: [], slug: "sam-lee" }),
    person({ id: "person-2", name: "Sam Ray", aliases: [], slug: "sam-ray" }),
  ]),
  emailContext
);
assert.equal(ambiguousLookup.ok, false);
assert.match(ambiguousLookup.ok ? "" : ambiguousLookup.reason, /more than one/);

const noMatch = lookupPersonInSnapshot({ text: "what is Jordan's email?" }, snapshot(), emailContext);
assert.equal(noMatch.ok, false);
assert.match(noMatch.ok ? "" : noMatch.reason, /could not match/);

console.log("person lookup engine tests passed");
