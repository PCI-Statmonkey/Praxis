import type { FormEvent } from "react";
import type { EmailSnapshot, EmailProvider } from "../../shared/emailModel";
import type { EmailOAuthReadiness } from "../../shared/emailOAuth";
import {
  authLabel,
  canSyncConnection,
  connectActionLabel,
  isActivelySyncing,
  selectCalendarConnectionsByProvider,
  selectEmailConnectionsByProvider,
  serviceConnectionErrorMessage,
  shouldShowNoNewMailSuccessCopy,
  statusGuidance,
  syncLabel,
} from "../../shared/settingsModel";
import type {
  CalendarProvider,
  CreateCalendarConnectionInput,
  CreateEmailConnectionInput,
  SettingsSnapshot,
  UpdateCalendarAutoSyncSettingsInput,
  UpdateGoogleOAuthSettingsInput,
  UpdateOutlookOAuthSettingsInput,
} from "../../shared/settingsModel";
import type { CalendarOAuthReadiness } from "../../shared/calendarOAuth";

type ConnectedService = "google" | "outlook";

type ConnectedServiceSettingsPanelProps = {
  service: ConnectedService;
  settingsSnapshot: SettingsSnapshot;
  emailSnapshot: EmailSnapshot;
  calendarOAuthReadiness: CalendarOAuthReadiness;
  emailOAuthReadiness: EmailOAuthReadiness;
  googleOAuthForm: UpdateGoogleOAuthSettingsInput;
  outlookOAuthForm: UpdateOutlookOAuthSettingsInput;
  emailForm: CreateEmailConnectionInput;
  emailImportText: string;
  calendarForm: CreateCalendarConnectionInput;
  calendarAutoSyncForm: UpdateCalendarAutoSyncSettingsInput;
  formatDateTime: (value: string | null) => string;
  setEmailForm: (form: CreateEmailConnectionInput) => void;
  setEmailImportText: (text: string) => void;
  setCalendarForm: (form: CreateCalendarConnectionInput) => void;
  setCalendarAutoSyncForm: (form: UpdateCalendarAutoSyncSettingsInput) => void;
  setGoogleOAuthForm: (form: UpdateGoogleOAuthSettingsInput) => void;
  setOutlookOAuthForm: (form: UpdateOutlookOAuthSettingsInput) => void;
  createServiceEmailConnection: (
    provider: Extract<EmailProvider, "gmail" | "outlook">,
    event: FormEvent<HTMLFormElement>
  ) => Promise<void>;
  createServiceCalendarConnection: (
    provider: Extract<CalendarProvider, "google" | "outlook">,
    event: FormEvent<HTMLFormElement>
  ) => Promise<void>;
  deleteEmailConnection: (id: string) => Promise<void>;
  updateEmailConnection: (id: string, label: string, accountRef: string) => Promise<void>;
  deleteCalendarConnection: (id: string) => Promise<void>;
  updateCalendarConnection: (id: string, label: string, accountRef: string) => Promise<void>;
  updateCalendarAutoSync: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateGoogleOAuthSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateOutlookOAuthSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  prepareEmailOAuth: (connectionId: string) => Promise<void>;
  prepareCalendarOAuth: (connectionId: string) => Promise<void>;
  syncEmail: (connectionId: string) => Promise<void>;
  syncCalendar: (connectionId: string) => Promise<void>;
  importEmailJson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  acceptSuggestion: (suggestionId: string, mode: "todo" | "project") => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
};

const serviceCopy = {
  google: {
    title: "Google",
    emailProvider: "gmail",
    calendarProvider: "google",
    emailLabel: "Gmail",
    calendarLabel: "Google Calendar",
    defaultEmailLabel: "Gmail Primary",
    defaultCalendarLabel: "Google Primary",
    accountPlaceholder: "name@gmail.com",
  },
  outlook: {
    title: "Outlook",
    emailProvider: "outlook",
    calendarProvider: "outlook",
    emailLabel: "Outlook Mail",
    calendarLabel: "Outlook Calendar",
    defaultEmailLabel: "Outlook Primary",
    defaultCalendarLabel: "Outlook Primary",
    accountPlaceholder: "name@company.com",
  },
} as const;

const sourceSystemFor = (service: ConnectedService) => (service === "google" ? "gmail" : "outlook");

const parseGoogleProjectNumber = (clientId: string | null) => {
  const match = clientId?.match(/^(\d+)-/);
  return match?.[1] ?? null;
};

export function ConnectedServiceSettingsPanel({
  service,
  settingsSnapshot,
  emailSnapshot,
  calendarOAuthReadiness,
  emailOAuthReadiness,
  googleOAuthForm,
  outlookOAuthForm,
  emailForm,
  emailImportText,
  calendarForm,
  calendarAutoSyncForm,
  formatDateTime,
  setEmailForm,
  setEmailImportText,
  setCalendarForm,
  setCalendarAutoSyncForm,
  setGoogleOAuthForm,
  setOutlookOAuthForm,
  createServiceEmailConnection,
  createServiceCalendarConnection,
  deleteEmailConnection,
  updateEmailConnection,
  deleteCalendarConnection,
  updateCalendarConnection,
  updateCalendarAutoSync,
  updateGoogleOAuthSettings,
  updateOutlookOAuthSettings,
  prepareEmailOAuth,
  prepareCalendarOAuth,
  syncEmail,
  syncCalendar,
  importEmailJson,
  acceptSuggestion,
  dismissSuggestion,
}: ConnectedServiceSettingsPanelProps) {
  const copy = serviceCopy[service];
  const emailProvider = copy.emailProvider;
  const calendarProvider = copy.calendarProvider;
  const emailConnections = selectEmailConnectionsByProvider(
    settingsSnapshot.emailConnections,
    emailProvider
  );
  const calendarConnections = selectCalendarConnectionsByProvider(
    settingsSnapshot.calendarConnections,
    calendarProvider
  );
  const primaryEmailConnection = emailConnections[0] ?? null;
  const primaryCalendarConnection = calendarConnections[0] ?? null;
  const serviceMessages = emailSnapshot.messages.filter(
    (message) => message.sourceSystem === sourceSystemFor(service)
  );
  const serviceSuggestions = emailSnapshot.suggestions.filter(
    (suggestion) =>
      suggestion.status === "pending" && suggestion.sourceSystem === sourceSystemFor(service)
  );
  const googleProjectNumber =
    service === "google" ? parseGoogleProjectNumber(settingsSnapshot.googleOAuth.clientId) : null;
  const gmailApiUrl = googleProjectNumber
    ? `https://console.developers.google.com/apis/api/gmail.googleapis.com/overview?project=${googleProjectNumber}`
    : "https://console.cloud.google.com/apis/library/gmail.googleapis.com";
  const calendarApiUrl = googleProjectNumber
    ? `https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=${googleProjectNumber}`
    : "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com";
  const latestServiceMessage = serviceMessages.reduce<(typeof serviceMessages)[number] | null>(
    (latest, message) => {
      if (!latest) {
        return message;
      }
      return new Date(message.receivedAt).getTime() > new Date(latest.receivedAt).getTime()
        ? message
        : latest;
    },
    null
  );
  const primaryEmailGuidance = primaryEmailConnection
    ? statusGuidance(primaryEmailConnection, emailOAuthReadiness)
    : null;
  const primaryCalendarGuidance = primaryCalendarConnection
    ? statusGuidance(primaryCalendarConnection, calendarOAuthReadiness)
    : null;
  const primaryEmailError = primaryEmailConnection
    ? serviceConnectionErrorMessage(primaryEmailConnection)
    : null;
  const primaryCalendarError = primaryCalendarConnection
    ? serviceConnectionErrorMessage(primaryCalendarConnection)
    : null;
  const primaryEmailSyncSucceededWithNoMessages =
    primaryEmailConnection
      ? shouldShowNoNewMailSuccessCopy(primaryEmailConnection, serviceMessages.length)
      : false;

  return (
    <>
      <h3>{copy.title}</h3>
      <section className="email-setup-panel">
        <div className="email-setup-header">
          <div>
            <h4>{copy.title} services</h4>
            <p>
              Connect mail and calendar from one place. Dev-mode setup still needs provider app
              credentials, but normal usage should feel like one connected service.
            </p>
          </div>
          <div className="setup-status-row">
            <span className="badge">mail sources: {emailConnections.length}</span>
            <span className="badge">calendars: {calendarConnections.length}</span>
            <span className="badge">recent summaries: {serviceMessages.length}</span>
            <span className="badge">pending review: {serviceSuggestions.length}</span>
          </div>
        </div>

        <article className="service-status-grid">
          <section className="settings-next-action">
            <h4>Mail</h4>
            {primaryEmailConnection ? (
              <>
                <p>
                  <strong>{primaryEmailConnection.label}</strong>
                  <span className="badge">{authLabel(primaryEmailConnection.authStatus)}</span>
                  <span className="badge">{syncLabel(primaryEmailConnection)}</span>
                </p>
                <p className="setup-muted">
                  {primaryEmailConnection.lastSyncedAt
                    ? `Last checked ${formatDateTime(primaryEmailConnection.lastSyncedAt)}. `
                    : "This inbox has not been checked yet. "}
                  {serviceMessages.length > 0
                    ? `${serviceMessages.length} summaries stored`
                    : "No summaries stored yet"}
                  {latestServiceMessage
                    ? `; newest message ${formatDateTime(latestServiceMessage.receivedAt)}`
                    : ""}
                  {serviceSuggestions.length > 0
                    ? `; ${serviceSuggestions.length} pending follow-up candidates.`
                    : "."}
                </p>
                {primaryEmailError ? (
                  <p className="setup-muted">
                    {primaryEmailError.includes("Gmail API has not been used") ? (
                      <>
                        Gmail API is not enabled for this Google project. Open{" "}
                        <a href={gmailApiUrl} target="_blank" rel="noreferrer">
                          Gmail API setup
                        </a>
                        , click Enable, wait a minute, then sync again.
                      </>
                    ) : (
                      primaryEmailError
                    )}
                  </p>
                ) : null}
                {primaryEmailSyncSucceededWithNoMessages ? (
                  <p className="setup-muted">
                    Sync ran successfully, but Praxis did not find new mail summaries to store.
                  </p>
                ) : null}
                {primaryEmailGuidance ? (
                  <p className="setup-muted">{primaryEmailGuidance}</p>
                ) : null}
                <div className="settings-next-action-buttons">
                  <button
                    type="button"
                    className={
                      primaryEmailConnection.authStatus === "ready"
                        ? undefined
                        : "primary-action-button"
                    }
                    disabled={!emailOAuthReadiness.ready || isActivelySyncing(primaryEmailConnection)}
                    onClick={() => void prepareEmailOAuth(primaryEmailConnection.id)}
                  >
                    {connectActionLabel(primaryEmailConnection)} {copy.emailLabel}
                  </button>
                  <button
                    type="button"
                    className={
                      canSyncConnection(primaryEmailConnection) ? "primary-action-button" : undefined
                    }
                    disabled={!canSyncConnection(primaryEmailConnection)}
                    onClick={() => void syncEmail(primaryEmailConnection.id)}
                  >
                    {isActivelySyncing(primaryEmailConnection) ? "Syncing..." : "Sync Mail"}
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(event) => void createServiceEmailConnection(emailProvider, event)}
              >
                <div className="settings-field-grid">
                  <label className="field-label">
                    <span>Inbox label</span>
                    <input
                      value={emailForm.provider === emailProvider ? emailForm.label : ""}
                      onChange={(event) =>
                        setEmailForm({
                          ...emailForm,
                          provider: emailProvider,
                          label: event.target.value,
                        })
                      }
                      placeholder={copy.defaultEmailLabel}
                    />
                  </label>
                  <label className="field-label">
                    <span>Email address</span>
                    <input
                      value={emailForm.provider === emailProvider ? emailForm.accountRef ?? "" : ""}
                      onChange={(event) =>
                        setEmailForm({
                          ...emailForm,
                          provider: emailProvider,
                          accountRef: event.target.value,
                        })
                      }
                      placeholder={copy.accountPlaceholder}
                    />
                  </label>
                </div>
                <button type="submit">Add Mail Source</button>
              </form>
            )}
          </section>

          <section className="settings-next-action">
            <h4>Calendar</h4>
            {primaryCalendarConnection ? (
              <>
                <p>
                  <strong>{primaryCalendarConnection.label}</strong>
                  <span className="badge">{authLabel(primaryCalendarConnection.authStatus)}</span>
                  <span className="badge">{syncLabel(primaryCalendarConnection)}</span>
                </p>
                <p className="setup-muted">
                  {primaryCalendarConnection.lastSyncedAt
                    ? `Last checked ${formatDateTime(primaryCalendarConnection.lastSyncedAt)}.`
                    : "This calendar has not been checked yet."}
                </p>
                {primaryCalendarError ? (
                  <p className="setup-muted">{primaryCalendarError}</p>
                ) : null}
                {primaryCalendarGuidance ? (
                  <p className="setup-muted">{primaryCalendarGuidance}</p>
                ) : null}
                <p className="setup-muted">
                  Calendar publish uses explicit confirmation and requires write-back scope. Use
                  Refresh Sign-In if this source was connected before publish support was added.
                </p>
                <div className="settings-next-action-buttons">
                  <button
                    type="button"
                    className={
                      primaryCalendarConnection.authStatus === "ready"
                        ? undefined
                        : "primary-action-button"
                    }
                    disabled={!calendarOAuthReadiness.ready || isActivelySyncing(primaryCalendarConnection)}
                    onClick={() => void prepareCalendarOAuth(primaryCalendarConnection.id)}
                  >
                    {connectActionLabel(primaryCalendarConnection)} {copy.calendarLabel}
                  </button>
                  <button
                    type="button"
                    className={
                      canSyncConnection(primaryCalendarConnection) ? "primary-action-button" : undefined
                    }
                    disabled={!canSyncConnection(primaryCalendarConnection)}
                    onClick={() => void syncCalendar(primaryCalendarConnection.id)}
                  >
                    {isActivelySyncing(primaryCalendarConnection) ? "Syncing..." : "Sync Calendar"}
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(event) =>
                  void createServiceCalendarConnection(calendarProvider, event)
                }
              >
                <div className="settings-field-grid">
                  <label className="field-label">
                    <span>Calendar label</span>
                    <input
                      value={
                        calendarForm.provider === calendarProvider ? calendarForm.label : ""
                      }
                      onChange={(event) =>
                        setCalendarForm({
                          ...calendarForm,
                          provider: calendarProvider,
                          label: event.target.value,
                        })
                      }
                      placeholder={copy.defaultCalendarLabel}
                    />
                  </label>
                  <label className="field-label">
                    <span>Calendar ID</span>
                    <input
                      value={
                        calendarForm.provider === calendarProvider
                          ? calendarForm.accountRef ?? ""
                          : ""
                      }
                      onChange={(event) =>
                        setCalendarForm({
                          ...calendarForm,
                          provider: calendarProvider,
                          accountRef: event.target.value,
                        })
                      }
                      placeholder="Blank uses the primary/default calendar"
                    />
                  </label>
                </div>
                <button type="submit">Add Calendar Source</button>
              </form>
            )}
          </section>
        </article>

        <details className="advanced-settings-section" open={!emailOAuthReadiness.ready}>
          <summary>
            <span>Developer setup</span>
            <small>Only needed until PRAXIS has official one-button OAuth apps.</small>
          </summary>
          <div className="form-section-body">
            <div className="setup-help">
              {service === "google" ? (
                <>
                  <p>
                    Google dev mode needs a client ID, enabled APIs, and consent screen scopes.
                  </p>
                  <ol>
                    <li>
                      Open{" "}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Google Cloud Credentials
                      </a>{" "}
                      and copy the <strong>Praxis Desk</strong> OAuth client ID.
                    </li>
                    <li>
                      Open{" "}
                      <a href={gmailApiUrl} target="_blank" rel="noreferrer">
                        Gmail API setup
                      </a>{" "}
                      and click Enable.
                    </li>
                    <li>
                      Open{" "}
                      <a href={calendarApiUrl} target="_blank" rel="noreferrer">
                        Google Calendar API setup
                      </a>{" "}
                      and click Enable if calendar sync will be used.
                    </li>
                    <li>
                      Open{" "}
                      <a
                        href="https://console.cloud.google.com/apis/credentials/consent"
                        target="_blank"
                        rel="noreferrer"
                      >
                        OAuth consent screen
                      </a>{" "}
                      and include scopes <code>{emailOAuthReadiness.scopes.join(", ")}</code> and{" "}
                      <code>{calendarOAuthReadiness.scopes.join(", ")}</code>.
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    Outlook dev mode needs one Microsoft Entra app registration for both mail and
                    calendar. Use a public desktop/native app setup; a client secret is usually not
                    needed for this local flow.
                  </p>
                  <p>
                    GoDaddy-hosted Microsoft 365 can redirect away from Microsoft Entra. If your
                    account keeps landing in GoDaddy or Microsoft 365 Copilot, open the GoDaddy
                    Email & Office Dashboard, make sure your mailbox user is an admin, then use
                    Microsoft 365 Admin &gt; Advanced. If Entra/App registrations are not available
                    there, create the app registration in a separate Microsoft/Azure tenant instead
                    and make it multi-tenant. The app registration does not have to live inside the
                    GoDaddy tenant as long as the GoDaddy mailbox is allowed to consent during login.
                  </p>
                  <ol>
                    <li>
                      Open{" "}
                      <a
                        href="https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Microsoft Entra app registrations
                      </a>
                      , then choose New registration. If Microsoft opens the Microsoft 365 shell
                      instead, click <strong>Admin</strong> on the left or open{" "}
                      <a
                        href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Azure app registrations
                      </a>
                      .
                    </li>
                    <li>
                      Name it <strong>Praxis Desk</strong>. For supported account types, choose
                      <strong>
                        Accounts in any organizational directory and personal Microsoft accounts
                      </strong>
                      . This is required when the mailbox is GoDaddy-hosted but the app registration
                      lives in a different Microsoft tenant.
                    </li>
                    <li>
                      After registration, copy the Application client ID from the Overview page and
                      paste it below.
                    </li>
                    <li>
                      Open Authentication, choose Add a platform, then Mobile and desktop
                      applications. Add both redirect URIs:
                      <br />
                      <code>{emailOAuthReadiness.redirectUri}</code>
                      <br />
                      <code>{calendarOAuthReadiness.redirectUri}</code>
                    </li>
                    <li>
                      Open API permissions, choose Add a permission, Microsoft Graph, Delegated
                      permissions, then add <code>Mail.Read</code>,{" "}
                      <code>Calendars.ReadWrite</code>, and <code>offline_access</code>.
                    </li>
                    <li>
                      Save the client ID below, leave the client secret blank unless Entra requires
                      one, then add Outlook Mail and Outlook Calendar rows and connect each one. If
                      Microsoft says admin approval is required during login, GoDaddy has disabled
                      user consent and PRAXIS will need either admin consent or a fallback adapter.
                    </li>
                  </ol>
                </>
              )}
            </div>
            {service === "google" ? (
              <form onSubmit={(event) => void updateGoogleOAuthSettings(event)}>
                <label className="field-label">
                  <span>Google OAuth client ID</span>
                  <input
                    value={googleOAuthForm.clientId ?? ""}
                    onChange={(event) =>
                      setGoogleOAuthForm({ ...googleOAuthForm, clientId: event.target.value })
                    }
                    placeholder="Google OAuth client ID"
                  />
                </label>
                <label className="field-label">
                  <span>Google OAuth client secret</span>
                  <input
                    value={googleOAuthForm.clientSecret ?? ""}
                    onChange={(event) =>
                      setGoogleOAuthForm({
                        ...googleOAuthForm,
                        clientSecret: event.target.value,
                      })
                    }
                    placeholder={
                      settingsSnapshot.googleOAuth.clientSecretConfigured
                        ? "Google client secret already saved; enter a new one to replace it"
                        : "Optional for PKCE desktop clients"
                    }
                  />
                </label>
                <label className="field-label">
                  <span>Redirect URI override</span>
                  <input
                    value={googleOAuthForm.redirectUri ?? ""}
                    onChange={(event) =>
                      setGoogleOAuthForm({ ...googleOAuthForm, redirectUri: event.target.value })
                    }
                    placeholder={settingsSnapshot.googleOAuth.effectiveRedirectUri}
                  />
                </label>
                <button type="submit">Save Google Developer Setup</button>
              </form>
            ) : (
              <form onSubmit={(event) => void updateOutlookOAuthSettings(event)}>
                <label className="field-label">
                  <span>Microsoft application client ID</span>
                  <input
                    value={outlookOAuthForm.clientId ?? ""}
                    onChange={(event) =>
                      setOutlookOAuthForm({ ...outlookOAuthForm, clientId: event.target.value })
                    }
                    placeholder="Microsoft application (client) ID"
                  />
                </label>
                <label className="field-label">
                  <span>Microsoft client secret</span>
                  <input
                    value={outlookOAuthForm.clientSecret ?? ""}
                    onChange={(event) =>
                      setOutlookOAuthForm({
                        ...outlookOAuthForm,
                        clientSecret: event.target.value,
                      })
                    }
                    placeholder={
                      settingsSnapshot.outlookOAuth.clientSecretConfigured
                        ? "Microsoft client secret already saved; enter a new one to replace it"
                        : "Microsoft client secret, if this app registration uses one"
                    }
                  />
                </label>
                <button type="submit">Save Outlook Developer Setup</button>
              </form>
            )}
          </div>
        </details>
      </section>

      <details className="advanced-settings-section">
        <summary>
          <span>Saved {copy.title} rows</span>
          <small>Manage individual mail and calendar rows.</small>
        </summary>
        <div className="form-section-body">
          {[...emailConnections, ...calendarConnections].length > 0 ? (
            <ul>
              {emailConnections.map((connection) => (
                <li key={connection.id} className="item">
                  <form
                    className="saved-row-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      void updateEmailConnection(
                        connection.id,
                        String(data.get("label") ?? ""),
                        String(data.get("accountRef") ?? "")
                      );
                    }}
                  >
                    <label className="field-label">
                      <span>Label</span>
                      <input name="label" defaultValue={connection.label} />
                    </label>
                    <label className="field-label">
                      <span>Email address</span>
                      <input name="accountRef" defaultValue={connection.accountRef ?? ""} />
                    </label>
                    <button type="submit">Save Row</button>
                  </form>
                  <span className="badge">mail</span>
                  <span className="badge">{authLabel(connection.authStatus)}</span>
                  <span className="badge">{syncLabel(connection)}</span>
                  <span className="inline-actions">
                    <button type="button" onClick={() => void deleteEmailConnection(connection.id)}>
                      Delete
                    </button>
                  </span>
                </li>
              ))}
              {calendarConnections.map((connection) => (
                <li key={connection.id} className="item">
                  <form
                    className="saved-row-edit-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const data = new FormData(event.currentTarget);
                      void updateCalendarConnection(
                        connection.id,
                        String(data.get("label") ?? ""),
                        String(data.get("accountRef") ?? "")
                      );
                    }}
                  >
                    <label className="field-label">
                      <span>Label</span>
                      <input name="label" defaultValue={connection.label} />
                    </label>
                    <label className="field-label">
                      <span>Calendar ID / account</span>
                      <input name="accountRef" defaultValue={connection.accountRef ?? ""} />
                    </label>
                    <button type="submit">Save Row</button>
                  </form>
                  <span className="badge">calendar</span>
                  <span className="badge">{authLabel(connection.authStatus)}</span>
                  <span className="badge">{syncLabel(connection)}</span>
                  <span className="inline-actions">
                    <button
                      type="button"
                      onClick={() => void deleteCalendarConnection(connection.id)}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No {copy.title} service rows saved yet.</p>
          )}
        </div>
      </details>

      <details className="advanced-settings-section">
        <summary>
          <span>{copy.title} email output</span>
          <small>Recent summaries and pending follow-up candidates.</small>
        </summary>
        <div className="form-section-body">
          <h4>Follow-up candidates</h4>
          {serviceSuggestions.length > 0 ? (
            <ul>
              {serviceSuggestions.map((suggestion) => (
                <li key={suggestion.id} className="item">
                  {suggestion.title}
                  <span className="badge">{suggestion.suggestedEntityKind}</span>
                  <span className="badge">{suggestion.confidence.toFixed(2)}</span>
                  {suggestion.dueAt ? (
                    <span className="badge">due {formatDateTime(suggestion.dueAt)}</span>
                  ) : null}
                  <span className="inline-actions">
                    <button type="button" onClick={() => void acceptSuggestion(suggestion.id, "todo")}>
                      Create Todo
                    </button>
                    <button
                      type="button"
                      onClick={() => void acceptSuggestion(suggestion.id, "project")}
                    >
                      Create Project
                    </button>
                    <button type="button" onClick={() => void dismissSuggestion(suggestion.id)}>
                      Dismiss
                    </button>
                  </span>
                  <p className="brief-path">
                    From {suggestion.senderName ?? suggestion.senderEmail ?? "unknown sender"} on{" "}
                    {formatDateTime(suggestion.receivedAt)}
                    {suggestion.matchedPersonName ? `; matched ${suggestion.matchedPersonName}` : ""}
                  </p>
                  <p className="brief-path">Subject: {suggestion.subject}</p>
                  {suggestion.summary ? (
                    <p className="brief-path">Summary: {suggestion.summary}</p>
                  ) : null}
                  <p className="brief-path">{suggestion.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending {copy.title} email follow-ups right now.</p>
          )}
          <h4>Recent summaries</h4>
          {serviceMessages.length > 0 ? (
            <ul>
              {serviceMessages.map((message) => (
                <li key={message.id} className="item">
                  {message.subject}
                  <span className="badge">
                    {message.senderName ?? message.senderEmail ?? "unknown sender"}
                  </span>
                  <span className="badge">{formatDateTime(message.receivedAt)}</span>
                  {message.summary ? <p className="brief-path">{message.summary}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p>No {copy.title} email summaries imported yet.</p>
          )}
        </div>
      </details>

      <details className="advanced-settings-section">
        <summary>
          <span>Manual email summary import</span>
          <small>Use this for exported summaries or adapter testing.</small>
        </summary>
        <div className="form-section-body">
          <form onSubmit={(event) => void importEmailJson(event)}>
            <textarea
              value={emailImportText}
              onChange={(event) => setEmailImportText(event.target.value)}
              rows={12}
              placeholder="Paste an array of email objects with subject, senderEmail, receivedAt, summary, and optional externalId."
            />
            <button type="submit">Import Email Summaries</button>
          </form>
        </div>
      </details>

      <article className="brief-card">
        <h4>Calendar auto-sync</h4>
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
    </>
  );
}
