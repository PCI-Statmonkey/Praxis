export type CalendarAutoSyncSettings = {
  enabled: boolean;
  intervalMinutes: number;
};

export type UpdateCalendarAutoSyncSettingsInput = {
  enabled?: boolean;
  intervalMinutes?: number;
};

export const DEFAULT_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES = 30;
export const MIN_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES = 5;
export const MAX_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES = 24 * 60;

export const DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS: CalendarAutoSyncSettings = {
  enabled: true,
  intervalMinutes: DEFAULT_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES,
};

export const normalizeCalendarAutoSyncSettings = (
  input: Partial<CalendarAutoSyncSettings | UpdateCalendarAutoSyncSettingsInput> = {},
  fallback: CalendarAutoSyncSettings = DEFAULT_CALENDAR_AUTO_SYNC_SETTINGS
): CalendarAutoSyncSettings => {
  const rawInterval =
    typeof input.intervalMinutes === "number" && Number.isFinite(input.intervalMinutes)
      ? input.intervalMinutes
      : fallback.intervalMinutes;
  const roundedInterval = Math.round(rawInterval);
  const intervalMinutes = Math.min(
    MAX_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES,
    Math.max(MIN_CALENDAR_AUTO_SYNC_INTERVAL_MINUTES, roundedInterval)
  );

  return {
    enabled: typeof input.enabled === "boolean" ? input.enabled : fallback.enabled,
    intervalMinutes,
  };
};
