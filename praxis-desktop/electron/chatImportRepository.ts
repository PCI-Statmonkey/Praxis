import crypto from "node:crypto";
import type {
  AcceptChatSuggestionInput,
  AcceptChatSuggestionResult,
  ArchiveChatSuggestionInput,
  ArchiveChatSuggestionResult,
  ChatImportMessageRecord,
  ChatImportRecord,
  ChatImportSnapshot,
  ChatImportSourceSystem,
  ChatSuggestionEntityKind,
  ChatSuggestionRecord,
  ChatSuggestionStatus,
  DismissChatSuggestionInput,
  DismissChatSuggestionResult,
  ImportChatConversationInput,
  ImportChatConversationResult,
  NormalizedChatMessage,
} from "../shared/chatImport";
import {
  extractChatFollowUpSuggestion,
  type ExtractedChatSuggestion,
} from "../shared/chatSuggestionExtraction";
import { getPraxisDatabase } from "./praxisDb";
import { createProject, createTodo } from "./workRepository";

type DbChatImport = {
  id: string;
  source_system: ChatImportSourceSystem;
  external_id: string | null;
  conversation_title: string;
  imported_at: string;
  summary: string | null;
  source_ref: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
};

type DbChatMessage = {
  id: string;
  chat_import_id: string;
  external_id: string | null;
  sender_name: string | null;
  sent_at: string;
  summary: string | null;
  snippet: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

type DbInboxFact = {
  id: string;
  source_system: ChatImportSourceSystem;
  source_ref: string | null;
  value_json: string;
  confidence: number;
  captured_at: string;
  routed_to: string | null;
};

type StoredChatSuggestionValue = {
  chatImportId: string;
  messageId: string;
  conversationTitle: string;
  title: string;
  suggestedEntityKind: ChatSuggestionEntityKind;
  reason: string;
  dueAt: string | null;
  senderName: string | null;
  subject: string;
  summary: string | null;
  sentAt: string;
  status: ChatSuggestionStatus;
};

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const normalizeOptional = (value: string | undefined | null) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const stableExternalId = (sourceSystem: string, title: string, sourceRef: string | null) =>
  crypto
    .createHash("sha1")
    .update([sourceSystem, title.trim(), sourceRef ?? ""].join("|"))
    .digest("hex");

const stableMessageExternalId = (
  chatImportId: string,
  message: NormalizedChatMessage,
  index: number
) => {
  const explicit = normalizeOptional(message.externalId);
  if (explicit) {
    return explicit;
  }

  return crypto
    .createHash("sha1")
    .update(
      [
        chatImportId,
        normalizeOptional(message.senderName) ?? "",
        normalizeOptional(message.sentAt) ?? "",
        normalizeOptional(message.sourceRef) ?? "",
        normalizeOptional(message.summary) ?? normalizeOptional(message.snippet) ?? "",
        index,
      ].join("|")
    )
    .digest("hex");
};

const toChatImport = (row: DbChatImport): ChatImportRecord => ({
  id: row.id,
  sourceSystem: row.source_system,
  externalId: row.external_id,
  conversationTitle: row.conversation_title,
  importedAt: row.imported_at,
  summary: row.summary,
  sourceRef: row.source_ref,
  messageCount: row.message_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toChatMessage = (row: DbChatMessage): ChatImportMessageRecord => ({
  id: row.id,
  chatImportId: row.chat_import_id,
  externalId: row.external_id,
  senderName: row.sender_name,
  sentAt: row.sent_at,
  summary: row.summary,
  snippet: row.snippet,
  sourceRef: row.source_ref,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseSuggestionStatus = (routedTo: string | null, value: StoredChatSuggestionValue) => {
  if (routedTo === "dismissed") {
    return "dismissed";
  }
  if (routedTo === "archived") {
    return "archived";
  }
  if (routedTo?.startsWith("todo:")) {
    return "created_todo";
  }
  if (routedTo?.startsWith("project:")) {
    return "created_project";
  }
  return value.status ?? "pending";
};

const parseSuggestionValue = (row: DbInboxFact): ChatSuggestionRecord | null => {
  try {
    const value = JSON.parse(row.value_json) as StoredChatSuggestionValue;
    return {
      id: row.id,
      chatImportId: value.chatImportId,
      messageId: value.messageId,
      sourceSystem: row.source_system,
      conversationTitle: value.conversationTitle,
      title: value.title,
      suggestedEntityKind: value.suggestedEntityKind,
      reason: value.reason,
      confidence: row.confidence,
      dueAt: value.dueAt,
      status: parseSuggestionStatus(row.routed_to, value),
      routedTo: row.routed_to,
      senderName: value.senderName,
      subject: value.subject,
      summary: value.summary,
      sentAt: value.sentAt,
      createdAt: row.captured_at,
      updatedAt: row.captured_at,
    };
  } catch {
    return null;
  }
};

const listChatSuggestions = () =>
  (
    getPraxisDatabase()
      .prepare(
        `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
         FROM inbox_facts
         WHERE fact_type = 'chat_follow_up'
         ORDER BY captured_at DESC
         LIMIT 40`
      )
      .all() as DbInboxFact[]
  )
    .map(parseSuggestionValue)
    .filter((suggestion): suggestion is ChatSuggestionRecord => Boolean(suggestion));

const findChatImportByExternalIdentity = (sourceSystem: ChatImportSourceSystem, externalId: string) =>
  getPraxisDatabase()
    .prepare("SELECT * FROM chat_imports WHERE source_system = ? AND external_id = ?")
    .get(sourceSystem, externalId) as DbChatImport | undefined;

const upsertParticipant = (
  chatImportId: string,
  displayName: string,
  handle: string | null,
  role: string | null,
  timestamp: string
) => {
  getPraxisDatabase()
    .prepare(
      `INSERT INTO chat_import_participants (
        id,
        chat_import_id,
        display_name,
        handle,
        role,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(chat_import_id, display_name, handle) DO UPDATE SET
        role = excluded.role,
        updated_at = excluded.updated_at`
    )
    .run(createId("chat_participant"), chatImportId, displayName, handle, role, timestamp, timestamp);
};

const upsertMessage = (
  chatImportId: string,
  message: NormalizedChatMessage,
  index: number,
  timestamp: string
) => {
  const sentAt = normalizeOptional(message.sentAt);
  const summary = normalizeOptional(message.summary);
  const snippet = normalizeOptional(message.snippet);
  if (!sentAt || (!summary && !snippet)) {
    return { status: "skipped" as const, messageId: null };
  }

  const externalId = stableMessageExternalId(chatImportId, message, index);
  const existing = getPraxisDatabase()
    .prepare(
      `SELECT id
       FROM chat_import_messages
       WHERE chat_import_id = ?
         AND external_id = ?`
    )
    .get(chatImportId, externalId) as { id: string } | undefined;

  if (existing) {
    getPraxisDatabase()
      .prepare(
        `UPDATE chat_import_messages
         SET sender_name = ?,
             sent_at = ?,
             summary = ?,
             snippet = ?,
             source_ref = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(
        normalizeOptional(message.senderName),
        sentAt,
        summary,
        snippet,
        normalizeOptional(message.sourceRef),
        timestamp,
        existing.id
      );
    return { status: "updated" as const, messageId: existing.id };
  }

  const messageId = createId("chat_message");
  getPraxisDatabase()
    .prepare(
      `INSERT INTO chat_import_messages (
        id,
        chat_import_id,
        external_id,
        sender_name,
        sent_at,
        summary,
        snippet,
        source_ref,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      messageId,
      chatImportId,
      externalId,
      normalizeOptional(message.senderName),
      sentAt,
      summary,
      snippet,
      normalizeOptional(message.sourceRef),
      timestamp,
      timestamp
    );
  return { status: "imported" as const, messageId };
};

const getChatMessageById = (messageId: string) =>
  getPraxisDatabase()
    .prepare("SELECT * FROM chat_import_messages WHERE id = ?")
    .get(messageId) as DbChatMessage | undefined;

const getSuggestionRow = (suggestionId: string) =>
  getPraxisDatabase()
    .prepare(
      `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE id = ?
         AND fact_type = 'chat_follow_up'`
    )
    .get(suggestionId) as DbInboxFact | undefined;

const upsertSuggestionFact = (
  chatImport: ChatImportRecord,
  message: ChatImportMessageRecord,
  extracted: ExtractedChatSuggestion | null,
  timestamp: string
) => {
  const db = getPraxisDatabase();
  const existing = db
    .prepare(
      `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE fact_type = 'chat_follow_up'
         AND source_ref = ?`
    )
    .get(message.id) as DbInboxFact | undefined;

  if (existing?.routed_to) {
    return 0;
  }

  if (!extracted) {
    if (existing) {
      db.prepare("DELETE FROM inbox_facts WHERE id = ?").run(existing.id);
    }
    return 0;
  }

  const payload: StoredChatSuggestionValue = {
    chatImportId: chatImport.id,
    messageId: message.id,
    conversationTitle: chatImport.conversationTitle,
    title: extracted.title,
    suggestedEntityKind: extracted.suggestedEntityKind,
    reason: extracted.reason,
    dueAt: extracted.dueAt,
    senderName: extracted.senderName,
    subject: extracted.subject,
    summary: extracted.summary,
    sentAt: extracted.sentAt,
    status: "pending",
  };

  if (existing) {
    db.prepare(
      `UPDATE inbox_facts
       SET value_json = ?,
           confidence = ?,
           captured_at = ?
       WHERE id = ?`
    ).run(JSON.stringify(payload), extracted.confidence, timestamp, existing.id);
    return 1;
  }

  db.prepare(
    `INSERT INTO inbox_facts (
      id,
      source_system,
      source_ref,
      entity_kind,
      entity_id,
      fact_type,
      value_json,
      confidence,
      captured_at,
      routed_to
    ) VALUES (?, ?, ?, NULL, NULL, 'chat_follow_up', ?, ?, ?, NULL)`
  ).run(
    createId("chat_fact"),
    chatImport.sourceSystem,
    message.id,
    JSON.stringify(payload),
    extracted.confidence,
    timestamp
  );
  return 1;
};

export const importChatConversation = (
  input: ImportChatConversationInput
): ImportChatConversationResult => {
  const conversationTitle = normalizeOptional(input.conversationTitle);
  if (!conversationTitle) {
    return {
      ok: false,
      message: "Conversation title is required.",
      importedMessages: 0,
      updatedMessages: 0,
      suggestionsCreated: 0,
      skippedMessages: input.messages.length,
    };
  }

  const timestamp = nowIso();
  const importedAt = normalizeOptional(input.importedAt) ?? timestamp;
  const sourceRef = normalizeOptional(input.sourceRef);
  const externalId =
    normalizeOptional(input.externalId) ??
    stableExternalId(input.sourceSystem, conversationTitle, sourceRef);
  const existing = findChatImportByExternalIdentity(input.sourceSystem, externalId);
  const chatImportId = existing?.id ?? createId("chat_import");

  const result = getPraxisDatabase().transaction(() => {
    if (existing) {
      getPraxisDatabase()
        .prepare(
          `UPDATE chat_imports
           SET conversation_title = ?,
               imported_at = ?,
               summary = ?,
               source_ref = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .run(
          conversationTitle,
          importedAt,
          normalizeOptional(input.summary),
          sourceRef,
          timestamp,
          chatImportId
        );
    } else {
      getPraxisDatabase()
        .prepare(
          `INSERT INTO chat_imports (
            id,
            source_system,
            external_id,
            conversation_title,
            imported_at,
            summary,
            source_ref,
            message_count,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
        )
        .run(
          chatImportId,
          input.sourceSystem,
          externalId,
          conversationTitle,
          importedAt,
          normalizeOptional(input.summary),
          sourceRef,
          timestamp,
          timestamp
        );
    }

    for (const participant of input.participants ?? []) {
      const displayName = normalizeOptional(participant.displayName);
      if (!displayName) {
        continue;
      }
      upsertParticipant(
        chatImportId,
        displayName,
        normalizeOptional(participant.handle),
        normalizeOptional(participant.role),
        timestamp
      );
    }

    let importedMessages = 0;
    let updatedMessages = 0;
    let skippedMessages = 0;
    let suggestionsCreated = 0;
    const extractorImport: ChatImportRecord = {
      id: chatImportId,
      sourceSystem: input.sourceSystem,
      externalId,
      conversationTitle,
      importedAt,
      summary: normalizeOptional(input.summary),
      sourceRef,
      messageCount: 0,
      createdAt: existing?.created_at ?? timestamp,
      updatedAt: timestamp,
    };
    input.messages.forEach((message, index) => {
      const { status, messageId } = upsertMessage(chatImportId, message, index, timestamp);
      if (status === "imported") {
        importedMessages += 1;
      } else if (status === "updated") {
        updatedMessages += 1;
      } else {
        skippedMessages += 1;
      }
      if (messageId) {
        const row = getChatMessageById(messageId);
        if (row) {
          const chatMessage = toChatMessage(row);
          suggestionsCreated += upsertSuggestionFact(
            extractorImport,
            chatMessage,
            extractChatFollowUpSuggestion(extractorImport, chatMessage),
            timestamp
          );
        }
      }
    });

    const count = getPraxisDatabase()
      .prepare("SELECT COUNT(*) AS count FROM chat_import_messages WHERE chat_import_id = ?")
      .get(chatImportId) as { count: number };
    getPraxisDatabase()
      .prepare("UPDATE chat_imports SET message_count = ?, updated_at = ? WHERE id = ?")
      .run(count.count, timestamp, chatImportId);

    return {
      importedMessages,
      updatedMessages,
      suggestionsCreated,
      skippedMessages,
    };
  })();

  return {
    ok: true,
    message: `Chat import stored: ${result.importedMessages} imported, ${result.updatedMessages} updated, ${result.suggestionsCreated} review candidate${result.suggestionsCreated === 1 ? "" : "s"} flagged, ${result.skippedMessages} skipped.`,
    importId: chatImportId,
    ...result,
  };
};

export const getChatImportSnapshot = (): ChatImportSnapshot => {
  const imports = (
    getPraxisDatabase()
      .prepare("SELECT * FROM chat_imports ORDER BY imported_at DESC, updated_at DESC LIMIT 24")
      .all() as DbChatImport[]
  ).map(toChatImport);
  const recentMessages = (
    getPraxisDatabase()
      .prepare(
        `SELECT *
         FROM chat_import_messages
         ORDER BY sent_at DESC, updated_at DESC
         LIMIT 40`
      )
      .all() as DbChatMessage[]
  ).map(toChatMessage);

  return {
    imports,
    recentMessages,
    suggestions: listChatSuggestions(),
  };
};

const updateSuggestionRouting = (
  suggestionId: string,
  routedTo: string,
  status: ChatSuggestionStatus
) => {
  const row = getSuggestionRow(suggestionId);
  if (!row) {
    return false;
  }

  try {
    const value = JSON.parse(row.value_json) as StoredChatSuggestionValue;
    getPraxisDatabase()
      .prepare(
        `UPDATE inbox_facts
         SET value_json = ?,
             routed_to = ?
         WHERE id = ?`
      )
      .run(
        JSON.stringify({
          ...value,
          status,
        }),
        routedTo,
        suggestionId
      );
    return true;
  } catch {
    return false;
  }
};

export const acceptChatSuggestion = (
  input: AcceptChatSuggestionInput
): AcceptChatSuggestionResult => {
  const row = getSuggestionRow(input.suggestionId);
  if (!row) {
    return {
      ok: false,
      message: "That chat suggestion no longer exists.",
    };
  }

  const suggestion = parseSuggestionValue(row);
  if (!suggestion) {
    return {
      ok: false,
      message: "That chat suggestion could not be read.",
    };
  }
  if (suggestion.status !== "pending") {
    return {
      ok: false,
      message: "That chat suggestion was already handled.",
    };
  }

  const noteLines = [
    `Seeded from ${suggestion.sourceSystem} chat: ${suggestion.conversationTitle}`,
    suggestion.senderName ? `Sender: ${suggestion.senderName}` : null,
    `Sent: ${suggestion.sentAt}`,
    suggestion.summary ? `Summary: ${suggestion.summary}` : null,
    `Reason: ${suggestion.reason}`,
  ].filter((line): line is string => Boolean(line));

  if (input.mode === "project") {
    const project = createProject({
      title: suggestion.title,
      summary: noteLines.join("\n"),
      dueAt: suggestion.dueAt ?? undefined,
    });
    updateSuggestionRouting(input.suggestionId, `project:${project.id}`, "created_project");
    return {
      ok: true,
      message: `Created project ${project.title} from the chat follow-up.`,
      entityKind: "project",
      entityId: project.id,
    };
  }

  const todo = createTodo({
    title: suggestion.title,
    dueAt: suggestion.dueAt ?? undefined,
    priority: suggestion.dueAt ? "high" : "normal",
    quickAction: suggestion.suggestedEntityKind !== "project",
    sourceKind: "chat_import",
    sourceRef: suggestion.messageId,
    notes: noteLines.join("\n"),
  });
  updateSuggestionRouting(input.suggestionId, `todo:${todo.id}`, "created_todo");
  return {
    ok: true,
    message: `Created todo ${todo.title} from the chat follow-up.`,
    entityKind: "todo",
    entityId: todo.id,
  };
};

export const dismissChatSuggestion = (
  input: DismissChatSuggestionInput
): DismissChatSuggestionResult => {
  const ok = updateSuggestionRouting(input.suggestionId, "dismissed", "dismissed");
  return {
    ok,
    message: ok
      ? "Dismissed that chat follow-up."
      : "That chat follow-up could not be dismissed.",
  };
};

export const archiveChatSuggestion = (
  input: ArchiveChatSuggestionInput
): ArchiveChatSuggestionResult => {
  const ok = updateSuggestionRouting(input.suggestionId, "archived", "archived");
  return {
    ok,
    message: ok
      ? "Archived that chat follow-up."
      : "That chat follow-up could not be archived.",
  };
};
