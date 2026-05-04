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
- Startup connected-service persistence is now the next active bug: on app start, Google and Outlook appear to require reconnect and sync again instead of preserving usable auth/sync state.
- Slack/companion AI Review exposure remains open unless explicitly closed in a future checkpoint.
- Latest integration verification passed: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build:app`, and `npm run storage:check`.

## NEXT STEPS

### 1. Fix Google/Outlook Reconnect And Sync Persistence

**GOAL**

Ensure Google and Outlook service connections persist across app restarts so the operator does not have to reconnect and manually sync every time PRAXIS starts.

**DIRECTION**

- Reproduce the startup behavior for Google and Outlook after a clean app close/reopen.
- Determine whether saved connection rows, OAuth credentials, encrypted tokens, refresh tokens, auth status, sync status, or UI readiness mapping are being reset or misread.
- Check both Google Mail/Calendar and Outlook Mail/Calendar because the symptom spans providers.
- Preserve local user data and do not delete connections as part of diagnosis.
- Do not expose provider secrets or raw tokens in logs, docs, screenshots, or worker reports.
- If the bug is only stale status display, fix state/readiness refresh without forcing reconnect.
- If the bug is token persistence or refresh failure, fix the repository/OAuth/sync path and add regression coverage.
- Keep Mission Control service-health display honest while the bug is open.

**FILES**

- `praxis-desktop/electron/settingsRepository.ts`
- `praxis-desktop/electron/googleOAuthShared.ts`
- `praxis-desktop/electron/outlookEmailOAuth.ts`
- `praxis-desktop/electron/outlookCalendarOAuth.ts`
- `praxis-desktop/electron/gmailEmailSync.ts`
- `praxis-desktop/electron/googleCalendarSync.ts`
- `praxis-desktop/electron/outlookEmailSync.ts`
- `praxis-desktop/electron/outlookCalendarSync.ts`
- `praxis-desktop/src/components/ConnectedServiceSettingsPanel.tsx`
- `praxis-desktop/src/dashboardSelectors.ts`
- tests covering sync/recovery/settings behavior

**DONE WHEN**

- Restarting the app preserves saved Google and Outlook connection/auth state.
- Previously connected Google and Outlook services do not ask for reconnect unless tokens are actually invalid or revoked.
- Sync can run after restart without re-authorizing.
- Service Health reports the true state after restart.
- Regression coverage protects the fixed persistence/refresh behavior.
- `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build:app` pass.

### 2. Continue Mission Control Follow-Up Polish

**GOAL**

Keep the first Mission Control pass moving after the connected-service persistence bug is fixed.

**DIRECTION**

- The polished first Mission Control pass is acceptable for now.
- Service-health duplication remains follow-up UI polish, not a blocker.
- Mobile ordering remains follow-up UI polish, not a blocker.
- A future safe AI Review launcher can replace the current `Brief Review` card when Talk/AI Review control wiring is deliberately scoped.

**DONE WHEN**

- Service Health duplication is reduced without hiding broken-service visibility.
- Narrow/mobile ordering puts Mission Control and Talk entry higher without breaking existing panels.
- Any AI Review launcher path preserves no-write behavior.

### 3. Plan V1.1 Persistent Presence After AI Review

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
