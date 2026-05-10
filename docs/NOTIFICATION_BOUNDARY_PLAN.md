# Notification Boundary Plan

## Purpose

Define the first safe notification/nudge layer for persistent PRAXIS presence. Notifications should
bring the operator back to the right PRAXIS surface; they must not mutate work, publish calendars,
send messages, archive inbox items, or write memory.

## Current State

- Tray/background lifetime exists when close-to-tray is enabled.
- Presence supports `active`, `paused`, and `quiet_until`.
- AI Review can explain next moves from a read-only factual packet.
- Rainmeter export is read-only and now carries service-attention presence copy.
- Settings now persists default-off desktop notification delivery and a daily quiet window.
- The main app now builds local notification candidates, supports local snooze state, and routes
  candidate click-through to Today, Checklist, Plan, or Settings.
- No OS notification scheduler/delivery is implemented yet.

## Allowed Notification Sources

- Overdue or due-today work from the local work graph.
- Waiting-on follow-ups that are stale by local structured timestamps.
- Review Inbox items aging past a configured local threshold.
- Missed local planned time blocks.
- Provider sync/service-health degraded state.

## Hard Boundaries

- No notification action creates, completes, schedules, publishes, sends, archives, deletes, or edits.
- Clicking a notification opens PRAXIS to the relevant surface only.
- Snooze is local runtime notification state, not work graph state.
- Pause and quiet presence suppress notification delivery.
- Provider calendar write-back remains behind Plan preview/confirm.
- Raw email bodies, raw provider payloads, provider account refs, token/secret values, database paths,
  memory-root paths, and `secure_secrets` never appear in notification text.

## First Implementation Shape

1. Done: build a pure notification candidate selector from the same factual context used by AI Review.
2. Done: add Settings controls for notification enablement and quiet windows before defaulting
   anything on.
3. Done: add local runtime snooze state with expiry timestamps.
4. Done: route candidate click-through to Today, Checklist, Plan, Review Inbox, or Settings.
5. Deliver OS notifications only when effective presence is active and not attention-paused by user
   settings.

## Verification

- Unit tests for candidate selection, privacy copy, quiet/pause suppression, and snooze expiry.
- Manual Windows QA for click-through routing and notification dismissal.
- Regression pass: `npx tsc --noEmit`, lint, assistant/sync tests, build, storage check.
