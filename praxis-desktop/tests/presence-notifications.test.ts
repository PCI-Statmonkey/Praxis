import { strict as assert } from "node:assert";
import {
  buildPresenceNotificationCandidates,
  filterSnoozedNotificationCandidates,
  isWithinNotificationQuietWindow,
  notificationDeliverySuppressionReason,
  snoozeNotificationCandidate,
} from "../shared/presenceNotifications";
import {
  DEFAULT_PRESENCE_SETTINGS,
  DEFAULT_UI_SETTINGS,
} from "../shared/settingsModel";
import type { ReviewInboxItem } from "../shared/reviewInbox";
import type { TimeBlockRecord } from "../shared/timeBlocking";
import type { DeadlineRecord, TodoRecord } from "../shared/workModel";

const todo = (overrides: Partial<TodoRecord> = {}): TodoRecord => ({
  id: "todo-1",
  projectId: null,
  title: "Send overdue note",
  status: "active",
  priority: "high",
  dueAt: "2026-05-09T16:00:00.000Z",
  moneyRelated: false,
  quickAction: false,
  estimatedMinutes: null,
  waitingOnPersonId: null,
  sourceKind: null,
  sourceRef: null,
  notes: null,
  createdAt: "2026-05-08T12:00:00.000Z",
  updatedAt: "2026-05-08T12:00:00.000Z",
  ...overrides,
});

const deadline = (overrides: Partial<DeadlineRecord> = {}): DeadlineRecord => ({
  id: "deadline-1",
  entityKind: "standalone",
  entityId: null,
  title: "Old deadline",
  dueAt: "2026-05-08T16:00:00.000Z",
  status: "active",
  priority: "critical",
  sourceKind: null,
  sourceRef: null,
  createdAt: "2026-05-07T12:00:00.000Z",
  updatedAt: "2026-05-07T12:00:00.000Z",
  ...overrides,
});

const reviewInboxItem = (overrides: Partial<ReviewInboxItem> = {}): ReviewInboxItem => ({
  id: "review-1",
  sourceKind: "email",
  sourceSystem: "gmail",
  sourceLabel: "Gmail",
  sourceRecordId: "message-1",
  title: "Confirm follow-up",
  suggestedActionKind: "todo",
  confidence: 0.86,
  status: "pending",
  dueAt: null,
  receivedAt: "2026-05-10T10:00:00.000Z",
  isOverdue: false,
  actorLabel: "Max",
  matchedPersonName: null,
  subject: "Follow-up",
  snippet: null,
  reason: "Open request.",
  recommendedDecision: "create_todo",
  recommendationReason: "Needs confirmation.",
  ...overrides,
});

const timeBlock = (overrides: Partial<TimeBlockRecord> = {}): TimeBlockRecord => ({
  id: "time-block-1",
  title: "Planned admin",
  startsAt: "2026-05-10T13:00:00.000Z",
  endsAt: "2026-05-10T13:30:00.000Z",
  entityKind: "manual",
  entityId: null,
  status: "planned",
  source: "local",
  notes: null,
  actualMinutes: null,
  createdAt: "2026-05-10T12:00:00.000Z",
  updatedAt: "2026-05-10T12:00:00.000Z",
  ...overrides,
});

const candidates = buildPresenceNotificationCandidates({
  todos: [todo(), todo({ id: "todo-waiting", dueAt: null, waitingOnPersonId: "person-1" })],
  deadlines: [deadline()],
  reviewInboxItems: [reviewInboxItem()],
  timeBlocks: [timeBlock()],
  serviceHealthItems: [
    { label: "Google", state: "problem", detail: "needs sign-in", action: "Refresh sign-in." },
  ],
  now: "2026-05-10T14:00:00.000Z",
});

assert.equal(candidates[0]?.kind, "overdue_work");
assert.equal(candidates[0]?.targetSurface, "checklist");
assert.match(candidates[0]?.body ?? "", /2 items overdue/);
assert(candidates.some((candidate) => candidate.kind === "waiting_on"));
assert(candidates.some((candidate) => candidate.kind === "review_inbox"));
assert(candidates.some((candidate) => candidate.kind === "missed_time_block"));
assert(candidates.some((candidate) => candidate.kind === "service_attention"));

const snoozed = snoozeNotificationCandidate({}, candidates[0], 60, "2026-05-10T14:00:00.000Z");
assert.equal(
  filterSnoozedNotificationCandidates(candidates, snoozed, "2026-05-10T14:15:00.000Z").some(
    (candidate) => candidate.kind === "overdue_work"
  ),
  false
);
assert.equal(
  filterSnoozedNotificationCandidates(candidates, snoozed, "2026-05-10T15:01:00.000Z").some(
    (candidate) => candidate.kind === "overdue_work"
  ),
  true
);

assert.equal(
  notificationDeliverySuppressionReason({
    settings: { ...DEFAULT_UI_SETTINGS, notificationsEnabled: false },
    presence: DEFAULT_PRESENCE_SETTINGS,
    now: "2026-05-10T14:00:00.000Z",
  }),
  "notifications_disabled"
);
assert.equal(
  notificationDeliverySuppressionReason({
    settings: { ...DEFAULT_UI_SETTINGS, notificationsEnabled: true },
    presence: { mode: "paused", quietUntil: null, updatedAt: null },
    now: "2026-05-10T14:00:00.000Z",
  }),
  "presence_paused"
);
assert.equal(
  isWithinNotificationQuietWindow(
    { ...DEFAULT_UI_SETTINGS, notificationQuietStartMinutes: 22 * 60, notificationQuietEndMinutes: 7 * 60 },
    new Date(2026, 4, 10, 23, 0)
  ),
  true
);
assert.equal(
  isWithinNotificationQuietWindow(
    { ...DEFAULT_UI_SETTINGS, notificationQuietStartMinutes: 22 * 60, notificationQuietEndMinutes: 7 * 60 },
    new Date(2026, 4, 10, 14, 0)
  ),
  false
);

console.log("presence notification tests passed");
