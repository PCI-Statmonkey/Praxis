import type { CompanionSnapshot } from "./companionSnapshot";
import {
  buildPresenceDisplayStatus,
  type PresenceDisplayState,
} from "./presenceStatus";
import type { PresenceSettings } from "./settingsModel";

export type RainmeterSnapshot = {
  schemaVersion: "praxis.rainmeter.v1";
  version: 1;
  generatedAt: string;
  localDate: string;
  capability: {
    readOnly: true;
    commandsAccepted: false;
    directStorageAccess: false;
  };
  presence: {
    state: PresenceDisplayState;
    label: string;
    detail: string;
  };
  topMove: {
    title: string;
    kind: string;
    priority: string | null;
  } | null;
  counts: {
    reviewInbox: number;
    overdue: number;
    dueToday: number;
    waiting: number;
    localBlocksToday: number;
  };
  calendar: {
    nextAppointmentTitle: string | null;
    nextAppointmentStartsAt: string | null;
  };
  serviceHealth: {
    state: "ready" | "attention";
    label: string;
    detail: string;
    attentionCount: number;
  };
  skin: {
    presenceLabel: string;
    presenceDetail: string;
    topMoveTitle: string;
    topMoveKind: string;
    topMovePriority: string;
    reviewInboxCount: number;
    overdueCount: number;
    dueTodayCount: number;
    waitingCount: number;
    localBlocksTodayCount: number;
    nextAppointmentTitle: string;
    nextAppointmentStartsAt: string;
    serviceHealthLabel: string;
    serviceHealthDetail: string;
    attentionCount: number;
  };
};

export type RainmeterSnapshotExportResult = {
  ok: true;
  path: string;
  snapshot: RainmeterSnapshot;
};

export type BuildRainmeterSnapshotInput = {
  companionSnapshot: CompanionSnapshot;
  presence: PresenceSettings;
  localBlocksToday?: number;
  now?: Date | string | number;
};

const sanitizeDisplayText = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, 140);

const dayDelta = (value: string | null, now: Date) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
};

const integrationNeedsAttention = (integration: CompanionSnapshot["integrations"][number]) =>
  integration.enabled &&
  (integration.authStatus !== "ready" ||
    integration.syncStatus === "blocked" ||
    integration.syncStatus === "error");

const serviceHealthLabel = (attentionCount: number) =>
  attentionCount > 0 ? "Attention needed" : "Services ready";

const serviceHealthDetail = (attentionCount: number) =>
  attentionCount > 0
    ? `${attentionCount} service${attentionCount === 1 ? "" : "s"} need attention.`
    : "Connected services look ready.";

export const buildRainmeterSnapshot = ({
  companionSnapshot,
  presence,
  localBlocksToday = 0,
  now = new Date(),
}: BuildRainmeterSnapshotInput): RainmeterSnapshot => {
  const nowDate = now instanceof Date ? now : new Date(now);
  const safeNow = Number.isNaN(nowDate.getTime()) ? new Date() : nowDate;
  const workItems = companionSnapshot.today.workItems;
  const overdue = workItems.filter((item) => {
    const delta = dayDelta(item.dueAt, safeNow);
    return delta !== null && delta < 0;
  }).length;
  const dueToday = workItems.filter((item) => dayDelta(item.dueAt, safeNow) === 0).length;
  const attentionCount = companionSnapshot.integrations.filter(integrationNeedsAttention).length;
  const nextAppointment = companionSnapshot.today.appointments[0] ?? null;
  const topMove = companionSnapshot.topMove;
  const presenceSummary = buildPresenceDisplayStatus({
    presence,
    serviceAttentionCount: attentionCount,
    now: safeNow,
  });
  const topMoveSummary = topMove
    ? {
        title: sanitizeDisplayText(topMove.title),
        kind: topMove.entityKind,
        priority: "priority" in topMove ? topMove.priority : null,
      }
    : null;
  const calendar = {
    nextAppointmentTitle: nextAppointment ? sanitizeDisplayText(nextAppointment.title) : null,
    nextAppointmentStartsAt: nextAppointment?.startsAt ?? null,
  };
  const serviceHealth = {
    state: attentionCount > 0 ? ("attention" as const) : ("ready" as const),
    label: serviceHealthLabel(attentionCount),
    detail: serviceHealthDetail(attentionCount),
    attentionCount,
  };

  return {
    schemaVersion: "praxis.rainmeter.v1",
    version: 1,
    generatedAt: safeNow.toISOString(),
    localDate: companionSnapshot.localDate,
    capability: {
      readOnly: true,
      commandsAccepted: false,
      directStorageAccess: false,
    },
    presence: presenceSummary,
    topMove: topMoveSummary,
    counts: {
      reviewInbox: companionSnapshot.inbox.pendingEmailFollowUpCount,
      overdue,
      dueToday,
      waiting: companionSnapshot.summary.waitingOnCount,
      localBlocksToday,
    },
    calendar,
    serviceHealth,
    skin: {
      presenceLabel: presenceSummary.label,
      presenceDetail: presenceSummary.detail,
      topMoveTitle: topMoveSummary?.title ?? "",
      topMoveKind: topMoveSummary?.kind ?? "",
      topMovePriority: topMoveSummary?.priority ?? "",
      reviewInboxCount: companionSnapshot.inbox.pendingEmailFollowUpCount,
      overdueCount: overdue,
      dueTodayCount: dueToday,
      waitingCount: companionSnapshot.summary.waitingOnCount,
      localBlocksTodayCount: localBlocksToday,
      nextAppointmentTitle: calendar.nextAppointmentTitle ?? "",
      nextAppointmentStartsAt: calendar.nextAppointmentStartsAt ?? "",
      serviceHealthLabel: serviceHealth.label,
      serviceHealthDetail: serviceHealth.detail,
      attentionCount,
    },
  };
};
