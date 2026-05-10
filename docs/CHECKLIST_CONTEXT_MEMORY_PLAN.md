# Checklist Grouping And Context-Memory Plan

## Purpose

Make Checklist and memory context work like operating surfaces rather than separate piles. Checklist
should group tasks by the context the operator is actually working in, while memory-backed documents
should support orientation without becoming a fake top-nav destination again.

## Current State

- `MasterChecklistPanel` shows active todos, ranks quick/urgent/short work first, and groups the top
  eight todos by project/mission context.
- Checklist has only `All Active` and `Quick/Urgent` filters.
- Project and mission context is inferred from linked project and mission records.
- Memory-backed documents are indexed from markdown and shown as a simple list in Today/Command.
- Structured work state is SQLite-first; markdown memory is the human-facing long-form layer.
- Suggestion context is runtime operational state in SQLite and should not move to markdown memory.

## Design Principles

- SQLite remains the source of truth for operational task status, due dates, waiting-on, and links.
- Markdown memory remains the durable narrative/context layer.
- Checklist grouping should help the operator decide where to work, not merely sort todos.
- Memory context should appear where it explains a project, mission, person, day, or template.
- No provider writes, no AI writes, and no automatic project mutation.

## Checklist Group Model

Add explicit group lanes derived from existing structured facts:

- `Top Move`: the current best next action from AI Review/proactive suggestion.
- `Due / Overdue`: active todos and deadlines with due pressure.
- `Waiting On`: active waiting-on todos grouped by person.
- `Mission / Project`: linked todos grouped by mission, then project.
- `Money`: money-related todos and finance-adjacent work.
- `Quick Wins`: quick-action or short-estimate tasks.
- `Standalone`: active todos without project context.

Initial implementation can keep these as computed selectors. Do not add schema until a user-created
custom group concept is actually needed.

## Checklist UX

Focused Checklist should show:

- a compact status strip with active, due, waiting, money, and quick counts,
- tabs or segmented controls for `Now`, `Due`, `Waiting`, `Projects`, `Money`, and `All`,
- each group with no more than five visible items before `show more`,
- badges for project, mission, waiting-on person, due date, estimate, priority, and money,
- direct existing actions: complete/pause/reactivate, edit, delete,
- an entry point to Talk/capture for new tasks.

Command mode should show only:

- Top Move,
- Due / waiting counts,
- first two urgent checklist items,
- link to full Checklist.

## Context-Memory Surface

Replace the generic memory document list with contextual lanes:

- `Today`: daily brief markdown and recent closeout notes.
- `Project Context`: markdown mirrors for visible/active projects.
- `Mission Context`: mission markdown mirrors for active mission anchors.
- `People Context`: profiles for waiting-on people or people involved in current Review Inbox items.
- `Templates`: project task templates when creating or revising projects.
- `Inbox/Imported Context`: email/chat summary docs only as summarized/indexed artifacts.

Memory should be discoverable from Today/Command and relevant project/person surfaces. It should not
return as a fake standalone Memory top-nav mode.

## Data Shape

Add a shared selector contract before UI changes:

```ts
type ChecklistContextGroup = {
  id: string;
  kind: "top_move" | "due" | "waiting" | "project" | "money" | "quick" | "standalone";
  label: string;
  count: number;
  todoIds: string[];
  projectId?: string | null;
  missionId?: string | null;
  personId?: string | null;
};

type MemoryContextLane = {
  id: string;
  kind: "today" | "project" | "mission" | "person" | "template" | "inbox";
  label: string;
  documentPaths: string[];
  relatedEntityIds: string[];
};
```

Keep these selectors pure and testable in `shared/` or `src/dashboardSelectors.ts` before touching
large JSX.

## Implementation Phases

Phase 1: Pure selectors

- Done: build checklist context groups from todos, projects, missions, people, and top-move context.
- Done: build memory context lanes from indexed memory documents and current work graph.
- Done: add regression tests for grouping and stable ordering.
- Later: fold deadlines and proactive suggestion context into the same selector layer when the UI
  consumes it.

Phase 2: Checklist UI

- Done: update `MasterChecklistPanel` to consume selector groups.
- Done: add filter tabs for the group lanes.
- Done: preserve existing edit/status/delete actions.
- Done: keep Command mode compact.

Phase 3: Context-memory UI

- Done: replace Today's simple memory document list with context lanes.
- Done: add project/mission/person relevant document lanes.
- Done: keep reindex/repair controls in Settings > Storage.

Phase 4: AI Review tie-in

- Let AI Review suggested stable IDs highlight relevant checklist group(s).
- Do not let model output create groups or write memory docs.

## Verification

- Unit tests for selectors and stable sort.
- `npx tsc --noEmit`, lint, assistant regression, sync regression, build, storage check.
- Manual desktop/narrow QA for no overflow, all existing checklist actions reachable, and no fake
  Memory nav return.

## Open Decisions

- Whether `Top Move` belongs in Checklist full view or only Mission Control.
- Whether custom user-created checklist groups are V1.1 or later.
- Whether person-context docs should surface only for waiting-on people or also Review Inbox senders.
- How much of markdown memory should be shown on narrow screens before it becomes clutter.
