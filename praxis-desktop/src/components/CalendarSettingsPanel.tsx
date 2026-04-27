import type { FormEvent } from "react";
import type { CalendarImportSource } from "../../shared/calendarImport";
import type { CalendarOAuthReadiness } from "../../shared/calendarOAuth";
import type {
  CalendarAuthStatus,
  CalendarProvider,
  CalendarSyncStatus,
  CreateCalendarConnectionInput,
  SettingsSnapshot,
  UpdateCalendarAutoSyncSettingsInput,
  UpdateGoogleOAuthSettingsInput,
} from "../../shared/settingsModel";

const CALENDAR_PROVIDERS: CalendarProvider[] = ["google", "outlook", "other"];

const CALENDAR_AUTH_LABELS: Record<CalendarAuthStatus, string> = {
  not_configured: "not configured",
  needs_credentials: "needs credentials",
  ready: "ready",
  error: "auth error",
};

const CALENDAR_SYNC_LABELS: Record<CalendarSyncStatus, string> = {
  manual_import_only: "manual import only",
  blocked: "sync blocked",
  ready_to_sync: "ready to sync",
  syncing: "syncing",
  error: "sync error",
};

const syncLabelFor = (connection: { syncStatus: CalendarSyncStatus; lastSyncedAt: string | null }) =>
  connection.lastSyncedAt && connection.syncStatus === "ready_to_sync"
    ? "synced"
    : CALENDAR_SYNC_LABELS[connection.syncStatus];

type CalendarSettingsPanelProps = {
  section?: "google" | "ics" | "events";
  settingsSnapshot: SettingsSnapshot;
  googleOAuthReadiness: CalendarOAuthReadiness;
  outlookOAuthReadiness: CalendarOAuthReadiness;
  calendarForm: CreateCalendarConnectionInput;
  calendarAutoSyncForm: UpdateCalendarAutoSyncSettingsInput;
  googleOAuthForm: UpdateGoogleOAuthSettingsInput;
  calendarImportSource: CalendarImportSource;
  calendarImportText: string;
  formatDateTime: (value: string | null) => string;
  setCalendarForm: (form: CreateCalendarConnectionInput) => void;
  setCalendarAutoSyncForm: (form: UpdateCalendarAutoSyncSettingsInput) => void;
  setGoogleOAuthForm: (form: UpdateGoogleOAuthSettingsInput) => void;
  setCalendarImportSource: (source: CalendarImportSource) => void;
  setCalendarImportText: (text: string) => void;
  createCalendarConnection: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createGoogleCalendarConnection?: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateCalendarAutoSync: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateGoogleOAuthSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteCalendarConnection: (id: string) => Promise<void>;
  prepareGoogleOAuth: (connectionId: string) => Promise<void>;
  prepareOutlookOAuth: (connectionId: string) => Promise<void>;
  syncGoogleCalendar: (connectionId: string) => Promise<void>;
  syncOutlookCalendar: (connectionId: string) => Promise<void>;
  importIcsCalendar: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  importCalendarJson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function CalendarSettingsPanel({
  section = "events",
  settingsSnapshot,
  googleOAuthReadiness,
  outlookOAuthReadiness,
  calendarForm,
  calendarAutoSyncForm,
  googleOAuthForm,
  calendarImportSource,
  calendarImportText,
  formatDateTime,
  setCalendarForm,
  setCalendarAutoSyncForm,
  setGoogleOAuthForm,
  setCalendarImportSource,
  setCalendarImportText,
  createCalendarConnection,
  createGoogleCalendarConnection,
  updateCalendarAutoSync,
  updateGoogleOAuthSettings,
  deleteCalendarConnection,
  prepareGoogleOAuth,
  prepareOutlookOAuth,
  syncGoogleCalendar,
  syncOutlookCalendar,
  importIcsCalendar,
  importCalendarJson,
}: CalendarSettingsPanelProps) {
  const googleConnections = settingsSnapshot.calendarConnections.filter(
    (connection) => connection.provider === "google"
  );
  const primaryGoogleConnection = googleConnections[0] ?? null;

  if (section === "google") {
    return (
      <>
        <h3>Google Calendar Integration</h3>
        <p>
          Connect Google after the OAuth client ID is saved. Leave the calendar ID blank for your
          primary Google calendar.
        </p>
        <article className="brief-card">
          <h4>Google Setup Status</h4>
          <p>
            Secret storage:{" "}
            <span className={settingsSnapshot.secretStorage.available ? "badge" : "badge urgent-badge"}>
              {settingsSnapshot.secretStorage.available ? "available" : "unavailable"}
            </span>
            <span className="badge">{settingsSnapshot.secretStorage.provider}</span>
            <span className="badge">{settingsSnapshot.secretStorage.reason}</span>
          </p>
          <p>
            Google OAuth:{" "}
            <span className={googleOAuthReadiness.ready ? "badge" : "badge urgent-badge"}>
              {googleOAuthReadiness.ready ? "ready to authorize" : "setup needed"}
            </span>
            <span className="badge">redirect: {googleOAuthReadiness.redirectUri}</span>
            <span className="badge">
              client ID: {settingsSnapshot.googleOAuth.clientId ? "saved" : "not saved"}
            </span>
            <span className="badge">
              client secret:{" "}
              {settingsSnapshot.googleOAuth.clientSecretConfigured ? "saved" : "not saved"}
            </span>
            {googleOAuthReadiness.missing.length > 0 ? (
              <span className="badge urgent-badge">
                missing: {googleOAuthReadiness.missing.join(", ")}
              </span>
            ) : null}
          </p>
        </article>

        <article className="settings-next-action">
          <h4>Next Action</h4>
          {primaryGoogleConnection ? (
            <>
              <p>
                Authorize <strong>{primaryGoogleConnection.label}</strong> with Google, then sync
                events into Praxis.
              </p>
              <div className="settings-next-action-buttons">
                <button
                  type="button"
                  className="primary-action-button"
                  onClick={() => void prepareGoogleOAuth(primaryGoogleConnection.id)}
                >
                  Connect Google
                </button>
                <button
                  type="button"
                  disabled={primaryGoogleConnection.authStatus !== "ready"}
                  onClick={() => void syncGoogleCalendar(primaryGoogleConnection.id)}
                >
                  Sync Google Events
                </button>
              </div>
              <p className="brief-path">
                Current status: {CALENDAR_AUTH_LABELS[primaryGoogleConnection.authStatus]}; sync:{" "}
                {syncLabelFor(primaryGoogleConnection)}.
                {primaryGoogleConnection.lastSyncedAt
                  ? ` Last synced: ${formatDateTime(primaryGoogleConnection.lastSyncedAt)}.`
                  : ""}
              </p>
            </>
          ) : (
            <p>No Google calendar row exists yet. Add one below, then connect it.</p>
          )}
        </article>

        <h4>Connect Saved Google Calendars</h4>
        {googleConnections.length > 0 ? (
          <ul>
            {googleConnections.map((connection) => (
              <li key={connection.id} className="item">
                {connection.label}
                <span className="badge">{connection.enabled ? "enabled" : "disabled"}</span>
                <span className="badge">{CALENDAR_AUTH_LABELS[connection.authStatus]}</span>
                <span className="badge">{syncLabelFor(connection)}</span>
                <span className="badge">
                  calendar ID: {connection.accountRef ? connection.accountRef : "primary/default"}
                </span>
                {connection.lastSyncedAt ? (
                  <span className="badge">last sync: {formatDateTime(connection.lastSyncedAt)}</span>
                ) : null}
                {connection.lastSyncError ? (
                  <span className="badge urgent-badge">{connection.lastSyncError}</span>
                ) : null}
                <span className="inline-actions">
                  <button type="button" onClick={() => void prepareGoogleOAuth(connection.id)}>
                    Connect Google
                  </button>
                  <button
                    type="button"
                    disabled={connection.authStatus !== "ready"}
                    onClick={() => void syncGoogleCalendar(connection.id)}
                  >
                    Sync Google Events
                  </button>
                  <button type="button" onClick={() => void deleteCalendarConnection(connection.id)}>
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No Google calendar row exists yet. Add one below, then click Connect Google.</p>
        )}

        <h4>Add Google Calendar</h4>
        <form onSubmit={(event) => void (createGoogleCalendarConnection ?? createCalendarConnection)(event)}>
          <input
            value={calendarForm.label}
            onChange={(event) =>
              setCalendarForm({ ...calendarForm, provider: "google", label: event.target.value })
            }
            placeholder="Calendar label, e.g. Google Primary"
          />
          <input
            value={calendarForm.accountRef ?? ""}
            onChange={(event) =>
              setCalendarForm({
                ...calendarForm,
                provider: "google",
                accountRef: event.target.value,
              })
            }
            placeholder="Google calendar ID; blank means primary/default calendar"
          />
          <button type="submit">Add Google Calendar</button>
        </form>

        <h4>OAuth Client Details</h4>
        <form onSubmit={(event) => void updateGoogleOAuthSettings(event)}>
          <input
            value={googleOAuthForm.clientId ?? ""}
            onChange={(event) =>
              setGoogleOAuthForm({ ...googleOAuthForm, clientId: event.target.value })
            }
            placeholder="Google OAuth client ID"
          />
          <input
            value={googleOAuthForm.clientSecret ?? ""}
            onChange={(event) =>
              setGoogleOAuthForm({ ...googleOAuthForm, clientSecret: event.target.value })
            }
            placeholder={
              settingsSnapshot.googleOAuth.clientSecretConfigured
                ? "Google client secret already saved; enter a new one to replace it"
                : "Google client secret, optional for PKCE desktop clients"
            }
          />
          <input
            value={googleOAuthForm.redirectUri ?? ""}
            onChange={(event) =>
              setGoogleOAuthForm({ ...googleOAuthForm, redirectUri: event.target.value })
            }
            placeholder={`Redirect URI, defaults to ${settingsSnapshot.googleOAuth.effectiveRedirectUri}`}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={googleOAuthForm.clearClientSecret ?? false}
              onChange={(event) =>
                setGoogleOAuthForm({
                  ...googleOAuthForm,
                  clearClientSecret: event.target.checked,
                })
              }
            />
            Clear saved Google client secret
          </label>
          <button type="submit">Save Google OAuth Setup</button>
        </form>
      </>
    );
  }

  if (section === "ics") {
    return (
      <>
        <h3>Import With ICS</h3>
        <p>
          Import an exported `.ics` file from a calendar app. Praxis reads events locally and stores
          them as appointments.
        </p>
        <form onSubmit={(event) => void importIcsCalendar(event)}>
          <input name="icsFile" type="file" accept=".ics,text/calendar" />
          <button type="submit">Import ICS File</button>
        </form>
      </>
    );
  }

  return (
    <>
      <h3>Calendar Events</h3>
      <p>
        Manage saved calendar rows and run manual event imports. Google-specific authorization lives
        on the Google Calendar Integration tab.
      </p>
      <article className="brief-card">
        <h4>Calendar Auto-Sync</h4>
        <p>
          Background sync is{" "}
          <span className={settingsSnapshot.calendarAutoSync.enabled ? "badge" : "badge urgent-badge"}>
            {settingsSnapshot.calendarAutoSync.enabled ? "enabled" : "paused"}
          </span>
          <span className="badge">
            every {settingsSnapshot.calendarAutoSync.intervalMinutes} minutes
          </span>
        </p>
        <form onSubmit={(event) => void updateCalendarAutoSync(event)}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={calendarAutoSyncForm.enabled ?? true}
              onChange={(event) =>
                setCalendarAutoSyncForm({
                  ...calendarAutoSyncForm,
                  enabled: event.target.checked,
                })
              }
            />
            Enable background calendar sync
          </label>
          <input
            type="number"
            min={5}
            max={1440}
            step={1}
            value={calendarAutoSyncForm.intervalMinutes ?? 30}
            onChange={(event) =>
              setCalendarAutoSyncForm({
                ...calendarAutoSyncForm,
                intervalMinutes: Number(event.target.value),
              })
            }
            aria-label="Calendar auto-sync interval in minutes"
          />
          <button type="submit">Save Calendar Auto-Sync</button>
        </form>
      </article>
      <p>
        Outlook OAuth:{" "}
        <span className={outlookOAuthReadiness.ready ? "badge" : "badge urgent-badge"}>
          {outlookOAuthReadiness.ready ? "ready to authorize" : "setup needed"}
        </span>
        <span className="badge">redirect: {outlookOAuthReadiness.redirectUri}</span>
        {outlookOAuthReadiness.missing.length > 0 ? (
          <span className="badge urgent-badge">
            missing: {outlookOAuthReadiness.missing.join(", ")}
          </span>
        ) : null}
      </p>
      <form onSubmit={(event) => void createCalendarConnection(event)}>
        <select
          value={calendarForm.provider}
          onChange={(event) =>
            setCalendarForm({
              ...calendarForm,
              provider: event.target.value as CalendarProvider,
            })
          }
        >
          {CALENDAR_PROVIDERS.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
        <input
          value={calendarForm.label}
          onChange={(event) => setCalendarForm({ ...calendarForm, label: event.target.value })}
          placeholder="Calendar label, e.g. Work Outlook"
        />
        <input
          value={calendarForm.accountRef ?? ""}
          onChange={(event) => setCalendarForm({ ...calendarForm, accountRef: event.target.value })}
          placeholder="Provider calendar ID; blank means primary/default calendar"
        />
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={calendarForm.enabled ?? true}
            onChange={(event) =>
              setCalendarForm({ ...calendarForm, enabled: event.target.checked })
            }
          />
          Enabled
        </label>
        <button type="submit">Add Calendar</button>
      </form>
      {settingsSnapshot.calendarConnections.length > 0 ? (
        <ul>
          {settingsSnapshot.calendarConnections.map((connection) => (
            <li key={connection.id} className="item">
              {connection.label}
              <span className="badge">{connection.provider}</span>
              <span className="badge">{connection.enabled ? "enabled" : "disabled"}</span>
              <span className="badge">{CALENDAR_AUTH_LABELS[connection.authStatus]}</span>
              <span className="badge">{syncLabelFor(connection)}</span>
              <span className="badge">
                calendar ID: {connection.accountRef ? connection.accountRef : "primary/default"}
              </span>
              {connection.lastSyncedAt ? (
                <span className="badge">last sync: {formatDateTime(connection.lastSyncedAt)}</span>
              ) : null}
              {connection.lastSyncError ? (
                <span className="badge urgent-badge">{connection.lastSyncError}</span>
              ) : null}
              <span className="inline-actions">
                <button type="button" onClick={() => void deleteCalendarConnection(connection.id)}>
                  Delete
                </button>
                {connection.provider === "google" ? (
                  <>
                    <button type="button" onClick={() => void prepareGoogleOAuth(connection.id)}>
                      Connect Google
                    </button>
                    <button
                      type="button"
                      disabled={connection.authStatus !== "ready"}
                      onClick={() => void syncGoogleCalendar(connection.id)}
                    >
                      Sync Google Events
                    </button>
                  </>
                ) : null}
                {connection.provider === "outlook" ? (
                  <>
                    <button type="button" onClick={() => void prepareOutlookOAuth(connection.id)}>
                      Connect Outlook
                    </button>
                    <button
                      type="button"
                      disabled={connection.authStatus !== "ready"}
                      onClick={() => void syncOutlookCalendar(connection.id)}
                    >
                      Sync Outlook Events
                    </button>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No calendar connections saved yet.</p>
      )}
      <h3>Manual Calendar Import</h3>
      <p>
        Paste normalized event JSON to test the local appointment pipeline before Google and Outlook
        OAuth are wired in.
      </p>
      <form onSubmit={(event) => void importCalendarJson(event)}>
        <select
          value={calendarImportSource}
          onChange={(event) => setCalendarImportSource(event.target.value as CalendarImportSource)}
        >
          <option value="manual_json">Manual JSON</option>
          <option value="google">Google</option>
          <option value="outlook">Outlook</option>
          <option value="ics">ICS</option>
        </select>
        <textarea
          value={calendarImportText}
          onChange={(event) => setCalendarImportText(event.target.value)}
          rows={10}
          placeholder="Paste an array of events with title, startsAt, endsAt, allDay, notes, and externalId."
        />
        <button type="submit">Import Calendar Events</button>
      </form>
    </>
  );
}
