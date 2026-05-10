# Provider Calendar Write-Back Plan

## Purpose

Calendar write-back should publish selected PRAXIS local time blocks to Google or Outlook only after
the local planning loop is proven and the operator explicitly confirms each publish action. Imported
appointments remain provider-owned records. PRAXIS-created local time blocks remain local until a
separate publish step creates provider events.

## Current Boundary

Already implemented:

- Google and Outlook calendar OAuth use read-only calendar scopes.
- Provider events import into local appointment records with source/external identity.
- Local time blocks are `source=local` and can be created, edited, completed, canceled, and deleted
  without provider writes.
- Schedule Review and AI Draft Plan can stage local block suggestions but do not auto-create or
  publish anything.

Still out of scope until implementation:

- Requesting provider write scopes.
- Creating, updating, or deleting Google/Outlook events.
- Two-way sync for PRAXIS-created provider events.
- Automatic publish based on AI/deterministic planning suggestions.

## Required Confirmation Model

Write-back should be a publish flow, not a sync side effect:

- Operator selects local planned time blocks.
- PRAXIS shows destination provider/calendar, event title, start/end, notes, and linked work context.
- PRAXIS shows conflicts against imported appointments and already-published PRAXIS events.
- Operator confirms publish.
- PRAXIS writes only the selected blocks to the selected provider calendar.
- Result reports published count, skipped count, provider errors, and created provider event IDs
  without exposing raw provider payloads or tokens.

AI Draft Plan and Schedule Review may recommend blocks, but must not publish them.

## Storage Model

Add provider publish identity without changing imported appointment ownership:

```ts
type TimeBlockPublishRecord = {
  id: string;
  timeBlockId: string;
  provider: "google" | "outlook";
  calendarConnectionId: string;
  providerCalendarId: string;
  providerEventId: string;
  status: "published" | "publish_failed" | "deleted_remote" | "stale_local";
  lastPublishedAt: string;
  lastError: string | null;
};
```

Recommended table:

- `time_block_publishes`
- Unique key on `(provider, calendar_connection_id, provider_event_id)`.
- Unique active publish key on `(time_block_id, provider, calendar_connection_id)` so duplicate
  publishes are avoided.
- Store provider event IDs and safe status metadata only. Do not store raw event payloads.

## Provider Scope Upgrade

Current calendar scopes are read-only. Write-back requires an explicit setup change:

- Google: add a Calendar event write scope such as `calendar.events`.
- Outlook: add Microsoft Graph delegated write permission such as `Calendars.ReadWrite`.
- Settings should show the scope upgrade as a separate capability, with reconnect required.
- Existing read-only sync should continue to work when write-back is not configured.

## Publish Semantics

First implementation should support create-only publish:

- Publish only `planned` local blocks.
- Do not publish canceled or completed blocks.
- Do not update or delete provider events in the first slice.
- If a selected block already has an active publish record, skip it and report it as already
  published.
- Provider event body should include a clear PRAXIS marker and linked local time block ID so later
  sync/reconcile can identify PRAXIS-created events.

Later slices may support update/delete reconciliation, but only after explicit UI and tests exist.

## Test Strategy

Pure tests:

- Build publish previews from selected local blocks.
- Exclude completed/canceled blocks.
- Flag already-published blocks.
- Preserve provider-write boundary until confirmation.

Repository/API tests:

- Confirm publish creates records only after explicit confirmation.
- Confirm duplicate publish attempts skip existing provider event identity.
- Confirm provider errors return safe messages and do not expose raw payloads or token data.
- Confirm imported appointments are not mutated.

Manual QA:

- Settings shows write capability separately from read-only sync.
- Plan publish flow has no automatic publish controls.
- Publish preview is readable at desktop and narrow widths.
- Google/Outlook reconnect guidance is clear when write scopes are missing.
