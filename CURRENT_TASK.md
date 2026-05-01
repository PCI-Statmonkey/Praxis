# CURRENT TASK

## OBJECTIVE

Move the immediate execution queue to the Mission Control dashboard redesign. AI Task Review / ADHD Reset Mode remains core PRAXIS work and its model/output slice is now complete enough to support the next dashboard layer. Persistent presence, Rainmeter, and background wallpaper surfaces remain important V1.1 planning tracks, but they come after Mission Control can show what matters, why it matters, and what to do next.

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
- AI Review model-ranked rendering now uses mode-specific coach headings and source-aware de-duping. AI Review work items now preserve linked deadline source identity so todo/project/mission items and their linked deadlines can be presented once while standalone deadlines remain distinct.
- Final live Talk smoke confirmed the linked todo/deadline duplicate is gone for `3292 n 29th ct NEW RACKS 5-6-2025`, exact packet titles remain intact, no invented facts or internal mode leaks appeared, `No work has been changed.` stayed visible, and the work snapshot remained unchanged.
- AI Review model/output slice is complete for the local Talk path: packet-backed routing, local Ollama generation, deterministic fallback, model-ranked rendering, no-write guardrails, live fallback QA, live model-path QA, copy polish, linked deadline de-dupe, and final duplicate smoke are complete.
- Mission Control planning is accepted at coordinator checkpoint `bab4fa7 Add Mission Control technical map`.
- Mission Control redesign is now the next active planning/implementation track, guided by `docs/MISSION_CONTROL_UI_PLAN.md` and `docs/MISSION_CONTROL_TECH_PLAN.md`.
- Ana's baseline QA report is accepted as the dashboard visual/behavior baseline for the Mission Control redesign.
- Slack/companion AI Review exposure remains open unless explicitly closed in a future checkpoint.
- Latest integration verification passed: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build:app`, and `npm run storage:check`.

## NEXT STEPS

### 1. Implement Mission Control Dashboard Redesign

**GOAL**

Turn the current dashboard into Mission Control: a dense, calm, directive command center that tells the operator what needs attention now, why it matters, and what to do next.

**DIRECTION**

- Use `docs/MISSION_CONTROL_UI_PLAN.md` as the product and information-architecture source.
- Use `docs/MISSION_CONTROL_TECH_PLAN.md` as the implementation map and safe slicing guide.
- Lead the first screen with the operator's top move, time pressure, risks, waiting-on items, and service blind spots.
- Treat AI Review as an analysis/reset mode attached to the primary decision surface, not the whole dashboard.
- Keep Talk visible as the command channel without letting it dominate the dashboard.
- Preserve Review Inbox write-confirmation paths and assistant no-write boundaries.
- Start with dashboard selector extraction / data shaping before visual layout changes.
- Then move through Today lane component split, Mission Control layout CSS, and first-screen composition.
- Avoid mixing dashboard visual work with assistant routing, capture forms, Settings, or sync behavior.

**FILES**

- `docs/MISSION_CONTROL_UI_PLAN.md`
- `docs/MISSION_CONTROL_TECH_PLAN.md`
- `src/App.tsx`
- Optional new file: `src/dashboardSelectors.ts`
- `src/components/TodayTimelinePanel.tsx`
- `src/components/MemoryWriterPanel.tsx`
- `src/components/AssistantReviewSurface.tsx`
- `src/App.css`

**DONE WHEN**

- The first implementation slice extracts dashboard selectors/data shaping for service health, readiness, timeline items, review inbox composition, and operational-load inputs without changing JSX or CSS.
- The dashboard first screen answers: what is the top move, what time pressure exists, what is at risk, who is waiting, what PRAXIS cannot currently see, and whether the operator should work, triage, reset, or prepare.
- Mission Control uses the accepted UI hierarchy: command header, primary decision surface, calendar pressure, daily rhythm, Review Inbox, service health, and Talk.
- Implementation follows the technical map without changing assistant routing semantics, data semantics, or write-confirmation boundaries by accident.
- Desktop and narrow layouts remain usable.
- AI Review model/output behavior remains intact and read-only.

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
