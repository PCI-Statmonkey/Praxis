import { strict as assert } from "node:assert";
import {
  resolveAssistantContextActions,
  resolveAssistantContextActionSelection,
} from "../shared/assistantContextResolver";
import {
  ASSISTANT_CONTEXT_DECLINE_REASON,
  assistantContextActionSurfaces,
  shouldStopAssistantContextTraversal,
  type AssistantContextAction,
  type ResolveAssistantContextInput,
  type ResolveAssistantContextResult,
  type StoreAssistantContextInput,
} from "../shared/assistantContext";
import {
  SKILL_ALLOWLIST_BY_SURFACE,
  skillIdsForAssistantIntent,
  skillReferencesForAssistantIntent,
} from "../shared/assistantSkillRouting";
import { buildWorkItemActions } from "../shared/workLookupContext";
import type { WorkSnapshot } from "../shared/workModel";
import {
  classifyAssistantReviewRoute,
  formatAssistantChoiceReply,
  type AssistantReviewRoute,
} from "../shared/assistantRouter";

const snapshot: WorkSnapshot = {
  missions: [
    {
      id: "mission-1",
      slug: "origins",
      title: "Origins Mission",
      summary: null,
      status: "active",
      dueAt: null,
      markdownPath: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
  ],
  projects: [
    {
      id: "project-1",
      missionId: "mission-1",
      slug: "sourcebook",
      title: "Powerless Sourcebook",
      summary: null,
      status: "paused",
      dueAt: null,
      markdownPath: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
  ],
  todos: [
    {
      id: "todo-1",
      projectId: "project-1",
      title: "Call Max about invoice",
      status: "active",
      priority: "high",
      dueAt: null,
      moneyRelated: true,
      quickAction: true,
      estimatedMinutes: 10,
      waitingOnPersonId: "person-1",
      sourceKind: null,
      sourceRef: null,
      notes: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
    {
      id: "todo-2",
      projectId: null,
      title: "Send GM packet",
      status: "completed",
      priority: "normal",
      dueAt: null,
      moneyRelated: false,
      quickAction: false,
      estimatedMinutes: null,
      waitingOnPersonId: null,
      sourceKind: null,
      sourceRef: null,
      notes: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
  ],
  deadlines: [
    {
      id: "deadline-1",
      entityKind: "project",
      entityId: "project-1",
      title: "Finish sourcebook outline",
      dueAt: "2026-04-25T17:00",
      status: "active",
      priority: "critical",
      sourceKind: null,
      sourceRef: null,
      createdAt: "2026-04-24T00:00:00.000Z",
      updatedAt: "2026-04-24T00:00:00.000Z",
    },
  ],
  appointments: [],
  people: [
    {
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
    },
  ],
  personWorkLinks: [],
  memoryDocuments: [],
};

const action = (
  command: AssistantContextAction["command"],
  ordinal = 1,
  title = "Call Max about invoice"
): AssistantContextAction => ({
  actionId: `todo-1:${command}:${ordinal}`,
  ordinal,
  title,
  entityKind: "todo",
  entityId: "todo-1",
  command,
});

const assertCommand = (
  result: ReturnType<typeof resolveAssistantContextActions>,
  command: AssistantContextAction["command"]
) => {
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.action.command, command);
  }
};

type MemoryContext = {
  id: string;
  surface: string;
  threadId: string;
  status: "active" | "expired" | "resolved";
  createdAt: number;
  actions: AssistantContextAction[];
};

const createContextHarness = () => {
  const contexts: MemoryContext[] = [];
  const defaultThreadId = "desktop:current";
  let nextId = 1;

  const threadIdFor = (threadId: string | undefined) => threadId?.trim() || defaultThreadId;
  const activeContexts = () => contexts.filter((context) => context.status === "active");

  const store = (input: StoreAssistantContextInput) => {
    const threadId = threadIdFor(input.threadId);
    for (const context of contexts) {
      const expires = input.expireSurfaces ?? [input.surface];
      if (
        context.threadId === threadId &&
        expires.includes(context.surface) &&
        context.status === "active"
      ) {
        context.status = "expired";
      }
    }
    contexts.push({
      id: `context-${nextId}`,
      surface: input.surface,
      threadId,
      status: "active",
      createdAt: nextId,
      actions: input.actions,
    });
    nextId += 1;
  };

  const resolve = (input: ResolveAssistantContextInput): ResolveAssistantContextResult => {
    const threadId = threadIdFor(input.threadId);
    const context = contexts
      .filter(
        (candidate) =>
          candidate.surface === input.surface &&
          candidate.threadId === threadId &&
          candidate.status === "active"
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    if (!context) {
      return {
        ok: false,
        reason: "There is no active report context to apply that to.",
      };
    }

    const result = resolveAssistantContextActions({
      surface: input.surface,
      text: input.text,
      actions: context.actions,
    });
    if (result.ok || "declined" in result) {
      context.status = "resolved";
    }
    if ("declined" in result) {
      return {
        ok: false,
        reason: result.reason,
      };
    }
    return result;
  };

  const resolveThroughFallback = (
    text: string,
    options: { threadId?: string; includeFocusReport?: boolean } = {}
  ) => {
    let resolved: ResolveAssistantContextResult = {
      ok: false,
      reason: "There is no active report context to apply that to.",
    };

    for (const surface of assistantContextActionSurfaces({
      includeFocusReport: options.includeFocusReport,
    })) {
      resolved = resolve({
        surface,
        threadId: options.threadId,
        text,
      });
      if (shouldStopAssistantContextTraversal(resolved)) {
        return resolved;
      }
    }

    return resolved;
  };

  return {
    activeContexts,
    resolve,
    resolveThroughFallback,
    store,
  };
};

const actions = buildWorkItemActions(
  [
    { entityKind: "todo", entityId: "todo-1", title: "Call Max about invoice" },
    { entityKind: "project", entityId: "project-1", title: "Powerless Sourcebook" },
    { entityKind: "deadline", entityId: "deadline-1", title: "Finish sourcebook outline" },
  ],
  snapshot
);

assert.deepEqual(assistantContextActionSurfaces(), [
  "work_update_confirmation",
  "work_lookup",
  "focus_report",
  "daily_report",
  "proactive_suggestion",
]);
assert.deepEqual(assistantContextActionSurfaces({ includeFocusReport: false }), [
  "work_update_confirmation",
  "work_lookup",
  "daily_report",
  "proactive_suggestion",
]);
assert.equal(
  shouldStopAssistantContextTraversal({
    ok: false,
    reason: ASSISTANT_CONTEXT_DECLINE_REASON,
  }),
  true
);
assert.equal(
  shouldStopAssistantContextTraversal({
    ok: false,
    reason: "There is no active report context to apply that to.",
  }),
  false
);
assert.equal(
  formatAssistantChoiceReply(["todo", "appointment"]),
  "Reply with `todo`, `appointment`, or `no` to cancel."
);

const assertReviewRoute = (
  text: string,
  intent: AssistantReviewRoute["intent"],
  kind: AssistantReviewRoute["kind"]
) => {
  const route = classifyAssistantReviewRoute(text);
  assert.notEqual(route, null, `${text} should route as an assistant review request`);
  assert.equal(route?.intent, intent);
  assert.equal(route?.kind, kind);
  assert.equal(
    route?.intent === "work_lookup" ||
      route?.intent === "daily_report" ||
      route?.intent === "person_lookup",
    true,
    `${text} should stay read-only`
  );
};

assertReviewRoute("Give me a few wins.", "daily_report", "quick_wins");
assertReviewRoute("What can I knock out today?", "work_lookup", "quick_wins");
assertReviewRoute("I'm overwhelmed, reset me.", "daily_report", "reset");
assertReviewRoute("What am I forgetting?", "daily_report", "reset");
assertReviewRoute("What's about to bite me?", "daily_report", "risk_review");
assertReviewRoute("What projects are stale?", "daily_report", "stale_projects");
assertReviewRoute("Hey, you have that project with Stacy.", "person_lookup", "person_project_lookup");
assert.equal(classifyAssistantReviewRoute("Mark the invoice done."), null);

assert(actions.some((candidate) => candidate.command === "complete" && candidate.entityId === "todo-1"));
assert(actions.some((candidate) => candidate.command === "pause" && candidate.entityId === "todo-1"));
assert(actions.some((candidate) => candidate.command === "update_due_date" && candidate.entityId === "todo-1"));
assert(actions.some((candidate) => candidate.command === "clear_waiting_on" && candidate.entityId === "todo-1"));
assert(actions.some((candidate) => candidate.command === "reactivate" && candidate.entityId === "project-1"));
assert(actions.some((candidate) => candidate.command === "open_focus_report" && candidate.entityId === "project-1"));

assertCommand(
  resolveAssistantContextActions({
    surface: "daily_report",
    text: "pause the first one",
    actions,
  }),
  "pause"
);

const confirmedWorkUpdate = resolveAssistantContextActions({
  surface: "work_update_confirmation",
  text: "yes",
  actions: [action("complete", 1)],
});
assert.equal(confirmedWorkUpdate.ok, true);
if (confirmedWorkUpdate.ok) {
  assert.equal(confirmedWorkUpdate.action.command, "complete");
}

const yesWithMultipleStagedWrites = resolveAssistantContextActions({
  surface: "work_update_confirmation",
  text: "yes",
  actions: [action("complete", 1), action("pause", 2, "Send GM packet")],
});
assert.equal(yesWithMultipleStagedWrites.ok, false);
assert.match(
  yesWithMultipleStagedWrites.ok ? "" : yesWithMultipleStagedWrites.reason,
  /few options|number/i
);

const yesWithReportContextDoesNotPickFirstItem = resolveAssistantContextActions({
  surface: "daily_report",
  text: "yes",
  actions,
});
assert.equal(yesWithReportContextDoesNotPickFirstItem.ok, false);
assert.match(
  yesWithReportContextDoesNotPickFirstItem.ok
    ? ""
    : yesWithReportContextDoesNotPickFirstItem.reason,
  /which report item|mark the first one/i
);

const declinedWorkUpdate = resolveAssistantContextActions({
  surface: "work_update_confirmation",
  text: "no",
  actions: [action("complete", 1)],
});
assert.equal(declinedWorkUpdate.ok, false);
assert.equal("declined" in declinedWorkUpdate ? declinedWorkUpdate.declined : false, true);

const noWithLookupContextDoesNotDecline = resolveAssistantContextActions({
  surface: "work_lookup",
  text: "no",
  actions,
});
assert.equal(noWithLookupContextDoesNotDecline.ok, false);
assert.equal("declined" in noWithLookupContextDoesNotDecline, false);
assert.match(
  noWithLookupContextDoesNotDecline.ok ? "" : noWithLookupContextDoesNotDecline.reason,
  /which lookup item|mark the first one/i
);

assert.equal(
  shouldStopAssistantContextTraversal({
    ok: false,
    reason:
      "I could not safely map that reply. Reply with a number or the specific item title.",
  }),
  false
);

const threadHarness = createContextHarness();
threadHarness.store({
  surface: "work_update_confirmation",
  threadId: "slack:thread-a",
  title: "Thread A confirmation",
  actions: [action("complete", 1, "Thread A todo")],
});
threadHarness.store({
  surface: "work_update_confirmation",
  threadId: "slack:thread-b",
  title: "Thread B confirmation",
  actions: [action("pause", 1, "Thread B todo")],
});
const threadAConfirmation = threadHarness.resolveThroughFallback("yes", {
  threadId: "slack:thread-a",
});
assertCommand(threadAConfirmation, "complete");
assert.deepEqual(
  threadHarness
    .activeContexts()
    .map((context) => `${context.threadId}:${context.surface}:${context.actions[0].command}`),
  ["slack:thread-b:work_update_confirmation:pause"]
);
const threadBConfirmation = threadHarness.resolveThroughFallback("yes", {
  threadId: "slack:thread-b",
});
assertCommand(threadBConfirmation, "pause");

const surfaceHarness = createContextHarness();
surfaceHarness.store({
  surface: "daily_report",
  title: "Daily context",
  actions,
});
surfaceHarness.store({
  surface: "work_update_confirmation",
  title: "Staged write",
  actions: [action("complete", 1)],
});
const declinedStagedWrite = surfaceHarness.resolveThroughFallback("no");
assert.equal(declinedStagedWrite.ok, false);
assert.equal(declinedStagedWrite.reason, ASSISTANT_CONTEXT_DECLINE_REASON);
assert.deepEqual(
  surfaceHarness.activeContexts().map((context) => context.surface),
  ["daily_report"]
);
assertCommand(surfaceHarness.resolveThroughFallback("pause the first one"), "pause");

const missingWriteHarness = createContextHarness();
missingWriteHarness.store({
  surface: "daily_report",
  title: "Daily context",
  actions,
});
const missingWriteYes = missingWriteHarness.resolve({
  surface: "work_update_confirmation",
  text: "yes",
});
assert.equal(missingWriteYes.ok, false);
assert.match(missingWriteYes.reason, /no active report context/i);
assert.deepEqual(
  missingWriteHarness.activeContexts().map((context) => context.surface),
  ["daily_report"]
);
assertCommand(missingWriteHarness.resolveThroughFallback("reactivate the second one"), "reactivate");

const expirationHarness = createContextHarness();
expirationHarness.store({
  surface: "work_update_confirmation",
  title: "Old staged write",
  actions: [action("complete", 1, "Old staged todo")],
});
expirationHarness.store({
  surface: "work_update_confirmation",
  title: "Replacement staged write",
  actions: [action("pause", 1, "Replacement staged todo")],
});
assert.deepEqual(
  expirationHarness
    .activeContexts()
    .map((context) => `${context.surface}:${context.actions[0].command}`),
  ["work_update_confirmation:pause"]
);
assertCommand(expirationHarness.resolveThroughFallback("yes"), "pause");

assertCommand(
  resolveAssistantContextActions({
    surface: "daily_report",
    text: "reactivate the second one",
    actions,
  }),
  "reactivate"
);

const dueDateResult = resolveAssistantContextActions({
  surface: "work_lookup",
  text: "move the first one to tomorrow",
  actions,
});
assertCommand(dueDateResult, "update_due_date");
assert.equal(dueDateResult.ok ? Boolean(dueDateResult.action.dueAt) : false, true);

assertCommand(
  resolveAssistantContextActions({
    surface: "work_lookup",
    text: "clear the first waiting-on flag",
    actions,
  }),
  "clear_waiting_on"
);

assertCommand(
  resolveAssistantContextActions({
    surface: "focus_report",
    text: "open the focus report for the second one",
    actions,
  }),
  "open_focus_report"
);

const declined = resolveAssistantContextActions({
  surface: "daily_report",
  text: "not now",
  actions,
});
assert.equal(declined.ok, false);
assert.equal("declined" in declined ? declined.declined : false, true);

const ambiguous = resolveAssistantContextActions({
  surface: "daily_report",
  text: "pause it",
  actions: [action("pause", 1), action("pause", 2, "Send GM packet")],
});
assert.equal(ambiguous.ok, false);
assert.match(ambiguous.reason, /which report item|which lookup item|Reply with/i);

const selectedAction = resolveAssistantContextActionSelection(
  [action("pause", 1), action("pause", 2, "Send GM packet")],
  "todo-1:pause:2"
);
assert.equal(selectedAction.ok, true, selectedAction.ok ? undefined : selectedAction.reason);
if (selectedAction.ok) {
  assert.equal(selectedAction.action.command, "pause");
  assert.equal(selectedAction.action.ordinal, 2);
}

const missingSelectedAction = resolveAssistantContextActionSelection(
  [action("pause", 1)],
  "missing"
);
assert.equal(missingSelectedAction.ok, false);
assert.match(missingSelectedAction.ok ? "" : missingSelectedAction.reason, /no longer available/i);

assert.deepEqual(skillIdsForAssistantIntent("person_lookup"), ["contact-lookup"]);
assert.deepEqual(skillIdsForAssistantIntent("work_lookup"), ["work-graph"]);
assert.deepEqual(skillIdsForAssistantIntent("daily_report"), [
  "daily-brief",
  "work-graph",
  "inbox-triage",
]);
assert.deepEqual(skillIdsForAssistantIntent("capture"), []);
assert.deepEqual(skillIdsForAssistantIntent("conversation_review"), ["chat-triage"]);
assert.deepEqual(SKILL_ALLOWLIST_BY_SURFACE.voice, [
  "daily-brief",
  "work-graph",
  "contact-lookup",
]);

const registryForSkillRouting = {
  ok: true,
  skillsRoot: "skills",
  indexedAt: "2026-04-24T00:00:00.000Z",
  skillCount: 4,
  warnings: [],
  skills: [
    {
      id: "daily-brief",
      name: "daily-brief",
      description: "Builds the daily report.",
      surfaces: ["desktop", "slack", "voice"],
      dataSources: ["sqlite.work_snapshot"],
      trust: "built-in",
      relativePath: "daily-brief/SKILL.md",
      title: "Daily Brief",
      content: "full content should stay out of route references",
      loadedAt: "2026-04-24T00:00:00.000Z",
      warnings: [],
    },
    {
      id: "work-graph",
      name: "work-graph",
      description: "Answers work questions.",
      surfaces: ["desktop", "slack", "voice"],
      dataSources: ["sqlite.work_snapshot"],
      trust: "built-in",
      relativePath: "work-graph/SKILL.md",
      title: "Work Graph",
      content: "work graph content",
      loadedAt: "2026-04-24T00:00:00.000Z",
      warnings: [],
    },
    {
      id: "inbox-triage",
      name: "inbox-triage",
      description: "Reviews email follow-ups.",
      surfaces: ["desktop", "slack"],
      dataSources: ["sqlite.email_messages"],
      trust: "built-in",
      relativePath: "inbox-triage/SKILL.md",
      title: "Inbox Triage",
      content: "inbox content",
      loadedAt: "2026-04-24T00:00:00.000Z",
      warnings: [],
    },
    {
      id: "contact-lookup",
      name: "contact-lookup",
      description: "Looks up contacts.",
      surfaces: ["desktop"],
      dataSources: ["sqlite.people"],
      trust: "built-in",
      relativePath: "contact-lookup/SKILL.md",
      title: "Contact Lookup",
      content: "not relevant",
      loadedAt: "2026-04-24T00:00:00.000Z",
      warnings: [],
    },
    {
      id: "chat-triage",
      name: "chat-triage",
      description: "Reviews imported chat snippets.",
      surfaces: ["desktop", "slack", "companion"],
      dataSources: ["sqlite.chat_imports"],
      trust: "built-in",
      relativePath: "chat-triage/SKILL.md",
      title: "Chat Triage",
      content: "chat triage content",
      loadedAt: "2026-04-24T00:00:00.000Z",
      warnings: [],
    },
  ],
} as const;

const desktopSkillReferences = skillReferencesForAssistantIntent(
  "daily_report",
  registryForSkillRouting,
  "desktop"
);
assert.deepEqual(desktopSkillReferences.map((skill) => skill.id), [
  "daily-brief",
  "work-graph",
  "inbox-triage",
]);
assert.deepEqual(desktopSkillReferences[0], {
  id: "daily-brief",
  name: "daily-brief",
  description: "Builds the daily report.",
  surfaces: ["desktop", "slack", "voice"],
  relativePath: "daily-brief/SKILL.md",
});

const slackSkillReferences = skillReferencesForAssistantIntent(
  "daily_report",
  registryForSkillRouting,
  "slack"
);
assert.deepEqual(slackSkillReferences.map((skill) => skill.id), [
  "daily-brief",
  "work-graph",
  "inbox-triage",
]);

const voiceSkillReferences = skillReferencesForAssistantIntent(
  "daily_report",
  registryForSkillRouting,
  "voice"
);
assert.deepEqual(voiceSkillReferences.map((skill) => skill.id), [
  "daily-brief",
  "work-graph",
]);

const companionSkillReferences = skillReferencesForAssistantIntent(
  "daily_report",
  registryForSkillRouting,
  "companion"
);
assert.deepEqual(companionSkillReferences, []);

const conversationReviewSkillReferences = skillReferencesForAssistantIntent(
  "conversation_review",
  registryForSkillRouting,
  "desktop"
);
assert.deepEqual(conversationReviewSkillReferences.map((skill) => skill.id), [
  "chat-triage",
]);

assert.deepEqual(skillReferencesForAssistantIntent("person_lookup", registryForSkillRouting, "slack"), []);

assert.deepEqual(skillReferencesForAssistantIntent("person_lookup", registryForSkillRouting, "desktop"), [
  {
    id: "contact-lookup",
    name: "contact-lookup",
    description: "Looks up contacts.",
    surfaces: ["desktop"],
    relativePath: "contact-lookup/SKILL.md",
  },
]);

console.log("assistant regression tests passed");
