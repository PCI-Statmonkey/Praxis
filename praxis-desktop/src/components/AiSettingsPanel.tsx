import type { FormEvent } from "react";
import type {
  AiReliancePolicy,
  AiSettings,
  OllamaModelAvailabilityResult,
  UpdateAiSettingsInput,
} from "../../shared/settingsModel";

const reliancePolicies: Array<{
  id: AiReliancePolicy;
  label: string;
  description: string;
}> = [
  {
    id: "local_only",
    label: "Local only",
    description: "Use installed Ollama models only. No API fallback.",
  },
  {
    id: "prefer_local",
    label: "Prefer local",
    description: "Use Ollama first and reserve API fallback for explicit escalation.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "Use local models for routine work and allow API fallback for hard reasoning.",
  },
  {
    id: "prefer_api",
    label: "Prefer API",
    description: "Use API models for complex work while keeping local models available.",
  },
  {
    id: "api_only",
    label: "API only",
    description: "Use configured API providers only. Local runtime remains installed but idle.",
  },
];

type AiSettingsPanelProps = {
  settings: AiSettings;
  form: UpdateAiSettingsInput;
  setForm: (form: UpdateAiSettingsInput) => void;
  updateAiSettings: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  ollamaProbeResult: OllamaModelAvailabilityResult | null;
  ollamaProbeChecking: boolean;
  checkOllamaModelAvailability: () => Promise<void>;
};

const policyLabel = (policyId: AiReliancePolicy) =>
  reliancePolicies.find((policy) => policy.id === policyId)?.label ?? policyId;

const normalizeDraftModelName = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
};

export function AiSettingsPanel({
  settings,
  form,
  setForm,
  updateAiSettings,
  ollamaProbeResult,
  ollamaProbeChecking,
  checkOllamaModelAvailability,
}: AiSettingsPanelProps) {
  const selectedPolicy = form.reliancePolicy ?? settings.reliancePolicy;
  const localModelName = form.localModelName ?? "";
  const draftModelName = normalizeDraftModelName(localModelName);
  const savedModelName = settings.localModelName ?? null;
  const modelChanged = draftModelName !== savedModelName;
  const policyChanged = selectedPolicy !== settings.reliancePolicy;
  const hasUnsavedChanges = modelChanged || policyChanged;
  const modelStatusLabel = draftModelName
    ? modelChanged
      ? `draft: ${draftModelName}`
      : `saved: ${draftModelName}`
    : modelChanged
      ? "draft: no model selected"
      : "saved: no model selected";
  const probeStatusLabel = ollamaProbeChecking
    ? "checking"
    : !savedModelName
      ? "no model selected"
      : ollamaProbeResult?.modelName !== savedModelName
        ? "not checked"
        : ollamaProbeResult.status === "available"
          ? "saved model found"
          : ollamaProbeResult.status === "missing"
            ? "saved model not found"
            : ollamaProbeResult.status === "unavailable"
              ? "Ollama unavailable"
              : "no model selected";
  const installedModelSummary =
    ollamaProbeResult &&
    ollamaProbeResult.modelName === savedModelName &&
    ollamaProbeResult.installedModels.length > 0
      ? `Installed tags: ${ollamaProbeResult.installedModels.join(", ")}.`
      : null;

  return (
    <>
      <h3>AI Model Policy</h3>
      <section className="email-setup-panel">
        <div className="email-setup-header">
          <div>
            <h4>Local and API model routing</h4>
            <p>
              Choose how Praxis should use local Ollama models now and reserve API provider
              fallback for future routing.
            </p>
          </div>
          <div className="setup-status-row">
            <span className="badge">runtime: Ollama</span>
            <span className="badge">saved policy: {policyLabel(settings.reliancePolicy)}</span>
            <span className="badge">
              saved model: {settings.localModelName ?? "not selected"}
            </span>
            <span className={hasUnsavedChanges ? "badge urgent-badge" : "badge"}>
              {hasUnsavedChanges ? "unsaved changes" : "saved"}
            </span>
            <span className="badge">API fallback: planned</span>
          </div>
        </div>

        <form onSubmit={(event) => void updateAiSettings(event)}>
          <article className="service-status-grid">
            <section className="settings-next-action">
              <h4>Local runtime</h4>
              <p className="setup-muted">
                Ollama remains the local runtime. Model names are saved by installed Ollama tag,
                not tied to one bundled model.
              </p>
              <div className="settings-field-grid">
                <label className="field-label">
                  <span>Runtime</span>
                  <input value={settings.localRuntime} disabled readOnly />
                </label>
                <label className="field-label">
                  <span>Local model name</span>
                  <input
                    value={localModelName}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        localModelName: event.target.value,
                      })
                    }
                    placeholder="Any installed Ollama model, such as phi3 or gpt-oss-20b"
                  />
                </label>
              </div>
              <p className="setup-muted">
                {modelStatusLabel}. Blank names are saved as no selected local model.
              </p>
              <p className="brief-path">
                Leave the model name blank to clear it. Open-weight candidates such as gpt-oss-20b
                and gpt-oss-120b can be entered after installation. Praxis will not bundle model
                weights.
              </p>
              <div className="settings-next-action-buttons">
                <button
                  type="button"
                  disabled={ollamaProbeChecking}
                  onClick={() => void checkOllamaModelAvailability()}
                >
                  Check Ollama Model Availability
                </button>
              </div>
              <p className="brief-path">
                Availability status: {probeStatusLabel}. This only checks the local Ollama runtime
                for installed tags and does not change assistant routing.
                {installedModelSummary ? ` ${installedModelSummary}` : ""}
              </p>
            </section>

            <section className="settings-next-action">
              <h4>Optional API provider</h4>
              <p className="setup-muted">
                API fallback is intended for complex cross-project reasoning, messy long review, or
                low-confidence local output.
              </p>
              <div className="settings-field-grid">
                <label className="field-label">
                  <span>Provider</span>
                  <select disabled value="">
                    <option value="">Not configured</option>
                    <option value="openai">OpenAI-compatible API</option>
                    <option value="custom">Custom endpoint</option>
                  </select>
                </label>
                <label className="field-label">
                  <span>API key</span>
                  <input disabled placeholder="Planned encrypted secret field" />
                </label>
              </div>
              <p className="brief-path">
                API keys must use encrypted secret storage, matching the existing OAuth secret
                pattern. They are not stored in plain settings JSON.
              </p>
              <p className="brief-path">
                Provider selection and API key entry stay disabled until encrypted provider-secret
                storage and routing policy are implemented.
              </p>
            </section>
          </article>

          <article className="brief-card">
            <h4>AI reliance policy</h4>
            <p className="setup-muted">
              Local-first modes keep normal assistant work on the machine and require clear
              escalation before API fallback.
            </p>
            <p className="brief-path">
              Saved policy: {policyLabel(settings.reliancePolicy)}. Draft policy:{" "}
              {policyLabel(selectedPolicy)}.
            </p>
            <div className="settings-field-grid">
              {reliancePolicies.map((policy) => (
                <label key={policy.id} className="checkbox-row">
                  <input
                    type="radio"
                    name="aiReliancePolicy"
                    value={policy.id}
                    checked={selectedPolicy === policy.id}
                    onChange={() =>
                      setForm({
                        ...form,
                        reliancePolicy: policy.id,
                      })
                    }
                  />
                  <span>
                    <strong>{policy.label}</strong>
                    <br />
                    {policy.description}
                  </span>
                </label>
              ))}
            </div>
            <button type="submit" disabled={!hasUnsavedChanges}>
              {hasUnsavedChanges ? "Save AI Settings" : "AI Settings Saved"}
            </button>
          </article>
        </form>

        <article className="brief-card">
          <h4>Write safety and personality planning</h4>
          <p className="setup-muted">
            API fallback should not make workspace changes by itself. It should produce reasoning or
            proposals until a local Settings policy explicitly allows action.
          </p>
          <p className="brief-path">
            Personality settings are planned for V1.1. Keep them separate from provider credentials
            and model routing so style changes cannot weaken write-safety boundaries.
          </p>
        </article>
      </section>
    </>
  );
}
