# WhatsApp Integration Notes

## Goal

Let the operator explicitly invite Praxis to review selected WhatsApp conversations so it can suggest todos, project notes, people records, and deadlines.

## Current Recommendation

Do not try to read personal WhatsApp directly in V1. Treat WhatsApp as an invited source with explicit operator action.

Practical paths:

- Manual share/import: operator exports or forwards selected chat content into Praxis.
- Business Cloud API: useful later for a business WhatsApp number, inbound customer/client messages, and webhook-driven ingestion.
- Companion capture: future Surface/mobile companion can accept copied/forwarded chat snippets and send them to the main Praxis PC.

## Why Not Direct Personal WhatsApp

The official programmable path is WhatsApp Business Platform / Cloud API, which is designed around business phone numbers, webhooks, and app/business setup. Personal WhatsApp chat history is not exposed as a normal local API that Praxis can safely poll.

For privacy and reliability, Praxis should require the operator to opt in per chat, import, or business-number connection.

## Suggested V1 Shape

1. Add a `chat_imports` storage lane shared by Slack, future WhatsApp, Discord, and manual chat exports.
2. Normalize each imported message into:
   - source system
   - conversation title
   - participant names
   - timestamp
   - summary/snippet
   - source reference
3. Run the same review-first suggestion flow used for email.
4. Never auto-create todos/projects from chat without confirmation.
5. Store summaries and extracted facts, not full raw chat logs by default.

## Current Praxis Command Shape

As of April 27, 2026, Praxis recognizes `review conversation` style commands across desktop, Slack, and companion command mode and routes them to the built-in `chat-triage` skill.

Current behavior is intentionally non-writing: Praxis replies that chat import storage is not connected yet. This preserves the command contract without pretending it can ingest Slack/WhatsApp/SMS snippets before the `chat_imports` lane exists.

Example recognized commands:

- `review this WhatsApp conversation`
- `review this Slack thread`
- `triage this chat for todos`
- `scan these SMS messages`

The normalized `chat_imports` storage lane now exists in SQLite with conversation, participant, and message rows. Next implementation step: convert stored chat snippets into Review Inbox candidates. Until then, direct personal WhatsApp/SMS reading remains unsupported.

## Platform Feasibility Notes

### Slack

Slack is the cleanest invited-conversation path. Praxis can be added to channels or DMs and use Slack Events/API permissions to receive message events for conversations the app is allowed to see. This should still be explicit and review-first: channel participation means Praxis can watch that Slack conversation, but it should suggest tasks/projects/missions instead of auto-creating work.

### WhatsApp

Personal WhatsApp is not a good direct-watching target. The practical V1 remains manual share/import of selected chat text into Praxis. WhatsApp Business Platform / Cloud API can later receive messages for a business WhatsApp number through webhooks, but that is not the same as adding Praxis to arbitrary personal WhatsApp chats.

### SMS

Android may support SMS access only under strict default-SMS-handler policy constraints, which would make a PRAXIS mobile app a replacement texting app, not just a passive invited observer. iOS does not provide general third-party access to personal SMS/iMessage conversations; Apple's supported message filtering path is limited and privacy-scoped, mainly for unknown sender filtering.

### Recommended Direction

Build `chat_imports` first:

- Slack invited channel/DM ingestion where the bot is explicitly present.
- Manual share/import from WhatsApp or SMS.
- Future companion mobile capture that lets the operator send selected snippets to the home node.
- Business WhatsApp webhooks only if a real business-number workflow appears.

## Post-V1 Low-Friction Capture Ideas

The operator does not want chat capture to feel like copy text, open Praxis, paste text, then submit. Keep these ideas for the mobile/companion phase after V1:

- Android share target: selected text -> Share -> Praxis. This is likely the most realistic low-friction mobile path.
- Android floating quick action: copied text notification or share-sheet action that sends the snippet to Praxis with one tap.
- "Hold to send to Praxis" companion UX: if a native mobile app exists, expose a share extension/action that feels like a system-level handoff.
- Screenshot-to-Praxis fallback: capture a screenshot of a conversation, send it to Praxis, then OCR/summarize locally or on the home node. This needs careful privacy handling and explicit confirmation.
- Notification-forwarding experiment: only for operator-owned devices, explicit opt-in, and likely Android-first. Treat as research, not a V1 promise.
- iOS Share Extension: selected text or screenshots can be shared to a companion app, but direct SMS/iMessage reading should not be assumed.

Any of these should still create review candidates, not automatic todos/projects. The friction should be reduced at capture time, but the write path should stay confirmation-first.

## Skill Fit

WhatsApp review should become a `chat-triage` skill, not a special one-off importer. The skill can decide whether a chat snippet contains:

- a todo
- a deadline
- a project note
- a person/contact update
- a waiting-on item
- no action

## References

- Meta WhatsApp Cloud API overview preview: https://meta-preview.mintlify.io/docs/whatsapp/cloud-api/overview
- WhatsApp Business Platform Node.js SDK receiving messages: https://whatsapp.github.io/WhatsApp-Nodejs-SDK/receivingMessages/
- Meta Postman WhatsApp Business Platform webhook subscriptions: https://www.postman.com/meta/whatsapp-business-platform/folder/ozgs3jn/webhook-subscriptions
