# Mission Control Copy Guide

Checkpoint: `63e448c Reconcile Mission Control planning queue`

This guide defines copy and tone for the PRAXIS Mission Control dashboard. It is a documentation-only guide for labels, status text, empty states, warnings, and AI Review wording.

Sources:

- `docs/MISSION_CONTROL_UI_PLAN.md`
- `docs/MISSION_CONTROL_TECH_PLAN.md`
- Accepted Ana baseline QA notes as recorded in `CURRENT_TASK.md` and `docs/ENGINEERING_LOG.md`

## Voice

Mission Control should sound like a practical command assistant: calm, directive, observant, and useful.

The voice should:

- tell the operator what to do next
- explain why the recommendation matters
- acknowledge uncertainty clearly
- keep warnings specific and actionable
- avoid drama, hype, guilt, and cute language

The tone is personal but not chatty. PRAXIS can feel JARVIS-like through precision, pacing, and situational awareness. It should not sound theatrical.

## First-Screen Labels

Preferred desktop section labels:

- `Command`
- `Top Move`
- `Priority Stack`
- `Calendar Pressure`
- `Daily Rhythm`
- `AI Review`
- `Review Inbox`
- `Service Health`
- `Talk`
- `Waiting On`
- `Risks`
- `Focus Window`
- `Closeout`

Preferred supporting labels:

- `Why this matters`
- `What can derail this`
- `Next usable window`
- `Needs confirmation`
- `Read-only review`
- `Local state`
- `Fallback review`
- `Service blind spot`

Avoid labels that make the UI sound generic:

- `Dashboard`
- `Tasks`
- `Chatbot`
- `Notifications`
- `Insights`
- `Productivity`
- `Recommendations`
- `AI Magic`

`Dashboard` may still be used in docs or navigation if needed, but the first-screen surface should lead with Mission Control language.

## Directive Phrases

Good directive phrases:

- `Start here.`
- `Handle this first.`
- `Clear this before the next meeting.`
- `Use this focus window.`
- `Prep this now.`
- `This is the pressure point.`
- `Triage these before adding new work.`
- `Close the loop here.`
- `This can wait.`
- `No action needed yet.`
- `You have room for deep work.`
- `The day is compressed. Stay narrow.`
- `The next move is clear.`
- `Reset from current local state.`

Good explanation phrases:

- `Because this is due today.`
- `Because someone is waiting on you.`
- `Because the next calendar block is tight.`
- `Because this has gone stale.`
- `Because service data is incomplete.`
- `Based on calendar, work graph, and Review Inbox.`

Use direct verbs: `start`, `clear`, `prep`, `review`, `decide`, `send`, `call`, `triage`, `close`.

## Phrases To Avoid

Avoid hype:

- `Crushing it`
- `Let's supercharge your productivity`
- `AI-powered insights`
- `Unlock your potential`
- `Mission accomplished` for ordinary completion
- `Genius mode`

Avoid guilt or nagging:

- `You failed to`
- `You forgot again`
- `Why haven't you`
- `This is overdue because you ignored it`
- `You need to be better`

Avoid vague urgency:

- `Important stuff`
- `Things are heating up`
- `Lots going on`
- `Check this out`
- `You may want to look at this`

Avoid fake certainty:

- `This is definitely the best move`
- `I know exactly what happened`
- `All systems are complete`
- `Nothing else matters`

Avoid theatrical sci-fi:

- `Suit up`
- `Engage protocol`
- `Activating command matrix`
- `Threat detected` for routine work
- `Initializing neural core`

## Empty States

Empty states should reduce cognitive load and say what PRAXIS knows.

Good empty states:

- `No top move yet. Add work, connect services, or run AI Review.`
- `No Review Inbox items need confirmation.`
- `No calendar pressure in the next few hours.`
- `No waiting-on items are active.`
- `No service issues detected.`
- `No stale projects found in local state.`

When an empty state might be caused by missing data, say so:

- `No calendar pressure shown. Calendar sync is not connected.`
- `No email follow-ups shown. Mail sync is unavailable.`
- `No local AI status yet. Check Ollama availability in Settings.`

Do not over-celebrate emptiness. The point is clarity, not reward animation.

## Service Warning Tone

Service warnings should say what is unavailable and what that means for trust.

Preferred pattern:

`[Service] is unavailable. PRAXIS may be missing [data type].`

Examples:

- `Google Calendar is unavailable. PRAXIS may be missing schedule pressure.`
- `Outlook Mail is unavailable. PRAXIS may be missing recent follow-ups.`
- `Slack is disconnected. PRAXIS cannot mirror operator-channel updates.`
- `Storage check has not run. Local memory health is unknown.`
- `Ollama is unavailable. AI Review will use deterministic local fallback.`

When action is available:

- `Reconnect in Settings.`
- `Run sync again.`
- `Check local Ollama in Settings.`
- `Refresh services.`

Avoid blame and vague alarm. A service problem is a visibility limit, not a failure of the operator.

## AI Review Wording

AI Review is a read-only reset and reasoning mode. It should never imply that work changed unless a separate confirmed action actually changed it.

Preferred labels:

- `AI Review`
- `Review / Reset`
- `Read-only review`
- `Local state review`
- `Model summary`
- `Fallback review`
- `Source`
- `No work has been changed.`

Source wording:

- `Source: local work graph, calendar pressure, Review Inbox, and service health.`
- `Source: local model via Ollama.`
- `Source: deterministic fallback from local ranking.`
- `Source incomplete: calendar is unavailable.`
- `Source incomplete: mail sync is unavailable.`

Fallback wording:

- `Local model unavailable. Showing deterministic review from local state.`
- `No saved local model selected. Showing deterministic review from local state.`
- `Saved model not found in Ollama. Showing deterministic review from local state.`
- `Model response was not usable. Showing deterministic review from local state.`

Good AI Review headings:

- `Start here`
- `Take this win`
- `Do not let this slip`
- `Watch this first`
- `Stale work`
- `Waiting on you`
- `Calendar pressure`

Avoid:

- `The AI decided`
- `The model changed`
- `Automatically fixed`
- `I updated your tasks`
- `Trust me`
- `Internal mode:`
- raw packet/debug language

## Review Inbox Confirmation Wording

Review Inbox is the confirmation layer for uncertain or write-like outcomes.

Preferred labels:

- `Needs confirmation`
- `Accept`
- `Archive`
- `Dismiss`
- `Create todo`
- `Create project`
- `Keep as note`
- `Review source`

Confirmation copy:

- `Create this todo from the suggested follow-up?`
- `Create this project from the suggested follow-up?`
- `Archive this suggestion without changing work?`
- `Dismiss this suggestion? It will stay out of the active inbox.`
- `This will create a local work item.`
- `This will not change the source message.`

Post-action copy:

- `Todo created.`
- `Project created.`
- `Suggestion archived. No work was changed.`
- `Suggestion dismissed.`
- `Review Inbox is clear.`

Avoid ambiguous action labels:

- `Do it`
- `Process`
- `Resolve`
- `Apply AI`
- `Auto-create`
- `Looks good`

## Talk Copy

Talk is the command channel. It should invite useful commands without becoming the center of the dashboard.

Good placeholder text:

- `Ask PRAXIS what to do next, capture work, or run a reset.`
- `Type a command, capture, or review request.`
- `Ask: reset me, what changed, what am I missing.`

Good status text:

- `Listening for a command.`
- `Checking local state.`
- `Generating read-only review.`
- `Capture ready for confirmation.`
- `No work has been changed.`

Avoid:

- `Chat with AI`
- `Ask me anything`
- `What can I help you with today?`
- `Your productivity copilot`

## Mobile And Narrow Labels

Use shorter labels on narrow screens while preserving meaning.

Desktop to narrow:

- `Command` -> `Now`
- `Top Move` -> `Move`
- `Priority Stack` -> `Stack`
- `Calendar Pressure` -> `Time`
- `Daily Rhythm` -> `Rhythm`
- `AI Review` -> `Review`
- `Review Inbox` -> `Inbox`
- `Service Health` -> `Health`
- `Talk` -> `Talk`
- `Waiting On` -> `Waiting`
- `Focus Window` -> `Focus`

Narrow labels should not become cryptic. Prefer one clear word over abbreviations.

Avoid:

- `Cmd`
- `Prio`
- `Svc`
- `AI Rvw`
- `Cal`
- `Notif`

## Status Severity

Use consistent status meaning:

- `Clear`: nothing needs action.
- `Watch`: useful context, no immediate action.
- `Needs attention`: action soon.
- `Blocked`: PRAXIS cannot proceed or cannot see key data.
- `Fallback`: PRAXIS is using deterministic local logic instead of model output.

Examples:

- `Clear: no Review Inbox items.`
- `Watch: meeting in 45 minutes.`
- `Needs attention: two items due today.`
- `Blocked: calendar unavailable.`
- `Fallback: local model unavailable.`

## Implementation Notes

- Prefer exact work titles from local state. Do not paraphrase task names in a way that changes meaning.
- Keep headings short and stable so the operator learns the surface.
- Keep body copy below dashboard cards to one or two sentences.
- Put uncertainty in the status line, not hidden in hover text.
- If data is missing, say which source is missing.
- If AI Review or Talk is read-only, repeat `No work has been changed.` near the output.
- If an action writes to local state, label it as a create/update action before confirmation.

## Open Wording Questions

- Should the primary reset action be labeled `AI Review`, `Review / Reset`, or `Reset Me`?
- Should the main directive be written in PRAXIS first person, or as neutral command text?
- Should service warnings use `unavailable`, `disconnected`, or provider-specific language?
- Should the narrow label for `Calendar Pressure` be `Time` or `Schedule`?
- Should successful empty states say `Clear` consistently, or should that be reserved for service/status chips?
