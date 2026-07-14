# Roadmap Master Networking 16

## Companion Session Envelope Contract

RM16 packages the RM15 companion-safe master snapshot into a local-only companion session envelope. It is a handoff manifest for a future companion client, not a transport runtime.

## Boundary

The selected transport remains `none`.
The runtime provider remains `none`.
The QR transport remains `none`.
Request acceptance remains blocked.
No endpoint, relay payload, socket listener, provider payload, token, storage path, or command payload is included.
Paired-device identity remains excluded from the envelope.

RM16 does not implement RM17.

## Shared Contract

`shared/homeNodeCompanionSessionEnvelope.ts` defines `buildHomeNodeCompanionSessionEnvelope`, a pure builder that returns:

- A versioned RM16 envelope with normalized timestamps and a safe envelope ID.
- Recipient eligibility based on a local RM13 paired-device record without exposing the device ID or label.
- A local-only handoff boundary proving transport, runtime provider, QR transport, request acceptance, endpoints, relays, sockets, provider payloads, and storage paths remain inactive.
- The RM15 companion-safe snapshot as the only payload.
- Diagnostics that block the envelope when the paired device is missing/revoked, lacks `read_master_snapshot`, the handoff window is expired, the snapshot is not read-only, the snapshot accepts commands, transport is enabled, or RM12 closeout evidence is incomplete.
- Authority flags proving no runtime/network/write authority is granted.

## Explicit Exclusions

The RM16 envelope excludes:

- Paired-device IDs and labels.
- Raw one-time codes, tokens, secrets, credentials, endpoint URLs, relay payloads, provider payloads, storage paths, and direct database rows.
- Raw work records, pending-confirmation request bodies, write commands, direct remote writes, provider writes, listeners, sockets, relays, sync runtimes, discovery, and health probes.

## Verification

Focused coverage lives in `tests/home-node-companion-session-envelope.test.ts` and runs through:

```powershell
npm run test:home-node-networking
```

The test proves:

- An active scoped paired device can receive a ready local-only envelope containing only the RM15 safe snapshot.
- The envelope blocks unsafe or incomplete inputs.
- Pairing secrets, device identity, endpoints, provider payloads, and storage paths are not copied into the envelope.
- Every runtime authority remains false.
