# Roadmap Master Networking 13

## Local Pairing Lifecycle Hardening

RM13 hardens the local-only Home PC Master pairing lifecycle before any future client scans QR codes or any transport runtime exists. It formalizes offer creation, fingerprint-only QR payloads, local handoff completion, paired-device records, offer revocation, device revocation, expiration, and local request-staging eligibility.

## Boundary

The selected transport remains `none`.
The QR transport remains `none`.
Request acceptance remains blocked.
Paired devices remain local records only.
Active paired devices may be eligible to stage local pending-confirmation requests, but that does not accept remote writes or mutate Praxis work records.

RM13 does not implement RM14-RM17.

## Shared Contract

`shared/homeNodeLocalPairingLifecycle.ts` defines a pure local lifecycle contract:

- `createHomeNodeLocalPairingOffer` creates a pending local offer with a fingerprint of the one-time code, never the raw code.
- `buildHomeNodeLocalPairingQrPayload` emits a QR-safe payload with `selectedTransport: "none"`, `qrTransport: "none"`, blocked request acceptance, and explicit false runtime authority flags.
- `completeHomeNodeLocalPairingHandoff` completes a pending, unexpired offer only when the provided one-time code matches the stored fingerprint.
- `revokeHomeNodeLocalPairingOffer` blocks later completion of an uncompleted offer.
- `revokeHomeNodePairedDevice` changes an active device to revoked and blocks local request staging.
- `canStageHomeNodeLocalRequestForDevice` allows only active devices with the pending-confirmation scope to stage local review records.

## Explicit Exclusions

The RM13 lifecycle excludes:

- Raw one-time codes in QR payloads, paired-device records, or audit events.
- Tokens.
- Endpoint URLs.
- Provider payloads.
- Storage paths.
- Provider credentials.
- Transport credential stores.
- Socket binding, listeners, relays, discovery, sync runtimes, file watchers, health probes, selected transport persistence, QR transport activation, remote request acceptance, and direct remote writes.

## Verification

Focused test coverage lives in `tests/home-node-local-pairing-lifecycle.test.ts` and runs through:

```powershell
npm run test:home-node-networking
```

The test proves:

- Offer creation stores only a one-time-code fingerprint.
- QR payloads advertise transport `none`, request acceptance `blocked`, and no raw code, endpoint, provider payload, or storage path.
- Incorrect one-time codes, expired offers, and revoked offers cannot complete pairing.
- Successful handoff creates only a local paired-device record.
- Device revocation blocks later local request staging.
- Malformed offer inputs with unsafe raw fields are sanitized and do not echo secrets, URLs, payloads, storage paths, or raw one-time codes.
