import { strict as assert } from "node:assert";
import type { DailyBriefItem, FocusReport } from "../shared/dailyBrief";
import { answerFocusReportFollowUp } from "../shared/focusReportFollowUp";

const item = (overrides: Partial<DailyBriefItem> = {}): DailyBriefItem => ({
  id: "todo-1",
  entityKind: "todo",
  title: "Send client update",
  reason: "due soon",
  dueAt: "2026-04-26T17:00:00.000Z",
  priority: "high",
  status: "active",
  rank: 1,
  waitingOnPersonName: null,
  ...overrides,
});

const report = (overrides: Partial<FocusReport> = {}): FocusReport => ({
  entityKind: "project",
  entityId: "project-1",
  title: "Client Launch",
  summary: "Launch follow-up",
  status: "active",
  dueAt: null,
  activeProjectCount: 0,
  activeTodoCount: 3,
  upcomingDeadlineCount: 1,
  people: [
    {
      personId: "person-1",
      name: "Max",
      relationship: "owner",
    },
  ],
  topItems: [
    item({ id: "todo-1", title: "Get Max approval", waitingOnPersonName: "Max" }),
    item({ id: "todo-2", title: "Draft rollout note", status: "active" }),
  ],
  detailItems: [
    item({ id: "todo-1", title: "Get Max approval", waitingOnPersonName: "Max" }),
    item({ id: "todo-2", title: "Draft rollout note", status: "active" }),
    item({ id: "todo-3", title: "Unblock vendor review", status: "blocked" }),
    item({
      id: "deadline-1",
      entityKind: "deadline",
      title: "Paused legal review",
      status: "paused",
    }),
  ],
  markdownPath: "memory/projects/client-launch.md",
  ...overrides,
});

const blocked = answerFocusReportFollowUp("show only blocked/waiting-on", report());
assert.equal(blocked.matched, true);
assert.equal(blocked.kind, "blocked_waiting_on");
assert.equal(blocked.items?.length, 3);
assert.match(blocked.message, /Get Max approval/);
assert.match(blocked.message, /Unblock vendor review/);
assert.match(blocked.message, /Paused legal review/);
assert.doesNotMatch(blocked.message, /Draft rollout note/);

const people = answerFocusReportFollowUp("who is involved?", report());
assert.equal(people.matched, true);
assert.equal(people.kind, "people");
assert.equal(people.people?.length, 1);
assert.match(people.message, /Max \(owner\)/);

const noPeople = answerFocusReportFollowUp("people involved", report({ people: [] }));
assert.equal(noPeople.matched, true);
assert.equal(noPeople.kind, "people");
assert.match(noPeople.message, /No people are linked/);

const unrelated = answerFocusReportFollowUp("tell me more", report());
assert.equal(unrelated.matched, false);

const noReport = answerFocusReportFollowUp("who is involved?", null);
assert.equal(noReport.matched, false);

console.log("focus report follow-up tests passed");
