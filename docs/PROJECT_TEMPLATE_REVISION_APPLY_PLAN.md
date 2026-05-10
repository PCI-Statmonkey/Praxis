# Project Template Revision And Apply Plan

## Purpose

Saved project task templates are creation-time seeds. The next template work should let PRAXIS notice
when a saved markdown template may need revision, and later let the operator apply a template to
selected existing projects. Both flows must stay review-first and must not mutate existing projects
or overwrite markdown automatically.

## Current Boundary

Already implemented:

- Repeated-project detection can propose a new markdown-backed project task template.
- Proposal state suppresses dismissed, rejected, snoozed, accepted, and never-suggest-again patterns.
- Review Inbox can edit and confirm-save a new template markdown file under
  `memory/templates/project-task-templates/`.
- Settings can list saved/built-in templates and clear reversible hidden proposal states.
- Project creation can explicitly select a saved active template and seed future project todos.

Still out of scope until a later explicit confirmation slice:

- Automatic edits to existing markdown templates.
- Automatic task creation on existing projects.
- Bulk project mutation.
- Provider writes or provider calendar write-back.

## Revision Proposals

Revision proposals are for saved markdown templates that no longer cover repeated project behavior.
They should be framed as possible updates to an existing template, not as another new-template
proposal.

### Inputs

Use only local PRAXIS data:

- Active saved markdown templates and parsed task items.
- Project records and project-linked todos.
- Todo source identity, especially `sourceKind = "project_template"` and template `sourceRef`.
- Existing proposal state for anti-nagging.

Do not use provider payloads, OAuth records, token rows, encrypted values, `secure_secrets`, or raw
email/calendar data.

### Eligibility

A revision proposal is eligible only when:

- The saved template is active and markdown-backed.
- At least three projects using, matching, or strongly resembling the template show a repeated
  difference.
- The difference is material: several repeated additions, strong rename evidence, or a repeated
  reordering that changes operational sequence.
- The same template revision fingerprint has not been accepted, rejected, snoozed, or permanently
  suppressed.
- The proposed change does not remove operator-authored template tasks automatically.

Not material:

- One extra project with the same pattern.
- Timestamp-only changes.
- Minor wording differences after normalization.
- A one-off task that does not repeat across projects.

### Draft Shape

The first implementation should return a pure in-memory/read-only draft:

```ts
type ProjectTemplateRevisionProposal = {
  id: string;
  status: "draft";
  templateSlug: string;
  templatePath: string;
  currentVersion: 1;
  proposedVersion: 1;
  proposalFingerprint: string;
  materialChangeHash: string;
  basedOnProjectIds: string[];
  changes: Array<
    | { kind: "add_task"; taskSlug: string; title: string; evidenceProjectIds: string[] }
    | { kind: "rename_task"; fromTaskSlug: string; toTitle: string; evidenceProjectIds: string[] }
    | { kind: "reorder_task"; taskSlug: string; afterTaskSlug: string | null; evidenceProjectIds: string[] }
    | { kind: "keep_task"; taskSlug: string; title: string }
  >;
  markdownDraft: string;
  writeBoundary: {
    saved: false;
    writesOnConfirmOnly: true;
    existingProjectsChange: false;
    providerWrites: false;
  };
};
```

Removal suggestions should be informational in the first revision slice. Do not generate a markdown
draft that deletes a task unless a later UI explicitly separates `archive/remove from template` from
normal revision acceptance.

Versioning note: the current template parser supports only `version: 1`. Confirmed revision writes
must either keep `version: 1` or wait until a separate parser/project-creation update supports
template versions greater than 1.

### Confirmation Model

Revision acceptance must be a separate confirmation from viewing the proposal.

Safe behavior:

- Show a diff-style review of additions, renames, and order changes.
- Let the operator edit the markdown draft before saving.
- Validate the markdown before and after writing.
- Preserve `version: 1` until template parsing supports higher versions, or add higher-version
  parser/project-creation support as a prerequisite.
- Write only the selected markdown template file after confirmation.
- Refresh the memory index.
- Mark revision proposal state accepted with template slug/path/version.

Unsafe behavior:

- Rewriting a template when a proposal appears.
- Applying the revised template to existing projects.
- Deleting existing project todos because a template changed.
- Updating provider calendars or external services.

## Apply Template To Existing Projects

Applying a template to existing projects must be separate from saving or revising a template.

### Preview First

The first apply slice should be preview-only:

- Operator selects one template.
- Operator selects one or more existing projects.
- PRAXIS computes missing tasks by canonical task identity and source identity.
- PRAXIS shows a per-project preview of tasks that would be added.
- PRAXIS shows conflicts or likely duplicates.
- No todos are created in the preview slice.

Suggested preview shape:

```ts
type ProjectTemplateApplyPreview = {
  templateSlug: string;
  templateVersion: number;
  projectPreviews: Array<{
    projectId: string;
    projectTitle: string;
    missingTasks: Array<{
      taskSlug: string;
      title: string;
      priority: "low" | "normal" | "high" | "critical";
      sourceRef: string;
    }>;
    duplicateWarnings: Array<{
      templateTaskSlug: string;
      existingTodoId: string;
      existingTitle: string;
    }>;
  }>;
  writeBoundary: {
    createsTodos: false;
    writesOnConfirmOnly: true;
    editsExistingTodos: false;
    providerWrites: false;
  };
};
```

### Later Confirmed Apply

A later confirmed apply flow may create missing project-linked todos only for selected projects and
selected tasks.

Rules:

- Require explicit operator confirmation after preview.
- Create only missing tasks that remain selected.
- Preserve existing todos, including completed, paused, blocked, waiting-on, and manually created
  items.
- Do not delete, rename, reorder, or complete existing todos.
- Set source identity on created todos, for example
  `sourceKind = "project_template"` and `sourceRef = "<slug>:v<version>:<task-order>-<task-slug>"`.
- Return a clear result: created count, skipped duplicate count, and selected project count.

## State And Anti-Nagging

Revision proposal state can reuse the proposal-state concept but should have separate proposal type
identity so accepted new-template proposals are not confused with revision proposals.

Required identity:

- `proposalType`: `new_template` or `template_revision`.
- `templateSlug` and `templatePath` for revision proposals.
- `proposalFingerprint` for the exact draft.
- `materialChangeHash` for meaningful future resurfacing.
- `status`: draft, dismissed, rejected, snoozed, accepted, never.
- Accepted revision metadata: template slug, template path, and accepted version.

Do not clear accepted revision state through the existing hidden-pattern reversal UI unless a future
Settings flow explicitly supports revision history management.

The first pure detector slice should not depend on persisted revision anti-nagging. Before Review
Inbox surfacing or persisted filtering, add an explicit schema/API migration for `proposalType`,
revision template identity, and accepted revision metadata.

## Canonical Task Matching

Apply preview duplicate detection must handle both template-created todos and manually created or
legacy todos.

Matching order:

- Exact template source identity: `sourceKind = "project_template"` and a `sourceRef` for the same
  template slug/version/task.
- Canonical template task slug: strip leading ordinal prefixes such as `01-` from parsed markdown
  task slugs before comparing with normalized proposal/manual task slugs.
- Normalized title fallback: use the same deterministic task-title normalization used by project
  template proposal detection.

Tests should cover exact `sourceRef`, ordinal-prefixed markdown slugs, and manual todos without
source identity.

## Test Strategy

Pure selector tests:

- Builds no revision proposal when an active saved template already covers repeated project tasks.
- Builds an add-task revision proposal when several projects repeat missing task slugs.
- Builds a rename suggestion only when normalized evidence strongly maps old and new titles.
- Does not generate removal writes in the first revision slice.
- Produces stable fingerprints and material-change hashes.
- Does not require persisted revision state in the first pure detector slice.

Repository tests:

- Revision proposal snapshot reads do not write SQLite or markdown.
- Revision proposal state migration separates new-template and template-revision state before
  persisted filtering is added.
- Confirmed revision validates markdown, preserves `version: 1` until higher versions are supported,
  writes only the selected template file, refreshes the memory index, and records accepted revision
  state.
- Confirmed revision refuses path traversal and unknown template slugs.
- Accepted new-template states remain separate from revision states.

Apply preview tests:

- Preview computes missing tasks for selected projects without creating todos.
- Preview skips existing equivalent tasks by source identity, canonical task slug, and normalized
  title fallback.
- Preview reports duplicate warnings without mutating existing todos.
- Preview preserves completed/blocked/waiting-on todos as existing context instead of replacing them.
- Future confirmed apply creates only selected missing tasks and sets source identity.
- Provider calendars, email, Slack, and external services are untouched.

UI tests or QA:

- Review Inbox copy says revision is staged and existing projects will not change.
- Settings Templates copy separates editing a template from applying it to projects.
- Apply preview requires project selection and confirmation before any task creation.
- Narrow layouts keep diff/preview rows readable and action buttons reachable.

## Recommended Implementation Order

1. Add pure revision proposal types, detector, and tests. No UI, no persisted filtering, and no
   writes.
2. Add schema/API support for revision proposal state, including `proposalType`, revision template
   identity, and accepted revision metadata.
3. Surface revision proposals in Review Inbox as read-only drafts with dismiss/snooze/reject/never.
4. Add template parser/project creation support for template versions greater than 1, or keep
   confirmed revisions at `version: 1`.
5. Add explicit revision editor and confirmed markdown update path.
6. Add apply-template preview for selected existing projects. No todo creation.
7. Add confirmed apply path for selected missing tasks only.
