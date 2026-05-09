# ARCHITECTURE

## Principle

Praxis Desk is a desktop-first assistant with reusable core logic and multiple interaction surfaces.

The desktop app is the primary workspace.
Slack is an adapter that mirrors assistant suggestions and accepts quick replies.

Praxis must also support a future companion client, such as a Surface app used while traveling,
without moving the assistant brain out of the operator's main PC.

## Layers

1. Core domain
   - Ideas
   - Missions
   - Tasks
   - Signals
   - Insights

2. Assistant core
   - Suggestion generation
   - Candidate ranking
   - Context tracking
   - Contextual reply resolution
   - Command binding

3. Surface adapters
   - Desktop UI
   - Slack
   - Future companion client
   - Future Discord

4. Persistence
   - Local event log
   - Snapshots
   - Future richer persistence once the domain broadens

## Home Node And Companion Clients

The main PC is the Praxis Home Node. It owns:

- SQLite operational state
- Markdown memory
- Encrypted integration secrets
- Local AI/Ollama routing
- Calendar, Slack, inbox, and finance adapters
- Command execution and write safety

Companion clients are secondary surfaces. A Surface client should be able to show todos, projects,
missions, reports, people lookup, and safe quick replies, but it should not directly open or mutate
the Home Node database, markdown files, or secret vault.

The required long-term shape is:

- Desktop, Slack, voice, and companion clients all call shared assistant/work services.
- Writes resolve into explicit command/service calls before state changes.
- Companion clients receive snapshots and submit commands through a narrow local API or trusted
  relay.
- Remote access should be designed later around an explicit trust layer such as VPN, Tailscale, or a
  purpose-built authenticated relay.
- Raw integration secrets and raw source data should remain on the Home Node unless a later privacy
  decision explicitly changes that.

This means renderer-only business logic is architectural debt. New features should prefer shared
main-process services and typed IPC contracts so the same behavior can be reused by future clients.

### Implemented Companion Boundary

The first companion boundary is snapshot-based with a narrow explicit-command gateway.

- Shared contract: `praxis-desktop/shared/companionSnapshot.ts`
- Command contract: `praxis-desktop/shared/companionCommand.ts`
- Main-process aggregator: `praxis-desktop/electron/companionSnapshot.ts`
- Main-process command gateway: `praxis-desktop/electron/companionCommand.ts`
- Renderer-safe IPC: `window.praxis.companion.getSnapshot()`
- Renderer-safe command IPC: `window.praxis.companion.executeCommand(...)`
- Headless verification command: `npm run companion:snapshot`
- Headless command smoke test: `npm run companion:command`

The V1 snapshot uses schema version `companion.snapshot.v1` and exposes a compact Home Node status
view: work counts, top move, today/tomorrow appointments, ranked work items, focus targets,
highlighted people, pending email follow-up summaries, and integration sync status. It intentionally
does not expose raw email messages, provider external IDs, OAuth settings, encrypted secrets, or
direct database paths.

The snapshot advertises `readOnly: true`, `commandsAccepted: true`, `explicitCommandOnly: true`,
and `directStorageAccess: false`. Companion clients may submit typed command requests, but the Home
Node is still the only writer. The gateway routes text through assistant/capture services, rejects
context-only replies that do not name a target, and requires explicit confirmation before write-like
commands create or modify local work records.

## Contextual Action Resolution

Each proactive suggestion should store:

- Suggestion id
- Surface id
- Thread or conversation id
- Prompt shown to the user
- Candidate actions
- Ranking score for each action
- Bound command invocation for each action

When the user replies:

- Parse the reply for acceptance, rejection, ordinal references, or target references
- If the reply is ordinal, select that candidate directly
- If the reply is a vague acceptance like `yes`, execute the highest-ranked candidate only when it clearly leads the pack
- If the top candidates are too close, ask for clarification
- Always convert the resolved action into a normal command invocation

## AI Task Review And ADHD Reset Mode

AI Task Review is core PRAXIS work, not optional polish. Its purpose is to help the operator recover
context through natural language when attention has scattered or the backlog feels too noisy.

The interface should be conversational. Examples include:

- `reset me`
- `what am I missing?`
- `what should I do next?`
- `what changed since yesterday?`
- `what is stale?`

Before any model is called, PRAXIS should build a factual context packet from trusted local sources:

- work graph records for missions, projects, todos, deadlines, people, and relationships
- calendar appointments and near-term schedule pressure
- Review Inbox candidates across email and chat imports
- stale projects and inactive missions
- waiting-on items and blocked work
- overdue, due-today, and due-soon items
- quick wins and high-priority quick actions
- recent changes from daily brief closeout summaries and local event/state metadata
- service health for Google, Outlook, Slack, memory, and companion boundaries

The packet is the source of truth for the review. It should contain factual summaries, stable record
ids, timestamps, priority/risk signals, and allowable follow-up actions. It should not contain raw
email bodies, raw chat transcripts, OAuth tokens, provider external IDs when avoidable, database
paths, or secrets.

The model role is limited to summarizing, prioritizing, explaining tradeoffs, and suggesting next
moves. Rule-based ranking remains the safety net and should be able to produce a deterministic
review when a model is unavailable, slow, or low-confidence.

Model execution is local-first. The preferred direction is Ollama with a configurable local model.
Settings may later expose optional API provider configuration, but API use should be explicit,
operator-controlled, and governed by an AI reliance policy. The policy is:

- local structured state remains authoritative
- model output can advise, summarize, explain, and draft
- the model must not silently mutate the work graph
- writes go through Review Inbox candidates, staged drafts, explicit command confirmation, or normal
  assistant command handlers
- every write-like suggestion must be inspectable before it changes local state

## AI Project Template Proposals

AI project template discovery is a staged architecture, not a direct write path.

The required boundary is:

1. Pure detector
2. Proposal state and filtering service
3. Review Inbox UI
4. Explicit accepted-template markdown save

The detector is pure, deterministic, and no-write. It may inspect local structured context and return
candidate project-template proposals, but it must not insert database rows, write markdown, create
providers, call AI/API providers, or mutate app state.

Proposal state belongs to SQLite-first service logic after detection. Its purpose is to remember
proposal identity, review status, eligibility, and anti-nagging signals so the operator is not shown
the same ineligible or dismissed proposal repeatedly. This state is operational and filterable; it is
not a saved project template.

The Review Inbox should receive only proposals that pass the service's eligibility filters. Raw
provider payloads, tokens, encrypted values, `secure_secrets`, and unnecessary external identifiers
must not be exposed through proposal packets or review UI surfaces.

Accepting a proposal in Review Inbox should not immediately write markdown. Accepted proposals become
eligible for a later explicit confirmation slice that saves a canonical markdown project template.
Until that confirmation happens, the accepted state remains proposal state, not a durable template.

Saved project templates are creation-time seeds. They may help initialize future projects, but
existing projects do not auto-mutate when a template is added, accepted, edited, or removed.

## Definitions

- Idea: a captured possibility that has not yet been committed to
- Mission: a chosen outcome worth pursuing
- Task: a concrete step that advances a mission or handles work
- Signal: a detected pattern in behavior, timing, volume, or activity
- Insight: a useful interpretation of one or more signals presented back to the user

## Current Implementation Direction

- Shared assistant modules live under `shared/assistant`
- Desktop shell consumes the same resolver that Slack will use later
- Action execution stays command-backed even when the user reply is implicit

## Release Boundary

Praxis Desk releases are packaging artifacts around the desktop app, not a separate behavior surface.
Release work should not change assistant routing, storage, sync, dashboard, or command behavior unless a
separate product task explicitly asks for it.

The first distribution channel is direct private delivery of the Windows `x64` NSIS installer to the
operator or explicitly approved testers. Public website downloads, GitHub Releases, Microsoft Store,
and broad client-facing channels are deferred.

Unsigned installers are validation artifacts only. A public or broadly shared release requires a
Praxis Project/operator-owned signing certificate, with signing secrets stored outside git and outside
markdown memory.
