import { strict as assert } from "node:assert";
import { buildPlanDraftResponseWithOllama } from "../electron/planDraftService";
import { buildDailyBriefFromSnapshot } from "../shared/dailyBriefBuilder";
import {
  buildAiDraftPlan,
  buildPlanningDayView,
  buildScheduleReview,
  validateTimeBlockRange,
  type TimeBlockRecord,
} from "../shared/timeBlocking";
import type {
  AppointmentRecord,
  DeadlineRecord,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkSnapshot,
} from "../shared/workModel";

const timestamp = "2026-04-24T00:00:00.000Z";
const now = new Date("2026-04-24T12:00:00.000Z");

const emptySnapshot = (): WorkSnapshot => ({
  missions: [],
  projects: [],
  todos: [],
  deadlines: [],
  appointments: [],
  people: [],
  personWorkLinks: [],
  memoryDocuments: [],
});

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
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const mission = (overrides: Partial<MissionRecord> = {}): MissionRecord => ({
  id: "mission-1",
  slug: "launch",
  title: "Launch Mission",
  summary: null,
  status: "active",
  dueAt: null,
  markdownPath: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const project = (overrides: Partial<ProjectRecord> = {}): ProjectRecord => ({
  id: "project-1",
  missionId: "mission-1",
  slug: "site",
  title: "Site Project",
  summary: null,
  status: "active",
  dueAt: null,
  markdownPath: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const todo = (overrides: Partial<TodoRecord> = {}): TodoRecord => ({
  id: "todo-1",
  projectId: null,
  title: "Send invoice",
  status: "active",
  priority: "high",
  dueAt: "2026-04-24T17:00",
  moneyRelated: false,
  quickAction: false,
  estimatedMinutes: null,
  waitingOnPersonId: null,
  sourceKind: null,
  sourceRef: null,
  notes: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const deadline = (overrides: Partial<DeadlineRecord> = {}): DeadlineRecord => ({
  id: "deadline-1",
  entityKind: "standalone",
  entityId: null,
  title: "File report",
  dueAt: "2026-04-24T17:00",
  status: "active",
  priority: "critical",
  sourceKind: null,
  sourceRef: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const appointment = (overrides: Partial<AppointmentRecord> = {}): AppointmentRecord => ({
  id: "appointment-1",
  sourceSystem: "google",
  externalId: null,
  title: "Client call",
  startsAt: "2026-04-24T12:30:00.000Z",
  endsAt: "2026-04-24T13:00:00.000Z",
  allDay: false,
  notes: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const timeBlock = (overrides: Partial<TimeBlockRecord> = {}): TimeBlockRecord => ({
  id: "time-block-1",
  title: "Work block",
  startsAt: "2026-04-24T09:15:00",
  endsAt: "2026-04-24T10:00:00",
  entityKind: "todo",
  entityId: "todo-due",
  status: "planned",
  source: "local",
  notes: null,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const noWorkBrief = buildDailyBriefFromSnapshot(emptySnapshot(), 0, now);
assert.equal(noWorkBrief.recommendedMove.item, null);
assert.match(noWorkBrief.recommendedMove.directive, /Capture/);
assert.match(noWorkBrief.spokenBrief, /do not have active work recorded/);
assert.equal(noWorkBrief.closeout.completedTodayCount, 0);
assert.equal(noWorkBrief.closeout.overdueCount, 0);

const calendarFirstBrief = buildDailyBriefFromSnapshot(
  {
    ...emptySnapshot(),
    appointments: [
      appointment(),
      appointment({
        id: "appointment-2",
        title: "Tomorrow planning",
        startsAt: "2026-04-25T14:00:00.000Z",
      }),
      appointment({
        id: "appointment-3",
        title: "Too far out",
        startsAt: "2026-04-28T14:00:00.000Z",
      }),
    ],
    todos: [todo()],
  },
  0,
  now
);
assert.equal(calendarFirstBrief.recommendedMove.item?.entityKind, "appointment");
assert.equal(calendarFirstBrief.appointments.length, 2);
assert.equal(calendarFirstBrief.appointments.some((item) => item.title === "Too far out"), false);
assert.match(calendarFirstBrief.recommendedMove.directive, /Protect the calendar item/);

const waitingBrief = buildDailyBriefFromSnapshot(
  {
    ...emptySnapshot(),
    people: [person()],
    todos: [
      todo({
        title: "Get Max approval",
        waitingOnPersonId: "person-1",
        quickAction: false,
        dueAt: "2026-04-23T17:00",
      }),
      todo({
        id: "todo-complete",
        title: "Already done",
        status: "completed",
        updatedAt: "2026-04-24T17:00:00.000Z",
      }),
    ],
  },
  2,
  now
);
assert.equal(waitingBrief.todos.length, 1);
assert.equal(waitingBrief.recommendedMove.item?.entityKind, "todo");
assert.match(waitingBrief.recommendedMove.directive, /waiting on Max/);
assert.deepEqual(waitingBrief.followUpTopics, ["email follow-ups"]);
assert.match(waitingBrief.spokenBrief, /1 item is overdue/);
assert.match(waitingBrief.spokenBrief, /1 todo is still waiting/);
assert.match(waitingBrief.spokenBrief, /2 email follow-ups/);
assert.equal(waitingBrief.closeout.completedTodayCount, 1);
assert.equal(waitingBrief.closeout.waitingOnCount, 1);
assert.equal(waitingBrief.closeout.overdueCount, 1);
assert.deepEqual(waitingBrief.closeout.moveTomorrowCandidates, ["Get Max approval"]);

const quickMoneyBrief = buildDailyBriefFromSnapshot(
  {
    ...emptySnapshot(),
    todos: [
      todo({
        title: "Pay vendor",
        dueAt: null,
        priority: "critical",
        quickAction: true,
        estimatedMinutes: 10,
        moneyRelated: true,
      }),
    ],
  },
  0,
  now
);
assert.match(quickMoneyBrief.recommendedMove.directive, /Knock out Pay vendor/);
assert.deepEqual(quickMoneyBrief.followUpTopics, ["money items"]);
assert.match(quickMoneyBrief.spokenBrief, /1 quick win/);
assert.match(quickMoneyBrief.spokenBrief, /1 money-related item/);
assert.equal(quickMoneyBrief.closeout.dueTodayCount, 0);

const deadlineBrief = buildDailyBriefFromSnapshot(
  {
    ...emptySnapshot(),
    deadlines: [deadline({ dueAt: "2026-04-23T17:00" })],
  },
  0,
  now
);
assert.equal(deadlineBrief.recommendedMove.item?.entityKind, "deadline");
assert.match(deadlineBrief.recommendedMove.directive, /Move File report forward/);
assert.equal(deadlineBrief.closeout.overdueCount, 1);

const thereIsMoreBrief = buildDailyBriefFromSnapshot(
  {
    ...emptySnapshot(),
    todos: Array.from({ length: 9 }, (_, index) =>
      todo({
        id: `todo-${index}`,
        title: `Todo ${index}`,
        priority: "normal",
        dueAt: null,
      })
    ),
  },
  0,
  now
);
assert.equal(thereIsMoreBrief.todos.length, 8);
assert.equal(thereIsMoreBrief.thereIsMore, true);
assert.deepEqual(thereIsMoreBrief.followUpTopics, ["additional todos"]);

const planningDayView = buildPlanningDayView({
  targetDate: "2026-04-24",
  timeZone: "local",
  appointments: [
    appointment({
      id: "appointment-late",
      title: "Late review",
      startsAt: "2026-04-24T16:00:00",
      endsAt: "2026-04-24T16:30:00",
      sourceSystem: "manual",
    }),
    appointment({
      id: "appointment-early",
      title: "Morning call",
      startsAt: "2026-04-24T09:00:00",
      endsAt: "2026-04-24T09:30:00",
      sourceSystem: "google",
    }),
    appointment({
      id: "appointment-other-day",
      title: "Tomorrow call",
      startsAt: "2026-04-25T09:00:00",
    }),
  ],
  deadlines: [
    deadline({
      id: "deadline-today",
      title: "Submit packet",
      dueAt: "2026-04-24T17:00:00",
    }),
    deadline({
      id: "deadline-complete",
      title: "Already closed",
      dueAt: "2026-04-24T13:00:00",
      status: "completed",
    }),
    deadline({
      id: "deadline-future",
      title: "Future deadline",
      dueAt: "2026-04-26T17:00:00",
    }),
  ],
  todos: [
    todo({
      id: "todo-due",
      title: "Prep launch checklist",
      projectId: "project-1",
      dueAt: "2026-04-24T15:00:00",
    }),
    todo({
      id: "todo-overdue",
      title: "Send overdue note",
      dueAt: "2026-04-23T15:00:00",
    }),
    todo({
      id: "todo-completed-planning",
      title: "Completed planning task",
      status: "completed",
      dueAt: "2026-04-24T15:00:00",
    }),
  ],
  projects: [project()],
  missions: [mission()],
  timeBlocks: [],
});

assert.equal(planningDayView.targetDate, "2026-04-24");
assert.equal(planningDayView.timeZone, "local");
assert.deepEqual(
  planningDayView.scheduledAppointments.map((item) => item.title),
  ["Morning call", "Late review"]
);
assert.equal(planningDayView.scheduledAppointments[0].sourceSystem, "google");
assert.deepEqual(
  planningDayView.deadlineMarkers.map((item) => item.title),
  ["Submit packet"]
);
assert.deepEqual(
  planningDayView.unscheduledWork.map((item) => [item.title, item.reason]),
  [
    ["Send overdue note", "overdue"],
    ["Prep launch checklist", "due_today"],
  ]
);
assert.equal(planningDayView.unscheduledWork[1].projectTitle, "Site Project");
assert.equal(planningDayView.unscheduledWork[1].missionTitle, "Launch Mission");
assert.deepEqual(planningDayView.timeBlocks, []);
assert.deepEqual(planningDayView.conflicts, []);

const planningDayWithLocalBlock = buildPlanningDayView({
  targetDate: "2026-04-24",
  appointments: [
    appointment({
      id: "appointment-conflict",
      title: "Existing calendar hold",
      startsAt: "2026-04-24T09:00:00",
      endsAt: "2026-04-24T09:30:00",
    }),
  ],
  deadlines: [],
  todos: [
    todo({
      id: "todo-due",
      title: "Prep launch checklist",
      projectId: "project-1",
      dueAt: "2026-04-24T15:00:00",
    }),
    todo({
      id: "todo-open",
      title: "Unblocked work",
      dueAt: "2026-04-24T16:00:00",
    }),
  ],
  projects: [project()],
  missions: [mission()],
  timeBlocks: [timeBlock()],
});

assert.deepEqual(
  planningDayWithLocalBlock.timeBlocks.map((block) => [
    block.title,
    block.entityKind,
    block.entityId,
    block.status,
    block.source,
  ]),
  [["Work block", "todo", "todo-due", "planned", "local"]]
);
assert.deepEqual(
  planningDayWithLocalBlock.unscheduledWork.map((item) => item.id),
  ["todo-open"]
);
assert.equal(planningDayWithLocalBlock.conflicts.length, 1);
assert.deepEqual(planningDayWithLocalBlock.conflicts[0].itemIds, [
  "appointment:appointment-conflict",
  "time_block:time-block-1",
]);
assert.equal(validateTimeBlockRange("2026-04-24T09:00:00", "2026-04-24T09:30:00"), null);
assert.match(
  validateTimeBlockRange("2026-04-24T09:30:00", "2026-04-24T09:00:00") ?? "",
  /end must be after the start/
);

const priorityReview = buildScheduleReview({
  targetDate: "2026-04-24",
  appointments: [],
  deadlines: [],
  todos: [
    todo({
      id: "todo-overdue-high",
      title: "Fix overdue launch blocker",
      priority: "high",
      dueAt: "2026-04-23T12:00:00",
      estimatedMinutes: 45,
    }),
    todo({
      id: "todo-low-future",
      title: "Low future cleanup",
      priority: "low",
      dueAt: "2026-04-30T12:00:00",
      estimatedMinutes: 30,
    }),
  ],
  projects: [project()],
  missions: [mission()],
  timeBlocks: [],
});

assert.equal(priorityReview.summary.state, "watch");
assert.equal(priorityReview.recommendedBlocks[0].entityId, "todo-overdue-high");
assert.match(priorityReview.recommendedBlocks[0].reason, /overdue/);
assert.equal(
  priorityReview.risks.some(
    (risk) => risk.kind === "overdue" && risk.entityId === "todo-overdue-high"
  ),
  true
);

const quickWinReview = buildScheduleReview({
  targetDate: "2026-04-24",
  workdayStartsAt: "2026-04-24T09:00:00",
  workdayEndsAt: "2026-04-24T17:00:00",
  minimumGapMinutes: 10,
  appointments: [
    appointment({
      id: "appointment-rest-of-day",
      title: "Client work session",
      startsAt: "2026-04-24T09:15:00",
      endsAt: "2026-04-24T17:00:00",
    }),
  ],
  deadlines: [],
  todos: [
    todo({
      id: "todo-quick-gap",
      title: "Send quick confirmation",
      priority: "normal",
      dueAt: null,
      quickAction: true,
      estimatedMinutes: 10,
    }),
  ],
  projects: [],
  missions: [],
  timeBlocks: [],
});

assert.deepEqual(
  quickWinReview.openGaps.map((gap) => [gap.startsAt, gap.endsAt, gap.minutes]),
  [["2026-04-24T09:00:00", "2026-04-24T09:15:00", 15]]
);
assert.equal(quickWinReview.recommendedBlocks[0].entityId, "todo-quick-gap");
assert.match(quickWinReview.recommendedBlocks[0].reason, /quick win/);

const conflictReview = buildScheduleReview({
  targetDate: "2026-04-24",
  appointments: [
    appointment({
      id: "appointment-conflict-review",
      startsAt: "2026-04-24T09:00:00",
      endsAt: "2026-04-24T09:30:00",
    }),
  ],
  deadlines: [],
  todos: [],
  projects: [],
  missions: [],
  timeBlocks: [timeBlock({ id: "time-block-conflict-review" })],
});

assert.equal(conflictReview.summary.conflictCount, 1);
assert.equal(conflictReview.summary.state, "overloaded");
assert.equal(conflictReview.risks.some((risk) => risk.kind === "conflict"), true);

const blockedReview = buildScheduleReview({
  targetDate: "2026-04-24",
  appointments: [],
  deadlines: [],
  todos: [
    todo({
      id: "todo-waiting",
      title: "Get Max answer",
      waitingOnPersonId: "person-1",
      dueAt: "2026-04-24T12:00:00",
      priority: "critical",
    }),
    todo({
      id: "todo-blocked",
      title: "Blocked vendor setup",
      status: "blocked",
      dueAt: "2026-04-24T12:00:00",
      priority: "critical",
    }),
  ],
  projects: [],
  missions: [],
  timeBlocks: [],
});

assert.deepEqual(blockedReview.recommendedBlocks, []);
assert.deepEqual(
  blockedReview.risks
    .filter((risk) => risk.kind === "waiting_on" || risk.kind === "blocked")
    .map((risk) => [risk.entityId, risk.kind]),
  [
    ["todo-waiting", "waiting_on"],
    ["todo-blocked", "blocked"],
  ]
);
assert.equal(blockedReview.summary.waitingOrBlockedCount, 2);

const emptyScheduleReview = buildScheduleReview({
  targetDate: "2026-04-24",
  appointments: [],
  deadlines: [],
  todos: [],
  projects: [],
  missions: [],
  timeBlocks: [],
});

assert.equal(emptyScheduleReview.summary.state, "clear");
assert.match(emptyScheduleReview.summary.message, /No schedule pressure/);
assert.equal(emptyScheduleReview.risks.length, 0);
assert.equal(emptyScheduleReview.recommendedBlocks.length, 0);

const aiDraftReview = buildScheduleReview({
  targetDate: "2026-04-24",
  appointments: [],
  deadlines: [],
  todos: [
    todo({
      id: "todo-ai-first",
      title: "Resolve AI draft source",
      priority: "high",
      dueAt: "2026-04-24T12:00:00",
      estimatedMinutes: 30,
    }),
    todo({
      id: "todo-ai-second",
      title: "Write planning note",
      priority: "normal",
      dueAt: null,
      quickAction: true,
      estimatedMinutes: 15,
    }),
  ],
  projects: [],
  missions: [],
  timeBlocks: [],
});
const [firstAiRecommendation, secondAiRecommendation] = aiDraftReview.recommendedBlocks;
const aiDraftPlan = buildAiDraftPlan({
  scheduleReview: aiDraftReview,
  aiCandidate: {
    explanation: "Use the urgent item first, then the quick win.",
    blocks: [
      {
        recommendationId: secondAiRecommendation.id,
        explanation: "Use the small open slot for the quick follow-up.",
      },
      {
        recommendationId: firstAiRecommendation.id,
        openGapId: aiDraftReview.openGaps[0].id,
        explanation: "Then protect the urgent due-today work.",
      },
    ],
  },
});

assert.equal(aiDraftPlan.source, "ai_proposal");
assert.equal(aiDraftPlan.writeBoundary, "requires_user_confirmation");
assert.deepEqual(
  aiDraftPlan.proposedBlocks.map((block) => block.entityId),
  ["todo-ai-second", "todo-ai-first"]
);
assert.equal(
  aiDraftPlan.proposedBlocks.every((block) =>
    ["recommendation", "work_item", "open_gap"].every((kind) =>
      block.citations.some((citation) => citation.kind === kind)
    )
  ),
  true
);
assert.match(aiDraftPlan.proposedBlocks[0].explanation, /quick follow-up/);

const fallbackDraftPlan = buildAiDraftPlan({
  scheduleReview: aiDraftReview,
  aiAvailable: false,
});

assert.equal(fallbackDraftPlan.source, "deterministic_fallback");
assert.equal(fallbackDraftPlan.writeBoundary, "requires_user_confirmation");
assert.equal(fallbackDraftPlan.rejectedProposalReasons[0], "AI unavailable; deterministic fallback used.");
assert.deepEqual(
  fallbackDraftPlan.proposedBlocks.map((block) => block.entityId),
  ["todo-ai-first", "todo-ai-second"]
);

const invalidAiDraftPlan = buildAiDraftPlan({
  scheduleReview: aiDraftReview,
  aiCandidate: {
    blocks: [
      {
        recommendationId: "missing-recommendation",
        openGapId: "missing-gap",
      },
    ],
  },
});

assert.equal(invalidAiDraftPlan.source, "deterministic_fallback");
assert.match(invalidAiDraftPlan.rejectedProposalReasons[0], /unknown recommendation/);
assert.equal(invalidAiDraftPlan.proposedBlocks.length > 0, true);

const planDraftServiceFallback = await buildPlanDraftResponseWithOllama({
  scheduleReview: aiDraftReview,
  settings: {
    localModelName: null,
  },
});

assert.equal(planDraftServiceFallback.ok, true);
assert.equal(planDraftServiceFallback.summarySource, "deterministic_fallback");
assert.equal(planDraftServiceFallback.draftPlan.writeBoundary, "requires_user_confirmation");
assert.match(planDraftServiceFallback.fallbackReason ?? "", /No saved Ollama model/);
assert.deepEqual(
  planDraftServiceFallback.draftPlan.proposedBlocks.map((block) => block.entityId),
  ["todo-ai-first", "todo-ai-second"]
);

const planDraftServiceAiProposal = await buildPlanDraftResponseWithOllama({
  scheduleReview: aiDraftReview,
  settings: {
    localModelName: "local-plan-model",
  },
  generateCandidate: async () => ({
    ok: true,
    status: "ok",
    modelName: "local-plan-model",
    candidate: {
      explanation: "Use the deterministic quick win citation first.",
      blocks: [
        {
          recommendationId: secondAiRecommendation.id,
          openGapId: aiDraftReview.openGaps[0].id,
          explanation: "Fits in the cited open gap and lowers load.",
        },
      ],
    },
  }),
});

assert.equal(planDraftServiceAiProposal.summarySource, "ollama");
assert.equal(planDraftServiceAiProposal.fallbackReason, null);
assert.equal(planDraftServiceAiProposal.draftPlan.source, "ai_proposal");
assert.equal(planDraftServiceAiProposal.draftPlan.writeBoundary, "requires_user_confirmation");
assert.deepEqual(
  planDraftServiceAiProposal.draftPlan.proposedBlocks[0].citations.map((citation) => citation.kind),
  ["recommendation", "work_item", "open_gap"]
);

const planDraftServiceInvalidProposal = await buildPlanDraftResponseWithOllama({
  scheduleReview: aiDraftReview,
  settings: {
    localModelName: "local-plan-model",
  },
  generateCandidate: async () => ({
    ok: true,
    status: "ok",
    modelName: "local-plan-model",
    candidate: {
      blocks: [
        {
          recommendationId: "not-in-review",
          openGapId: "also-not-in-review",
        },
      ],
    },
  }),
});

assert.equal(planDraftServiceInvalidProposal.summarySource, "deterministic_fallback");
assert.match(planDraftServiceInvalidProposal.fallbackReason ?? "", /unknown recommendation/);
assert.equal(planDraftServiceInvalidProposal.draftPlan.writeBoundary, "requires_user_confirmation");

console.log("daily brief builder tests passed");
