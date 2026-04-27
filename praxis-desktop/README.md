# Praxis Desk

Praxis Desk is a local-first desktop assistant built with Electron, TypeScript, React, and Vite.

The desktop app is the primary product. Slack is a secondary surface for notifications and quick replies so the assistant can meet the user where they already are.

## Current Direction

- Desktop-first assistant with persistent local state
- Event-driven internal architecture
- Proactive suggestions backed by explicit commands
- Contextual action resolution for short replies like `yes`, `do it`, or `1`
- Slack as an adapter, not the system of record

## Current Repo Status

- Electron desktop shell is in place
- Renderer UI includes the Praxis HUD panels
- Master checklist persistence uses an append-only event log plus snapshots
- Assistant core now targets reusable suggestion ranking and contextual action resolution

## Build And Package Commands

- `npm run build:app` compiles the app without creating an installer
- `npm run package` builds and packages the desktop app
- `npm run package:win` builds the Windows `x64` installer into `release/win-x64/<version>/`
- `npm run package:win:arm64` builds the Windows `arm64` installer into `release/win-arm64/<version>/`
- `npm run package:win:all` builds both Windows architectures into `release/win-multi/<version>/`
- `npm run repair:native` repairs native Electron dependencies if they ever drift

## Release Checklist

- [Release Checklist](../docs/RELEASE_CHECKLIST.md)

## Development Priorities

1. Keep the Electron baseline stable and buildable
2. Move core assistant logic into shared channel-agnostic modules
3. Reuse the same command-backed action flow across desktop and Slack
4. Preserve local-first behavior and avoid introducing background schedulers casually

## Docs

- [Product Notes](../docs/readme.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Storage Architecture](../docs/STORAGE_ARCHITECTURE.md)
- [Roadmap](../docs/Roadmap.md)
- [Spec](../docs/Spec.md)
- [Decisions](../docs/DECISIONS.md)
