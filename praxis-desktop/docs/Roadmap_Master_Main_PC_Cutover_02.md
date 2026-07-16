# Roadmap Master Main PC Cutover 02

## Operator Data Backup And Transfer

RM-CUTOVER-02 prepares the operator data that should become the main PC system of record.

## Scope

- Back up operational app data.
- Back up markdown memory.
- Exclude machine-bound encrypted secrets from direct migration assumptions.
- Record where each backup was written and when.

## Required Actions

1. Close Praxis Desk on the source machine.
2. Back up app data:

```powershell
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = "$env:USERPROFILE\Desktop\praxis-cutover-$stamp"
New-Item -ItemType Directory -Force -Path $backupRoot
Copy-Item -Recurse -Force "$env:APPDATA\praxis-desktop" "$backupRoot\praxis-desktop-appdata"
```

3. Back up the markdown memory root. In this worktree, the Rainmeter export showed the project memory root as:

```powershell
C:\Users\chawk_c4\.codex\worktrees\fd21\Praxis Project\memory
```

Copy it intentionally:

```powershell
Copy-Item -Recurse -Force "C:\Users\chawk_c4\.codex\worktrees\fd21\Praxis Project\memory" "$backupRoot\memory"
```

4. Verify expected backup contents:
   - `praxis.sqlite`
   - markdown `memory\` folders
   - generated summaries and templates
   - Rainmeter runtime snapshot if used

## Boundary

Do not rely on copied OAuth/API/Slack encrypted secrets working on the main PC. OS-backed secret storage is machine-bound. Reconnection is RM-CUTOVER-04.

## Evidence

- Backup folder path.
- Backup timestamp.
- File count and total size for app data and memory folders.
- Confirmation that Praxis was closed during the copy.

## Done Criteria

- A restorable backup exists before anything is changed on the main PC.
- The backup includes SQLite and markdown memory.
- Secrets are treated as reconnect-required, not silently migrated.
