# ENGINEERING LOG

## 2026-05-01 - Mission Control Selector And Copy Foundation

### Built

- Extracted dashboard selector/data shaping helpers from `src/App.tsx` into `src/dashboardSelectors.ts`.
- Moved review inbox composition, upcoming appointment/deadline filtering, service health shaping, and dashboard readiness derivation behind named selector helpers.
- Preserved the current JSX, CSS, action callbacks, assistant routing, and write-confirmation behavior.
- Added `docs/MISSION_CONTROL_COPY_GUIDE.md` with Mission Control labels, directive phrases, empty-state tone, service warning tone, AI Review wording, Review Inbox confirmation wording, Talk copy, and narrow-screen label guidance.

### Planned

- Accepted Ptolemy's first-screen design QA: desktop should preserve the shell but reweight hierarchy toward command header, Top Move, Priority Stack, Calendar Pressure, compact Daily Rhythm, Review/Reset, compact trust state, and reachable Command Channel.
- Accepted the narrow/mobile order: command header, Top Move, Calendar Pressure, At Risk/Blockers, Priority Stack, Review/Reset, Daily Rhythm, Review Inbox, Command Channel, Projects/Missions, full service health, full appointment/deadline lists, memory documents, and checklist.

### Still Open

- The next implementation slice should split Today/Mission Control lanes into presentational components before broad CSS/layout changes.
- Visual work must continue to avoid assistant routing, capture forms, Review Inbox write actions, Settings, and sync behavior.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run test:assistant` passes.
- `npm test` passes.
- `git diff --check` passes with line-ending normalization warnings only.

## 2026-05-01 - Mission Control Planning Reconciled

### Planned

- Reconciled the immediate execution queue after accepted Mission Control planning checkpoint `bab4fa7 Add Mission Control technical map`.
- Marked the AI Review model/output slice complete for the local Talk path, including local Ollama generation, deterministic fallback, model-ranked rendering, no-write guardrails, live fallback QA, live model-path QA, copy polish, linked deadline de-dupe, and final duplicate smoke.
- Promoted Mission Control dashboard redesign to the next active planning/implementation track.
- Referenced `docs/MISSION_CONTROL_UI_PLAN.md` as the product and first-screen information-architecture source.
- Referenced `docs/MISSION_CONTROL_TECH_PLAN.md` as the implementation map and safe-slice guide.
- Accepted Ana's baseline QA report as the dashboard visual/behavior baseline for Mission Control work.
- Set the first implementation slice to dashboard selector extraction / data shaping before visual layout changes.
- Preserved persistent presence, Rainmeter, and background wallpaper surfaces as follow-on V1.1 planning after Mission Control.

### Still Open

- Slack/companion AI Review exposure remains open unless explicitly closed in a future checkpoint.
- Mission Control implementation should preserve assistant routing semantics, data semantics, Review Inbox write-confirmation paths, and AI Review no-write boundaries.

### Verification

- `git status --short` showed only untracked `memory/` before this documentation update.
- `git diff --check` passes with line-ending normalization warnings only.

## 2026-05-01 - AI Review Final Duplicate Smoke

### Validated

- Ran focused live Electron Talk smoke against checkpoint `0291efb Deduplicate linked AI review deadlines`.
- Confirmed AI Settings are saved as `qwen2.5:0.5b-instruct` with `prefer_local`.
- Confirmed the Settings probe reports the saved model is available.
- Tested `I'm overwhelmed, reset me`, `What am I forgetting?`, and `What's about to bite me?`.
- Confirmed `3292 n 29th ct NEW RACKS 5-6-2025` appears once as the todo and the linked `Todo due:` deadline no longer appears in the same model-ranked response.
- Confirmed headings remain mode-specific: `Start here`, `Do not let this slip`, and `Watch this first`.
- Confirmed exact packet title rendering, no invented dates or tasks, no internal mode leaks, and `No work has been changed.`
- Confirmed the work snapshot before and after QA matched exactly.

### Still Open

- No remaining visible copy issues were found in this focused duplicate smoke.

### Verification

- `npm run build:app` passes.

## 2026-04-30 - AI Review Linked Deadline De-Dupe

### Built

- Added linked deadline source identity to `AIReviewWorkItem` through `linkedEntityKind` and `linkedEntityId`.
- Populated linked source identity from `DeadlineRecord.entityKind` and `DeadlineRecord.entityId` when building AI Review deadline items.
- Updated model-ranked presentation de-duping to use structured source keys instead of fuzzy title/project/mission matching.
- De-dupes linked todo, project, and mission deadlines against their parent work item when both are selected by the model.
- Keeps standalone deadlines distinct even when they share similar or matching titles.
- Preserved exact packet-title rendering, JSON parsing and validation, fallback behavior, the read-only write boundary, and `No work has been changed.`

### Still Open

- Final live Talk smoke passed in the follow-up AI Review Final Duplicate Smoke entry.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-30 - AI Review Copy Smoke Follow-Up

### Validated

- Ran quick live Electron Talk smoke against checkpoint `4ef1489 Polish AI review rendered copy`.
- Confirmed mode-specific model-ranked headings appear: `Start here`, `Take this win`, `Do not let this slip`, and `Watch this first`.
- Confirmed `Recommended starting point` no longer appears in model-ranked output.
- Confirmed exact packet titles, no invented facts, no internal mode leaks, and the no-write guardrail remain intact.
- Confirmed stale-project review safely falls back when the packet has no stale project IDs.
- Confirmed the work snapshot before and after QA matched exactly.

### Still Open

- Follow-up linked deadline source identity work has been implemented and needs one final live Talk smoke on the real workspace data.

### Verification

- `npm run build:app` passes.

## 2026-04-30 - AI Review Render Copy Polish

### Built

- Replaced generic accepted-model selection headings with mode-specific coach copy: `Start here`, `Take this win`, `Do not let this slip`, `Watch this first`, and `Review this stale lane`.
- Added deterministic presentation de-duping for model-ranked work items by stable ID and normalized title/project/mission context.
- Preserved exact packet title rendering, factual lines, fallback behavior, safety validation, the read-only write boundary, and `No work has been changed.`
- Added regression coverage for mode heading copy and duplicate todo/deadline presentation.

### Still Open

- Follow-up live smoke found linked todo/deadline duplicates still visible when the packet does not expose the deadline's linked source entity.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-30 - Structured AI Review Talk QA

### Validated

- Ran live Electron Talk UI QA against checkpoint `f5dbc9f Structure local AI review output`.
- Confirmed AI Settings are saved as `qwen2.5:0.5b-instruct` with `prefer_local`.
- Confirmed the Settings probe reports `Saved Ollama model found: qwen2.5:0.5b-instruct.`
- Tested `I'm overwhelmed, reset me`, `Give me a few wins`, `What am I forgetting?`, `What's about to bite me?`, and `What projects are stale?` through the actual Talk controls.
- Confirmed reset, wins, forgetting, and risk show `Ollama / Model summary` with exact packet titles, no invented facts, no internal mode leaks, and the no-write guardrail.
- Confirmed stale-project review uses deterministic fallback when the packet has no stale project IDs to rank.
- Confirmed the work snapshot before and after QA matched exactly.
- Confirmed desktop and narrow Talk layouts show no visible Talk overflow and keep controls visible.

### Still Open

- The immediate heading and duplicate visible-item copy polish passed in the follow-up AI Review Render Copy Polish entry.
- Stale-project empty-state behavior remains safe as fallback; if product wants an Ollama-labeled empty-state response, add an explicit synthetic empty-state selectable item rather than asking the model to invent one.

### Verification

- `npm run build:app` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.

## 2026-04-30 - Structured AI Review Model Output

### Built

- Changed local Ollama AI Review generation to request JSON-mode output with `format: "json"`.
- Replaced free-text model summaries with a structured selection contract: schema version, mode, ranked stable IDs, emphasis, and optional coach line.
- Restricted prompt choices to mode-scoped `allowedStableIds` and compact packet facts.
- Added validation for schema, requested mode, emphasis, known stable IDs, mode-valid stable IDs, duplicates, maximum selected IDs, mutation language, internal mode wording, and invalid dates.
- Rendered final model-ranked AI Review messages deterministically from packet records instead of showing model-written factual prose.

### Validated

- Confirmed `qwen2.5:0.5b-instruct` is selected with `prefer_local` and available through the PRAXIS Settings probe.
- Ran live Electron IPC QA for `reset`, `quick_wins`, `forgetting`, `risk_review`, and `stale_projects`.
- Confirmed reset, wins, forgetting, and risk return `summarySource: "ollama"` with packet-rendered copy and `No work has been changed.`
- Confirmed stale-project review falls back safely when there are no stale project IDs for the model to rank.
- Confirmed work snapshot before and after live IPC QA matched exactly.

### Still Open

- Actual Talk UI QA passed in the follow-up structured AI Review Talk QA entry.
- Stale-project empty-state behavior is safe as fallback; if product wants an Ollama-labeled empty-state response, add an explicit synthetic empty-state selectable item rather than asking the model to invent one.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run build:app` passes.

## 2026-04-30 - Qwen Local AI Review Model-Path QA

### Built

- Increased local Ollama generation timeout for AI Review and changed the model prompt to compact, mode-specific facts instead of the full review packet.
- Tuned the prompt toward direct coach-style answers while preserving the read-only/no-mutation boundary.
- Added grounding checks so model summaries fall back when they do not include exact packet titles or when they introduce dates outside packet facts.
- Updated regression coverage for the stricter grounded model-summary path.

### Validated

- Installed and selected `qwen2.5:0.5b-instruct` for local Ollama AI Review.
- Confirmed Ollama availability through `127.0.0.1:11434/api/tags`.
- Confirmed PRAXIS Settings probe reports `Saved Ollama model found: qwen2.5:0.5b-instruct.`
- Ran live Electron IPC QA for `reset`, `quick_wins`, `forgetting`, `risk_review`, and `stale_projects`.
- Confirmed all five modes can return `summarySource: "ollama"` with sub-5-second generation.
- Confirmed `writeBoundary: "read_only"` and `No work has been changed.` remain present.
- Confirmed the work snapshot before and after QA matched exactly.

### Still Open

- Small local model copy quality still needs polish before model-generated Talk output is daily-use complete.
- The current grounding guards reject missing exact titles and invented ISO/month-name dates, but additional output-shape checks may be needed if small models continue to paraphrase too freely.
- Actual Talk-surface QA should verify visible model state, fallback state, and desktop/narrow layout with the selected Qwen model.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run build:app` passes.

## 2026-04-30 - Live AI Review Talk Fallback QA

### Validated

- Ran live Electron QA for AI Review in Talk with no code edits.
- Confirmed AI runtime `ollama`, no saved model, reliance policy `prefer_local`, and Ollama probe status `no_model_selected`.
- Tested `I'm overwhelmed, reset me`.
- Tested `Give me a few wins`.
- Tested `What am I forgetting?`.
- Tested `What's about to bite me?`.
- Tested `What projects are stale?`.
- Confirmed all prompts returned deterministic fallback with visible fallback state and the no-write guardrail.
- Confirmed work snapshot before and after matched; no work records were mutated.
- Confirmed desktop and narrow Talk overflow checks passed.

### Still Open

- Model-generated AI Review path still needs live QA after a saved Ollama model is configured.
- The write boundary remains read-only: AI Review may explain and suggest, but task graph writes still require Review Inbox, staged drafts, or explicit confirmation.

### Verification

- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-30 - Async AI Review IPC And Talk Wiring

### Built

- Added async AI Review IPC through `window.praxis.assistant.generateAIReview({ mode })`.
- Returned `message`, `mode`, `summarySource`, `fallbackReason`, `modelPlan`, `suggestedStableIds`, and `writeBoundary` from async review generation.
- Wired the IPC path to `buildLocalAIReviewResponse`.
- Returned read-only failure responses for invalid or non-review kinds.
- Preserved the no-mutation boundary and made no API provider calls from the async IPC path.
- Wired Talk so routes with `route.aiReview` trigger async generation.
- Added Talk UI states for checking, generating, model, and fallback responses.
- Displayed model state when `summarySource` is `ollama`.
- Displayed deterministic fallback state and fallback reason when local generation falls back.
- Kept IPC failure on the existing deterministic `route.message` fallback.
- Preserved the no-write guardrail, person/project lookup behavior, and capture confirmations.

### Still Open

- The team still needs to decide whether model availability should be checked live, cached, or stored as explicit availability state for routing.
- API provider secret storage and remote model fallback remain open.
- Slack and companion exposure remain open if not already routed through the AI Review path.
- Live Electron real-data QA remains open if the current async path has not been validated against the operator workspace.
- The write boundary remains read-only: AI Review may explain and suggest, but task graph writes still require Review Inbox, staged drafts, or explicit confirmation.

### Verification

- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-30 - Ollama Review Generation And Probe Polish

### Built

- Polished the AI Settings probe display with scan-friendly availability badges.
- Added saved model and installed tag count display for local Ollama status.
- Capped the installed tag summary with `+N more` for long local model lists.
- Clarified in Settings copy that assistant routing does not depend on probe status yet.
- Added real local-only Ollama AI Review generation against `127.0.0.1:11434`.
- Checked local model availability through `/api/tags` before generation.
- Generated model summaries through `/api/generate` with `stream: false`.
- Added timeout, HTTP/error, invalid response, and empty response handling.
- Kept no selected model, missing model, unavailable Ollama, timeout, invalid response, and empty response paths on deterministic fallback output.
- Preserved read-only output for successful Ollama summaries and appended `No work has been changed.`

### Still Open

- The routed Talk path remains deterministic because assistant routing is synchronous; async route/UI wiring is still needed before Talk can display model-generated summaries.
- The team still needs to decide whether model availability should be checked live, cached, or stored as explicit availability state for routing.
- API provider secret storage and remote model fallback remain open.
- Slack and companion exposure remain open if not already routed through the AI Review path.
- The write boundary remains read-only: AI Review may explain and suggest, but task graph writes still require Review Inbox, staged drafts, or explicit confirmation.

### Verification

- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-30 - AI Review Routed Into Talk And Ollama Probe

### Built

- Polished the AI Settings panel so it distinguishes saved state from draft edits.
- Added an unsaved-changes badge and disabled save behavior when the AI model name and reliance policy are unchanged.
- Added local Ollama model availability probing against `127.0.0.1:11434/api/tags`.
- Added timeout, unavailable, missing, available, and no-model availability states without activating API secrets or provider paths.
- Exposed packet-backed AI Review responses through assistant routing with a `route.aiReview` payload.
- Added deterministic read-only fallback text in `route.message` for AI review routes.
- Routed reset, wins, forgetting, risk, and stale-project prompts through the AI review payload while keeping person/project lookup on the person lookup path.
- Wired the Talk UI to consume `route.aiReview` and display packet-backed AI review answers.
- Rendered multi-line AI review responses correctly.
- Suppressed the local preview when a packet-backed answer is current.
- Kept the no-write guardrail visible in the Talk review surface.

### Still Open

- Assistant routing does not yet use the Ollama probe result when selecting response behavior.
- Real Ollama model invocation for AI review summaries remains open.
- API provider secret storage and remote model routing remain open.
- Slack and companion exposure remain open if not wired through the packet-backed review path.
- The team still needs to decide whether model availability should be checked live, cached, or stored as explicit availability state.
- The write boundary remains read-only: AI Review may explain and suggest, but task graph writes still require Review Inbox, staged drafts, or explicit confirmation.

### Verification

- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-28 - AI Settings Persistence And Review Context Packet

### Built

- Persisted the AI Settings policy so the local Ollama model name and reliance policy survive reloads.
- Added the settings IPC and preload bridge needed for saving AI model policy from Settings.
- Added a deterministic AI Review context packet builder covering work graph counts, calendar pressure, Review Inbox, stale projects, waiting-on items, overdue/due-soon work, quick wins, recent closeout changes, and service health.
- Added `electron/aiReviewService.ts` as the model-routing skeleton for deterministic read-only AI review responses.
- Mapped review route kinds to review modes so reset, wins, forgetting, risk, stale-project, and lookup requests can share the packet-backed review path.
- Planned Ollama/API routing from persisted AI settings without making network or API calls.
- Added confirmation-required action hints to context packet items so model-assisted review cannot silently mutate the task graph.
- Added regression coverage for AI settings normalization, packet ranking, context packet source coverage, and secret/local raw-data redaction.

### Why

- The first AI Review UX now has a factual, deterministic packet source to hand to future model routing.
- Settings now records the local-first model policy needed before runtime model selection is wired in.
- The routing skeleton preserves read-only write boundaries while making room for model-backed summaries later.
- Full model routing remains open in `CURRENT_TASK.md`.
- Real Ollama invocation, model probing, provider secrets, and desktop/Slack/companion exposure remain open.

### Verification

- Reported verification passed: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build:app`, and `npm run test:assistant`.
- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-28 - Talk And Dashboard AI Review Cleanup

### Built

- Tightened the Talk panel after the AI Task Review first slice landed.
- Added the Assistant Review surface to the dashboard Talk flow as a non-writing reset, wins, forgetting, risk, and stale-project review aid.
- Reduced Talk panel vertical dead space so the review surface and capture form fit better together.
- Updated the Talk subtitle to `ask, reset, or capture work`.
- Added compact responsive styling for review prompt buttons, review output, and capture guide columns.

### Why

- The first AI Task Review slice needed to feel native to the operator dashboard rather than like a separate planning panel.
- The cleanup keeps the review controls discoverable while preserving the no-write guardrail.

### Verification

- `git diff --check` passes with line-ending normalization warnings only.

## 2026-04-28 - AI Task Review First Slice Integrated

### Built

- Added read-only assistant review routing for reset, quick wins, forgetting, risk, stale projects, and person/project lookup prompts.
- Added regression coverage that keeps those review prompts on read-only report/lookup intents and rejects a write-like command.
- Added an AI Settings tab that documents local-first Ollama, configurable local model direction, optional API fallback planning, encrypted API secret expectations, and AI reliance policy.
- Added a Talk panel Assistant Review surface with reset/wins/forgetting/risk/stale prompt buttons and deterministic local summaries from the current work snapshot.
- Kept the review surface non-writing; creating or changing work still requires explicit confirmation or Review Inbox.
- Updated `CURRENT_TASK.md` so the first UX/routing/settings slice is marked complete while full context-packet and model routing work remains open.

### Why

- AI Task Review / ADHD Reset Mode needed a first practical slice that operators can see and use without waiting for the full LLM packet builder.
- The first slice keeps natural-language review discoverable while preserving the write boundary.
- Full context packets, local/API model routing, and richer explanation remain the next core track.

### Verification

- `git diff --check` passes with only line-ending normalization warnings.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.

## 2026-04-28 - AI Task Review Planning Reprioritized

### Built

- Rewrote `CURRENT_TASK.md` so the immediate queue leads with AI Task Review / ADHD Reset Mode.
- Moved Rainmeter, tray/background behavior, and persistent presence behind AI Task Review in the V1.1 planning queue.
- Added the architecture contract for factual AI review context packets.
- Documented that natural language is the AI review interface.
- Documented that PRAXIS builds the context packet from work graph, calendar, Review Inbox, stale projects, waiting-on items, overdue items, quick wins, recent changes, and service health before model use.
- Documented the model role: summarize, prioritize, explain, and suggest.
- Documented that rule-based ranking remains the fallback and safety net.
- Documented the write boundary: the LLM must not silently mutate the task graph, and write-like actions go through Review Inbox, staged drafts, or explicit confirmation.
- Updated roadmap, mission, and tech debt docs with local-first Ollama direction, configurable local model, optional API provider settings, and AI reliance policy.

### Why

- AI Task Review is core PRAXIS, not optional polish.
- The operator needs a natural-language reset loop before desktop wallpaper, Rainmeter, or persistent background presence can be useful.
- Persistent presence should reuse the same priority/risk explanation layer instead of becoming a separate notification system.

### Verification

- Documentation-only change.
- `git diff --check` passes with only line-ending normalization warnings.

## 2026-04-27 - Outlook Mail Connected Through GoDaddy Microsoft 365

### Built

- Completed Microsoft Entra access recovery for the GoDaddy-hosted Microsoft 365 tenant.
- Registered the `Praxis Desk` Microsoft application with delegated Graph permissions.
- Saved and corrected the Outlook mail row for `Pedro@BDNC.pro`.
- Added editable saved-row controls for Google/Outlook mail and calendar connection rows so typos can be fixed without deleting the connection.
- Connected Outlook Mail through Microsoft OAuth.
- Validated Outlook Mail live sync against the local PRAXIS database.
- Outlook Mail imported local privacy-safe summaries and produced 7 pending follow-up candidates for Review Inbox triage.
- Connected Outlook Calendar through Microsoft OAuth.
- Validated Outlook Calendar live sync; the sync completed successfully and imported no Outlook appointments into the current local appointment store.
- Completed first Outlook Review Inbox triage.
- Cleared all 7 pending Outlook follow-up candidates.
- The first Outlook triage added 4 active projects and 1 active todo to the work graph.
- Removed the completed Outlook validation/review task from `CURRENT_TASK.md`.

### Why

- Outlook is required for the operator's real workflow.
- The earlier blocker was GoDaddy admin access, not a product decision to skip Outlook.
- The first Outlook connection exposed a practical settings gap: saved account hints need to be editable.

### Verification

- Outlook mail connection status is `ready`.
- Outlook mail sync status is `ready_to_sync`.
- Last Outlook mail sync timestamp is `2026-04-27T15:51:15.321Z`.
- Outlook calendar connection status is `ready`.
- Outlook calendar sync status is `ready_to_sync`.
- Last Outlook calendar sync timestamp is `2026-04-27T15:53:47.652Z`.
- Local appointment counts currently show 3 Google appointments and 0 Outlook appointments.
- `npm run companion:snapshot` reports 0 pending email follow-up candidates.
- The work graph now includes 4 active projects, 2 active todos, and 6 active deadlines.

## 2026-04-27 - Outlook Setup Guidance Prep

### Built

- Expanded the unified Outlook Settings panel developer setup copy.
- The panel now explains that one Microsoft Entra app registration can serve both Outlook Mail and Outlook Calendar.
- The setup copy now calls out the exact local redirect URIs, Microsoft Graph delegated permissions, and that a client secret is usually not needed for the local public desktop flow.
- Added a GoDaddy-hosted Microsoft 365 warning: if GoDaddy redirects away from Microsoft Entra and App registrations are unavailable, Outlook Graph sync is blocked until direct Entra app registration access exists.
- Launched the desktop app for interactive Outlook setup.
- Confirmed the operator's GoDaddy admin menu exposes Exchange as the only advanced Microsoft admin center.
- Documented that GoDaddy blocks tenant-owned Microsoft Entra App registrations for the current mailbox tenant.
- Restored Outlook as a required V1 path after operator clarification.
- Updated the active plan to try a separate multi-tenant Microsoft/Azure app registration and validate whether the GoDaddy mailbox can grant delegated consent during login.
- Updated the Outlook setup UI to explain that the app registration can live outside the GoDaddy tenant if it is configured as multi-tenant.

### Why

- Outlook setup has the same dev-mode complexity as Google setup, and the operator is ready to connect both mail and calendar.
- The Settings UI should guide a non-Entra expert through the exact Microsoft steps instead of assuming they know where redirect URIs and delegated permissions live.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.
- `npx electron dist-electron/main.js --companion-command "create a mission for BDNC operations"` returns a non-writing mission preview requiring confirmation.

### Follow-Up Fix

- Labeled capture-review date fields so mission drafts say `Due date, optional`, todo drafts say `Due date`, and appointment drafts distinguish `Start date and time` from optional end time.
- Added compact styling for capture-review field labels.

## 2026-04-27 - Slack Command Parity And Outlook Debt Cleanup

### Built

- Removed the stale `Outlook Graph Validation Blocked By GoDaddy Microsoft 365` section that contradicted the current connected Outlook state.
- Moved the old Outlook Calendar live-validation risk into resolved tech debt.
- Added Slack DM support for appointment reports, matching the desktop and companion appointment-report route.
- Changed direct Slack work-write routes to stage a `work_update_confirmation` context and require `yes` or `no` before mutating local work.
- Updated Slack fallback guidance to advertise appointment reports and confirmed work follow-ups.
- Added regression coverage for accepting or declining a single pending work-update confirmation.

### Why

- Future sessions need docs to show that Outlook Mail and Calendar are connected through the current V1 path, while still preserving the residual GoDaddy setup risk.
- Slack should not be a looser write surface than companion mode.
- Appointment reports were a clear desktop/companion capability that Slack did not yet expose.

### Verification

- `npx tsc --noEmit` passes.
- `npm run test:assistant` passes.
- `npm run lint` passes.
- `npm run build:app` passes.

## 2026-04-27 - Slack Natural-Language Capture Parity

### Built

- Added Slack DM preview-and-confirm capture for missions, todos, and appointments.
- Added per-DM pending capture state so Slack can show the parsed draft, wait for `yes`, and save only after explicit confirmation.
- Added Slack handling for ambiguous capture choices such as call-like input, where the operator can reply `todo`, `appointment`, or `no`.
- Updated Slack fallback help to advertise mission/todo/appointment capture examples.

### Why

- Desktop Talk and companion commands already supported confirmed mission/todo/appointment capture.
- Slack still routed capture-like text to generic help, leaving a parity gap for the same assistant command backbone.
- Slack writes should stay explicit and reversible at the decision point instead of silently mutating local work state.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run test:assistant` passes.
- `npm run build:app` passes.

## 2026-04-27 - Conversation Review Command Shape

### Built

- Added a shared `conversation_review` assistant route with source hints for Slack, WhatsApp, SMS, manual imports, or unknown chat sources.
- Routed desktop, Slack, and companion command mode through the new intent.
- Kept the behavior intentionally non-writing until `chat_imports` storage exists.
- Connected the route to the built-in `chat-triage` skill and added companion as a supported chat-triage surface.
- Updated WhatsApp integration notes with the current command behavior and unsupported surface limits.

### Why

- The long-term invited-conversation workflow needs a stable command contract before building chat storage or Review Inbox ingestion.
- Personal WhatsApp/SMS direct reading is still unsupported, so Praxis should recognize the request without pretending it can ingest those sources yet.

### Verification

- `npx tsc --noEmit` passes.
- `npm run test:assistant` passes.
- `npm run lint` passes.
- `npm run build:app` passes.
- `npm run skills:list` passes with `chat-triage` exposed on desktop, Slack, and companion.
- `npx electron dist-electron/main.js --companion-command "review this WhatsApp conversation"` returns the structured `conversation_review` route and a clear unsupported-storage message.

## 2026-04-27 - Chat Import Storage Lane

### Built

- Added normalized `chat_imports`, `chat_import_participants`, and `chat_import_messages` SQLite tables.
- Added shared chat import types for source system, conversation title, participants, timestamps, summaries/snippets, and source references.
- Added `chatImportRepository` with import/upsert behavior and recent snapshot reads.
- Exposed renderer IPC as `window.praxis.chat.getSnapshot()` and `window.praxis.chat.importConversation(...)`.
- Added chat import integrity checks for source values, dates, duplicate external identities, and foreign keys.
- Fixed storage integrity validation so archived email follow-ups are accepted as valid routed suggestions.

### Why

- The `review conversation` command needed a real storage target before chat triage can produce Review Inbox candidates.
- Chat capture must store summaries/snippets and references, not full raw personal chat logs by default.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run test:assistant` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings.

## 2026-04-27 - Gmail Candidate Decisions And Archive Recommendations

### Built

- Applied the operator-approved decisions for the first live Gmail follow-up batch.
- Created the `Follow up: Studio 2 touching base.` candidate as an active high-priority quick-action todo due April 28, 2026 at 5:00 PM.
- Archived the two stale `Meeting moved to tomorrow` candidates because their implied dates were already past and they did not show an open/waiting-on signal.
- Added `archived` as a first-class email suggestion status instead of overloading dismissals.
- Added Review Inbox recommendation fields so PRAXIS can recommend `create_todo`, `create_project`, `archive`, or `review` while still asking for operator approval.
- Added an archive action to the desktop Review Inbox and Electron IPC/preload boundary.
- Added headless Electron commands for accepting and archiving email suggestions so validated decisions can be applied without raw SQLite edits.
- Updated Review Inbox regression coverage so past-date suggestions without open/pending/waiting signals recommend archive, while past-date suggestions with open signals remain actionable.
- Removed the completed Gmail review and extraction-tuning steps from `CURRENT_TASK.md`.

### Why

- The operator wants PRAXIS to make useful judgment calls and ask for approval, not merely list raw candidates.
- Past-date email suggestions are noise unless there is evidence of a still-open item.
- Archive needs to be distinct from dismiss so PRAXIS can separate stale-but-understood items from false positives.

### Verification

- `npx tsc --noEmit` passes.
- `npm run test:sync` passes.
- `npm run build:app` passes.
- `npm run companion:snapshot` confirms 0 pending email follow-ups and 1 active todo from Gmail.

## 2026-04-27 - Unified Review Inbox

### Built

- Added a shared source-neutral Review Inbox model that maps pending Gmail follow-up candidates into review items with source, sender, subject, snippet, suggested action, confidence, due date, reason, and overdue state.
- Added a dashboard Review Inbox panel that starts with pending Gmail candidates and keeps existing accept/dismiss actions.
- Replaced the older dashboard email-only follow-up lane with the Review Inbox.
- Added review inbox regression coverage for pending-only filtering, Gmail source labeling, overdue sorting, and overdue detection.
- Updated `CURRENT_TASK.md` so the completed unified inbox step moved out of the active queue.

### Why

- PRAXIS needs one review queue for suggested tasks, projects, mission notes, deadlines, contact updates, and future invited conversation imports.
- The operator still needs to make judgment calls before email suggestions become real work, so the UI should present the evidence clearly instead of hiding it in provider settings.

### Verification

- `npm run test:sync` passes.
- `npx tsc --noEmit` passes.

## 2026-04-27 - Gmail Follow-Up Review Clarity

### Built

- Reviewed the current Gmail follow-up snapshot through the companion-safe data path.
- Confirmed there are still 3 pending Gmail follow-up candidates that need operator accept/dismiss decisions.
- Improved the unified Google service panel so each pending Gmail candidate shows sender, received time, proposed due date, subject, summary, reason, confidence, and accept/dismiss actions.
- Fixed email suggestion extraction so relative dates such as `tomorrow` are interpreted from the email's `receivedAt` timestamp instead of the day PRAXIS reviews or syncs the message.
- Added regression coverage for an older Gmail message whose `tomorrow` wording should resolve relative to the original email date.

### Why

- The first real Gmail candidates exposed that PRAXIS should not silently create work from private email without the operator's judgment.
- The same review exposed a deterministic extraction bug: relative-date language could drift forward if an email was reviewed days after it arrived.

### Verification

- `npm run test:sync` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## 2026-04-26 - Dashboard Empty States And Desktop Presence Polish

### Built

- Added a reusable dashboard `EmptyState` component.
- Replaced plain empty-state paragraphs across the Operator Grid with clearer, domain-specific empty states.
- Improved empty states for missions, standalone projects, people, timeline, priority stack, focus reports, appointment reports, daily brief details, upcoming appointments, deadlines, memory documents, and checklist views.
- Updated the top navigation local status into a stronger `Home Node` presence indicator with local storage status.
- Preserved existing dashboard panels, actions, forms, routing, and data flows.
- Removed the completed dashboard UI polish task from `CURRENT_TASK.md` so the active queue advances to email-related work.

### Why

- The dashboard structure was already functional, but empty surfaces were terse and made the app feel unfinished when data was sparse.
- PRAXIS should feel like a local resident desktop assistant even before every integration has data.

### How

- `praxis-desktop/src/components/EmptyState.tsx` provides the shared empty-state treatment.
- `TodayTimelinePanel`, `ProjectStackPanel`, and `MasterChecklistPanel` now use explicit empty-state copy for their quiet states.
- `praxis-desktop/src/App.tsx` and `src/App.css` tighten the local Home Node presence indicator and add empty-state styling.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.
- `npm test` passes.

## 2026-04-27 - Gmail Live Sync Validation

### Built

- Completed live Gmail OAuth setup against the operator's real Google account.
- Enabled the Gmail API in the linked Google Cloud project after Google returned a disabled-API sync error.
- Validated that Gmail sync imports privacy-safe local summaries rather than raw email bodies.
- Confirmed the unified Google Settings panel is the right direction for combining Gmail and Google Calendar setup.

### Why

- Email setup was the final blocked task in `CURRENT_TASK.md`.
- The app needed a real-provider validation pass to prove the OAuth, token storage, Gmail API fetch, summary import, and follow-up detection path works end to end.
- The setup UX needed to explain dev-mode provider requirements without assuming prior Google Cloud or Microsoft Entra experience.

### How

- The Google Cloud OAuth client was connected through Praxis Settings.
- The Gmail API disabled-project error was resolved by enabling Gmail API for project `118400372797`.
- Local SQLite state was inspected using only provider, status, timestamps, subjects, senders, summaries, and counts.
- Gmail imported 25 summaries from April 20, 2026 through April 27, 2026.
- Gmail generated 3 pending email follow-up candidates.

### Verification

- Gmail email connection status is `ready`.
- Gmail sync status is `ready_to_sync`.
- Last Gmail sync timestamp is `2026-04-27T12:31:56.872Z`.
- Gmail summaries are stored in `email_messages`.
- Gmail follow-up candidates are stored as `email_follow_up` inbox facts.
- Raw email bodies were not written to markdown memory.

## 2026-04-27 - Service Health And Invited Conversation Planning

### Built

- Updated `CURRENT_TASK.md` so the next 10 steps include a service health strip, unified review inbox, dashboard daily ritual states, and long-term local AI/conversation capture tracks.
- Expanded WhatsApp integration notes with platform feasibility guidance for Slack, WhatsApp, and SMS.
- Recorded post-V1 low-friction mobile capture ideas such as Android share target, share-sheet handoff, screenshot-to-Praxis fallback, notification-forwarding research, and iOS share extension capture.
- Kept the recommended conversation path review-first: invited Slack channels, manual WhatsApp/SMS import, future companion mobile snippets, and business WhatsApp webhooks only if a real business-number workflow appears.

### Why

- The operator wants PRAXIS to become better at watching explicitly invited conversations and turning them into todos, projects, mission notes, and deadlines.
- Platform access differs sharply between Slack, WhatsApp, Android SMS, and iOS Messages, so the plan needs to preserve privacy and avoid brittle or policy-hostile integrations.
- Copy/paste into Praxis is too much friction for mobile conversation capture, so lower-friction handoff ideas should be preserved for the companion/mobile phase without becoming V1 scope.

### Verification

- Documentation-only change; no code verification was required.

## 2026-04-27 - Dashboard Service Health Strip

### Built

- Added a compact dashboard service health strip for Google, Outlook, Slack, Memory, and Companion.
- Extended the dashboard load path to read existing Settings, Storage, Slack, and Companion snapshots alongside work, daily brief, and email state.
- Improved the unified Google/Outlook Settings panels so mail rows show last checked time, stored summary count, newest message time, and pending review count.
- Kept Gmail disabled-API recovery visible only when that provider-specific sync error exists.
- Removed the completed service-health task from `CURRENT_TASK.md`.

### Why

- After Gmail live sync, the operator still needed a normal UI-level way to know whether PRAXIS actually checked mail.
- Connected services should be visible without opening SQLite, logs, or provider setup pages.

### How

- `praxis-desktop/src/App.tsx` now loads service snapshots and renders the health strip below the top navigation.
- `praxis-desktop/src/components/ConnectedServiceSettingsPanel.tsx` now summarizes mail/calendar sync state directly in each service panel.
- `praxis-desktop/src/App.css` adds compact service health card styles and responsive behavior.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.
- `npm test` passes.

## 2026-04-27 - Google Calendar Live Validation From Unified Service Panel

### Built

- Validated the existing `Google Primary` calendar row from the unified Google service workflow.
- Confirmed Google Calendar authorization is `ready` and sync status is `ready_to_sync`.
- Confirmed Google Calendar imported 3 future appointment records into local storage.
- Fixed the appointment report so `upcoming` can include future appointments beyond the previous 14-day window.
- Stabilized database resolution so headless Electron commands use `AppData\Roaming\praxis-desktop\praxis.sqlite`, matching the live desktop app instead of falling back to `AppData\Roaming\Electron`.
- Removed the completed Google Calendar validation task from `CURRENT_TASK.md`.

### Why

- Gmail was validated, but V1 also needs calendar awareness to work from the new service-based Google panel.
- The validation exposed two practical V1 issues: headless commands were reading the wrong database folder, and appointment reports hid valid synced events when the next event was more than 14 days away.

### How

- Queried the active local app database for Google calendar connection status and imported appointment records.
- Ran the companion command path with `show my upcoming schedule`.
- `electron/appointmentReport.ts` now treats `upcoming` as all future appointments.
- `electron/praxisDb.ts` now resolves the database path through a stable `praxis-desktop` app-data folder.

### Verification

- Google calendar connection status is `ready`.
- Google calendar sync status is `ready_to_sync`.
- Last Google calendar sync timestamp is `2026-04-27T13:12:45.038Z`.
- Appointment report returns 3 Google appointments, with `You are invited to record on Tabletop Talk` first.
- `npm run build:app` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.

## 2026-04-26 - Release Signing Decision Path

### Built

- Documented the first practical release target as the Windows `x64` NSIS installer from `npm run package:win`.
- Documented Windows `arm64` as an explicit secondary package path rather than the default release artifact.
- Documented that unsigned installers are acceptable for local/internal validation only.
- Documented that public or broadly shared builds should be signed before distribution.
- Documented the signing automation guardrail: no certificate paths, passwords, tokens, or signing commands until certificate ownership, secret storage, build location, and distribution channel decisions are made.
- Updated `docs/TECH_DEBT.md` so remaining release debt is focused on signing implementation and distribution choices.
- Expanded `docs/RELEASE_CHECKLIST.md` with unsigned-build handling and signing prerequisites.
- Removed the completed release/signing decision task from `CURRENT_TASK.md` so the active queue advances to dashboard UI polish.

### Why

- Packaging is now stable and branded, but signing still needs explicit decisions before any automation is safe.
- Signing credentials are secrets, so the release path needs a documented storage and execution model before Electron Builder signing config is added.

### How

- `docs/DECISIONS.md` now records release target, architecture, signing, automation, and signing-secret decisions.
- `docs/TECH_DEBT.md` now tracks unresolved signing implementation and distribution channel choices.
- `docs/RELEASE_CHECKLIST.md` now separates unsigned validation builds from future signed release approval.

### Verification

- Documentation-only change; no code verification was required.

## 2026-04-26 - Packaging Polish And Release Checklist

### Built

- Added branded Praxis icon source and generated packaging/runtime icon assets.
- Updated Electron Builder so Windows packages use `build/icon.ico` instead of the default Electron icon.
- Updated Linux packaging metadata to use `build/icon.png` where practical.
- Updated runtime BrowserWindow icon paths to use `public/praxis-icon.png`, which Vite copies into `dist`.
- Added `docs/RELEASE_CHECKLIST.md` for the current manual release path.
- Linked the release checklist from `docs/readme.md` and `praxis-desktop/README.md`.
- Updated `docs/TECH_DEBT.md` so icon/product metadata debt is marked resolved and release debt now focuses on signing.
- Removed the completed packaging polish task from `CURRENT_TASK.md` so the active queue advances to release/signing decisions.

### Why

- Packaging was already stable, but documented follow-up work still called out default Electron branding and the lack of a release checklist.
- The release checklist needed to stay operational and avoid speculative signing automation because signing decisions are the next task.

### How

- `praxis-desktop/build/praxis-icon.svg` is the checked-in icon source.
- `praxis-desktop/build/icon.ico` is used by Windows Electron Builder packaging.
- `praxis-desktop/build/icon.png` is available for Linux packaging metadata.
- `praxis-desktop/public/praxis-icon.png` is used by runtime Electron windows in development and packaged builds.
- `praxis-desktop/electron-builder.json5` now points Windows and Linux packaging at the branded assets.
- `praxis-desktop/electron/main.ts` now uses the branded runtime icon for the main and Settings windows.

### Verification

- `npm run build:app` passes.
- `npm run package:win` passes and produced `release/win-x64/0.1.0/Praxis Desk-Windows-0.1.0-Setup.exe`.
- `npm test` passes.
- `npm run lint` passes.

## 2026-04-26 - Calendar Auto-Sync User Controls

### Built

- Added settings-backed calendar auto-sync controls for pause/resume and interval minutes.
- Added a Calendar Auto-Sync control card to the Settings Calendar Events tab.
- Preserved the existing default 30-minute calendar cadence when no setting exists.
- Split calendar and email background intervals so changing calendar auto-sync does not pause email auto-sync.
- Kept manual calendar sync and user-requested sync available even when background calendar auto-sync is paused.
- Removed the completed calendar sync user controls task from `CURRENT_TASK.md` so the active queue advances to packaging polish.

### Why

- The operator wanted calendar background sync to be controllable without disabling calendar integrations or changing manual sync behavior.
- Calendar and email had been sharing a single 30-minute timer, so calendar-specific controls needed their own scheduler boundary.

### How

- `praxis-desktop/shared/calendarAutoSyncSettings.ts` defines defaults, interval bounds, and settings normalization.
- `praxis-desktop/shared/settingsModel.ts` now includes `calendarAutoSync` in `SettingsSnapshot`.
- `praxis-desktop/electron/settingsRepository.ts` persists `calendar_auto_sync` settings.
- `praxis-desktop/electron/calendarAutoSync.ts` respects disabled background sync and uses the configured interval for cooldown checks.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, and `electron/electron-env.d.ts` expose `settings:updateCalendarAutoSync` and schedule calendar/email intervals separately.
- `praxis-desktop/src/SettingsApp.tsx` and `src/components/CalendarSettingsPanel.tsx` expose the controls in Settings.
- `praxis-desktop/tests/calendar-auto-sync-settings.test.ts` covers default, pause, clamping, fallback, and rounding behavior.

### Verification

- `npm run test:sync` passes.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.

## 2026-04-26 - Markdown Memory Reindex Control

### Built

- Added an explicit markdown memory reindex path that refreshes the SQLite `memory_documents` index without rewriting user-authored markdown files.
- Added `window.praxis.storage.reindexMemory()` through IPC and preload.
- Added a `Reindex Markdown Memory` control to the Settings Storage tab.
- Added `npm run memory:reindex` as a headless verification command.
- Removed the completed markdown reindex task from `CURRENT_TASK.md` so the active queue advances to calendar sync user controls.

### Why

- The existing `memory:repair` command also rewrites generated memory mirror files, which is too broad for routine index refreshes.
- The operator asked for an explicit, lightweight way to refresh markdown memory without a full restart and without mutating markdown content.

### How

- `praxis-desktop/electron/memoryReindex.ts` wraps the existing `repairMemoryDocumentIndex()` index-only path and returns a structured report.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, and `electron/electron-env.d.ts` expose the reindex operation to the renderer.
- `praxis-desktop/src/SettingsApp.tsx` runs the reindex control and refreshes storage overview counts.
- `praxis-desktop/package.json` now includes the `memory:reindex` script.

### Verification

- `npm run memory:reindex` passes and scanned 27 markdown files, indexed 27 documents, and removed 0 stale rows.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.

## 2026-04-26 - Project Workflow And Focus Report Follow-Ups

### Built

- Added `docs/PROJECT_WORKFLOW.md` as the public workflow guide for PRAXIS task execution, engineering log handoff, tech debt tracking, and long-term direction.
- Linked the project workflow guide from `docs/readme.md`.
- Added focused follow-up handling for the current desktop focus report.
- Praxis can now answer focus report follow-ups for blocked, paused, or waiting-on items.
- Praxis can now answer focus report follow-ups for people involved in the current focus report.
- Removed the completed focus follow-up task from `CURRENT_TASK.md` so the active queue advances to markdown memory reindex controls.

### Why

- The operator asked to make the working project process public now that the task/log workflow is stable.
- Focus reports already expose structured item and people data, so narrow follow-up commands should use that state directly instead of falling through to unrelated routing.
- Completed work should move out of the active task file and into the engineering log.

### How

- `praxis-desktop/shared/focusReportFollowUp.ts` owns the pure follow-up matcher and response formatter.
- `praxis-desktop/src/hooks/useAssistantCapture.ts` answers matched focus follow-ups before generic assistant routing.
- `praxis-desktop/tests/focus-report-follow-up.test.ts` covers blocked/waiting-on filtering, involved people summaries, empty people state, unrelated text, and missing-report behavior.
- `praxis-desktop/scripts/run-assistant-regression.mjs` now includes the focus follow-up regression.

### Verification

- `npm run test:assistant` passes.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.

## 2026-04-21 - Electron Baseline, Assistant Core, Memory Scaffold, And Hybrid Storage

### Built

- Re-centered the product around Electron as the canonical desktop app platform.
- Removed stale Tauri-era direction from the active docs.
- Added a desktop-first assistant architecture with Slack as a secondary adapter.
- Added shared assistant domain definitions for ideas, missions, tasks, signals, and insights.
- Added command-backed contextual action resolution for replies such as `yes`, `do it`, `1`, and direct title references.
- Added a desktop assistant console that exercises ranked mission suggestions.
- Created the markdown memory scaffold under `memory/`.
- Added templates and indexes for missions, projects, todos, people, finance, calendar, inbox facts, daily notes, and daily briefs.
- Added the hybrid storage architecture: SQLite for operational state, markdown for human-readable memory, filesystem for artifacts.
- Added the initial SQLite schema in the Electron main process using `better-sqlite3`.
- Added startup indexing of markdown memory documents into SQLite.
- Added IPC exposure for storage overview data.

### Why

- Praxis needs to act as a resident desktop assistant, not just a generic dashboard.
- Markdown alone is not enough for ranking, filtering, deadlines, relationships, and fast brief generation.
- SQLite alone is too opaque for long-term human-readable memory.
- A hybrid storage model gives Praxis fast operational queries while keeping the external brain readable and editable.
- Contextual action resolution must be channel-agnostic so desktop and Slack can share the same core behavior.

### How

- Product docs were updated in `docs/`.
- Long-term memory files were created under `memory/`.
- Shared assistant types and resolver logic were added under `praxis-desktop/shared/assistant/`.
- Storage authority rules were added under `praxis-desktop/shared/storage/`.
- SQLite initialization and schema migration were added in `praxis-desktop/electron/praxisDb.ts`.
- Electron startup now initializes the database and indexes markdown memory files.

### Verification

- `npm run lint` passes.
- `npm run build` passes, including Electron packaging and native `better-sqlite3` rebuild.

### Follow-Up

- Move real missions, projects, todos, and deadlines into SQLite-backed writers.
- Generate matching markdown records from SQLite state.
- Replace seeded UI data with real storage-backed queries.
- Persist suggestion contexts instead of keeping them only in UI state.
- Add a first daily brief generator that reads from SQLite and selected markdown files.

## Documentation Policy

Future implementation work should add entries here when it meaningfully changes architecture, persistence, product behavior, or user-facing workflows.

## 2026-04-24 - Focused UI Design Direction Pass

### Built

- Added a standalone local preview page for three Praxis Desk V1 UI directions under `docs/ui-concepts/`.
- Rendered PNG screenshots for Command Core, Operator Grid, and Ambient Companion so the concepts do not depend on SVG rendering.
- Updated `docs/UI_DIRECTION_OPTIONS.md` with the new screenshots, tradeoffs, and V1 recommendation.

### Why

- The operator requested a focused UI design pass before any production UI changes.
- Praxis needs a practical JARVIS-like local assistant interface that keeps Today, Daily Brief, and Top Move central while leaving room for voice and future companion clients.
- Mockups allow the operator to choose a direction before the React app is changed.

### How

- `docs/ui-concepts/praxis-v1-directions-preview.html` defines the shared local preview.
- `docs/ui-concepts/praxis-v1-directions.css` defines the concept styling.
- Per-direction HTML copies and PNG renders were added for review.

### Verification

- Rendered the preview artifacts with local headless Chrome.
- Visually checked the generated PNGs for nonblank rendering, readable hierarchy, and no production UI edits.

## 2026-04-24 - Operator Grid UI Implementation

### Built

- Implemented the selected Operator Grid direction in the production Praxis Desk renderer.
- Reworked the app shell into left work graph, center Daily Brief / Top Move, right Talk to Praxis, and bottom compact secondary surfaces.
- Promoted the structured daily brief recommendation into the primary dashboard hero.
- Added compact Today Timeline and Priority Stack cards below the Top Move.
- Reframed Talk to Praxis as an assistant conversation with presence, message bubbles, a send action, and a visual voice/wake-word affordance.
- De-emphasized manual create forms behind a collapsible drawer while keeping existing record creation/editing paths available.
- Added People to the left work-graph rail and compact checklist metrics to the bottom rail.

### Why

- The operator selected the Operator Grid visual direction after reviewing the PNG mockups.
- V1 needs to be usable every day, not just visually dramatic.
- Today, Daily Brief, and Top Move need to remain the main focus while Projects, Missions, Todos, People, Calendar, Email follow-ups, and Memory stay visible but secondary.

### How

- `praxis-desktop/src/App.tsx` now labels the main shell as Operator Dashboard and exposes the selected surfaces in the top navigation.
- `praxis-desktop/src/components/TodayTimelinePanel.tsx` now renders the Top Move hero, operational load, timeline, and priority stack before deeper report details.
- `praxis-desktop/src/components/MemoryWriterPanel.tsx` now renders Talk to Praxis as a conversation surface and keeps manual forms in a collapsible drawer.
- `praxis-desktop/src/components/ProjectStackPanel.tsx` now includes a compact People rail beside missions/projects.
- `praxis-desktop/src/components/MasterChecklistPanel.tsx` now adds compact surface metrics before the checklist strip.
- `praxis-desktop/src/App.css` was replaced with the Operator Grid visual system.

### Verification

- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes and advertises explicit command support with no direct storage access.
- `npm run companion:command` passes and returns a daily report through the companion command gateway.
- `npm run build:app` passes.

## 2026-04-23 - Email Follow-Up Foundation

### Built

- Added local email connection records beside the existing calendar connection model.
- Added privacy-safe email message storage for subject, sender metadata, received time, and short summaries only.
- Added local email follow-up extraction that turns imported email summaries into suggested todos or projects.
- Added a new Email Integration settings tab with source rows, manual JSON import, pending follow-up review, and one-click conversion into todos or projects.
- Added an Email Follow-Ups section to the main Today timeline.
- Updated the daily brief so spoken status can mention flagged email follow-ups.
- Mirrored email follow-ups into `memory/inbox/email-follow-ups.md`.

### Why

- Praxis needs to help prevent the "I forgot that email thread existed" problem, not just track projects and calendar events.
- The user explicitly does not want raw email bodies stored in long-term memory, so the storage path needed to stay summary-first and privacy-safe.
- Building the extraction and action path now creates a stable target for later live Gmail and Outlook inbox sync.

### How

- `praxis-desktop/shared/emailModel.ts` defines connection, import, message, and suggestion contracts.
- `praxis-desktop/electron/praxisDb.ts` now stores `email_connections` and `email_messages` and indexes email follow-up facts.
- `praxis-desktop/electron/emailRepository.ts` imports normalized email summaries, extracts follow-up candidates, stores them in `inbox_facts`, and can convert them into todos or projects.
- `praxis-desktop/src/SettingsApp.tsx` and `src/components/EmailSettingsPanel.tsx` expose the operator workflow for email setup and review.
- `praxis-desktop/src/App.tsx` and `src/components/TodayTimelinePanel.tsx` surface pending email follow-ups on the main dashboard.
- `praxis-desktop/electron/dailyBrief.ts` now counts pending email follow-ups when building the spoken brief.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes and advertises explicit command support with no direct storage access.
- `npm run companion:command` passes and returns a daily report through the companion command gateway.

## 2026-04-25 - Work Lookup Follow-Up Regression Coverage

### Built

- Added focused regression coverage for work lookup follow-up actions in `praxis-desktop/tests/work-lookup-actions.test.ts`.
- Added the new work lookup action test to `npm run test:assistant`.
- Locked down action generation for waiting-on todos, quick standalone todos, paused projects, linked deadlines, related focus reports, and completed todos.
- Fixed completed todos so they do not receive due-date mutation actions from lookup/report contexts.
- Fixed incomplete move/reschedule replies such as `move the first one` so they ask for a clear date instead of falling through to completion.

### Why

- Work lookup answers are now actionable, so the resolver must stay conservative when a user replies with short follow-ups.
- The most important safety rule is that vague or incomplete commands should not mutate the wrong work item.
- These tests protect desktop, Slack, voice, and companion clients because all of those surfaces rely on the same shared action-builder and context resolver.

### How

- `praxis-desktop/tests/work-lookup-actions.test.ts` builds fixed work snapshots and asserts the exact command set available for each lookup item.
- The test exercises completion, pause, reactivation, due-date moves, waiting-on clears, related focus report opening, ambiguous replies, missing-date replies, and linked deadline focus routing.
- `praxis-desktop/shared/workLookupContext.ts` now withholds due-date update actions from completed todos/deadlines.
- `praxis-desktop/shared/assistantContextResolver.ts` now treats incomplete move/reschedule language as an update-date request and returns the missing-date prompt instead of defaulting to completion.

### Verification

- `npm run test:assistant` passes.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes.
- `npm run companion:command` passes.
- `npx vite build` passes.

### Follow-Up

- Add live Gmail inbox sync through the existing local Google OAuth pattern.
- Add Outlook email sync after Gmail settles.
- Improve extraction heuristics and link senders to existing people records by email address.

## 2026-04-23 - Live Gmail Inbox Sync And Multi-Account Email Rows

### Built

- Reused the existing Google desktop OAuth setup for Gmail instead of requiring a second Google client configuration.
- Added Gmail OAuth readiness, browser authorization, encrypted token storage, and per-row auth/sync status.
- Added live Gmail inbox sync that fetches recent inbox message metadata and snippets, stores privacy-safe summaries locally, and feeds the email follow-up extractor.
- Added email auto-sync on startup, every 30 minutes while Praxis is open, after Gmail OAuth succeeds, and before daily brief generation.
- Updated Email Integration settings so each saved Gmail row can connect and sync independently.

### Why

- The operator asked for live Gmail inbox access and support for more than one email account.
- Separate Gmail rows with separate encrypted tokens are the safest way to support multiple inboxes without mixing account state.
- Reusing the shared Google OAuth client keeps setup friction low.

### How

- `praxis-desktop/electron/googleOAuthShared.ts` now owns the shared Google loopback OAuth callback path.
- `praxis-desktop/electron/googleCalendarOAuth.ts` was moved onto that shared Google OAuth helper.
- `praxis-desktop/electron/gmailEmailOAuth.ts` adds Gmail OAuth for email rows.
- `praxis-desktop/electron/gmailEmailSync.ts` pulls Gmail message metadata/snippets and feeds `emailRepository`.
- `praxis-desktop/electron/emailAutoSync.ts` mirrors the calendar auto-sync pattern for ready Gmail connections.
- `praxis-desktop/src/components/EmailSettingsPanel.tsx` now exposes `Connect Gmail` and `Sync Gmail` per row.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

### Follow-Up

- Live-test against the operator's real Gmail inbox rows.
- Add Outlook inbox sync after Gmail behavior settles.
- Expand follow-up extraction beyond simple request/deadline/project heuristics.

## 2026-04-23 - Live Outlook Inbox Sync And Multi-Account Email Rows

### Built

- Added Outlook email OAuth readiness, browser authorization, encrypted token storage, and per-row auth/sync status for email inbox rows.
- Added live Outlook inbox sync through Microsoft Graph mail metadata endpoints.
- Extended email auto-sync so ready Outlook inbox rows sync on startup, every 30 minutes while Praxis is open, after OAuth succeeds, and before daily brief generation.
- Updated Email Integration settings so saved Outlook rows can connect and sync independently beside Gmail rows.
- Kept multiple inbox support row-based so Praxis can track more than one Outlook account without mixing tokens or state.

### Why

- The operator asked for Outlook inbox sync next and wants support for multiple accounts.
- Outlook needed to match the same low-friction model Gmail already uses: one row per inbox, local encrypted tokens, and automatic background refresh while Praxis is open.
- Multi-account email tracking is core to the "work where I am" requirement because important requests can live across different inboxes.

### How

- `praxis-desktop/electron/outlookEmailOAuth.ts` adds Microsoft Graph OAuth for email rows and stores encrypted tokens per connection.
- `praxis-desktop/electron/outlookEmailSync.ts` calls `GET /me/messages` against Microsoft Graph, normalizes the mail metadata, and feeds it into `emailRepository`.
- `praxis-desktop/electron/emailAutoSync.ts` now auto-syncs both Gmail and Outlook email rows instead of Gmail only.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, and `electron/electron-env.d.ts` now expose Outlook email OAuth/sync IPC and renderer event updates.
- `praxis-desktop/src/SettingsApp.tsx` and `src/components/EmailSettingsPanel.tsx` now show Outlook readiness plus `Connect Outlook` and `Sync Outlook` actions per row.
- Outlook email now uses a separate default loopback callback from Outlook calendar so the two OAuth flows do not fight over the same localhost port.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run build` reached Electron packaging but packaging verification was blocked by a Windows file lock on `node_modules/better-sqlite3/build/Release/better_sqlite3.node` while the app/native module was in use.

### Follow-Up

- Live-test against the operator's real Outlook inbox rows and Microsoft app registration.
- Add a first-class Outlook OAuth setup surface if env-based Microsoft client setup becomes too much friction.
- Link sender email addresses to existing people records so follow-ups can enrich person profiles automatically.

## 2026-04-23 - Packaging Stability Pass

### Built

- Split the build flow into an app compile step and a packaging step so packaging behavior is easier to reason about.
- Added `build:app`, `package`, and `package:win` scripts in `praxis-desktop/package.json`.
- Added `postinstall` native dependency repair through `electron-builder install-app-deps`.
- Configured Electron Builder to skip native dependency rebuilds during packaging.
- Verified that the Windows NSIS installer path completes successfully without hitting the earlier `better-sqlite3` lock failure.

### Why

- Packaging had been failing because Electron Builder was trying to rebuild `better-sqlite3` while the native binary was already loaded by the running app.
- The operator needs the app to stay buildable without fragile "close everything and try again" rituals.
- Separating compile and package commands makes future release testing easier and clearer.

### How

- `praxis-desktop/package.json` now uses:
  - `build:app` for TypeScript + Vite compilation
  - `package` for the full package flow
  - `package:win` for the Windows NSIS installer path
- `praxis-desktop/electron-builder.json5` now sets `npmRebuild: false` and `nodeGypRebuild: false` so Electron Builder does not try to rebuild native modules during packaging.
- Native module preparation remains available through `postinstall` and `repair:native`.

### Verification

- `npm run lint` passes.
- `npm run build:app` passes.
- `npm run package:win` passes.
- Electron Builder logs now explicitly show `skipped dependencies rebuild  reason=npmRebuild is set to false`.

### Follow-Up

- Add branded app icons so packaged builds stop using the default Electron icon.
- Decide whether Windows release packaging should target `x64`, `arm64`, or both from this machine.
- Add a small release checklist doc once installer signing and branding start.

## 2026-04-23 - Windows Packaging Architecture Pass

### Built

- Made Windows packaging architecture explicit instead of silently following the current machine architecture.
- Set `npm run package:win` to target Windows `x64`.
- Added `npm run package:win:arm64` for Windows on ARM builds.
- Added `npm run package:win:all` for building both Windows architectures when needed.
- Moved each Windows packaging script onto its own output directory so a stale locked unpacked folder cannot block the next build.

### Why

- The default Windows release should be predictable and broadly compatible.
- The operator's main desktop path is best served by `x64`, while future Surface or Windows-on-ARM scenarios still need a native path.
- Explicit scripts remove guesswork when a build machine architecture differs from the intended release architecture.

### How

- `praxis-desktop/package.json` now passes explicit `--x64` and `--arm64` flags to Electron Builder for the Windows packaging scripts.
- The Windows packaging scripts now also override `directories.output` per architecture.
- `praxis-desktop/README.md` now documents which script produces which Windows installer target.

### Verification

- `npm run package:win` passes and produces a Windows `x64` installer.

### Follow-Up

- Decide whether `package` should stay machine-default or later become a release-oriented wrapper around explicit platform scripts.
- Add a lightweight release checklist once icons and signing are in place.

## 2026-04-23 - Email-To-People Linking Pass

### Built

- Added a conservative sender-to-person matching layer for synced email messages and follow-up suggestions.
- Email summaries and email follow-up suggestions now surface the matched saved person when Praxis can identify one safely.
- Person lookup can now fall back to recent synced email history when a person record does not yet have a saved email address.
- Projects created from email follow-up suggestions now create a person-to-project relationship when the sender matches a saved person.
- Markdown inbox summaries now include matched-person context so the external brain reflects the same linkage Praxis is using.

### Why

- The operator wants Praxis to be able to answer questions like "What's Max's email?" and make better use of people records.
- Sender metadata was already being stored, but there was no bridge between inbox activity and saved person records.
- This improves usefulness without risky automatic rewriting of saved person contact info.

### How

- `praxis-desktop/electron/personIdentity.ts` now owns conservative matching rules for sender name/email to person records.
- `praxis-desktop/electron/emailRepository.ts` enriches recent email messages and follow-up suggestions with matched person context and carries that into email-seeded project creation.
- `praxis-desktop/electron/personLookup.ts` now checks recent synced email senders when a person record is missing a saved email.
- `praxis-desktop/src/components/EmailSettingsPanel.tsx` and `src/components/TodayTimelinePanel.tsx` now show matched-person badges where available.
- `praxis-desktop/electron/memoryWriter.ts` now mirrors matched-person context into the generated inbox markdown summaries.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

### Follow-Up

- Decide whether high-confidence email matches should eventually offer a one-click "save this as the person's contact email" action.
- Extend the same matching layer into calendar invite organizers and attendees later.
- Use matched people to improve reminder tone and "waiting on" suggestions where the language clearly supports it.

## 2026-04-23 - Inferred Contact Review Flow

### Built

- Added a first review-and-save flow for inferred person email addresses.
- Settings → People now shows a suggested email card when Praxis has a clean recent-mail match for a person who does not yet have a saved email address.
- Added a one-click action to save that inferred email directly onto the person record.
- Expanded recent email summaries in the email snapshot so the review flow has a better working window.

### Why

- The prior linking pass made lookup smarter, but the inferred contact data was still transient.
- The operator needs Praxis to help organize contact records, not just answer from temporary mail context.
- A reviewed save action is safer than silently overwriting person records.

### How

- `praxis-desktop/shared/personContactSuggestion.ts` derives high-confidence person email suggestions from matched recent mail.
- `praxis-desktop/src/SettingsApp.tsx` now builds those suggestions and saves accepted ones through the existing person update path.
- `praxis-desktop/src/components/PeopleProfilePanel.tsx` now shows the suggested email, confidence, recent-seen timestamp, and a save action for the selected person.
- `praxis-desktop/electron/emailRepository.ts` now returns a larger recent-message window so the suggestion flow has more useful evidence.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

### Follow-Up

- Add an explicit dismiss/ignore action if repeated suggestions become noisy.
- Expand inferred contact review beyond email into phone numbers and billing details when reliable sources exist.
- Surface accepted contact updates back into email/person history so the operator can see where the saved contact came from.

## 2026-04-23 - Persistent Dismiss For Inferred Contacts

### Built

- Added persistent dismiss state for inferred person email suggestions.
- Dismissed inferred-contact suggestions now stay hidden across reloads and restarts.
- Settings → People now shows both `Save Email To Person` and `Dismiss Suggestion` when an inferred contact suggestion is present.
- The dismiss state is stored in SQLite rather than renderer state.

### Why

- Once the review flow existed, repeated unwanted suggestions would become noise.
- The operator should be able to tell Praxis "not this one" and have that decision stick.
- This keeps the assistant helpful without making the People panel feel naggy.

### How

- `praxis-desktop/electron/emailRepository.ts` now stores inferred-contact dismissals in `inbox_facts`.
- `praxis-desktop/shared/emailModel.ts` now includes persisted contact-suggestion dismissal state in the email snapshot.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, and `electron/electron-env.d.ts` now expose a dismiss action through the existing email IPC surface.
- `praxis-desktop/src/SettingsApp.tsx` now filters dismissed inferred-contact suggestions before rendering them.
- `praxis-desktop/src/components/PeopleProfilePanel.tsx` now offers a dismiss button beside the save action.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

### Follow-Up

- Add a way to review or undo dismissed inferred-contact suggestions if needed.
- Extend the same persistent dismiss pattern to future inferred phone and billing suggestions.

## 2026-04-23 - First Deliberate Visual Pass

### Built

- Added a branded top navigation header with stronger product identity and clearer panel switching.
- Rebalanced the dashboard layout so the Today panel reads as the primary surface and the side panels read as support surfaces.
- Improved panel hierarchy, typography, status chips, card treatments, and edit-drawer placement without changing app behavior.

### Why

- The structural cleanup was complete enough to support a real visual pass.
- Praxis needs to feel like a resident assistant cockpit, not a generic admin grid.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Edit Drawer Pass

### Built

- Moved active edit forms out of the Memory Writer flow and into the existing slide-out details drawer pattern.
- Added a single drawer close action that clears the active edit state.
- Kept all existing save/cancel handlers and record edit forms intact.

### Why

- Inline edit cards were still crowding the assistant surface even after the create forms were collapsed.
- Editing is now a focused mode instead of a persistent visual interruption.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - Collapsible Create Forms

### Built

- Converted the right-side Create Records area into collapsible form sections.
- Added compact sections for mission, project, person, todo, standalone deadline, and appointment creation.
- Added form-section styling so creation controls remain available without dominating the Memory Writer panel.

### Why

- Manual creation forms are useful but should not be the primary visual focus.
- Praxis should feel like an assistant first, with forms available as backup/manual controls.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - First Dashboard Declutter Pass

### Built

- Added `praxis-desktop/src/components/ActionMenu.tsx`.
- Moved item-level edit/delete controls and status controls behind compact inline action menus.
- Applied the menu to Project Stack, Today Timeline appointments/deadlines, and Master Checklist items.

### Why

- The dashboard had too many always-visible controls, making Praxis feel more like an admin console than an assistant cockpit.
- This is a low-risk UI cleanup because it changes presentation only and keeps the same handlers and storage behavior.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - Assistant Capture Hook Extraction

### Built

- Added `praxis-desktop/src/hooks/useAssistantCapture.ts`.
- Moved Talk to Praxis routing, capture draft handling, appointment report handling, contextual action execution, due-date updates, status updates, and waiting-on clearing out of `App.tsx`.
- Moved assistant report/proactive context storage helpers into the hook module for reuse by the app shell and routing logic.

### Why

- Conversation behavior is one of the highest-change areas in Praxis.
- Keeping route handling out of the visual shell makes it safer to add richer commands, voice input, Slack parity, and future companion-client access.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - Dashboard Panel Extraction Completed

### Built

- Extracted the left Project Stack into `praxis-desktop/src/components/ProjectStackPanel.tsx`.
- Extracted the bottom Master Checklist into `praxis-desktop/src/components/MasterChecklistPanel.tsx`.
- Moved display-only mission/project filtering, todo ranking, project/mission badges, and waiting-on badges out of `App.tsx`.

### Why

- The main renderer file now acts more like an orchestration shell instead of a single oversized UI component.
- The dashboard is ready for a safer visual cleanup pass because each major region has a component boundary.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - Memory Writer Component Extraction

### Built

- Extracted the right-side Memory Writer panel into `praxis-desktop/src/components/MemoryWriterPanel.tsx`.
- Moved Talk to Praxis, capture confirmation, capture draft review, work edit panels, and work creation panels behind a single component boundary.
- Kept `App.tsx` responsible for assistant routing, persistence calls, and state ownership.

### Why

- The capture/create/edit surface is a high-change area and was making `App.tsx` harder to reason about.
- Splitting this panel makes the later UI cleanup safer because the dashboard shells can be redesigned without mixing rendering and assistant command logic.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - Today Timeline Component Extraction

### Built

- Extracted the center dashboard timeline into `praxis-desktop/src/components/TodayTimelinePanel.tsx`.
- Kept `App.tsx` responsible for state, routing, and persistence calls while the new component owns report/timeline rendering.
- Preserved existing daily brief, focus report, proactive suggestion, appointment, deadline, and memory document behavior.

### Why

- `App.tsx` was becoming too large to safely extend.
- The dashboard needs a later UI pass, and separating panels first lowers the risk of breaking backend behavior during visual cleanup.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-22 - Native Settings Menu Placement

### Built

- Moved Settings out of the persistent in-app navigation.
- Added a native Electron `Settings` menu between `Window` and `Help`.
- Added `Open Settings` with `Ctrl+,` / `Cmd+,` accelerator.
- Added main-to-renderer navigation IPC so the native menu can open the Settings panel.

### Why

- Settings is mostly setup-time behavior and should not occupy primary dashboard navigation after configuration.
- The native menu is the expected place for low-frequency app setup controls.

### How

- `electron/main.ts` now builds an explicit application menu with `File`, `Edit`, `View`, `Window`, `Settings`, and `Help`.
- The Settings menu sends `app:navigate` with the `settings` target.
- `electron/preload.ts` exposes the menu navigation event to the renderer.
- `App.tsx` listens for that event and switches `activePanel` to Settings.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.
- Electron smoke test starts successfully.

### Follow-Up

- Consider adding a dedicated Help/About dialog later instead of routing Help to setup notes.

## 2026-04-22 - Settings Navigation Fix

### Built

- Added a persistent top navigation bar with visible buttons for Projects, Today, Capture, Checklist, and Settings.
- Changed the right panel so Settings mode shows Settings content directly instead of burying it below capture and work forms.

### Why

- The Google OAuth setup flow required Settings, but Settings was only reachable through a small Arrival button or the `5` keyboard shortcut.
- A user-facing desktop app needs obvious navigation before integration setup can be reliable.

### How

- `App.tsx` now renders a fixed top nav that updates `activePanel`.
- The right panel switches between `Memory Writer` and `Settings` content based on `activePanel`.
- `App.css` reserves top padding for the nav and styles the active tab.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Consider breaking Settings into sub-tabs once calendar, Slack, people, and future inbox/finance settings grow further.

## 2026-04-22 - Native SQLite Repair For Electron Runtime

### Built

- Rebuilt native Electron dependencies with `electron-builder install-app-deps`.
- Added `npm run repair:native` as a reusable repair command.
- Updated the Windows launch scripts to repair missing native SQLite binaries before starting Praxis.

### Why

- `better-sqlite3` is a native module and must match the Electron runtime and machine architecture.
- This Windows machine reports `win32 arm64`, so a mismatched native binary can fail with `not a valid Win32 application`.
- The repair command gives the operator a simple recovery path if native dependencies are changed by reinstall, sync, or runtime updates.

### How

- Electron Builder rebuilt `better-sqlite3@12.9.0` for `platform=win32` and `arch=arm64`.
- Launch scripts now detect a missing native SQLite binary and run the repair command.

### Verification

- Electron smoke test starts and stays alive past the previous native-module crash.

### Follow-Up

- If the same error appears again after dependency updates, run `npm run repair:native`.

## 2026-04-22 - Electron Startup Fix For Slack Websocket Optional Dependencies

### Built

- Externalized Slack and websocket packages from the Electron main-process Vite bundle.
- Added simple Windows launchers: `Start Praxis Desk.bat` and `Start Praxis Desk.ps1`.

### Why

- Bundling Slack Socket Mode pulled in `ws`, which can optionally import native packages such as `bufferutil`.
- In the bundled main process, that optional import caused app startup to fail when `bufferutil` was not installed.
- Externalizing Slack/websocket packages lets Node resolve them normally from `node_modules`, where optional native acceleration dependencies may be absent without crashing.

### How

- `vite.config.ts` now marks `@slack/bolt`, `@slack/socket-mode`, `@slack/web-api`, `ws`, `bufferutil`, and `utf-8-validate` as external for the Electron main bundle.
- The main bundle shrank substantially because Slack dependencies are no longer bundled into `dist-electron/main.js`.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.
- Electron smoke test starts and stays alive past the previous load crash.

### Follow-Up

- Keep Slack adapter lazy and optional.
- Consider adding a packaged desktop shortcut after app icon/product metadata are finalized.

## 2026-04-22 - Calendar Setup Guidance And Multi-Calendar Targeting

### Built

- Added in-app Google OAuth setup instructions directly inside Calendar Settings.
- Updated calendar connection copy so users understand one row equals one calendar.
- Let Google sync target the provider calendar ID stored on each connection row, defaulting to `primary` when blank.
- Let Outlook sync target a stored Microsoft Graph calendar ID, defaulting to the normal calendar view when blank.
- Prefixed imported Google/Outlook external IDs with the provider calendar ID to avoid collisions across multiple calendars.

### Why

- A user should not have to leave Praxis documentation to understand how to get the Google OAuth client ID.
- Multiple calendars require separate sync targets; syncing only `primary` would make additional saved rows misleading.
- Imported event IDs can collide across calendars unless the calendar identity is part of the local import identity.

### How

- Calendar Settings now includes a short Google Cloud Console checklist and multi-calendar instructions.
- `calendar_connections.account_ref` is used as the provider calendar ID. Blank means primary/default.
- Google uses `/calendar/v3/calendars/{calendarId}/events`.
- Outlook uses `/me/calendars/{calendarId}/calendarView` when a calendar ID is present, otherwise `/me/calendarView`.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Live-test Google and Outlook secondary calendar IDs.
- Consider adding provider-specific helper links after the Settings UI grows a documentation/help affordance.

## 2026-04-22 - Settings-Backed Google OAuth Setup

### Built

- Added Google OAuth setup fields to Calendar Settings for client ID, optional client secret, and optional redirect URI.
- Persisted the Google OAuth client ID in local settings.
- Stored the optional Google OAuth client secret through the encrypted secret vault instead of plaintext settings or markdown.
- Updated Google OAuth readiness, authorization, and token refresh paths to use saved app settings before environment fallback.

### Why

- Users should not need to launch Praxis from a specially configured terminal to connect Google Calendar.
- The existing `Connect Google` action is the correct sign-in button, but it needs an OAuth app client ID first.
- Keeping the client secret in the vault preserves the local-first privacy stance.

### How

- `SettingsSnapshot` now includes `googleOAuth` setup metadata.
- `settings:updateGoogleOAuth` saves non-secret setup values and writes the optional secret through `secure_secrets`.
- Google OAuth and sync adapters read client configuration through `settingsRepository` instead of directly reading only environment variables.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Paste a valid Google OAuth client ID in Settings.
- Connect a Google calendar row and run the real browser consent flow.
- Sync events and confirm they appear in local appointments and the daily brief.

## 2026-04-22 - Google Calendar Live-Test Preflight

### Built

- Added `npm run calendar:google:preflight` to check local Google Calendar OAuth setup before attempting browser authorization.
- Added `scripts/google-calendar-preflight.mjs` to validate the required client ID, redirect URI shape, and documented scope.
- Updated calendar setup docs and the Calendar Settings panel to point at the preflight command.
- Marked Google account live validation as still open because this machine is missing `PRAXIS_GOOGLE_CLIENT_ID`.

### Why

- A true Google live test cannot happen without an OAuth client ID configured in the Praxis launch environment.
- The preflight makes the blocker explicit and repeatable instead of relying on visual inspection of environment variables.
- Keeping live validation separate from implementation prevents us from accidentally claiming calendar sync is proven before it has touched the operator's real account.

### How

- The preflight checks `PRAXIS_GOOGLE_CLIENT_ID`, optional `PRAXIS_GOOGLE_CLIENT_SECRET`, and `PRAXIS_GOOGLE_REDIRECT_URI`.
- The default redirect URI remains `http://127.0.0.1:47841/oauth/google/callback`.
- The required Google scope remains `https://www.googleapis.com/auth/calendar.readonly`.

### Verification

- `npm run calendar:google:preflight` runs and reports `NOT READY` because `PRAXIS_GOOGLE_CLIENT_ID` is not configured on this machine.
- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Configure a Google OAuth client ID and rerun the preflight.
- Once preflight is ready, connect a real Google calendar from Settings and run manual sync.
- Confirm imported Google events appear as local appointments and in the daily brief.

## 2026-04-22 - Work Form UI Extraction

### Built

- Extracted mission, project, person, todo, deadline, and appointment creation forms into `src/components/WorkFormsPanel.tsx`.
- Extracted matching edit panels for missions, projects, people, todos, deadlines, and appointments into the same focused work-form component module.
- Kept all create/save handlers in `App.tsx` so existing IPC calls, repository writes, markdown mirroring, and refresh behavior are unchanged.

### Why

- The Settings/memory writer side of `App.tsx` was carrying too many unrelated UI responsibilities.
- Work forms are core Praxis behavior and need to stay easy to review before adding email extraction, finance, and companion-client surfaces.
- Separating form rendering from handler ownership reduces renderer complexity without changing storage authority.

### How

- `WorkCreationPanel` receives current form state, setters, snapshot data, and create handlers as explicit props.
- `WorkEditPanels` receives active edit records, setters, snapshot data, and save handlers as explicit props.
- Priority and alias text helpers moved with the form UI that owns those controls.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Extract capture review UI and report/dashboard panels when the next stabilization pass is useful.
- Live-test Google and Outlook calendar sync with real accounts before starting email fact extraction.

## 2026-04-22 - Risk Stabilization And Companion Client Direction

### Built

- Extracted Slack adapter settings, connection test, restart, and test-suggestion controls into `src/components/SlackSettingsPanel.tsx`.
- Extracted people profile/detail, relationship management, and waiting-on display into `src/components/PeopleProfilePanel.tsx`.
- Documented the future Surface companion-client requirement as a Home Node plus companion-client architecture.
- Added `docs/CALENDAR_SETUP.md` and a Settings-panel reference for Google/Outlook setup requirements.
- Updated roadmap, decisions, and tech-debt notes so future work preserves shared service boundaries.

### Why

- Praxis is growing multiple surfaces: desktop, Slack, future voice, and future Surface companion client.
- The main PC should remain the authoritative local-first assistant brain while other surfaces become clients.
- Reducing `App.tsx`, documenting the client boundary, and making calendar setup explicit lowers the risk of building features that only work inside one renderer or only on the developer machine.

### How

- Slack settings and people profile UI now receive explicit state and action handlers from `App.tsx` through focused renderer components.
- `docs/ARCHITECTURE.md` now defines the Praxis Home Node as owner of SQLite, markdown memory, secrets, local AI, adapters, and command execution.
- Companion clients are documented as snapshot/command surfaces that should not directly edit SQLite, markdown memory, or secrets.
- Calendar setup documentation records required environment variables, redirect URIs, scopes, privacy rules, and current manual-sync limits.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Live-test connected calendar sync against real Google and Microsoft accounts.
- Extract work creation/edit panels next.

## 2026-04-22 - Calendar Settings UI Refactor

### Built

- Extracted the calendar connection, OAuth readiness, manual sync, ICS import, and manual JSON import surface from `App.tsx` into `src/components/CalendarSettingsPanel.tsx`.
- Moved calendar provider, auth-status, and sync-status labels into the focused calendar settings component.
- Preserved the existing settings behavior while reducing the size and responsibility of the main app shell.

### Why

- `App.tsx` has accumulated too much feature-specific UI as Praxis Desk has grown.
- Calendar settings now include multiple providers, OAuth diagnostics, encrypted-token status, provider sync actions, and import tools.
- Keeping that surface isolated makes future integration work safer and easier to review.

### How

- `CalendarSettingsPanel` receives explicit state, readiness data, formatting helpers, and action handlers from `App.tsx`.
- The extracted component remains renderer-only and does not change IPC contracts, event structure, command behavior, or storage ownership.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Continue reducing `App.tsx` by extracting Slack settings, people profile/detail UI, and work creation/edit panels.
- Keep integration panels focused so calendar, Slack, inbox, and finance surfaces can evolve independently.

## 2026-04-21 - Storage-Backed Work Model Writers

### Built

- Added shared work-model types for missions, projects, todos, deadlines, and work snapshots.
- Added a `deadlines` table to the SQLite schema.
- Added SQLite-backed writers and readers for missions, projects, todos, and deadlines.
- Added markdown generation for mission and project entity files.
- Added generated markdown summary views for active todos and active deadlines.
- Added memory deadline indexes and templates.
- Exposed work-model IPC APIs through the Electron preload bridge.
- Replaced seeded mission/project/idea UI data with storage-backed queries and creation forms.

### Why

- Praxis needs real persistent entities before briefing, memory, calendar, Slack, or voice work can become trustworthy.
- SQLite should be the operational source of truth for rankable and queryable work state.
- Markdown should mirror durable human-readable records so the operator and future AI runs can inspect the app's memory.

### How

- `praxis-desktop/shared/workModel.ts` defines the shared types.
- `praxis-desktop/electron/workRepository.ts` owns SQLite writes and reads for the work model.
- `praxis-desktop/electron/memoryWriter.ts` owns markdown file generation.
- `praxis-desktop/src/App.tsx` now loads `window.praxis.work.getSnapshot()` and creates records through `window.praxis.work.*`.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes for renderer, main, and preload bundles.
- Full `npm run build` reaches Electron packaging but cannot remove an old generated `release/.../app.asar` because Windows reports the file is locked by another process.

### Follow-Up

- Add update and completion flows for existing records.
- Add natural-language capture that turns operator statements into these same SQLite-backed records.
- Add daily brief generation from the work snapshot.
- Resolve or avoid the generated release file lock before treating packaging as fully clean again.

## 2026-04-21 - Work Status Operations

### Built

- Added shared status-update input types for work records.
- Added repository support for updating mission, project, todo, and deadline status.
- Added linked deadline status sync when a mission, project, or todo is completed, paused, or reactivated.
- Regenerate markdown todo and deadline summaries after status changes.
- Regenerate mission and project markdown files after their status changes.
- Added UI controls to complete, pause, and reactivate stored records.

### Why

- Create-only storage is not operationally useful.
- Praxis needs to know what is active, paused, or completed before daily brief generation can be reliable.
- Linked deadlines should not remain active after their parent work item is completed.

### How

- `UpdateWorkStatusInput` was added in `praxis-desktop/shared/workModel.ts`.
- `updateWorkStatus` was added in `praxis-desktop/electron/workRepository.ts`.
- `work:updateStatus` IPC was exposed through Electron main and preload.
- `praxis-desktop/src/App.tsx` now renders inline status action buttons.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add edit flows for changing title, summary, due date, priority, and project/mission relationships.
- Add a daily brief generator that uses status, due dates, and priority.
- Add natural-language capture for creating and updating work records.

## 2026-04-21 - First Daily Brief Generator

### Built

- Added shared daily-brief types for spoken summaries, ranked priority items, deadlines, todos, money items, and follow-up topics.
- Added an Electron main-process daily brief generator backed by the SQLite work snapshot.
- Ranked overdue, due-today, due-soon, critical, high-priority, and money-related work into a compact daily report.
- Wrote generated daily briefs into `memory/daily/<YYYY-MM-DD>.md`.
- Exposed the daily brief through IPC and preload APIs.
- Added a daily brief card to the Praxis Desk timeline panel.

### Why

- The arrival ritual needs a trustworthy text briefing before voice and wake phrase work.
- Praxis must prioritize instead of dumping the whole backlog.
- The brief should be generated from operational state so completed or paused work does not pollute the report.

### How

- `praxis-desktop/shared/dailyBrief.ts` defines the renderer/main shared contract.
- `praxis-desktop/electron/dailyBrief.ts` builds and writes the brief.
- `brief:getDaily` was added to Electron IPC.
- `praxis-desktop/src/App.tsx` loads and displays the current brief beside deadlines and memory documents.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add calendar appointments so same-day appointments rank first.
- Add people/waiting-on facts once inbox and contact extraction exists.
- Add operator override controls for priority ordering.
- Add spoken output after the briefing logic is stable.

## 2026-04-21 - Local Appointment Support In Daily Brief

### Built

- Added shared appointment record and creation input types.
- Added SQLite-backed manual appointment creation using the existing `appointments` table.
- Added appointment summary mirroring to `memory/calendar/appointments.md`.
- Added appointment IPC and preload APIs.
- Added appointment creation and upcoming appointment display in Praxis Desk.
- Updated the daily brief so today appointments rank ahead of deadlines and todos, with tomorrow appointments included in near-radar context.

### Why

- The operator explicitly wants appointments on the same day to move to the top of the briefing.
- Calendar imports are not ready yet, but local appointment records let the core prioritization behavior work now.
- This keeps the later Google/Outlook work as an adapter feeding the same appointment model instead of a separate feature path.

### How

- `AppointmentRecord` and `CreateAppointmentInput` were added to the shared work model.
- `createAppointment` was added to `praxis-desktop/electron/workRepository.ts`.
- `writeAppointmentsSummaryMarkdown` was added to `praxis-desktop/electron/memoryWriter.ts`.
- `praxis-desktop/electron/dailyBrief.ts` now merges appointment items into the ranked priority list.
- `praxis-desktop/src/App.tsx` now includes a manual appointment form and upcoming appointment list.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add edit/delete flows for appointments.
- Add Google Calendar and Outlook import adapters.
- Add appointment reminders and arrival-flow phrasing once notification behavior exists.

## 2026-04-21 - First Natural-Language Capture

### Built

- Added shared capture request/result types.
- Added a conservative deterministic parser for dated appointment and todo phrases.
- Added Electron capture execution that creates appointments or todos through the existing SQLite-backed repository.
- Added `capture:naturalLanguage` IPC and preload APIs.
- Added a `Tell Praxis` text box in the desktop app so the operator can type plain-language reminders.
- Successful captures refresh the dashboard, daily brief, SQLite state, and markdown mirrors.

### Why

- The operator should not have to use forms for every remembered obligation.
- Natural-language capture is the first step toward Praxis behaving like a working assistant rather than a database UI.
- A deterministic parser is safer at this stage than handing vague text to a local model without confirmation or audit.

### How

- `praxis-desktop/shared/naturalLanguageCapture.ts` defines the shared capture contract.
- `praxis-desktop/electron/naturalLanguageCapture.ts` parses simple dates, weekdays, `today`, `tomorrow`, and time phrases.
- Appointment-like text creates appointment records.
- Due-date and reminder-like text creates todos, which also create linked deadline records when due dates exist.
- Unclear text returns an unresolved result instead of guessing.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add confirmation UI for lower-confidence captures.
- Add project/mission relationship detection.
- Add edit/update capture such as moving due dates or changing priority.
- Add local-model extraction after the deterministic path is stable.

## 2026-04-21 - Capture Confirmation And Project Matching

### Built

- Added confirmation-capable capture request/result fields.
- Added forced-intent capture execution so ambiguous text can be confirmed as either a todo or appointment.
- Added ambiguity detection for call-like text such as `Call Max Friday at 9`.
- Added UI confirmation buttons instead of creating ambiguous records immediately.
- Added deterministic project matching so captured todos attach to an existing active project when the text clearly names it.
- Added capture result messaging that reports when a todo was attached under a project.

### Why

- Praxis should not silently make the wrong kind of record when ordinary language is ambiguous.
- Project-aware capture is necessary before the app can become useful for real mission/project tracking.
- Confirming ambiguous captures keeps the assistant proactive without becoming reckless.

### How

- `CaptureRequest` now supports `mode` and `forcedIntent`.
- `CaptureCandidate` can now include confirmation options and matched project/mission metadata.
- `praxis-desktop/electron/naturalLanguageCapture.ts` checks active projects from the work snapshot and attaches a todo when one clear match exists.
- `praxis-desktop/src/App.tsx` stores pending captures and renders confirmation buttons.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add a richer confirmation/edit drawer so Praxis can show the parsed title, date, priority, and project before saving.
- Add mission-level matching and ask where to place a todo when a mission has multiple projects.
- Add natural-language update handling for moving due dates, changing priority, and marking work complete.

## 2026-04-21 - Editable Capture Drafts And Quick Todo Context

### Built

- Changed natural-language capture into a preview-first workflow.
- Added a save-candidate IPC path so reviewed capture drafts create records only after confirmation.
- Added editable capture draft fields for todo title, project, priority, due date, money flag, appointment title, start time, and end time.
- Preserved ambiguous intent handling while allowing the operator to choose and then edit before saving.
- Added project and mission context badges to todos in the global master checklist.

### Why

- A todo can be both part of a project and a quick action the operator can knock out.
- The app should not force the operator to choose between project structure and a useful daily action list.
- Preview-first capture prevents accidental bad records and builds trust in the assistant.

### How

- `CaptureMode` now supports `preview`.
- `SaveCaptureCandidateRequest` was added to the shared capture contract.
- `saveCaptureCandidate` was added in `praxis-desktop/electron/naturalLanguageCapture.ts`.
- `capture:saveCandidate` was exposed through Electron IPC and preload.
- `praxis-desktop/src/App.tsx` now stores capture drafts locally for editing before saving.
- The master checklist now renders project and mission badges from the current work snapshot.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add dedicated quick-action ranking separate from due-date ranking.
- Add filters for quick todos, project todos, money todos, and overdue todos.
- Add delete/edit flows for existing todos and appointments.

## 2026-04-21 - Edit/Delete And Quick-Action Ranking

### Built

- Added SQLite migration support for todo `quick_action` and `estimated_minutes`.
- Added shared update/delete record contracts.
- Added repository update/delete flows for missions, projects, todos, deadlines, and appointments.
- Added UI delete controls for stored work records shown in the current dashboard.
- Added edit panels for todos and appointments.
- Added quick-action and estimated-minutes fields to manual todo creation and capture drafts.
- Added quick/urgent filtering for the global master checklist.
- Updated daily brief todo ranking so quick actions get a modest boost without outranking hard appointments and urgent deadlines.
- Updated capture inference so wording such as `quick`, `call`, `send`, `email`, `pay`, or explicit minute estimates marks likely quick actions.

### Why

- The app needs correction paths before it becomes safe to use as a real memory system.
- Quick actions should be visible globally even when they belong to a project.
- Low-friction capture should infer quickness from wording, but still let the operator confirm or edit before saving.

### How

- SQLite schema version moved to `3`.
- Todo records now include `quickAction` and `estimatedMinutes`.
- `work:updateRecord` and `work:deleteRecord` IPC paths were added.
- The master checklist now has `All Active` and `Quick/Urgent` filters.
- Natural-language capture preselects quick-action metadata where wording strongly suggests it.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add edit panels for missions, projects, and deadlines, not just delete/status controls.
- Add richer quick-action ranking using ignored/overdue history once operator profile data is wired in.
- Build a settings page for multiple calendar connections.

## 2026-04-21 - Remaining Edit Panels, Calendar Settings, And Arrival Surface

### Built

- Added edit panels for missions, projects, and deadlines.
- Added local settings storage for multiple calendar connection records.
- Added calendar settings UI supporting Google, Outlook, and other provider labels.
- Added calendar connection add/delete IPC paths.
- Added a first arrival/status-report surface with a time-of-day greeting and report toggle.

### Why

- Stored records need correction paths before the app can be trusted as a working memory system.
- Calendar integration must be multi-account from the start rather than a single hard-coded Google or Outlook path.
- The arrival ritual needs an app-level surface before voice wake and spoken output are added.

### How

- SQLite schema version moved to `4`.
- `calendar_connections` stores local calendar settings records.
- `praxis-desktop/shared/settingsModel.ts` defines the settings contract.
- `praxis-desktop/electron/settingsRepository.ts` owns calendar settings persistence.
- `praxis-desktop/src/App.tsx` now exposes mission/project/deadline edit panels, calendar settings, and the arrival card.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Implement actual Google and Outlook OAuth/import adapters.
- Add settings edit/enable-disable controls, not just add/delete.
- Add voice and wake phrase only after the arrival text flow is reliable.

## 2026-04-21 - Mission And Project Focus Reports

### Built

- Added shared focus-report types.
- Added a focus-report generator for missions and projects.
- Added IPC/preload support for `brief:getFocusReport`.
- Added an arrival-card selector for mission/project focus.
- Added a `Where am I?` action that summarizes status, due date, active todos, active projects, deadlines, and top focus items.

### Why

- The operator wants to ask questions like `Tell me where I am on Origins`.
- This behavior should work from structured local state before voice or model-based conversation is added.
- Focus reports make Praxis feel more like a working assistant and less like a passive task board.

### How

- `praxis-desktop/electron/dailyBrief.ts` now generates focused mission/project reports from the work snapshot.
- Mission reports aggregate child projects, child todos, linked deadlines, and top ranked items.
- Project reports aggregate project todos, linked deadlines, and top ranked items.
- `praxis-desktop/src/App.tsx` renders the focus report in the arrival/status surface.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add natural-language routing so typed phrases like `where am I on Origins` open the same focus report automatically.
- Add people/waiting-on context to focus reports.
- Add a `tell me more` expansion for longer reports.

## 2026-04-21 - Conversational Focus Routing

### Built

- Added a lightweight assistant intent router.
- Added typed status-question detection for phrases such as `where am I on Origins`, `status on DCPS`, and `tell me where I am on <project>`.
- Added active mission/project matching against the local work snapshot.
- Routed matched focus questions from the `Tell Praxis` box into the existing focus-report generator.
- Preserved the natural-language capture path for ordinary reminder/todo/appointment text.

### Why

- The app should respond to assistant-like requests without requiring the operator to use dropdowns.
- Focus/status questions are different from capture requests and should not become todos.
- This keeps the interaction local and deterministic while preparing for richer model routing later.

### How

- `praxis-desktop/shared/assistantRouter.ts` defines route request/result contracts.
- `praxis-desktop/electron/assistantRouter.ts` classifies focus questions and matches active missions/projects.
- `assistant:route` was exposed through Electron IPC and preload.
- `praxis-desktop/src/App.tsx` now calls the router before natural-language capture.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add conversational routing for `tell me more`.
- Add routing for natural-language updates such as `mark X done` and `move X to Friday`.
- Add people/waiting-on context to focus reports.

## 2026-04-21 - Follow-Up Expansion And Waiting-On People

### Built

- Added a `tell_more` assistant route for simple follow-ups such as `tell me more`, `more`, `details`, and `what else`.
- Added expanded detail lists to mission/project focus reports.
- Added a `Tell Me More` action for focus reports and daily reports.
- Added first-class people records backed by SQLite and mirrored to `memory/people/<slug>.md`.
- Added todo `waiting_on_person_id` create/edit support.
- Surfaced waiting-on person badges in the master checklist, daily brief, and focus reports.

### Why

- Praxis needs to behave like a conversational assistant, not only a form-based tracker.
- The operator should be able to ask for more detail without accidentally creating a todo.
- Waiting-on context is central to keeping projects from disappearing when the next action belongs to another person.

### How

- `praxis-desktop/shared/assistantRouter.ts` now includes a `tell_more` intent.
- `praxis-desktop/electron/assistantRouter.ts` detects follow-up expansion phrases before capture routing.
- `praxis-desktop/electron/dailyBrief.ts` now returns both compact `topItems` and expanded `detailItems` for focus reports.
- `praxis-desktop/electron/workRepository.ts` can create people and attach todos to people.
- `praxis-desktop/electron/memoryWriter.ts` writes people markdown records and mirrors waiting-on links in the active todo summary.
- `praxis-desktop/src/App.tsx` exposes create-person controls, waiting-on selectors, and expanded report sections.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add edit/delete flows for people.
- Add natural-language people matching, for example `waiting on Max for the invoice`.
- Add persisted report context so follow-ups can support actions like `mark the first one done` and `move that to Friday`.

## 2026-04-21 - Natural-Language Waiting-On Matching

### Built

- Added deterministic matching between capture text and saved people records.
- Preselects `waitingOnPersonId` in todo drafts when one saved person clearly matches the text.
- Keeps ambiguous people matches unselected rather than guessing.
- Removes waiting-on noise words from generated todo titles.

### Why

- The operator should be able to type `waiting on Max for invoices by Friday` and have Praxis understand that Max is part of the structured context.
- Waiting-on should be queryable and rankable later, not trapped inside freeform notes.

### How

- `praxis-desktop/electron/naturalLanguageCapture.ts` scores saved people names against capture text.
- Matching only applies when there is a clear single best person.
- The reviewed capture draft still exposes the waiting-on selector before saving.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add person aliases and contact metadata.
- Add edit/delete flows for people.
- Add update routing for phrases like `Max sent it` or `clear waiting on Max`.

## 2026-04-21 - People Contacts And Report Action Context

### Built

- Expanded people records with email, phone, billing address, and notes fields.
- Added people edit/delete flows in the desktop UI.
- Added `person_work_links` for structured project/mission relationships.
- Upserts person/project and person/mission links when a project-linked todo is waiting on someone.
- Updated person markdown profiles with contact sections.
- Added persisted assistant report actions using `suggestion_contexts`.
- Added conservative ordinal completion follow-ups such as `mark the first one done`.

### Why

- People need to become durable relationship records, not just labels on todos.
- Contact data belongs in structured local storage so Praxis can later support outreach, billing review, and project relationship views.
- Follow-up actions need persisted context so Praxis can safely resolve what `first one` refers to.

### How

- `praxis-desktop/electron/praxisDb.ts` moved to schema version 5.
- `people` now has contact columns.
- `person_work_links` stores person-to-project/mission relationships.
- `praxis-desktop/electron/workRepository.ts` writes contact fields, relationship links, and person markdown.
- `praxis-desktop/electron/assistantContextRepository.ts` stores and resolves active report actions.
- `praxis-desktop/src/App.tsx` stores current report actions and executes only explicit supported completion commands.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add person aliases for better matching.
- Add direct person-to-project/mission management UI beyond waiting-on inference.
- Add finance records that link billing history to people once the Bill.com adapter is designed.
- Add more report actions, such as `move the second one to Friday`, after date-update routing exists.

## 2026-04-21 - People Contact Lookup

### Built

- Added a reusable person lookup contract for assistant-driven contact searches.
- Added a main-process lookup service that searches structured people records.
- Added assistant routing for contact questions such as `Can you give me Max's email?`.
- Wired the desktop `Tell Praxis` box to answer email, phone, billing address, contact summary, and profile lookups.

### Why

- The operator wants to ask Praxis for contact info by voice or Slack later.
- Contact lookup should use the same local structured records across desktop, Slack, and voice instead of scraping markdown.
- The deterministic path prevents ordinary task captures from being confused with contact questions.

### How

- `praxis-desktop/shared/personLookup.ts` defines lookup request/result types.
- `praxis-desktop/electron/personLookup.ts` resolves the requested field and best matching person.
- `praxis-desktop/electron/assistantRouter.ts` classifies contact lookup questions before capture.
- `assistant:lookupPerson` is exposed through IPC/preload for the renderer and future adapters.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add person aliases so `Max`, `Maxwell`, and company nicknames can point to the same record.
- Expose the lookup service to Slack quick replies.
- Route voice contact questions to this same service after wake/listening support exists.

## 2026-04-21 - Person Aliases And Relationship Lookup

### Built

- Added `person_aliases` as structured SQLite rows.
- Added alias fields to person create/edit flows.
- Mirrored aliases into person markdown profiles.
- Updated contact lookup to match against canonical names and aliases.
- Updated natural-language waiting-on matching to use aliases.
- Added relationship lookup for questions like `what projects is Max involved with?`.

### Why

- The operator will naturally use nicknames, shortened names, company shorthand, and platform handles.
- Alias matching needs to work the same way for desktop, Slack, and voice.
- Relationship lookup makes the people model useful beyond contact storage.

### How

- `praxis-desktop/electron/praxisDb.ts` moved to schema version 6 and added `person_aliases`.
- `praxis-desktop/electron/workRepository.ts` hydrates aliases into `PersonRecord` and replaces aliases on person update.
- `praxis-desktop/electron/personLookup.ts` searches aliases and returns relationship summaries from `person_work_links`.
- `praxis-desktop/electron/naturalLanguageCapture.ts` considers aliases when matching waiting-on people.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add explicit relationship management UI for people beyond waiting-on inference.
- Add Slack access to the same person lookup service.
- Add billing/finance links to people when Bill.com work starts.

## 2026-04-21 - Person Profile View

### Built

- Added a person profile/detail panel to the desktop settings/work surface.
- Shows contact info, aliases, role/context, notes, markdown path, linked projects, linked missions, and active waiting-on todos.
- Added profile-level edit/delete controls.
- Kept the view backed by the existing work snapshot rather than adding a duplicate query path.

### Why

- The people model needs to be useful as an operating surface, not just a hidden lookup table.
- The operator should be able to quickly answer `who is Max tied to and what are we waiting on?`.
- This prepares the UI for future billing history and explicit relationship editing.

### How

- `praxis-desktop/src/App.tsx` now derives person profile data from `people`, `personWorkLinks`, `projects`, `missions`, and `todos`.
- `praxis-desktop/src/App.css` adds profile styling consistent with the current HUD design.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add explicit person-to-project/mission relationship management.
- Add Slack access to people lookup.
- Add finance/billing history once finance records are implemented.

## 2026-04-21 - Explicit Person Relationship Management

### Built

- Added work-repository APIs for creating and deleting person-to-mission/project links.
- Exposed relationship link create/delete through Electron IPC and preload.
- Added an `Add Relationship` form in the person profile view.
- Supports relationship labels such as related, client, vendor, billing contact, GM, stakeholder, and waiting-on.
- Added remove controls for existing relationship links.

### Why

- Not every important relationship starts as a waiting-on todo.
- The operator needs to record that someone is a client, vendor, stakeholder, GM, or billing contact directly.
- This improves future status reports, contact lookup, and billing context.

### How

- `praxis-desktop/shared/workModel.ts` defines relationship create/delete inputs.
- `praxis-desktop/electron/workRepository.ts` reuses the existing `person_work_links` table for manual links.
- `praxis-desktop/electron/main.ts` and `praxis-desktop/electron/preload.ts` expose the new relationship operations.
- `praxis-desktop/src/App.tsx` manages relationship creation/removal from the person profile surface.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Expose people/contact lookup through Slack.
- Add finance/billing history once finance records are implemented.
- Add richer assistant responses using relationship labels.

## 2026-04-21 - Slack People Lookup And Relationship-Aware Focus Reports

### Built

- Added an optional Slack Socket Mode adapter that starts only when Slack app and bot tokens are present.
- Routed Slack DM messages through the shared assistant router instead of creating a Slack-only command path.
- Exposed structured people/contact lookup in Slack for saved email, phone, billing address, profile, and relationship questions.
- Added Slack adapter status reporting to the desktop app.
- Added people and relationship labels to mission and project focus reports.
- Rendered involved people directly in the Praxis Desk focus report surface.

### Why

- Slack should remain a secondary quick-reply surface that shares Praxis Desk's local assistant behavior.
- People/contact lookup is a safe first Slack capability because it is read-only and uses structured local records.
- Focus reports become more useful when they show who is involved, not only tasks and deadlines.

### How

- `praxis-desktop/electron/slackAdapter.ts` owns Slack startup, DM filtering, assistant routing, and replies.
- `praxis-desktop/shared/slackAdapter.ts` defines the adapter status contract.
- `praxis-desktop/electron/main.ts` starts and stops the optional adapter and exposes `slack:getStatus`.
- `praxis-desktop/src/App.tsx` shows Slack status and relationship-aware focus report people.
- `praxis-desktop/electron/dailyBrief.ts` derives involved people from `person_work_links`.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add Slack quick replies for mirrored proactive suggestions.
- Share persisted suggestion contexts between desktop and Slack.
- Add Slack support for safe write actions only after confirmation and context resolution are reliable.
- Watch the Electron main bundle size now that Slack Bolt is included.

## 2026-04-21 - Slack Report Context And Safe Ordinal Completion

### Built

- Made persisted assistant contexts thread-aware so desktop and Slack DM contexts do not overwrite each other.
- Added daily report routing for typed assistant requests such as `status report` and `brief me`.
- Added Slack DM daily report generation with numbered priority items.
- Added Slack DM mission/project focus report generation with numbered focus items.
- Stored Slack report actions in `suggestion_contexts` under the Slack DM thread.
- Added safe Slack follow-up resolution for commands such as `mark the first one done`.
- Tightened report action ordinals so they match the visible report list instead of the filtered actionable list.
- Restricted persisted completion actions to real work records, not appointments.

### Why

- Slack should let the operator work where they are without becoming a separate assistant.
- Numbered report follow-ups are the safest first Slack write action because they require an active report context.
- Ordinals must match what the operator actually saw, or quick replies can complete the wrong item.

### How

- `StoreAssistantContextInput` and `ResolveAssistantContextInput` now support optional `threadId`.
- Desktop continues to use `desktop:current` as the default context thread.
- Slack stores contexts as `slack:<channel>` for each DM channel.
- `praxis-desktop/electron/slackAdapter.ts` now routes daily reports, focus reports, person lookups, and context actions through shared services.
- `AssistantContextAction` now targets only `WorkEntityKind` records.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Mirror proactive suggestions into Slack using the same context store.
- Add explicit confirmation for riskier Slack write actions.
- Add Slack natural-language capture only after the confirmation path is reliable.

## 2026-04-21 - Shared Proactive Suggestion Context

### Built

- Added a shared proactive suggestion builder for the daily brief's top safe completion candidate.
- Added a desktop proactive suggestion card that accepts direct UI completion or short Tell Praxis replies such as `yes`, `do it`, `no`, or a number.
- Extended assistant context resolution so proactive suggestions can resolve short confirmations only when a live single-action context exists.
- Kept report follow-ups and proactive follow-ups in the same `suggestion_contexts` table while separating surfaces.
- Added optional Slack mirroring for startup proactive suggestions when `SLACK_OPERATOR_CHANNEL_ID` is configured.
- Added Slack short-reply resolution for mirrored proactive suggestions.

### Why

- Praxis needs to understand vague follow-ups only when they are grounded in a concrete previous suggestion.
- The safest first proactive write is narrow: marking a top todo or deadline done, not completing whole projects or missions.
- Desktop and Slack should share the same resolver behavior so the operator can work where they are.

### How

- `praxis-desktop/shared/proactiveSuggestion.ts` builds the top-action completion suggestion from daily brief priority items.
- `praxis-desktop/electron/assistantContextRepository.ts` resolves proactive short replies against `proactive_suggestion` contexts.
- `praxis-desktop/src/App.tsx` stores and displays the desktop proactive suggestion.
- `praxis-desktop/electron/slackAdapter.ts` mirrors the suggestion to Slack when a target operator channel is configured.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add more proactive suggestion types, such as focus report prompts and waiting-on follow-ups.
- Add a settings-backed Slack target instead of relying on `SLACK_OPERATOR_CHANNEL_ID`.
- Add explicit confirmation for any broader write action.

## 2026-04-21 - Settings-Backed Slack Mirroring Target

### Built

- Added Slack behavior settings to the local settings snapshot.
- Added a Praxis Desk settings form for the Slack operator channel ID.
- Added a Praxis Desk toggle for proactive Slack mirroring.
- Added IPC/preload support for saving Slack settings.
- Updated the Slack adapter to prefer stored Slack settings for proactive mirroring.
- Kept `SLACK_OPERATOR_CHANNEL_ID` as a fallback and kept Slack tokens environment-based.

### Why

- The operator should not need to edit environment variables for ordinary app behavior.
- Slack tokens are secrets and should not be stored in SQLite until a secure local secret store is designed.
- Proactive Slack mirroring should be opt-in from the app surface.

### How

- `SettingsSnapshot` now includes `slack`.
- `praxis-desktop/electron/settingsRepository.ts` stores Slack settings in the existing key/value `settings` table.
- `settings:updateSlack` is exposed through Electron IPC and preload.
- `praxis-desktop/src/App.tsx` renders Slack mirroring settings in the settings surface.
- `praxis-desktop/electron/slackAdapter.ts` reads stored Slack settings before falling back to env configuration.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add a secure token storage decision before moving Slack tokens into the UI.
- Add a manual `Send Test Suggestion` action for Slack settings.

## 2026-04-21 - Manual Slack Test Suggestion

### Built

- Added a Slack adapter action for sending the current proactive suggestion on demand.
- Exposed `slack:sendTestSuggestion` through Electron IPC and preload.
- Added a `Send Test Suggestion` button in Praxis Desk Slack settings.
- Reused the same proactive suggestion context store so test replies still resolve safely.

### Why

- Slack setup should be testable without restarting Praxis.
- The operator needs a clear way to verify channel ID, tokens, and proactive mirroring.
- Test sends should exercise the real resolver path, not a fake message.

### How

- `sendSlackTestSuggestion` posts the same top-action suggestion used by startup mirroring.
- The action returns a typed success/failure result to the renderer.
- Praxis Desk writes the result into the app status line.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Normalize Slack API errors into setup-specific guidance.
- Add a test-message path that can verify Slack connectivity even when there is no safe proactive suggestion available.

## 2026-04-21 - Slack Connection Test And Diagnostics

### Built

- Added a separate Slack connection test that posts a plain setup message to the saved operator channel.
- Added setup-specific Slack API error guidance for missing channel, bot not in channel, missing `chat:write`, and invalid auth.
- Exposed `slack:sendConnectionTest` through Electron IPC and preload.
- Added a `Test Slack Connection` button next to `Send Test Suggestion` in Praxis Desk settings.

### Why

- Slack setup should be testable even when there is no safe todo/deadline available for a proactive suggestion.
- The operator needs actionable failure messages instead of raw Slack API error codes.
- Connection testing and proactive suggestion testing are different diagnostics and should not be conflated.

### How

- `sendSlackConnectionTest` verifies the running adapter, channel configuration, and Slack posting permissions.
- `sendSlackTestSuggestion` still verifies the proactive suggestion path and resolver context.
- Both paths return typed success/failure results to the renderer.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add live setup guidance for where to find the channel ID.
- Add a restart/reconnect action after Slack tokens are configured.

## 2026-04-21 - Manual Slack Adapter Restart

### Built

- Added a Slack adapter restart action that stops and starts Socket Mode without restarting the whole app.
- Exposed `slack:restart` through Electron IPC and preload.
- Added a `Restart Slack Adapter` button to Praxis Desk Slack settings.
- Refreshes Slack status after restart attempts.

### Why

- Slack setup needs a low-friction recovery path when settings change or the adapter enters a bad state.
- The operator should not have to restart the full desktop app just to retry the Slack connection.
- This keeps Slack setup actions grouped in the Settings surface.

### How

- `restartSlackAdapter` calls the existing stop/start adapter paths and returns a typed success/failure result.
- Startup errors are normalized through the existing Slack error guidance helper.
- The renderer reports restart results through the existing app status line.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add secure token storage or a guided token setup flow before moving Slack tokens into the UI.
- Avoid startup proactive sends during manual restart if this becomes noisy.

## 2026-04-21 - Natural-Language Completion Updates

### Built

- Added assistant routing for explicit completion phrases that name an active todo or deadline.
- Supports examples such as `mark Max invoice done`, `complete permit deadline`, and `finish site lighting report`.
- Uses conservative title matching and rejects unclear or close matches.
- Routes matched desktop requests through the existing `work:updateStatus` path.
- Routes matched Slack DM requests through the same status update path.

### Why

- Praxis needs to update existing work from natural language, not only create new records.
- Completion by title is the safest first update action because it has a clear target and reversible status history through reactivation.
- This reduces friction for quick cleanup after the operator finishes something.

### How

- `AssistantRouteResult` now includes `work_update_status`.
- `praxis-desktop/electron/assistantRouter.ts` detects explicit completion language and searches active todos/deadlines.
- Praxis Desk handles the route before falling back to natural-language capture.
- Slack handles the same route before falling back to lookup/help text.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add deterministic due-date updates such as `move Max invoice to Friday`.
- Add waiting-on updates such as `Max sent it` or `clear waiting on Max`.
- Add confirmation when multiple possible records are close matches.

## 2026-04-21 - Natural-Language Due-Date Moves

### Built

- Added assistant routing for due-date move phrases that name an active todo or deadline.
- Supports examples such as `move Max invoice to Friday`, `reschedule permit deadline to tomorrow`, and `push site lighting report to 5/12`.
- Reuses conservative title matching and rejects unclear or close matches.
- Routes desktop updates through the existing `work:updateRecord` path.
- Routes Slack DM updates through the same repository update path.
- Preserves existing title, priority, project, quick-action, money, notes, and waiting-on metadata while changing only `dueAt`.

### Why

- Correcting due dates is a core assistant behavior and should not require manual form edits.
- Due-date updates need to edit existing records instead of creating duplicate todos.
- The deterministic path is safer than model-driven editing until confirmation flows are richer.

### How

- `AssistantRouteResult` now includes `work_update_due_date`.
- `praxis-desktop/electron/assistantRouter.ts` parses simple dates using the same today/tomorrow/weekday/date style as capture.
- Praxis Desk and Slack both execute the matched route through existing work repository APIs.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add waiting-on updates such as `Max sent it` or `clear waiting on Max`.
- Add user-facing confirmation when multiple records are close matches.
- Extract shared date parsing to avoid duplicate parser logic between capture and router.

## 2026-04-21 - Natural-Language Waiting-On Clearing

### Built

- Added assistant routing for waiting-on clear phrases that name a saved person or alias.
- Supports examples such as `Max sent it`, `clear waiting on Max`, and `not waiting on Scott anymore`.
- Requires exactly one active todo waiting on the matched person.
- Routes desktop updates through the existing `work:updateRecord` path.
- Routes Slack DM updates through the same repository update path.
- Preserves existing todo title, project, priority, due date, quick-action, money, and notes while clearing `waitingOnPersonId`.

### Why

- Waiting-on context is central to Praxis helping the operator avoid stalled projects.
- Clearing waiting-on links should be as easy as saying the person handled it.
- Refusing multiple matches is safer until the next ambiguity-confirmation system is built.

### How

- `AssistantRouteResult` now includes `work_clear_waiting_on`.
- `praxis-desktop/electron/assistantRouter.ts` matches people by name and aliases, then checks active todos waiting on that person.
- Praxis Desk and Slack both execute the matched route through existing work repository APIs.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add ambiguity confirmation when a person has multiple active waiting-on todos.
- Add waiting-on reassignment, for example `waiting on Max for the invoice`.

## 2026-04-21 - Ambiguous Update Confirmation

### Built

- Added a shared work-update confirmation route for ambiguous natural-language updates.
- Completion, due-date moves, and waiting-on clearing can now return numbered choices instead of failing outright.
- Stored ambiguous update choices in `suggestion_contexts` using a new `work_update_confirmation` surface.
- Expanded assistant context actions beyond completion to include `update_due_date` and `clear_waiting_on`.
- Wired numbered clarification replies through both Praxis Desk and Slack.

### Why

- Refusing ambiguous updates is safe, but it creates friction when Praxis has enough information to ask a clarifying question.
- Numbered clarification keeps the operator in flow without allowing guesses.
- The same confirmation resolver should work across desktop and Slack.

### How

- `AssistantContextAction` now supports `complete`, `update_due_date`, and `clear_waiting_on` commands.
- `praxis-desktop/electron/assistantRouter.ts` builds numbered confirmation actions when multiple plausible records match.
- `praxis-desktop/electron/assistantContextRepository.ts` resolves clarification replies against active `work_update_confirmation` contexts.
- Praxis Desk and Slack execute the selected contextual action through existing work repository APIs.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add a richer visual confirmation card in Praxis Desk instead of status-line-only clarification text.
- Add waiting-on reassignment commands such as `waiting on Max for the invoice`.

## 2026-04-21 - Proactive Waiting-On Suggestions

### Built

- Added a proactive suggestion type for active todos that are waiting on a saved person.
- Praxis Desk now prefers a waiting-on check before falling back to the top-action completion check.
- The proactive card button now adapts between `Clear Waiting` and `Mark Done`.
- Slack proactive mirroring uses the same best-suggestion builder as Praxis Desk.
- Waiting-on proactive replies reuse the existing `proactive_suggestion` context surface and `clear_waiting_on` command.

### Why

- Waiting-on items are a major reason projects stall and disappear from attention.
- Praxis should proactively ask whether a waiting-on blocker has cleared.
- The behavior is safe because it only clears a structured waiting-on link on one todo.

### How

- `praxis-desktop/shared/proactiveSuggestion.ts` now builds waiting-on suggestions from the full work snapshot.
- `praxis-desktop/src/App.tsx` derives proactive suggestions from both the work snapshot and daily brief.
- `praxis-desktop/electron/slackAdapter.ts` mirrors the same best proactive suggestion into Slack.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add proactive focus suggestions for missions/projects with overdue or blocked work.
- Add waiting-on reassignment commands such as `waiting on Max for the invoice`.

## 2026-04-21 - Normalized Calendar Import Foundation

### Built

- Added a shared normalized calendar event contract for manual, Google, Outlook, and ICS sources.
- Added an Electron calendar importer that writes normalized events into local appointment records.
- Upserts imported appointments by `source_system` plus `external_id` when an external ID is available.
- Refreshes the appointment markdown summary and memory document index after imports.
- Added a Settings surface for manual JSON event import so the pipeline can be tested before OAuth adapters exist.

### Why

- Google, Outlook, and ICS should all feed one appointment pipeline instead of each integration writing separate logic.
- Manual import gives Praxis a working bridge into the daily brief while OAuth and token storage are designed safely.
- The local appointment table remains the operational source for daily ranking and status reports.

### How

- `praxis-desktop/shared/calendarImport.ts` defines the normalized event input and import result.
- `praxis-desktop/electron/calendarImport.ts` validates events, inserts or updates appointments, and refreshes markdown memory.
- `praxis-desktop/electron/main.ts`, `praxis-desktop/electron/preload.ts`, and `praxis-desktop/electron/electron-env.d.ts` expose the importer through IPC.
- `praxis-desktop/src/App.tsx` adds the manual import form under Calendar Settings.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add ICS file parsing into the normalized import contract.
- Add Google and Outlook OAuth adapters that feed the same importer.
- Add stronger diagnostics for skipped events and duplicate manual imports.

## 2026-04-21 - ICS Calendar Import

### Built

- Added a dependency-free ICS parser for ordinary `VEVENT` records.
- Parsed `UID`, `SUMMARY`, `DTSTART`, `DTEND`, `DESCRIPTION`, `LOCATION`, `RECURRENCE-ID`, and `STATUS`.
- Skips cancelled events and reports unusable events that are missing required start/title data.
- Added an `.ics` file import form under Calendar Settings.
- ICS imports feed the same normalized calendar importer used by manual JSON and future provider adapters.

### Why

- ICS gives Praxis a practical calendar ingestion path before Google and Outlook OAuth are implemented.
- Keeping parsing local preserves the local-first privacy stance.
- Using the shared importer prevents the app from growing separate appointment write paths.

### How

- `praxis-desktop/shared/icsCalendar.ts` unfolds ICS lines, extracts VEVENT fields, converts dates into importer-friendly values, and returns normalized events.
- `praxis-desktop/src/App.tsx` reads the selected file with the browser `File` API and sends parsed events to `window.praxis.calendar.importEvents`.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add recurrence expansion for `RRULE`.
- Add stronger timezone handling for complex exported calendars.
- Add Google and Outlook OAuth adapters into the same normalized importer.

## 2026-04-21 - Bounded ICS Recurrence Expansion

### Built

- Added local expansion for common ICS `RRULE` frequencies: daily, weekly, monthly, and yearly.
- Supports `COUNT`, `UNTIL`, `INTERVAL`, weekly `BYDAY`, and `EXDATE`.
- Generates stable imported appointment IDs by combining event `UID` with the occurrence start time.
- Added hard caps on recurrence scanning and emitted instances to prevent endless calendar imports from flooding local appointment storage.

### Why

- Real calendar exports frequently store repeating appointments as one recurring event instead of separate events.
- Praxis needs recurring doctor appointments, meetings, and project check-ins to appear in daily briefs without waiting for OAuth integrations.
- Bounded expansion preserves usefulness while keeping the local-first importer safe.

### How

- `praxis-desktop/shared/icsCalendar.ts` now parses recurrence metadata and expands recurring `VEVENT` records before sending normalized events to the shared calendar importer.
- Recurrence instances preserve original duration and notes while using occurrence-specific external IDs for upsert safety.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- A local parser smoke test expanded a weekly recurring event, honored `EXDATE`, and produced stable occurrence IDs.
- `npx vite build` passes.

### Follow-Up

- Add stronger `VTIMEZONE` handling for complex exported calendars.
- Add Google and Outlook OAuth adapters into the same normalized importer.

## 2026-04-21 - ICS Timezone Conversion

### Built

- Added IANA `TZID` conversion for ICS date-time properties.
- Timezone-tagged event starts, ends, and exclusion dates now convert to UTC before storage.
- Preserved date-only all-day event behavior as local all-day appointment records.

### Why

- Calendar exports often include timezone-tagged values such as `TZID=America/New_York`.
- Treating timezone-tagged values as plain local times can shift appointments when the source calendar is from another timezone.
- UTC storage gives the daily brief and appointment display a consistent operational value.

### How

- `praxis-desktop/shared/icsCalendar.ts` now uses `Intl.DateTimeFormat` timezone data to calculate offsets for IANA `TZID` values.
- The parser falls back to the prior floating-time behavior if a timezone cannot be interpreted.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- A local parser smoke test converted Los Angeles and New York `TZID` events, including recurrence instances, into UTC appointment times.
- `npx vite build` passes.

### Follow-Up

- Add full custom `VTIMEZONE` parsing only if real exported calendars require it.
- Add Google and Outlook OAuth adapters into the same normalized importer.

## 2026-04-21 - Calendar Connection Status Foundation

### Built

- Added local auth and sync status fields to calendar connection records.
- Existing calendar rows migrate forward with provider-appropriate defaults.
- Google and Outlook calendar rows now start as `needs_credentials` and `sync blocked`.
- Other calendar rows now start as `not configured` and `manual import only`.
- Praxis Desk Settings now displays calendar auth status, sync status, last sync time, and sync errors.

### Why

- Live Google and Outlook sync will require credentials and token storage decisions.
- The app needs to represent setup state before OAuth is wired so the user can see why a saved calendar is not syncing yet.
- Auth/sync status should be operational metadata in SQLite, not prose hidden in markdown.

### How

- `praxis-desktop/shared/settingsModel.ts` defines `CalendarAuthStatus` and `CalendarSyncStatus`.
- `praxis-desktop/electron/praxisDb.ts` migrates `calendar_connections` to schema version `7`.
- `praxis-desktop/electron/settingsRepository.ts` applies safe default statuses when creating or reading calendar rows.
- `praxis-desktop/src/App.tsx` renders the status badges in Calendar Settings.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add a secure local secrets strategy before storing provider refresh tokens.
- Add Google and Outlook OAuth adapters that update auth/sync status and feed the normalized importer.

## 2026-04-22 - Encrypted Secret Vault Foundation

### Built

- Added a `secure_secrets` SQLite table for encrypted integration secret blobs and non-secret metadata.
- Added a main-process secret repository backed by Electron `safeStorage`.
- Added secret storage status to the Settings snapshot.
- Praxis Desk now displays whether OS-backed secret encryption is available.
- Calendar connection deletion now removes any encrypted secrets owned by that calendar connection.

### Why

- Google and Outlook OAuth will require refresh tokens.
- Tokens must stay local-first, but they should not be stored as plaintext settings or markdown memory.
- The renderer should never receive raw secret values; only main-process adapters should read or write them.

### How

- `praxis-desktop/shared/secretStorage.ts` defines secret owner/kind metadata.
- `praxis-desktop/electron/secretRepository.ts` encrypts and decrypts values through Electron `safeStorage`.
- `praxis-desktop/electron/praxisDb.ts` migrates the local database to schema version `8`.
- `praxis-desktop/electron/settingsRepository.ts` includes secret storage health and cascades calendar secret deletion.
- `praxis-desktop/src/App.tsx` renders secret storage availability in Calendar Settings.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add Google OAuth code flow that stores refresh tokens through the secret vault.
- Add Outlook OAuth code flow through the same secret vault.
- Move Slack tokens from environment variables into the secret vault only after a guided setup flow exists.

## 2026-04-22 - Google Calendar OAuth Readiness Scaffold

### Built

- Added shared Google calendar OAuth readiness and start-result types.
- Added a main-process Google OAuth scaffold that checks secret-storage availability and `PRAXIS_GOOGLE_CLIENT_ID`.
- Added authorization URL generation for the Google installed-app authorization-code flow.
- Stores a pending OAuth state value in local settings for later callback validation.
- Added Settings UI status for Google OAuth readiness and a per-Google-calendar preparation action.

### Why

- Google Calendar sync needs OAuth, but token exchange should not be added until the app has a safe token vault and a clear callback path.
- The user needs visible setup diagnostics before being asked to create Google Cloud credentials.
- Starting with read-only calendar access keeps scope narrow for V1.

### How

- `praxis-desktop/shared/calendarOAuth.ts` defines the OAuth readiness and prepare-result contract.
- `praxis-desktop/electron/googleCalendarOAuth.ts` builds the Google authorization URL with calendar read-only scope, offline access, state, and configured redirect URI.
- `praxis-desktop/electron/main.ts`, `praxis-desktop/electron/preload.ts`, and `praxis-desktop/electron/electron-env.d.ts` expose readiness and preparation through IPC.
- `praxis-desktop/src/App.tsx` renders Google OAuth setup status and the `Prepare Google OAuth` action.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.

### Follow-Up

- Add a loopback callback listener for the configured redirect URI.
- Exchange authorization codes for tokens in the Electron main process.
- Store refresh tokens through the encrypted secret vault and update calendar auth/sync status.

## 2026-04-22 - Google Calendar OAuth Callback And Token Vault

### Built

- Added a local loopback callback server for the configured Google OAuth redirect URI.
- Added PKCE code verifier/challenge generation for the Google installed-app flow.
- Opens the Google authorization URL in the system browser from the Electron main process.
- Validates OAuth `state` against transient main-process memory.
- Exchanges authorization codes for tokens at Google's token endpoint.
- Stores the token response through the encrypted secret vault under the owning calendar connection.
- Updates the calendar connection to `ready` and `ready_to_sync` after a successful token exchange.

### Why

- Google Calendar sync needs refresh tokens, but raw tokens must never pass through the renderer or markdown memory.
- PKCE protects the desktop authorization-code flow.
- Keeping pending code verifiers in memory avoids persisting transient OAuth secrets.

### How

- `praxis-desktop/electron/googleCalendarOAuth.ts` owns the callback listener, PKCE values, token exchange, and vault write.
- `praxis-desktop/electron/secretRepository.ts` stores the token response with Electron `safeStorage`.
- `praxis-desktop/src/App.tsx` still only triggers OAuth and displays status; it never receives token data.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add Google Calendar event fetch/import using the encrypted token.
- Refresh access tokens when needed.
- Add UI refresh after browser callback completion so status updates without a manual reload.

## 2026-04-22 - Manual Google Calendar Event Sync

### Built

- Added a Google Calendar sync adapter that reads encrypted OAuth tokens from the secret vault.
- Refreshes Google access tokens when missing or near expiry while preserving existing refresh tokens.
- Fetches upcoming primary-calendar events through Google Calendar `events.list`.
- Uses `singleEvents=true` and `orderBy=startTime` so recurring events arrive as individual appointment instances.
- Normalizes Google events into the shared calendar import contract.
- Imports Google events into local appointment records with `sourceSystem: google` for repeat-sync upserts.
- Added a manual `Sync Google Events` button for authenticated Google calendar connections.

### Why

- The daily brief needs real connected calendar data, not just manual appointments and `.ics` imports.
- Manual sync is safer than background sync at this stage and follows the current rule against adding schedulers.
- Reusing the normalized importer keeps Google, ICS, and future Outlook data on one appointment path.

### How

- `praxis-desktop/electron/googleCalendarSync.ts` owns token refresh, event fetch, normalization, import, and sync-status updates.
- `praxis-desktop/shared/googleCalendarSync.ts` defines the IPC result contract.
- `praxis-desktop/electron/main.ts`, `praxis-desktop/electron/preload.ts`, and `praxis-desktop/electron/electron-env.d.ts` expose manual Google sync.
- `praxis-desktop/src/App.tsx` adds the per-connection manual sync action.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add automatic UI refresh after the browser OAuth callback succeeds.
- Add Outlook OAuth/event sync using the same vault and importer pattern.
- Decide later whether background sync is worth adding.

## 2026-04-22 - Google Calendar OAuth Refresh And Sync Diagnostics

### Built

- Added an internal Google OAuth update event from the Electron main process to the renderer.
- Praxis Desk Settings now refreshes automatically after Google OAuth callback success or failure.
- Added clearer Google sync diagnostics for missing encrypted tokens, invalid stored token data, missing refresh tokens, revoked authorization, permission denial, API fetch errors, and empty sync windows.
- Google sync now maps reconnect-required failures back to `needs_credentials` and `blocked` instead of a generic error state.

### Why

- After browser OAuth completes, the user should not have to manually reload Settings to see the calendar connection become ready.
- Calendar setup failures need to tell the operator what to do next, especially reconnect versus permission/API problems.
- Better diagnostics reduce support friction before Outlook and other providers are added.

### How

- `praxis-desktop/electron/googleCalendarOAuth.ts` emits safe non-secret OAuth update events.
- `praxis-desktop/electron/main.ts` forwards those events to renderer windows.
- `praxis-desktop/electron/preload.ts` exposes a typed subscription hook.
- `praxis-desktop/src/App.tsx` listens for OAuth updates and refreshes Settings/readiness state.
- `praxis-desktop/electron/googleCalendarSync.ts` uses explicit sync errors to set status and return actionable messages.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add Outlook OAuth/event sync using the same vault, status, and diagnostic pattern.
- Decide later whether background calendar sync is worth adding.

## 2026-04-22 - Outlook Calendar OAuth Scaffold

### Built

- Added Outlook OAuth readiness checks for `PRAXIS_OUTLOOK_CLIENT_ID` and OS-backed secret storage.
- Added Microsoft identity authorization URL generation with PKCE and Microsoft Graph calendar read scope.
- Added a local loopback callback server for Outlook OAuth.
- Exchanges Outlook authorization codes for tokens in the Electron main process.
- Stores Outlook token responses in the encrypted secret vault under the owning calendar connection.
- Emits safe OAuth update events so Praxis Desk Settings refreshes after callback success or failure.
- Added `Connect Outlook` action for Outlook calendar rows.

### Why

- The operator wants Google and Outlook calendar support from the start.
- Outlook should use the same local-first, no-raw-token renderer rule as Google.
- Building OAuth before event sync keeps credential setup separate from provider event normalization.

### How

- `praxis-desktop/electron/outlookCalendarOAuth.ts` owns readiness, PKCE, authorization URL generation, callback handling, token exchange, vault write, and update events.
- `praxis-desktop/electron/main.ts`, `praxis-desktop/electron/preload.ts`, and `praxis-desktop/electron/electron-env.d.ts` expose Outlook OAuth IPC.
- `praxis-desktop/src/App.tsx` displays Outlook OAuth readiness and connection controls.
- `praxis-desktop/shared/calendarOAuth.ts` now includes Outlook provider/update types.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Add Outlook event fetch/import through Microsoft Graph.
- Add Outlook sync diagnostics matching the Google sync adapter.

## 2026-04-22 - Manual Outlook Calendar Event Sync

### Built

- Added an Outlook Calendar sync adapter backed by encrypted OAuth tokens.
- Refreshes Outlook access tokens when missing or near expiry while preserving refresh tokens.
- Fetches a bounded event window from Microsoft Graph `/me/calendarView`.
- Requests UTC event times from Microsoft Graph for consistent appointment storage.
- Normalizes Outlook calendar events into the shared calendar import contract.
- Imports Outlook events into local appointment records with `sourceSystem: outlook` for repeat-sync upserts.
- Added a manual `Sync Outlook Events` button for authenticated Outlook calendar connections.

### Why

- The operator wants to work from both Google Calendar and Outlook.
- Outlook should use the same local-first vault and importer pattern as Google.
- Manual sync avoids hidden background scheduler behavior while giving the daily brief real Outlook appointments.

### How

- `praxis-desktop/electron/outlookCalendarSync.ts` owns token refresh, Graph calendar-view fetch, normalization, import, and sync-status updates.
- `praxis-desktop/shared/outlookCalendarSync.ts` defines the IPC result contract.
- `praxis-desktop/electron/main.ts`, `praxis-desktop/electron/preload.ts`, and `praxis-desktop/electron/electron-env.d.ts` expose manual Outlook sync.
- `praxis-desktop/src/App.tsx` adds the per-connection manual sync action.

### Verification

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npx vite build` passes.

### Follow-Up

- Live-test Outlook OAuth and event sync against a Microsoft app registration.
- Add setup documentation for Google and Outlook app credentials.
- Decide later whether background calendar sync is worth adding.

## 2026-04-22 - Settings Pop-Out Window

### Built

- Moved Settings out of the main Praxis Desk dashboard panels.
- Added a dedicated Electron Settings window opened from the native Settings menu.
- Reuses the same local IPC APIs for Slack, calendar connections, OAuth setup, people records, and storage health.
- Keeps the dashboard right panel focused on Memory Writer and capture workflows.

### Why

- Settings is setup/maintenance work, not a daily operating surface.
- Opening it as a pop-out preserves the main Today/Projects/Capture layout while users configure integrations.

### How

- `electron/main.ts` now creates or focuses a `Praxis Settings` BrowserWindow and loads the renderer with `?window=settings`.
- `src/main.tsx` selects either the main `App` or `SettingsApp` based on that query parameter.
- `src/SettingsApp.tsx` owns settings-only state and handlers.
- `src/App.tsx` no longer has a Settings panel mode.

### Verification

- `npx tsc --noEmit` passes.

### Follow-Up

- Renamed the command/capture surface from `Tell Praxis` to `Talk to Praxis`.
- Appointment reports now switch the dashboard to Today and scroll the report area into view so the result is visible.
- Empty appointment reports now stay in the Talk to Praxis reply area instead of adding an empty report card to the timeline.
- Bare appointment questions now default to today; `upcoming`, `next`, or `future` requests use the broader upcoming window.
- Empty today/tomorrow appointment answers now mention the next upcoming appointment when one exists.
- The dashboard appointment list is now labeled `Upcoming Appointments` to avoid confusing it with today's appointment answer.
- `npm run lint` passes.
- `npx vite build` passes.

### Follow-Up

- Added a `Refresh Settings` action after live Google setup exposed that the pop-out could display stale loaded state until reopened.
- Reworked the Settings pop-out into top-level sections: Slack Integration, Google Calendar, Import With ICS, Calendar Events, People, and Storage.
- Moved `Connect Google` and `Sync Google Events` into the Google Calendar section so authorization is visible without scrolling through every calendar setting.
- Added a prominent Google Calendar next-action card after live testing showed the connect button was still too easy to miss.
- Updated calendar sync labels so a connection with `lastSyncedAt` displays as `synced` instead of the ambiguous `ready to sync`.

## 2026-04-22 - Calendar Auto-Sync

### Built

- Added automatic calendar sync for ready Google and Outlook calendar connections.
- Auto-sync runs when Praxis starts, after a calendar OAuth connection succeeds, and before daily brief generation.
- Added a short cooldown so repeated dashboard refreshes do not continuously call Google or Outlook.
- Broadcasts auto-sync completion back to renderer windows so the dashboard and Settings refresh after imports complete.

### Why

- Calendar integration should be seamless. The operator should not need to manually sync every day.
- This keeps sync event-driven and launch-driven rather than introducing a hidden recurring scheduler.

### How

- `praxis-desktop/electron/calendarAutoSync.ts` discovers ready enabled calendar connections and calls the existing provider sync adapters.
- `praxis-desktop/electron/main.ts` triggers auto-sync on startup, OAuth success, and `brief:getDaily`.
- `praxis-desktop/electron/preload.ts` and `electron-env.d.ts` expose calendar auto-sync update events to the renderer.
- `praxis-desktop/src/App.tsx` and `src/SettingsApp.tsx` refresh their local state when auto-sync finishes.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

### Follow-Up

- Updated sync behavior to match operator preference: startup, every 30 minutes while Praxis is open, after OAuth, and when the operator asks about appointments/events.
- Appointment/event/schedule questions now route to the daily report path, which forces a calendar sync first.
- Recorded travel-access expectation for a future Surface companion client that can connect from anywhere, not just the home network.

## 2026-04-22 - Appointment-First Briefing Data

### Built

- Enriched daily brief appointment items with start time, end time, all-day flag, source system, and notes.
- Updated spoken status reports to call out the first calendar item explicitly when appointments are on the near radar.
- Preserved appointment-first priority behavior for same-day appointments over todos and deadlines.

### Why

- The backend should settle before the larger UI cleanup.
- Better appointment metadata gives the future uncluttered dashboard enough structure to render cleaner calendar cards and dropdown actions.

### Verification

- `npx tsc --noEmit` passes.

## 2026-04-22 - Appointment Report Service

### Built

- Added a dedicated appointment/event report service for today, tomorrow, and upcoming windows.
- Appointment/event/schedule questions now route to `appointment_report` instead of piggybacking on the general daily brief.
- The appointment report forces calendar auto-sync before answering.
- Exposed the report through Electron IPC and added a focused dashboard report card.

### Why

- "What appointments do I have?" should return a calendar-focused answer, not only a general status report.
- This keeps backend/reporting behavior clean before the larger UI cleanup.

### Verification

- `npx tsc --noEmit` passes.
## 2026-04-23 - Review And Restore For Dismissed Contact Suggestions

### Built

- Added a restore path for dismissed inferred contact suggestions.
- Settings -> People now shows dismissed email suggestions for the selected person instead of hiding them permanently.
- Each dismissed suggestion can be restored with one click so it becomes active again in the review flow.

### Why

- Dismiss should mean "not now" or "wrong for now," not "gone forever."
- This keeps Praxis conservative about inferred contact data while still giving the operator a reversible paper trail.

### How

- `praxis-desktop/electron/emailRepository.ts` now deletes the dismissal fact when a suggestion is restored.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, and `electron/electron-env.d.ts` expose the restore action through IPC.
- `praxis-desktop/src/SettingsApp.tsx` now derives both active and dismissed contact suggestions from the same evidence set.
- `praxis-desktop/src/components/PeopleProfilePanel.tsx` now renders a dismissed-suggestions review card with a `Restore Suggestion` action.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Smarter Email Follow-Up Extraction

### Built

- Tightened inbox follow-up extraction so Praxis scores assignment cues, action language, deadlines, urgency, and project-sized language instead of relying on a single keyword hit.
- Added better due-date parsing for phrases like `tonight`, `next week`, month-name dates, `noon`, and `end of day`.
- Added a light noise filter so obvious digest, no-reply, and security-code mail is less likely to surface as work.
- Improved generated follow-up titles so todo suggestions read more like actions and less like raw subject lines.

### Why

- Email follow-up capture was working, but it was still too binary and vulnerable to noisy inbox phrasing.
- Praxis needs to catch real asks from clients and collaborators without cluttering the dashboard with low-value mail.

### How

- `praxis-desktop/electron/emailRepository.ts` now uses weighted extraction heuristics, expanded timing parsing, and title cleanup for email suggestions.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Outlook App Setup Moved Into Settings

### Built

- Added shared Microsoft app settings storage for Outlook integrations.
- Outlook email and Outlook calendar now read the same saved client ID and encrypted client secret from Praxis Settings instead of depending only on environment variables.
- Added Outlook app setup controls to the Email Integration tab with redirect guidance for both the mail and calendar callbacks.
- Added clearer sync-time failure messages when Outlook client setup is missing.

### Why

- Outlook setup still had too much friction because it depended on terminal environment variables.
- The Microsoft app registration should behave like a first-class app integration, not a hidden developer-only prerequisite.

### How

- `praxis-desktop/shared/settingsModel.ts` now includes shared Outlook OAuth settings.
- `praxis-desktop/electron/settingsRepository.ts` persists the Outlook client ID in app settings and the client secret in encrypted local secret storage.
- `praxis-desktop/electron/outlookEmailOAuth.ts`, `outlookEmailSync.ts`, `outlookCalendarOAuth.ts`, and `outlookCalendarSync.ts` now use the shared saved Outlook client configuration.
- `praxis-desktop/src/SettingsApp.tsx` and `src/components/EmailSettingsPanel.tsx` now expose the Outlook app setup workflow in the Settings UI.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Outlook Error Hardening

### Built

- Added Microsoft-specific Outlook error normalization for OAuth and sync failures.
- Praxis now translates common Azure/Microsoft Graph failures like redirect mismatch, bad client ID, missing consent, missing permissions, and missing resource references into clearer operator-facing messages.
- Expanded the Outlook setup card in Settings with explicit permission guidance and better visibility for the last sync error.

### Why

- The next real Outlook test should surface actionable setup guidance instead of raw `AADSTS...` or generic Graph error text.
- This reduces friction for live validation without needing terminal-level debugging.

### How

- `praxis-desktop/electron/outlookErrorHelpers.ts` centralizes Outlook OAuth and sync error translation.
- `praxis-desktop/electron/outlookEmailOAuth.ts`, `outlookCalendarOAuth.ts`, `outlookEmailSync.ts`, and `outlookCalendarSync.ts` now route Microsoft failures through those helpers.
- `praxis-desktop/src/components/EmailSettingsPanel.tsx` now calls out the required Microsoft permissions and shows the latest Outlook sync error more prominently.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Proactive Reminder Hardening

### Built

- Upgraded the proactive suggestion selector so Praxis now prefers more meaningful nudges instead of always defaulting to the same top completion prompt.
- Added proactive nudge coverage for overdue todos/deadlines, stale waiting-on items, and quick-win todos.
- Improved waiting-on nudges with stale-age and project/mission context.
- Updated the spoken daily brief so it now calls out overdue items, waiting-on load, and quick wins when they are present.

### Why

- The user wants a reminder system that helps keep projects from slipping, not a generic chatbot prompt.
- Praxis should surface one high-value nudge at a time, with better judgment about what actually needs attention.

### How

- `praxis-desktop/shared/proactiveSuggestion.ts` now ranks proactive suggestions across overdue completion checks, waiting-on nudges, quick-win nudges, and fallback completion checks.
- `praxis-desktop/electron/dailyBrief.ts` now folds overdue, waiting-on, and quick-win counts into the spoken report.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Desktop Work-Graph Lookup

### Built

- Added deterministic work-graph lookup so Praxis can answer questions like "what am I waiting on from Scott?" and "what's slipping right now?" without routing those through generic capture.
- Wired the same lookup behavior into both the desktop Talk to Praxis surface and Slack DMs.
- Person lookup replies now also show up in the assistant reply card, so contact lookups read more like a conversation instead of only a status line.

### Why

- The reminder engine can now identify stalled work, but the user also needs direct question-and-answer access to that same work graph.
- This keeps lookup behavior predictable and local-first instead of depending on fuzzy model interpretation for straightforward operational questions.

### How

- `praxis-desktop/shared/workLookup.ts` defines the shared request/result contract for deterministic work-graph lookup.
- `praxis-desktop/electron/workLookup.ts` now summarizes active waiting-on todos by person and identifies overdue or near-risk slipping work.
- `praxis-desktop/electron/assistantRouter.ts` recognizes waiting-on and slipping questions and routes them to the new lookup path.
- `praxis-desktop/electron/main.ts`, `preload.ts`, and `electron-env.d.ts` expose the new assistant lookup IPC surface.
- `praxis-desktop/src/hooks/useAssistantCapture.ts` now renders both person and work lookup answers in the Praxis reply card.
- `praxis-desktop/electron/slackAdapter.ts` mirrors the same work-lookup answers in Slack.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-23 - Generic People Contact Suggestions

### Built

- Expanded the People enrichment flow so Praxis can now suggest not just email addresses, but also inferred phone numbers and billing addresses when those appear in synced email summaries.
- Updated the Settings -> People review surface so one person can have multiple active suggestions at once, each with save, dismiss, and restore actions.
- Kept old dismissed email suggestions working by treating legacy email-only dismissal records as valid generic contact dismissals.

### Why

- Contacts become far more useful when Praxis can help fill in the operational details around them, not just their email address.
- The user specifically wants People records to grow into a richer local knowledge layer for lookup, billing, and project support.

### How

- `praxis-desktop/shared/personContactSuggestion.ts` now models generic contact suggestions by field (`email`, `phone`, `billingAddress`) instead of only inferred email.
- `praxis-desktop/electron/emailRepository.ts` now stores generic suggestion dismissals and preserves backward compatibility with older email-only dismissals.
- `praxis-desktop/src/SettingsApp.tsx` now saves accepted inferred values into the correct person field and filters dismissals by field plus value.
- `praxis-desktop/src/components/PeopleProfilePanel.tsx` now renders multi-field suggested contact details and dismissed-contact review cards.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - People Lookup Uses Inferred Contact Details

### Built

- Expanded deterministic person lookup so Praxis can answer phone and billing-address questions from strong inferred contact suggestions when those details are not saved yet.
- Improved relationship lookups so project and mission ties read more clearly in direct answers.
- Broadened lookup phrasing to handle questions like "which projects is Max tied to?" and similar relationship wording.

### Why

- The contact-suggestion system is only useful if the assistant can immediately use strong inferred evidence in everyday lookup questions.
- This gives the user practical value from synced mail before every suggested detail has been manually saved.

### How

- `praxis-desktop/electron/personLookup.ts` now builds active person-contact suggestions from synced email, respects dismissed suggestions, and falls back to inferred `email`, `phone`, and `billingAddress` values when appropriate.
- The same lookup now formats relationship answers as grouped project and mission summaries instead of a flat semicolon list.
- `praxis-desktop/electron/assistantRouter.ts` already recognized most person lookups, and `personLookup.ts` now supports broader "tied to" style relationship wording.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Broader Work-Graph Lookup

### Built

- Expanded deterministic work lookup so Praxis can now answer more operational questions directly from the work graph:
  - waiting-on
  - slipping / overdue
  - quick wins
  - money-related items
  - blocked or paused work
- Widened the assistant router so those question styles route into the work-lookup service instead of falling back to generic capture.
- Allowed work lookup items to include missions and projects where needed, not just todos and deadlines.

### Why

- The user needs Praxis to function more like an operator console and less like a passive recorder.
- These are the next practical question types after waiting-on and slipping, and they build directly on the data model already in place.

### How

- `praxis-desktop/shared/workLookup.ts` now supports additional lookup kinds and generic work-entity items.
- `praxis-desktop/electron/workLookup.ts` now produces ranked answers for quick wins, money-related work, and blocked/paused items alongside the existing waiting-on and slipping lookups.
- `praxis-desktop/electron/assistantRouter.ts` now recognizes phrasing like "what can I knock out quickly?", "what's money-related right now?", and "what's blocked?".

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Work Lookup Surface Polish

### Built

- Added explicit Talk to Praxis examples in the desktop right-hand panel so the broader lookup surface is discoverable without reading docs or guessing phrasing.
- Expanded the Slack DM fallback help text so it advertises quick wins and money-related lookup questions alongside waiting-on and focus examples.
- Updated project-facing docs so the current lookup surface is captured in the living project brain.

### Why

- The lookup behavior had outgrown its discoverability. Praxis could answer more than the UI or Slack help text suggested.
- This is a low-risk polish pass that improves operator usability without touching assistant routing or core resolver logic.

### How

- `praxis-desktop/src/components/MemoryWriterPanel.tsx` now shows a compact "Try asking Praxis" guide with concrete example prompts.
- `praxis-desktop/src/App.css` now styles that guide to read as lightweight help instead of another heavy card.
- `praxis-desktop/electron/slackAdapter.ts` now includes quick-win and money-related examples in its unsupported-message fallback.
- `docs/readme.md` now lists the practical work and people lookup questions Praxis currently supports.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Actionable Lookup Follow-Through

### Built

- Lookup answers now store actionable context, so follow-up commands like `mark the first one done`, `pause that`, or `move the first one to tomorrow` can resolve against the latest lookup result.
- Wired the same behavior into both the desktop Talk to Praxis surface and Slack DM follow-ups.
- Added a shared lookup-action builder so work-lookup answers produce consistent follow-through actions across surfaces.

### Why

- Direct lookup only gets Praxis halfway to being an operator console. The user also needs immediate follow-through without restating the full item title.
- This closes the loop between “show me what matters” and “act on it” using deterministic event-safe actions instead of fuzzy model behavior.

### How

- `praxis-desktop/shared/workLookupContext.ts` now derives follow-through actions from lookup results and the current work snapshot.
- `praxis-desktop/shared/assistantContext.ts` and `praxis-desktop/electron/assistantContextRepository.ts` now support pause actions and due-date resolution from contextual follow-up text.
- `praxis-desktop/electron/assistantRouter.ts` now routes contextual phrases like `pause that` and `move the first one to tomorrow` into assistant-context resolution.
- `praxis-desktop/src/hooks/useAssistantCapture.ts` and `praxis-desktop/electron/slackAdapter.ts` now store lookup contexts and execute pause / due-date / clear-waiting follow-through against them.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Richer Lookup Follow-Through

### Built

- Expanded contextual follow-through after lookup answers to support:
  - `reactivate that`
  - `clear that waiting-on flag`
  - `open the related project focus report`
- Fixed Slack so it now resolves replies against stored `work_lookup` context instead of skipping that surface.
- Added shared action generation for reactivation and focus-report jumps from lookup results.

### Why

- The first actionable lookup pass covered completion, pausing, and rescheduling, but still left obvious next actions outside the reply chain.
- This makes lookup answers feel more like a real operating surface instead of a one-shot report.

### How

- `praxis-desktop/shared/assistantContext.ts` now includes `reactivate` and `open_focus_report` context commands.
- `praxis-desktop/shared/workLookupContext.ts` now emits reactivation actions for non-active work and focus-report actions for projects, missions, and work items with related project/mission context.
- `praxis-desktop/electron/assistantContextRepository.ts` now parses and resolves reactivation and focus-report follow-up phrases.
- `praxis-desktop/electron/assistantRouter.ts` now routes contextual reactivate, waiting-flag clear, and focus-report phrases into context resolution.
- `praxis-desktop/src/hooks/useAssistantCapture.ts` and `praxis-desktop/electron/slackAdapter.ts` now execute those resolved actions, including opening focus reports from contextual replies.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Richer Daily Brief And Focus Follow-Through

### Built

- Upgraded daily brief and focus report context storage so they now support the same richer reply-chain actions as lookup answers.
- Daily brief and focus report follow-ups can now pause, reactivate, move due dates, clear waiting-on flags, and jump into related focus reports where the underlying work item supports it.
- Slack report contexts now use the same richer action generation instead of storing `complete` as the only follow-up option.

### Why

- Lookup replies had become a real control surface, but daily brief and focus reports were still acting like older one-shot summaries.
- This closes that mismatch and makes Praxis behave more like one continuous assistant across report modes.

### How

- `praxis-desktop/shared/workLookupContext.ts` now exposes a generic `buildWorkItemActions(...)` helper for any ordered work-item list.
- `praxis-desktop/src/hooks/useAssistantCapture.ts` now stores richer report contexts for the desktop daily brief and focus report surfaces.
- `praxis-desktop/electron/slackAdapter.ts` now stores richer report contexts for Slack daily brief and focus report replies.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Directive Daily Brief Top Move

### Built

- Added a structured `recommendedMove` field to the daily brief contract.
- The daily brief generator now chooses a directive top move with rationale and a safe action hint.
- The desktop Today Timeline now shows a compact Top Move block above the priority list.
- Slack daily reports now include the same top move, reason, and suggested follow-up phrasing.
- `not now` now safely dismisses active daily brief and focus report context.

### Why

- Praxis needs to tell the operator what matters most instead of only listing ranked items.
- Keeping the top move structured gives future voice, Slack, desktop, and companion-client surfaces one shared decision source.

### How

- `praxis-desktop/shared/dailyBrief.ts` defines `DailyBriefRecommendedMove`.
- `praxis-desktop/electron/dailyBrief.ts` derives the recommendation from the ranked priority list and writes it into daily markdown memory.
- `praxis-desktop/src/components/TodayTimelinePanel.tsx` renders the recommendation in the daily brief card.
- `praxis-desktop/electron/slackAdapter.ts` includes the recommendation in Slack daily-report output.
- `praxis-desktop/electron/assistantContextRepository.ts` handles `not now` for daily and focus report contexts.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Assistant Regression Tests And Local Skill Architecture

### Built

- Added a lightweight assistant regression test harness with `npm run test:assistant`.
- Extracted pure assistant context reply resolution into `praxis-desktop/shared/assistantContextResolver.ts`.
- Kept SQLite-backed context storage in `praxis-desktop/electron/assistantContextRepository.ts`, but moved the risky text-to-action matching into testable shared code.
- Added regression coverage for contextual pause, reactivate, due-date move, waiting-on clear, focus-report opening, decline handling, ambiguity handling, and work-item action generation.
- Added a conservative Praxis skill architecture note based on OpenClaw's local `SKILL.md` pattern.
- Added starter built-in skill files for daily brief, work graph, contact lookup, and inbox triage.

### Why

- Assistant context resolution is now central to desktop and Slack behavior; a small phrase regression could break multiple surfaces.
- OpenClaw's useful lesson is scoped markdown skills with load filtering and allowlists, but Praxis should avoid third-party executable skill loading because it handles private calendar, email, contact, and billing context.

### How

- `praxis-desktop/tests/assistant-regression.test.ts` exercises shared assistant behavior with a fixed in-memory work snapshot.
- `praxis-desktop/scripts/run-assistant-regression.mjs` bundles and runs the TypeScript test with `esbuild` so no full test framework is required yet.
- `praxis-desktop/package.json` now exposes `test` and `test:assistant`.
- `docs/SKILL_ARCHITECTURE.md` records the adapted skill model and V1 security rules.
- `praxis-desktop/skills/*/SKILL.md` stores starter local operating procedures for future prompt retrieval.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## 2026-04-24 - Email Suggestion Integrity And Chat Skill Planning

### Built

- Added duplicate suppression for email follow-up suggestions beyond raw message identity.
- Email follow-up extraction now computes a stable duplicate key from source, thread, sender, title, and suggested entity kind.
- Stale email suggestions older than 45 days are skipped unless they still point at a current/future due date.
- Added `email-noise-filter` and `chat-triage` starter skills.
- Added WhatsApp integration notes for an invited-source model rather than background personal-chat polling.

### Why

- Inbox threads often contain repeated replies that can otherwise generate duplicate todos or project suggestions.
- WhatsApp should be designed as explicit operator invitation/import first, because the official programmable path is business/API oriented and personal chat polling is not a reliable local-first assumption.
- Spam-killer behavior fits Praxis best as a reviewable skill with safe actions before destructive email operations.

### How

- `praxis-desktop/electron/emailRepository.ts` now stores an optional duplicate key in follow-up suggestion payloads, suppresses duplicates across recent inbox facts, and filters stale suggestions.
- `praxis-desktop/skills/email-noise-filter/SKILL.md` defines safe noisy-email review behavior.
- `praxis-desktop/skills/chat-triage/SKILL.md` defines review-first chat import behavior.
- `docs/WHATSAPP_INTEGRATION_NOTES.md` records the WhatsApp integration options and constraints.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Memory Repair Tooling And UI Direction Mockups

### Built

- Added memory repair tooling that rewrites generated markdown mirrors from SQLite and repairs the markdown document index.
- `praxis-desktop/electron/praxisDb.ts` now removes stale `memory_documents` rows during index repair instead of only adding new rows.
- `praxis-desktop/electron/memoryRepair.ts` rebuilds mission, project, person, todo, deadline, and appointment markdown mirrors from current SQLite state.
- `npm run memory:repair` now runs a production build and then launches Electron in repair mode without opening the app window.
- Added three static UI direction mockups under `docs/ui-concepts/`.
- Added `docs/UI_DIRECTION_OPTIONS.md` to compare the UI directions without changing production UI.

### Why

- The markdown brain and SQLite database need a repair path before V1, especially as more integrations write derived records.
- UI redesign should happen deliberately after backend stabilization, so mockups give the operator a direction choice without changing app behavior yet.

### How

- `praxis-desktop/electron/main.ts` supports `--memory-repair` as a headless maintenance mode.
- `praxis-desktop/shared/storage/hybridStorage.ts` now includes typed memory repair reports.
- Static SVG concept images explore Command Core, Operator Grid, and Ambient Companion directions.

### Verification

- `npm run memory:repair` passes and indexed 25 markdown memory documents with 0 stale index rows.
- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.

## 2026-04-24 - Storage Integrity Check

### Built

- Added a headless storage integrity checker for the local SQLite and markdown index boundary.
- Added `npm run storage:check`, which builds the app and runs Electron in `--storage-check` mode without opening the desktop window.
- The checker now reports SQLite foreign-key violations, invalid JSON payloads, broken polymorphic work links, missing linked deadline mirrors, missing email follow-up source/routing targets, and stale markdown index paths.

### Why

- Gmail, Outlook, calendar, people, and work graph features now create many cross-table links, including some polymorphic links SQLite cannot enforce directly.
- A fast local integrity command gives future sync hardening a low-friction verification step before live account testing.
- This supports the hybrid storage model by checking both the SQLite operational layer and the markdown document index.

### How

- `praxis-desktop/electron/storageIntegrity.ts` owns read-only integrity checks and returns a structured report.
- `praxis-desktop/electron/main.ts` now supports `--storage-check` beside the existing `--memory-repair` maintenance mode.
- `praxis-desktop/shared/storage/hybridStorage.ts` now includes typed storage integrity report shapes.
- `praxis-desktop/package.json` exposes the command as `npm run storage:check`.

### Verification

- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npx tsc --noEmit` passes.

## 2026-04-24 - Read-Only Skill Registry

### Built

- Added a read-only skill registry for local Praxis `SKILL.md` operating procedures.
- Added `npm run skills:list`, which builds the app and runs Electron in `--skills-list` mode without opening the desktop window.
- Exposed `window.praxis.skills.getRegistry()` so the renderer can inspect indexed skills later without direct filesystem access.
- The registry currently indexes the six starter skills: daily brief, work graph, contact lookup, inbox triage, email noise filter, and chat triage.

### Why

- The skill architecture needed a concrete registry before skills can safely influence assistant routing or future local AI prompts.
- Keeping the registry read-only preserves the V1 safety rule that skills are local operating procedures, not executable plugins.
- A headless listing command gives future development and testing a low-friction way to verify skill metadata.

### How

- `praxis-desktop/electron/skillRegistry.ts` scans `praxis-desktop/skills/*/SKILL.md` and parses simple front matter.
- `praxis-desktop/shared/skillRegistry.ts` defines renderer-safe registry snapshot and skill record types.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, and `electron/electron-env.d.ts` expose the registry through IPC.
- `docs/SKILL_ARCHITECTURE.md` now marks the registry step as implemented.

### Verification

- `npm run skills:list` passes and indexes 6 skills with 0 warnings.
- `npx tsc --noEmit` passes.

## 2026-04-24 - Sync Recovery Hardening

### Built

- Added shared sync recovery helpers for provider/network retries and recoverable error classification.
- Gmail, Outlook inbox, Google Calendar, and Outlook Calendar sync now retry temporary HTTP/network failures before failing the sync.
- Recoverable provider/network failures now keep the connection authentication state as `ready` and move only the sync state to `error`, so future auto-sync can recover without requiring reconnect.
- Auto-sync now applies a short backoff after recoverable sync errors so repeated provider outages do not immediately retry in a tight loop.
- Added `npm run test:sync` regression coverage for transient retry behavior and non-recoverable auth responses.

### Why

- Sync failures are not all credential failures. Temporary 429/5xx/network problems should not make Praxis forget that an account is authorized.
- Gmail, Outlook, calendar, and email sync are now important enough that the recovery rules need to be centralized and tested.
- This reduces the amount of live account testing needed to distinguish provider outage, missing permission, and reconnect-required states.

### How

- `praxis-desktop/electron/syncRecovery.ts` owns transient HTTP status detection, JSON fetch retry, and recoverable sync messaging.
- `praxis-desktop/electron/gmailEmailSync.ts`, `outlookEmailSync.ts`, `googleCalendarSync.ts`, and `outlookCalendarSync.ts` use the shared retry helper.
- `praxis-desktop/electron/emailAutoSync.ts` and `calendarAutoSync.ts` now skip very recent recoverable failures unless a sync is forced.
- `praxis-desktop/tests/sync-recovery.test.ts` covers the retry classification behavior through `scripts/run-sync-recovery-regression.mjs`.

### Verification

- `npm run test:sync` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## 2026-04-24 - Sync Regression Coverage

### Built

- Expanded `npm run test:sync` beyond retry mechanics to cover sync import rules.
- Added regression coverage for email subject normalization, email follow-up duplicate keys, stale email suggestion filtering, recoverable sync status classification, Google Calendar event normalization, and Outlook Calendar event normalization.
- Extracted email suggestion rules into `shared/emailSuggestionRules.ts` so production import code and tests use the same duplicate/staleness logic.
- Extracted provider calendar normalization into `shared/calendarProviderNormalization.ts` so Google/Outlook sync adapters and tests share the same event conversion rules.

### Why

- Email follow-up extraction and calendar normalization are sync-adjacent behavior that can regress without live account testing.
- Duplicate suppression and stale filtering directly affect whether Praxis creates useful suggestions or noisy repeated work.
- Provider event normalization needs coverage for cancelled events, all-day Google events, Outlook UTC handling, and notes/source-link preservation.

### How

- `praxis-desktop/tests/sync-regression.test.ts` covers pure sync import and normalization rules.
- `praxis-desktop/scripts/run-sync-recovery-regression.mjs` now bundles and runs both sync recovery and sync import regression tests.
- `praxis-desktop/electron/emailRepository.ts`, `googleCalendarSync.ts`, and `outlookCalendarSync.ts` now call the shared rule modules.

### Verification

- `npm run test:sync` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## 2026-04-24 - Skill-Aware Assistant Routing

### Built

- Added lightweight skill references to assistant route results.
- Added a shared intent-to-skill mapping for daily brief, work graph, contact lookup, inbox triage, and related context actions.
- Assistant routing now attaches relevant local skill metadata without loading full skill content into every response.
- Added assistant regression coverage for the route-to-skill mapping and for keeping full skill content out of route references.

### Why

- Praxis needs skills to influence future prompt construction and assistant behavior observably, but V1 skills must remain read-only operating procedures.
- Attaching metadata at the route layer creates a clean next step toward skill-grounded local AI calls without changing deterministic command execution.
- The route layer is the right place to say which operating procedure applies before any renderer, Slack, voice, or companion client decides how to present or use it.

### How

- `praxis-desktop/shared/assistantRouter.ts` now includes optional `skillReferences` on route results.
- `praxis-desktop/shared/assistantSkillRouting.ts` maps route intents to skill IDs and converts registry entries into lightweight references.
- `praxis-desktop/electron/assistantRouter.ts` enriches route results from the read-only skill registry.
- `praxis-desktop/tests/assistant-regression.test.ts` covers the skill mapping behavior.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes.
- `npm run skills:list` passes.

## 2026-04-24 - Skill Surface Allowlists

### Built

- Added V1 skill allowlists for desktop, Slack, voice, and future companion surfaces.
- Assistant route requests now accept an optional `surface`, defaulting to desktop.
- Desktop and Slack route call sites now pass explicit surfaces.
- Skill references are now filtered by both the route intent and the requested surface.
- Companion routes intentionally return no current starter skill references until those skills explicitly declare `companion` support in front matter.

### Why

- Praxis should not let every skill influence every surface.
- Slack, voice, and future companion clients have different privacy and action risks from the desktop app.
- The allowlist layer creates a safety gate before any prompt-loading or local AI layer starts using skill content.

### How

- `praxis-desktop/shared/assistantSkillRouting.ts` now exports `SKILL_ALLOWLIST_BY_SURFACE`.
- `skillReferencesForAssistantIntent(...)` filters by route intent, surface allowlist, and each skill's declared `surfaces`.
- `praxis-desktop/electron/assistantRouter.ts` passes the route request surface into the skill reference enrichment step.
- `praxis-desktop/electron/slackAdapter.ts` routes Slack DMs with `surface: "slack"`.
- `praxis-desktop/src/hooks/useAssistantCapture.ts` routes desktop assistant input with `surface: "desktop"`.

### Verification

- `npm run test:assistant` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## 2026-04-25 - Broader Storage Integrity Checks

### Built

- Expanded `npm run storage:check` beyond relationship checks into operational field validation.
- The checker now validates required and optional timestamp fields, work statuses and priorities, integration providers, auth/sync states, SQLite boolean flags, appointment start/end ordering, duplicate provider external identities, person alias normalization, and basic email-address shape.
- Added JSON shape expectations for suggestion action arrays while preserving appointment/calendar notes as plain text.

### Why

- Calendar, email, person, and work records now feed assistant behavior directly, so malformed operational fields can produce bad briefs or bad follow-up actions even when foreign keys are intact.
- Provider sync can import duplicate external identities or malformed timestamps if an adapter regresses; the maintenance command should catch that before live testing.
- Person lookup depends on normalized aliases and contact fields, so the checker now catches stale alias rows and suspicious contact data.

### How

- `praxis-desktop/electron/storageIntegrity.ts` now includes read-only validators for date columns, allowed-value columns, boolean columns, duplicate external identities, appointment ranges, alias normalization, contact email shape, and JSON array expectations.
- `docs/STORAGE_ARCHITECTURE.md` documents the expanded integrity surface.

### Verification

- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.

## 2026-04-25 - Companion Snapshot Boundary

### Built

- Added the first read-only companion-client boundary for future Surface/mobile/voice clients.
- Added a schema-versioned `companion.snapshot.v1` contract with work counts, top move, today/tomorrow appointments, ranked work items, focus targets, highlighted people, pending email follow-up summaries, and integration sync status.
- Added `window.praxis.companion.getSnapshot()` and a headless `npm run companion:snapshot` command.

### Why

- Future companion clients should consume a narrow Home Node API surface instead of reading SQLite, markdown memory, or renderer state directly.
- The first boundary needs to be useful for travel/status surfaces without exposing raw email messages, provider external IDs, OAuth settings, encrypted secrets, or direct database paths.
- Keeping the V1 snapshot read-only leaves write actions for later explicit command contracts.

### How

- `praxis-desktop/shared/companionSnapshot.ts` defines the renderer/client-safe contract.
- `praxis-desktop/electron/companionSnapshot.ts` aggregates sanitized data from existing work, email suggestion, and settings services.
- `praxis-desktop/electron/main.ts`, `electron/preload.ts`, `electron/electron-env.d.ts`, and `package.json` expose the IPC and headless command.
- `docs/ARCHITECTURE.md` and `docs/DECISIONS.md` document the boundary and privacy rules.

### Verification

- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes.

## 2026-04-25 - Email And Contact Regression Coverage

### Built

- Extracted email follow-up suggestion extraction into a shared pure module.
- Added regression coverage for direct-request email suggestions, project-sized email suggestions, due-date parsing, subject cleanup, newsletter/no-reply suppression, and `FYI` suppression.
- Added regression coverage for inferred person contact suggestions, including saved-field suppression, ambiguous email/phone suppression, unmatched-message filtering, ordering, and confidence scoring.
- Left `generateDailyBrief()` as the production wrapper and added a pure `buildDailyBriefFromSnapshot(...)` entry point for later daily-brief regression tests without markdown writes.

### Why

- Email follow-up extraction and inferred contact suggestions directly affect what Praxis turns into reviewable work and what contact details it offers during lookup.
- These rules should be testable without live Gmail/Outlook accounts, Electron windows, or SQLite setup.
- Daily brief testing needs one more extraction step because the existing module still imports Electron-backed repositories at module load time.

### How

- `praxis-desktop/shared/emailSuggestionExtraction.ts` owns pure email follow-up extraction and due-date parsing.
- `praxis-desktop/electron/emailRepository.ts` now calls the shared extraction module instead of keeping a private copy.
- `praxis-desktop/tests/email-suggestion-extraction.test.ts` and `tests/person-contact-suggestion.test.ts` add focused regression coverage.
- `praxis-desktop/scripts/run-sync-recovery-regression.mjs` now runs the new extraction/contact tests as part of `npm run test:sync`.
- `praxis-desktop/electron/dailyBrief.ts` now exports `buildDailyBriefFromSnapshot(...)` as a first step toward pure daily-brief testing.

### Verification

- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes.

## 2026-04-25 - Daily Brief Regression Coverage

### Built

- Moved pure daily-brief construction into `praxis-desktop/shared/dailyBriefBuilder.ts`.
- `praxis-desktop/electron/dailyBrief.ts` now keeps the Electron-bound responsibilities: reading repositories, writing markdown, and building focus reports from live state.
- Added daily brief regression coverage for no-work brief behavior, appointment prioritization, today/tomorrow appointment filtering, completed-work filtering, waiting-on recommendations, quick money items, deadline recommendations, list limits, follow-up topics, `thereIsMore`, and spoken-brief count lines.
- Fixed singular spoken-brief grammar for overdue and waiting-on counts.

### Why

- Daily brief and Top Move behavior are central to the operator experience and need stable regression tests before voice, companion, or richer assistant behavior builds on them.
- Keeping the builder in `shared/` lets future desktop, Slack, voice, and companion surfaces share the same ranking and recommendation logic without importing Electron or SQLite.

### How

- `praxis-desktop/shared/dailyBriefBuilder.ts` owns pure ranking, item conversion, recommended move selection, and spoken brief construction.
- `praxis-desktop/tests/daily-brief-builder.test.ts` exercises the pure builder with fixed snapshots and dates.
- `praxis-desktop/scripts/run-assistant-regression.mjs` now runs the daily-brief builder test beside existing assistant regression tests.

### Verification

- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes.

## 2026-04-25 - Person Lookup Regression Coverage

### Built

- Moved person lookup matching and answer construction into `praxis-desktop/shared/personLookupEngine.ts`.
- Kept `praxis-desktop/electron/personLookup.ts` as a thin Electron wrapper that reads work and email snapshots before calling the shared engine.
- Added regression coverage for alias matching, saved email precedence, inferred email fallback, inferred phone and billing address lookup, dismissed suggestion filtering, relationship deduping, profile answers, ambiguous matches, and no-match behavior.
- Added the person lookup engine tests to `npm run test:assistant`.

### Why

- Contact lookup is now used across desktop, Slack, skills, and future voice/companion surfaces, so the core behavior needs to be testable without Electron, SQLite, or live synced accounts.
- The lookup path combines saved people records with inferred email/contact evidence; regressions here can expose stale suggestions or return the wrong person's details.
- A pure shared engine keeps future surfaces aligned while leaving persistence and repository reads in the Electron layer.

### How

- `praxis-desktop/shared/personLookupEngine.ts` owns deterministic requested-field detection, person scoring, inferred contact filtering, and answer formatting.
- `praxis-desktop/tests/person-lookup-engine.test.ts` exercises the shared engine with fixed work and email snapshots.
- `praxis-desktop/scripts/run-assistant-regression.mjs` now runs the person lookup engine test beside assistant routing and daily brief coverage.

### Verification

- `npm run test:assistant` passes.
- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes.

## 2026-04-25 - Assistant Capture Handler Split

### Built

- Split the oversized desktop assistant capture hook into smaller focused modules without changing the public hook API.
- Moved report/context persistence and work mutations into `praxis-desktop/src/hooks/assistantOperationalActions.ts`.
- Moved assistant route intent handling into `praxis-desktop/src/hooks/assistantRouteHandlers.ts`.
- Moved capture draft conversion into `praxis-desktop/src/hooks/assistantCaptureDraft.ts`.
- Kept `praxis-desktop/src/hooks/useAssistantCapture.ts` as the React state and orchestration shell used by the dashboard.

### Why

- The capture hook had become responsible for routing, focus reports, daily reports, appointment reports, lookups, work mutations, capture drafts, and status text.
- Voice, companion clients, and richer assistant behavior will be safer to add if route handling and operational mutations have clearer ownership.
- Keeping this as a refactor preserves current UI behavior while reducing the risk of future assistant changes.

### How

- `assistantRouteHandlers.ts` now handles deterministic assistant route results such as daily reports, appointment reports, person lookup, work lookup, context actions, and work updates.
- `assistantOperationalActions.ts` owns shared view refresh, status updates, due-date updates, waiting-on clears, daily report context storage, and proactive suggestion context storage.
- `useAssistantCapture.ts` now fetches the route, delegates handled intents, and falls back to natural-language capture preview for unhandled capture input.

### Verification

- `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npx vite build` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
- `npm run skills:list` passes.
- `npm run companion:snapshot` passes.

## 2026-04-25 - Companion Explicit Command Gateway

### Built

- Added a typed companion command contract in `praxis-desktop/shared/companionCommand.ts`.
- Added a Home Node command gateway in `praxis-desktop/electron/companionCommand.ts`.
- Exposed `window.praxis.companion.executeCommand(...)` beside the existing snapshot IPC.
- Added `npm run companion:command` as a headless smoke test for the command gateway.
- Updated `companion.snapshot.v1` capability metadata to advertise explicit commands while still denying direct storage access.
- Documented the agreed architecture decision that companion clients can submit explicit commands only, not direct SQLite, markdown, or secret writes.
- Clarified wake-word readiness as local hotword detection plus a short visible command-listening window, not ambient audio archiving.

### Why

- The operator confirmed that future Surface/mobile companion clients should be explicit-command-only.
- The architecture needs a concrete command boundary before travel companion work can start, even before remote transport is designed.
- Voice/wake-word planning needs a privacy-safe shape before any always-available audio feature is implemented.

### How

- Companion read commands route through existing assistant, daily brief, appointment report, focus report, person lookup, and work lookup services.
- Write-like companion commands require `confirmed: true` and then execute through Home Node work/capture services.
- Context-only replies are rejected on the companion surface unless the command names the target explicitly.
- Companion capture previews natural-language todo/appointment creation first, then saves only after explicit confirmation.
- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/MISSION_PLAN.md`, and `docs/TECH_DEBT.md` now reflect the command and wake-word decisions.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.

## 2026-04-26 - Guided Email Setup UI

### Built

- Reworked the Settings email integration panel into a provider-first setup checklist.
- Kept Gmail and Outlook setup inside the Email tab so users can add a source, save app credentials, authorize, and sync from one place.
- Added direct links from the setup copy to Google Cloud Credentials and Microsoft Entra app registrations.
- Expanded the provider setup copy into beginner-friendly click-by-click checklists for Google and Microsoft OAuth setup.
- Moved manual email summary import into an advanced collapsible section.
- Preserved saved source management, follow-up candidates, and recent summary views.
- Reworked Settings navigation again into unified `Google` and `Outlook` service panels that each contain mail and calendar setup together.
- Added a targeted Gmail API setup link when Gmail sync fails because the API is disabled for the current Google project.

### Why

- The previous email setup screen exposed every control at once and required users to infer the correct order.
- Live email validation is still the active task, but the setup flow needed to become usable before asking a real user to complete OAuth.
- Users think in connected services, not separate email and calendar implementation lanes.

### How

- `praxis-desktop/src/components/EmailSettingsPanel.tsx` now renders a four-step flow for source creation, app setup, browser authorization, and first sync.
- `praxis-desktop/src/components/ConnectedServiceSettingsPanel.tsx` owns the unified Google/Outlook service setup experience.
- `praxis-desktop/src/SettingsApp.tsx` passes Google OAuth form handlers into the Email tab so Gmail setup no longer requires switching to Calendar settings.
- `praxis-desktop/src/App.css` adds settings-specific checklist, field, and disabled-button styles while retaining the existing PRAXIS color system.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.
- `npm test` passes.

## 2026-04-27 - Mission Capture From Talk Panel

### Built

- Added natural-language mission capture so commands like `create a mission for BDNC operations` produce a reviewable mission draft instead of falling through to an unresolved capture.
- Added mission draft editing in the Talk panel before save, including title, summary, and optional due date.
- Extended the shared capture contract and companion draft helper so mission capture can use the same explicit-confirmation path as todos and appointments.
- Added a mission example to the Talk panel prompt list.

### Why

- Pressing `Send` on a mission-style command appeared to do nothing because natural-language capture only understood dated todos and appointments.
- Mission creation needs to be part of the assistant command path, not only the manual record drawer.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm run build:app` passes.

## 2026-04-27 - Chat Imports Feed Review Inbox

### Built

- Added shared chat suggestion types and a deterministic first-pass chat follow-up extractor.
- Updated `chat:importConversation` so stored chat message snippets can create pending `chat_follow_up` inbox facts.
- Added chat suggestion accept, archive, and dismiss handlers through Electron IPC and the preload bridge.
- Extended the dashboard Review Inbox to show chat candidates beside email candidates and create todos or projects only after explicit operator action.
- Added storage integrity validation for chat follow-up source messages and routed todo/project targets.
- Added regression coverage for chat Review Inbox mapping and mixed email/chat ranking.

### Why

- `review conversation` routing and `chat_imports` storage existed, but imported chat snippets stopped at storage and did not become actionable review candidates.
- The v1-safe path is review-first: Praxis can suggest work from chat snippets, but it should not auto-create work from conversations.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.

## 2026-04-27 - Dashboard And Settings V1 Polish

### Built

- Added dashboard readiness modeling so Google, Outlook, Slack, Memory, and Companion setup/sync/local-readiness states are visible from Today.
- Added a Dashboard Readiness card with plain-language service problems and next-step guidance.
- Added actionable empty states for priority, project, checklist, Review Inbox, and key Today dashboard lanes.
- Tightened responsive dashboard CSS so mobile nav, service headers, readiness badges, review headers, hero actions, and empty-state buttons wrap without clipping.
- Moved connected-service state helpers into the shared settings model.
- Updated Settings service panels to show user-facing labels instead of raw sync/auth enum values.
- Added stale-sync detection, duplicate active-sync prevention, reconnect labels for existing sources, setup guidance for blocked credential states, and delete-source credential warnings.
- Added regression coverage for connected service label, stale-sync, sync-error, and auth-error behavior.

### Why

- The dashboard needed to explain what PRAXIS knows, what is connected, and what needs attention without requiring Settings or logs.
- Settings needed to make connected-source lifecycle states understandable and prevent risky duplicate sync/delete behavior.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.

## 2026-04-27 - Assistant Command Context Hardening

### Built

- Added shared assistant context surface ordering so write confirmations are resolved before read/report fallback context.
- Fixed desktop and Slack `no` handling so a declined staged write does not fall through into unrelated context handling.
- Kept Slack call-like ambiguity prompts isolated so `yes` does not accidentally become an unrelated context reply.
- Tightened companion ambiguous capture handling so call-like todo/appointment commands require explicit forced intent before saving.
- Added regression coverage for confirmation behavior, Slack thread scoping, context surface isolation, missing staged writes, replaced/expired staged writes, and call-like ambiguity.

### Why

- Desktop, Slack, and companion command paths need the same safe behavior for staged writes and ambiguous captures.
- `yes` and `no` should only act on the intended pending context and should not create, suppress, or mutate unrelated work.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.

## 2026-04-27 - Private Windows Release Validation

### Built

- Documented first-channel release policy: direct private Windows x64 delivery, unsigned validation builds only for private testing, and signing required before public or broad distribution.
- Validated `npm run package:win` as the unsigned private Windows x64 packaging command.
- Confirmed generated installer and unpacked executable report `NotSigned`.
- Added a private Windows x64 smoke-check procedure to `docs/RELEASE_CHECKLIST.md`.
- Executed the smoke check and recorded results in `docs/RELEASE_VALIDATION.md`.

### Why

- PRAXIS needs a repeatable private-build validation path without prematurely blocking development on signing.
- Release approval needs concrete evidence that artifacts are unsigned as expected, launchable, uninstallable, and free of bundled secrets or local operator data.

### Current Blocker

- The current artifact is not yet approved for private validation sharing because dashboard load, Settings load, visible installer wizard behavior, and SmartScreen behavior still need visual confirmation.
- Silent uninstall left an empty `%LOCALAPPDATA%\Programs\PraxisDesk` directory; this needs an accept-as-debt or fix decision.

### Verification

- `npm run build:app` passes.
- `npm run package:win` passes.
- `Get-AuthenticodeSignature` reports `NotSigned` for the installer and unpacked executable.
- Silent installer install exits with code 0.
- Installed app process launch was observed.
- Silent uninstall exits with code 0 and removes the registry entry.
- Secret/local-data filename audit passed.

## 2026-04-27 - Integrated V1 Checkpoint

### Built

- Reconciled completed dashboard, Settings, assistant command, and release-validation worker reports into the execution queue and engineering ledger.
- Updated `CURRENT_TASK.md` so completed dashboard/release decision work is removed from active execution and the remaining release smoke blocker is explicit.

### Why

- The workstream had several parallel workers touching separate ownership lanes; the queue and ledger needed to match the current V1 state before the next round of work.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.

## 2026-04-28 - Windows ARM64 Package Launch Validation

### Built

- Fixed packaged Windows native module loading by enabling Electron Builder native dependency rebuilds.
- Added `asarUnpack` for the `better-sqlite3` native `.node` file so the packaged app can load SQLite correctly outside `app.asar`.
- Rebuilt and validated both Windows x64 and Windows ARM64 packages.
- Confirmed the x64 package now carries an x64 `better_sqlite3.node`.
- Confirmed the ARM64 package carries an ARM64 `better_sqlite3.node`.
- Validated the installed ARM64 app opens visibly, loads the dashboard, opens Settings, reconnects email/calendar sources, closes without orphaned `PraxisDesk.exe` processes, and preserves `%APPDATA%\praxis-desktop` after uninstall.
- Recorded the empty `%LOCALAPPDATA%\Programs\PraxisDesk` uninstall residue as low-priority release debt.
- Updated release validation to approve the ARM64 artifact for private validation sharing.

### Why

- The previous x64 package built on a Windows ARM64 machine copied the host ARM64 `better-sqlite3` binary into the x64 artifact while `npmRebuild` was disabled.
- Electron failed to load the native module in the installed app, leaving background processes and no visible window.
- Private validation needs a launchable architecture-correct package before anyone else tests PRAXIS.

### Verification

- `npm run build:app` passes.
- `npm run package:win` passes.
- `npm run package:win:arm64` passes.
- ARM64 installed app launches visibly.
- Dashboard loads.
- Settings opens and reconnects services.
- Closing the app leaves no `PraxisDesk.exe` processes.
- Windows uninstall removes the uninstall registration and preserves `%APPDATA%\praxis-desktop`.

## 2026-04-28 - Private ARM64 Tester Handoff

### Built

- Added a private ARM64 tester handoff section to `docs/RELEASE_VALIDATION.md`.
- Included the exact ARM64 installer path and SHA-256 hash.
- Documented that the build is unsigned, private-validation-only, and not a public or broadly shared release.
- Documented expected install, first launch, Settings reconnect, close, and uninstall behavior.
- Included the known empty `%LOCALAPPDATA%\Programs\PraxisDesk` uninstall folder residue as accepted private-validation debt.
- Added a data safety note telling testers not to delete `%APPDATA%\praxis-desktop` unless intentionally clearing local PRAXIS user data.

### Why

- The ARM64 package is approved for private validation, but testers need clear expectations so they do not confuse an unsigned validation artifact with a public release.
- The handoff also keeps the known uninstall residue and user-data preservation behavior explicit.

### Verification

- Documentation review passed.

## 2026-04-27 - Manual Chat Import Surface

### Built

- Added an `Import chat for review` surface to the Talk panel.
- The form accepts source, conversation title, optional comma-separated participants, and pasted snippet text.
- Submitting the form calls `window.praxis.chat.importConversation(...)`, refreshes the work model, and returns the operator to the Today panel where Review Inbox candidates appear.
- The import path supports WhatsApp, SMS, Slack, manual, and unknown sources without creating work automatically.

### Why

- Chat storage and Review Inbox extraction existed, but there was no visible user-facing way to feed WhatsApp/SMS/chat snippets into the pipeline.
- This keeps v1 conversation capture review-first while reducing friction compared with manually creating todos or projects from copied chat text.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.

## 2026-04-27 - Conversation Review Handoff

### Built

- Updated the `conversation_review` route message so it points to the live manual chat import surface instead of the earlier storage-not-connected placeholder.
- Desktop conversation-review commands now switch the operator to the Talk panel where `Import chat for review` lives.
- Companion conversation-review commands now return an answered read response instead of unsupported.
- Slack conversation-review DMs inherit the clearer handoff text and continue to avoid direct writes.

### Why

- Chat storage, extraction, Review Inbox actions, and manual import now exist, so the command surface needed to stop describing the feature as future work.
- Conversation review should remain review-first for v1: the user pastes the useful exchange, Praxis suggests candidate work, and the operator explicitly accepts or archives it.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.

## 2026-04-27 - Dashboard Daily Operating Rhythm

### Built

- Added a Daily Operating Rhythm lane to the Today dashboard.
- The lane summarizes arrival, triage, and closeout from existing brief data.
- Arrival shows the recommended move and first calendar pressure.
- Triage shows Review Inbox candidate count and quick-action pressure.
- Closeout shows overdue, waiting-on, or review-inbox pressure and remaining follow-up topics.

### Why

- The dashboard already had daily brief, timeline, priority stack, Review Inbox, and service health, but it did not yet express the operator rhythm clearly.
- This is the first v1 dashboard pass toward arrival/closeout behavior without adding new persistence before the data model is designed.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.

## 2026-04-27 - Dashboard Closeout Summary Persistence

### Built

- Added a structured closeout summary to the daily brief model.
- The daily brief builder now counts changed-today work, completed-today work, waiting-on items, overdue items, due-today items, and move-or-decide candidates.
- The Today dashboard closeout lane now reads from the persisted brief summary instead of recomputing a temporary local message.
- Daily markdown notes now include a `Closeout` section so end-of-day context survives across sessions.
- Added regression coverage for closeout counts and move-or-decide candidates.

### Why

- The dashboard rhythm lane needed durable closeout context, not just a temporary UI-only summary.
- PRAXIS should be able to explain what changed, what got done, and what should move forward tomorrow from the same daily brief source used by memory and assistant surfaces.

### Verification

- `npx tsc --noEmit` passes.
- `npm run lint` passes.
- `npm test` passes.
- `npm run build:app` passes.
- `npm run storage:check` passes with 0 errors and 0 warnings against the current local database.
