# Plan Drag/Drop Scheduling UX

Purpose: define a practical UX plan for true visual scheduling in the Plan surface. This is a docs-only planning artifact. It does not change source code.

## Scope

This slice adds direct manipulation for local Plan blocks only:

- Drag an existing local block to a new time.
- Resize a local block to adjust planned duration.
- Drag unscheduled local work into the timeline to create a planned block.
- Provide mouse, touch, and keyboard-accessible fallback controls.
- Warn about conflicts before save.
- Preserve the existing local-only confirmation boundary.

Out of scope:

- Google Calendar writes.
- Outlook Calendar writes.
- Provider event edits, deletes, or reschedules.
- Publishing local Plan blocks back to external calendars.
- Exposing provider tokens, secrets, raw provider payloads, encrypted values, or `secure_secrets`.

## UX Principle

Plan should feel like a working day board, not a calendar administration tool. The user should be able to place work into time with low friction, see conflicts immediately, and confirm local changes before anything is persisted.

The timeline remains local-first:

- Provider appointments are read-only constraints.
- Local Plan blocks are editable commitments.
- Unscheduled work is a source tray.
- Schedule Review can recommend blocks, but the user chooses when to place them.

## Primary Surfaces

### Timeline

The central timeline should show:

- Read-only appointments from local imported/synced calendar records.
- Local Plan blocks.
- Current-time marker.
- Working-hour context.
- Conflict bands when local blocks overlap appointments or other blocks.

Appointments should not look draggable. They can show detail on click, but the cursor, affordance, and actions should make them read-only.

Local Plan blocks should show:

- Title.
- Planned start/end or duration.
- Source type: todo, project, mission, manual block.
- Status: planned, completed, canceled.
- Resize handles at top and bottom on desktop.
- Drag handle or whole-card drag affordance, depending on density.

### Unscheduled Work Tray

The unscheduled tray should list eligible local work that can become a Plan block:

- Active todos without a local block for the selected date.
- High-priority or due-soon work from Schedule Review.
- Manual block option.

Each item should support:

- Drag into timeline.
- `Schedule` button fallback.
- Duration selector or default duration before placement.
- Source label and priority signal.

The tray should not include provider appointments. Imported calendar items remain constraints, not work to schedule.

## Drag Existing Local Blocks

Desktop behavior:

1. User starts dragging a local block.
2. The block lifts visually and stays within the selected day timeline.
3. A ghost preview snaps to the configured grid, likely 15-minute increments.
4. Timeline shows proposed start/end while dragging.
5. Conflicts update live.
6. On drop, PRAXIS opens a compact confirmation state unless the move is explicitly configured as instant local save later.

Recommended first slice confirmation:

- Dropping a block creates a pending local edit.
- Show inline confirmation: `Move block to 2:15 PM-3:00 PM?`
- Actions: `Save Move`, `Cancel`.
- Save updates only the local Plan block.

Rules:

- Dragging before day start or after day end clamps to the visible day boundary.
- Dragging should preserve duration.
- Canceled/completed blocks should not be draggable unless reactivated first.
- If a moved block overlaps another local block or appointment, allow preview but require explicit confirmation with warning.

## Resize Local Blocks

Desktop behavior:

1. User grabs the top or bottom resize handle.
2. Top handle changes start time; bottom handle changes end time.
3. Duration preview updates while resizing.
4. Minimum duration should be enforced, likely 15 minutes.
5. Resize snaps to the same grid as drag.
6. On release, show pending confirmation.

Recommended labels:

- `Resize block`
- `Save Duration`
- `Cancel`
- `Planned duration`

Rules:

- Top-handle resize must not cross the end time minus minimum duration.
- Bottom-handle resize must not cross the start time plus minimum duration.
- Completed/canceled blocks are locked.
- Manual duration entry remains available for precision.

## Schedule Unscheduled Work By Dragging

Desktop behavior:

1. User drags an unscheduled item from the tray.
2. Timeline shows a placement ghost using the item's estimated duration or a default duration.
3. If the item has no estimate, default to 30 minutes and expose a duration control in confirmation.
4. On drop, create a pending local block draft.
5. User confirms with `Create Block`.

Confirmation summary:

- Work title.
- Date.
- Start/end.
- Duration.
- Conflict status.
- Source item.

Actions:

- `Create Block`
- `Adjust`
- `Cancel`

No block should be persisted on hover, drag start, or unconfirmed drop.

## Keyboard And Mouse Fallbacks

Every drag/drop capability needs a non-drag equivalent.

Existing local block controls:

- `Move earlier` and `Move later` stepper buttons.
- `Start time` input.
- `Duration` input or stepper.
- `Save Move`.
- `Cancel`.

Unscheduled work controls:

- `Schedule` button.
- Date selector.
- Start time selector.
- Duration selector.
- `Create Block`.
- `Cancel`.

Keyboard interaction:

- Focus a local block.
- Press `Enter` to open block actions.
- Use arrow-key controls only inside an explicit move mode, not by default.
- In move mode, left/right or up/down adjusts by one snap increment.
- `Shift` plus arrow adjusts by a larger increment, likely 30 or 60 minutes.
- `Escape` cancels pending move/resize.
- `Enter` confirms when focus is on the confirmation action.

Mouse fallback:

- Context menu or action menu on each local block.
- `Move...`, `Change Duration...`, `Complete`, `Cancel Block`, `Delete`.

Touch fallback:

- Avoid relying on fine resize handles.
- Tap block, choose `Move` or `Duration`, then use large steppers/input controls.

## Conflict Warnings

Conflict warnings should be advisory until confirmation. They should not block exploration.

Warn when:

- Proposed local block overlaps a provider appointment.
- Proposed local block overlaps another active local block.
- Proposed time is outside the user's working window.
- Proposed block starts in the past for the selected day.
- Source work is waiting-on someone else.
- Source work is blocked or canceled.

Recommended warning copy:

- `Conflicts with appointment`
- `Overlaps another Plan block`
- `Outside working window`
- `Starts in the past`
- `Waiting on someone else`
- `Blocked work`

Confirmation boundary:

- Low-risk move with no conflicts: normal confirmation.
- Conflict move: warning confirmation.
- Provider appointment overlap: warning confirmation, still local-only.
- Provider write-back: not offered.

The warning should describe what PRAXIS knows without exposing raw provider payloads. Use normalized appointment title/time only.

## Mobile And Narrow Behavior

Narrow screens should not depend on freeform drag as the primary interaction.

Recommended behavior:

- Timeline remains readable and scrollable.
- Blocks can be tapped to open an action sheet.
- Action sheet exposes `Move`, `Duration`, `Complete`, `Cancel`, and `Delete`.
- Unscheduled work uses `Schedule` button first.
- Optional long-press drag can be added later, but should not be required for V1.
- Resize handles should be hidden or replaced with duration steppers.

Mobile order:

1. Date and now status.
2. Conflict summary.
3. Timeline.
4. Unscheduled work tray.
5. Schedule Review recommendations.
6. Completed/canceled blocks.

The action sheet should keep the local-only boundary visible with copy such as `This changes only the local Plan block.`

## Confirmation Boundaries

The first implementation should keep confirmation explicit.

Local block move:

- Drag/drop creates pending edit.
- User confirms.
- Save writes local Plan block only.

Local block resize:

- Resize creates pending duration edit.
- User confirms.
- Save writes local Plan block only.

Unscheduled work placement:

- Drop creates pending block draft.
- User confirms.
- Save creates local Plan block only.

Provider appointment:

- No drag.
- No resize.
- No write action.
- Details may show read-only source and sync status.

AI/Schedule Review recommendation:

- Recommendation can prefill a draft.
- User confirms before local block creation.
- No external calendar publication.

## Implementation Notes

Suggested state model:

- `idle`
- `draggingExistingBlock`
- `resizingExistingBlock`
- `draggingUnscheduledWork`
- `pendingMoveConfirmation`
- `pendingResizeConfirmation`
- `pendingCreateConfirmation`

Suggested derived values:

- Pixel-to-time conversion for selected day.
- Snap interval.
- Minimum block duration.
- Proposed start/end.
- Conflict list.
- Working-window warning.

Recommended technical sequence:

1. Extract Plan timeline geometry helpers into pure functions.
2. Add conflict detection for proposed block changes without changing persistence.
3. Add pending confirmation state for move/create/resize.
4. Add mouse drag for existing local blocks.
5. Add resize handles for existing local blocks.
6. Add drag from unscheduled work tray.
7. Add keyboard/touch fallback controls.
8. Add desktop and narrow QA passes.

Keep source ownership narrow when implementing:

- Plan surface component and Plan-specific helpers only.
- Plan-specific CSS only.
- Do not mix with Settings, provider sync, assistant routing, or Mission Control first-screen work.

## Data And Privacy Constraints

The UI should use normalized local records only.

Do not expose:

- OAuth tokens.
- Refresh tokens.
- Provider secrets.
- Raw Google payloads.
- Raw Outlook payloads.
- Encrypted secret values.
- `secure_secrets`.

Do not send provider payloads to drag/drop helpers. The visual scheduler only needs normalized appointment/block fields:

- id
- title
- start
- end
- all-day flag
- source label
- local block status
- linked local work id, when present

## QA Checklist

Desktop:

- Drag a local block later in the same day.
- Drag a local block earlier in the same day.
- Drag a local block onto an appointment and verify warning.
- Drag a local block onto another local block and verify warning.
- Resize a block longer.
- Resize a block shorter.
- Verify minimum duration.
- Drag unscheduled work into the timeline and confirm local block creation.
- Cancel each pending confirmation path and verify no local write.
- Verify appointments do not drag or resize.

Keyboard/mouse fallback:

- Move a block with controls.
- Change duration with controls.
- Schedule unscheduled work with controls.
- Cancel with `Escape` where supported.

Mobile/narrow:

- Timeline remains scrollable.
- Tap block action sheet works.
- Schedule button flow works without drag.
- Duration controls are usable without small resize handles.

Boundary checks:

- No Google/Outlook write-back controls appear.
- Provider appointments remain read-only.
- No tokens, secrets, encrypted values, raw provider payloads, or `secure_secrets` appear in UI logs or docs.

## Open Questions

- Should drag/drop save be explicit forever, or can a later preference allow instant local saves with undo?
- What snap interval should be default: 15 minutes or 30 minutes?
- Should working hours be user-configurable before visual scheduling ships?
- Should local blocks be allowed to overlap intentionally, or should overlaps always require warning confirmation?
- Should Schedule Review recommendations appear as draggable ghost blocks or remain button-driven until drag behavior is proven?
