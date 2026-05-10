# TECH DEBT

## Active Debt

### Outlook Graph GoDaddy Setup Risk

- Priority: Medium
- Status: Resolved for current V1 path
- Impact: Outlook mail/calendar sync is implemented, Microsoft app setup now lives in Settings, and pure sync regression coverage exists. Initial GoDaddy admin access only exposed Exchange, but GoDaddy support enabled Microsoft Entra access for the tenant.
- Current Decision: Continue using Microsoft Graph OAuth for Outlook Mail and Outlook Calendar. Keep the GoDaddy setup note because future GoDaddy-hosted tenants may need support intervention before App registrations are available.
- Residual Risk: If this access is revoked or another GoDaddy tenant cannot expose Microsoft Entra App registrations, PRAXIS may still need an IMAP-style mail fallback or another Outlook adapter path.
- Related: `praxis-desktop/electron/outlookEmailOAuth.ts`, `praxis-desktop/electron/outlookEmailSync.ts`, `praxis-desktop/electron/outlookCalendarOAuth.ts`, `praxis-desktop/electron/outlookCalendarSync.ts`, `praxis-desktop/src/components/ConnectedServiceSettingsPanel.tsx`

### Person Contact Enrichment Is Lookup-Only

- Priority: Medium
- Impact: Praxis can now review, save, dismiss, and restore inferred email suggestions, but there is still no equivalent review flow yet for phone or billing details.
- Likely Fix: Extend the same review/restore pattern to other contact fields once those adapters can infer them reliably.
- Related: `praxis-desktop/shared/personContactSuggestion.ts`, `praxis-desktop/src/components/PeopleProfilePanel.tsx`, `praxis-desktop/electron/emailRepository.ts`

### Dashboard Still Needs Live Visual QA

- Priority: Low
- Impact: Empty states and desktop presence have been improved, but the dashboard still needs live-window review on the operator machine before calling the UI visually settled.
- Likely Fix: Review the running app at desktop and narrower widths, then tune spacing or text overflow only where real rendering shows issues.
- Related: `praxis-desktop/src/components/ActionMenu.tsx`, `praxis-desktop/src/components/MemoryWriterPanel.tsx`, `praxis-desktop/src/components/WorkFormsPanel.tsx`, `praxis-desktop/src/App.css`

### Companion Remote Trust Layer Is Not Implemented

- Priority: Medium
- Impact: A local explicit-command gateway now exists for companion clients, but remote Surface/mobile access still has no authentication, pairing, revocation, rate limiting, or transport design.
- Likely Fix: Add a trusted transport layer later, likely VPN/Tailscale first or a purpose-built authenticated relay, while keeping all writes routed through `companionCommand.ts`.
- Related: `docs/ARCHITECTURE.md`, `praxis-desktop/shared/companionCommand.ts`, `praxis-desktop/electron/companionCommand.ts`, `praxis-desktop/shared/companionSnapshot.ts`

### Checklist Persistence Is Separate From Main SQLite Store

- Priority: Medium
- Impact: The checklist uses a JSONL event log while the new operational store is SQLite. This is acceptable short term but needs a clear migration or ownership decision.
- Likely Fix: Either migrate checklist operational state into SQLite or explicitly keep the event log as an event-sourcing subsystem with SQLite projections.
- Related: `praxis-desktop/electron/checklistEventLog.ts`, `praxis-desktop/shared/persistence/checklistEvents.ts`

### Markdown Memory Index Is Startup-Only

- Priority: Medium
- Impact: New or edited markdown files are indexed only when the database initializes.
- Likely Fix: Add explicit reindex command and later file watching or scheduled refresh triggered by app actions.
- Related: `praxis-desktop/electron/praxisDb.ts`, `memory/`

### Proactive Suggestion Coverage Is Narrow

- Priority: Medium
- Impact: Proactive suggestions now cover overdue completion checks, stale waiting-on items, quick wins, and top-action completion across desktop and Slack, but they still do not cover broader focus prompts, mission/project nudges, or richer "move this date" style nudges.
- Likely Fix: Add more suggestion types only after each has an explicit command, safety rule, and resolver path.
- Related: `praxis-desktop/electron/assistantContextRepository.ts`, `praxis-desktop/electron/slackAdapter.ts`, `praxis-desktop/src/App.tsx`

### AI Task Review Context Packet Is Not Implemented

- Priority: Closed
- Impact: Closed. PRAXIS now builds a factual packet from work graph, calendar, Review Inbox, stale projects, waiting-on, overdue/due-soon, quick wins, recent changes, and service health.
- Likely Fix: Closed. Future debt should target specific packet gaps rather than the packet foundation.
- Related: `docs/ARCHITECTURE.md`, `docs/Roadmap.md`, `docs/MISSION_PLAN.md`, `praxis-desktop/electron/dailyBrief.ts`, `praxis-desktop/electron/assistantRouter.ts`

### AI Model Policy And Provider Settings Are Missing

- Priority: Closed
- Impact: Closed. AI Settings now includes configurable Ollama model selection, optional OpenAI-compatible API provider settings, encrypted API key storage, and reliance policy.
- Likely Fix: Closed. Future debt should target budget controls, provider health probes, or model-specific quality checks.
- Related: `docs/ARCHITECTURE.md`, `docs/MISSION_PLAN.md`, `praxis-desktop/src/SettingsApp.tsx`, `praxis-desktop/electron/settingsRepository.ts`

### AI Review Write Boundary Needs Enforcement

- Priority: Closed
- Impact: Closed for AI Review. Ollama and API model output is validated against packet stable IDs and rendered read-only with deterministic fallback.
- Likely Fix: Keep enforcing this pattern on future write-adjacent model surfaces.
- Related: `docs/ARCHITECTURE.md`, `praxis-desktop/electron/assistantRouter.ts`, `praxis-desktop/electron/assistantContextRepository.ts`, `praxis-desktop/shared/assistantContextResolver.ts`

### Project Template Reject And Saved Template Usability Were Missing

- Priority: High
- Status: Resolved in the reject/usability slice
- Impact: Template proposals can now be rejected with `Not this template`, and active saved markdown project task templates appear in the existing project creation selector for future projects.
- Residual Risk: Native visual QA of the new menu action and selector remains useful when the Electron window is stable.
- Related: `docs/Roadmap.md`, `docs/MISSION_PLAN.md`

### Template Save Confirmation Flow Was Missing

- Priority: High
- Status: Resolved in the initial save/editor slice
- Impact: Proposal markdown can now be edited, previewed, and written only after explicit confirmation. The save path validates markdown, refuses collisions, refreshes memory indexing, and marks accepted proposal state with the saved slug/path.
- Residual Risk: Native visual QA of the editor remains useful when the Electron window is stable.
- Related: `docs/Roadmap.md`, `docs/MISSION_PLAN.md`

### Template Editing And Revision Management Is Deferred

- Priority: Medium
- Impact: Markdown templates can be created, used for future project creation, listed in Settings, and proposal suppressions can be reversed, but there is no dedicated edit/archive/revision workflow yet.
- Likely Fix: Add template editing/archive management after the visibility/reversal slice, including revision proposals and explicit apply-template actions for existing projects.
- Related: `docs/Roadmap.md`, `docs/MISSION_PLAN.md`

### Do-Not-Suggest-Again Reversal Was Undefined

- Priority: Medium
- Status: Resolved in the first template management slice
- Impact: Dismissed, snoozed, rejected, and do-not-suggest-again proposal states can now be cleared from Settings with `Allow suggestions again`.
- Residual Risk: Proposal state rows do not yet carry human-friendly evidence labels, so the Settings view shows technical cluster/fingerprint identifiers until richer metadata is added.
- Related: `docs/Roadmap.md`, `docs/MISSION_PLAN.md`

### Persistent Presence Depends On AI Review

- Priority: Medium
- Status: Partially resolved
- Impact: Tray/background lifetime, persisted pause/quiet state, and read-only Rainmeter snapshot export are implemented. Notification/nudge behavior is not implemented yet.
- Likely Fix: Start from `docs/PERSISTENT_PRESENCE_RAINMETER_PLAN.md`; implement notification boundaries after AI Review priority explanations are stable.
- Related: `docs/Roadmap.md`, `docs/MISSION_PLAN.md`, `docs/ARCHITECTURE.md`

### Checklist Grouping And Context Memory Are Still Selector Work

- Priority: Medium
- Status: Mostly resolved
- Impact: Checklist now consumes shared context groups as filter lanes and Today uses context-memory lanes. AI Review lane highlighting and richer badges remain later polish.
- Likely Fix: Start from `docs/CHECKLIST_CONTEXT_MEMORY_PLAN.md`; add AI Review suggested stable ID highlighting and richer context badges when needed.
- Related: `docs/CHECKLIST_CONTEXT_MEMORY_PLAN.md`, `praxis-desktop/src/components/MasterChecklistPanel.tsx`, `praxis-desktop/src/components/TodayTimelinePanel.tsx`, `praxis-desktop/shared/storage/hybridStorage.ts`

### Quick-Action Ranking Is Still Basic

- Priority: Medium
- Impact: Project-linked todos now show in the global checklist and quick-action metadata exists, but ranking is still deterministic and does not learn from operator behavior.
- Likely Fix: Add operator-profile feedback and ignored/overdue history after the basic work model stabilizes.
- Related: `praxis-desktop/shared/workModel.ts`, `praxis-desktop/src/App.tsx`

### Natural-Language Capture Is Limited

- Priority: High
- Impact: Praxis can capture simple dated todos and appointments, confirm ambiguous call-like captures, attach todos to clearly matched projects, complete clearly matched todos/deadlines by title, move due dates for clearly matched todos/deadlines, clear waiting-on links, and ask numbered clarification for ambiguous update choices, but cannot yet reliably handle mission placement, recurring events, or broad multi-field edits.
- Likely Fix: Add deterministic routes for waiting-on reassignment and mission placement, then add local-model extraction once the deterministic parser is stable.
- Related: `praxis-desktop/shared/naturalLanguageCapture.ts`, `praxis-desktop/electron/naturalLanguageCapture.ts`, `praxis-desktop/electron/assistantRouter.ts`

### Focus Reports Need Richer Conversation

- Priority: Medium
- Impact: Basic typed focus questions, `tell me more`, explicit ordinal completion, pause/reactivate, due-date moves, waiting-on clears, and focus-report jumps route correctly, but broader multi-turn filtering questions are still limited.
- Likely Fix: Add follow-up actions for `show only blocked/waiting-on` and `who is involved`.
- Related: `praxis-desktop/electron/assistantRouter.ts`, `praxis-desktop/electron/dailyBrief.ts`, `praxis-desktop/src/App.tsx`

### People Model Still Needs Billing And Adapter Links

- Priority: Medium
- Impact: People now have contact fields, aliases, inferred and explicit project/mission relationships, deterministic desktop lookup, Slack DM lookup, and a profile view, but there are no billing-history links or voice adapter yet.
- Likely Fix: Add voice access to the lookup service and finance item `person_id` links when the Bill.com adapter is designed.
- Related: `praxis-desktop/electron/workRepository.ts`, `praxis-desktop/electron/slackAdapter.ts`, `praxis-desktop/shared/workModel.ts`, `praxis-desktop/src/App.tsx`

### Slack Adapter Is Still Narrow

- Priority: Medium
- Impact: Slack can answer saved people/contact lookup DMs, appointment reports, daily/focus reports, work lookups, confirmed work updates, confirmed natural-language capture drafts, mirrored proactive suggestions, and recognize conversation-review requests with a manual import handoff, but it still cannot directly ingest a Slack channel/thread for review.
- Likely Fix: Keep the manual import handoff for v1, then design direct Slack channel/thread ingestion only after trust, channel consent, and retention rules are explicit.
- Related: `praxis-desktop/electron/slackAdapter.ts`, `praxis-desktop/electron/assistantContextRepository.ts`

### Slack Tokens Are Still Environment-Based

- Priority: Low
- Impact: The operator channel and proactive mirroring toggle are stored in app settings, and the adapter can be restarted from Settings, but Slack app and bot tokens still require launching Praxis from an environment that already has those variables.
- Likely Fix: Add a guided Slack token setup flow that stores tokens through the encrypted secret vault instead of plain settings.
- Related: `praxis-desktop/electron/slackAdapter.ts`, `praxis-desktop/electron/settingsRepository.ts`, `praxis-desktop/electron/secretRepository.ts`

### Calendar Sync Cadence Needs User Controls

- Priority: Medium
- Impact: Connected calendars now auto-sync on startup, every 30 minutes while Praxis is open, after OAuth, and when the user asks about appointments/events. There is not yet a Settings control to pause sync or change the interval.
- Likely Fix: Add explicit calendar auto-sync settings once the Settings UX is cleaned up further.
- Related: `praxis-desktop/electron/calendarAutoSync.ts`, `praxis-desktop/electron/googleCalendarSync.ts`, `praxis-desktop/electron/outlookCalendarSync.ts`, `praxis-desktop/src/SettingsApp.tsx`

### ICS Parser Still Has Advanced Timezone Limits

- Priority: Medium
- Impact: ICS import supports ordinary VEVENT records, cancelled-event skipping, `EXDATE`, bounded recurrence expansion for common `RRULE` patterns, and IANA `TZID` conversion, but it does not fully interpret embedded custom `VTIMEZONE` definitions.
- Likely Fix: Add full `VTIMEZONE` parsing or use a vetted calendar library if complex enterprise calendar exports become common.
- Related: `praxis-desktop/shared/icsCalendar.ts`

### Release Signing Is Not Implemented

- Priority: Medium
- Impact: Packaging is stable, Windows scripts are explicit for `x64`, `arm64`, and both, branded icons are wired in, and the release checklist exists, but installer signing is not implemented. The first distribution channel is direct private delivery of the Windows `x64` NSIS installer, so unsigned artifacts remain limited to validation and approved private testing.
- Likely Fix: Acquire a Praxis Project/operator-owned code signing certificate, choose local versus CI signing, choose certificate storage and access control, and choose a timestamp server before adding Electron Builder signing configuration.
- Related: `praxis-desktop/electron-builder.json5`, `praxis-desktop/package.json`, `praxis-desktop/release/`

### Signing Distribution Choices Are Still Open

- Resolved: 2026-04-27
- Resolution: The first distribution channel is direct private delivery of the Windows `x64` NSIS installer to the operator or explicitly approved testers. Microsoft Store, public website downloads, GitHub Releases, and broad client-facing release channels remain deferred until signing is implemented.
- Related: `docs/DECISIONS.md`, `docs/RELEASE_CHECKLIST.md`, `praxis-desktop/electron-builder.json5`

### Windows Uninstall Leaves Empty Install Directory

- Priority: Low
- Impact: The ARM64 private package uninstalls cleanly, removes the Windows uninstall registration, preserves `%APPDATA%\praxis-desktop`, and leaves no `PraxisDesk.exe` processes after normal window close. The NSIS silent uninstall still leaves an empty `%LOCALAPPDATA%\Programs\PraxisDesk` directory.
- Likely Fix: Add an NSIS uninstall cleanup rule for the empty install directory only, while continuing to preserve user data because `deleteAppDataOnUninstall` must remain false.
- Related: `praxis-desktop/electron-builder.json5`, `docs/RELEASE_VALIDATION.md`

### App Icon And Product Metadata Are Minimal

- Resolved: 2026-04-26
- Resolution: Branded Praxis icon assets were added and wired into Electron Builder plus runtime BrowserWindow icon paths.

### Dependency Audit Warnings

- Priority: Medium
- Impact: `npm install` reports dependency vulnerabilities inherited from the current package graph.
- Likely Fix: Review `npm audit` output and update dependencies carefully after functional storage work is stable.
- Related: `praxis-desktop/package-lock.json`

### Electron Main Bundle Size Increased With Slack Bolt

- Priority: Low
- Impact: The main-process bundle is larger after adding `@slack/bolt`; this is acceptable while Slack remains optional, but should be watched before packaging polish.
- Likely Fix: Keep Slack initialization lazy and consider externalizing or splitting adapter dependencies if startup or packaging becomes slow.
- Related: `praxis-desktop/electron/slackAdapter.ts`, `praxis-desktop/vite.config.ts`

## Resolved Debt

### Project Template Proposal State Was Not Persisted

- Resolved: 2026-05-09
- Resolution: Added SQLite schema v13 proposal-state table/indexes, repository state actions, pure eligibility filtering, shown-state helper behavior, and regression coverage. Review Inbox UI and markdown template save confirmation remain separate later slices.

### Project Template Review Inbox UI Was Missing

- Resolved: 2026-05-09
- Resolution: Added read-only Review Inbox surfacing for eligible filtered project template proposals, including evidence preview, markdown draft preview, no-write boundary copy, dismiss, snooze 30 days, and do-not-suggest-again actions. Markdown save/editor and `Not this template` reject handling remain later work.

### Stale Tauri Direction

- Resolved: 2026-04-21
- Resolution: Active docs now state Electron is canonical.

### Template Electron Builder Metadata

- Resolved: 2026-04-21
- Resolution: App metadata was changed from template placeholders to Praxis Desk naming.

### Seeded Work UI State

- Resolved: 2026-04-21
- Resolution: Mission, project, todo, and deadline views now load from the SQLite-backed work snapshot instead of seeded arrays.

### Work Records Have Status Updates But Not Full Editing

- Resolved: 2026-04-21
- Resolution: Missions, projects, todos, deadlines, and appointments now have edit/delete or status correction paths in the desktop UI.

### Slack Test Suggestion Needs Richer Diagnostics

- Resolved: 2026-04-21
- Resolution: Slack settings now include a separate connection test and normalize common Slack API errors such as missing channel, missing membership, missing scope, and invalid auth.

### Inferred Contact Suggestions Had No Undo Path

- Resolved: 2026-04-23
- Resolution: Settings -> People now keeps dismissed inferred contact suggestions visible in a review card and supports one-click restore.

### Desktop Assistant Could Not Answer Work-Graph Questions

- Resolved: 2026-04-23
- Resolution: Praxis now has deterministic waiting-on and slipping lookups across both the desktop capture surface and Slack.

### People Contact Suggestions Only Supported Email

- Resolved: 2026-04-23
- Resolution: The People settings flow now supports email, phone, and billing-address suggestions with save, dismiss, and restore actions.

### Daily Brief Regression Coverage Needed Full Shared Extraction

- Resolved: 2026-04-25
- Resolution: The pure daily brief builder now lives in `shared/dailyBriefBuilder.ts` and has regression coverage for ranking, recommended moves, spoken count lines, filtering, and follow-up topics.

### Assistant Capture Hook Was Doing Too Much

- Resolved: 2026-04-25
- Resolution: `useAssistantCapture` is now the React state/orchestration shell, while operational mutations live in `assistantOperationalActions.ts`, route intent handling lives in `assistantRouteHandlers.ts`, and capture draft conversion lives in `assistantCaptureDraft.ts`.

### Companion Client Write Boundary Was Not Implemented

- Resolved: 2026-04-25
- Resolution: Companion clients now have a typed explicit-command gateway through `shared/companionCommand.ts` and `electron/companionCommand.ts`; write-like commands require confirmation and still execute only through Home Node assistant/work services, not direct SQLite or markdown mutation.

### Person Lookup Ignored Inferred Phone And Billing Details

- Resolved: 2026-04-24
- Resolution: Praxis lookup now uses strong active inferred contact suggestions for phone and billing details when saved values are missing.

### Work Lookup Only Covered Waiting-On And Slipping

- Resolved: 2026-04-24
- Resolution: Praxis work lookup now also covers quick wins, money-related items, and blocked or paused work.

### Work Lookup Discoverability Was Weak

- Resolved: 2026-04-24
- Resolution: The desktop Talk to Praxis surface, Slack fallback help text, and top-level docs now advertise the broader lookup questions Praxis already supports.

### Lookup Answers Were Informational But Not Actionable

- Resolved: 2026-04-24
- Resolution: Work-lookup results now store actionable context so follow-up commands can complete, pause, reschedule, or clear waiting-on state without restating full titles.

### Lookup Follow-Through Still Missed Reactivation And Focus Jumps

- Resolved: 2026-04-24
- Resolution: Praxis lookup follow-through now supports reactivation, waiting-flag clears, and contextual focus-report jumps across desktop and Slack.

### Daily Brief And Focus Reports Still Stored Complete-Only Follow-Ups

- Resolved: 2026-04-24
- Resolution: Daily brief and focus report contexts now reuse the richer work-item action builder, so report replies can pause, reactivate, reschedule, clear waiting-on, and open related focus reports.

### Daily Brief Ranked Items But Did Not Name A Top Move

- Resolved: 2026-04-24
- Resolution: Daily brief generation now creates a structured recommended move with directive text, rationale, and safe follow-up guidance for desktop, Slack, markdown memory, and future voice surfaces.

### Assistant Context Matching Had No Regression Tests

- Resolved: 2026-04-24
- Resolution: Assistant context matching now has a pure shared resolver plus `npm run test:assistant` coverage for report and lookup follow-up actions, including completion, pause, reactivation, due-date moves, waiting-on clears, related focus reports, missing-date prompts, and ambiguous replies.

### Incomplete Move Follow-Ups Could Default To Completion

- Resolved: 2026-04-25
- Resolution: `shared/assistantContextResolver.ts` now treats incomplete move/reschedule language as a due-date update request and asks for a clear date instead of falling through to the default ordinal completion path.

### Completed Work Could Receive Due-Date Follow-Up Actions

- Resolved: 2026-04-25
- Resolution: `shared/workLookupContext.ts` no longer emits due-date update actions for completed todos or deadlines; completed items receive reactivation instead.

### Skill Architecture Was Undefined

- Resolved: 2026-04-24
- Resolution: Praxis now has a conservative local markdown skill architecture, starter built-in skills, and explicit safety rules against untrusted executable plugin loading.

### Email Follow-Up Suggestions Could Duplicate Across Threads

- Resolved: 2026-04-24
- Resolution: Email follow-up suggestions now carry a stable duplicate key and suppress repeated suggestions across recent inbox facts.

### WhatsApp Capture Path Was Not Defined

- Resolved: 2026-04-24
- Resolution: WhatsApp is documented as an invited-source chat triage path first, with Business Cloud API support deferred until the broader chat import lane exists.

### Markdown Memory Had No Repair Path

- Resolved: 2026-04-24
- Resolution: `npm run memory:repair` now rewrites generated markdown mirrors from SQLite and repairs stale/missing markdown index entries.

### UI Redesign Direction Was Undecided

- Resolved: 2026-04-24
- Resolution: Three static UI direction mockups now exist in docs for operator review before any production UI changes are made.

### Chat Import Storage Lane Was Not Implemented

- Resolved: 2026-04-27
- Resolution: The SQLite schema now includes normalized `chat_imports`, `chat_import_participants`, and `chat_import_messages` tables with source, conversation, participant, timestamp, summary/snippet, and source-reference fields. The renderer has `window.praxis.chat.getSnapshot()` and `window.praxis.chat.importConversation(...)` IPC access.

### Chat Imports Did Not Produce Review Candidates

- Resolved: 2026-04-27
- Resolution: Chat imports now run a deterministic first-pass `chat_follow_up` extractor, store pending suggestions in `inbox_facts`, show them in the shared Review Inbox, and support accept, archive, and dismiss actions through `window.praxis.chat`.

### Manual Chat Import Surface Was Missing

- Resolved: 2026-04-27
- Resolution: The Talk panel now includes an explicit manual chat import surface for WhatsApp, SMS, Slack, manual, or unknown snippets. It accepts conversation title, participants, and pasted snippet text, then sends the input through `chat:importConversation` so Review Inbox can produce review-first candidates.

### Outlook Calendar Sync Needed Live Validation

- Resolved: 2026-04-27
- Resolution: Outlook Calendar connected through the GoDaddy Microsoft 365 tenant after Microsoft Entra access was enabled, OAuth/token exchange completed, and live sync finished successfully with no Outlook appointments currently imported.
