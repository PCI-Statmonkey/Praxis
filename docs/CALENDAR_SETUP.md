# Calendar Setup

Praxis supports local appointment records, ICS imports, and manual Google/Outlook calendar sync.
Connected calendars are intentionally user-triggered right now; no background scheduler has been
added.

## Storage And Privacy

- OAuth tokens are stored only through the Electron main-process encrypted secret vault.
- Raw OAuth tokens are not exposed to the renderer.
- Raw calendar dumps are not written to markdown memory.
- Imported events are normalized into local appointment records so the daily brief can rank them.

## Google Calendar

Required app setting:

- Google OAuth client ID, saved in Praxis Desk Settings.

Optional app setting:

- Google OAuth client secret, saved through the encrypted secret vault if your OAuth client requires it.

Optional environment fallback:

- `PRAXIS_GOOGLE_CLIENT_ID`
- `PRAXIS_GOOGLE_CLIENT_SECRET`
- `PRAXIS_GOOGLE_REDIRECT_URI`

Default redirect URI:

- `http://127.0.0.1:47841/oauth/google/callback`

Required scope:

- `https://www.googleapis.com/auth/calendar.readonly`

Preflight check:

- Run `npm run calendar:google:preflight` from `praxis-desktop/`.
- This checks environment-variable setup only. The normal user-facing path is the Settings form in Praxis Desk.
- If you save the client ID inside Praxis Settings, use the in-app Google OAuth readiness badges as the source of truth.

Setup flow:

1. Create a Google OAuth client suitable for a desktop/local callback flow.
2. Configure the OAuth consent screen and add yourself as a test user if Google requires it.
3. Enable the Google Calendar API.
4. If Google asks for an authorized redirect URI, add the default redirect URI above unless overriding it in Praxis Settings.
5. Open Praxis Settings and paste the Google OAuth client ID into `Google OAuth client ID`.
6. Save Google OAuth setup.
7. Add a Google calendar connection in Settings.
8. Leave provider calendar ID blank for the primary calendar, or paste a Google Calendar ID for another calendar.
9. Use `Connect Google` on that connection.
10. After the browser callback succeeds, use `Sync Google Events`.

## Multiple Calendars

Praxis supports multiple calendar connection rows.

- Add one row per calendar.
- Leave provider calendar ID blank for a primary/default calendar.
- For Google secondary calendars, open Google Calendar settings, select the calendar, go to `Integrate calendar`, and copy `Calendar ID`.
- For Outlook secondary calendars, use the Microsoft Graph calendar ID when available; blank uses the default calendar view.
- Each row can be connected and synced separately.

## Outlook Calendar

Required environment variable:

- `PRAXIS_OUTLOOK_CLIENT_ID`

Optional environment variables:

- `PRAXIS_OUTLOOK_CLIENT_SECRET`
- `PRAXIS_OUTLOOK_REDIRECT_URI`

Default redirect URI:

- `http://127.0.0.1:47842/oauth/outlook/callback`

Required scopes:

- `offline_access`
- `https://graph.microsoft.com/Calendars.Read`

Setup flow:

1. Create a Microsoft app registration that allows the local redirect URI above.
2. Launch Praxis with `PRAXIS_OUTLOOK_CLIENT_ID` available in the environment.
3. Add an Outlook calendar connection in Settings.
4. Use `Connect Outlook` on that connection.
5. After the browser callback succeeds, use `Sync Outlook Events`.

## Current Limits

- Sync is manual only.
- Google sync reads the provider calendar ID saved on each connection, or `primary` when blank.
- Outlook sync reads the provider calendar ID saved on each connection, or Microsoft Graph's default calendar view when blank.
- Live validation against the operator's real Google and Microsoft accounts is still required.
- Background sync should be added only after explicit user controls and safety rules are designed.
