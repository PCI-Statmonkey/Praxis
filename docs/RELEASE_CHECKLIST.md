# RELEASE CHECKLIST

This checklist covers the current manual release path for Praxis Desk. It does not add signing automation or change app behavior.

## Release Policy

- First channel: direct private delivery of the Windows `x64` NSIS installer to the operator or explicitly approved testers.
- Deferred channels: Microsoft Store, public website downloads, GitHub Releases, and any broad client-facing distribution.
- Signing owner: the future code signing certificate should be owned by the Praxis Project/operator identity, not a contributor's personal machine or account.
- Unsigned path: unsigned installers may be produced for local packaging validation and private tester smoke checks only.
- Signed path: public, client-facing, or broadly shared builds require signing approval before distribution.

## Preflight

- Confirm `CURRENT_TASK.md` has no active release-blocking work.
- Confirm `docs/TECH_DEBT.md` has no high-priority packaging blockers.
- Confirm `docs/DECISIONS.md` still matches the intended distribution and signing policy.
- Confirm `praxis-desktop/electron-builder.json5` has no committed certificate path, signing password, token, or machine-specific secret reference.
- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build:app`.
- Run `npm run storage:check`.
- Run `npm run skills:list`.
- Run `npm run companion:snapshot`.

## Windows Build

- Run `npm run package:win` for the default Windows `x64` installer.
- Use `npm run package:win:arm64` only when a Windows on ARM build is needed.
- Use `npm run package:win:all` only when both Windows architectures are intentionally being produced.
- Confirm the output folder is under `release/win-x64/<version>/`, `release/win-arm64/<version>/`, or `release/win-multi/<version>/`.
- For the first channel, use only the `release/win-x64/<version>/` artifact unless a tester explicitly needs another architecture.
- Treat unsigned Windows installers as validation artifacts, not public release artifacts.

## Private Windows x64 Smoke Check

Use this section after `npm run package:win` and before sharing any private unsigned build.

### Expected Artifacts

- Installer: `praxis-desktop/release/win-x64/<version>/Praxis Desk-Windows-<version>-Setup.exe`
- Blockmap: `praxis-desktop/release/win-x64/<version>/Praxis Desk-Windows-<version>-Setup.exe.blockmap`
- Unpacked executable: `praxis-desktop/release/win-x64/<version>/win-unpacked/PraxisDesk.exe`
- Builder metadata: `praxis-desktop/release/win-x64/<version>/builder-debug.yml`
- Confirm there are no unexpected certificate, key, token, OAuth, `.env`, or secret files in the release folder or `win-unpacked/resources`.

### Unsigned Status

- Run `Get-AuthenticodeSignature` against the installer and `win-unpacked/PraxisDesk.exe`.
- Expected result for the private validation path: both files report `NotSigned`.
- Do not attempt signing during this smoke check.
- If either artifact is signed, confirm that the signing path was intentionally approved before sharing.

### Unpacked App Check

- Launch `win-unpacked/PraxisDesk.exe` directly.
- Confirm the app opens without a fatal error dialog or immediate crash.
- Confirm the dashboard loads and shows the expected Praxis shell, not a blank window.
- Open Settings and confirm the Settings window or view loads correctly.
- Confirm local storage health/status can be viewed without a fatal error.
- Close the app normally and confirm no lingering Praxis process remains unless expected.

### Installer Check

- Run `Praxis Desk-Windows-<version>-Setup.exe` on the validation machine.
- Expect Windows SmartScreen or unsigned-app warnings for unsigned validation builds.
- Confirm the installer displays the Praxis Desk product name and allows the expected per-user installation flow.
- Complete installation, then launch Praxis Desk from the installed shortcut or Start menu entry.
- Confirm first-run behavior does not overwrite existing operator data unexpectedly.
- If validating on a machine with existing Praxis data, back up or note the current app data location before installing.
- Confirm the dashboard loads without fatal errors after install.
- Open Settings and confirm Settings loads correctly after install.
- Uninstall Praxis Desk from Windows Apps or the uninstaller entry.
- Confirm uninstall completes without deleting user data unexpectedly; `deleteAppDataOnUninstall` should remain false for the current NSIS config.

### Secrets And Local Data

- Confirm packaged resources do not include plaintext credentials, OAuth refresh tokens, Slack tokens, calendar tokens, `.env` files, or local operator database copies.
- Confirm the build does not bundle local markdown memory, SQLite data, Dropbox sync artifacts, or generated personal reports unless a future release decision explicitly allows it.
- Confirm any connected-service credentials used during validation remain in the validator's OS-backed secret store and are not copied into the release artifact.

### Approval Evidence

- Record the command used: `npm run package:win`.
- Record the package version and artifact folder path.
- Record installer and unpacked executable signature status.
- Record installer filename and file size.
- Record a SHA-256 hash for the installer.
- Capture screenshots or notes for installer launch, installed app launch, dashboard loaded, Settings loaded, and uninstall completed.
- Record any SmartScreen or antivirus warnings as expected unsigned-build behavior or as a blocker if the warning is unusual.
- Record whether validation used a clean machine/profile or an existing operator profile.
- Approve private sharing only after the evidence shows the build is unsigned, expected, free of bundled secrets, installable, launchable, and uninstallable.

## Artifact Review

- Confirm the installer filename uses `Praxis Desk`.
- Confirm the packaged app uses the Praxis icon, not the default Electron icon.
- Launch the installed app and verify the dashboard opens.
- Open Settings and verify local storage health loads.
- Run a manual calendar sync only if a calendar account is already configured.
- Do not run live email validation unless a Gmail or Outlook row is connected and OAuth is complete.
- If the build is unsigned, record that status in release notes and in any tester handoff.

## Release Notes

- Summarize completed work from `docs/ENGINEERING_LOG.md`.
- Call out known limitations from `docs/TECH_DEBT.md`.
- State the distribution channel: direct private delivery, not public distribution.
- State whether the build is signed or unsigned.
- For unsigned builds, include that the installer is for local/internal validation or explicitly approved private testing only.

## Deferred Signing

- Do not add certificate paths, passwords, or signing secrets to the repository.
- Keep unsigned installer testing separate from signed release approval.
- Certificate ownership is decided as Praxis Project/operator-owned.
- Before implementation, decide whether signing runs locally or in CI.
- Before implementation, decide certificate storage and access control.
- Before implementation, decide the timestamp server.
- Store future signing secrets only in OS-backed or CI secret storage, never in markdown memory or committed config.
