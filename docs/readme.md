# Praxis Desk

Praxis Desk is a local-first desktop assistant that helps capture ideas, detect patterns, suggest next actions, and support execution over time.

The desktop app is the primary product. Slack is a secondary quick-reply and notification surface so the assistant can interact with the user wherever they already are.

## Core Product Shape

- Praxis HUD desktop interface
- Persistent local state
- Event-driven assistant core
- Proactive suggestions with explicit action choices
- Contextual action resolution for short replies like `yes`, `do it`, `1`, and `the first one`

## Non-Negotiables

- Local-first storage and processing where practical
- Desktop app is the system of record
- Slack should mirror and extend assistant actions, not replace the app
- Assistant actions must resolve into explicit commands under the hood
- Keep behavior event-driven
- Avoid background schedulers unless clearly justified

## Status

- Electron desktop shell exists
- Checklist persistence exists via local event log plus snapshots
- Assistant core is being moved into shared modules for reuse across desktop and Slack
- Hybrid storage direction is documented: SQLite for operational state, markdown for external memory
- Praxis can now answer deterministic desktop and Slack lookup questions about people and live work state, including:
  - who you are waiting on
  - what is slipping or overdue
  - what can be knocked out quickly
  - what is money-related right now
  - blocked or paused work

## Project Documentation

- [Mission Plan](./MISSION_PLAN.md)
- [Roadmap](./Roadmap.md)
- [Architecture](./ARCHITECTURE.md)
- [Storage Architecture](./STORAGE_ARCHITECTURE.md)
- [Memory System](./MEMORY_SYSTEM.md)
- [Decisions](./DECISIONS.md)
- [Project Workflow](./PROJECT_WORKFLOW.md)
- [Release Checklist](./RELEASE_CHECKLIST.md)
- [Engineering Log](./ENGINEERING_LOG.md)
- [Tech Debt](./TECH_DEBT.md)
- [Documentation Guide](./DOCUMENTATION_GUIDE.md)
