const includes = (value: string, needle: string) => value.toLowerCase().includes(needle.toLowerCase());

export const normalizeOutlookOAuthError = (raw: string, redirectUri: string, surface: "mail" | "calendar") => {
  const target = surface === "mail" ? "Outlook email" : "Outlook calendar";

  if (includes(raw, "AADSTS50011") || includes(raw, "redirect uri")) {
    return `${target} OAuth failed because the Microsoft app registration redirect URI does not match Praxis. Add ${redirectUri} to the app registration and try again.`;
  }
  if (includes(raw, "AADSTS700016") || includes(raw, "application was not found")) {
    return `${target} OAuth failed because the Microsoft client ID looks wrong or the app registration does not exist. Check Outlook App Setup in Praxis Settings.`;
  }
  if (includes(raw, "invalid_client")) {
    return `${target} OAuth failed because the Microsoft client secret is wrong or missing for this app registration. Update Outlook App Setup in Praxis Settings.`;
  }
  if (
    includes(raw, "AADSTS65001") ||
    includes(raw, "consent_required") ||
    includes(raw, "interaction_required")
  ) {
    return `${target} OAuth needs Microsoft consent. Approve the requested permissions in the browser, then try again.`;
  }
  if (includes(raw, "access_denied")) {
    return `${target} OAuth was denied in Microsoft sign-in. Approve access in the browser and try again.`;
  }
  if (includes(raw, "unauthorized_client")) {
    return `${target} OAuth failed because the Microsoft app registration is not configured for this flow. Check the app type and redirect URIs in Azure Portal.`;
  }

  return raw;
};

export const normalizeOutlookSyncError = (
  raw: string,
  scopeName: "Mail.Read" | "Calendars.Read" | "Calendars.ReadWrite",
  surface: "mail" | "calendar"
) => {
  const target = surface === "mail" ? "Outlook inbox sync" : "Outlook calendar sync";

  if (includes(raw, "insufficient privileges") || includes(raw, "access is denied")) {
    return `${target} failed because the Microsoft app registration is missing ${scopeName} permission or consent was not granted.`;
  }
  if (includes(raw, "resource could not be found") || includes(raw, "erroritemnotfound")) {
    return `${target} failed because the saved Outlook account or calendar reference could not be found. Check the connection row in Praxis Settings.`;
  }
  if (includes(raw, "too many requests")) {
    return `${target} is being rate-limited by Microsoft. Wait a bit and try again.`;
  }

  return raw;
};
