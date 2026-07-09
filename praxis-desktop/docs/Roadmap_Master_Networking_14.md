# Roadmap Master Networking 14

## Pending Confirmation Lifecycle Hardening

RM14 formalizes the Home PC Master pending-confirmation lifecycle for write-like future client requests. A paired device can stage a local review record only when it is active and scoped for pending confirmations. The lifecycle never applies the requested work change and never accepts client-side confirmation as authority.

## Boundary

The selected transport remains `none`.
Request acceptance remains blocked.
Paired devices remain local records only.
Write-like requests become local pending-confirmation records only.
Local confirmation changes the confirmation record status to `confirmed_locally`; it does not mutate todos, projects, missions, deadlines, providers, or storage sources.

RM14 does not implement RM15-RM17.

## Shared Contract

`shared/homeNodePendingConfirmationLifecycle.ts` defines a pure local lifecycle contract:

- `stageHomeNodePendingConfirmation` stages a sanitized pending record from an active paired device.
- Client-provided `confirmed: true` is rejected and normalized to `clientConfirmed: false`.
- Revoked or unscoped devices cannot stage confirmations.
- Expired requests and expired records become `expired`.
- `confirmHomeNodePendingConfirmationLocally` changes only the confirmation status to `confirmed_locally`.
- `dismissHomeNodePendingConfirmation` changes only the confirmation status to `dismissed`.
- `expireHomeNodePendingConfirmation` changes only the confirmation status to `expired`.

Every record carries:

- `writeBoundary: "pending_local_confirmation_only"`.
- `localOperatorConfirmationRequired: true`.
- `workMutationApplied: false`.
- `directRemoteWritePerformed: false`.
- `providerWritesPerformed: false`.
- False runtime authority flags.

## Explicit Exclusions

The RM14 lifecycle excludes:

- Raw request payloads.
- Unsafe packet content.
- Provider payloads.
- Endpoint URLs.
- Storage paths.
- Message bodies.
- Message subjects.
- Provider IDs.
- Account numbers.
- Invoice numbers.
- Secrets, tokens, passwords, and credentials.
- Transport credential stores.
- Socket binding, listeners, relays, discovery, sync runtimes, file watchers, health probes, selected transport persistence, QR transport activation, remote request acceptance, and direct remote writes.

## Verification

Focused test coverage lives in `tests/home-node-pending-confirmation-lifecycle.test.ts` and runs through:

```powershell
npm run test:home-node-networking
```

The test proves:

- Active paired devices can stage only sanitized pending local confirmation records.
- Local confirmation, dismissal, and expiration mutate only the confirmation record status.
- Client-side `confirmed: true` is rejected.
- Revoked devices cannot stage new confirmations.
- Expired records cannot later confirm locally.
- Unsafe request fields and malformed existing records do not echo message bodies, subjects, account numbers, invoice numbers, tokens, endpoint URLs, provider payloads, storage paths, or raw request content.
