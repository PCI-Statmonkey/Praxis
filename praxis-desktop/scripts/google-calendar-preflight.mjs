const DEFAULT_REDIRECT_URI = "http://127.0.0.1:47841/oauth/google/callback";
const REQUIRED_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const preview = (value) => {
  if (!value) {
    return "missing";
  }
  if (value.length <= 12) {
    return "set";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const clientId = process.env.PRAXIS_GOOGLE_CLIENT_ID?.trim() ?? "";
const clientSecret = process.env.PRAXIS_GOOGLE_CLIENT_SECRET?.trim() ?? "";
const redirectUri = process.env.PRAXIS_GOOGLE_REDIRECT_URI?.trim() || DEFAULT_REDIRECT_URI;

const failures = [];

if (!clientId) {
  failures.push("PRAXIS_GOOGLE_CLIENT_ID is required.");
}

let parsedRedirectUri;
try {
  parsedRedirectUri = new URL(redirectUri);
  if (parsedRedirectUri.protocol !== "http:") {
    failures.push("Google redirect URI must use http.");
  }
  if (parsedRedirectUri.hostname !== "127.0.0.1") {
    failures.push("Google redirect URI must use 127.0.0.1.");
  }
  if (!parsedRedirectUri.port) {
    failures.push("Google redirect URI must include a local port.");
  }
} catch {
  failures.push("PRAXIS_GOOGLE_REDIRECT_URI is not a valid URL.");
}

console.log("Praxis Google Calendar preflight");
console.log("");
console.log(`Client ID: ${preview(clientId)}`);
console.log(`Client secret: ${clientSecret ? "set (optional)" : "missing (optional for PKCE desktop clients)"}`);
console.log(`Redirect URI: ${redirectUri}`);
console.log(`Scopes: ${REQUIRED_SCOPES.join(", ")}`);
console.log("");

if (failures.length > 0) {
  console.log("Status: NOT READY");
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  console.log("");
  console.log("Next: create/configure a Google OAuth client and launch Praxis with PRAXIS_GOOGLE_CLIENT_ID set.");
  process.exitCode = 1;
} else {
  console.log("Status: READY TO START GOOGLE OAUTH");
  console.log("Next: open Praxis Settings, add a Google calendar connection, click Connect Google, then Sync Google Events.");
}
