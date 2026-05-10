# Provider Calendar Reconciliation Plan

## Purpose

Define the safe path for later update/delete/reconcile behavior for PRAXIS-created provider calendar
events. This plan depends on create-only publish live QA passing first.

## Boundary

Provider appointments imported from Google or Outlook remain provider-owned and read-only inside
PRAXIS. Only events created from PRAXIS local time blocks and tracked in `time_block_publishes` may
enter reconciliation flows.

## Required Trust Model

- Local time blocks remain the source of truth.
- Provider writes must be explicit-confirmation only.
- AI and deterministic planning may stage local blocks, but they must not publish, update, delete, or
  reconcile provider events automatically.
- Reconciliation must not expose OAuth tokens, refresh tokens, client secrets, raw provider payloads,
  encrypted secret values, or `secure_secrets`.

## Status States

Existing states:

- `published`: provider event identity was created and stored.
- `publish_failed`: provider write failed with a sanitized error.
- `deleted_remote`: provider event identity exists locally but the remote event is gone.
- `stale_local`: local time block changed after the last successful publish.

Future reconciliation should use these states before adding more.

## Phase 1: Detect Only

Add a read-only check for published records:

- Fetch the provider event by `providerEventId`.
- If missing or canceled remotely, mark a preview item as `deleted_remote`.
- If local title/start/end/notes differ from the provider event marker snapshot, mark preview as
  `stale_local`.
- Do not write provider calendars in this phase.

Output should be a preview surface, not an automatic mutation.

## Phase 2: Confirmed Update

For `stale_local` records only:

- Show exact local block title/start/end/body that would replace the provider event.
- Require explicit confirmation.
- Update only the tracked provider event ID.
- Store `lastPublishedAt`, clear `lastError`, and return to `published`.
- If provider update fails, store `publish_failed` with a sanitized error.

## Phase 3: Confirmed Delete

For canceled/deleted local blocks that have a tracked `published` provider event:

- Show the provider event title/time and local block identity.
- Require explicit confirmation.
- Delete only the tracked provider event ID.
- Mark the publish record `deleted_remote` or add a later `deleted_by_praxis` state if audit clarity
  requires it.

## UI Requirements

- Local block badges must distinguish published, stale, failed, and deleted-remote states.
- Update/delete controls must live near the publish-state badge, not inside AI Draft Plan.
- Preview must show counts for ready, blocked, stale, failed, and deleted-remote items.
- Retry/update/delete buttons must stage a preview first.

## Tests

Pure tests:

- Stale detection from local/provider field differences.
- Deleted-remote detection from provider missing/canceled responses.
- Confirmed update refuses untracked provider events.
- Confirmed delete refuses imported provider-owned appointments.
- Sanitized provider update/delete failures.

Repository/API tests:

- `stale_local` and `deleted_remote` state transitions.
- Duplicate provider event IDs remain blocked.
- Failed update/delete attempts preserve retryability.

Manual QA:

- Create-only publish first.
- Edit local block, preview stale update, confirm provider update.
- Delete/cancel local block, preview provider delete, confirm provider delete.
- Verify no imported provider-owned appointment can be updated or deleted from PRAXIS.

## Go/No-Go

Do not implement provider update/delete until create-only live QA has passed for at least one provider
and the operator accepts the audit/preview copy.
