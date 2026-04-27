import { strict as assert } from "node:assert";
import { buildDailyBriefFromSnapshot } from "../shared/dailyBriefBuilder";
import type {
  AppointmentRecord,
  DeadlineRecord,
  PersonRecord,
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

console.log("daily brief builder tests passed");
