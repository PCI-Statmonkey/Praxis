# AI Project Template Proposal Dismissal UX

## Purpose

Project template proposals must feel review-first and easy to silence. The operator should be able to defer, reject, or permanently suppress a suggestion without worrying that PRAXIS wrote a template, changed projects, or will keep asking the same question.

These states define how Review Inbox proposal cards defer, reject, save, or permanently suppress AI project template proposals.

## Current Implementation Status

The current Review Inbox implementation supports `Edit draft`, explicit `Confirm save`, `Dismiss`, `Snooze 30 days`, and `Do not suggest this again`.

`Not this template` remains future explicit-confirmation work. Saved templates are written only after `Confirm save`; existing projects and connected providers are not changed.

## State Meanings

### Dismiss

Use `Dismiss` when the operator does not want to deal with the suggestion right now, but has not judged the template itself.

Meaning:

- Hide this card now.
- Keep the proposal eligible to return later.
- Do not write a template.
- Do not change projects.
- Do not mark the pattern as bad.

Recommended button label:

- `Dismiss`

Confirmation copy:

> Dismiss this suggestion for now? PRAXIS may show it again if the pattern keeps appearing.

Result copy:

> Suggestion dismissed. Nothing was saved.

### Not This Template

Use `Not this template` when the operator reviewed the proposed checklist and decided this draft is wrong or not useful, but may still want future template suggestions for similar work.

Meaning:

- Reject this specific proposed template shape.
- Suppress the same task set unless evidence materially changes.
- Allow future proposals for a substantially different template.
- Do not write a template.
- Do not change projects.

Recommended button label:

- `Not this template`

Confirmation copy:

> Reject this draft template? PRAXIS will not show this same checklist again unless the evidence changes meaningfully.

Result copy:

> Draft rejected. PRAXIS will not repeat this same template suggestion.

### Snooze

Use `Snooze` when the operator may want the proposal later but wants a clear quiet period.

Meaning:

- Hide this proposal until a selected date or standard interval.
- Do not write a template.
- Do not change projects.
- Resume eligibility after the snooze expires only if the proposal is still relevant.

Recommended button labels:

- `Snooze`
- `Snooze 30 days`
- `Remind me later`

Recommended default:

- `Snooze 30 days`

Confirmation copy:

> Hide this suggestion for 30 days? Nothing will be saved or changed.

Result copy:

> Suggestion snoozed for 30 days.

### Do Not Suggest This Again

Use `Do not suggest this again` when the operator wants to permanently suppress this proposal pattern.

Meaning:

- Suppress this pattern permanently.
- Do not show future proposals with the same fingerprint or substantially equivalent checklist.
- Do not write a template.
- Do not change projects.
- Allow unrelated template proposals.

Recommended button label:

- `Do not suggest this again`

Confirmation copy:

> Stop suggesting this template pattern? Existing projects, saved templates, and provider data will not change.

Result copy:

> PRAXIS will stop suggesting this template pattern.

## Button Hierarchy

Review Inbox card:

- Primary: `Review template`
- Secondary: `Snooze 30 days`
- Secondary: `Dismiss`
- Overflow/destructive: `Do not suggest this again`

Proposal review screen:

- Primary: `Save template`
- Secondary: `Snooze`
- Secondary: `Not this template`
- Secondary: `Dismiss`
- Overflow/destructive: `Do not suggest this again`

Avoid placing `Do not suggest this again` next to `Save template` as a peer primary action. It is a strong suppression action and should be clear but not easy to hit accidentally.

## When PRAXIS May Show a Suggestion Again

Dismissed:

- May reappear after a quiet period, such as 7 days.
- May reappear sooner only if the operator opens a project-template review area deliberately.
- Should not reappear multiple times in the same session.

Snoozed:

- Must not reappear before `snoozeUntil`.
- After `snoozeUntil`, may reappear if the evidence still meets threshold.

Not this template:

- Must not reappear with the same proposal fingerprint.
- May reappear only if materially changed evidence produces a different checklist, stronger project cluster, or changed recommendation.

Do not suggest this again:

- Must not reappear for the same pattern.
- May still allow unrelated template suggestions.

Accepted:

- Must not reappear as a new-template suggestion for the same template pattern while an active saved template exists.
- Future proposals should be framed as template revision proposals, not new-template proposals.

## Materially Changed Evidence

The UI should explain material change in plain language.

Operator-facing wording:

> PRAXIS may suggest this again only if the pattern changes meaningfully, such as several new matching projects or a different repeated checklist.

More detailed review wording:

> This is being shown again because PRAXIS found new repeated tasks that were not part of the earlier draft.

Material changes can include:

- More matching projects, for example 3 became 6.
- More recurring tasks above threshold.
- A materially different task set.
- A saved template no longer covers the repeated checklist.
- The operator created several new one-off project tasks that repeat across projects.

Material changes should not include:

- Minor wording changes.
- One extra matching project with the same task set.
- Timestamp-only changes.
- Reordering that does not change the actual work.
- Evidence already covered by an active saved template.

## After Acceptance

Acceptance is the only state that can lead to a template write, and only after explicit confirmation.

Required behavior:

- Save the markdown-backed template after the operator confirms.
- Mark the proposal `accepted`.
- Store final template slug/version.
- Suppress future new-template prompts for the same pattern.
- Show the saved template in project creation.
- Do not apply the template to existing projects.
- Do not write to providers.

Success copy:

> Template saved. It will be available for future projects.

Boundary copy:

> Existing projects were not changed. No connected providers were updated.

If the same pattern appears later:

> PRAXIS found possible updates to the saved template.

Do not say:

> PRAXIS created tasks for your existing projects.

## Copy Rules

Use:

- `noticed`
- `draft`
- `review`
- `save`
- `future projects`
- `nothing was saved`
- `existing projects will not change`

Avoid:

- `created`
- `applied`
- `optimized`
- `automatically`
- `fixed`
- `you should`
- any wording that implies the AI has already written files

Safe card copy:

> PRAXIS noticed a repeated project checklist. Review this draft before saving it as a template.

Safe dismissal copy:

> Nothing was saved. Existing projects will not change.

Safe snooze copy:

> PRAXIS will hide this suggestion until then.

## Data Needed Later

Each proposal needs enough state to avoid nagging:

- `proposalId`
- `proposalFingerprint`
- `clusterId`
- `materialChangeHash`
- `status`
- `lastShownAt`
- `shownCount`
- `dismissedAt`
- `dismissReason`
- `snoozeUntil`
- `doNotSuggestAgain`
- `acceptedAt`
- `acceptedTemplateSlug`
- `acceptedTemplateVersion`

Use local PRAXIS ids and normalized task slugs. Do not store or display raw provider payloads, tokens, encrypted values, `secure_secrets`, or full imported message bodies.
