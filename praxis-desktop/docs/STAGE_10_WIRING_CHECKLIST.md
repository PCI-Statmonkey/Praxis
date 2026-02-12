# Stage 10 Wiring Checklist (Not Yet Wired)

## Files That Will Be Touched When Wiring Is Allowed
- `electron/main.ts`
- `electron/preload.ts`
- `renderer/App.tsx`

## Wiring Order (Future Phase - NOT DONE YET)
1. Add `registerRuntimeIpcHandlers(ipcMain, deps)` call site in `electron/main.ts`
2. Add preload exposures for IPC invokes in `electron/preload.ts`
3. Add UI calls in `renderer/App.tsx` or future settings UI

## Mandatory Safety Checks
- IPC registration can be always-on (Decision A)
- All writes remain behind explicit calls
- No scheduler/timers introduced in wiring step
- No silent exports/restores
- Verify/CI unchanged
- Unit tests green
- Tracked tree clean
- Dist artifacts reverted
