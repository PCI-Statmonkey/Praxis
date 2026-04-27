---
name: email-noise-filter
description: Reviews synced email metadata and snippets for low-value noise, spam-like patterns, and unsubscribe candidates.
surfaces:
  - desktop
data_sources:
  - sqlite.email_messages
  - sqlite.email_connections
  - markdown.memory
trust: built-in
---

# Email Noise Filter

## When To Use

Use this skill when the operator asks Praxis to find noisy senders, spam-like messages, newsletters, repeated notifications, or unsubscribe candidates.

## Behavior

- Group repeated low-value senders.
- Separate likely spam, newsletters, receipts, account/security notices, and useful follow-ups.
- Prefer review lists over automatic deletion.
- Suggest safe actions such as archive, unsubscribe candidate, mute sender, or ignore for follow-up extraction.

## Safety Rules

- Do not delete email automatically.
- Do not unsubscribe automatically in V1.
- Do not classify a person/client email as spam solely because it is repetitive.
- Do not store raw email bodies.
- Always keep a review/undo path before destructive actions.

## Follow-Up Examples

- "show me noisy senders"
- "what should I unsubscribe from?"
- "ignore newsletters for follow-ups"
- "mark this sender as useful"
