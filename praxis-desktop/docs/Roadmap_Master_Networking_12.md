# Roadmap Master Networking 12

## Master Networking Phase Closeout Matrix

RM12 closes the Home PC Master / Home Node pre-runtime networking phase by adding a shared, summary-only evidence contract. It exists to prove RM01-RM11 still agree before any client, transport, relay, listener, discovery, credential, or provider-runtime work begins.

## Boundary

The selected transport remains `none`.
The runtime selected provider remains `none`.
The QR transport remains `none`.
Paired devices remain local records only.
The listener-free wrapper may be armed for local status, but request acceptance remains blocked.

RM12 does not implement RM13-RM17.

## Shared Contract

`shared/homeNodeNetworkingCloseout.ts` defines `buildHomeNodeNetworkingPhaseCloseout`, a pure closeout builder that returns:

- Sanitized schema and source version labels.
- Safe counts for approval summaries, runtime snapshot summaries, Settings display rows, paired device records, readiness checks, and denied authorities.
- Readiness status: `ready_for_client_phase` or `blocked`.
- Settings/runtime consistency checks for selected transport, runtime provider, QR transport, paired device count, and request acceptance.
- Runtime summary limited to `none`, local listener-free status, and blocked request acceptance.
- Settings summary limited to `none` transport/provider fields and a paired-device local-record count.
- Evidence completeness for required source versions, Settings summary, runtime summary, and readiness checks.
- Denied authority flags for every prohibited runtime authority.

## Explicit Exclusions

The RM12 closeout contract excludes:

- Raw approval packets.
- Raw runtime snapshots.
- Raw Settings display rows.
- Unsafe packet content.
- Secrets.
- Endpoint URLs.
- Provider payloads.
- Storage paths.
- Direct database/source data.

Source versions are allowlisted labels only. Values that look like URLs, paths, or otherwise unsafe identifiers are redacted.

## Denied Runtime Authorities

The closeout always reports these authorities as denied:

- Public relay.
- Self-hosted relay runtime.
- LAN listener.
- Direct private mesh listener.
- Public listener.
- LAN/network socket binding.
- Automatic discovery.
- Dropbox sync runtime.
- File watcher.
- Provider credential path.
- Transport credential store.
- Raw payload access.
- Health probe runtime.
- Selected transport persistence.
- QR transport activation.
- Request acceptance.
- Direct remote write path.
- Provider access.

## Settings Surface

This worktree does not contain an existing Remote Access / Home PC Master Settings area. RM12 therefore does not add a Settings panel or IPC path. The closeout remains available as a shared, read-only summary contract for a future Settings integration.

## Verification

Focused test coverage lives in `tests/home-node-networking-closeout.test.ts` and is run with:

```powershell
npm run test:home-node-networking
```

The test proves:

- The safe RM12 closeout is ready only when Settings/runtime summaries agree on `none` and request acceptance is blocked.
- Empty or incomplete evidence remains blocked even when default summaries are locally safe.
- Every prohibited runtime authority is denied.
- Unsafe transport/provider/request values block readiness and are redacted in checks.
- Raw approval packets, raw runtime snapshots, raw Settings rows, endpoint URLs, provider payloads, storage paths, and direct source details are not copied into the closeout.
