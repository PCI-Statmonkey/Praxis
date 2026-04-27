import { strict as assert } from "node:assert";
import { matchPersonForSender } from "../electron/personIdentity";
import type { PersonRecord } from "../shared/workModel";

const timestamp = "2026-04-25T12:00:00.000Z";

const person = (overrides: Partial<PersonRecord> = {}): PersonRecord => ({
  id: "person-1",
  slug: "max-rivera",
  name: "Max Rivera",
  aliases: ["Max"],
  roleSummary: null,
  email: "max@example.com",
  phone: null,
  billingAddress: null,
  notes: null,
  markdownPath: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

assert.equal(
  matchPersonForSender("M. Rivera", "MAX@example.com", [person()])?.id,
  "person-1"
);

assert.equal(
  matchPersonForSender("Max", "unmatched@example.com", [person({ email: null })])?.id,
  "person-1"
);

assert.equal(
  matchPersonForSender("Operations", "shared@example.com", [
    person({ id: "person-1", email: "shared@example.com" }),
    person({ id: "person-2", slug: "other", name: "Other Person", aliases: [], email: "shared@example.com" }),
  ]),
  null
);

console.log("person identity tests passed");
