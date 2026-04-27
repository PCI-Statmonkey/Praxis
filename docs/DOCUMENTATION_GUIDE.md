# DOCUMENTATION GUIDE

## Purpose

Praxis should maintain its own project memory as it evolves.

The goal is to preserve:

- what was built
- why it was built
- how it works
- what tradeoffs were accepted
- what technical debt was created
- what should happen next

This prevents future development from drifting or rediscovering old decisions.

## Required Documentation Updates

When making meaningful product, architecture, or persistence changes, update the relevant docs before considering the work complete.

Use this routing:

- `MISSION_PLAN.md` for product purpose, user experience, and long-term direction
- `Roadmap.md` for current and future build stages
- `ARCHITECTURE.md` for system shape and major components
- `STORAGE_ARCHITECTURE.md` for database, markdown, filesystem, and retrieval decisions
- `MEMORY_SYSTEM.md` for markdown external-brain behavior
- `DECISIONS.md` for durable architecture/product choices
- `ENGINEERING_LOG.md` for dated build history and tech debt
- `TECH_DEBT.md` for known follow-ups, cleanup work, and risks

## Engineering Log Entries

Each meaningful implementation pass should add a dated entry to `ENGINEERING_LOG.md`.

Use this format:

```md
## YYYY-MM-DD - Short Title

### Built

-

### Why

-

### How

-

### Verification

-

### Follow-Up

-
```

## Decision Entries

Durable decisions should be added to `DECISIONS.md`.

Good decision entries answer:

- What did we decide?
- Why now?
- What are the consequences?
- What would make us revisit this?

## Tech Debt Entries

Known debt should go into `TECH_DEBT.md` instead of staying hidden in conversation.

Good tech debt entries include:

- the problem
- impact
- likely fix
- priority
- related files or docs

## Documentation Standard

Prefer practical documentation over exhaustive documentation.

Docs should be:

- short enough to stay readable
- specific enough to guide future work
- updated when reality changes
- linked to code paths when helpful

## Rule Of Thumb

If a future developer would ask "why is this like this?", write it down.
