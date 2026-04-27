export type EmailProvider = "gmail" | "outlook" | "manual";

export type EmailAuthStatus = "not_configured" | "needs_credentials" | "ready" | "error";

export type EmailSyncStatus = "manual_import_only" | "blocked" | "ready_to_sync" | "syncing" | "error";

export type EmailConnectionRecord = {
  id: string;
  provider: EmailProvider;
  label: string;
  accountRef: string | null;
  enabled: boolean;
  authStatus: EmailAuthStatus;
  syncStatus: EmailSyncStatus;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateEmailConnectionInput = {
  provider: EmailProvider;
  label: string;
  accountRef?: string;
  enabled?: boolean;
  authStatus?: EmailAuthStatus;
  syncStatus?: EmailSyncStatus;
};

export type DeleteEmailConnectionInput = {
  id: string;
};

export type NormalizedEmailMessage = {
  externalId?: string;
  threadRef?: string;
  subject: string;
  senderName?: string;
  senderEmail?: string;
  receivedAt: string;
  summary?: string;
  snippet?: string;
};

export type ImportEmailMessagesInput = {
  sourceSystem: EmailProvider | "manual_json";
  connectionId?: string;
  messages: NormalizedEmailMessage[];
};

export type ImportEmailMessagesResult = {
  ok: boolean;
  message: string;
  imported: number;
  updated: number;
  suggestionsCreated: number;
  skipped: number;
};

export type EmailMessageRecord = {
  id: string;
  connectionId: string | null;
  sourceSystem: string;
  externalId: string | null;
  threadRef: string | null;
  subject: string;
  senderName: string | null;
  senderEmail: string | null;
  matchedPersonId: string | null;
  matchedPersonName: string | null;
  receivedAt: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailSuggestionEntityKind = "todo" | "project";

export type EmailSuggestionStatus =
  | "pending"
  | "created_todo"
  | "created_project"
  | "dismissed"
  | "archived";

export type EmailSuggestionRecord = {
  id: string;
  messageId: string;
  sourceSystem: string;
  title: string;
  suggestedEntityKind: EmailSuggestionEntityKind;
  reason: string;
  confidence: number;
  dueAt: string | null;
  status: EmailSuggestionStatus;
  routedTo: string | null;
  senderName: string | null;
  senderEmail: string | null;
  matchedPersonId: string | null;
  matchedPersonName: string | null;
  subject: string;
  summary: string | null;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EmailSnapshot = {
  connections: EmailConnectionRecord[];
  messages: EmailMessageRecord[];
  suggestions: EmailSuggestionRecord[];
  contactSuggestionDismissals: import("./personContactSuggestion").PersonContactSuggestionDismissal[];
};

export type AcceptEmailSuggestionInput = {
  suggestionId: string;
  mode: "todo" | "project";
};

export type AcceptEmailSuggestionResult = {
  ok: boolean;
  message: string;
  entityKind?: "todo" | "project";
  entityId?: string;
};

export type DismissEmailSuggestionInput = {
  suggestionId: string;
};

export type DismissEmailSuggestionResult = {
  ok: boolean;
  message: string;
};

export type ArchiveEmailSuggestionInput = {
  suggestionId: string;
};

export type ArchiveEmailSuggestionResult = {
  ok: boolean;
  message: string;
};
