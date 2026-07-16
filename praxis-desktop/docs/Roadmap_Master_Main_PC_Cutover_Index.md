# Roadmap Master Main PC Cutover Index

This collection organizes the remaining work before Praxis Desk moves active operation and continued Codex development to the main PC.

## Sequence

1. [RM-CUTOVER-01 Source Handoff And Preflight Baseline](Roadmap_Master_Main_PC_Cutover_01.md)
2. [RM-CUTOVER-02 Operator Data Backup And Transfer](Roadmap_Master_Main_PC_Cutover_02.md)
3. [RM-CUTOVER-03 Main PC Development Bootstrap](Roadmap_Master_Main_PC_Cutover_03.md)
4. [RM-CUTOVER-04 Machine-Bound Secret Reconnection](Roadmap_Master_Main_PC_Cutover_04.md)
5. [RM-CUTOVER-05 Operational Smoke Test](Roadmap_Master_Main_PC_Cutover_05.md)
6. [RM-CUTOVER-06 Final Main PC Cutover Closeout](Roadmap_Master_Main_PC_Cutover_06.md)

## Current State

- Networking pre-transport setup is closed by RM12-RM17.
- `npm run main-pc:preflight` exists and passed on this machine after Electron runtime repair.
- Memory repair and Windows packaging remain optional preflight flags, not default actions.
- OAuth/API/Slack secrets are expected to be reconnected on the main PC.

## Cutover Rule

Do not run both machines as active Praxis writers after RM-CUTOVER-06. One machine must own the live SQLite database and markdown memory root.
