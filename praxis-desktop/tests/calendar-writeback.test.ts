import { strict as assert } from "node:assert";
import {
  buildTimeBlockPublishPreview,
  confirmTimeBlockPublish,
  type TimeBlockPublishRecord,
} from "../shared/calendarWriteback";
import type { CalendarConnectionRecord } from "../shared/settingsModel";
import type { TimeBlockRecord } from "../shared/timeBlocking";
import type { AppointmentRecord } from "../shared/workModel";

const readyGoogleConnection: CalendarConnectionRecord = {
  id: "calendar-google-1",
  provider: "google",
  label: "Work Google",
  accountRef: "primary",
  enabled: true,
  authStatus: "ready",
  syncStatus: "ready_to_sync",
  lastSyncedAt: "2026-05-10T10:00:00.000Z",
  lastSyncError: null,
  createdAt: "2026-05-10T09:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
};

const block = (overrides: Partial<TimeBlockRecord> = {}): TimeBlockRecord => ({
  id: "time-block-1",
  title: "Draft bid package",
  startsAt: "2026-05-10T14:00:00.000Z",
  endsAt: "2026-05-10T15:00:00.000Z",
  entityKind: "todo",
  entityId: "todo-1",
  status: "planned",
  source: "local",
  notes: "Bring drawings",
  actualMinutes: null,
  createdAt: "2026-05-10T09:00:00.000Z",
  updatedAt: "2026-05-10T09:00:00.000Z",
  ...overrides,
});

const appointment = (overrides: Partial<AppointmentRecord> = {}): AppointmentRecord => ({
  id: "appointment-1",
  sourceSystem: "google",
  externalId: "provider-event-1",
  title: "Provider meeting",
  startsAt: "2026-05-10T14:30:00.000Z",
  endsAt: "2026-05-10T15:30:00.000Z",
  allDay: false,
  notes: null,
  createdAt: "2026-05-10T09:00:00.000Z",
  updatedAt: "2026-05-10T09:00:00.000Z",
  ...overrides,
});

const existingPublish: TimeBlockPublishRecord = {
  id: "publish-1",
  timeBlockId: "time-block-1",
  provider: "google",
  calendarConnectionId: "calendar-google-1",
  providerCalendarId: "primary",
  providerEventId: "provider-event-2",
  status: "published",
  lastPublishedAt: "2026-05-10T10:00:00.000Z",
  lastError: null,
  createdAt: "2026-05-10T10:00:00.000Z",
  updatedAt: "2026-05-10T10:00:00.000Z",
};

const readyPreview = buildTimeBlockPublishPreview({
  selectedTimeBlockIds: ["time-block-1"],
  provider: "google",
  calendarConnectionId: "calendar-google-1",
  timeBlocks: [block()],
  calendarConnections: [readyGoogleConnection],
});
assert.equal(readyPreview.writeBoundary, "requires_user_confirmation");
assert.equal(readyPreview.readyCount, 1);
assert.equal(readyPreview.items[0]?.status, "ready");
assert.match(readyPreview.items[0]?.eventDraft?.body ?? "", /PRAXIS local time block: time-block-1/);

const blockedPreview = buildTimeBlockPublishPreview({
  selectedTimeBlockIds: ["time-block-1", "time-block-2", "missing-block"],
  provider: "google",
  calendarConnectionId: "calendar-google-1",
  timeBlocks: [
    block({ status: "completed" }),
    block({
      id: "time-block-2",
      title: "Call supplier",
      startsAt: "2026-05-10T16:00:00.000Z",
      endsAt: "2026-05-10T16:20:00.000Z",
    }),
  ],
  calendarConnections: [readyGoogleConnection],
  existingPublishes: [
    {
      ...existingPublish,
      timeBlockId: "time-block-2",
    },
  ],
});
assert.deepEqual(
  blockedPreview.items.map((item) => item.status),
  ["not_planned", "already_published", "missing_block"]
);
assert.equal(blockedPreview.readyCount, 0);

const conflictPreview = buildTimeBlockPublishPreview({
  selectedTimeBlockIds: ["time-block-1"],
  provider: "google",
  calendarConnectionId: "calendar-google-1",
  timeBlocks: [block()],
  calendarConnections: [readyGoogleConnection],
  appointments: [appointment()],
});
assert.equal(conflictPreview.items[0]?.status, "conflict");
assert.deepEqual(conflictPreview.items[0]?.conflictIds, ["appointment-1"]);

const skippedConfirm = await confirmTimeBlockPublish(
  {
    preview: conflictPreview,
    confirmedTimeBlockIds: ["time-block-1"],
    now: "2026-05-10T12:00:00.000Z",
  },
  async () => {
    throw new Error("should not publish conflicted preview items");
  }
);
assert.equal(skippedConfirm.writeBoundary, "explicit_confirmation");
assert.equal(skippedConfirm.skippedCount, 1);
assert.equal(skippedConfirm.publishedCount, 0);

const successConfirm = await confirmTimeBlockPublish(
  {
    preview: readyPreview,
    confirmedTimeBlockIds: ["time-block-1"],
    now: "2026-05-10T12:00:00.000Z",
  },
  async (input) => {
    assert.equal(input.provider, "google");
    assert.equal(input.event.localTimeBlockId, "time-block-1");
    return { providerEventId: "provider-event-created" };
  }
);
assert.equal(successConfirm.publishedCount, 1);
assert.equal(successConfirm.results[0]?.record?.providerEventId, "provider-event-created");
assert.equal(successConfirm.results[0]?.record?.lastPublishedAt, "2026-05-10T12:00:00.000Z");

const failedConfirm = await confirmTimeBlockPublish(
  {
    preview: readyPreview,
    confirmedTimeBlockIds: ["time-block-1"],
  },
  async () => {
    throw new Error("Bearer token leaked raw provider payload");
  }
);
assert.equal(failedConfirm.failedCount, 1);
assert.doesNotMatch(failedConfirm.results[0]?.reason ?? "", /Bearer|payload|token/i);
assert.equal(failedConfirm.results[0]?.record?.status, "publish_failed");

console.log("calendar write-back tests passed");
