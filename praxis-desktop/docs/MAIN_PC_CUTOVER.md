# Main PC Cutover

This checklist is for moving Praxis Desk from development/validation on this machine to active operation and continued Codex development on the main PC.

## Roadmap Masters

The detailed cutover sequence lives in:

- [Roadmap Master Main PC Cutover Index](Roadmap_Master_Main_PC_Cutover_Index.md)

## Preflight Command

Run from `praxis-desktop/`:

```powershell
npm run main-pc:preflight
```

Optional flags:

```powershell
npm run main-pc:preflight -- --repair-memory
npm run main-pc:preflight -- --package-win
```

`--repair-memory` rewrites generated markdown mirrors and repairs the memory index. Use it only when you intentionally want to normalize local operator memory.

`--package-win` builds the unsigned Windows x64 installer for a smoke test. It creates release artifacts and should be followed by the release checklist before sharing.

## Development Move

Before moving active development:

- Commit and push source changes from the current worktree.
- Install Codex on the main PC.
- Clone or fetch the repository on the main PC.
- Run `npm install`.
- Run `npm run repair:native` if native Electron dependencies drift.
- Run `npm run main-pc:preflight` on the main PC.

## Data Move

Back up and transfer only operator data you intentionally want to keep:

- `%APPDATA%\praxis-desktop`
- The markdown `memory/` root if it lives outside `%APPDATA%\praxis-desktop`
- Any manually maintained local setup notes that are not committed source

Do not expect OS-backed encrypted secrets to transfer cleanly. OAuth/API/Slack credentials should be reconnected on the main PC.

## Operational Smoke Test

After the preflight passes on the main PC:

- Launch Praxis Desk.
- Confirm dashboard and Settings open.
- Confirm storage health loads.
- Confirm calendar/email connections show the expected reconnect state.
- Reconnect Google/Outlook/AI/Slack credentials as needed.
- Create, edit, complete, and reschedule a todo.
- Create an appointment.
- Ask `what matters today?`.
- Ask a focus/status question.
- Run an AI review/reset question.
- Confirm Rainmeter snapshot export if Rainmeter is part of the main-PC setup.

## Not Required For Cutover

These are not blockers for making the main PC the system of record:

- Code signing
- Public release distribution
- Voice mode
- Bill.com integration
- Provider calendar write-back
- Remote Surface/mobile transport
