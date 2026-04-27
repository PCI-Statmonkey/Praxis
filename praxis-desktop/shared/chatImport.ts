export type ChatImportSourceSystem = "slack" | "whatsapp" | "sms" | "manual" | "unknown";

export type ChatSuggestionEntityKind = "todo" | "project";

export type ChatSuggestionStatus =
  | "pending"
  | "created_todo"
  | "created_project"
  | "dismissed"
  | "archived";

export type ChatImportParticipant = {
  displayName: string;
  handle?: string;
  role?: string;
};

export type NormalizedChatMessage = {
  externalId?: string;
  senderName?: string;
  sentAt: string;
  summary?: string;
  snippet?: string;
  sourceRef?: string;
};

export type ImportChatConversationInput = {
  sourceSystem: ChatImportSourceSystem;
  externalId?: string;
  conversationTitle: string;
  importedAt?: string;
  summary?: string;
  sourceRef?: string;
  participants?: ChatImportParticipant[];
  messages: NormalizedChatMessage[];
};

export type ChatImportRecord = {
  id: string;
  sourceSystem: ChatImportSourceSystem;
  externalId: string | null;
  conversationTitle: string;
  importedAt: string;
  summary: string | null;
  sourceRef: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatImportMessageRecord = {
  id: string;
  chatImportId: string;
  externalId: string | null;
  senderName: string | null;
  sentAt: string;
  summary: string | null;
  snippet: string | null;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatSuggestionRecord = {
  id: string;
  chatImportId: string;
  messageId: string;
  sourceSystem: ChatImportSourceSystem;
  conversationTitle: string;
  title: string;
  suggestedEntityKind: ChatSuggestionEntityKind;
  reason: string;
  confidence: number;
  dueAt: string | null;
  status: ChatSuggestionStatus;
  routedTo: string | null;
  senderName: string | null;
  subject: string;
  summary: string | null;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatImportSnapshot = {
  imports: ChatImportRecord[];
  recentMessages: ChatImportMessageRecord[];
  suggestions: ChatSuggestionRecord[];
};

export type ImportChatConversationResult = {
  ok: boolean;
  message: string;
  importId?: string;
  importedMessages: number;
  updatedMessages: number;
  suggestionsCreated: number;
  skippedMessages: number;
};

export type AcceptChatSuggestionInput = {
  suggestionId: string;
  mode: ChatSuggestionEntityKind;
};

export type AcceptChatSuggestionResult = {
  ok: boolean;
  message: string;
  entityKind?: ChatSuggestionEntityKind;
  entityId?: string;
};

export type ArchiveChatSuggestionInput = {
  suggestionId: string;
};

export type ArchiveChatSuggestionResult = {
  ok: boolean;
  message: string;
};

export type DismissChatSuggestionInput = {
  suggestionId: string;
};

export type DismissChatSuggestionResult = {
  ok: boolean;
  message: string;
};
