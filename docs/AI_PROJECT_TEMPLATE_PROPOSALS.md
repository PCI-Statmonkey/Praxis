# AI Project Template Proposals

## Purpose

PRAXIS should be able to notice repeated project work patterns and ask the operator whether to create or revise a project task template. The system must keep templates markdown-backed, keep runtime work as normal todos, and preserve an explicit review boundary before any template file is written.

Example operator-facing prompt:

> You have done projects like this one several times, and these tasks appear to repeat. Want to review a new template?

## Data Available for Detection

The detector can use only local PRAXIS work data:

- Project records: title, summary, status, due date, mission relationship, markdown path.
- Project-linked todos: title, status, priority, due date, estimate, quick action flag, money flag, waiting-on person, source kind, source ref.
- Existing project task templates under `memory/templates/project-task-templates/`.
- Template-instantiated todo source identity, especially `sourceKind = "project_template"` and stable `sourceRef` values.
- Mission context for grouping similar operational categories.

The detector should not use provider payloads, OAuth data, calendar write-back state, or secrets.

## Suggestion Threshold

Slice 1 should avoid noisy suggestions. A conservative threshold:

- At least 3 completed or active projects with similar normalized project names or similar task clusters.
- At least 5 recurring task titles shared across those projects after normalization.
- At least 60% overlap in the recurring task set across the candidate project cluster.
- No active template with the same slug or substantially equivalent task set.
- Do not suggest more than once per candidate cluster unless the underlying task set changes materially.

Future slices can add a dismissal ledger so rejected suggestions do not keep resurfacing.

## Task Set Comparison

Task comparison should be deterministic first:

- Normalize titles by lowercasing, trimming punctuation, collapsing whitespace, and removing common filler words.
- Preserve domain phrases such as `sign and seal`, `grease separator`, and `building department review`.
- Treat source identity as evidence, not as the only grouping mechanism. Manually added project todos should count.
- Score overlap with stable task slugs, for example `billing-initial-payment`, `electrical`, `plumbing`.
- Prefer completed or repeatedly retained tasks over canceled/deleted tasks.
- Keep order based on the median order in historical projects when available, then by common operational sequence.

AI can help phrase labels, summarize the reason, and propose a task order, but deterministic matching should decide whether the suggestion is eligible.

## Draft Template Representation

Before confirmation, an AI proposal should be an in-memory or DB-backed draft record, not a markdown file write.

Suggested shape:

```ts
type ProjectTemplateProposal = {
  id: string;
  status: "draft" | "accepted" | "rejected";
  proposedSlug: string;
  proposedLabel: string;
  proposedVersion: number;
  source: "ai_proposal";
  basedOnProjectIds: string[];
  evidence: Array<{
    taskSlug: string;
    title: string;
    projectIds: string[];
    occurrenceCount: number;
  }>;
  markdownDraft: string;
  explanation: string;
  createdAt: string;
  updatedAt: string;
};
```

The draft markdown should use the same canonical format as saved templates:

```markdown
---
kind: project_task_template
slug: example-project
label: Example Project
version: 1
status: active
source: ai_confirmed
---

# Example Project

## Tasks

- [ ] First task
- [ ] Second task
```

## Review, Confirm, Reject

Review flow:

1. PRAXIS shows the proposal reason and the projects/tasks used as evidence.
2. Operator can edit the label, slug, task titles, task order, and status before saving.
3. Operator can accept, reject, or dismiss for later.
4. Accept writes the markdown file once.
5. Reject records the rejection so the same cluster is not repeatedly suggested.

The AI must not silently write or mutate template files. The UI copy should make the boundary explicit: accepting creates or updates a template file, not existing projects.

## Markdown Write Rules

Saved template path:

`memory/templates/project-task-templates/<slug>.md`

Write rules:

- Create a new markdown file only after confirmation.
- If the target file exists, require an explicit update confirmation.
- Do not overwrite operator edits automatically.
- Preserve human-readable task order and frontmatter.
- Use `source: ai_confirmed` for templates accepted from AI proposals.
- Use version increments for confirmed edits, such as `version: 2`.

Existing projects must not auto-mutate after a template file changes. Templates remain creation-time seeds only.

## Template Edit Proposals

When an existing template appears stale, PRAXIS can propose an edit draft:

- Compare new repeated task evidence against the existing markdown template.
- Show additions, removals, renames, and reorder suggestions.
- Require explicit confirmation before writing a new markdown version.
- Do not rewrite existing project todos.
- Future projects using the template should instantiate from the confirmed markdown version.

## Audit and Source Identity

Runtime project tasks remain normal todos:

- `projectId` points to the created project.
- `sourceKind = "project_template"` for template-instantiated tasks.
- `sourceRef = "<template-slug>:v<version>:<task-order>-<task-slug>"`.

AI proposal audit should capture:

- Proposal id.
- Source project ids.
- Recurring task evidence.
- Whether the operator accepted or rejected.
- Final template slug/version if accepted.
- Timestamp and local operator action.

No provider writes are involved.

## Tests Before Implementation

Pure selector and repository tests should cover:

- Normalizing equivalent task titles into stable slugs.
- Detecting a repeated project cluster above threshold.
- Ignoring clusters below threshold.
- Excluding already-covered task sets when an active template exists.
- Building a draft markdown template from deterministic evidence.
- Requiring explicit confirmation before writing markdown.
- Writing a confirmed template only to `memory/templates/project-task-templates/`.
- Preserving existing projects and todos when a template changes.
- Source identity on future instantiated todos remains stable.
- Reject/dismiss state prevents repeated prompts.

## Smallest Safe Implementation Slice

Slice 1 should be deterministic and no-write by default:

1. Add a pure proposal detector over local projects and project-linked todos.
2. Add task title normalization and overlap scoring.
3. Return a `ProjectTemplateProposal` draft object with markdown text and evidence.
4. Add tests for threshold, overlap, existing-template suppression, and markdown draft shape.
5. Do not add UI writes yet.
6. Do not write markdown files until a later confirmation slice.

Slice 2 can add the review UI and confirmation action that writes the markdown file.

