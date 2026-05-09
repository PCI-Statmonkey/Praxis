# CURRENT TASK

## OBJECTIVE

AI project template proposal persistence/filtering and read-only Review Inbox surfacing are complete. Move the immediate execution queue to the explicit markdown template save/editor slice, while preserving the boundary that proposals do not create templates, mutate projects, call AI, or write to providers unless the operator confirms a later save flow. Provider calendar write-back remains explicitly later. Persistent presence, Rainmeter, and background wallpaper surfaces remain important V1.1 planning tracks, but they stay behind the proposal save/editor work.

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
- No markdown template writes, AI/API calls, provider writes, or project/todo/template mutations were added by the Review Inbox proposal UI slice.

## NEXT STEPS

### 1. Add Explicit Markdown Template Save And Proposal Editor

**GOAL**

Turn an accepted proposal into a markdown-backed project task template only after explicit operator confirmation.

**DIRECTION**

- Build a review/editor flow for proposed markdown template content.
- Save to `memory/templates/project-task-templates/` only after explicit confirmation.
- Add the missing `Not this template` / reject path so a wrong draft can be rejected without suppressing the entire cluster forever.
- Mark accepted proposals only after the save flow succeeds and records the saved template slug/path.
- Do not mutate existing projects when templates change.
- Preserve source identity for future template-created todos.

**DONE WHEN**

- Accepted proposal markdown can be reviewed, edited, and saved intentionally.
- Existing projects remain unchanged.
- Future project creation can select the saved template.
- Rejected drafts stop repeating unless materially changed evidence creates a new proposal.

### 2. Add Template Management And Reversal Later

**GOAL**

Make saved templates and suppressions manageable after the first save path exists.

**DIRECTION**

- List saved templates in a settings or template-management surface.
- Allow do-not-suggest-again suppressions to be reviewed and reversed.
- Add template revision proposals for existing markdown templates.
- Keep apply-template-to-existing-projects as a separate explicit-confirmation flow.

**DONE WHEN**

- Saved templates and suppressed proposal patterns are visible and reversible.
- Template revision proposals do not overwrite operator edits automatically.
- Existing projects are changed only through a separate selected-project review flow.

### 3. Plan Provider Calendar Write-Back

**GOAL**

Keep external calendar write-back as an explicit later track after local planning behavior is proven.

**DIRECTION**

- Do not add Google or Outlook writes until local time blocks and confirmation UX are stable.
- Require explicit operator confirmation before any future provider write-back.
- Preserve auditability of source provider events versus PRAXIS-created local blocks.

**DONE WHEN**

- Provider write-back has a separate technical plan, confirmation model, and test strategy.

### 4. Continue Mission Control Follow-Up Polish

**GOAL**

Keep non-blocking Mission Control layout and copy issues moving behind the unified calendar/time-blocking planning track.

**DIRECTION**

- The polished first Mission Control pass is acceptable for now.
- OAuth persistence, top-bar Command/service-pill polish, and UI/font polish are closed.
- Service-health duplication remains follow-up UI polish, not a blocker.
- Mobile ordering remains follow-up UI polish, not a blocker.
- A future safe AI Review launcher can replace the current `Brief Review` card when Talk/AI Review control wiring is deliberately scoped.

**DONE WHEN**

- Service Health duplication is reduced without hiding broken-service visibility.
- Narrow/mobile ordering puts Mission Control and Talk entry higher without breaking existing panels.
- Any AI Review launcher path preserves no-write behavior.

### 5. Plan Checklist Grouping And Context-Memory Redesign

**GOAL**

Keep checklist grouping and context-memory redesign visible as follow-up work after the active calendar/time-blocking planning surface.

**DIRECTION**

- Group checklist items around real operating contexts, projects, and missions.
- Revisit how memory-backed documents appear inside Today/Command without restoring a fake Memory top-nav mode.
- Preserve explicit write boundaries and source identity.

**DONE WHEN**

- The redesign has a scoped plan and does not distract from the active calendar/time-blocking work.

### 6. Plan V1.1 Persistent Presence After AI Review

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

### 7. Keep Future Intelligence And Capture Tracks Execution-Focused

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
