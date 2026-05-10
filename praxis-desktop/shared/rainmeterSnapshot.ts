import type { CompanionSnapshot } from "./companionSnapshot";
import type { PresenceSettings } from "./settingsModel";
import { resolvePresenceSettings } from "./settingsModel";

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
    state: PresenceSettings["mode"];
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

const presenceLabel = (presence: PresenceSettings) => {
  if (presence.mode === "paused") {
    return "PRAXIS paused";
  }
  if (presence.mode === "quiet_until") {
    return "PRAXIS quiet";
  }
  return "PRAXIS active";
};

const presenceDetail = (presence: PresenceSettings) => {
  if (presence.mode === "paused") {
    return "Nudges paused; sync can stay active.";
  }
  if (presence.mode === "quiet_until" && presence.quietUntil) {
    return `Quiet until ${presence.quietUntil}.`;
  }
  return "Plan, review, and context are available.";
};

const integrationNeedsAttention = (integration: CompanionSnapshot["integrations"][number]) =>
  integration.enabled &&
  (integration.authStatus !== "ready" ||
    integration.syncStatus === "blocked" ||
    integration.syncStatus === "error");

export const buildRainmeterSnapshot = ({
  companionSnapshot,
  presence,
  localBlocksToday = 0,
  now = new Date(),
}: BuildRainmeterSnapshotInput): RainmeterSnapshot => {
  const nowDate = now instanceof Date ? now : new Date(now);
  const safeNow = Number.isNaN(nowDate.getTime()) ? new Date() : nowDate;
  const effectivePresence = resolvePresenceSettings(presence, safeNow);
  const workItems = companionSnapshot.today.workItems;
  const overdue = workItems.filter((item) => {
    const delta = dayDelta(item.dueAt, safeNow);
    return delta !== null && delta < 0;
  }).length;
  const dueToday = workItems.filter((item) => dayDelta(item.dueAt, safeNow) === 0).length;
  const attentionCount = companionSnapshot.integrations.filter(integrationNeedsAttention).length;
  const nextAppointment = companionSnapshot.today.appointments[0] ?? null;
  const topMove = companionSnapshot.topMove;

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
    presence: {
      state: effectivePresence.mode,
      label: presenceLabel(effectivePresence),
      detail: presenceDetail(effectivePresence),
    },
    topMove: topMove
      ? {
          title: sanitizeDisplayText(topMove.title),
          kind: topMove.entityKind,
          priority: "priority" in topMove ? topMove.priority : null,
        }
      : null,
    counts: {
      reviewInbox: companionSnapshot.inbox.pendingEmailFollowUpCount,
      overdue,
      dueToday,
      waiting: companionSnapshot.summary.waitingOnCount,
      localBlocksToday,
    },
    calendar: {
      nextAppointmentTitle: nextAppointment ? sanitizeDisplayText(nextAppointment.title) : null,
      nextAppointmentStartsAt: nextAppointment?.startsAt ?? null,
    },
    serviceHealth: {
      state: attentionCount > 0 ? "attention" : "ready",
      attentionCount,
    },
  };
};
