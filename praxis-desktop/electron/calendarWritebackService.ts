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

const unsupportedProviderWriter: ProviderCalendarEventWriter = async () => {
  throw new Error(
    "Calendar write-back provider scopes are not configured. Reconnect with write access before publishing."
  );
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

  return buildTimeBlockPublishPreview({
    ...input,
    timeBlocks,
    calendarConnections: settings.calendarConnections,
    existingPublishes,
    appointments: getWorkSnapshot().appointments,
  });
};

export const confirmTimeBlockPublishRequest = async (
  input: TimeBlockPublishConfirmRequest,
  writer: ProviderCalendarEventWriter = unsupportedProviderWriter
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
