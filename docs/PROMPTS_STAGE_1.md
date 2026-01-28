# PROMPT — Stage 1 (Desktop UI Shell)

You are building Stage 1 ONLY:
- Create a Windows Tauri desktop app with a Praxis HUD dashboard.
- NO email, NO calendar, NO Dropbox sync, NO AI. Mock data only.
- Repo structure:
  /apps/desktop
  /packages/shared
  /docs

UI must include:
- Today Timeline panel (center)
- Morning Plan panel (right)
- Project Stack panel (left)
- Master Checklist panel (bottom)
- Settings modal/page (snark level, professional mode, headphones-only toggle)

Behavior:
- Master Checklist: add item, check off, delete
- Persist checklist locally (temporary local storage ok for Stage 1; real DB comes Stage 2)
- Provide clean component structure and types.

Output:
- Working build/run instructions
- Minimal dependencies
- No half-implemented integrations
