# Stage 10 Wiring Checklist (Not Yet Wired)

## Files That Will Be Touched When Wiring Is Allowed
- `electron/main.ts`
- `electron/preload.ts`
- `renderer/App.tsx`

## Wiring Order (Future Phase)
1. Add `registerRuntimeIpcHandlers()` call site in `electron/main.ts`
2. Add preload exposures for IPC invokes in `electron/preload.ts`
3. Add UI calls in `renderer/App.tsx` or future settings UI

## Mandatory Safety Checks
- Verify/CI unchanged
- No background timers started
- Default-off behavior for any writes
- Explicit user-triggered actions for anything that writes
