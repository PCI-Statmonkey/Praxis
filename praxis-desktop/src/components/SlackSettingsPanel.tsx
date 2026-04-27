import type { FormEvent } from "react";
import type { SlackAdapterStatus } from "../../shared/slackAdapter";
import type { SettingsSnapshot, UpdateSlackSettingsInput } from "../../shared/settingsModel";

type SlackSettingsPanelProps = {
  settingsSnapshot: SettingsSnapshot;
  slackStatus: SlackAdapterStatus;
  slackForm: UpdateSlackSettingsInput;
  setSlackForm: (form: UpdateSlackSettingsInput) => void;
  updateSlackSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  restartSlackAdapter: () => Promise<void>;
  sendSlackConnectionTest: () => Promise<void>;
  sendSlackTestSuggestion: () => Promise<void>;
};

export function SlackSettingsPanel({
  settingsSnapshot,
  slackStatus,
  slackForm,
  setSlackForm,
  updateSlackSettings,
  restartSlackAdapter,
  sendSlackConnectionTest,
  sendSlackTestSuggestion,
}: SlackSettingsPanelProps) {
  return (
    <>
      <h3>Slack Adapter</h3>
      <article className="brief-card">
        <p>
          Status:{" "}
          <span className={slackStatus.enabled ? "badge" : "badge urgent-badge"}>
            {slackStatus.enabled ? "enabled" : "disabled"}
          </span>
        </p>
        <p>{slackStatus.reason}</p>
        <p className="brief-path">
          Slack tokens still come from `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN`. Proactive mirroring
          uses the operator channel below.
        </p>
        <form onSubmit={(event) => void updateSlackSettings(event)}>
          <input
            value={slackForm.operatorChannelId ?? ""}
            onChange={(event) =>
              setSlackForm({ ...slackForm, operatorChannelId: event.target.value })
            }
            placeholder="Slack operator channel ID, e.g. D123 or C123"
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={slackForm.proactiveMirroringEnabled ?? false}
              onChange={(event) =>
                setSlackForm({
                  ...slackForm,
                  proactiveMirroringEnabled: event.target.checked,
                })
              }
            />
            Mirror proactive suggestions into Slack
          </label>
          <button type="submit">Save Slack Settings</button>
        </form>
        <div className="filter-actions">
          <button type="button" onClick={() => void restartSlackAdapter()}>
            Restart Slack Adapter
          </button>
          <button type="button" onClick={() => void sendSlackConnectionTest()}>
            Test Slack Connection
          </button>
          <button type="button" onClick={() => void sendSlackTestSuggestion()}>
            Send Test Suggestion
          </button>
        </div>
        <p>
          Stored channel:{" "}
          <span className="badge">{settingsSnapshot.slack.operatorChannelId ?? "not set"}</span>
          <span className="badge">
            {settingsSnapshot.slack.proactiveMirroringEnabled ? "mirroring on" : "mirroring off"}
          </span>
        </p>
      </article>
    </>
  );
}
