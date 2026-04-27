# CURRENT TASK

## OBJECTIVE

Close the V1 readiness loop after Google, Outlook, chat import, dashboard, Settings, command parity, and unsigned Windows packaging validation. Keep the queue focused on the remaining release blocker and the next concrete planning track.

## CURRENT STATE

- Gmail OAuth is connected against a real Google account.
- Gmail API is enabled and live sync is validated.
- Gmail imported 25 privacy-safe local summaries covering April 20, 2026 through April 27, 2026.
- Gmail follow-up triage is complete for the first real synced batch.
- PRAXIS created `Follow up: Studio 2 touching base.` as an active high-priority quick-action todo due April 28, 2026 at 5:00 PM.
- PRAXIS archived the two stale `Meeting moved to tomorrow` candidates because their implied dates were already past and there was no open/waiting-on signal.
- Gmail currently has 0 pending follow-up candidates.
- Google Calendar is connected and live sync is validated with 3 future appointments imported.
- Outlook Graph setup recovered after GoDaddy granted Microsoft Entra access for the tenant.
- Outlook Mail is connected and live sync is validated against `Pedro@BDNC.pro`.
- Outlook Mail imported privacy-safe local summaries and created 7 pending follow-up candidates.
- Outlook Calendar is connected and live sync is validated against `Outlook Primary`.
- Outlook Calendar sync completed with no imported Outlook appointments in the current local store.
- Outlook follow-up triage is complete; Review Inbox currently has 0 pending email follow-up candidates.
- The first Outlook triage added 4 active projects and 1 active todo to the work graph.
- Raw email bodies are not written to markdown memory.
- Settings now uses unified `Google` and `Outlook` service panels instead of separate email and calendar setup lanes.
- Settings service panels now use user-facing labels for auth/sync state, detect stale syncs, prevent duplicate active sync actions, show reconnect for existing sources, and confirm before deleting stored source credentials.
- Dashboard now has a compact service health strip for Google, Outlook, Slack, Memory, and Companion.
- Dashboard now has a Dashboard Readiness card, actionable empty states, Review Inbox clarity, Daily Operating Rhythm, and mobile wrapping fixes.
- Dashboard visual acceptance passed on desktop and mobile smoke checks with no horizontal overflow offenders.
- The Google service panel and Review Inbox show source-neutral candidate details, including sender, received time, proposed due date, subject, summary, reason, and accept/archive/dismiss actions.
- Email suggestion extraction interprets relative dates like `tomorrow` from the email received date instead of the current review date.
- Review Inbox recommends `archive` for past-date candidates unless they include an open, pending, waiting-on, blocked, or outstanding signal.
- Talk panel mission commands now produce a reviewable mission draft instead of requiring the manual record drawer.
- Slack direct messages support appointment reports and stage direct write commands behind explicit `yes`/`no` confirmation.
- Slack direct messages support confirmed natural-language capture drafts for missions, todos, and appointments.
- Desktop, Slack, and companion command mode recognize `review conversation` requests and route them to the `chat-triage` skill.
- Assistant confirmation and context isolation regressions are covered for staged writes, `yes`/`no`, Slack thread scoping, surface fallback, and call-like todo/appointment ambiguity.
- The normalized `chat_imports` storage lane exists with conversation, participant, and message tables plus IPC access.
- Imported chat snippets create pending `chat_follow_up` Review Inbox candidates with accept, archive, and dismiss actions.
- The Talk panel has a manual chat import surface for WhatsApp, SMS, Slack, manual, or unknown snippets; imported snippets can immediately produce Review Inbox candidates.
- `review conversation` commands hand off to the manual chat import surface: desktop opens Talk, and Slack/companion responses tell the operator where to paste the useful exchange.
- Dashboard includes a Daily Operating Rhythm lane that summarizes arrival, triage, and closeout signals from the current brief, Review Inbox, waiting-on count, overdue count, quick actions, and near-term appointments.
- Daily brief generation computes closeout counts for changed work, completed work, waiting-on items, overdue items, due-today items, and move-or-decide candidates.
- Daily markdown notes persist the closeout summary so session closeout context survives across app restarts.
- Release policy is documented: first channel is direct private Windows x64 delivery, unsigned builds are validation/private-test only, and public or broad distribution requires signing approval.
- Unsigned Windows x64 packaging is validated with `npm run package:win`; installer and unpacked app report `NotSigned`, matching the private validation policy.
- Private Windows x64 smoke-check procedure is documented in `docs/RELEASE_CHECKLIST.md`.
- Private Windows x64 smoke check was executed and recorded in `docs/RELEASE_VALIDATION.md`, but the artifact is not approved for private sharing yet because dashboard, Settings, visible installer wizard, and SmartScreen behavior were not visually confirmed.
- Latest integration verification passed: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build:app`, and `npm run storage:check`.

## NEXT STEPS

### 1. Close Private Windows Release Smoke Blockers

**GOAL**

Decide whether the current unsigned Windows x64 artifact is safe for private validation sharing.

**INSTRUCTIONS**

1. Re-run only the missing visible smoke checks from `docs/RELEASE_VALIDATION.md`.
2. Visually confirm the installer wizard and expected unsigned-app / SmartScreen behavior.
3. Visually confirm installed app launch, dashboard load, and Settings load.
4. Decide whether the empty `%LOCALAPPDATA%\Programs\PraxisDesk` directory left after silent uninstall is acceptable release debt or a blocker.
5. Update `docs/RELEASE_VALIDATION.md` with the final result and evidence.

**FILES**

- `docs/RELEASE_VALIDATION.md`
- `docs/TECH_DEBT.md` only if the uninstall residue becomes tracked debt

**DONE WHEN**

- The current Windows x64 artifact is either approved for private validation sharing or explicitly blocked with the next corrective action.

### 2. Keep Future Intelligence And Capture Tracks Execution-Focused

**GOAL**

Keep future PRAXIS direction visible without distracting from current release readiness.

**INSTRUCTIONS**

1. Preserve long-term goals: voice, local AI, companion remote trust, release signing, broader integrations, and invited conversation review.
2. Treat local AI as a summarization/ranking/explanation layer, not the source of truth for writes.
3. Keep `chat_imports` as the shared lane for Slack channel review, WhatsApp manual imports/business webhooks, and future mobile snippets.
4. Convert only the next concrete prerequisite into active work after release validation is settled.
5. Keep speculative ideas in roadmap/debt docs, not the immediate execution queue.

**FILES**

- `docs/Roadmap.md`
- `docs/TECH_DEBT.md`
- `docs/ARCHITECTURE.md`
- `docs/MISSION_PLAN.md`
- `docs/WHATSAPP_INTEGRATION_NOTES.md`

**DONE WHEN**

- Long-term direction remains documented, while this queue stays focused on release validation and the next concrete prerequisite.
