import {
  buildTimeBlockPublishPreview,
  confirmTimeBlockPublish,
  type ProviderCalendarEventWriter,
  type TimeBlockPublishConfirmRequest,
  type TimeBlockPublishPreview,
  type TimeBlockPublishPreviewRequest,
} from "../shared/calendarWriteback";
import { getSettingsSnapshot } from "./settingsRepository";
import { getTimeBlockSnapshot } from "./timeBlockRepository";
import {
  listTimeBlockPublishes,
  storeTimeBlockPublish,
} from "./timeBlockPublishRepository";
import { getWorkSnapshot } from "./workRepository";
import {
  createGoogleCalendarEvent,
  googleCalendarHasWriteScope,
} from "./googleCalendarSync";
import {
  createOutlookCalendarEvent,
  outlookCalendarHasWriteScope,
} from "./outlookCalendarSync";

const providerWriter: ProviderCalendarEventWriter = async ({
  provider,
  calendarConnectionId,
  providerCalendarId,
  event,
}) => {
  if (provider === "google") {
    return createGoogleCalendarEvent({
      connectionId: calendarConnectionId,
      calendarId: providerCalendarId,
      event,
    });
  }
  return createOutlookCalendarEvent({
    connectionId: calendarConnectionId,
    calendarId: providerCalendarId,
    event,
  });
};

const hasWriteScope = (provider: "google" | "outlook", connectionId: string) => {
  if (provider === "google") {
    return googleCalendarHasWriteScope(connectionId);
  }
  return outlookCalendarHasWriteScope(connectionId);
};

const applyWriteScopeReadiness = (preview: TimeBlockPublishPreview): TimeBlockPublishPreview => {
  if (!preview.provider || hasWriteScope(preview.provider, preview.calendarConnectionId)) {
    return preview;
  }
  const reason =
    preview.provider === "google"
      ? "Google Calendar write access is missing. Refresh sign-in in Settings before publishing local blocks."
      : "Outlook Calendar write access is missing. Refresh sign-in in Settings before publishing local blocks.";
  const items = preview.items.map((item) =>
    item.status === "ready"
      ? {
          ...item,
          status: "connection_not_ready" as const,
          reason,
          eventDraft: null,
        }
      : item
  );
  return {
    ...preview,
    readyCount: 0,
    blockedCount: items.length,
    items,
  };
};

export const previewTimeBlockPublish = (
  input: TimeBlockPublishPreviewRequest
): TimeBlockPublishPreview => {
  const settings = getSettingsSnapshot();
  const timeBlocks = getTimeBlockSnapshot().timeBlocks;
  const existingPublishes = listTimeBlockPublishes({
    timeBlockIds: input.selectedTimeBlockIds,
    provider: input.provider === "google" || input.provider === "outlook" ? input.provider : undefined,
    calendarConnectionId: input.calendarConnectionId,
  });

  return applyWriteScopeReadiness(buildTimeBlockPublishPreview({
    ...input,
    timeBlocks,
    calendarConnections: settings.calendarConnections,
    existingPublishes,
    appointments: getWorkSnapshot().appointments,
  }));
};

export const confirmTimeBlockPublishRequest = async (
  input: TimeBlockPublishConfirmRequest,
  writer: ProviderCalendarEventWriter = providerWriter
) => {
  const preview = previewTimeBlockPublish(input);
  const result = await confirmTimeBlockPublish(
    {
      preview,
      confirmedTimeBlockIds: input.confirmedTimeBlockIds,
    },
    writer
  );

  for (const item of result.results) {
    if (item.record && item.status === "published") {
      storeTimeBlockPublish(item.record);
    }
  }

  return result;
};
