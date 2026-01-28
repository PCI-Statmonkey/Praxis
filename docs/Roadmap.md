# ROADMAP

## Stage 1 — Desktop Shell + Praxis HUD UI (no integrations)
- [ ] Repo scaffold (apps/services/packages/docs)
- [ ] Tauri desktop app runs on Windows
- [ ] Praxis HUD layout with mock data
- [ ] Master Checklist add/check off
- [ ] Settings panel (snark level, professional mode, headphones-only, etc.)

## Stage 2 — Local DB + Dropbox Event Log Sync + Master Failover
- [ ] SQLite schema (projects/tasks/timeblocks/emails/events/settings)
- [ ] Event log writer/reader (idempotent)
- [ ] Snapshot compactor
- [ ] Lease lock heartbeat + master election
- [ ] Two-PC sync test (kill master; client takes over)

## Stage 3 — Integrations (Gmail + Graph + Calendars)
- [ ] Gmail OAuth multi-account + ingestion
- [ ] Microsoft Graph OAuth + ingestion (personal + work)
- [ ] Gartek degraded mode + diagnostics screen
- [ ] Google Calendar + Outlook Calendar ingestion
- [ ] Create tasks/projects from email thread workflow

## Stage 4 — AI + Voice + PWA Push
- [ ] Local model server integration (LM Studio/Ollama or embedded)
- [ ] ChatGPT API router + caching + monthly cap
- [ ] Morning Plan generation
- [ ] Draft reply suggestions (edit + send)
- [ ] ElevenLabs TTS (morning + escalations only) + cached phrase library
- [ ] PWA dashboard + push relay + Android push working
