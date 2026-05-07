import { strict as assert } from "node:assert";
import { buildDailyBriefFromSnapshot } from "../shared/dailyBriefBuilder";
import { buildPlanningDayView, validateTimeBlockRange, type TimeBlockRecord } from "../shared/timeBlocking";
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

console.log("daily brief builder tests passed");
