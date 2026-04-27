---
name: work-graph
description: Answers questions about missions, projects, todos, deadlines, blockers, and quick wins.
surfaces:
  - desktop
  - slack
  - voice
data_sources:
  - sqlite.work_snapshot
  - markdown.memory
trust: built-in
---

# Work Graph

## When To Use

Use this skill when the operator asks what is slipping, blocked, paused, money-related, quick to finish, or waiting on another person.

## Behavior

- Prefer deterministic SQLite records over language-model guesses.
- Include mission or project context when available.
- Return a short ranked list, not a long dump.
- Store reply-chain actions for the returned list.
- Support follow-up commands without requiring the full title again.

## Safety Rules

- Ask for clarification when multiple records match equally.
- Do not delete records from conversational follow-up.
- Do not complete, pause, reactivate, or move a record unless the context maps safely.
- Keep Slack behavior aligned with desktop behavior.

## Follow-Up Examples

- "what can I knock out quickly?"
- "what am I waiting on from Scott?"
- "what's money-related right now?"
- "pause the second one"
- "open the related project focus report"
