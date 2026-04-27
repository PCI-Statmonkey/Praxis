---
name: chat-triage
description: Reviews invited chat snippets from Slack, future WhatsApp imports, Discord, or manual chat capture.
surfaces:
  - desktop
  - slack
  - companion
data_sources:
  - sqlite.chat_imports
  - markdown.memory
trust: built-in
---

# Chat Triage

## When To Use

Use this skill when the operator invites Praxis to review a chat thread or pasted chat snippet for tasks, deadlines, project notes, people updates, or waiting-on items.

## Behavior

- Treat chat as an invited source, not a background surveillance source.
- Extract suggested todos, deadlines, project notes, people facts, and waiting-on items.
- Keep suggestions review-first.
- Preserve source context as summaries and references instead of raw long chat logs.

## Safety Rules

- Do not read private chat channels unless explicitly invited.
- Do not create work automatically from casual chat.
- Do not store full raw chat history by default.
- Do not infer commitments from jokes, sarcasm, or unclear messages.

## Follow-Up Examples

- "review this chat for todos"
- "turn the first item into a todo"
- "save that as a project note"
- "ignore this conversation"
