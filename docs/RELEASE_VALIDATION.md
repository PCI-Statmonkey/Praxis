# RELEASE VALIDATION

## 2026-04-28 - Native Module Package Fix Validation

- Validator: David / CB-David
- Scope: Fix and validate the Windows package launch failure caused by `better-sqlite3 ... tmp.node is not a valid Win32 application`.
- Package commands:
  - `npm run build:app` - Pass
  - `npm run package:win` - Pass
  - `npm run package:win:arm64` - Pass
- Signing: no signing attempted; generated installers remain `NotSigned`.

### Root Cause

- Result: Confirmed.
- The previous Windows `x64` package was built on a Windows ARM64 machine while `npmRebuild` was disabled.
- The package copied the host ARM64 `node_modules/better-sqlite3/build/Release/better_sqlite3.node` into the x64 artifact.
- PE header evidence before the fix showed the local native module as ARM64 (`0xaa64`) while the installer target was x64.
- Electron then failed to load the native module in the packaged app with `tmp.node is not a valid Win32 application`, leaving background `PraxisDesk.exe` processes and no visible window.

### Packaging Fix

- File changed: `praxis-desktop/electron-builder.json5`
- `npmRebuild` changed from `false` to `true` so Electron Builder rebuilds or installs native dependencies for the requested package target architecture.
- Added `asarUnpack` for `node_modules/better-sqlite3/build/Release/*.node` so the native binary is available outside `app.asar`.
- Left `nodeGypRebuild` as `false`; Electron Builder successfully used prebuilt `better-sqlite3` binaries for both Windows targets.

### Artifact Validation

- x64 artifact: `praxis-desktop/release/win-x64/0.1.0/Praxis Desk-Windows-0.1.0-Setup.exe`
- x64 installer size: 89,060,520 bytes
- x64 installer SHA-256: `59F2B4323DC2A5A2672764B2B68D1D781024BD5C9EE8302A09CCC37C76A0F0E2`
- x64 packaged native module: `release/win-x64/0.1.0/win-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
- x64 native module machine: x64 (`0x8664`)
- x64 unpacked launch result: visible main window opened; Settings accelerator opened a second visible window in the direct unpacked-app check; closing visible windows left no `PraxisDesk.exe` processes.

- ARM64 artifact: `praxis-desktop/release/win-arm64/0.1.0/Praxis Desk-Windows-0.1.0-Setup.exe`
- ARM64 installer size: 84,824,870 bytes
- ARM64 installer SHA-256: `8D6DE5D72C320AC6A0B6858D357F141874E84E997406FF17062D4B277DE6FDC0`
- ARM64 packaged native module: `release/win-arm64/0.1.0/win-arm64-unpacked/resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node`
- ARM64 native module machine: ARM64 (`0xaa64`)
- ARM64 installer signature status: `NotSigned`

### ARM64 Installed-App Smoke Check

- Result: Pass for native launch, dashboard window, close behavior, and uninstall mechanics.
- Validation machine architecture: Windows ARM64.
- Installer command: `Praxis Desk-Windows-0.1.0-Setup.exe /S`
- Installer exit code: `0`
- Installed executable: `%LOCALAPPDATA%\Programs\PraxisDesk\PraxisDesk.exe`
- Installed executable machine: ARM64
- Installed registry entry: `Praxis Desk 0.1.0`
- Launch result: one visible top-level app window opened.
- Dashboard result: visible main renderer window opened at 1453 x 973 with the packaged app title.
- Close result: closing visible app windows left no orphaned `PraxisDesk.exe` processes.
- Settings result: Pass by operator manual validation after the automated run. The installed ARM64 app opened Settings, email and calendar sources were reconnected from Settings, temporary connection errors cleared after reconnect, and services showed online.
- Uninstall command: `Uninstall PraxisDesk.exe /currentuser /S`
- Uninstaller exit code: `0`
- Registry after uninstall: no Praxis uninstall entry found.
- Remaining processes after uninstall: `0`
- User data path: `%APPDATA%\praxis-desktop`
- User data result: preserved after uninstall, 690 files, 63,648,628 bytes.
- Install folder cleanup: `%LOCALAPPDATA%\Programs\PraxisDesk` remained as an empty directory after uninstall.

### Viability

- x64 package: viable for x64 Windows and for ARM64 Windows running the x64 package under emulation, because the x64 artifact now carries an x64 `better-sqlite3` native module and direct unpacked launch opened visibly.
- ARM64 package: preferred for this Windows ARM64 machine and validated through install, visible launch, clean close, and uninstall.
- Private sharing recommendation: approved for private validation sharing, assuming the operator accepts the empty `%LOCALAPPDATA%\Programs\PraxisDesk` uninstall folder as known low-priority release debt.

### Remaining Notes

- The original native-module launch blocker is fixed.
- The empty install directory after uninstall is tracked as release tech debt.
- The installed ARM64 Settings blocker is cleared by operator manual validation.
- Any expected SmartScreen behavior can still be noted during future visible installer passes, but it no longer blocks this private validation sharing recommendation.

## 2026-04-27 - Private Windows x64 Smoke Check

- Validator: David / CB-David
- Validation time: 2026-04-27 16:03:07 -04:00
- Package command for this artifact path: `npm run package:win`
- Artifact folder: `praxis-desktop/release/win-x64/0.1.0/`
- Installer: `praxis-desktop/release/win-x64/0.1.0/Praxis Desk-Windows-0.1.0-Setup.exe`
- Unpacked executable: `praxis-desktop/release/win-x64/0.1.0/win-unpacked/PraxisDesk.exe`
- Installer size: 88,869,071 bytes
- Installer SHA-256: `EC765ECAA6C29DBDDABA1E49CD1E704E01E6533EC7AC866C3BB54A210576DB58`

### Artifact Presence

- Result: Pass
- Confirmed expected files exist:
  - `Praxis Desk-Windows-0.1.0-Setup.exe`
  - `Praxis Desk-Windows-0.1.0-Setup.exe.blockmap`
  - `builder-debug.yml`
  - `win-unpacked/PraxisDesk.exe`

### Signature Status

- Installer command: `Get-AuthenticodeSignature "release/win-x64/0.1.0/Praxis Desk-Windows-0.1.0-Setup.exe"`
- Installer result: `NotSigned`
- Unpacked command: `Get-AuthenticodeSignature "release/win-x64/0.1.0/win-unpacked/PraxisDesk.exe"`
- Unpacked result: `NotSigned`
- Interpretation: Pass for the unsigned private validation path. No signing was attempted.

### Secret And Local Data Audit

- Result: Pass
- Release folder filename audit found no `.env`, database, SQLite, JSONL, memory, sync, credential, refresh-token, or access-token files.
- `win-unpacked/resources` contains `app.asar` and Electron Builder `elevate.exe`.
- ASAR filename audit outside `node_modules` found no secret, token, credential, OAuth, database, memory, Dropbox, or sync artifact names.
- `builder-debug.yml` search found no certificate, signing, password, token, secret, CSC, or publisher entries.
- Note: dependency package names include expected Slack/OAuth library files; no bundled operator credentials or local operator data were identified.

### Unpacked App Launch

- Result: Partial
- Launched `win-unpacked/PraxisDesk.exe`.
- Observed three responsive `PraxisDesk` processes.
- No fatal crash was observed during the launch window.
- Blocker: the automated desktop session did not expose an activatable titled Praxis window through `AppActivate`, and process `MainWindowTitle` remained empty. Dashboard and Settings visual checks could not be completed from automation.
- Cleanup: stopped the launched `PraxisDesk` processes after the check.

### Installer Install Flow

- Result: Pass for silent install mechanics; visual installer flow not validated.
- Command: `Praxis Desk-Windows-0.1.0-Setup.exe /S`
- Installer exit code: `0`
- Registry entry after install: `Praxis Desk 0.1.0`
- Installed path: `%LOCALAPPDATA%\Programs\PraxisDesk`
- Installed executable signature status: `NotSigned`
- Blocker: because the installer was run silently, the visible wizard text, SmartScreen prompt, and manual per-user install screens were not visually confirmed.

### Installed App Launch, Dashboard, And Settings

- Result: Partial
- Launched `%LOCALAPPDATA%\Programs\PraxisDesk\PraxisDesk.exe`.
- Observed three responsive `PraxisDesk` processes.
- No fatal crash was observed during the launch window.
- Blocker: the automated desktop session did not expose an activatable titled Praxis window through `AppActivate`, and process `MainWindowTitle` remained empty. First-run dashboard load and Settings load could not be visually confirmed.
- Cleanup: stopped the launched `PraxisDesk` processes before uninstalling.

### Uninstall And Local Data

- Result: Pass for silent uninstall mechanics and user-data retention.
- Command: `Uninstall PraxisDesk.exe /currentuser /S`
- Uninstaller exit code: `0`
- Registry entry after uninstall: none found for Praxis.
- Install directory after uninstall: `%LOCALAPPDATA%\Programs\PraxisDesk` remained as an empty directory.
- User data path observed: `%APPDATA%\praxis-desktop`
- User data after uninstall: present, 690 files, 63,619,861 bytes.
- Interpretation: uninstall did not delete local user data unexpectedly, consistent with `deleteAppDataOnUninstall: false`.

### Evidence Captured

- Artifact paths and presence.
- Installer file size and SHA-256 hash.
- Required Authenticode status for installer and unpacked executable.
- Silent installer exit code and installed registry entry.
- Installed executable path and signature status.
- Installed app launch process observation.
- Silent uninstaller exit code and post-uninstall registry absence.
- User data retention after uninstall.
- Release folder and ASAR filename audits for bundled secrets/local data.

### Blockers

- Dashboard load was not visually confirmed.
- Settings load was not visually confirmed.
- Visible installer wizard and SmartScreen behavior were not visually confirmed.
- The install directory remained as an empty `%LOCALAPPDATA%\Programs\PraxisDesk` folder after silent uninstall.

### Approval Recommendation

- Recommendation: Not approved for private validation sharing yet.
- Reason: the artifact passes presence, unsigned-status, secret/local-data audit, silent install, launch-process, and silent uninstall checks, but the smoke check did not complete the required visual dashboard, Settings, and visible installer-flow validation. A manual desktop pass should complete those items before sharing.
