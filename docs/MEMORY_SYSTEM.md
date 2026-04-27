# Praxis Desk Memory System

## Purpose

Praxis needs an external brain.

The operator's real world is currently fragmented across memory, documents, email, calendar, and billing systems.
Praxis therefore needs a markdown-based long-term memory layer that is:

- durable
- inspectable
- editable by both the operator and the assistant
- structured enough for fast lookup

## Design Principle

Praxis should store extracted facts and structured context, not raw source dumps.

The goal is recall and orientation, not archival hoarding.

## Memory Layers

### 1. Index Layer

Praxis needs a lightweight top-level index so it can route itself to the correct records quickly.

Recommended top-level files:

- `memory/index.md`
- `memory/missions/index.md`
- `memory/projects/index.md`
- `memory/todos/index.md`
- `memory/deadlines/index.md`
- `memory/people/index.md`
- `memory/calendar/index.md`
- `memory/finance/index.md`
- `memory/inbox/index.md`
- `memory/daily/index.md`

### 2. Entity Files

Each durable object should get its own markdown file when warranted.

Examples:

- one mission file per mission
- one project file per project
- one person file for recurring contacts
- one finance file for billing relationships

### 3. Daily Operating Notes

Praxis should maintain lightweight day records for current situational awareness.

Examples:

- today's brief
- what changed
- what is overdue
- what is waiting on the operator

## Proposed Folder Shape

```text
memory/
  index.md
  missions/
    index.md
    origins-2026.md
  projects/
    index.md
    powerless-sourcebook.md
    origins-adventure.md
  todos/
    index.md
    active.md
  people/
    index.md
    max.md
    scott.md
  finance/
    index.md
    billcom.md
  calendar/
    index.md
    appointments.md
  inbox/
    index.md
    extracted-facts.md
  daily/
    index.md
    2026-04-20.md
```

## What To Store

Store:

- names
- deadlines
- status
- waiting-on relationships
- money relevance
- next actions
- source references
- confidence when inference is uncertain
- timestamps for last review and last update

## Generated Summary Views

Some markdown files are generated from SQLite state.

Current generated views:

- `memory/todos/active.md`
- `memory/deadlines/active.md`

SQLite is authoritative for these records.
The markdown files are human-readable mirrors for review and AI routing.

Do not store by default:

- raw email bodies
- full ambient transcripts
- unnecessary copied source text

## Mission File Pattern

Recommended sections for a mission file:

- mission summary
- current status
- linked projects
- deadlines and milestones
- people involved
- risks
- next recommended actions
- recent updates

## Project File Pattern

Recommended sections for a project file:

- project summary
- parent mission if any
- current deadline
- status
- tasks
- blockers
- related people
- related source links
- recent updates

## Todo Pattern

Recommended todo fields:

- title
- due date if any
- urgency
- money-related yes or no
- waiting-on yes or no
- source
- status

## Index Behavior

The indexes should be compact routing maps, not giant narrative files.

Each index should help Praxis answer:

- what exists
- what matters now
- what changed recently
- where to drill next

## Update Rules

Praxis should create or update markdown records when:

- a new mission is declared
- a project is created
- a due date is learned
- an appointment matters to work planning
- a person becomes someone the operator owes or is waiting on
- a billing obligation appears
- the operator explicitly tells Praxis to remember something

Praxis should ask before writing when confidence is low.

## Search Strategy

Praxis should not load the whole memory set every time.

Lookup order should be:

1. daily index
2. relevant domain index
3. specific entity files
4. broader search only if needed

## Future Technical Guidance

As memory grows, Praxis should maintain a machine-friendly sidecar structure or generated summary index if plain markdown alone becomes too expensive to scan.

Good future options:

- frontmatter
- generated JSON index derived from markdown
- entity tags
- last-updated metadata
- confidence metadata

Markdown remains the human-facing truth layer.

## Immediate Next Steps

1. Create the memory folder structure
2. Define markdown templates for missions, projects, todos, people, and daily briefs
3. Build a simple index updater
4. Build fact extraction rules from operator statements
5. Add calendar and finance summaries into the same memory model
