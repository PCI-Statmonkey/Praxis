# Roadmap Master Main PC Cutover 01

## Source Handoff And Preflight Baseline

RM-CUTOVER-01 closes the current development worktree into a clean, reproducible source handoff before moving active Codex development to the main PC.

## Scope

- Keep the RM16/RM17 networking closeout commit as the baseline networking state.
- Keep the main-PC preflight script and runtime-wrapper cleanup as one coherent follow-up unit.
- Resolve the local Git safe-directory issue on this machine before committing.
- Commit and push the cutover-preflight changes so the main PC can fetch the exact source state.

## Required Actions

1. Add the current repo to Git safe directories on this machine:

```powershell
git config --global --add safe.directory "C:/Users/chawk_c4/.codex/worktrees/fd21/Praxis Project"
```

2. Run the default cutover preflight:

```powershell
npm run main-pc:preflight
```

3. Confirm the worktree contains only intentional source/docs/script changes.
4. Commit the cutover-preflight unit.
5. Push or otherwise make the commit available to the main PC.

## Evidence

- `npm run main-pc:preflight` passes.
- `git status --short` is clean after commit.
- The commit includes:
  - `docs/MAIN_PC_CUTOVER.md`
  - `scripts/run-main-pc-cutover-preflight.mjs`
  - `package.json`
  - Electron local runtime wrappers for AI review and plan draft wiring.

## Done Criteria

- Source is committed and available from the main PC.
- No generated `dist-electron` or temporary regression bundle files remain staged.
- The local preflight pass is recorded in the handoff notes or commit message.
