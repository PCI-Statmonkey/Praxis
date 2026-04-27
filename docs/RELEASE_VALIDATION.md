# RELEASE VALIDATION

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
