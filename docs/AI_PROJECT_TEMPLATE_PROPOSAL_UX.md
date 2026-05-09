# AI Project Template Proposal UX

## Purpose

PRAXIS may notice that the operator repeatedly creates similar project checklists and propose a reusable project template. The proposal must be review-first: AI can draft a template, but the operator decides whether anything is saved.

Templates are markdown-backed creation-time seeds. Saving a template changes only future project creation choices. Existing projects do not update automatically.

## Current Implementation Status

The Review Inbox UI now shows eligible proposals, evidence, boundary copy, inline markdown editing, markdown preview, and an explicit save confirmation. The live card action is `Edit draft`; no markdown is written until `Confirm save`.

Current Review Inbox actions:

- `Edit draft`
- `Save template`
- `Confirm save`
- `Dismiss`
- `Snooze 30 days`
- `Not this template`
- `Do not suggest this again`

Confirmed saves write one markdown file under `memory/templates/project-task-templates/`, validate the markdown, refresh memory indexing, and mark proposal state as accepted with the saved slug/path. `Not this template` rejection is wired, and active saved markdown templates are selectable in project creation for future projects.

## Surfaces

### Primary Surface: Review Inbox

AI template proposals should appear in the existing review-first pattern: Review Inbox inside Today/Command. This keeps the suggestion near other pending confirmations and avoids adding a fake Memory top-nav mode.

Suggested card title:

> Reusable project template found

Suggested body:

> PRAXIS noticed several projects with a similar checklist. Review this draft before saving it as a template.

Suggested metadata:

- Based on: `3 similar projects`
- Proposed template: `Engineering project`
- Tasks: `10`
- Effect: `Only future projects`

Suggested actions:

- `Review template`
- `Dismiss`
- `Do not suggest this again`

### Secondary Surface: Project Create Form

When the operator opens project creation, show a quiet inline suggestion if one is pending:

> PRAXIS has a draft template for this kind of project.

Actions:

- `Review`
- `Dismiss`

Do not auto-select the proposed template. The creation form should keep `No template` as the default unless the operator explicitly chooses a saved template.

### Tertiary Surface: Settings Templates Panel

After templates exist, saved templates should be manageable in Settings under a Templates section. This can wait until after the first proposal flow if the smallest slice saves a markdown template and exposes it in project creation.

## Review-First Tone

Use concise operator language. Avoid excitement, certainty, or pretending the AI is authoritative.

Good:

> PRAXIS noticed a repeated project checklist.

> Review this draft before saving it.

> Saving this template will not change existing projects.

Avoid:

> I created a new template for you.

> Your workflow has been optimized.

> Automatically applying this to your projects.

## Proposal Review Screen

The review screen opens from `Review template`. It should be a focused modal, drawer, or existing details panel. It must show everything that will be saved before the operator confirms.

Header:

> Review Project Template

Summary copy:

> PRAXIS drafted this from repeated project checklists. Edit it before saving. No projects will change automatically.

Fields:

- Template name: editable text input, default `Engineering project`
- Description: editable textarea, optional
- Checklist tasks: editable ordered list
- Source note: read-only summary, for example `Drafted from 3 similar projects`

Default checklist for the engineering project proposal:

1. Contract
2. Billing initial payment
3. Electrical
4. Mechanical
5. Plumbing
6. Grease separator
7. Sign and seal
8. Sent to client
9. Billing final payment
10. Under building department review

Boundary copy:

> This saves a local markdown-backed template only. It will be available when creating future projects. It will not edit existing projects or write to connected providers.

Primary actions:

- `Save template`
- `Cancel`

Secondary actions:

- `Dismiss suggestion`
- `Do not suggest this again`

## Editing the Proposed Checklist

The operator should be able to edit before saving without entering a full template-management system.

Minimum controls:

- Rename any task.
- Add a task.
- Remove a task.
- Reorder tasks.
- Restore suggested tasks before save.

Task-row controls:

- Drag handle or move up/down.
- Task title input.
- Remove button.

Add task behavior:

- Adds a blank task row at the bottom.
- Focuses the new title input.
- Requires a non-empty title before save.

Save validation:

- Template name is required.
- At least one checklist task is required.
- Duplicate task names are allowed but should show a soft warning, not block save.

## Rejecting or Dismissing

Dismissal must be explicit and reversible where possible.

Dismiss:

> Dismiss this suggestion? PRAXIS may suggest a similar template again if the pattern keeps appearing.

Action result:

> Template suggestion dismissed.

Do not suggest this again:

> Stop suggesting this template pattern? Existing projects and saved templates will not change.

Action result:

> PRAXIS will stop suggesting this template pattern.

Never delete operator-created tasks or templates when dismissing an AI proposal.

## Anti-Nagging Rules

PRAXIS should avoid repeated prompts. A proposal should not appear more than once per pattern unless there is a meaningful change.

Suggested rules:

- Show no more than one template proposal card at a time.
- Cool down dismissed patterns for at least 30 days.
- Suppress a pattern permanently when the operator chooses `Do not suggest this again`.
- Do not show a proposal if a matching saved template already exists.
- Do not re-suggest after a minor checklist difference. Require a stronger pattern signal, such as more projects or several newly repeated tasks.
- Do not interrupt capture or project creation with a modal. Surface the suggestion inline or in Review Inbox.

## Existing Projects

Every proposal and save confirmation should state that existing projects will not change automatically.

Required wording near Save:

> Existing projects will not change. This template is only used when creating future projects.

If future UX adds an explicit apply flow, it must be separate:

> Apply missing tasks to selected existing projects

That action should require its own review screen and should not be part of saving the template.

## AI Write Boundary

The trust model is:

- AI may detect a repeated pattern.
- AI may draft a template proposal.
- AI may show why it thinks the template is useful.
- AI may not save, edit, apply, or delete templates without explicit operator confirmation.
- AI may not mutate existing projects.
- AI may not write to Google, Outlook, email, Slack, or any provider.

Review copy:

> AI drafted this proposal. Nothing is saved until you choose Save template.

Save confirmation copy:

> Save this local project template?

Success copy:

> Template saved. It will be available for future projects.

Provider boundary copy:

> No provider calendars, email, or connected services are updated.

## Source Identity

Saved template metadata should preserve where the draft came from without exposing raw payloads.

Safe metadata:

- `sourceKind: ai_template_proposal`
- `sourceRef: stable proposal id`
- `derivedFromCount: number`
- `createdAt`
- `updatedAt`
- `dismissedAt` or suppression marker when rejected

Avoid storing or showing:

- Tokens
- Raw provider payloads
- Secret values
- Encrypted values
- `secure_secrets`
- Full imported message bodies unless already part of an operator-approved local record

Generated project tasks should preserve their own source identity when a saved template is used:

- `sourceKind: project_template`
- `sourceRef: template slug or template id plus version`

One-off tasks added later should use a separate source identity, such as `manual` or the existing capture source.

## Smallest Useful Slice

The smallest useful implementation does not need a full template-management system.

Scope:

1. Detect or seed one AI proposal for `Engineering project`.
2. Show it in Review Inbox as review-first.
3. Open a proposal editor with template name and editable checklist.
4. Save a markdown-backed template only after explicit confirmation.
5. Make the saved template selectable in project creation.
6. When selected, create local project-linked todos from the template at project creation time.
7. Show clear copy that existing projects and providers are unchanged.

Out of scope:

- Applying templates to existing projects.
- Bulk project updates.
- Provider writes.
- Full template gallery.
- Template analytics.
- Automatic task deletion when a template changes.
