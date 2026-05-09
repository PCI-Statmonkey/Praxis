# STORAGE ARCHITECTURE

## Principle

Praxis should use a hybrid storage model.

Pure markdown becomes too slow and awkward for ranking, filtering, relationships, and high-frequency state changes.
Pure database storage becomes opaque and weak as a human-facing long-term memory layer.

The correct model is:

- SQLite for operational structured state
- Markdown for human-readable durable memory and planning records
- Filesystem storage for larger artifacts and imported assets
- OS-backed encrypted secret storage for integration tokens

## Roles

### SQLite

SQLite is the operational brain.

Use SQLite for:

- missions
- projects
- todos
- tasks
- people relationships
- appointments
- finance items
- extracted inbox facts
- reminder state
- resolver state
- suggestion history
- project-template proposal state
- settings
- document indexes
- encrypted secret metadata

SQLite should answer questions such as:

- what is due in the next three days
- what is overdue
- what is waiting on Max
- what money-related items need attention
- what changed since yesterday
- what should rank highest right now

### Markdown

Markdown is the human-facing long-term memory layer.

Use markdown for:

- mission documents
- project documents
- daily briefs
- planning notes
- summaries the operator may want to read or edit directly
- durable external brain records
- accepted saved project templates

Markdown should preserve narrative and context, not replace the database.

Saved project templates in markdown are canonical only after an explicit save. They are creation-time
seeds for future projects; existing projects do not auto-mutate when template markdown changes.

### Filesystem

Filesystem storage handles:

- attachments
- imported documents
- cached generated audio
- exported reports
- other larger artifacts

### Secrets

Secrets are encrypted operational credentials.

Use Electron main-process OS-backed encryption for:

- OAuth refresh tokens
- provider access tokens
- integration credentials that must not be human-readable

Rules:

- secrets are never written to markdown
- raw secret values are never exposed to the renderer
- SQLite may store encrypted blobs and non-secret metadata only
- deleting an integration owner must delete its encrypted secrets

## Authority Rules

The storage model should follow these authority rules:

- SQLite is authoritative for operational structured state
- Markdown is authoritative for long-form memory documents and daily brief narratives
- Filesystem is authoritative for raw file artifacts
- Encrypted secret storage is authoritative for integration credentials

Mirroring is allowed, but each entity should have one primary owner.

## Entity Ownership

### Missions

- Primary: SQLite
- Mirror: markdown mission file

Reason:
Mission relationships, status, deadlines, and ranking need fast structured queries.
The operator still needs a readable mission document.

### Projects

- Primary: SQLite
- Mirror: markdown project file

### Todos

- Primary: SQLite
- Optional mirror: markdown summary views

### Tasks

- Primary: SQLite

### People

- Primary: SQLite
- Optional mirror: markdown profile for important recurring people

### Appointments

- Primary: SQLite
- Mirror: markdown calendar and daily-note summaries

### Finance Items

- Primary: SQLite
- Mirror: finance markdown summaries where useful

### Inbox Facts

- Primary: SQLite
- Mirror: inbox markdown routing documents where useful

### Daily Briefs

- Primary: markdown
- Mirror: SQLite metadata row

### Suggestion Contexts

- Primary: SQLite

### Project Template Proposals

- Primary: SQLite
- Accepted template artifact: markdown under `memory/templates/project-task-templates/`

Reason:
Proposal detection is no-write logic. SQLite stores operational proposal state after detection so
Praxis can filter eligible Review Inbox candidates, remember dismissed or stale proposals, and avoid
repeatedly nagging the operator. This state should stay high-level and must not store or expose raw
provider payloads, tokens, encrypted values, `secure_secrets`, or unnecessary external identifiers.

Accepted proposal state is not itself a saved template. The explicit save-confirmation flow validates
the edited markdown, writes one canonical markdown project template, refreshes the memory index, and
stores the saved slug/path in proposal state. Templates seed future project creation only; they do
not backfill or mutate existing projects.

### Integration Secrets

- Primary: encrypted SQLite blob using Electron `safeStorage`
- Metadata: SQLite
- Mirror: none

Reason:
Tokens must be local-first but not human-readable. The renderer should only know whether secret storage is available and whether a connection is authenticated.

### Document Index

- Primary: SQLite
- Source material: markdown

## Retrieval Strategy

Praxis should not load all markdown files to answer a question.

Lookup order:

1. query SQLite for candidate entities
2. use the document index to locate the relevant markdown files
3. load only those markdown files
4. compose the answer or brief

This keeps context small and retrieval fast.

## Current Database Schema Direction

The initial SQLite schema should include:

- `settings`
- `missions`
- `projects`
- `todos`
- `people`
- `person_aliases`
- `person_work_links`
- `appointments`
- `finance_items`
- `inbox_facts`
- `daily_briefs`
- `deadlines`
- `memory_documents`
- `suggestion_contexts`
- `calendar_connections`
- `email_connections`
- `email_messages`
- `secure_secrets`

## Memory Document Index

Markdown remains the human-facing truth layer for narrative records, but SQLite should index these files so Praxis can route quickly.

The document index should record:

- document kind
- entity kind
- entity id when linked
- title
- relative path
- last indexed time

## Sync Rules

### SQLite To Markdown

Generate or update markdown when:

- a mission or project needs a durable readable record
- a daily brief is created
- the operator explicitly asks Praxis to remember something narratively

### Markdown To SQLite

Parse or re-index markdown when:

- a record is created manually
- a markdown document changes materially
- Praxis starts up and refreshes the document index

## Design Constraints

- local-first
- no cloud dependence for core storage
- human-readable long-term memory
- fast ranking and filtering
- explicit authority to avoid split-brain behavior

## Immediate Implementation Plan

1. Keep the existing `memory/` markdown structure
2. Add the local SQLite schema in the Electron main process
3. Index markdown documents into SQLite
4. Move new operational entities onto SQLite
5. Generate and maintain markdown records from that structured state

## Current Implementation

Implemented as of 2026-04-21:

- SQLite dependency: `better-sqlite3`
- Main-process database module: `praxis-desktop/electron/praxisDb.ts`
- Shared authority rules: `praxis-desktop/shared/storage/hybridStorage.ts`
- Database location: Electron `userData` as `praxis.sqlite`
- Markdown memory root: project `memory/` folder when available, with a Documents fallback for packaged contexts
- Startup behavior: initialize schema, enable WAL, enforce foreign keys, index markdown memory files
- Work repository: `praxis-desktop/electron/workRepository.ts`
- Daily brief generator: `praxis-desktop/electron/dailyBrief.ts`
- Markdown writer: `praxis-desktop/electron/memoryWriter.ts`
- Renderer behavior: mission, project, todo, and deadline creation writes to SQLite and mirrors to markdown
- Brief behavior: daily report is generated from SQLite work state and written to `memory/daily/<YYYY-MM-DD>.md`
- Appointment behavior: manual appointment creation writes to SQLite and mirrors upcoming appointment summaries to `memory/calendar/appointments.md`
- Capture behavior: natural-language capture routes into the same SQLite-backed writers instead of bypassing the work repository
- Todo behavior: todos can be standalone or project-linked, and may also be marked as quick actions with estimated effort
- People behavior: people are structured SQLite records mirrored into `memory/people/`, include contact fields and aliases, and todos may link to one person as `waiting_on_person_id`
- Relationship behavior: `person_work_links` tracks which missions/projects a person is associated with, starting from waiting-on todo relationships
- Assistant context behavior: current report actions are stored in `suggestion_contexts` so ordinal follow-ups can resolve safely
- Settings behavior: multiple calendar connection records are stored locally before live Google/Outlook adapters are added
- Maintenance behavior: `npm run memory:repair` rebuilds generated markdown mirrors and repairs the markdown document index
- Integrity behavior: `npm run storage:check` runs a read-only SQLite/markdown integrity report without opening the desktop window, including link integrity, provider identity duplication, timestamp shape, status/provider allowlists, boolean fields, and basic contact sanity

Current schema version: `9`

Current indexed tables:

- `settings`
- `missions`
- `projects`
- `todos`
- `people`
- `person_aliases`
- `person_work_links`
- `appointments`
- `finance_items`
- `inbox_facts`
- `daily_briefs`
- `deadlines`
- `memory_documents`
- `suggestion_contexts`
- project-template proposal state tables when implemented
- `calendar_connections`
- `email_connections`
- `email_messages`
- `secure_secrets`

## Maintenance Commands

Memory repair:

1. Run `npm run memory:repair`
2. Build the app
3. Launch Electron in `--memory-repair` mode without opening the UI
4. Rewrite generated mission, project, person, todo, deadline, and appointment markdown mirrors
5. Repair stale or missing markdown document index rows

Storage integrity check:

1. Run `npm run storage:check`
2. Build the app
3. Launch Electron in `--storage-check` mode without opening the UI
4. Report SQLite foreign-key violations, invalid JSON payloads, malformed dates, invalid statuses/providers, invalid boolean fields, duplicate external identities, broken polymorphic work links, missing deadline mirrors, missing email follow-up targets, stale person alias normalization, suspicious email addresses, invalid appointment ranges, and stale markdown index paths
5. Exit nonzero when error-level integrity issues are found

## Current Write Flow

Mission creation:

1. Insert structured mission row into SQLite
2. If due date exists, insert a linked deadline row
3. Generate `memory/missions/<slug>.md`
4. Refresh todo and deadline markdown summaries
5. Re-index markdown documents into SQLite

Project creation:

1. Insert structured project row into SQLite
2. Link to parent mission when selected
3. If due date exists, insert a linked deadline row
4. Generate `memory/projects/<slug>.md`
5. Refresh summaries and document index

Todo creation:

1. Insert structured todo row into SQLite
2. If due date exists, insert a linked deadline row
3. Regenerate `memory/todos/active.md`
4. Regenerate `memory/deadlines/active.md`
5. Re-index markdown documents

Standalone deadline creation:

1. Insert structured deadline row into SQLite
2. Regenerate `memory/deadlines/active.md`
3. Re-index markdown documents

Appointment creation:

1. Insert structured appointment row into SQLite
2. Regenerate `memory/calendar/appointments.md`
3. Re-index markdown documents

Person creation:

1. Insert structured person row into SQLite
2. Store contact fields such as email, phone, billing address, and notes when provided
3. Store aliases in `person_aliases`
4. Generate `memory/people/<slug>.md`
5. Re-index markdown documents

Person update/delete:

1. Update the person row through the work repository
2. Replace aliases in `person_aliases`
3. Regenerate the person markdown profile
4. Re-index markdown documents
5. On delete, clear any todo `waiting_on_person_id` references and remove relationship links

Person relationship management:

1. Create explicit `person_work_links` rows from the person profile surface
2. Support mission and project links
3. Store the relationship label, such as client, vendor, GM, stakeholder, billing contact, or waiting-on
4. Remove manual or inferred relationship rows when no longer useful

Natural-language capture:

1. Parse operator text for intent, date/day, optional time, and title
2. Return an editable capture draft before creating the record
3. If one active project clearly matches the text, preselect that project for todo drafts
4. If one saved person clearly matches the text, preselect that person as the waiting-on relationship
5. If the text is ambiguous, ask for intent confirmation before saving
6. Save the reviewed draft through the work repository
7. Let repository side effects create linked deadline rows and markdown summaries
8. Return unresolved when the text is too unclear

Status update:

1. Update the target row status in SQLite
2. If the target is a mission, project, or todo, update linked deadline status
3. Regenerate affected mission or project markdown when applicable
4. Regenerate active todo and deadline summary views
5. Re-index markdown documents

Record update/delete:

1. Update or delete records through the work repository
2. Keep linked deadline rows synchronized for missions, projects, and todos
3. Regenerate affected markdown summaries
4. Re-index markdown documents after write operations

Quick-action ranking:

1. Store quick-action state on todo rows
2. Store estimated effort in minutes when known or inferred
3. Let global checklist views filter quick/urgent work without removing project context

Waiting-on tracking:

1. Store a todo's `waiting_on_person_id` in SQLite
2. Show the linked person's name in checklist and briefing views
3. Mirror the raw person link into `memory/todos/active.md`
4. Preselect a waiting-on person during natural-language capture when a saved person name clearly appears
5. Upsert `person_work_links` rows for the linked project and parent mission when a waiting-on todo is project-linked
6. Keep full relationship context in structured records rather than embedding it only in prose

People lookup:

1. Match people by canonical name and aliases
2. Answer contact, billing address, profile, and relationship questions from SQLite
3. Use the same lookup service for desktop now and Slack/voice later

Assistant report context:

1. Store ordered report actions in `suggestion_contexts`
2. Resolve explicit ordinal follow-ups such as `mark the first one done`
3. Execute only supported actions against statusable work records
4. Refuse vague or unsupported follow-ups rather than guessing

Calendar settings:

1. Store each calendar account as a separate `calendar_connections` row
2. Support Google, Outlook, and other provider labels from the start
3. Keep connection metadata local until OAuth/import adapters are implemented
4. Import adapters should write normalized events into the existing `appointments` table

Daily brief generation:

1. Query the current work snapshot from SQLite
2. Exclude completed work
3. Rank same-day appointments first, then overdue, due-today, due-soon, critical/high-priority, and money-related items
4. Produce a compact spoken-style summary
5. Write the generated brief to `memory/daily/<YYYY-MM-DD>.md`

## Documentation Rule

Storage changes must update this file, `DECISIONS.md`, and `ENGINEERING_LOG.md`.
