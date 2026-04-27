import type { EmailAutoSyncTrigger, EmailAutoSyncUpdate } from "../shared/emailAutoSync";
import { getPraxisDatabase } from "./praxisDb";
import { syncGmailInbox } from "./gmailEmailSync";
import { syncOutlookInbox } from "./outlookEmailSync";

const AUTO_SYNC_COOLDOWN_MS = 29 * 60 * 1000;
const RECOVERABLE_ERROR_BACKOFF_MS = 5 * 60 * 1000;

type ReadyEmailConnection = {
  id: string;
  provider: "gmail" | "outlook";
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

const shouldAutoSync = (connection: ReadyEmailConnection, force: boolean) => {
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

  return syncedAge > AUTO_SYNC_COOLDOWN_MS;
};

const getReadyEmailConnections = (force: boolean) =>
  (
    getPraxisDatabase()
      .prepare(
        `SELECT id, provider, sync_status, last_synced_at, updated_at
         FROM email_connections
         WHERE enabled = 1
           AND auth_status = 'ready'
           AND provider IN ('gmail', 'outlook')`
      )
      .all() as ReadyEmailConnection[]
  ).filter((connection) => shouldAutoSync(connection, force));

const syncConnection = async (
  connection: ReadyEmailConnection,
  triggeredBy: EmailAutoSyncTrigger
): Promise<EmailAutoSyncUpdate> => {
  const result =
    connection.provider === "outlook"
      ? await syncOutlookInbox({ connectionId: connection.id })
      : await syncGmailInbox({ connectionId: connection.id });

  return {
    provider: connection.provider,
    connectionId: connection.id,
    ok: result.ok,
    message: result.message,
    fetched: result.fetched,
    imported: result.imported,
    updated: result.updated,
    suggestionsCreated: result.suggestionsCreated,
    skipped: result.skipped,
    triggeredBy,
    syncedAt: new Date().toISOString(),
  };
};

export const autoSyncReadyEmailConnections = async (
  triggeredBy: EmailAutoSyncTrigger,
  onUpdate?: (update: EmailAutoSyncUpdate) => void,
  options: { force?: boolean } = {}
) => {
  if (autoSyncInFlight) {
    return [];
  }

  autoSyncInFlight = true;
  try {
    const connections = getReadyEmailConnections(options.force ?? false);
    const updates: EmailAutoSyncUpdate[] = [];

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

export const autoSyncEmailConnection = async (
  provider: ReadyEmailConnection["provider"],
  connectionId: string,
  triggeredBy: EmailAutoSyncTrigger,
  onUpdate?: (update: EmailAutoSyncUpdate) => void
) => {
  const row = getPraxisDatabase()
    .prepare(
      `SELECT id, provider, sync_status, last_synced_at, updated_at
       FROM email_connections
       WHERE id = ?
         AND provider = ?
         AND enabled = 1
         AND auth_status = 'ready'`
    )
    .get(connectionId, provider) as ReadyEmailConnection | undefined;

  if (!row) {
    return null;
  }

  const update = await syncConnection(row, triggeredBy);
  onUpdate?.(update);
  return update;
};
