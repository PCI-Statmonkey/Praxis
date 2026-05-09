# AI Project Template Proposal Persistence

## Decision

Proposal state should live in SQLite first. Markdown remains canonical for accepted project task templates, but proposal visibility state is application workflow state: dismissals, snoozes, shown counts, and acceptance metadata. Keeping that in SQLite avoids cluttering operator-readable memory with transient anti-nagging records.

Use markdown only after explicit operator confirmation creates or updates a template under:

`memory/templates/project-task-templates/`

No markdown template file should be written by the proposal detector or by Review Inbox display.

## Minimal Schema

Proposed table:

```sql
CREATE TABLE IF NOT EXISTS project_template_proposal_states (
  fingerprint TEXT PRIMARY KEY,
  cluster_id TEXT NOT NULL,
  material_change_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  shown_count INTEGER NOT NULL DEFAULT 0,
  last_shown_at TEXT,
  dismissal_reason TEXT,
  snooze_until TEXT,
  accepted_template_slug TEXT,
  accepted_template_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS project_template_proposal_states_cluster_idx
  ON project_template_proposal_states(cluster_id);

CREATE INDEX IF NOT EXISTS project_template_proposal_states_status_idx
  ON project_template_proposal_states(status);
```

Allowed status values:

- `draft`: proposal has been seen by the system but not acted on.
- `dismissed`: operator dismissed for now; can reappear after cooldown or material change.
- `rejected`: operator explicitly rejected this draft.
- `snoozed`: operator asked to see it later.
- `accepted`: operator accepted and later confirmation flow saved or is expected to save a markdown template.
- `never`: operator chose Do not suggest again for this cluster.

The app should validate statuses in repository code rather than trusting raw strings.

## State Semantics

`fingerprint` is the specific proposal instance key emitted by the detector.

`cluster_id` identifies the recurring project pattern and is the right scope for snooze and Do not suggest again.

`material_change_hash` identifies whether the recurring task evidence changed. A dismissed or rejected proposal may reappear only if this hash changes meaningfully, unless status is `never`.

`shown_count` and `last_shown_at` support Review Inbox throttling.

`dismissal_reason` should be short enum-like copy, not arbitrary raw notes. Suggested values:

- `not_useful`
- `already_have_process`
- `too_noisy`
- `later`
- `other`

`accepted_template_slug` and `accepted_template_path` are populated only after the save-confirmation slice writes the markdown template. The persistence slice can reserve the fields without writing markdown.

## Filtering Detector Output

The pure detector returns proposal drafts. A repository/service layer should filter them against persisted state before Review Inbox sees them.

Filtering rules:

1. If `cluster_id` has any state with `status = never`, suppress all proposals for that cluster.
2. If the exact `fingerprint` has `status = accepted`, suppress it.
3. If the exact `fingerprint` has `status = rejected`, suppress it unless a future decision explicitly allows re-review.
4. If the exact `fingerprint` has `status = dismissed`, suppress until a cooldown expires, for example 30 days.
5. If any state for the same `cluster_id` has `status = snoozed` and `snooze_until` is in the future, suppress the cluster.
6. If the latest state for the same `cluster_id` has a different `material_change_hash`, allow the detector output to reappear unless status is `never`.
7. If a matching active template now exists, detector should already suppress it; repository filtering can also suppress accepted states defensively.

When a proposal is surfaced, update or insert a row:

- `status = draft` if no row exists.
- increment `shown_count`.
- set `last_shown_at` and `updated_at`.
- preserve dismissal/accepted fields if the row already has a terminal status.

## Material Change Rules

A proposal can reappear after dismissal/rejection only when the detector emits the same `cluster_id` but a different `material_change_hash`.

Examples of material changes:

- Several new recurring tasks appear.
- The matched project set changes substantially.
- Task evidence count crosses a stronger threshold.

Non-material changes:

- Project title punctuation changes.
- A single task title spelling change normalizes to the same slug.
- Task order changes without evidence change.

The repository should not compute materiality itself. It should trust the detector hash and use it as a gate.

## Do Not Suggest Again Scope

Do not suggest again should be cluster-scoped, not fingerprint-scoped.

Reason:

- A fingerprint can change when task evidence changes.
- The operator intent is usually about the recurring project pattern, not one exact draft.

Store `status = never` with the `cluster_id` and current fingerprint. Future detector output with the same cluster id is suppressed regardless of material hash.

If future UX needs reversal, Settings can expose suppressed template proposal patterns.

## Accepted Flow Boundary

Acceptance should remain a two-step boundary:

1. Operator accepts/reviews the proposal state.
2. A later confirmation flow writes the markdown template.

The persistence layer may mark `accepted` only after the explicit save action starts or succeeds, depending on implementation:

- Safer option: write markdown first, then mark `accepted` with slug/path.
- If save fails, keep status `draft` or `snoozed` and show the error.

Accepted proposal state must not mutate existing projects. Existing project todos remain normal local records. Future projects can use the saved markdown template as a creation-time seed.

## Tests Needed

Repository/service tests should cover:

- New detector proposal inserts draft state when shown.
- `shown_count` increments and `last_shown_at` updates.
- Dismissed exact fingerprint is suppressed during cooldown.
- Snoozed cluster is suppressed until `snooze_until`.
- Rejected exact fingerprint is suppressed.
- `never` suppresses all future proposals for the cluster, including material changes.
- Same cluster with different `material_change_hash` can reappear after dismissal.
- Accepted proposal is suppressed and stores template slug/path after save.
- Existing equivalent markdown template suppresses proposals even without proposal state.
- No markdown files are written by persistence filtering.

Pure tests should keep using local ids, safe titles, counts, hashes, and normalized task evidence only.

## Smallest Safe Implementation Slice

Slice 1 persistence:

1. Add SQLite table and guarded migration.
2. Add a small repository for proposal state CRUD:
   - `listProposalStates`
   - `recordProposalShown`
   - `dismissProposal`
   - `rejectProposal`
   - `snoozeProposal`
   - `neverSuggestProposal`
3. Add a pure/service filter that takes detector proposals plus states and returns Review Inbox-eligible proposals.
4. Add tests for suppression and material-change behavior.
5. Do not wire UI yet.
6. Do not write markdown templates yet.
7. Do not call AI.

Slice 2 UI:

1. Show eligible proposals in Review Inbox.
2. Wire dismiss/snooze/reject actions to proposal state.
3. Keep `Review template` read-only until the save-confirmation slice.

Slice 3 confirmation:

1. Add proposal review editor.
2. Save markdown template only after explicit confirmation.
3. Mark proposal `accepted` with template slug/path after successful write.

