import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AssistantContextAction } from "../shared/assistantContext";
import { resolveAssistantContextActions } from "../shared/assistantContextResolver";
import { buildWorkItemActions, buildWorkLookupActions } from "../shared/workLookupContext";
import type { WorkLookupResult } from "../shared/workLookup";
import {
  ENGINEERING_PROJECT_TEMPLATE,
  ENGINEERING_PROJECT_TEMPLATE_ID,
  ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH,
  PROJECT_TASK_TEMPLATE_SOURCE_KIND,
  buildProjectTaskTemplateTodos,
  getProjectTaskTemplateSeed,
  parseProjectTaskTemplateMarkdown,
  type WorkSnapshot,
} from "../shared/workModel";

const timestamp = "2026-04-25T12:00:00.000Z";
const engineeringTemplatePath = path.resolve(
  process.cwd(),
  "..",
  "memory",
  ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH
);
assert.equal(existsSync(engineeringTemplatePath), true);
const engineeringTemplateFromMarkdown = parseProjectTaskTemplateMarkdown(
  readFileSync(engineeringTemplatePath, "utf8"),
  ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH
);

const engineeringTemplateTodos = buildProjectTaskTemplateTodos(
  "project-engineering",
  engineeringTemplateFromMarkdown
);

assert.equal(ENGINEERING_PROJECT_TEMPLATE.source, "built_in");
assert.equal(ENGINEERING_PROJECT_TEMPLATE.markdownPath, ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH);
assert.equal(ENGINEERING_PROJECT_TEMPLATE.slug, ENGINEERING_PROJECT_TEMPLATE_ID);
assert.deepEqual(getProjectTaskTemplateSeed("none"), null);
assert.equal(
  getProjectTaskTemplateSeed(ENGINEERING_PROJECT_TEMPLATE_ID)?.markdownPath,
  ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH
);
assert.deepEqual(
  parseProjectTaskTemplateMarkdown(
    getProjectTaskTemplateSeed(ENGINEERING_PROJECT_TEMPLATE_ID)?.markdown ?? "",
    ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH
  ).items.map((item) => item.title),
  engineeringTemplateFromMarkdown.items.map((item) => item.title)
);
assert.deepEqual(
  engineeringTemplateTodos.map((todo) => todo.title),
  [
    "Contract",
    "Billing initial payment",
    "Electrical",
    "Mechanical",
    "Plumbing",
    "Grease separator",
    "Sign and seal",
    "Sent to client",
    "Billing final payment",
    "Under building department review",
  ]
);
assert.equal(
  engineeringTemplateTodos.every(
    (todo) =>
      todo.projectId === "project-engineering" &&
      todo.sourceKind === PROJECT_TASK_TEMPLATE_SOURCE_KIND &&
      todo.sourceRef?.startsWith(`${ENGINEERING_PROJECT_TEMPLATE_ID}:v1:`)
  ),
  true
);
assert.equal(engineeringTemplateTodos[0].sourceRef, "engineering-project:v1:01-contract");
assert.equal(engineeringTemplateTodos[9].sourceRef, "engineering-project:v1:10-under-building-department-review");
assert.deepEqual(buildProjectTaskTemplateTodos("project-engineering", null), []);
assert.deepEqual(buildProjectTaskTemplateTodos("project-engineering", { ...engineeringTemplateFromMarkdown, status: "draft" }), []);

const snapshot: WorkSnapshot = {
  missions: [
    {
      id: "mission-1",
      slug: "ops",
      title: "Operations Mission",
      summary: null,
      status: "blocked",
      dueAt: "2026-04-30T17:00",
      markdownPath: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  projects: [
    {
      id: "project-1",
      missionId: "mission-1",
      slug: "launch",
      title: "Launch Project",
      summary: null,
      status: "paused",
      dueAt: "2026-04-28T17:00",
      markdownPath: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  todos: [
    {
      id: "todo-1",
      projectId: "project-1",
      title: "Call Max about invoice",
      status: "active",
      priority: "high",
      dueAt: "2026-04-26T17:00",
      moneyRelated: true,
      quickAction: true,
      estimatedMinutes: 10,
      waitingOnPersonId: "person-1",
      sourceKind: null,
      sourceRef: null,
      notes: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "todo-2",
      projectId: null,
      title: "Draft quiet update",
      status: "active",
      priority: "normal",
      dueAt: null,
      moneyRelated: false,
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
      id: "todo-3",
      projectId: "project-1",
      title: "Archive old checklist",
      status: "completed",
      priority: "low",
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
  deadlines: [
    {
      id: "deadline-project",
      entityKind: "project",
      entityId: "project-1",
      title: "Launch project due",
      dueAt: "2026-04-27T17:00",
      status: "active",
      priority: "critical",
      sourceKind: null,
      sourceRef: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "deadline-mission",
      entityKind: "mission",
      entityId: "mission-1",
      title: "Operations mission due",
      dueAt: "2026-04-30T17:00",
      status: "active",
      priority: "high",
      sourceKind: null,
      sourceRef: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "deadline-todo",
      entityKind: "todo",
      entityId: "todo-1",
      title: "Invoice call due",
      dueAt: "2026-04-26T17:00",
      status: "active",
      priority: "high",
      sourceKind: null,
      sourceRef: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
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

const commandsFor = (
  actions: AssistantContextAction[],
  entityKind: string,
  entityId: string
) =>
  actions
    .filter((action) => action.entityKind === entityKind && action.entityId === entityId)
    .map((action) => action.command)
    .sort();

const resolve = (text: string, actions: AssistantContextAction[], surface = "work_lookup") =>
  resolveAssistantContextActions({ surface, text, actions });

const assertResolvedCommand = (
  text: string,
  actions: AssistantContextAction[],
  command: AssistantContextAction["command"]
) => {
  const result = resolve(text, actions);
  assert.equal(result.ok, true, result.ok ? undefined : result.reason);
  if (result.ok) {
    assert.equal(result.action.command, command);
  }
  return result;
};

const lookupResult: Extract<WorkLookupResult, { ok: true }> = {
  ok: true,
  kind: "waiting_on",
  itemCount: 2,
  items: [
    {
      entityKind: "todo",
      entityId: "todo-1",
      title: "Call Max about invoice",
      detail: "waiting on Max Rivera",
    },
    {
      entityKind: "project",
      entityId: "project-1",
      title: "Launch Project",
      detail: "paused project",
    },
    {
      entityKind: "deadline",
      entityId: "deadline-project",
      title: "Launch project due",
      detail: "project deadline",
    },
  ],
  message: "lookup result",
};

const lookupActions = buildWorkLookupActions(lookupResult, snapshot);

assert.deepEqual(commandsFor(lookupActions, "todo", "todo-1"), [
  "clear_waiting_on",
  "complete",
  "pause",
  "update_due_date",
]);
assert.deepEqual(commandsFor(lookupActions, "project", "project-1"), [
  "complete",
  "open_focus_report",
  "open_focus_report",
  "open_focus_report",
  "reactivate",
]);
assert.deepEqual(commandsFor(lookupActions, "deadline", "deadline-project"), [
  "complete",
  "pause",
  "update_due_date",
]);

assert.equal(
  lookupActions.some(
    (action) =>
      action.command === "clear_waiting_on" &&
      action.entityKind === "todo" &&
      action.entityId === "todo-1" &&
      action.personId === "person-1"
  ),
  true
);

assertResolvedCommand("mark the first one done", lookupActions, "complete");
assertResolvedCommand("pause the first one", lookupActions, "pause");
assertResolvedCommand("reactivate the second one", lookupActions, "reactivate");
assertResolvedCommand("clear the first waiting-on flag", lookupActions, "clear_waiting_on");

const moveResult = assertResolvedCommand(
  "move the first one to tomorrow",
  lookupActions,
  "update_due_date"
);
assert.equal(moveResult.ok ? Boolean(moveResult.action.dueAt) : false, true);

const openRelatedProject = assertResolvedCommand(
  "open the related project focus report for the first one",
  lookupActions,
  "open_focus_report"
);
assert.equal(openRelatedProject.ok ? openRelatedProject.action.entityKind : null, "project");
assert.equal(openRelatedProject.ok ? openRelatedProject.action.entityId : null, "project-1");

const unresolvedMove = resolve("move the first one", lookupActions);
assert.equal(unresolvedMove.ok, false);
assert.match(unresolvedMove.ok ? "" : unresolvedMove.reason, /clear date/i);

const ambiguousPause = resolve("pause it", lookupActions);
assert.equal(ambiguousPause.ok, false);
assert.match(ambiguousPause.ok ? "" : ambiguousPause.reason, /which lookup item|Reply with/i);

const singleClearAction = lookupActions.filter((action) => action.command === "clear_waiting_on");
assertResolvedCommand("clear waiting-on", singleClearAction, "clear_waiting_on");

const completedActions = buildWorkItemActions(
  [{ entityKind: "todo", entityId: "todo-3", title: "Archive old checklist" }],
  snapshot
);
assert.deepEqual(commandsFor(completedActions, "todo", "todo-3"), [
  "reactivate",
]);

const quietTodoActions = buildWorkItemActions(
  [{ entityKind: "todo", entityId: "todo-2", title: "Draft quiet update" }],
  snapshot
);
assert.equal(quietTodoActions.some((action) => action.command === "clear_waiting_on"), false);
assert.equal(quietTodoActions.some((action) => action.command === "open_focus_report"), false);

const linkedDeadlineActions = buildWorkItemActions(
  [
    { entityKind: "deadline", entityId: "deadline-project", title: "Launch project due" },
    { entityKind: "deadline", entityId: "deadline-mission", title: "Operations mission due" },
    { entityKind: "deadline", entityId: "deadline-todo", title: "Invoice call due" },
  ],
  snapshot
);

assert.equal(
  linkedDeadlineActions.some(
    (action) =>
      action.command === "open_focus_report" &&
      action.entityKind === "project" &&
      action.entityId === "project-1"
  ),
  true
);
assert.equal(
  linkedDeadlineActions.some(
    (action) =>
      action.command === "open_focus_report" &&
      action.entityKind === "mission" &&
      action.entityId === "mission-1"
  ),
  true
);

console.log("work lookup action tests passed");
