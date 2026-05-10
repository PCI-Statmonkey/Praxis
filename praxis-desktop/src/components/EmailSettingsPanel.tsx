import type { FormEvent } from "react";
import type {
  CreateEmailConnectionInput,
  EmailSnapshot,
} from "../../shared/emailModel";
import type { EmailOAuthReadiness } from "../../shared/emailOAuth";
import type {
  SettingsSnapshot,
  UpdateGoogleOAuthSettingsInput,
  UpdateOutlookOAuthSettingsInput,
} from "../../shared/settingsModel";

type EmailSettingsPanelProps = {
  settingsSnapshot: SettingsSnapshot;
  emailSnapshot: EmailSnapshot;
  gmailOAuthReadiness: EmailOAuthReadiness;
  outlookOAuthReadiness: EmailOAuthReadiness;
  googleOAuthForm: UpdateGoogleOAuthSettingsInput;
  outlookOAuthForm: UpdateOutlookOAuthSettingsInput;
  emailForm: CreateEmailConnectionInput;
  emailImportText: string;
  formatDateTime: (value: string | null) => string;
  setEmailForm: (form: CreateEmailConnectionInput) => void;
  setEmailImportText: (text: string) => void;
  setGoogleOAuthForm: (form: UpdateGoogleOAuthSettingsInput) => void;
  setOutlookOAuthForm: (form: UpdateOutlookOAuthSettingsInput) => void;
  createEmailConnection: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteEmailConnection: (id: string) => Promise<void>;
  updateGoogleOAuthSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateOutlookOAuthSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  prepareGoogleOAuth: (connectionId: string) => Promise<void>;
  prepareOutlookOAuth: (connectionId: string) => Promise<void>;
  syncGoogleInbox: (connectionId: string) => Promise<void>;
  syncOutlookInbox: (connectionId: string) => Promise<void>;
  importEmailJson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  acceptSuggestion: (suggestionId: string, mode: "todo" | "project") => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
};

export function EmailSettingsPanel({
  settingsSnapshot,
  emailSnapshot,
  gmailOAuthReadiness,
  outlookOAuthReadiness,
  googleOAuthForm,
  outlookOAuthForm,
  emailForm,
  emailImportText,
  formatDateTime,
  setEmailForm,
  setEmailImportText,
  setGoogleOAuthForm,
  setOutlookOAuthForm,
  createEmailConnection,
  deleteEmailConnection,
  updateGoogleOAuthSettings,
  updateOutlookOAuthSettings,
  prepareGoogleOAuth,
  prepareOutlookOAuth,
  syncGoogleInbox,
  syncOutlookInbox,
  importEmailJson,
  acceptSuggestion,
  dismissSuggestion,
}: EmailSettingsPanelProps) {
  const pendingSuggestions = emailSnapshot.suggestions.filter(
    (suggestion) => suggestion.status === "pending"
  );
  const gmailConnections = settingsSnapshot.emailConnections.filter(
    (connection) => connection.provider === "gmail"
  );
  const outlookConnections = settingsSnapshot.emailConnections.filter(
    (connection) => connection.provider === "outlook"
  );
  const primaryGmailConnection = gmailConnections[0] ?? null;
  const primaryOutlookConnection = outlookConnections[0] ?? null;
  const setupProvider = emailForm.provider === "outlook" ? "outlook" : "gmail";
  const activeConnection =
    setupProvider === "gmail" ? primaryGmailConnection : primaryOutlookConnection;
  const activeReadiness =
    setupProvider === "gmail" ? gmailOAuthReadiness : outlookOAuthReadiness;
  const hasOAuthSetup = activeReadiness.ready;
  const hasAuthorizedInbox = activeConnection?.authStatus === "ready";
  const hasSyncedInbox = Boolean(activeConnection?.lastSyncedAt);
  const providerLabel = setupProvider === "gmail" ? "Gmail" : "Outlook";
  const providerAccountPlaceholder =
    setupProvider === "gmail" ? "name@gmail.com" : "name@company.com";
  const providerSourceCount =
    setupProvider === "gmail" ? gmailConnections.length : outlookConnections.length;
  const nextBlockedReason = !activeConnection
    ? `Add a ${providerLabel} source first.`
    : !hasOAuthSetup
      ? `Save the ${providerLabel} app setup first.`
      : !hasAuthorizedInbox
        ? `Connect ${providerLabel} in the browser.`
        : !hasSyncedInbox
          ? `Run the first ${providerLabel} inbox sync.`
          : `${providerLabel} setup is complete.`;

  const selectSetupProvider = (provider: "gmail" | "outlook") => {
    setEmailForm({
      ...emailForm,
      provider,
      label:
        emailForm.label.trim().length > 0
          ? emailForm.label
          : provider === "gmail"
            ? "Gmail Primary"
            : "Outlook Primary",
    });
  };

  const stepClass = (complete: boolean, current: boolean) =>
    `setup-step${complete ? " is-complete" : ""}${current ? " is-current" : ""}${
      !complete && !current ? " is-blocked" : ""
    }`;

  return (
    <>
      <h3>Email Integration</h3>
      <section className="email-setup-panel">
        <div className="email-setup-header">
          <div>
            <h4>Connect an inbox</h4>
            <p>
              Choose the provider, save the required app setup, authorize the account, then run the
              first sync.
            </p>
          </div>
          <div className="setup-status-row" aria-label="Email setup summary">
            <span className="badge">saved sources: {settingsSnapshot.emailConnections.length}</span>
            <span className="badge">pending follow-ups: {pendingSuggestions.length}</span>
            <span className="badge">recent summaries: {emailSnapshot.messages.length}</span>
          </div>
        </div>

        <div className="email-provider-switch" aria-label="Choose email provider">
          <button
            type="button"
            className={setupProvider === "gmail" ? "is-nav-active" : ""}
            onClick={() => selectSetupProvider("gmail")}
          >
            Gmail
          </button>
          <button
            type="button"
            className={setupProvider === "outlook" ? "is-nav-active" : ""}
            onClick={() => selectSetupProvider("outlook")}
          >
            Outlook
          </button>
        </div>

        <p className="setup-callout">
          Current next step: <strong>{nextBlockedReason}</strong>
        </p>

        <ol className="setup-steps">
          <li className={stepClass(Boolean(activeConnection), !activeConnection)}>
            <span className="step-index">1</span>
            <div className="setup-step-body">
              <h4>Add the inbox source</h4>
              {activeConnection ? (
                <div className="email-source-summary">
                  <strong>{activeConnection.label}</strong>
                  <span className="badge">{activeConnection.accountRef ?? "account not set"}</span>
                  <span className="badge">{activeConnection.enabled ? "enabled" : "disabled"}</span>
                  <span className="badge">{providerSourceCount} saved for {providerLabel}</span>
                </div>
              ) : (
                <form onSubmit={(event) => void createEmailConnection(event)}>
                  <div className="settings-field-grid">
                    <label className="field-label">
                      <span>Inbox label</span>
                      <input
                        value={emailForm.label}
                        onChange={(event) =>
                          setEmailForm({ ...emailForm, label: event.target.value })
                        }
                        placeholder={`${providerLabel} Primary`}
                      />
                    </label>
                    <label className="field-label">
                      <span>Email address</span>
                      <input
                        value={emailForm.accountRef ?? ""}
                        onChange={(event) =>
                          setEmailForm({ ...emailForm, accountRef: event.target.value })
                        }
                        placeholder={providerAccountPlaceholder}
                      />
                    </label>
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={emailForm.enabled ?? true}
                      onChange={(event) =>
                        setEmailForm({ ...emailForm, enabled: event.target.checked })
                      }
                    />
                    Enable this inbox for sync
                  </label>
                  <button type="submit" className="primary-action-button">
                    Add {providerLabel} Source
                  </button>
                </form>
              )}
            </div>
          </li>

          <li className={stepClass(hasOAuthSetup, Boolean(activeConnection) && !hasOAuthSetup)}>
            <span className="step-index">2</span>
            <div className="setup-step-body">
              <h4>Save app setup</h4>
              <div className="setup-status-row">
                <span className={activeReadiness.ready ? "badge" : "badge urgent-badge"}>
                  {activeReadiness.ready ? "ready" : "needs setup"}
                </span>
                <span className="badge">redirect: {activeReadiness.redirectUri}</span>
                {activeReadiness.missing.length > 0 ? (
                  <span className="badge urgent-badge">
                    missing: {activeReadiness.missing.join(", ")}
                  </span>
                ) : null}
              </div>
              {setupProvider === "gmail" ? (
                <>
                  <div className="setup-help">
                    <p>
                      You only need the OAuth client ID from Google. The Gmail scope is added on the
                      OAuth consent screen, not inside the credential row.
                    </p>
                    <ol>
                      <li>
                        On{" "}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Google Cloud Credentials
                        </a>
                        , click the existing <strong>Praxis Desk</strong> row under OAuth 2.0
                        Client IDs, or use the copy icon beside its Client ID.
                      </li>
                      <li>Paste that value into Google OAuth client ID below.</li>
                      <li>
                        Leave Redirect URI override blank unless Praxis tells you to change it. The
                        default is <code>{gmailOAuthReadiness.redirectUri}</code>.
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
                        and add the Gmail read-only scope:{" "}
                        <code>{gmailOAuthReadiness.scopes.join(", ")}</code>.
                      </li>
                      <li>
                        Open{" "}
                        <a
                          href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Gmail API
                        </a>{" "}
                        and click Enable if it is not enabled yet.
                      </li>
                    </ol>
                  </div>
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
                            : "Google OAuth client secret"
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
                        placeholder={gmailOAuthReadiness.redirectUri}
                      />
                    </label>
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
                    <button type="submit">Save Gmail App Setup</button>
                  </form>
                </>
              ) : (
                <>
                  <div className="setup-help">
                    <p>
                      Create or open the Microsoft app registration, then copy its application
                      client ID into Praxis.
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
                        .
                      </li>
                      <li>Open the app registration you want Praxis to use.</li>
                      <li>Copy the Application client ID and paste it below.</li>
                      <li>
                        Add this redirect URI for Outlook email:{" "}
                        <code>{outlookOAuthReadiness.redirectUri}</code>.
                      </li>
                      <li>
                        Add Microsoft Graph permission <code>Mail.Read</code>. Add{" "}
                        <code>Calendars.ReadWrite</code> only if you also want Outlook calendar
                        sync and confirmed local block publishing.
                      </li>
                    </ol>
                  </div>
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
                            : "Microsoft client secret, if your app registration uses one"
                        }
                      />
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={outlookOAuthForm.clearClientSecret ?? false}
                        onChange={(event) =>
                          setOutlookOAuthForm({
                            ...outlookOAuthForm,
                            clearClientSecret: event.target.checked,
                          })
                        }
                      />
                      Clear saved Microsoft client secret
                    </label>
                    <button type="submit">Save Outlook App Setup</button>
                  </form>
                </>
              )}
            </div>
          </li>

          <li
            className={stepClass(
              hasAuthorizedInbox,
              Boolean(activeConnection) && hasOAuthSetup && !hasAuthorizedInbox
            )}
          >
            <span className="step-index">3</span>
            <div className="setup-step-body">
              <h4>Authorize the account</h4>
              <p>
                Praxis will open the provider sign-in page. Finish consent in the browser, then
                return here.
              </p>
              <button
                type="button"
                className="primary-action-button"
                disabled={!activeConnection || !hasOAuthSetup}
                onClick={() => {
                  if (!activeConnection) {
                    return;
                  }
                  void (setupProvider === "gmail"
                    ? prepareGoogleOAuth(activeConnection.id)
                    : prepareOutlookOAuth(activeConnection.id));
                }}
              >
                Connect {providerLabel}
              </button>
              {activeConnection ? (
                <p className="setup-muted">Authorization status: {activeConnection.authStatus}</p>
              ) : null}
            </div>
          </li>

          <li
            className={stepClass(
              hasSyncedInbox,
              Boolean(activeConnection) && hasAuthorizedInbox && !hasSyncedInbox
            )}
          >
            <span className="step-index">4</span>
            <div className="setup-step-body">
              <h4>Run the first sync</h4>
              <p>
                Sync imports local summaries and follow-up candidates. Raw email bodies are not
                written to markdown memory.
              </p>
              <button
                type="button"
                disabled={!activeConnection || activeConnection.authStatus !== "ready"}
                onClick={() => {
                  if (!activeConnection) {
                    return;
                  }
                  void (setupProvider === "gmail"
                    ? syncGoogleInbox(activeConnection.id)
                    : syncOutlookInbox(activeConnection.id));
                }}
              >
                Sync {providerLabel} Inbox
              </button>
              {activeConnection ? (
                <p className="setup-muted">
                  Sync status:{" "}
                  {activeConnection.lastSyncedAt &&
                  activeConnection.syncStatus === "ready_to_sync"
                    ? "synced"
                    : activeConnection.syncStatus}
                  {activeConnection.lastSyncedAt
                    ? `; last synced ${formatDateTime(activeConnection.lastSyncedAt)}`
                    : ""}
                  {activeConnection.lastSyncError ? `; ${activeConnection.lastSyncError}` : ""}
                </p>
              ) : null}
            </div>
          </li>
        </ol>
      </section>

      <h4>Saved Email Sources</h4>
      {settingsSnapshot.emailConnections.length > 0 ? (
        <ul>
          {settingsSnapshot.emailConnections.map((connection) => (
            <li key={connection.id} className="item">
              {connection.label}
              <span className="badge">{connection.provider}</span>
              <span className="badge">{connection.enabled ? "enabled" : "disabled"}</span>
              <span className="badge">{connection.authStatus}</span>
              <span className="badge">{connection.syncStatus}</span>
              <span className="badge">
                account: {connection.accountRef ? connection.accountRef : "not set"}
              </span>
              {connection.lastSyncedAt ? (
                <span className="badge">last import: {formatDateTime(connection.lastSyncedAt)}</span>
              ) : null}
              {connection.lastSyncError ? (
                <span className="badge urgent-badge">{connection.lastSyncError}</span>
              ) : null}
              <span className="inline-actions">
                {connection.provider === "gmail" ? (
                  <>
                    <button type="button" onClick={() => void prepareGoogleOAuth(connection.id)}>
                      Connect Gmail
                    </button>
                    <button
                      type="button"
                      disabled={connection.authStatus !== "ready"}
                      onClick={() => void syncGoogleInbox(connection.id)}
                    >
                      Sync Gmail
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
                      onClick={() => void syncOutlookInbox(connection.id)}
                    >
                      Sync Outlook
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={() => void deleteEmailConnection(connection.id)}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No email sources saved yet.</p>
      )}

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

      <h4>Email Follow-Up Candidates</h4>
      {pendingSuggestions.length > 0 ? (
        <ul>
          {pendingSuggestions.map((suggestion) => (
            <li key={suggestion.id} className="item">
              {suggestion.title}
              <span className="badge">{suggestion.suggestedEntityKind}</span>
              <span className="badge">{suggestion.confidence.toFixed(2)}</span>
              {suggestion.dueAt ? (
                <span className="badge urgent-badge">{formatDateTime(suggestion.dueAt)}</span>
              ) : null}
              <span className="badge">
                from: {suggestion.senderName ?? suggestion.senderEmail ?? "unknown"}
              </span>
              {suggestion.matchedPersonName ? (
                <span className="badge waiting-badge">
                  matched: {suggestion.matchedPersonName}
                </span>
              ) : null}
              <span className="badge">subject: {suggestion.subject}</span>
              <span className="inline-actions">
                <button type="button" onClick={() => void acceptSuggestion(suggestion.id, "todo")}>
                  Create Todo
                </button>
                <button type="button" onClick={() => void acceptSuggestion(suggestion.id, "project")}>
                  Create Project
                </button>
                <button type="button" onClick={() => void dismissSuggestion(suggestion.id)}>
                  Dismiss
                </button>
              </span>
              <p className="brief-path">{suggestion.reason}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending email follow-ups right now.</p>
      )}

      <h4>Recent Email Summaries</h4>
      {emailSnapshot.messages.length > 0 ? (
        <ul>
          {emailSnapshot.messages.map((message) => (
            <li key={message.id} className="item">
              {message.subject}
              <span className="badge">{message.sourceSystem}</span>
              <span className="badge">
                {message.senderName ?? message.senderEmail ?? "unknown sender"}
              </span>
              {message.matchedPersonName ? (
                <span className="badge waiting-badge">
                  matched: {message.matchedPersonName}
                </span>
              ) : null}
              <span className="badge">{formatDateTime(message.receivedAt)}</span>
              {message.summary ? <p className="brief-path">{message.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No email summaries imported yet.</p>
      )}
    </>
  );
}
