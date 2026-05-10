import type { ReviewInboxItem } from "./reviewInbox";
import {
  resolvePresenceSettings,
  type PresenceSettings,
  type UiSettings,
} from "./settingsModel";
import type { TimeBlockRecord } from "./timeBlocking";
import type { DeadlineRecord, TodoRecord } from "./workModel";

export type PresenceNotificationKind =
  | "overdue_work"
  | "waiting_on"
  | "review_inbox"
  | "missed_time_block"
  | "service_attention";

export type PresenceNotificationSeverity = "info" | "warning" | "critical";

export type PresenceNotificationTargetSurface =
  | "today"
  | "checklist"
  | "plan"
  | "review_inbox"
  | "settings";

export type PresenceNotificationCandidate = {
  id: string;
  kind: PresenceNotificationKind;
  severity: PresenceNotificationSeverity;
  title: string;
  body: string;
  targetSurface: PresenceNotificationTargetSurface;
  stableId: string;
  snoozeKey: string;
  createdAt: string;
};

export type PresenceNotificationServiceHealthItem = {
  label: string;
  state: "online" | "setup" | "idle" | "problem" | "loading";
  detail: string;
  action: string;
};

export type PresenceNotificationSnoozeState = Record<string, string>;

export type BuildPresenceNotificationCandidatesInput = {
  todos: TodoRecord[];
  deadlines: DeadlineRecord[];
  reviewInboxItems: ReviewInboxItem[];
  timeBlocks: TimeBlockRecord[];
  serviceHealthItems: PresenceNotificationServiceHealthItem[];
  now?: Date | string | number;
};

export type NotificationDeliverySuppressionReason =
  | "notifications_disabled"
  | "presence_paused"
  | "presence_quiet"
  | "quiet_window";

const sanitizeDisplayText = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, 120);

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDate = (value: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const plural = (count: number, singular: string, pluralLabel = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralLabel}`;

const safeNow = (now: Date | string | number = new Date()) => {
  const nowDate = now instanceof Date ? now : new Date(now);
  return Number.isNaN(nowDate.getTime()) ? new Date() : nowDate;
};

const candidate = (
  input: Omit<PresenceNotificationCandidate, "createdAt">,
  now: Date
): PresenceNotificationCandidate => ({
  ...input,
  createdAt: now.toISOString(),
});

export const isWithinNotificationQuietWindow = (settings: UiSettings, now = new Date()) => {
  if (!settings.notificationQuietWindowEnabled) {
    return false;
  }
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const start = settings.notificationQuietStartMinutes;
  const end = settings.notificationQuietEndMinutes;
  if (start === end) {
    return true;
  }
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  return currentMinutes >= start || currentMinutes < end;
};

export const notificationDeliverySuppressionReason = ({
  settings,
  presence,
  now = new Date(),
}: {
  settings: UiSettings;
  presence: PresenceSettings;
  now?: Date | string | number;
}): NotificationDeliverySuppressionReason | null => {
  if (!settings.notificationsEnabled) {
    return "notifications_disabled";
  }
  const nowDate = safeNow(now);
  const effectivePresence = resolvePresenceSettings(presence, nowDate);
  if (effectivePresence.mode === "paused") {
    return "presence_paused";
  }
  if (effectivePresence.mode === "quiet_until") {
    return "presence_quiet";
  }
  return isWithinNotificationQuietWindow(settings, nowDate) ? "quiet_window" : null;
};

export const buildPresenceNotificationCandidates = ({
  todos,
  deadlines,
  reviewInboxItems,
  timeBlocks,
  serviceHealthItems,
  now = new Date(),
}: BuildPresenceNotificationCandidatesInput): PresenceNotificationCandidate[] => {
  const nowDate = safeNow(now);
  const todayStart = startOfLocalDay(nowDate);
  const activeTodos = todos.filter((todo) => todo.status !== "completed");
  const activeDeadlines = deadlines.filter((deadline) => deadline.status !== "completed");
  const overdueWork = [
    ...activeTodos.filter((todo) => {
      const dueAt = parseDate(todo.dueAt);
      return dueAt !== null && dueAt.getTime() < todayStart.getTime();
    }).map((todo) => ({ id: todo.id, title: todo.title, dueAt: todo.dueAt, stableId: `todo:${todo.id}` })),
    ...activeDeadlines.filter((deadline) => {
      const dueAt = parseDate(deadline.dueAt);
      return dueAt !== null && dueAt.getTime() < todayStart.getTime();
    }).map((deadline) => ({
      id: deadline.id,
      title: deadline.title,
      dueAt: deadline.dueAt,
      stableId: `deadline:${deadline.id}`,
    })),
  ].sort((left, right) => {
    const leftDue = parseDate(left.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDue = parseDate(right.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue || left.title.localeCompare(right.title);
  });
  const waitingTodos = activeTodos.filter((todo) => todo.waitingOnPersonId);
  const pendingReviewItems = reviewInboxItems.filter((item) => item.status === "pending");
  const missedBlocks = timeBlocks
    .filter((block) => {
      const endsAt = parseDate(block.endsAt);
      return block.status === "planned" && endsAt !== null && endsAt.getTime() < nowDate.getTime();
    })
    .sort((left, right) => Date.parse(left.endsAt) - Date.parse(right.endsAt));
  const attentionServices = serviceHealthItems.filter(
    (item) => item.state === "problem" || item.state === "setup" || item.state === "loading"
  );
  const candidates: PresenceNotificationCandidate[] = [];

  if (overdueWork.length > 0) {
    const first = overdueWork[0];
    candidates.push(
      candidate(
        {
          id: "overdue_work",
          kind: "overdue_work",
          severity: "critical",
          title: "Overdue work needs review",
          body: `${plural(overdueWork.length, "item")} overdue. First: ${sanitizeDisplayText(first.title)}.`,
          targetSurface: "checklist",
          stableId: first.stableId,
          snoozeKey: "overdue_work",
        },
        nowDate
      )
    );
  }

  if (waitingTodos.length > 0) {
    candidates.push(
      candidate(
        {
          id: "waiting_on",
          kind: "waiting_on",
          severity: "warning",
          title: "Waiting-on work is open",
          body: `${plural(waitingTodos.length, "todo")} marked waiting-on.`,
          targetSurface: "checklist",
          stableId: `todo:${waitingTodos[0].id}`,
          snoozeKey: "waiting_on",
        },
        nowDate
      )
    );
  }

  if (pendingReviewItems.length > 0) {
    candidates.push(
      candidate(
        {
          id: "review_inbox",
          kind: "review_inbox",
          severity: "info",
          title: "Review Inbox has candidates",
          body: `${plural(pendingReviewItems.length, "candidate")} waiting for confirmation.`,
          targetSurface: "review_inbox",
          stableId: `review_inbox:${pendingReviewItems[0].id}`,
          snoozeKey: "review_inbox",
        },
        nowDate
      )
    );
  }

  if (missedBlocks.length > 0) {
    candidates.push(
      candidate(
        {
          id: "missed_time_block",
          kind: "missed_time_block",
          severity: "warning",
          title: "Local time block was missed",
          body: `${plural(missedBlocks.length, "planned block")} ended without being completed.`,
          targetSurface: "plan",
          stableId: `time_block:${missedBlocks[0].id}`,
          snoozeKey: "missed_time_block",
        },
        nowDate
      )
    );
  }

  if (attentionServices.length > 0) {
    candidates.push(
      candidate(
        {
          id: "service_attention",
          kind: "service_attention",
          severity: "warning",
          title: "Service attention needed",
          body: `${plural(attentionServices.length, "service")} need setup or recovery.`,
          targetSurface: "settings",
          stableId: "service_health:attention",
          snoozeKey: "service_attention",
        },
        nowDate
      )
    );
  }

  const severityRank: Record<PresenceNotificationSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return candidates.sort(
    (left, right) =>
      severityRank[left.severity] - severityRank[right.severity] ||
      left.title.localeCompare(right.title)
  );
};

export const pruneNotificationSnoozes = (
  snoozes: PresenceNotificationSnoozeState,
  now: Date | string | number = new Date()
): PresenceNotificationSnoozeState => {
  const nowTime = safeNow(now).getTime();
  return Object.fromEntries(
    Object.entries(snoozes).filter(([, snoozedUntil]) => {
      const snoozedUntilTime = Date.parse(snoozedUntil);
      return !Number.isNaN(snoozedUntilTime) && snoozedUntilTime > nowTime;
    })
  );
};

export const filterSnoozedNotificationCandidates = (
  candidates: PresenceNotificationCandidate[],
  snoozes: PresenceNotificationSnoozeState,
  now: Date | string | number = new Date()
) => {
  const activeSnoozes = pruneNotificationSnoozes(snoozes, now);
  return candidates.filter((candidate) => !activeSnoozes[candidate.snoozeKey]);
};

export const snoozeNotificationCandidate = (
  snoozes: PresenceNotificationSnoozeState,
  candidate: PresenceNotificationCandidate,
  durationMinutes: number,
  now: Date | string | number = new Date()
): PresenceNotificationSnoozeState => {
  const nowDate = safeNow(now);
  const snoozedUntil = new Date(
    nowDate.getTime() + Math.max(1, Math.floor(durationMinutes)) * 60 * 1000
  ).toISOString();
  return {
    ...pruneNotificationSnoozes(snoozes, nowDate),
    [candidate.snoozeKey]: snoozedUntil,
  };
};
