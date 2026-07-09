# Roadmap Master Networking 15

## Companion-Safe Master Snapshot Contract

RM15 defines the first read-only Home PC Master snapshot shape that a future companion client may consume. It is transport-neutral and summary-only. It does not wire IPC, add a runtime, expose storage, or provide write commands.

## Boundary

The selected transport remains `none`.
The runtime provider remains `none`.
The QR transport remains `none`.
Request acceptance remains blocked.
Paired devices remain local records only.
Pending confirmations remain local review records only.

RM15 does not implement RM16-RM17.

## Shared Contract

`shared/homeNodeCompanionSafeMasterSnapshot.ts` defines `buildHomeNodeCompanionSafeMasterSnapshot`, a pure builder that returns:

- Home PC Master status from the RM12 closeout.
- Active/revoked paired-device counts and request-staging eligible count.
- Pending-confirmation counts by status and action kind.
- Safe work overview counts for missions, projects, todos, deadlines, appointments, waiting-on, blocked, paused, overdue, due-today, quick-action, money-related, people, and active relationships.
- Diagnostics counts for denied authorities and excluded evidence.
- Capability flags proving the snapshot is read-only and contains no command/write/storage/provider authority.

## Explicit Exclusions

The RM15 snapshot excludes:

- Raw work records.
- Work, appointment, person, memory, email, chat, provider, and database record bodies.
- Individual titles, names, aliases, notes, summaries, message bodies, and message subjects.
- Provider IDs, source refs, external IDs, account numbers, invoice numbers, endpoint URLs, provider payloads, tokens, secrets, credentials, storage paths, markdown paths, memory paths, and direct database rows.
- Write commands, direct remote writes, provider writes, selected transport persistence, QR transport activation, runtime health probes, file watchers, listeners, sockets, relays, sync runtimes, and discovery.

## Verification

Focused coverage lives in `tests/home-node-companion-safe-master-snapshot.test.ts` and runs through:

```powershell
npm run test:home-node-networking
```

The test proves:

- The snapshot reports only counts/statuses and read-only capability flags.
- Paired-device and pending-confirmation summaries derive from RM13/RM14 records without exposing device IDs or confirmation content.
- Unsafe work/provider/person/calendar/memory/source fields are not copied into the snapshot.
- Every runtime authority remains false.
