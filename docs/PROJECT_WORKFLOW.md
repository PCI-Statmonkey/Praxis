# PRAXIS PROJECT WORKFLOW

This document describes the lightweight workflow used to keep PRAXIS development clear across Codex sessions.

## Purpose

PRAXIS uses a small set of markdown documents as the shared operating memory for planning, execution, and handoff. The goal is continuity without replacing the codebase, roadmap, or engineering history.

## Workflow Files

- `CURRENT_TASK.md` is the active command file. It should contain only the work that is in progress or clearly next.
- `docs/ENGINEERING_LOG.md` records meaningful completed work, verification, and follow-up context.
- `docs/TECH_DEBT.md` records known risks, incomplete edges, and follow-up work that should not stay hidden in chat history.
- `docs/Roadmap.md` tracks broader staged product direction.
- `docs/DECISIONS.md` records durable architecture and product decisions.
- `docs/DOCUMENTATION_GUIDE.md` explains where documentation belongs.

## Task Lifecycle

1. Start from `CURRENT_TASK.md`.
2. Work one task at a time unless the task explicitly requires sequencing.
3. Verify the change with the narrowest relevant checks, then broader checks when shared behavior changed.
4. Remove completed work from `CURRENT_TASK.md`.
5. Add a dated entry to `docs/ENGINEERING_LOG.md` for completed work that changed behavior, architecture, persistence, packaging, or workflow.
6. Add unresolved risks or deferred edges to `docs/TECH_DEBT.md` when they should survive the session.

## Operating Rules

- Preserve existing files, structure, and user-authored content unless a requested task requires a focused edit.
- Prefer extending existing docs over creating duplicate planning files.
- Keep `CURRENT_TASK.md` short and actionable.
- Do not invent requirements when the docs are unclear; mark the ambiguity or ask for clarification.
- Email live-validation work stays deferred until a real Gmail or Outlook row is connected and OAuth is complete.

## Long-Term Direction

Current implementation work should keep room for the agreed PRAXIS direction:

- long-term voice interaction
- local AI execution where practical
- trusted companion and remote surfaces
- release packaging, signing, and update readiness
- broader integrations after the core assistant workflow is stable

## Current AI Proposal Track

The AI project template proposal detector is complete as a pure/no-write detector. The next work should add SQLite proposal state and filtering before UI, so accepted, dismissed, snoozed, and do-not-suggest-again choices prevent repeat nags.

Review Inbox UI comes after persistence. Explicit markdown template save comes after the Review Inbox confirmation path. Proposal editing, template management, template revision proposals, and applying templates to existing projects remain later follow-ups.

Provider calendar write-back and persistent presence/Rainmeter remain separate later tracks.
