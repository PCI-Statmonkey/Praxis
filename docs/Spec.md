# SPEC - Praxis Desk

## Platforms
- Windows desktop app built with Electron
- Slack as a secondary quick-reply and notification surface

## Product Model
- Desktop app is the primary workspace and system of record
- Slack mirrors suggestions and accepts lightweight replies
- Assistant logic should be shared across surfaces instead of being reimplemented per adapter

## Core Objects
- Idea: a captured possibility, concept, or opportunity that is not yet committed work
- Mission: a chosen outcome the user wants to pursue, usually created from a promising idea
- Task: an actionable step that advances a mission or handles operational work
- Signal: a detected pattern from user behavior or captured activity
- Insight: an interpretation of one or more signals that is meaningful enough to present back to the user

## Assistant Behavior
- Suggestions must carry explicit candidate actions
- Actions must bind to executable commands
- Contextual replies like `yes`, `sure`, `do it`, `1`, and `the first one` should resolve using the latest relevant suggestion context
- If several candidate actions are close in rank, ask for clarification instead of guessing
- If one candidate is clearly dominant, accept a vague confirmation and execute the bound command

## UI (Praxis HUD)
Panels:
1. Left: Project Stack
2. Center: Today Timeline
3. Right: Assistant and Morning Plan surface
4. Bottom: Master Checklist

## Persistence
- Local append-only event log plus snapshots is acceptable for the current shell stage
- Keep event application deterministic
- Do not sync live database files directly in the future

## Safety Rules
- Prefer incorrect non-action over incorrect action
- Ambiguous confirmation must clarify when ranking is too close
- All implicit acceptance paths must still end in an explicit command invocation
