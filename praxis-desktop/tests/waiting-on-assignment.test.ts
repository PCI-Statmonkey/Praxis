import { strict as assert } from "node:assert";
import { resolveAssistantContextActions } from "../shared/assistantContextResolver";
import {
  analyzeWaitingOnAssignment,
  isWaitingOnAssignmentRequest,
} from "../shared/waitingOnAssignment";
import type { WorkSnapshot } from "../shared/workModel";

const timestamp = "2026-04-25T12:00:00.000Z";

const baseSnapshot: WorkSnapshot = {
  missions: [],
  projects: [],
  todos: [
    {
      id: "todo-1",
      projectId: null,
      title: "Send invoice packet",
      status: "active",
      priority: "normal",
      dueAt: null,
      moneyRelated: true,
      quickAction: true,
      estimatedMinutes: 15,
      waitingOnPersonId: null,
      sourceKind: null,
      sourceRef: null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "todo-2",
      projectId: null,
      title: "Draft rules outline",
      status: "active",
      priority: "normal",
      dueAt: null,
      moneyRelated: false,
      quickAction: false,
      estimatedMinutes: null,
      waitingOnPersonId: null,
      sourceKind: null,
      sourceRef: null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  deadlines: [],
  appointments: [],
  people: [
    {
      id: "person-1",
      slug: "max",
      name: "Max Rivera",
      aliases: ["Max"],
      roleSummary: null,
      email: null,
      phone: null,
      billingAddress: null,
      notes: null,
      markdownPath: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  personWorkLinks: [],
  memoryDocuments: [],
};

assert.equal(isWaitingOnAssignmentRequest("waiting on Max for the invoice packet"), true);
assert.equal(isWaitingOnAssignmentRequest("what am I waiting on from Max?"), false);
assert.equal(isWaitingOnAssignmentRequest("Max sent the invoice packet"), false);

const direct = analyzeWaitingOnAssignment("waiting on Max for the invoice packet", baseSnapshot);
assert.equal(direct.ok, true, direct.ok ? undefined : direct.reason);
if (direct.ok) {
  assert.equal(direct.todo.id, "todo-1");
  assert.equal(direct.person.id, "person-1");
}

const ambiguousSnapshot: WorkSnapshot = {
  ...baseSnapshot,
  todos: [
    ...baseSnapshot.todos,
    {
      ...baseSnapshot.todos[0],
      id: "todo-3",
      title: "Review invoice packet",
    },
  ],
};

const ambiguous = analyzeWaitingOnAssignment(
  "waiting on Max for the invoice packet",
  ambiguousSnapshot
);
assert.equal(ambiguous.ok, false);
assert.equal(ambiguous.ok ? undefined : Boolean(ambiguous.confirmation), true);
if (!ambiguous.ok && ambiguous.confirmation) {
  assert.deepEqual(
    ambiguous.confirmation.actions.map((action) => action.command),
    ["assign_waiting_on", "assign_waiting_on"]
  );
  assert.equal(ambiguous.confirmation.actions[0].personId, "person-1");

  const resolved = resolveAssistantContextActions({
    surface: "work_update_confirmation",
    text: "the first one",
    actions: ambiguous.confirmation.actions,
  });
  assert.equal(resolved.ok, true, resolved.ok ? undefined : resolved.reason);
  if (resolved.ok) {
    assert.equal(resolved.action.command, "assign_waiting_on");
    assert.equal(resolved.action.personId, "person-1");
  }
}

const missingPerson = analyzeWaitingOnAssignment("waiting on Avery for the invoice packet", baseSnapshot);
assert.equal(missingPerson.ok, false);
assert.match(missingPerson.ok ? "" : missingPerson.reason, /person/i);

console.log("waiting-on assignment tests passed");
