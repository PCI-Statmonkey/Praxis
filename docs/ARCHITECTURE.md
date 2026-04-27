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
