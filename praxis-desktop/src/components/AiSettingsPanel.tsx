type ReliancePolicyId =
  | "local_only"
  | "prefer_local"
  | "balanced"
  | "prefer_api"
  | "api_only";

const reliancePolicies: Array<{
  id: ReliancePolicyId;
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

export function AiSettingsPanel() {
  return (
    <>
      <h3>AI Model Policy</h3>
      <section className="email-setup-panel">
        <div className="email-setup-header">
          <div>
            <h4>Local and API model routing</h4>
            <p>
              Plan how Praxis should choose between local Ollama models and optional API providers.
              These controls are staged here before runtime routing is wired in.
            </p>
          </div>
          <div className="setup-status-row">
            <span className="badge">runtime: Ollama</span>
            <span className="badge">policy: planned</span>
            <span className="badge">API fallback: planned</span>
          </div>
        </div>

        <article className="service-status-grid">
          <section className="settings-next-action">
            <h4>Local runtime</h4>
            <p className="setup-muted">
              Ollama remains the local runtime. Model names should be configurable by installed
              Ollama tag, not tied to one bundled model.
            </p>
            <div className="settings-field-grid">
              <label className="field-label">
                <span>Runtime</span>
                <input value="Ollama" disabled readOnly />
              </label>
              <label className="field-label">
                <span>Local model name</span>
                <input
                  disabled
                  placeholder="Any installed Ollama model, such as phi3 or gpt-oss-20b"
                />
              </label>
            </div>
            <p className="brief-path">
              Open-weight candidates such as gpt-oss-20b and gpt-oss-120b can be entered after
              installation. Praxis will not bundle model weights.
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
              pattern. They should not be stored in plain settings JSON.
            </p>
          </section>
        </article>

        <article className="brief-card">
          <h4>AI reliance policy</h4>
          <p className="setup-muted">
            These options define future routing defaults. Local-first modes keep normal assistant
            work on the machine and require clear escalation before API fallback.
          </p>
          <div className="settings-field-grid">
            {reliancePolicies.map((policy) => (
              <label key={policy.id} className="checkbox-row">
                <input
                  type="radio"
                  name="aiReliancePolicy"
                  value={policy.id}
                  checked={policy.id === "prefer_local"}
                  disabled
                  readOnly
                />
                <span>
                  <strong>{policy.label}</strong>
                  <br />
                  {policy.description}
                </span>
              </label>
            ))}
          </div>
        </article>

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
