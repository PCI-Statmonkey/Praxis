---
name: inbox-triage
description: Converts synced email metadata and snippets into reviewable follow-up candidates.
surfaces:
  - desktop
  - slack
data_sources:
  - sqlite.email_connections
  - sqlite.email_messages
  - sqlite.email_suggestions
  - sqlite.people
trust: built-in
---

# Inbox Triage

## When To Use

Use this skill after Gmail or Outlook sync, or when the operator asks what emails need follow-up.

## Behavior

- Work from metadata, senders, subjects, snippets, and extracted summaries.
- Rank direct asks, deadlines, money language, waiting-on language, and project-sized requests.
- Filter obvious no-reply, digest, login-code, and security-notice noise.
- Create reviewable suggestions, not automatic todos, unless the operator confirms.
- Match senders to people conservatively.

## Safety Rules

- Do not store raw email bodies.
- Do not create work automatically from weak evidence.
- Do not overwrite saved person details from inferred email evidence.
- Keep one suggestion per real follow-up whenever possible.

## Follow-Up Examples

- "what email follow-ups do I have?"
- "turn that into a todo"
- "dismiss that"
- "save that email to Max"
