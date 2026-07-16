# Roadmap Master Main PC Cutover 04

## Machine-Bound Secret Reconnection

RM-CUTOVER-04 reconnects services whose secrets are intentionally not portable across machines.

## Scope

- Reconnect Google and Outlook calendar/email OAuth as needed.
- Reconnect optional AI API provider credentials as needed.
- Recreate Slack token/environment setup if Slack is part of the main PC workflow.
- Confirm connected services return to ready or consciously disabled states.

## Required Actions

1. Launch Praxis Desk on the main PC.
2. Open Settings.
3. Review Google, Outlook, AI, and Slack settings.
4. Reconnect Google/Outlook OAuth connections as needed.
5. Re-enter or reconnect API provider credentials if the API route is used.
6. Recreate Slack environment/token setup or leave Slack intentionally disabled.
7. Run the default cutover preflight again after reconnecting:

```powershell
npm run main-pc:preflight
```

## Evidence

- Storage integrity remains clean.
- Companion snapshot shows expected integration states.
- Calendar/email connections are either:
  - `ready` / `ready_to_sync`, or
  - intentionally disabled/not configured.
- No plaintext secrets are committed or written to markdown memory.

## Done Criteria

- Main PC service states are understood and usable.
- Any disconnected service is a deliberate choice, not a hidden migration failure.
- OAuth/API/Slack secrets exist only in machine-appropriate stores or environment setup.
