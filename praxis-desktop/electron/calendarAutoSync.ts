import type {
  CalendarAutoSyncTrigger,
  CalendarAutoSyncUpdate,
} from "../shared/calendarAutoSync";
import { getPraxisDatabase } from "./praxisDb";
import { syncGoogleCalendar } from "./googleCalendarSync";
import { syncOutlookCalendar } from "./outlookCalendarSync";
import { getCalendarAutoSyncSettings } from "./settingsRepository";

const RECOVERABLE_ERROR_BACKOFF_MS = 5 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;

type ReadyCalendarConnection = {
  id: string;
  provider: "google" | "outlook";
  sync_status: string | null;
  last_synced_at: string | null;
  updated_at: string;
};

let autoSyncInFlight = false;

const recentTimestampAge = (timestamp: string | null) => {
  if (!timestamp) {
    return null;
  }

  const parsed = new Date(timestamp).getTime();
  return Number.isNaN(parsed) ? null : Date.now() - parsed;
};

const autoSyncCooldownMs = () => {
  const settings = getCalendarAutoSyncSettings();
  return Math.max(0, settings.intervalMinutes * ONE_MINUTE_MS - ONE_MINUTE_MS);
};

const shouldAutoSync = (connection: ReadyCalendarConnection, force: boolean) => {
  if (force) {
    return true;
  }

  if (connection.sync_status === "error") {
    const errorAge = recentTimestampAge(connection.updated_at);
    if (errorAge !== null && errorAge < RECOVERABLE_ERROR_BACKOFF_MS) {
      return false;
    }
  }

  if (!connection.last_synced_at) {
    return true;
  }

  const syncedAge = recentTimestampAge(connection.last_synced_at);
  if (syncedAge === null) {
    return true;
  }

  return syncedAge > autoSyncCooldownMs();
};

const getReadyCalendarConnections = (force: boolean) =>
  (
    getPraxisDatabase()
      .prepare(
        `SELECT id, provider, sync_status, last_synced_at, updated_at
         FROM calendar_connections
         WHERE enabled = 1
           AND auth_status = 'ready'
           AND provider IN ('google', 'outlook')`
      )
      .all() as ReadyCalendarConnection[]
  ).filter((connection) => shouldAutoSync(connection, force));

const syncConnection = async (
  connection: ReadyCalendarConnection,
  triggeredBy: CalendarAutoSyncTrigger
): Promise<CalendarAutoSyncUpdate> => {
  const result =
    connection.provider === "google"
      ? await syncGoogleCalendar({ connectionId: connection.id })
      : await syncOutlookCalendar({ connectionId: connection.id });

  return {
    provider: connection.provider,
    connectionId: connection.id,
    ok: result.ok,
    message: result.message,
    fetched: result.fetched,
    imported: result.imported,
    updated: result.updated,
    skipped: result.skipped,
    triggeredBy,
    syncedAt: new Date().toISOString(),
  };
};

export const autoSyncReadyCalendars = async (
  triggeredBy: CalendarAutoSyncTrigger,
  onUpdate?: (update: CalendarAutoSyncUpdate) => void,
  options: { force?: boolean } = {}
) => {
  if (autoSyncInFlight) {
    return [];
  }

  const settings = getCalendarAutoSyncSettings();
  if (!settings.enabled && !options.force && triggeredBy !== "user_request") {
    return [];
  }

  autoSyncInFlight = true;
  try {
    const connections = getReadyCalendarConnections(options.force ?? false);
    const updates: CalendarAutoSyncUpdate[] = [];

    for (const connection of connections) {
      const update = await syncConnection(connection, triggeredBy);
      updates.push(update);
      onUpdate?.(update);
    }

    return updates;
  } finally {
    autoSyncInFlight = false;
  }
};

export const autoSyncCalendarConnection = async (
  provider: ReadyCalendarConnection["provider"],
  connectionId: string,
  triggeredBy: CalendarAutoSyncTrigger,
  onUpdate?: (update: CalendarAutoSyncUpdate) => void
) => {
  const row = getPraxisDatabase()
    .prepare(
      `SELECT id, provider, sync_status, last_synced_at, updated_at
       FROM calendar_connections
       WHERE id = ?
         AND provider = ?
         AND enabled = 1
         AND auth_status = 'ready'`
    )
    .get(connectionId, provider) as ReadyCalendarConnection | undefined;

  if (!row) {
    return null;
  }

  const update = await syncConnection(row, triggeredBy);
  onUpdate?.(update);
  return update;
};
