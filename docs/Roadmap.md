# ROADMAP

## Stage 1 - Desktop Shell and Local Persistence
- [x] Electron desktop shell runs on Windows
- [x] Praxis HUD layout with shell panels
- [x] Local checklist persistence with append-only event log and snapshots
- [ ] Replace shell placeholders with assistant-backed panels

## Stage 2 - Operator Memory and Work Model
- [x] Create markdown memory folder structure and indexes
- [x] Add mission, project, todo, people, finance, and daily note templates
- [x] Define hybrid SQLite plus markdown storage architecture
- [x] Add initial SQLite schema and markdown document indexing
- [x] Add first SQLite-backed writers for missions, projects, todos, and deadlines
- [x] Generate matching markdown records and summary views in `memory/`
- [x] Replace seeded work UI with storage-backed queries and creation forms
- [x] Add status update flows for completing, pausing, and reactivating stored work records
- [x] Add first natural-language capture for dated todos and appointments
- [x] Add confirmation handling for ambiguous natural-language captures
- [x] Attach captured todos to clearly matched existing projects
- [x] Add editable capture drafts before saving parsed records
- [x] Show project and mission context for todos in the global quick-action list
- [x] Add edit/delete flows for todos and appointments plus delete controls for stored work records
- [x] Add edit panels for missions, projects, and deadlines
- [x] Extract work creation and edit panels into focused renderer components
- [x] Add quick-action flags, estimated minutes, and quick/urgent checklist filtering
- [x] Infer quick-action todos from wording during natural-language capture
- [x] Add first people records and waiting-on links for todos
- [x] Match existing people during natural-language todo capture
- [x] Add people contact fields, edit/delete, and project/mission relationship tracking
- [x] Add person aliases for lookup and natural-language matching
- [x] Add person profile/detail view with related projects, missions, and waiting-on todos
- [x] Add explicit person-to-project/mission relationship management
- [x] Extract people profile/detail UI into a focused component
- [ ] Expand natural-language capture for missions, deeper relationships, and updates
- [ ] Build fact extraction that stores structured context instead of raw source dumps

## Stage 3 - Assistant Core and Daily Briefing
- [x] Shared definitions for ideas, missions, tasks, signals, and insights
- [x] Ranked proactive mission suggestions in the desktop surface
- [x] Command-backed contextual reply resolver for short confirmations and ordinals
- [x] First daily briefing engine with ranked recommendation output from stored work records
- [x] Local appointment records and same-day appointment priority in the daily brief
- [x] First arrival/status-report surface with time-of-day greeting
- [x] Mission/project focus report for "where am I on this?" status checks
- [x] Conversational routing for typed mission/project status questions
- [x] Conversational `tell me more` expansion for daily and focus reports
- [x] Persist current report actions and resolve ordinal follow-ups like `mark the first one done`
- [x] Structured people/contact lookup through the assistant route
- [x] Structured people/project relationship lookup through the assistant route
- [x] Focus reports include involved people and relationship labels
- [x] Share persisted report action context across desktop and Slack
- [x] Persist safe proactive suggestion context for short replies such as `yes` and `do it`
- [x] Proactive waiting-on suggestions for active todos blocked on people
- [x] Natural-language completion updates for clearly matched todos and deadlines
- [x] Natural-language due-date moves for clearly matched todos and deadlines
- [x] Natural-language waiting-on clearing for clearly matched people and todos
- [x] Ambiguous update confirmation for completion, due-date moves, and waiting-on clearing
- [x] Normalized calendar import pipeline into local appointment records
- [x] Calendar import from Google and Outlook into appointment records
- [x] Share first proactive suggestion context across desktop and Slack
- [ ] Move the rest of the assistant flow onto the same command and event backbone

## Stage 4 - Calendars, Email Facts, and Finance Awareness
- [x] Local calendar settings foundation with multiple calendar connections
- [x] Manual normalized calendar event import for testing and future adapters
- [x] ICS file import into local appointment records
- [x] Bounded ICS recurrence expansion for common `RRULE` patterns
- [x] ICS `TZID` conversion for IANA timezone-tagged event times
- [x] Calendar connection auth/sync status foundation
- [x] OS-backed encrypted secret vault for future integration tokens
- [x] Google Calendar OAuth readiness and authorization URL scaffold
- [x] Settings-backed Google OAuth client ID and encrypted optional client secret
- [x] Google Calendar loopback OAuth callback and encrypted token exchange
- [x] Manual Google Calendar event fetch/import into appointment records
- [x] Multi-calendar sync targeting by provider calendar ID per connection row
- [x] Google OAuth callback UI auto-refresh
- [x] Google Calendar sync diagnostics for token, permission, and empty-calendar cases
- [x] Google Calendar live-test preflight command
- [x] Live-test Google Calendar OAuth and event sync against the operator's Google account
- [x] Automatic calendar sync on startup, every 30 minutes while open, after OAuth, and when the user asks about appointments/events
- [x] Dedicated appointment/event report service for today, tomorrow, and upcoming schedule questions
- [x] Outlook Calendar OAuth readiness, callback, and encrypted token exchange
- [x] Manual Outlook Calendar event fetch/import into appointment records
- [x] Calendar OAuth/import implementation for Google and Outlook connected calendars
- [x] Google Calendar awareness through connected calendar accounts
- [x] Outlook Calendar awareness through connected calendar accounts
- [x] Appointment-first briefing metadata for future calendar-focused UI cards
- [x] Extract calendar settings/import UI into a focused component
- [x] Add Google/Outlook calendar setup documentation and Settings guidance
- [ ] Email fact extraction for due dates, waiting-on, and next actions
- [ ] Bill.com awareness for invoices, approvals, and overdue money tasks

## Stage 5 - Slack Adapter
- [x] Optional Slack Socket Mode adapter foundation
- [x] Slack DM access to structured people/contact lookup
- [x] Slack DM access to daily reports and mission/project focus reports
- [x] Safe Slack ordinal completion for current report items
- [x] Slack quick-reply surface for mirrored top-action proactive suggestions
- [x] Slack quick-reply surface for mirrored waiting-on proactive suggestions
- [x] Shared proactive suggestion context between desktop and Slack
- [x] Settings-backed Slack operator channel and proactive mirroring toggle
- [x] Manual Slack test suggestion from Praxis Desk settings
- [x] Manual Slack connection test with setup-specific error guidance
- [x] Manual Slack adapter restart from Praxis Desk settings
- [x] Safe reply resolution for ambiguous update confirmations
- [x] Extract Slack settings UI into a focused component
- [ ] Command execution parity between desktop and Slack

## Stage 5.5 - Release Packaging
- [x] Define first Windows `x64` NSIS package path
- [x] Document direct private delivery as the first distribution channel
- [x] Document Praxis Project/operator ownership for the future signing certificate
- [x] Document unsigned installer limits for validation and approved private testing
- [ ] Add signing implementation after certificate storage, signing location, and timestamp server are chosen

## Stage 6 - Voice and Arrival Ritual
- [ ] Configurable wake phrase
- [ ] Always-listening wake detection
- [ ] Spoken greeting
- [ ] Spoken 30-second briefing with optional follow-up
- [ ] Silent mode and display-first override

## Stage 7 - Local AI and Insight Loop
- [ ] Local model routing via Ollama
- [ ] Memory summarization
- [ ] Signal detection
- [ ] Insight generation
- [ ] Proactive assistant tuning based on operator profile

## Stage 8 - Broader Integrations
- [ ] Calendar and inbox integrations
- [ ] Define Home Node API boundary for future Surface companion client
- [ ] Design secure travel access for a Surface companion client from outside the home network
- [ ] Cross-device sync strategy review
- [ ] Additional communication adapters such as Discord
