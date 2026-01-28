# Praxis Desk (Personal)

Windows-first productivity assistant for Home PC + Surface Pro with local-first processing, Dropbox-based sync, and Android PWA notifications.

## Core Features (MVP)
- Praxis HUD dashboard:
  - Today Timeline (time blocks)
  - Morning Plan (Top 5 fires, 3 quick wins, meetings + prep)
  - Project Stack (urgency-driven)
  - Master Checklist (ADHD-friendly)
- Multi-account Gmail + Outlook mail ingestion
- Google + Outlook calendar ingestion
- Project links to Dropbox folders
- Aggressive reminders (desktop + push)
- Voice (ElevenLabs): morning briefing + escalations only (cached)

## Non-negotiables
- Local-first: store data locally; keep cloud minimal
- Attachments remain local (do not upload/sync)
- Dropbox sync uses event log + snapshots (do NOT sync live SQLite DB file)
- AI cost cap: local model for triage/extraction; ChatGPT API only for high-value tasks (morning plan + draft replies + on-demand deep summaries)

## Repo Layout (planned)
- /apps/desktop        (Tauri UI)
- /apps/pwa            (GoDaddy-hosted PWA dashboard)
- /services/agent      (background poller + reminders + scoring)
- /services/relay      (push notification relay; no email content stored)
- /packages/shared     (types, scoring rules, common utils)
- /docs               (specs, prompts, decisions)

## Status
- Stage 0: planning + docs
- Stage 1: UI shell (next)
