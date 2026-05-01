# Mission Control UI Plan

Checkpoint: `24e66e3 Log final AI review duplicate smoke`

This plan defines the Mission Control dashboard information architecture for PRAXIS. It is a product and UI planning document only. It does not change source code.

## Design North Star

Mission Control is the operator's daily command center.

It should feel like a practical personal JARVIS: coach-like, directive, and composed. The surface should keep the operator's mind straight by showing what matters, why it matters, and what to do next.

The design should be:

- dense without feeling crowded
- calm without becoming passive
- directive without becoming noisy
- personal without becoming cute
- high-signal enough to use every day

The dashboard is not a marketing page, a generic productivity app, or a chatbot wrapper. It is the place the operator lands when they need situational awareness.

## First-Screen Hierarchy

The first screen should be organized around one dominant question:

What needs the operator's attention now?

Recommended hierarchy:

1. Command Header
   - Current day, time window, and operational mode.
   - One short directive from PRAXIS.
   - A concise confidence/status line: what the directive is based on.

2. Primary Decision Surface
   - Top Move / Priority Stack.
   - Today-critical obligations.
   - Immediate blockers and risks.
   - The operator should not have to scan six panels before knowing what to do.

3. Calendar Pressure Strip
   - Next appointment.
   - Hard time constraints.
   - Free focus windows.
   - Conflicts, travel/setup buffers, and overdue prep should surface here.

4. Daily Rhythm
   - Morning, midday, afternoon, and closeout posture.
   - Shows whether the day is on track, compressed, slipping, or in recovery.
   - Helps PRAXIS feel like a coach instead of a static board.

5. Review Inbox
   - Suggested todos, follow-ups, extracted commitments, stale items, and drafts needing confirmation.
   - This is a triage queue, not the center of gravity.

6. Service Health
   - Calendar, email, Slack, storage, local AI, and sync state.
   - Compact and visible, but not allowed to dominate unless something is broken.

7. Talk
   - Always reachable.
   - Visually present as the command channel, not a large empty chat room.

## First 10 Seconds

In the first 10 seconds, the operator should understand:

- What is the top move?
- Is there a hard calendar constraint soon?
- What is at risk today?
- Who is waiting on the operator?
- Is there anything PRAXIS cannot see because a service is disconnected?
- Should the operator work, triage, reset, or prepare?

The first screen should answer those questions without requiring a click.

The ideal first read is:

1. "Here is the move."
2. "Here is why."
3. "Here is what can derail it."
4. "Here is where to go if you need to reset."

## AI Review Placement

AI Review belongs near the primary decision surface, not buried in Settings or a secondary tab.

It should be treated as a reset and reasoning mode:

- Use it when the operator is overloaded, stale, or unsure.
- Let it explain priorities and contradictions.
- Let it turn messy local state into a recommended next move.
- Keep all write-like outcomes staged through Review Inbox or explicit confirmation.

Recommended placement:

- A prominent "Review / Reset" action attached to the Priority Stack.
- A compact AI Review summary card below or beside the Top Move.
- Clear indication of whether the review was generated from current local state.

AI Review should not become the whole dashboard. It is the cockpit's analysis mode, not the cockpit itself.

## Talk Placement

Talk belongs as the operator command channel.

It should be visible, available, and fast, but secondary to the dashboard's current directive. The operator should be able to ask:

- "reset me"
- "what changed?"
- "what am I missing?"
- "why is this the top move?"
- "capture this"

Recommended placement:

- Right rail on desktop.
- Collapsible command drawer on narrower screens.
- Entry point always visible in the command header.

Talk should support capture, clarification, review requests, and explanations. It should not be the only way to understand the day.

## Relationship Of Core Surfaces

### Daily Rhythm

Daily Rhythm is the time posture layer. It tells the operator whether the day is open, compressed, interrupted, or in recovery.

It should influence the Top Move by changing what is realistic:

- If there is a meeting in 20 minutes, favor quick prep or small wins.
- If there is a two-hour focus block, favor deep project work.
- If the day is fragmented, favor triage and closeout.

### Priority Stack

Priority Stack is primary.

It should show the ranked next moves with enough context to trust the ranking:

- due date or time pressure
- person or project affected
- source of urgency
- estimated action shape: call, write, review, prep, decide

The top item should be directive. Lower items should be scan-friendly.

### Calendar Pressure

Calendar Pressure is a constraint layer.

It should not compete with the Priority Stack unless time pressure is the main risk. It should answer:

- what is next?
- how soon?
- what needs prep?
- where is the next usable focus block?

### Review Inbox

Review Inbox is the staging and trust layer.

It receives uncertain extracted work, proposed changes, and assistant-suggested writes. It should be compact on the dashboard and deeper in its own workflow.

Review Inbox should become prominent only when:

- there are high-confidence suggestions due today
- there are stale unreviewed commitments
- AI Review needs operator confirmation before changing state

### Service Health

Service Health is environmental awareness.

It should remain compact unless a broken service changes the trust level of the dashboard. If Gmail, Outlook, calendar sync, Slack, storage, or local AI is unavailable, the dashboard should say what PRAXIS may be missing.

Service Health should not be a settings panel on the main dashboard.

## Primary Vs Secondary

Primary:

- Top Move
- Priority Stack
- Calendar Pressure
- Daily Rhythm state
- AI Review / Reset entry point

Secondary:

- Review Inbox count and highest-risk items
- Service Health
- Talk rail
- People waiting-on summary
- Stale project/missions summary
- Recent capture status

Tertiary or drill-down:

- Full settings
- Full service connection controls
- Detailed sync logs
- Complete backlog browsing
- Low-priority ideas
- Historical review output

## What The UI Should Avoid

Avoid:

- empty hero drama that hides the work
- large decorative graphics with no operational value
- chatbot-first layout where the dashboard becomes a side note
- equal-weight cards for everything
- dumping all todos, meetings, and suggestions at once
- burying the Top Move below service widgets
- making service health look like the product's main purpose
- flashy sci-fi effects that become tiring in daily use
- nagging language
- unexplained AI recommendations
- irreversible actions from AI Review or Talk

PRAXIS can have Tony Stark / JARVIS energy through confidence, pacing, hierarchy, and concise language. It does not need glowing panels, theatrical animations, or constant spectacle.

## Implementation Questions

- What local ranking signals should produce the Top Move before any LLM summary runs?
- How should PRAXIS show confidence when some source systems are disconnected?
- Should AI Review run on demand only, or should a lightweight deterministic review update on app start?
- What is the right threshold for promoting Review Inbox from secondary to primary?
- Should Talk share the same context packet as AI Review, or request a fresh packet per command?
- How should closeout mode differ from morning arrival mode?
- What is the smallest first implementation that preserves the hierarchy without redesigning every existing panel?

## V1 Recommendation

Use the existing Operator Grid direction as the foundation, but tighten the hierarchy:

- Center the first screen on Top Move, Priority Stack, and Calendar Pressure.
- Keep Daily Rhythm visible as the day posture.
- Put AI Review beside the priority surface as the reset mode.
- Keep Talk in the right rail as the command channel.
- Compress Review Inbox and Service Health into high-signal summaries.

The dashboard should feel like PRAXIS has already done the scan before the operator arrives.
