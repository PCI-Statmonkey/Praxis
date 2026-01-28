# SPEC — Praxis Desk

## Platforms
- Windows desktop app on Home PC + Surface Pro
- Android PWA dashboard w/ push notifications (hosted on GoDaddy, HTTPS)

## Integrations
- Gmail: multiple accounts, read and summarize
- Outlook: personal + work via Microsoft Graph
  - One tenant (Gartek) may restrict scopes; implement degraded mode + diagnostics
- Calendars: Google Calendar + Outlook Calendar
- Dropbox: personal is primary; some project folders may live in a business/team account

## UI (Praxis HUD)
Panels:
1) Center: Today Timeline (time blocks)
2) Right: Morning Plan (Top 5 fires, 3 quick wins, meetings + prep tasks)
3) Left: Project Stack (urgency ordering + badges)
4) Bottom: Master Checklist (always visible, fast add, check off, nag escalation)
5) Optional: Inbox Triage Drawer

No bubble map as primary UI.

## Categories
- Work (employer)
- Personal company
- Publishing company
- Personal projects (blogging/streaming)
- Home & family

## “Needs Attention” priority order
1) Someone waiting on you
2) Due soon
3) Money attached
4) Ignored too long
5) Time you set aside

Drives urgency score -> ordering, reminders, emphasis.

## Time Blocking Rules
- Suggest blocks; user accepts/adjusts
- Optional constraints:
  - no meetings before 10am
  - 2 hours deep work/day
  - weekends/holidays prioritize home projects
- Auto meeting prep blocks (when needed)

## Two-PC Sync + Failover
- Both PCs run fully
- Sync via Dropbox shared folder:
  /PraxisDesk/Shared/
    event-log/   append-only JSON events
    snapshots/   compacted state
    locks/       master lease + heartbeat
    config/      shared settings (encrypted where needed)

- Each PC maintains local SQLite DB
- Apply events idempotently
- Master election via lease:
  - heartbeat every 30s
  - lease expires after 90s
  - only master schedules ingestion + dispatches push
  - client takes over automatically if master down

Do NOT sync SQLite DB files via Dropbox.

## AI Routing + Cost Control
Local model (high frequency):
- classify emails, extract tasks, detect flags, short summaries, confidence scoring

ChatGPT API (low frequency):
- daily Morning Plan
- draft replies (suggest only; user edits + sends)
- deep thread summaries on-demand
- ambiguous items flagged by local model

Caching mandatory:
- thread summary hash cache, re-summarize only on delta
- cap monthly spend; fall back to “budget mode” when exceeded

## Voice (ElevenLabs)
- Stock voice (Praxis-adjacent)
- Speaks only:
  - Morning briefing (1x/day)
  - Escalations (overdue / waiting-on-you / imminent meeting)
- Use reusable generic phrases; avoid project names in speech (projects are ephemeral)
- Cache audio locally by hash(text + voice + settings)
- Headphones-only mode default for Work category

## PWA + Push
- Android push notifications
- Minimal notification payload (no email bodies)
- Deep-link to item
- Optional “play briefing” after opening (no background autoplay assumption)

## Security
- OAuth tokens encrypted (Windows Credential Manager)
- Attachments remain local, never synced
- Push relay stores no email content
