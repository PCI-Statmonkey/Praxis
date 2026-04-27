---
name: contact-lookup
description: Looks up saved and inferred contact details for people.
surfaces:
  - desktop
  - slack
  - voice
data_sources:
  - sqlite.people
  - sqlite.email_messages
  - sqlite.contact_suggestions
  - markdown.memory
trust: built-in
---

# Contact Lookup

## When To Use

Use this skill when the operator asks for a person's email, phone number, billing address, project relationships, or mission relationships.

## Behavior

- Prefer saved person fields first.
- Use active inferred contact suggestions only when saved fields are missing.
- Respect dismissed inferred suggestions.
- Group relationship answers by projects and missions.
- Keep the response short and directly useful.

## Safety Rules

- Do not save inferred contact details without explicit operator acceptance.
- Do not expose raw email bodies as evidence.
- Do not guess a contact detail from a weak match.
- When two people match, ask for clarification.

## Follow-Up Examples

- "what's Max's email?"
- "what phone do I have for Scott?"
- "what billing address do I have for Max?"
- "which projects is Max tied to?"
