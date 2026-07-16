# Roadmap Master Main PC Cutover 06

## Final Main PC Cutover Closeout

RM-CUTOVER-06 marks the main PC as the active Praxis system of record.

## Scope

- Confirm RM-CUTOVER-01 through RM-CUTOVER-05 are complete.
- Prevent split-brain operation between machines.
- Record the new source of truth.

## Required Actions

1. Confirm source handoff is committed and available on the main PC.
2. Confirm backup and data transfer are complete.
3. Confirm main PC preflight passes.
4. Confirm service reconnect status is acceptable.
5. Confirm operational smoke test passes.
6. Stop using the old machine as an active Praxis writer.
7. Keep the old machine backup read-only until the main PC has run successfully for a few days.

## Evidence

- Final `npm run main-pc:preflight` result on the main PC.
- Backup location.
- Main PC app data path.
- Main PC memory root path.
- List of services reconnected or intentionally left disabled.
- Date/time the main PC became source of truth.

## Done Criteria

- Main PC is the active development and operational machine.
- Old machine is not creating new Praxis records.
- There is one clear system of record for SQLite, markdown memory, and Codex development.
