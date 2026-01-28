# DECISIONS

- UI: Praxis HUD panels, not bubble map
- Sync: Dropbox event-log + snapshots; never sync SQLite files
- Two-PC: master lease heartbeat; client failover after 90s
- AI: local model for triage/extraction; ChatGPT only for high-value tasks
- Voice: ElevenLabs stock voice; speak only morning briefing + escalations; avoid project names in speech
- Mobile: Android PWA + push; no native app required
- Budget: target <= $20/month total; enforce caps + fallback modes
