---
name: daily-brief
description: Builds the Praxis daily status report, top move, and follow-up behavior.
surfaces:
  - desktop
  - slack
  - voice
data_sources:
  - sqlite.work_snapshot
  - sqlite.calendar_events
  - sqlite.email_followups
  - markdown.memory
trust: built-in
---

# Daily Brief

## When To Use

Use this skill when the operator asks for a daily report, status report, morning briefing, or "what matters today."

## Behavior

- Lead with the time-appropriate greeting.
- Name one top move before listing the rest of the work.
- Put same-day appointments before normal work when they exist.
- Prefer overdue, due-today, high-priority, waiting-on, money-related, and quick-action items.
- Keep the spoken version short enough for a default voice briefing.
- Say that there is more only when hidden work exists.

## Safety Rules

- Do not invent deadlines or appointments.
- Do not expose raw email bodies.
- Do not mark work complete from an ambiguous reply.
- If the operator says "not now," dismiss the active report context.

## Follow-Up Examples

- "mark the first one done"
- "pause that"
- "move the first one to tomorrow"
- "clear the waiting-on flag"
- "show me the project"
