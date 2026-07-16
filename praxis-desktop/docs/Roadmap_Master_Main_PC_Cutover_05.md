# Roadmap Master Main PC Cutover 05

## Operational Smoke Test

RM-CUTOVER-05 proves the main PC can act as the live Praxis operator machine.

## Scope

- Validate desktop launch.
- Validate Settings.
- Validate core work mutations.
- Validate assistant read/review flows.
- Validate local display exports.

## Required Actions

1. Launch Praxis Desk on the main PC.
2. Confirm dashboard opens without a fatal dialog or blank window.
3. Open Settings and confirm storage health loads.
4. Create a test todo.
5. Edit the test todo.
6. Reschedule the test todo.
7. Complete the test todo.
8. Create a test appointment.
9. Ask:

```text
what matters today?
```

10. Ask a focus/status question for an existing project or mission.
11. Ask an AI review/reset question, such as:

```text
reset me
```

12. Export Rainmeter snapshot if Rainmeter is used:

```powershell
npm run main-pc:preflight
```

## Evidence

- Dashboard and Settings screenshots or notes.
- Storage health result.
- Confirmation that create/edit/reschedule/complete flows worked.
- Confirmation that assistant reports did not perform writes without explicit confirmation.
- Rainmeter snapshot path if used.

## Done Criteria

- Main PC can run daily operations without returning to the old machine.
- Assistant read/review flows work.
- Explicit write boundaries still behave correctly.
