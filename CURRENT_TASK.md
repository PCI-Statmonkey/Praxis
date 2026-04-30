# CURRENT TASK

## OBJECTIVE

Move the immediate post-validation queue to AI Task Review / ADHD Reset Mode. This is core PRAXIS near-term work, not optional V1.1 polish. Persistent presence, Rainmeter, and background wallpaper surfaces remain important V1.1 planning tracks, but they come after the AI review loop can explain what matters and help the operator reset.

## CURRENT STATE

- Gmail OAuth is connected against a real Google account.
- Gmail API is enabled and live sync is validated.
- Gmail imported 25 privacy-safe local summaries covering April 20, 2026 through April 27, 2026.
- Gmail follow-up triage is complete for the first real synced batch.
- Google Calendar is connected and live sync is validated with 3 future appointments imported.
- Outlook Graph setup recovered after GoDaddy granted Microsoft Entra access for the tenant.
- Outlook Mail is connected and live sync is validated against `Pedro@BDNC.pro`.
- Outlook Calendar is connected and live sync is validated against `Outlook Primary`.
- Review Inbox currently has 0 pending email follow-up candidates after first-pass Gmail and Outlook triage.
- The first Outlook triage added 4 active projects and 1 active todo to the work graph.
- Raw email bodies are not written to markdown memory.
- Settings now uses unified `Google` and `Outlook` service panels with reconnect, stale-sync detection, duplicate-action prevention, and delete confirmations.
- Dashboard has service health, Dashboard Readiness, actionable empty states, Review Inbox clarity, Daily Operating Rhythm, and mobile wrapping fixes.
- Talk panel mission commands produce reviewable mission drafts.
- Desktop, Slack, and companion command mode recognize `review conversation` requests and route them to the manual chat import surface.
- Imported chat snippets create pending `chat_follow_up` Review Inbox candidates with accept, archive, and dismiss actions.
- Daily brief generation computes closeout counts for changed work, completed work, waiting-on items, overdue items, due-today items, and move-or-decide candidates.
- Daily markdown notes persist closeout summaries so session context survives restarts.
- Release policy is documented and unsigned Windows ARM64 private validation is approved.
- Windows native module packaging is fixed by enabling Electron Builder native dependency rebuilds and unpacking `better-sqlite3` native `.node` files.
- Private ARM64 tester handoff is documented with artifact path, SHA-256, unsigned/private-only warning, expected install/reconnect/close/uninstall behavior, known empty-folder uninstall debt, and user-data safety notes.
- Uninstall still leaves an empty `%LOCALAPPDATA%\Programs\PraxisDesk` directory; this is accepted as low-priority release debt for private validation and tracked in `docs/TECH_DEBT.md`.
- AI Task Review route/service plumbing now produces packet-backed read-only review responses for reset/wins/forgetting/risk/stale prompts, and the Talk UI consumes those responses while preserving the no-write guardrail.
- AI Settings now persists local model/policy drafts, can probe local Ollama model availability, and shows scan-friendly probe results.
- Local Ollama AI Review generation now exists for selected available models through `127.0.0.1:11434/api/generate`, with deterministic fallback for no selected model, missing model, unavailable Ollama, timeout, invalid response, empty response, and HTTP/error cases.
- Async AI Review IPC now lets Talk request local review generation, show checking/generating/model/fallback states, display Ollama summaries when available, and fall back to deterministic `route.message` on IPC failure.
- Live Electron QA passed for the Talk fallback path with runtime `ollama`, no saved model, reliance policy `prefer_local`, probe status `no_model_selected`, all five AI Review prompts returning deterministic fallback, no-write guardrail visible, no work snapshot mutation, and desktop/narrow overflow checks passing.
- Local model-path Talk UI QA now passes with saved model `qwen2.5:0.5b-instruct`: reset, wins, forgetting, and risk show `Ollama / Model summary` with deterministic packet-rendered copy, stale projects safely falls back when there are no stale IDs to rank, the write boundary stays read-only, the work snapshot remains unchanged, and desktop/narrow Talk overflow checks pass.
- AI Review model-ranked rendering now uses mode-specific coach headings and suppresses duplicate presentation of the same visible work item when the packet exposes a shared stable ID or matching title/project/mission context.
- Latest integration verification passed: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build:app`, and `npm run storage:check`.

## NEXT STEPS

### 1. Complete AI Review Routing Policy And External Exposure

**GOAL**

Turn the async local Ollama review path into a polished routing policy that remains local-first, observable, and safe across PRAXIS surfaces. The feature should help the operator recover context, decide what matters, and restart work when attention has scattered.

**DIRECTION**

- Natural language remains the interface. Packet-backed read-only review routes exist for reset, wins, forgetting, risk, and stale projects; person/project lookup remains a lookup route.
- PRAXIS now builds a factual context packet before involving a model.
- The context packet is assembled from the work graph, calendar, Review Inbox, stale projects, waiting-on items, overdue items, quick wins, recent changes, daily brief/closeout summaries, and service health.
- Local Ollama generation can summarize, prioritize, explain tradeoffs, and suggest next moves when a selected local model is available.
- Rule-based ranking remains the safety net and should still produce deterministic fallback output when a model is unavailable or uncertain.
- The LLM must not silently mutate the task graph.
- Writes must go through Review Inbox candidates, staged drafts, or explicit confirmation commands.
- Model execution defaults local-first through Ollama.
- Settings now supports a configurable local model and local availability probing; routing still needs to decide whether probe results are live, cached, or stored as explicit state.
- Talk now uses async AI Review IPC to display model-generated summaries when available and deterministic fallback when needed.
- Optional API provider settings and encrypted provider secrets remain future work.
- Slack and companion exposure remain open if not already routed through the AI Review path.
- Live Electron model-generated Talk QA reached structured model-ranked output with `qwen2.5:0.5b-instruct`; the immediate generic-heading and duplicate visible-item copy polish is complete.
- The AI reliance policy should be explicit: model output can advise, summarize, and draft, but trusted local services own state changes.

**FILES**

- `docs/ARCHITECTURE.md`
- `docs/Roadmap.md`
- `docs/TECH_DEBT.md`
- `docs/MISSION_PLAN.md`

**DONE WHEN**

- Availability policy is explicit: model availability is checked live, cached, or stored as explicit routing state.
- Routing behavior accounts for unavailable, missing, available, no-model, timeout, invalid, empty, and HTTP/error states.
- API provider fallback remains disabled until secret storage and policy are implemented.
- Slack/companion review exposure is either wired through the same AI Review path or deliberately deferred.
- Live Electron QA against structured model-ranked AI Review output is complete, including actual Talk-surface model/fallback state validation.
- AI Task Review appears as the next core roadmap track before Rainmeter/background polish.
- Packet-backed read-only UX/routing/settings behavior remains intact.

### 2. Plan V1.1 Persistent Presence After AI Review

**GOAL**

Define how PRAXIS should live as a persistent Windows assistant after the AI review loop exists: visible when needed, present in the background, noisy enough to keep the operator on task, and controllable enough to preserve trust.

**DIRECTION**

- Keep tray/background behavior, close-to-tray, explicit quit, pause/quiet mode, and visible active status in V1.1 planning.
- Define notification/nudge boundaries after AI Task Review can explain priority and risk.
- Define a Rainmeter snapshot/export contract that is read-only by default and privacy-safe for wallpaper display.
- Keep direct writes inside PRAXIS surfaces or explicit confirmation paths, not Rainmeter.
- Rainmeter and persistent presence should not block AI Task Review planning.

**FILES**

- `docs/Roadmap.md`
- `docs/TECH_DEBT.md`
- `docs/ARCHITECTURE.md`
- `docs/MISSION_PLAN.md`

**DONE WHEN**

- V1.1 has a follow-on persistent-presence plan that depends on the AI review context packet rather than replacing it.

### 3. Keep Future Intelligence And Capture Tracks Execution-Focused

**GOAL**

Keep future PRAXIS direction visible without distracting from AI Task Review as the next concrete capability.

**DIRECTION**

- Preserve long-term goals: voice, local AI, companion remote trust, release signing, broader integrations, and invited conversation review.
- Keep `chat_imports` as the shared lane for Slack channel review, WhatsApp manual imports/business webhooks, and future mobile snippets.
- Treat local AI as a summarization/ranking/explanation layer, not the source of truth for writes.
- Keep speculative ideas in roadmap/debt docs, not the immediate execution queue.

**FILES**

- `docs/Roadmap.md`
- `docs/TECH_DEBT.md`
- `docs/ARCHITECTURE.md`
- `docs/MISSION_PLAN.md`
- `docs/WHATSAPP_INTEGRATION_NOTES.md`

**DONE WHEN**

- Long-term direction remains documented, while this queue leads with AI Task Review / ADHD Reset Mode and then persistent presence.
