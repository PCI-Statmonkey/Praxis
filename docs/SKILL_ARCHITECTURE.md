# Praxis Skill Architecture

## Purpose

Praxis skills are local markdown capability packs that describe how the assistant should handle a bounded domain such as daily briefings, work graph lookup, contact lookup, or inbox triage.

This is not a plugin marketplace and not an arbitrary code execution system. V1 skills should be treated as trusted local operating procedures that can be loaded into prompts or referenced by deterministic routing.

## OpenClaw Lessons Adopted

OpenClaw's useful pattern is simple: a skill is a folder with a `SKILL.md`, skills can exist at different scopes, and the runtime should only load the relevant skill set for the current task.

Praxis should adapt that pattern conservatively:

- Workspace skills live in `praxis-desktop/skills/<skill-name>/SKILL.md`.
- Shared personal skills can eventually live outside the repo, but V1 should keep them disabled until a settings UI and trust model exist.
- Built-in skills should be the default source of truth for assistant behavior.
- Per-surface allowlists should decide which skills can influence desktop, Slack, voice, or future companion clients.
- Skills should describe behavior, safety rules, examples, and data sources; they should not run commands.

## Proposed Load Order

1. Built-in Praxis skills packaged with the app.
2. Workspace skills in `praxis-desktop/skills`.
3. Future user skills from a configured local directory.

If names conflict, the stricter or built-in skill should win until there is an explicit trust UI. This is intentionally more conservative than OpenClaw-style local overrides because Praxis handles personal email, calendar, contact, and billing context.

## Skill Shape

Each skill should use this structure:

```markdown
---
name: daily-brief
description: Builds the morning/status briefing and recommended next move.
surfaces:
  - desktop
  - slack
  - voice
data_sources:
  - sqlite.work_snapshot
  - markdown.memory
trust: built-in
---

# Skill Name

## When To Use

## Inputs

## Behavior

## Safety Rules

## Examples
```

## V1 Safety Rules

- Do not install third-party skills automatically.
- Do not allow skills to execute shell commands.
- Do not let skills request raw email bodies; use summaries and metadata.
- Do not load every skill into every prompt.
- Do not let Slack-only skills access desktop-only actions unless explicitly allowed.
- Keep skill loading observable: log which skill influenced a response.

## Integration Plan

1. Keep starter skills as markdown documentation now. Done.
2. Add a read-only skill registry that indexes local `SKILL.md` files. Done.
3. Add allowlists per surface: desktop, Slack, voice, companion client. Done.
4. Let the assistant router attach relevant skill references to local AI calls. Started.
5. Add a Settings review surface before any user-installed skill support.

## Current Implementation

Implemented as of 2026-04-24:

- `praxis-desktop/electron/skillRegistry.ts` indexes `praxis-desktop/skills/*/SKILL.md`.
- `praxis-desktop/shared/skillRegistry.ts` defines the renderer-safe registry contract.
- `window.praxis.skills.getRegistry()` exposes a read-only registry snapshot to the renderer.
- `npm run skills:list` builds the app and runs Electron in `--skills-list` mode without opening the UI.
- The registry parses front matter for `name`, `description`, `surfaces`, `data_sources`, and `trust`.
- The registry returns skill content and metadata only. It does not execute commands, install skills, or load third-party directories.
- `praxis-desktop/shared/assistantSkillRouting.ts` maps assistant route intents to relevant local skill IDs.
- `praxis-desktop/electron/assistantRouter.ts` now attaches lightweight skill references to route results.
- Route skill references include ID, name, description, surfaces, and path only; they deliberately exclude full skill content until a prompt-loading layer exists.
- `praxis-desktop/shared/assistantSkillRouting.ts` also defines V1 surface allowlists.
- Desktop may reference all built-in starter skills.
- Slack may reference daily brief, work graph, contact lookup, inbox triage, and chat triage.
- Voice may reference daily brief, work graph, and contact lookup only.
- Companion may reference daily brief, work graph, contact lookup, and inbox triage, but only after individual skills declare `companion` in their own front matter.

## Starter Built-In Skills

- `daily-brief`: status report, top move, and follow-up behavior.
- `work-graph`: work lookup, project/mission focus, stalled work, and quick wins.
- `contact-lookup`: person/contact lookup and inferred contact review.
- `inbox-triage`: email-derived follow-ups and suggestion review.
- `email-noise-filter`: noisy sender, newsletter, and spam-like review.
- `chat-triage`: invited Slack, WhatsApp, Discord, or manual chat review.

## References

- OpenClaw skills documentation: https://docs.openclaw.ai/tools/skills
- OpenClaw repository notes on workspace skills: https://github.com/openclaw/openclaw
