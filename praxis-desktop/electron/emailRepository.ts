import crypto from "node:crypto";
import type {
  AcceptEmailSuggestionInput,
  AcceptEmailSuggestionResult,
  ArchiveEmailSuggestionInput,
  ArchiveEmailSuggestionResult,
  DismissEmailSuggestionInput,
  DismissEmailSuggestionResult,
  EmailAuthStatus,
  EmailConnectionRecord,
  EmailMessageRecord,
  EmailProvider,
  EmailSnapshot,
  EmailSuggestionEntityKind,
  EmailSuggestionRecord,
  EmailSuggestionStatus,
  EmailSyncStatus,
  ImportEmailMessagesInput,
  ImportEmailMessagesResult,
  NormalizedEmailMessage,
} from "../shared/emailModel";
import type {
  DismissPersonContactSuggestionInput,
  DismissPersonContactSuggestionResult,
  PersonContactSuggestionDismissal,
  RestorePersonContactSuggestionInput,
  RestorePersonContactSuggestionResult,
} from "../shared/personContactSuggestion";
import type { PersonRecord } from "../shared/workModel";
import {
  ensurePersonWorkLink,
  createProject,
  createTodo,
  listPeopleRecords,
} from "./workRepository";
import { getPraxisDatabase, refreshMemoryDocumentIndex } from "./praxisDb";
import { writeEmailFollowUpsMarkdown } from "./memoryWriter";
import { matchPersonForSender } from "./personIdentity";
import {
  buildEmailSuggestionDuplicateKey,
  isStaleEmailSuggestion,
  normalizeEmailSuggestionSubject,
} from "../shared/emailSuggestionRules";
import {
  extractEmailFollowUpSuggestion as extractSuggestion,
  type ExtractedEmailSuggestion as ExtractedSuggestion,
} from "../shared/emailSuggestionExtraction";

type DbEmailConnection = {
  id: string;
  provider: EmailProvider;
  label: string;
  account_ref: string | null;
  enabled: number;
  auth_status: EmailAuthStatus | null;
  sync_status: EmailSyncStatus | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
};

type DbEmailMessage = {
  id: string;
  connection_id: string | null;
  source_system: string;
  external_id: string | null;
  thread_ref: string | null;
  subject: string;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

type DbInboxFact = {
  id: string;
  source_system: string;
  source_ref: string | null;
  value_json: string;
  confidence: number;
  captured_at: string;
  routed_to: string | null;
};

type StoredEmailSuggestionValue = {
  messageId: string;
  duplicateKey?: string;
  title: string;
  suggestedEntityKind: EmailSuggestionEntityKind;
  reason: string;
  dueAt: string | null;
  senderName: string | null;
  senderEmail: string | null;
  subject: string;
  summary: string | null;
  receivedAt: string;
  status: EmailSuggestionStatus;
};

const nowIso = () => new Date().toISOString();

const normalizeOptional = (value: string | undefined | null) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const defaultEmailAuthStatus = (provider: EmailProvider): EmailAuthStatus =>
  provider === "manual" ? "not_configured" : "needs_credentials";

const defaultEmailSyncStatus = (provider: EmailProvider): EmailSyncStatus =>
  provider === "manual" ? "manual_import_only" : "blocked";

const toEmailConnection = (row: DbEmailConnection): EmailConnectionRecord => ({
  id: row.id,
  provider: row.provider,
  label: row.label,
  accountRef: row.account_ref,
  enabled: row.enabled === 1,
  authStatus: row.auth_status ?? defaultEmailAuthStatus(row.provider),
  syncStatus: row.sync_status ?? defaultEmailSyncStatus(row.provider),
  lastSyncedAt: row.last_synced_at,
  lastSyncError: row.last_sync_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const matchedPersonSummary = (
  senderName: string | null,
  senderEmail: string | null,
  people: PersonRecord[]
) => {
  const person = matchPersonForSender(senderName, senderEmail, people);
  return {
    matchedPersonId: person?.id ?? null,
    matchedPersonName: person?.name ?? null,
  };
};

const toEmailMessage = (row: DbEmailMessage, people: PersonRecord[]): EmailMessageRecord => ({
  id: row.id,
  connectionId: row.connection_id,
  sourceSystem: row.source_system,
  externalId: row.external_id,
  threadRef: row.thread_ref,
  subject: row.subject,
  senderName: row.sender_name,
  senderEmail: row.sender_email,
  ...matchedPersonSummary(row.sender_name, row.sender_email, people),
  receivedAt: row.received_at,
  summary: row.summary,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseSuggestionStatus = (routedTo: string | null, value: StoredEmailSuggestionValue) => {
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

const parseSuggestionValue = (
  row: DbInboxFact,
  people: PersonRecord[]
): EmailSuggestionRecord | null => {
  try {
    const value = JSON.parse(row.value_json) as StoredEmailSuggestionValue;
    return {
      id: row.id,
      messageId: value.messageId,
      sourceSystem: row.source_system,
      title: value.title,
      suggestedEntityKind: value.suggestedEntityKind,
      reason: value.reason,
      confidence: row.confidence,
      dueAt: value.dueAt,
      status: parseSuggestionStatus(row.routed_to, value),
      routedTo: row.routed_to,
      senderName: value.senderName,
      senderEmail: value.senderEmail,
      ...matchedPersonSummary(value.senderName, value.senderEmail, people),
      subject: value.subject,
      summary: value.summary,
      receivedAt: value.receivedAt,
      createdAt: row.captured_at,
      updatedAt: row.captured_at,
    };
  } catch {
    return null;
  }
};

const listEmailConnections = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM email_connections ORDER BY created_at DESC")
      .all() as DbEmailConnection[]
  ).map(toEmailConnection);

const listRecentEmailMessages = () =>
  {
    const people = listPeopleRecords();
    return (
      getPraxisDatabase()
        .prepare("SELECT * FROM email_messages ORDER BY received_at DESC, updated_at DESC LIMIT 24")
        .all() as DbEmailMessage[]
    ).map((row) => toEmailMessage(row, people));
  };

const listEmailSuggestions = () =>
  {
    const people = listPeopleRecords();
    return (
      getPraxisDatabase()
        .prepare(
          `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
           FROM inbox_facts
           WHERE fact_type = 'email_follow_up'
           ORDER BY captured_at DESC
           LIMIT 24`
        )
        .all() as DbInboxFact[]
    )
      .map((row) => parseSuggestionValue(row, people))
      .filter((suggestion): suggestion is EmailSuggestionRecord => Boolean(suggestion));
  };

const listContactSuggestionDismissals = (): PersonContactSuggestionDismissal[] =>
  (
    getPraxisDatabase()
      .prepare(
        `SELECT entity_id, source_ref, captured_at
         FROM inbox_facts
         WHERE fact_type = 'person_contact_suggestion_dismissed'
         ORDER BY captured_at DESC`
      )
      .all() as Array<{
        entity_id: string | null;
        source_ref: string | null;
        captured_at: string;
      }>
  )
    .filter((row) => row.entity_id && row.source_ref)
    .map((row) => {
      const rawSourceRef = row.source_ref as string;
      const prefixedMatch = rawSourceRef.match(/^(email|phone|billingAddress):(.*)$/);
      const field = prefixedMatch?.[1] as PersonContactSuggestionDismissal["field"] | undefined;
      const inferredValue = prefixedMatch?.[2] ?? rawSourceRef;

      return {
        personId: row.entity_id as string,
        field: field ?? "email",
        inferredValue,
        dismissedAt: row.captured_at,
      };
    });

export const listPendingEmailSuggestions = () =>
  listEmailSuggestions().filter((suggestion) => suggestion.status === "pending");

const syncEmailMemory = () => {
  writeEmailFollowUpsMarkdown(listPendingEmailSuggestions(), listRecentEmailMessages());
  refreshMemoryDocumentIndex();
};

export const getEmailSnapshot = (): EmailSnapshot => ({
  connections: listEmailConnections(),
  messages: listRecentEmailMessages(),
  suggestions: listEmailSuggestions(),
  contactSuggestionDismissals: listContactSuggestionDismissals(),
});

const stableExternalId = (sourceSystem: string, message: NormalizedEmailMessage) => {
  const explicit = normalizeOptional(message.externalId);
  if (explicit) {
    return explicit;
  }

  return crypto
    .createHash("sha1")
    .update(
      [
        sourceSystem,
        normalizeOptional(message.senderEmail) ?? "",
        normalizeOptional(message.subject) ?? "",
        normalizeOptional(message.receivedAt) ?? "",
      ].join("|")
    )
    .digest("hex");
};

const createCodeFriendlyId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const parseStoredSuggestion = (row: Pick<DbInboxFact, "value_json">) => {
  try {
    return JSON.parse(row.value_json) as StoredEmailSuggestionValue;
  } catch {
    return null;
  }
};

const findMessageByExternalIdentity = (sourceSystem: string, externalId: string) =>
  getPraxisDatabase()
    .prepare("SELECT * FROM email_messages WHERE source_system = ? AND external_id = ?")
    .get(sourceSystem, externalId) as DbEmailMessage | undefined;

const getSuggestionRow = (suggestionId: string) =>
  getPraxisDatabase()
    .prepare(
      `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE id = ?
         AND fact_type = 'email_follow_up'`
    )
    .get(suggestionId) as DbInboxFact | undefined;

const upsertSuggestionFact = (
  message: EmailMessageRecord,
  extracted: ExtractedSuggestion | null
) => {
  const db = getPraxisDatabase();
  const existing = db
    .prepare(
      `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE fact_type = 'email_follow_up'
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

  if (isStaleEmailSuggestion(extracted)) {
    if (existing) {
      db.prepare("DELETE FROM inbox_facts WHERE id = ? AND routed_to IS NULL").run(existing.id);
    }
    return 0;
  }

  const duplicateKey = buildEmailSuggestionDuplicateKey(message, extracted);
  const duplicate = (
    db
      .prepare(
        `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
         FROM inbox_facts
         WHERE fact_type = 'email_follow_up'
         ORDER BY captured_at DESC
         LIMIT 200`
      )
      .all() as DbInboxFact[]
  ).find((candidate) => {
    if (candidate.id === existing?.id) {
      return false;
    }
    const value = parseStoredSuggestion(candidate);
    return value?.duplicateKey === duplicateKey;
  });

  if (duplicate) {
    if (existing && !existing.routed_to) {
      db.prepare("DELETE FROM inbox_facts WHERE id = ?").run(existing.id);
    }
    return 0;
  }

  const payload: StoredEmailSuggestionValue = {
    messageId: message.id,
    duplicateKey,
    title: extracted.title,
    suggestedEntityKind: extracted.suggestedEntityKind,
    reason: extracted.reason,
    dueAt: extracted.dueAt,
    senderName: extracted.senderName,
    senderEmail: extracted.senderEmail,
    subject: extracted.subject,
    summary: extracted.summary,
    receivedAt: extracted.receivedAt,
    status: "pending",
  };
  const timestamp = nowIso();

  if (existing) {
    db.prepare(
      `UPDATE inbox_facts
       SET value_json = ?,
           confidence = ?,
           captured_at = ?
       WHERE id = ?`
    ).run(JSON.stringify(payload), extracted.suggestedEntityKind === "project" ? 0.82 : 0.78, timestamp, existing.id);
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
    ) VALUES (?, ?, ?, NULL, NULL, 'email_follow_up', ?, ?, ?, NULL)`
  ).run(
    createCodeFriendlyId("email_fact"),
    message.sourceSystem,
    message.id,
    JSON.stringify(payload),
    extracted.suggestedEntityKind === "project" ? 0.82 : 0.78,
    timestamp
  );
  return 1;
};

const upsertEmailConnectionSyncState = (connectionId: string | null, updates: Partial<DbEmailConnection>) => {
  if (!connectionId) {
    return;
  }

  const current = getPraxisDatabase()
    .prepare("SELECT * FROM email_connections WHERE id = ?")
    .get(connectionId) as DbEmailConnection | undefined;
  if (!current) {
    return;
  }

  getPraxisDatabase()
    .prepare(
      `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_synced_at = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      updates.auth_status ?? current.auth_status ?? defaultEmailAuthStatus(current.provider),
      updates.sync_status ?? current.sync_status ?? defaultEmailSyncStatus(current.provider),
      updates.last_synced_at ?? current.last_synced_at,
      updates.last_sync_error ?? current.last_sync_error,
      nowIso(),
      connectionId
    );
};

export const createEmailConnection = (input: {
  provider: EmailProvider;
  label: string;
  accountRef?: string;
  enabled?: boolean;
  authStatus?: EmailAuthStatus;
  syncStatus?: EmailSyncStatus;
}) => {
  const timestamp = nowIso();
  const record: EmailConnectionRecord = {
    id: createCodeFriendlyId("email"),
    provider: input.provider,
    label: input.label.trim(),
    accountRef: normalizeOptional(input.accountRef),
    enabled: input.enabled ?? true,
    authStatus: input.authStatus ?? defaultEmailAuthStatus(input.provider),
    syncStatus: input.syncStatus ?? defaultEmailSyncStatus(input.provider),
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  getPraxisDatabase()
    .prepare(
      `INSERT INTO email_connections (
        id,
        provider,
        label,
        account_ref,
        enabled,
        auth_status,
        sync_status,
        last_synced_at,
        last_sync_error,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.provider,
      record.label,
      record.accountRef,
      record.enabled ? 1 : 0,
      record.authStatus,
      record.syncStatus,
      record.lastSyncedAt,
      record.lastSyncError,
      record.createdAt,
      record.updatedAt
    );

  return record;
};

export const deleteEmailConnection = (input: { id: string }) => {
  getPraxisDatabase().prepare("DELETE FROM email_connections WHERE id = ?").run(input.id);
  syncEmailMemory();
  return listEmailConnections();
};

export const importEmailMessages = (
  input: ImportEmailMessagesInput
): ImportEmailMessagesResult => {
  const people = listPeopleRecords();
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let suggestionsCreated = 0;

  for (const rawMessage of input.messages) {
    const subject = normalizeEmailSuggestionSubject(rawMessage.subject);
    const receivedAt = normalizeOptional(rawMessage.receivedAt);
    if (!subject || !receivedAt) {
      skipped += 1;
      continue;
    }

    const externalId = stableExternalId(input.sourceSystem, rawMessage);
    const existing = findMessageByExternalIdentity(input.sourceSystem, externalId);
    const timestamp = nowIso();

    const nextMessage = existing
      ? {
          id: existing.id,
          connectionId: input.connectionId ?? existing.connection_id,
          sourceSystem: input.sourceSystem,
          externalId,
          threadRef: normalizeOptional(rawMessage.threadRef) ?? existing.thread_ref,
          subject,
          senderName: normalizeOptional(rawMessage.senderName) ?? existing.sender_name,
          senderEmail: normalizeOptional(rawMessage.senderEmail) ?? existing.sender_email,
          receivedAt,
          summary:
            normalizeOptional(rawMessage.summary) ??
            normalizeOptional(rawMessage.snippet) ??
            existing.summary,
          createdAt: existing.created_at,
          updatedAt: timestamp,
        }
      : {
          id: createCodeFriendlyId("email_message"),
          connectionId: normalizeOptional(input.connectionId),
          sourceSystem: input.sourceSystem,
          externalId,
          threadRef: normalizeOptional(rawMessage.threadRef),
          subject,
          senderName: normalizeOptional(rawMessage.senderName),
          senderEmail: normalizeOptional(rawMessage.senderEmail),
          receivedAt,
          summary: normalizeOptional(rawMessage.summary) ?? normalizeOptional(rawMessage.snippet),
          createdAt: timestamp,
          updatedAt: timestamp,
        };

    const enrichedMessage: EmailMessageRecord = {
      ...nextMessage,
      ...matchedPersonSummary(nextMessage.senderName, nextMessage.senderEmail, people),
    };

    if (existing) {
      getPraxisDatabase()
        .prepare(
          `UPDATE email_messages
           SET connection_id = ?,
               thread_ref = ?,
               subject = ?,
               sender_name = ?,
               sender_email = ?,
               received_at = ?,
               summary = ?,
               updated_at = ?
           WHERE id = ?`
        )
        .run(
          enrichedMessage.connectionId,
          enrichedMessage.threadRef,
          enrichedMessage.subject,
          enrichedMessage.senderName,
          enrichedMessage.senderEmail,
          enrichedMessage.receivedAt,
          enrichedMessage.summary,
          enrichedMessage.updatedAt,
          enrichedMessage.id
        );
      updated += 1;
    } else {
      getPraxisDatabase()
        .prepare(
          `INSERT INTO email_messages (
            id,
            connection_id,
            source_system,
            external_id,
            thread_ref,
            subject,
            sender_name,
            sender_email,
            received_at,
            summary,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          enrichedMessage.id,
          enrichedMessage.connectionId,
          enrichedMessage.sourceSystem,
          enrichedMessage.externalId,
          enrichedMessage.threadRef,
          enrichedMessage.subject,
          enrichedMessage.senderName,
          enrichedMessage.senderEmail,
          enrichedMessage.receivedAt,
          enrichedMessage.summary,
          enrichedMessage.createdAt,
          enrichedMessage.updatedAt
        );
      imported += 1;
    }

    const extracted = extractSuggestion(enrichedMessage);
    suggestionsCreated += upsertSuggestionFact(enrichedMessage, extracted);
  }

  upsertEmailConnectionSyncState(normalizeOptional(input.connectionId), {
    auth_status: "ready",
    sync_status: "ready_to_sync",
    last_synced_at: nowIso(),
    last_sync_error: null,
  });
  syncEmailMemory();

  return {
    ok: true,
    message: `Email import finished: ${imported} imported, ${updated} updated, ${suggestionsCreated} follow-up candidate${suggestionsCreated === 1 ? "" : "s"} flagged, ${skipped} skipped.`,
    imported,
    updated,
    suggestionsCreated,
    skipped,
  };
};

const updateSuggestionRouting = (
  suggestionId: string,
  routedTo: string,
  status: EmailSuggestionStatus
) => {
  const row = getSuggestionRow(suggestionId);
  if (!row) {
    return false;
  }

  try {
    const value = JSON.parse(row.value_json) as StoredEmailSuggestionValue;
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
    syncEmailMemory();
    return true;
  } catch {
    return false;
  }
};

export const acceptEmailSuggestion = (
  input: AcceptEmailSuggestionInput
): AcceptEmailSuggestionResult => {
  const row = getSuggestionRow(input.suggestionId);
  if (!row) {
    return {
      ok: false,
      message: "That email suggestion no longer exists.",
    };
  }

  const suggestion = parseSuggestionValue(row, listPeopleRecords());
  if (!suggestion) {
    return {
      ok: false,
      message: "That email suggestion could not be read.",
    };
  }
  if (suggestion.status !== "pending") {
    return {
      ok: false,
      message: "That email suggestion was already handled.",
    };
  }

  const matchedPerson = matchPersonForSender(
    suggestion.senderName,
    suggestion.senderEmail,
    listPeopleRecords()
  );

  const noteLines = [
    `Seeded from email: ${suggestion.subject}`,
    suggestion.senderName || suggestion.senderEmail
      ? `Sender: ${suggestion.senderName ?? suggestion.senderEmail}`
      : null,
    matchedPerson ? `Matched person: ${matchedPerson.name}` : null,
    `Received: ${suggestion.receivedAt}`,
    suggestion.summary ? `Summary: ${suggestion.summary}` : null,
    `Reason: ${suggestion.reason}`,
  ].filter((line): line is string => Boolean(line));

  if (input.mode === "project") {
    const project = createProject({
      title: suggestion.title,
      summary: noteLines.join("\n"),
      dueAt: suggestion.dueAt ?? undefined,
    });
    ensurePersonWorkLink(
      matchedPerson?.id ?? null,
      "project",
      project.id,
      "email_sender",
      "email"
    );
    updateSuggestionRouting(input.suggestionId, `project:${project.id}`, "created_project");
    return {
      ok: true,
      message: `Created project ${project.title} from the email follow-up.`,
      entityKind: "project",
      entityId: project.id,
    };
  }

  const todo = createTodo({
    title: suggestion.title,
    dueAt: suggestion.dueAt ?? undefined,
    priority: suggestion.dueAt ? "high" : "normal",
    quickAction: suggestion.suggestedEntityKind !== "project",
    notes: noteLines.join("\n"),
  });
  updateSuggestionRouting(input.suggestionId, `todo:${todo.id}`, "created_todo");
  return {
    ok: true,
    message: `Created todo ${todo.title} from the email follow-up.`,
    entityKind: "todo",
    entityId: todo.id,
  };
};

export const dismissEmailSuggestion = (
  input: DismissEmailSuggestionInput
): DismissEmailSuggestionResult => {
  const ok = updateSuggestionRouting(input.suggestionId, "dismissed", "dismissed");
  return {
    ok,
    message: ok
      ? "Dismissed that email follow-up."
      : "That email follow-up could not be dismissed.",
  };
};

export const archiveEmailSuggestion = (
  input: ArchiveEmailSuggestionInput
): ArchiveEmailSuggestionResult => {
  const ok = updateSuggestionRouting(input.suggestionId, "archived", "archived");
  return {
    ok,
    message: ok
      ? "Archived that email follow-up."
      : "That email follow-up could not be archived.",
  };
};

export const dismissPersonContactSuggestion = (
  input: DismissPersonContactSuggestionInput
): DismissPersonContactSuggestionResult => {
  const personId = normalizeOptional(input.personId);
  const inferredValue = normalizeOptional(input.inferredValue) ?? null;
  const field = input.field;
  const normalizedValue =
    field === "email" ? inferredValue?.toLowerCase() ?? null : inferredValue;
  if (!personId || !normalizedValue) {
    return {
      ok: false,
      message: "Person, suggestion field, and inferred value are required to dismiss this suggestion.",
    };
  }

  const timestamp = nowIso();
  const sourceRef = `${field}:${normalizedValue}`;
  const legacySourceRef = field === "email" ? normalizedValue : null;
  const existing = getPraxisDatabase()
    .prepare(
      `SELECT id
       FROM inbox_facts
       WHERE fact_type = 'person_contact_suggestion_dismissed'
         AND entity_kind = 'person'
         AND entity_id = ?
         AND (source_ref = ? OR source_ref = ?)
       LIMIT 1`
    )
    .get(personId, sourceRef, legacySourceRef) as { id: string } | undefined;

  const payload = JSON.stringify({
    personId,
    field,
    inferredValue: normalizedValue,
    dismissedAt: timestamp,
  });

  if (existing) {
    getPraxisDatabase()
      .prepare(
        `UPDATE inbox_facts
         SET value_json = ?,
             captured_at = ?,
             routed_to = 'dismissed'
         WHERE id = ?`
      )
      .run(payload, timestamp, existing.id);
  } else {
    getPraxisDatabase()
      .prepare(
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
        ) VALUES (?, 'email_contact_suggestion', ?, 'person', ?, 'person_contact_suggestion_dismissed', ?, 1, ?, 'dismissed')`
      )
      .run(createCodeFriendlyId("email_fact"), sourceRef, personId, payload, timestamp);
  }

  return {
    ok: true,
    message: "Ignored that suggested contact detail.",
  };
};

export const restorePersonContactSuggestion = (
  input: RestorePersonContactSuggestionInput
): RestorePersonContactSuggestionResult => {
  const personId = normalizeOptional(input.personId);
  const inferredValue = normalizeOptional(input.inferredValue) ?? null;
  const field = input.field;
  const normalizedValue =
    field === "email" ? inferredValue?.toLowerCase() ?? null : inferredValue;
  if (!personId || !normalizedValue) {
    return {
      ok: false,
      message: "Person, suggestion field, and inferred value are required to restore this suggestion.",
    };
  }

  const sourceRef = `${field}:${normalizedValue}`;
  const legacySourceRef = field === "email" ? normalizedValue : null;
  const deleted = getPraxisDatabase()
    .prepare(
      `DELETE FROM inbox_facts
       WHERE fact_type = 'person_contact_suggestion_dismissed'
         AND entity_kind = 'person'
         AND entity_id = ?
         AND (source_ref = ? OR source_ref = ?)`
    )
    .run(personId, sourceRef, legacySourceRef);

  return {
    ok: deleted.changes > 0,
    message:
      deleted.changes > 0
        ? "Restored that suggested contact detail."
        : "That suggested contact detail was not dismissed.",
  };
};

export const seedEmailMemoryIndex = () => {
  syncEmailMemory();
};
