# Roadmap Master Networking 17

## Networking Setup Closeout Contract

RM17 closes the RM12-RM16 pre-transport networking setup. It records that the local pairing lifecycle, pending-confirmation lifecycle, companion-safe snapshot, and companion session envelope are internally consistent and ready for a later transport-planning phase.

## Boundary

The selected transport remains `none`.
The runtime provider remains `none`.
The QR transport remains `none`.
Request acceptance remains blocked.
Runtime activation remains `not_started`.
Public networking, listener sockets, remote writes, provider writes, and selected transport persistence remain disabled.

RM17 does not implement runtime transport, QR transport activation, relay selection, endpoint publication, listener binding, discovery, provider credential storage, or remote write execution.

## Shared Contract

`shared/homeNodeNetworkingSetupCloseout.ts` defines `buildHomeNodeNetworkingSetupCloseout`, a pure builder that returns:

- A versioned RM17 closeout with completed roadmap masters `RM12` through `RM17`.
- `preTransportSetupStepsRemaining: 0` when the setup closeout is recorded.
- A readiness status of `ready_for_transport_planning` only when RM12 closeout is ready, RM15 summary counts match RM13/RM14 records, and RM16 has a ready local companion envelope for the same snapshot.
- Boundary flags proving no runtime transport or write authority has been enabled.
- Summary counts for active/revoked paired devices and pending-confirmation statuses without carrying raw records forward.
- Diagnostics for closeout, snapshot, envelope, and summary mismatches.
- Denied authority flags for every networking runtime authority.

## Explicit Exclusions

The RM17 closeout excludes:

- Paired-device IDs and labels.
- Pending-confirmation titles, summaries, reasons, and raw request bodies.
- Work, appointment, person, memory, email, chat, provider, and database record bodies.
- Endpoint URLs, provider payloads, tokens, secrets, credentials, storage paths, direct database rows, transport activation, write commands, remote writes, provider writes, listeners, sockets, relays, sync runtimes, discovery, and health probes.

## Verification

Focused coverage lives in `tests/home-node-networking-setup-closeout.test.ts` and runs through:

```powershell
npm run test:home-node-networking
```

The test proves:

- RM12-RM16 can close as ready for transport planning with zero remaining pre-transport setup steps.
- Transport and write boundaries remain inactive.
- Summary mismatches block the closeout.
- Pairing secrets, device identity, pending-confirmation text, endpoints, provider payloads, and storage paths are not copied into the closeout.
