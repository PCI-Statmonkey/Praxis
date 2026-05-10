# CURRENT TASK

## OBJECTIVE

AI project template proposal persistence/filtering, Review Inbox surfacing, explicit markdown template save/editor, reject handling, saved-template project creation usability, first template management/reversal visibility, AI draft planning from Schedule Review, safe template revision/apply planning, template revision proposal surfacing, confirmed template markdown revision, selected-project apply preview, confirmed apply-template-to-existing-projects, provider calendar write-back planning, Mission Control follow-up polish, AI Task Review factual context packet/natural-language intents, provider calendar write-back foundation, optional API provider settings, visible Plan publish UI, write-scope guidance, create-only Google/Outlook publish adapters, publish-state visibility, failed-publish retry staging, provider live-QA runbook, provider reconciliation/update-delete planning, OpenAI-compatible AI Review generation, V1.1 persistent presence/Rainmeter planning, and checklist/context-memory redesign planning are complete. The next active product track is operator-present live provider write-back QA, then implementation can move to either persistent presence Phase 1 or checklist/context-memory selectors. Persistent presence, Rainmeter, and background wallpaper surfaces remain important V1.1 planning tracks, but they stay behind the AI review loop.

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
- Ptolemy's first-screen design QA is accepted: Mission Control should lead with command header, Top Move, Calendar Pressure, At Risk/Blockers, Priority Stack, Review/Reset, compact Daily Rhythm, Review Inbox, and a reachable Command Channel, with Talk and full service diagnostics lower or secondary on narrow screens.
- `docs/MISSION_CONTROL_COPY_GUIDE.md` now defines Mission Control labels, directive copy, service warning tone, AI Review wording, Review Inbox confirmation wording, and narrow-screen label guidance.
- The first implementation slice is complete: dashboard selector/data shaping helpers were extracted from `src/App.tsx` into `src/dashboardSelectors.ts` without intended UI or behavior changes.
- Selector extraction visual smoke passed: Today dashboard, Review Inbox, appointments/deadlines, service readiness, Talk/AI Review, and narrow layout still load with no visible regression.
- Today lane component split is complete: Daily Brief hero, Dashboard Readiness, Priority Stack, Daily Rhythm, and Review Inbox wrapper now live under `src/components/mission-control/` without CSS or behavior changes.
- Bibi's component naming review is accepted for future Mission Control surfaces: prefer product-level names like `CommandHeader`, `TopMoveCard`, `CalendarPressureStrip`, `ReviewInboxSummary`, `ServiceHealthSummary`, and `TalkRail` while keeping transitional names where they reduce risk.
- Mission Control layout CSS hooks are in place in `src/App.css` for future first-screen composition, including root, first-screen, status strip, lane grid, primary/secondary, lane header/body, and responsive collapse classes.
- Lane split visual smoke passed: Daily Brief/Top Move, Dashboard Readiness, Priority Stack, Daily Rhythm, Review Inbox, Talk/AI Review, and narrow layout still render without visible regression.
- Bibi's first-screen composition spec is accepted: desktop should order Command, Top Move, Calendar Pressure, At Risk, Priority Stack, Review/Reset, Daily Rhythm, Review Inbox, Service Health, and Talk; narrow should order Now, Move, Time, Risks, Stack, Review, Rhythm, Inbox, Talk, Health, Projects/Missions, full lists, memory, and checklist.
- First-screen Mission Control JSX composition is in place in `TodayTimelinePanel`: command status header, Top Move, Calendar Pressure, At Risk, Priority Stack, Review/Reset entry, Daily Rhythm, Review Inbox, and Service Health now use the Mission Control hooks and split lane components.
- Full focus controls, reports/details, appointment/deadline lists, and memory-backed documents remain below the first-screen composition.
- First-screen visual QA passed as an acceptable first Mission Control pass with no hard functional regression, no new overflow, Review Inbox actions reachable, Talk/AI Review still visible and read-only, and snapshot unchanged during AI Review.
- Targeted first-screen polish is applied at checkpoint `e1d96a7 Polish Mission Control first screen`: Top Move wrapping was reduced, At Risk now leads with work pressure, Today Service Health is compact, `Review / Reset` was renamed to `Brief Review` pending a safe AI Review launcher path, and the immediate copy fixes are applied.
- Final visual QA for the polished Mission Control first screen passed: the first screen is acceptable for this pass, Top Move scanability improved, At Risk reads as work pressure, Brief Review is honest, Review Inbox actions remain reachable, Talk/AI Review stays visible and read-only, narrow layout has no horizontal overflow, and the only remaining UI polish is non-blocking service-health duplication and later mobile ordering.
- Reopened Google/Outlook OAuth restart persistence is closed with true persistence after app restart.
- Root cause was Electron `safeStorage` decrypt context depending on app identity; app identity is now pinned to `praxis-desktop` before `safeStorage` use.
- Existing current Google/Outlook token rows remained usable after restart in live QA, with no reconnect required after restart.
- No `secure_secrets` rows were deleted or rewritten.
- Degraded Google/Outlook token state still shows friendly reconnect/refresh sign-in guidance instead of collapsing Settings to zero sources/calendars.
- Mission Control Service Health and At Risk/readiness report degraded services honestly without exposing raw `safeStorage.decryptString` or bare `invalid_request` copy.
- Outlook ready rows show `Refresh Sign-In` as secondary copy and keep sync as the primary available action.
- Top-bar Command/service-pill polish is complete.
- Top bar now has compact service pills with service name plus red/green dot.
- Clicking service pills opens or retargets Settings to relevant tabs: Google, Outlook, Slack, and Storage for Memory; Companion currently uses generic/fallback routing.
- Top nav now has `Command` all-in-one mode plus focused Projects, Today, Talk, Checklist, and Memory modes.
- UI font-size setting is persisted as `ui.fontScalePercent`, default `100`, range `94-114`, step `2`.
- Settings > Appearance now provides a font-size slider, live preview sample, and Reset to 100%.
- The main app updates live from the Settings font-size broadcast.
- UI/font polish slice is complete: button contrast/readability is fixed across top nav, Settings, Talk prompts, and common action buttons.
- Fake Memory top-nav mode was removed; memory-backed documents remain inside Today/Command.
- Review Inbox is collapsed by default with candidate count visible.
- Talk example/prompt card was removed.
- Structured AI Review work references are color-badged by type where structured data exists.
- Ana live QA passed after fresh build: font slider/live preview/reset, 114% layout, top nav, Review Inbox, Talk, Google/Outlook still connected/syncable, and no clipping or horizontal overflow.
- Unified calendar/time-blocking Slice 1 is complete as a read-only Plan surface.
- Shared `timeBlocking` selector contract and `TimeBlockRecord` type are in place for future local time blocks.
- Plan surface combines current appointments, deadlines, unscheduled work/todos, and a local-only time-block placeholder.
- Plan is wired into top nav.
- Command mode includes a compact Plan lane to avoid overcrowding.
- No persistence, time-block creation UI, sync behavior changes, external calendar write-back, or provider writes were added in the read-only Plan slice.
- Ana QA passed for Plan nav/wiring, no overflow at 100% or 114%, read-only surface behavior, no save/create/publish/sync/write-back controls, and Google/Outlook remaining ready/syncable without reconnect.
- Local-only time block persistence and click-to-schedule Plan UI are complete.
- `time_blocks` schema was added at DB version 11.
- Local time block repository/API is exposed through `window.praxis.timeBlocks`.
- Plan UI can create local blocks from unscheduled work, create manual blocks, edit, complete, cancel, delete, and show overlap warnings.
- Command compact Plan lane shows local block count/items without editing UI.
- Time blocks are `source=local`.
- No Google/Outlook write-back, publish controls, sync behavior changes, or provider writes were added in the local time-block slice.
- Ana live QA passed for create from unscheduled work, manual block, edit, complete, cancel, delete, overlap warning, restart persistence, cleanup of Ana QA blocks, Google/Outlook remaining ready/syncable, and no tokens/secrets/provider payloads visible.
- Deterministic Schedule Review engine is complete.
- `buildScheduleReview` identifies load state, risks, conflicts, open gaps, blocked/waiting items, and recommended local blocks with reason text.
- Schedule Review reduces manual prioritization by using existing signals: due/overdue, priority, quickAction, estimated minutes, waiting/blocking state, current appointments/time blocks, and project/mission context.
- Plan UI now shows Schedule Review in focused Plan mode.
- `Schedule this` pre-fills the local block form without auto-creating.
- Command mode has compact Plan review summary.
- `buildAiDraftPlan` contract is complete as a pure, no-write contract: it uses Schedule Review as source of truth, proposals cite deterministic recommendations/open gaps, deterministic fallback exists, and the write boundary requires user confirmation.
- No AI caller is wired yet.
- No auto-create, provider write-back, sync behavior change, or external calendar publishing was added in the Schedule Review slice.
- Ana QA passed: focused Plan review visible/readable, recommendations prefill form only, blocked/waiting items non-executable, no provider write-back controls, and Google/Outlook remain ready/syncable.
- Command dashboard layout polish passed.
- Left Missions/Checklist rail and right Talk/AI Review rail are narrower and compact.
- Center Mission Control still leads but is less oversized.
- Bottom Day Plan/Checklist band has more usable vertical space.
- Focused Plan layout now uses compact toolbar/date controls.
- Place Work is a compact chip row.
- Timeline starts near the top.
- Schedule appears above Schedule Review.
- Details/advanced scheduling remains available but is not dominant.
- Local-only/no-write-back boundary remains intact.
- Actual duration prompt exists but duration is not persisted yet.
- Tags are separate from freeform notes.
- Ana QA passed desktop/narrow layout, local-only form behavior, Google/Outlook sanity, and no secret exposure.
- Slack/companion AI Review exposure remains open unless explicitly closed in a future checkpoint.
- Locke automated verification passed: `npm run test:assistant`, `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build:app`, and `git diff --check` with only CRLF notices.
- Ana live QA passed: `npm run storage:check` reported `ok: true`, `error: 0`, `warning: 0`; Command/focus nav passed; service pill visual and Settings routing passed; Google/Outlook persistence sanity passed.
- Latest local checkpoint commit before the current proposal UI work was `4897456 Add proposal persistence and anti-nagging docs`.
- AI project template proposal Slice 1 is complete as a pure no-write detector/builder.
- AI project template proposal persistence/filtering is complete: schema v13 proposal-state table/indexes, repository state actions, pure eligibility filtering, shown-state helper, and regression coverage are in place without UI, markdown writes, AI calls, provider writes, or project/todo/template mutations.
- Basic AI project template proposal Review Inbox surfacing is complete: eligible filtered proposals appear as read-only draft previews with evidence, no-write boundary copy, dismiss, snooze 30 days, and do-not-suggest-again actions.
- Proposal snapshot reads are side-effect-free; shown-state recording is explicit and action targets are validated against currently eligible proposals before suppression writes.
- Explicit AI project template proposal save/editor is complete: proposal drafts can be edited inline, previewed, and saved only after a separate confirmation.
- Confirmed template saves write one markdown file under `memory/templates/project-task-templates/`, validate the markdown before and after writing, refuse slug/path collisions, refresh the memory index, and mark the proposal accepted with saved slug/path.
- Existing projects remain unchanged, and no AI/API calls, provider writes, or external calendar writes were added by the template save/editor slice.
- `Not this template` reject handling is complete and suppresses the wrong draft without using do-not-suggest-again.
- Saved active markdown project task templates now appear in the existing project creation template selector and seed future project-linked todos when selected.
- Settings now has a Templates tab showing saved/built-in project templates and hidden proposal patterns.
- Dismissed, snoozed, rejected, and do-not-suggest-again proposal states can be cleared with `Allow suggestions again`; accepted states remain tied to saved templates.
- `9883cbc Add template management reversal surface` has been pushed to `origin/master`.
- AI draft planning from Schedule Review is visible in focused Plan mode.
- The Plan surface can request a staged draft through the existing local `plan:generateDraft` IPC route.
- Draft planning uses Schedule Review as source of truth, preserves deterministic fallback when Ollama/model output is unavailable or unusable, and shows fallback/source status in the UI.
- Draft blocks prefill the existing local block review form only after operator selection.
- No AI draft action auto-creates time blocks, writes Google/Outlook calendars, changes provider sync behavior, or publishes external calendar events.
- AI draft planning verification passed: `npx tsc --noEmit`, `npm run lint`, `npm run test:assistant`, `npm run build:app`, and `git diff --check` with CRLF warnings only.
- Safe template revision/apply planning is complete in `docs/PROJECT_TEMPLATE_REVISION_APPLY_PLAN.md`.
- Revision proposals are defined as a separate track from new-template proposals and must not overwrite markdown until explicit confirmation.
- Apply-template-to-existing-projects is defined as a separate selected-project preview flow before any todo creation path.
- Template revision proposals are implemented as a separate `template_revision` proposal type from new-template proposals.
- Revision proposal state/schema now stores proposal type, target template slug/path, and accepted template version metadata.
- Review Inbox can surface revision proposals as editable read-only drafts with dismiss, snooze, reject, never-suggest, and confirmed update actions.
- Confirmed revision updates validate markdown, preserve supported `version: 1`, write only the selected template markdown path, refresh the memory index, and mark the revision accepted.
- Settings Templates now includes a selected-project apply preview that computes missing template tasks and duplicate warnings without creating todos, editing existing todos, or writing providers.
- Settings Templates can now confirm applying selected missing template tasks to selected existing projects after preview.
- Confirmed apply creates only selected missing project-linked todos, preserves existing todos, records `sourceKind = "project_template"` plus stable template `sourceRef`, and returns created/skipped/project counts.
- Provider calendar write-back is planned in `docs/PROVIDER_CALENDAR_WRITEBACK_PLAN.md` as a future create-only publish flow with explicit confirmation, scope upgrades, publish identity storage, and no automatic AI/provider writes.
- Mission Control follow-up polish reduced healthy Service Health duplication while preserving degraded-service visibility, and mobile Command mode now orders Mission Control then Talk/capture before Plan, Projects, and Checklist.
- Revision/apply/planning/polish verification passed for TypeScript, lint, assistant regression tests, app build, and diff whitespace checks.
- AI Task Review context packets now include factual local work graph, appointments, local time-block counts, unified Review Inbox items, stale projects, waiting-on work, overdue/due-soon work, quick wins, recent completed-work changes, and storage/email/calendar/slack service health.
- AI Task Review packet generation keeps source identity and confirmation-only follow-up actions while redacting raw notes, provider account refs, sync errors, raw email subject/body data, and local storage details.
- Talk/AI review routing now recognizes `what should I do next?` as reset/next-move review and `what changed since yesterday?` / recent-change prompts as a read-only change review.
- The `change_review` AI Review mode renders packet-backed recent movement without creating blocks, todos, calendar events, provider writes, or any other work graph mutation.
- AI Task Review packet/intents verification passed: `npx tsc --noEmit`, `npm run lint`, `npm run test:assistant`, `npm run build:app`, and `git diff --check` with CRLF warnings only.
- Provider calendar write-back foundation is in place: schema v15 adds `time_block_publishes`, shared preview/confirm contracts build create-only publish previews, and Electron exposes preview/confirm IPC.
- The write-back foundation only treats `planned` local blocks as publishable, flags conflicts with imported appointments, skips already-published blocks, and sanitizes provider errors before returning them.
- Production provider writes remain intentionally blocked until Google/Outlook write scopes and provider adapters are wired; current confirm IPC preserves the explicit-confirmation boundary and cannot silently publish.
- AI Settings now has optional OpenAI-compatible API provider fields for base URL, model name, and encrypted API key storage/clear. API keys are stored through `secure_secrets`, not plain settings JSON.
- Calendar write-back foundation/API settings verification passed: `npx tsc --noEmit`, `npm run lint`, `npm run test:assistant`, `npm run test:sync`, `npm run build:app`, and `git diff --check` with CRLF warnings only.
- Focused Plan now includes a provider publish section that selects planned local blocks, chooses a Google or Outlook calendar source, builds a preview, and confirms create-only publish.
- Google Calendar OAuth now requests Calendar read plus event-write scopes; Outlook Calendar OAuth now requests `Calendars.ReadWrite`; Settings copy tells existing users to refresh sign-in for publish support.
- Confirmed provider publish uses create-only Google/Outlook event adapters, writes PRAXIS markers/local time block identity into created events, stores safe publish identity on success, and does not update/delete provider events.
- Publish preview blocks missing write-scope tokens with reconnect guidance, blocks completed/canceled blocks, flags duplicate existing publishes, and blocks imported appointment conflicts before confirmation.
- Time-block snapshots now carry safe `time_block_publishes` records for the visible local blocks.
- Focused Plan shows publish-state badges on local blocks and in the publish picker once publish records exist.
- Failed provider publish attempts persist sanitized `publish_failed` records and can be staged for a fresh preview retry without update/delete provider writes.
- Live Google/Outlook provider QA still requires operator-present OAuth refresh and explicit consent because it creates real calendar events.
- `docs/PROVIDER_CALENDAR_LIVE_QA.md` defines the operator-present create-only publish QA path and failure/retry checks.
- `docs/PROVIDER_CALENDAR_RECONCILIATION_PLAN.md` defines the later detect-only, confirmed update, and confirmed delete path for PRAXIS-created provider events only.
- AI Review can now use configured OpenAI-compatible API generation under API-capable reliance policies, validates model output against packet stable IDs, and falls back deterministically on missing config or provider errors.
- `docs/PERSISTENT_PRESENCE_RAINMETER_PLAN.md` defines tray/background lifetime, pause/quiet states, notification boundaries, and a read-only Rainmeter snapshot contract.
- `docs/CHECKLIST_CONTEXT_MEMORY_PLAN.md` defines context-based checklist groups, contextual memory lanes, selector-first implementation phases, and no-write boundaries.

## NEXT STEPS

### 1. Plan Template Revision And Apply Flows

**STATUS**

Complete. See `docs/PROJECT_TEMPLATE_REVISION_APPLY_PLAN.md`.

### 2. Add Pure Template Revision Proposal Detection

**STATUS**

Complete. Revision proposals are now separate from new-template proposals, have stable fingerprints/material-change hashes, participate in proposal state filtering, appear in Review Inbox, and can update only the selected markdown template after explicit confirmation.

### 3. Wire AI Draft Planning From Schedule Review

**STATUS**

Complete for the first visible local-first surface. Keep future improvements scoped to UX polish, richer model prompts, and tests around any new write-adjacent behavior.

### 4. Plan Provider Calendar Write-Back

**STATUS**

Complete. See `docs/PROVIDER_CALENDAR_WRITEBACK_PLAN.md`. Implementation remains a later explicit-confirmation track.

### 4A. Add Confirmed Apply-Template Path For Existing Projects

**STATUS**

Complete. The Settings Templates flow previews missing tasks, lets the operator select tasks, then creates only selected missing todos after confirmation.

### 5. Continue Mission Control Follow-Up Polish

**STATUS**

Complete for this pass. Healthy Service Health no longer repeats as a full Today card, degraded/setup/loading service issues still surface, and mobile Command mode now puts Mission Control and Talk/capture first.

### 5A. Build AI Task Review Context Packet

**GOAL**

Build the factual packet that future review intents use for reset, stale work, risk, quick wins, and
change summaries.

**DIRECTION**

- Use local work graph, calendar appointments, local time blocks, Review Inbox, stale projects,
  waiting-on items, overdue/due-today work, quick wins, recent changes, and service health.
- Keep the packet factual and source-attributed.
- Do not let model generation own writes; all write-like outcomes stay in Review Inbox, staged drafts,
  or explicit confirmation paths.

**STATUS**

Complete. The packet now covers work graph, calendar pressure, local time blocks, unified Review Inbox items, stale projects, waiting-on items, overdue/due-soon work, quick wins, recent changes, and service health. Natural-language next-move and change-review intents route to read-only packet-backed AI Review responses.

### 5B. Implement Provider Calendar Write-Back Slice 1

**GOAL**

Implement the first safe provider calendar write-back slice for publishing operator-confirmed local time blocks as create-only external calendar events.

**DIRECTION**

- Start from `docs/PROVIDER_CALENDAR_WRITEBACK_PLAN.md`.
- Keep publication create-only, explicit-confirmation only, and never AI/autopublish driven.
- Add provider identity/publish-state tracking before any provider call path.
- Preserve local blocks as the source of truth and make failed/blocked publishes recoverable.
- Do not expose OAuth tokens, refresh tokens, client secrets, raw provider payloads, encrypted secret values, or `secure_secrets`.

**DONE WHEN**

- Provider write-back has a staged implementation path with regression coverage.
- Any real provider write path is behind a clear operator confirmation boundary.
- Google/Outlook sync behavior remains stable, and no existing local blocks are mutated unexpectedly.

**STATUS**

Complete for the backend foundation. The publish identity table, preview builder, confirm contract, safe provider-error handling, IPC surface, and regression tests exist. Real Google/Outlook create calls remain a follow-up until write scopes and adapters are added.

### 5C. Add Optional API Provider Settings

**STATUS**

Complete. AI Settings now captures OpenAI-compatible API base URL, model name, and encrypted API key state behind explicit operator control, and AI Review can call the configured API provider under API-capable reliance policies. Model output is still packet/stable-ID validated and read-only.

### 5D. Wire Calendar Publish UI And Provider Adapters

**GOAL**

Expose the create-only publish preview in Plan and add real Google/Outlook provider event creation only after write-scope readiness is explicit.

**DIRECTION**

- Add visible Plan publish controls that start from selected local planned blocks and show the preview before confirmation.
- Add Google/Outlook write-scope readiness and reconnect guidance before enabling real publish.
- Implement provider event creation adapters that write only confirmed preview-ready blocks.
- Keep update/delete/reconcile out of the first real provider adapter slice.

**STATUS**

Complete for the first create-only path. Focused Plan can preview and confirm selected planned local blocks, Google/Outlook adapters create events only after confirmation, reconnect guidance appears when write scopes are missing, and publish-state/failure visibility is now wired into Plan. Follow-up remains operator-present live provider QA.

### 5E. Provider Write-Back QA And Publish-State Visibility

**GOAL**

Validate the real provider publish path carefully and make published/failed state visible enough that the operator can trust it.

**DIRECTION**

- Run manual Google/Outlook write-scope reconnect and create-only publish QA when the user is ready for live provider writes.
- Add visible publish-state badges on local blocks once `time_block_publishes` has records.
- Keep update/delete/reconcile provider writes out of this pass.
- Add retry/recover UI for `publish_failed` only after failure-state display is clear.

**DONE WHEN**

- Live QA confirms one Google and/or Outlook event can be created only after explicit preview/confirm.
- Published blocks clearly show their provider state.
- Failed/blocked states are understandable without exposing tokens, raw payloads, or encrypted values.

**STATUS**

Complete for code polish and QA handoff. Plan now shows publish-state badges for local blocks, persists sanitized failed publish records, and stages failed records for retry through the same preview/confirm flow. The live-QA runbook is in `docs/PROVIDER_CALENDAR_LIVE_QA.md`; the live run remains pending because it requires operator-present OAuth refresh and creates real Google/Outlook calendar events.

### 5F. Plan Provider Calendar Reconciliation

**STATUS**

Complete as a planning artifact. `docs/PROVIDER_CALENDAR_RECONCILIATION_PLAN.md` defines the later detect-only, confirmed update, and confirmed delete phases for PRAXIS-created provider events. Do not implement update/delete provider writes until create-only live QA passes.

### 6. Plan Checklist Grouping And Context-Memory Redesign

**GOAL**

Keep checklist grouping and context-memory redesign visible as follow-up work after the active calendar/time-blocking planning surface.

**DIRECTION**

- Group checklist items around real operating contexts, projects, and missions.
- Revisit how memory-backed documents appear inside Today/Command without restoring a fake Memory top-nav mode.
- Preserve explicit write boundaries and source identity.

**STATUS**

Complete as a planning artifact. `docs/CHECKLIST_CONTEXT_MEMORY_PLAN.md` defines selector-first checklist context groups, contextual memory lanes, UI phases, and verification requirements. Implementation should start with pure selectors before broad JSX changes.

### 7. Plan V1.1 Persistent Presence After AI Review

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

**STATUS**

Complete as a planning artifact. `docs/PERSISTENT_PRESENCE_RAINMETER_PLAN.md` defines tray/background lifetime, pause/quiet modes, notification boundaries, Rainmeter JSON export, privacy rules, and verification. Implementation should start with tray/background lifetime after live provider QA or when selected.

### 8. Keep Future Intelligence And Capture Tracks Execution-Focused

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
