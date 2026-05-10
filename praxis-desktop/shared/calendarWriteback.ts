import type { CalendarConnectionRecord, CalendarProvider } from "./settingsModel";
import type { TimeBlockRecord } from "./timeBlocking";
import type { AppointmentRecord } from "./workModel";

export type TimeBlockPublishProvider = Extract<CalendarProvider, "google" | "outlook">;

export type TimeBlockPublishStatus =
  | "published"
  | "publish_failed"
  | "deleted_remote"
  | "stale_local";

export type TimeBlockPublishRecord = {
  id: string;
  timeBlockId: string;
  provider: TimeBlockPublishProvider;
  calendarConnectionId: string;
  providerCalendarId: string;
  providerEventId: string | null;
  status: TimeBlockPublishStatus;
  lastPublishedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderEventDraft = {
  title: string;
  startsAt: string;
  endsAt: string;
  body: string;
  localTimeBlockId: string;
};

export type TimeBlockPublishPreviewStatus =
  | "ready"
  | "missing_block"
  | "unsupported_provider"
  | "connection_not_ready"
  | "not_planned"
  | "already_published"
  | "conflict";

export type TimeBlockPublishPreviewItem = {
  timeBlockId: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  status: TimeBlockPublishPreviewStatus;
  reason: string;
  provider: TimeBlockPublishProvider;
  calendarConnectionId: string;
  providerCalendarId: string;
  eventDraft: ProviderEventDraft | null;
  conflictIds: string[];
  existingPublishId: string | null;
};

export type BuildTimeBlockPublishPreviewInput = {
  selectedTimeBlockIds: string[];
  provider: CalendarProvider;
  calendarConnectionId: string;
  providerCalendarId?: string | null;
  timeBlocks: TimeBlockRecord[];
  calendarConnections: CalendarConnectionRecord[];
  existingPublishes?: TimeBlockPublishRecord[];
  appointments?: AppointmentRecord[];
};

export type TimeBlockPublishPreviewRequest = {
  selectedTimeBlockIds: string[];
  provider: CalendarProvider;
  calendarConnectionId: string;
  providerCalendarId?: string | null;
};

export type TimeBlockPublishPreview = {
  writeBoundary: "requires_user_confirmation";
  provider: TimeBlockPublishProvider | null;
  calendarConnectionId: string;
  providerCalendarId: string | null;
  readyCount: number;
  blockedCount: number;
  items: TimeBlockPublishPreviewItem[];
};

export type ConfirmTimeBlockPublishInput = {
  preview: TimeBlockPublishPreview;
  confirmedTimeBlockIds: string[];
  now?: string;
};

export type TimeBlockPublishConfirmRequest = TimeBlockPublishPreviewRequest & {
  confirmedTimeBlockIds: string[];
};

export type ProviderCalendarEventWriter = (input: {
  provider: TimeBlockPublishProvider;
  calendarConnectionId: string;
  providerCalendarId: string;
  event: ProviderEventDraft;
}) => Promise<{ providerEventId: string }>;

export type ConfirmedTimeBlockPublish = {
  timeBlockId: string;
  provider: TimeBlockPublishProvider;
  calendarConnectionId: string;
  providerCalendarId: string;
  providerEventId: string | null;
  status: "published" | "skipped" | "failed";
  reason: string;
  record: Omit<TimeBlockPublishRecord, "id" | "createdAt" | "updatedAt"> | null;
};

export type ConfirmTimeBlockPublishResult = {
  writeBoundary: "explicit_confirmation";
  publishedCount: number;
  skippedCount: number;
  failedCount: number;
  results: ConfirmedTimeBlockPublish[];
};

const supportedProviders = new Set<CalendarProvider>(["google", "outlook"]);

const isSupportedProvider = (provider: CalendarProvider): provider is TimeBlockPublishProvider =>
  supportedProviders.has(provider);

const overlap = (
  left: { startsAt: string; endsAt: string | null },
  right: { startsAt: string; endsAt: string | null }
) => {
  if (!left.endsAt || !right.endsAt) {
    return false;
  }
  const leftStart = Date.parse(left.startsAt);
  const leftEnd = Date.parse(left.endsAt);
  const rightStart = Date.parse(right.startsAt);
  const rightEnd = Date.parse(right.endsAt);
  if ([leftStart, leftEnd, rightStart, rightEnd].some(Number.isNaN)) {
    return false;
  }
  return leftStart < rightEnd && leftEnd > rightStart;
};

const safeProviderError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.trim()) {
    return "Provider publish failed.";
  }
  if (/(token|secret|authorization|bearer|encrypted|payload|refresh)/i.test(message)) {
    return "Provider publish failed. Reconnect or check calendar write access.";
  }
  return message;
};

export const buildProviderEventDraft = (block: TimeBlockRecord): ProviderEventDraft => ({
  title: block.title,
  startsAt: block.startsAt,
  endsAt: block.endsAt,
  localTimeBlockId: block.id,
  body: [
    "Created by PRAXIS.",
    `PRAXIS local time block: ${block.id}`,
    block.entityKind !== "manual" && block.entityId
      ? `Linked ${block.entityKind}: ${block.entityId}`
      : null,
    block.notes ? `Notes: ${block.notes}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n"),
});

export const buildTimeBlockPublishPreview = ({
  selectedTimeBlockIds,
  provider,
  calendarConnectionId,
  providerCalendarId,
  timeBlocks,
  calendarConnections,
  existingPublishes = [],
  appointments = [],
}: BuildTimeBlockPublishPreviewInput): TimeBlockPublishPreview => {
  const supportedProvider = isSupportedProvider(provider) ? provider : null;
  const connection = calendarConnections.find((candidate) => candidate.id === calendarConnectionId);
  const resolvedProviderCalendarId = providerCalendarId?.trim() || connection?.accountRef || "primary";
  const items = selectedTimeBlockIds.map((timeBlockId): TimeBlockPublishPreviewItem => {
    const base = {
      timeBlockId,
      title: "Missing local time block",
      startsAt: null,
      endsAt: null,
      provider: supportedProvider ?? "google",
      calendarConnectionId,
      providerCalendarId: resolvedProviderCalendarId,
      eventDraft: null,
      conflictIds: [],
      existingPublishId: null,
    };

    if (!supportedProvider) {
      return {
        ...base,
        status: "unsupported_provider",
        reason: "Provider write-back currently supports Google and Outlook calendar connections.",
      };
    }

    if (
      !connection ||
      connection.provider !== supportedProvider ||
      !connection.enabled ||
      connection.authStatus !== "ready"
    ) {
      return {
        ...base,
        provider: supportedProvider,
        status: "connection_not_ready",
        reason: "Calendar connection is not ready for explicit publish.",
      };
    }

    const block = timeBlocks.find((candidate) => candidate.id === timeBlockId);
    if (!block) {
      return {
        ...base,
        provider: supportedProvider,
        status: "missing_block",
        reason: "Selected local time block no longer exists.",
      };
    }

    const existingPublish = existingPublishes.find(
      (publish) =>
        publish.timeBlockId === block.id &&
        publish.provider === supportedProvider &&
        publish.calendarConnectionId === calendarConnectionId &&
        publish.status === "published"
    );
    const conflictIds = appointments
      .filter((appointment) => overlap(block, appointment))
      .map((appointment) => appointment.id);
    const readyBase = {
      ...base,
      title: block.title,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
      provider: supportedProvider,
      eventDraft: buildProviderEventDraft(block),
      conflictIds,
      existingPublishId: existingPublish?.id ?? null,
    };

    if (block.source !== "local" || block.status !== "planned") {
      return {
        ...readyBase,
        status: "not_planned",
        reason: "Only planned local time blocks can be published.",
      };
    }
    if (existingPublish) {
      return {
        ...readyBase,
        status: "already_published",
        reason: "This local time block already has a published provider event.",
      };
    }
    if (conflictIds.length > 0) {
      return {
        ...readyBase,
        status: "conflict",
        reason: "This block overlaps imported calendar pressure. Review before publishing.",
      };
    }

    return {
      ...readyBase,
      status: "ready",
      reason: "Ready to publish after explicit confirmation.",
    };
  });

  const readyCount = items.filter((item) => item.status === "ready").length;
  return {
    writeBoundary: "requires_user_confirmation",
    provider: supportedProvider,
    calendarConnectionId,
    providerCalendarId: supportedProvider ? resolvedProviderCalendarId : null,
    readyCount,
    blockedCount: items.length - readyCount,
    items,
  };
};

export const confirmTimeBlockPublish = async (
  input: ConfirmTimeBlockPublishInput,
  writeProviderEvent: ProviderCalendarEventWriter
): Promise<ConfirmTimeBlockPublishResult> => {
  const confirmed = new Set(input.confirmedTimeBlockIds);
  const timestamp = input.now ?? new Date().toISOString();
  const results: ConfirmedTimeBlockPublish[] = [];

  for (const item of input.preview.items) {
    if (!confirmed.has(item.timeBlockId)) {
      continue;
    }
    if (item.status !== "ready" || !item.eventDraft || !input.preview.provider) {
      results.push({
        timeBlockId: item.timeBlockId,
        provider: item.provider,
        calendarConnectionId: item.calendarConnectionId,
        providerCalendarId: item.providerCalendarId,
        providerEventId: null,
        status: "skipped",
        reason: item.reason,
        record: null,
      });
      continue;
    }

    try {
      const created = await writeProviderEvent({
        provider: input.preview.provider,
        calendarConnectionId: item.calendarConnectionId,
        providerCalendarId: item.providerCalendarId,
        event: item.eventDraft,
      });
      results.push({
        timeBlockId: item.timeBlockId,
        provider: input.preview.provider,
        calendarConnectionId: item.calendarConnectionId,
        providerCalendarId: item.providerCalendarId,
        providerEventId: created.providerEventId,
        status: "published",
        reason: "Provider event created.",
        record: {
          timeBlockId: item.timeBlockId,
          provider: input.preview.provider,
          calendarConnectionId: item.calendarConnectionId,
          providerCalendarId: item.providerCalendarId,
          providerEventId: created.providerEventId,
          status: "published",
          lastPublishedAt: timestamp,
          lastError: null,
        },
      });
    } catch (error) {
      results.push({
        timeBlockId: item.timeBlockId,
        provider: input.preview.provider,
        calendarConnectionId: item.calendarConnectionId,
        providerCalendarId: item.providerCalendarId,
        providerEventId: null,
        status: "failed",
        reason: safeProviderError(error),
        record: {
          timeBlockId: item.timeBlockId,
          provider: input.preview.provider,
          calendarConnectionId: item.calendarConnectionId,
          providerCalendarId: item.providerCalendarId,
          providerEventId: null,
          status: "publish_failed",
          lastPublishedAt: null,
          lastError: safeProviderError(error),
        },
      });
    }
  }

  return {
    writeBoundary: "explicit_confirmation",
    publishedCount: results.filter((result) => result.status === "published").length,
    skippedCount: results.filter((result) => result.status === "skipped").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    results,
  };
};
