# Mission Control Technical Map

Checkpoint: `24e66e3 Log final AI review duplicate smoke`

Purpose: map the current frontend implementation so a future Mission Control dashboard redesign can be implemented in small, low-conflict slices without changing assistant routing, data semantics, or write-confirmation boundaries by accident.

## Current Frontend Shape

### Top-level shell

- `src/App.tsx`
  - Owns the main desktop shell, navigation, service health strip, panel selection, data loading, and most mutation handlers.
  - `PanelId` is currently `"projectStack" | "todayTimeline" | "morningPlan" | "masterChecklist" | "memory"`.
  - `loadWorkModel()` fans out to `window.praxis.work.getSnapshot()`, `brief.getDaily()`, `email.getSnapshot()`, `chat.getSnapshot()`, `settings.getSnapshot()`, `storage.getOverview()`, `slack.getStatus()`, and `companion.getSnapshot()`.
  - Derived data is built inline: `upcomingDeadlines`, `upcomingAppointments`, `reviewInboxItems`, Google/Outlook health, Slack/Memory/Companion health, and `dashboardReadiness`.
  - Passes large prop bundles into `ProjectStackPanel`, `TodayTimelinePanel`, `MemoryWriterPanel`, and `MasterChecklistPanel`.
  - Risk: this file is the main integration hub. Large visual redesigns in this file can easily collide with data loading, edit forms, assistant routing, and write actions.

### Dashboard / Today surfaces

- `src/components/TodayTimelinePanel.tsx`
  - Main dashboard content surface.
  - Renders status line, Daily Brief hero, Dashboard Readiness, Today Timeline, Priority Stack, Daily Operating Rhythm, Focus Controls, proactive suggestion, focus report, appointment report, daily brief details, Review Inbox, upcoming appointments, upcoming deadlines, and memory documents.
  - Computes presentational values locally: `operationalLoad`, `quickWinCount`, `servicesNeedingAttention`, `closeoutSummary`, `timelineItems`.
  - Receives all action handlers from `App.tsx`.
  - Risk: this is the densest visual surface. It mixes high-level dashboard layout with many lane-level sections and many write-capable callbacks.

- `src/components/ProjectStackPanel.tsx`
  - Left panel for missions, standalone projects, and people.
  - Mostly presentational. Filters active missions/projects and limits visible rows.
  - Uses `renderStatusActions`, edit setters, and delete callbacks from `App.tsx`.

- `src/components/MasterChecklistPanel.tsx`
  - Bottom/checklist panel for active todos.
  - Computes ranked todo list locally from priority, quick action, estimate, and title.
  - Shows metric tiles for Todos, Money, Waiting, Projects.
  - Uses `renderStatusActions`, edit setter, delete callback.

- `src/components/ReviewInboxPanel.tsx`
  - Review Inbox lane rendered inside `TodayTimelinePanel`.
  - Converts generic `ReviewInboxItem` actions into email or chat accept/archive/dismiss callbacks.
  - Risk: buttons create work. Any visual redesign must preserve the accept/archive/dismiss mapping and confirmation expectations.

### Talk panel and AI Review surfaces

- `src/components/MemoryWriterPanel.tsx`
  - Right/Talk panel.
  - Renders assistant presence, assistant thread, AI Review surface, capture textarea, confirmation controls, capture draft editor, edit drawer, chat import, and manual create-record drawer.
  - Receives `assistantReply` and `assistantReplyIsAiReview` from `useAssistantCapture()`.
  - Shows AI Review metadata under the assistant reply when `assistantReplyIsAiReview.active`.
  - Suppresses local AI Review preview when the packet-backed review is already shown in Talk.
  - Risk: this file owns both conversational UI and write-capable capture/edit surfaces. Do not combine AI Review visual work with capture form refactors.

- `src/components/AssistantReviewSurface.tsx`
  - Local snapshot-backed AI Review preview and prompt launcher.
  - Builds local preview data from `WorkSnapshot`: quick wins, due-soon todos, due-soon deadlines, blocked todos, waiting todos, stale projects.
  - Buttons set prompt text for modes: reset, wins, forgetting, risk, stale.
  - Shows in-flight state from `AssistantReviewUiState` and reinforces no-write guardrail.
  - Risk: this is not the final packet-backed renderer. It is a local preview and prompt helper; redesign should not make it look like it has changed work.

### Assistant hooks and state flow

- `src/hooks/useAssistantCapture.ts`
  - Owns Talk state: `assistantReply`, `assistantReplyIsAiReview`, `captureText`, `captureStatus`, pending capture, capture draft, appointment report flags.
  - Detects likely AI Review phrasing before route resolution and sets `assistantReplyIsAiReview.status = "checking"`.
  - Calls `window.praxis.assistant.route()` and delegates route effects to `handleAssistantRoute()`.
  - Falls back to `window.praxis.capture.naturalLanguage({ mode: "preview" })` when no assistant route handles the input.

- `src/hooks/assistantRouteHandlers.ts`
  - Converts assistant route results into UI state and side effects.
  - AI Review route path:
    - switches to `morningPlan`
    - sets assistant reply to "Generating a read-only AI Task Review."
    - calls `window.praxis.assistant.generateAIReview({ mode })`
    - renders generated message through `withAiReviewGuardrail()`
    - maps result source to `AssistantReviewUiState.status` of `"model"` or `"fallback"`
    - clears capture text and leaves status as the read-only guardrail
  - Risk: this is the frontend write-boundary nerve center. Redesign work should treat it as behavior-owned, not layout-owned.

- `src/hooks/assistantOperationalActions.ts`
  - Refreshes operational views after mutations and stores assistant contexts.
  - Used by `useAssistantCapture()` for status updates, due date updates, waiting-on changes, and refreshes.

## CSS Layout Map

- `src/App.css`
  - Global theme tokens: dark mission-control palette, `--cyan`, `--gold`, `--green`, `--red`, `--text`, `--muted`, `--dim`.
  - `body` is `overflow: hidden` on desktop. Panels scroll internally.
  - `.app-shell` desktop layout is a fixed top nav plus a three-column grid:
    - left: projects/missions
    - center: Today
    - right: Talk
    - bottom: checklist
  - `.service-health-strip` spans all columns above the main panel row.
  - `.panel` provides shared framed scroll surfaces. `.left`, `.center`, `.right`, `.bottom` position the major panels.
  - Dashboard-specific sections include `.daily-brief-hero`, `.readiness-card`, `.operator-main-grid`, `.timeline-card`, `.priority-stack-card`, `.daily-rhythm-card`, `.focus-card`, `.review-inbox-*`.
  - Talk/AI Review classes include `.assistant-presence-card`, `.assistant-thread`, `.assistant-review-surface`, `.assistant-review-prompts`, `.assistant-review-meta`, `.assistant-reply-text`.
  - Responsive rules:
    - `@media (max-width: 1280px)` compresses shell columns and stacks hero/readiness internals.
    - `@media (max-width: 1020px)` changes `body` to scroll, stacks `.app-shell` to one column, increases top padding for fixed nav, collapses grids, and places all panels in natural order.
  - Risk: the CSS file is monolithic. A dashboard redesign should avoid broad selector edits that affect Talk, settings, forms, and review inbox at the same time.

## Current Data Flow

1. App boot calls `loadWorkModel()`.
2. `loadWorkModel()` reads work, daily brief, email, chat, settings, storage, Slack, and companion snapshots through `window.praxis`.
3. App stores raw snapshots in React state.
4. App derives dashboard-ready values inline:
   - `reviewInboxItems` from email/chat suggestions through shared review-inbox helpers.
   - `upcomingAppointments` and `upcomingDeadlines` from raw work snapshot.
   - integration health and `dashboardReadiness` from settings/storage/slack/companion state.
   - proactive suggestion from work snapshot and daily brief priority items.
5. App passes data and callbacks into panels.
6. Panels render lanes and call callbacks for edits, deletes, accept/dismiss/archive, focus reports, and status changes.
7. Talk input goes through `useAssistantCapture()`:
   - focus follow-up first
   - AI Review preflight flag if text looks like review
   - route via `window.praxis.assistant.route()`
   - route effects in `assistantRouteHandlers.ts`
   - otherwise natural language capture preview
8. AI Review generated text returns through `window.praxis.assistant.generateAIReview()` and is displayed in `MemoryWriterPanel` with metadata and guardrail.

## Safe Implementation Slices

Each slice should have clear file ownership and should not overlap with another active worker.

### Slice 1: Dashboard data selectors

Ownership:
- `src/App.tsx`
- Optional new file: `src/dashboardSelectors.ts`
- Tests if added: `tests/assistant-regression.test.ts` or a new focused script

Goal:
- Extract pure derivation helpers for service health, readiness, timeline items, review inbox composition, and operational-load inputs.
- Keep JSX and CSS unchanged.

Verification:
- `npm run test:assistant`
- `npx tsc --noEmit`
- `npm run lint`
- `npm test` if selector behavior is covered broadly

Risk:
- Low visual risk, medium data risk. Keep function inputs explicit and do not change API calls.

### Slice 2: Today lane component split

Ownership:
- `src/components/TodayTimelinePanel.tsx`
- New child components under `src/components/mission-control/`

Goal:
- Split current Today sections into presentational child components without changing class names:
  - `DailyBriefHero`
  - `ReadinessCard`
  - `TimelineLane`
  - `PriorityStackLane`
  - `DailyRhythmCard`
  - `FocusControls`
  - `AppointmentDeadlineLanes`

Verification:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:assistant`
- Manual visual smoke through `npm run dev` or `npm run build:app` when a UI reviewer is ready

Risk:
- Medium. Prop drilling is already heavy; introduce components only after data shape is stable.

### Slice 3: Mission Control layout CSS

Ownership:
- `src/App.css`
- Optional new file if CSS is imported explicitly from `App.tsx`

Goal:
- Introduce Mission Control layout classes while preserving existing class behavior until markup moves.
- Keep responsive breakpoints isolated.
- Avoid touching Talk/form/settings selectors during dashboard-only work.

Verification:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build:app`
- Browser screenshot smoke at desktop width, 1280-ish, and below 1020px

Risk:
- High visual blast radius because `App.css` is global and shared across dashboard, Talk, settings, forms, and review inbox.

### Slice 4: Talk panel redesign

Ownership:
- `src/components/MemoryWriterPanel.tsx`
- `src/components/AssistantReviewSurface.tsx`
- Talk-specific CSS selectors only in `src/App.css`

Goal:
- Redesign assistant presence/thread/input/AI Review preview as a contained Talk surface.
- Preserve `assistantReplyIsAiReview` metadata rendering and read-only copy.
- Do not change `useAssistantCapture.ts` or `assistantRouteHandlers.ts` in this slice.

Verification:
- `npm run test:assistant`
- `npx tsc --noEmit`
- `npm run lint`
- AI Review Talk smoke for reset/wins/forgetting/risk/stale

Risk:
- High if edit drawers or capture draft controls are moved. Keep write-capable forms stable until Talk shell is proven.

### Slice 5: AI Review UI state polish

Ownership:
- `src/components/AssistantReviewSurface.tsx`
- `src/components/MemoryWriterPanel.tsx`
- `src/hooks/assistantRouteHandlers.ts` only if status labels need behavior changes

Goal:
- Clarify model/fallback/source metadata and in-flight states.
- Preserve guardrail copy and never imply writes.

Verification:
- `npm run test:assistant`
- `npx tsc --noEmit`
- `npm run lint`
- Live Talk smoke with local Ollama enabled and disabled

Risk:
- Medium. The rendering is visible, but the main behavioral risk is accidentally dropping `No work has been changed.`

### Slice 6: Write-capable lane actions

Ownership:
- `ReviewInboxPanel.tsx`, `ActionMenu.tsx`, and any specific lane component being changed
- Avoid owning `assistantRouteHandlers.ts` in the same slice

Goal:
- Restyle or reorganize accept/archive/dismiss/edit/delete/status controls.
- Keep callback mapping identical.

Verification:
- `npm run test:assistant`
- `npm test`
- Manual smoke for Review Inbox accept/archive/dismiss and record edit/delete

Risk:
- High. These controls mutate state and should not be mixed with layout refactors.

## Risky Areas To Avoid Breaking

- `src/App.tsx` currently owns both dashboard data composition and write callbacks. Do not do broad JSX, selector, and action changes together.
- `src/hooks/assistantRouteHandlers.ts` controls AI Review guardrails and actual write-like route handling. Treat this as behavior code, not visual code.
- `src/components/MemoryWriterPanel.tsx` combines Talk, capture draft, edit drawer, chat import, and manual create forms. Avoid moving forms during a visual-only Talk redesign.
- `src/components/ReviewInboxPanel.tsx` maps source kind to email/chat actions. Preserve source routing exactly.
- `src/App.css` is global. Dashboard class edits can unintentionally affect settings, forms, Talk, and AI Review.
- Desktop uses `body { overflow: hidden; }` and panel-local scrolling. Redesigning shell heights can trap content or break mobile scrolling.
- `TodayTimelinePanel` uses many booleans to show/hide brief, focus, appointment report, and status report sections. Do not replace those with new state until the old behavior is covered.

## Suggested First Code Slice

Start with Slice 1: extract dashboard data selectors from `src/App.tsx` into a pure helper module.

Reason:
- It reduces the size and risk of `App.tsx` before any visual redesign.
- It creates stable inputs for future Mission Control lanes.
- It does not require CSS changes.
- It can be reviewed without subjective visual judgment.

Suggested first helper targets:
- `buildReviewInboxItems(emailSnapshot, chatSnapshot)`
- `buildUpcomingAppointments(snapshot, now)`
- `buildUpcomingDeadlines(snapshot)`
- `buildServiceHealthItems(serviceSnapshot, formatDateTime)`
- `buildDashboardReadiness(serviceHealthItems)`

First-slice verification:
- `npx tsc --noEmit`
- `npm run lint`
- `npm run test:assistant`
- `npm test` if helper tests are added

## Build And Test Command Matrix

- Pure selector extraction:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run test:assistant`

- Presentational component split:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run test:assistant`
  - `npm run build:app` before visual review

- CSS/layout redesign:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build:app`
  - Browser screenshot smoke for desktop, 1280px, and mobile under 1020px

- Talk/AI Review UI changes:
  - `npm run test:assistant`
  - `npx tsc --noEmit`
  - `npm run lint`
  - Live Talk smoke for AI Review modes

- Write-capable action surfaces:
  - `npm run test:assistant`
  - `npm test`
  - Manual smoke for the specific action changed

## Blockers And Open Questions

- No hard blocker to planning.
- `dist-electron/main.js` and `dist-electron/preload.mjs` were already modified in the working tree at inspection time; this plan does not touch them.
- The current UI has no dedicated Mission Control route or feature flag. A future redesign needs a decision: replace the current shell in place, or introduce a parallel component behind a toggle while keeping the old dashboard usable.
- The CSS is still a single global file. Before a large visual pass, decide whether to keep global CSS with disciplined sections or split dashboard/Talk CSS into imported files.
- AI Review has two visible experiences: packet-backed Talk output and local snapshot preview. A redesign should decide whether both remain visible, or whether the preview becomes a prompt launcher only.
