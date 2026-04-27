# Praxis Desk Mission Plan

## Product Mission

Praxis Desk is a local-first desktop assistant that helps the operator keep projects, missions, deadlines, appointments, money tasks, and follow-ups from slipping through the cracks.

Its purpose is not to replace judgment or do the operator's work.
Its purpose is to maintain situational awareness, preserve context over time, and surface the right next things before they are forgotten.

## Core Experience

The defining Praxis moment is the arrival ritual:

- The operator sits down at the PC
- Praxis is always listening for a configurable wake phrase
- The operator says a phrase such as `Daddy's home`
- Praxis launches and comes to the front
- Praxis greets the operator based on time of day
- Praxis asks whether a status report is wanted
- Praxis gives a short spoken report on what matters most
- Praxis shows the same situation visually in a compact dashboard

Target interaction:

`Good morning. Status report, sir?`

If accepted, Praxis gives a 30-second spoken briefing.
If the briefing exceeds the short format, Praxis offers a follow-up such as:

`There is more, sir, if you want to go over it.`

## Personality

Praxis should feel like:

- a female version of JARVIS
- warm
- playful
- friendly
- competent
- conversational

The wake phrase can be playful, but the actual briefing should stay concise and useful.

## What Praxis Must Do Well

Praxis must:

- remember what the operator has going on
- track missions, projects, tasks, todos, deadlines, appointments, people follow-ups, and money-related obligations
- preserve long-term context in markdown
- prioritize the daily brief instead of dumping everything
- ask clarifying questions when needed
- nudge occasionally during the day
- escalate gently when something important is neglected repeatedly

Praxis must not:

- take irreversible actions without approval
- become a noisy nag
- bury the operator in backlog trivia
- act like a generic chatbot

## Domain Model

### Todo

A todo is a one-shot obligation.

Examples:

- send a proposal
- send a book to a GM
- fix something in the house
- go to the doctor

Todos may stand alone or belong to a project.
A project-linked todo should still appear in the global quick-action list when it is something the operator can knock out quickly.

Example:

- `Call Max` can belong to the `DCPS` project
- It should still appear in the quick todo/checklist surface
- The UI should show project/mission context badges instead of hiding it inside the project

### Task

A task is a unit of work inside a project or mission.

### Project

A project is a bounded body of work.
Projects can stand alone or later be promoted under a mission.

### Mission

A mission is a super-project that hosts several related projects.

Examples:

- Origins 2026
- a larger engineering job with multiple sub-projects

### Idea

An idea is brainstorm material only.
It stays informal until explicitly promoted into a project or mission.

## Information Priority For The Daily Brief

The default daily briefing priority is:

1. Appointments today
2. Overdue items
3. Hard deadlines due today or soon
4. People waiting on the operator
5. Money-related obligations
6. Projects or missions that need an early start
7. Important tomorrow appointments
8. One recommended next move

The briefing should normally exclude:

- low-priority backlog without due dates
- completed work
- deep subtask detail
- random ideas that have not been committed
- repetitive reminders that were already acknowledged unless risk increased

## Interaction Model

Praxis should support both text and voice over time, but version one should focus on getting the core app behavior right first.

Voice expectations:

- local always-available wake phrase detection
- spoken greeting by default
- spoken report by default
- silent mode available
- display-first follow-up available after greeting

Wake-word readiness means Praxis can run a small local hotword detector that listens only for the
configured wake phrase. After the wake phrase is detected, Praxis should open a short command window,
show a visible listening state, and then stop listening unless the operator continues the interaction.
The wake layer must have a hard off switch, silent mode, and no ambient audio archive.

Conversation expectations:

- text and voice should share the same memory
- brainstorming stays informal until promoted
- casual statements can trigger a clarifying question for tracking

Example:

`I really need to get that Origins outline done`

Praxis can ask whether it should track that as a project item or reminder.

## Data Sources

Planned source systems:

- Google Calendar
- Outlook Calendar
- email
- Bill.com
- markdown memory files

Calendar connections should live in settings and support more than one calendar account.
The operator should be able to connect Google, Outlook, and additional calendars as needed.
Connected calendars should feel seamless:

- sync when Praxis starts
- sync every 30 minutes while Praxis is open
- sync when the operator asks about appointments, events, or schedule
- appointments for the current day should outrank todos and deadlines in the daily briefing

Praxis should extract and store facts, not raw source material, whenever possible.

Examples of stored facts:

- due date
- waiting on who
- next action
- money attached
- appointment time
- project status

## Memory Strategy

Praxis should create and maintain markdown files as long-term memory.

This is necessary because:

- current context is scattered across the operator's head, docs, and email
- the system needs durable recall over time
- the context volume will grow too large for ad hoc prompting

The markdown memory layer should include an index so Praxis can quickly find the right records without loading everything.

## Trust and Safety Rules

Praxis is mainly a reminder and awareness system.
It should not do the operator's work automatically.

Without explicit approval, Praxis should not:

- send emails
- send invoices
- send messages
- schedule events
- mark work complete
- move deadlines
- take silent web actions

Privacy and safety requirements:

- no cloud transcription
- no storing raw email bodies by default
- no ambient audio recording archives beyond wake detection needs
- encrypted credentials and tokens
- visible listening state
- configurable retention and deletion

## Nudges And Escalation

Default behavior:

- occasional nudges
- nudge when risk changes
- nudge when important work is idle
- escalate if an important item is ignored for days

Escalation tone path:

- warm and helpful
- warm and pushy
- almost sarcastic but caring

## Definition Of Success

Praxis is successful when the operator experiences materially fewer moments of:

- `I forgot about that`
- missed deadlines
- dropped follow-ups
- late starts on important work
- loss of project situational awareness

The core weekly success test is:

`I kept my ducks in a row and did not lose important threads.`

## Product Suggestions To Preserve

These ideas fit the mission and should stay in scope consideration:

- a compact dashboard paired with spoken briefing
- a recommendation at the end of the daily brief
- operator override when Praxis prioritizes incorrectly
- a future Rainmeter-compatible visual layer for ambient desktop presence
- adaptive time-of-day behavior
- a future assistant conversation surface that feels like a resident PC companion
- a future Surface companion client that can securely reach the home Praxis node during travel

The Surface/travel client expectation means the architecture should eventually expose a secure Home Node API boundary instead of trapping core logic inside the desktop renderer.
Initial remote access design should assume access from anywhere, not only same-home-network use.

## Immediate Development Priorities

1. Build a trustworthy local memory model with markdown records and an index
2. Build the desktop dashboard around missions, projects, todos, deadlines, people, and appointments
3. Expand the first daily brief and recommendation engine with appointments, people, and operator overrides
4. Add the arrival ritual in the desktop app
5. Add voice wake and spoken output after the core briefing logic is trustworthy
