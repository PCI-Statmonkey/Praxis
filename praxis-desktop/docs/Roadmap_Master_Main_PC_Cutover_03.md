# Roadmap Master Main PC Cutover 03

## Main PC Development Bootstrap

RM-CUTOVER-03 makes the main PC ready to continue active Codex development and build Praxis locally.

## Scope

- Install Codex on the main PC.
- Fetch the committed repository state.
- Install Node/Electron dependencies.
- Repair native dependencies when needed.
- Prove the main PC can run the same cutover preflight.

## Required Actions

1. Install Codex on the main PC.
2. Clone or fetch the repository.
3. From `praxis-desktop/`, install dependencies:

```powershell
npm install
```

4. If native modules drift or Electron is missing, run:

```powershell
npm run repair:native
node node_modules\electron\install.js
```

5. Run:

```powershell
npm run main-pc:preflight
```

## Evidence

- Codex opens the main PC workspace.
- `npm install` completes.
- Electron runtime exists at `node_modules\electron\dist\electron.exe`.
- `npm run main-pc:preflight` passes on the main PC.

## Done Criteria

- The main PC can build, lint, test, run storage checks, export companion snapshots, and export Rainmeter snapshots.
- No source changes are required merely to make the app build on the main PC.
