# Provider Calendar Live QA

## Purpose

Validate create-only provider calendar write-back with the operator present. This QA creates real
Google or Outlook calendar events, so it must not run silently or through renderer automation.

## Preconditions

- App is built from the current `master`.
- Google and/or Outlook calendar connection is visible in Settings.
- The operator is available to complete OAuth refresh/sign-in if write scopes are missing.
- A disposable local planned time block exists for the target day.
- The event title clearly marks the QA item, for example `PRAXIS QA publish test`.

## Safe Path

1. Open Settings.
2. Refresh sign-in for the provider being tested if Plan reports missing write access.
3. Open focused Plan.
4. Create one local planned block with a short test title and near-future time.
5. In Publish, select only that test block.
6. Select the intended provider/calendar destination.
7. Preview publish.
8. Confirm that preview shows exactly one ready item and no imported appointment conflict.
9. Confirm publish.
10. Verify the result says one created, zero skipped, zero failed.
11. Open the provider calendar manually and verify the new event appears.
12. Verify the event body includes the PRAXIS marker and local time block ID.
13. Return to Plan and verify the local block shows a published badge for the provider.

## Failure QA

If the provider returns a safe failure:

1. Confirm no token, raw provider payload, refresh token, client secret, or encrypted value is shown.
2. Confirm the local block shows a failed publish badge.
3. Click `Retry publish`.
4. Confirm the retry only stages the block and requires a fresh preview before another write.

## Not Allowed In This QA

- No update/delete provider event writes.
- No provider event reconciliation.
- No AI/autopublish path.
- No CDP/base64/eval renderer automation against debug ports.
- No raw provider payload or secret inspection.

## Current Status

Pending operator-present live run. Automated verification can prove the preview/confirm contracts and
safe failure handling, but it cannot prove provider consent or real event appearance without creating
real calendar events.

2026-05-10 update: still blocked on operator-present execution. This run must not be performed
silently because it can refresh OAuth consent and create real Google/Outlook events.

Later 2026-05-10 update: still blocked for the same reason. Code-only work continued on context
memory lanes and read-only Rainmeter export without touching provider calendars.

Final 2026-05-10 update for this slice: still blocked on operator-present execution. Rainmeter
snapshot polish and AI Review lane highlighting were completed without refreshing OAuth consent,
calling provider publish endpoints, or creating provider calendar events.

Service-presence 2026-05-10 update: still blocked on operator-present execution. Service-health
presence integration, notification boundary planning, and the Rainmeter skin draft did not call
provider publish endpoints or create provider calendar events.
