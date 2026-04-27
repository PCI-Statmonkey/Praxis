import { existsSync } from "node:fs";
import path from "node:path";
import type {
  StorageIntegrityIssue,
  StorageIntegrityReport,
  StorageIntegritySeverity,
} from "../shared/storage/hybridStorage";
import {
  getPraxisDatabase,
  getStorageOverview,
  resolveMemoryRoot,
} from "./praxisDb";

type ForeignKeyCheckRow = {
  table: string;
  rowid: number | string | null;
  parent: string;
  fkid: number;
};

type JsonValueRow = {
  row_id: string | number;
  value: string | null;
};

type ScalarValueRow = {
  row_id: string | number;
  value: string | number | null;
};

type EntityReferenceRow = {
  id: string;
  entity_kind: string | null;
  entity_id: string | null;
};

type AppointmentRangeRow = {
  id: string;
  starts_at: string;
  ends_at: string | null;
};

const KNOWN_DEADLINE_ENTITY_KINDS = new Set(["standalone", "mission", "project", "todo"]);
const KNOWN_INBOX_ENTITY_KINDS = new Set(["mission", "project", "todo", "person", "appointment"]);
const KNOWN_PERSON_LINK_ENTITY_KINDS = new Set(["mission", "project"]);
const KNOWN_WORK_STATUSES = new Set(["active", "blocked", "completed", "paused"]);
const KNOWN_WORK_PRIORITIES = new Set(["low", "normal", "high", "critical"]);
const KNOWN_CALENDAR_PROVIDERS = new Set(["google", "outlook", "other"]);
const KNOWN_EMAIL_PROVIDERS = new Set(["gmail", "outlook", "manual"]);
const KNOWN_CHAT_IMPORT_SOURCES = new Set(["slack", "whatsapp", "sms", "manual", "unknown"]);
const KNOWN_AUTH_STATUSES = new Set(["not_configured", "needs_credentials", "ready", "error"]);
const KNOWN_SYNC_STATUSES = new Set(["manual_import_only", "blocked", "ready_to_sync", "syncing", "error"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const issue = (
  severity: StorageIntegritySeverity,
  code: string,
  message: string,
  table?: string,
  rowId?: string,
  details?: StorageIntegrityIssue["details"]
): StorageIntegrityIssue => ({
  severity,
  code,
  message,
  ...(table ? { table } : {}),
  ...(rowId ? { rowId } : {}),
  ...(details ? { details } : {}),
});

const targetExists = (table: "missions" | "projects" | "todos" | "people" | "appointments", id: string) => {
  const row = getPraxisDatabase()
    .prepare(`SELECT 1 AS found FROM ${table} WHERE id = ? LIMIT 1`)
    .get(id) as { found: number } | undefined;
  return Boolean(row);
};

const entityTargetExists = (entityKind: string, entityId: string) => {
  if (entityKind === "mission") {
    return targetExists("missions", entityId);
  }
  if (entityKind === "project") {
    return targetExists("projects", entityId);
  }
  if (entityKind === "todo") {
    return targetExists("todos", entityId);
  }
  if (entityKind === "person") {
    return targetExists("people", entityId);
  }
  if (entityKind === "appointment") {
    return targetExists("appointments", entityId);
  }
  return false;
};

const isValidDateValue = (value: string | null) =>
  typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));

const normalizeAlias = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const validateJsonColumn = (
  issues: StorageIntegrityIssue[],
  table: string,
  rowIdColumn: string,
  valueColumn: string,
  expectedShape?: "array" | "object"
) => {
  const rows = getPraxisDatabase()
    .prepare(`SELECT ${rowIdColumn} AS row_id, ${valueColumn} AS value FROM ${table}`)
    .all() as JsonValueRow[];

  for (const row of rows) {
    if (row.value === null) {
      continue;
    }
    try {
      const parsed = JSON.parse(row.value);
      if (expectedShape === "array" && !Array.isArray(parsed)) {
        issues.push(
          issue(
            "warning",
            "unexpected_json_shape",
            `${table}.${valueColumn} should contain a JSON array.`,
            table,
            String(row.row_id),
            { column: valueColumn }
          )
        );
      }
      if (
        expectedShape === "object" &&
        (parsed === null || Array.isArray(parsed) || typeof parsed !== "object")
      ) {
        issues.push(
          issue(
            "warning",
            "unexpected_json_shape",
            `${table}.${valueColumn} should contain a JSON object.`,
            table,
            String(row.row_id),
            { column: valueColumn }
          )
        );
      }
    } catch {
      issues.push(
        issue(
          "error",
          "invalid_json",
          `${table}.${valueColumn} is not valid JSON.`,
          table,
          String(row.row_id),
          { column: valueColumn }
        )
      );
    }
  }
};

const validateDateColumn = (
  issues: StorageIntegrityIssue[],
  table: string,
  rowIdColumn: string,
  valueColumn: string,
  severity: StorageIntegritySeverity,
  allowNull = true
) => {
  const rows = getPraxisDatabase()
    .prepare(`SELECT ${rowIdColumn} AS row_id, ${valueColumn} AS value FROM ${table}`)
    .all() as JsonValueRow[];

  for (const row of rows) {
    if (row.value === null || row.value.trim().length === 0) {
      if (!allowNull) {
        issues.push(
          issue(
            severity,
            "missing_date",
            `${table}.${valueColumn} is required but empty.`,
            table,
            String(row.row_id),
            { column: valueColumn }
          )
        );
      }
      continue;
    }

    if (!isValidDateValue(row.value)) {
      issues.push(
        issue(
          severity,
          "invalid_date",
          `${table}.${valueColumn} is not a parseable date.`,
          table,
          String(row.row_id),
          { column: valueColumn, value: row.value }
        )
      );
    }
  }
};

const validateAllowedValueColumn = (
  issues: StorageIntegrityIssue[],
  table: string,
  rowIdColumn: string,
  valueColumn: string,
  allowedValues: Set<string>,
  severity: StorageIntegritySeverity
) => {
  const rows = getPraxisDatabase()
    .prepare(`SELECT ${rowIdColumn} AS row_id, ${valueColumn} AS value FROM ${table}`)
    .all() as ScalarValueRow[];

  for (const row of rows) {
    const value = typeof row.value === "string" ? row.value : row.value === null ? null : String(row.value);
    if (value === null || !allowedValues.has(value)) {
      issues.push(
        issue(
          severity,
          "invalid_allowed_value",
          `${table}.${valueColumn} contains an unrecognized value.`,
          table,
          String(row.row_id),
          { column: valueColumn, value }
        )
      );
    }
  }
};

const validateBooleanColumn = (
  issues: StorageIntegrityIssue[],
  table: string,
  rowIdColumn: string,
  valueColumn: string
) => {
  const rows = getPraxisDatabase()
    .prepare(`SELECT ${rowIdColumn} AS row_id, ${valueColumn} AS value FROM ${table}`)
    .all() as ScalarValueRow[];

  for (const row of rows) {
    if (row.value !== 0 && row.value !== 1) {
      issues.push(
        issue(
          "warning",
          "invalid_boolean",
          `${table}.${valueColumn} should be stored as 0 or 1.`,
          table,
          String(row.row_id),
          { column: valueColumn, value: row.value }
        )
      );
    }
  }
};

const validateDuplicateExternalIdentities = (
  issues: StorageIntegrityIssue[],
  table: string
) => {
  const rows = getPraxisDatabase()
    .prepare(
      `SELECT source_system,
              external_id,
              COUNT(*) AS count,
              GROUP_CONCAT(id, ', ') AS ids
       FROM ${table}
       WHERE external_id IS NOT NULL
         AND TRIM(external_id) <> ''
       GROUP BY source_system, external_id
       HAVING COUNT(*) > 1`
    )
    .all() as Array<{ source_system: string; external_id: string; count: number; ids: string }>;

  for (const row of rows) {
    issues.push(
      issue(
        "error",
        "duplicate_external_identity",
        `${table} has duplicate imported records for the same provider identity.`,
        table,
        row.ids,
        {
          sourceSystem: row.source_system,
          externalId: row.external_id,
          count: row.count,
        }
      )
    );
  }
};

const validateEmailColumn = (
  issues: StorageIntegrityIssue[],
  table: string,
  rowIdColumn: string,
  valueColumn: string
) => {
  const rows = getPraxisDatabase()
    .prepare(`SELECT ${rowIdColumn} AS row_id, ${valueColumn} AS value FROM ${table}`)
    .all() as JsonValueRow[];

  for (const row of rows) {
    const value = row.value?.trim();
    if (value && !EMAIL_PATTERN.test(value)) {
      issues.push(
        issue(
          "warning",
          "invalid_email_address",
          `${table}.${valueColumn} does not look like a valid email address.`,
          table,
          String(row.row_id),
          { column: valueColumn }
        )
      );
    }
  }
};

const validateForeignKeys = (issues: StorageIntegrityIssue[]) => {
  const rows = getPraxisDatabase().prepare("PRAGMA foreign_key_check").all() as ForeignKeyCheckRow[];
  for (const row of rows) {
    issues.push(
      issue(
        "error",
        "foreign_key_violation",
        `${row.table} has a broken foreign key reference to ${row.parent}.`,
        row.table,
        row.rowid === null ? undefined : String(row.rowid),
        { parent: row.parent, foreignKeyId: row.fkid }
      )
    );
  }
};

const validateOperationalFieldShapes = (issues: StorageIntegrityIssue[]) => {
  const dateChecks: Array<{
    table: string;
    rowIdColumn: string;
    valueColumn: string;
    severity: StorageIntegritySeverity;
    allowNull?: boolean;
  }> = [
    { table: "missions", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "missions", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "missions", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "projects", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "projects", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "projects", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "todos", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "todos", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "todos", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "people", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "people", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "person_aliases", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "person_aliases", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "person_work_links", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "person_work_links", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "appointments", rowIdColumn: "id", valueColumn: "starts_at", severity: "error", allowNull: false },
    { table: "appointments", rowIdColumn: "id", valueColumn: "ends_at", severity: "warning" },
    { table: "appointments", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "appointments", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "finance_items", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "finance_items", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "finance_items", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "deadlines", rowIdColumn: "id", valueColumn: "due_at", severity: "error", allowNull: false },
    { table: "deadlines", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "deadlines", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "inbox_facts", rowIdColumn: "id", valueColumn: "captured_at", severity: "error", allowNull: false },
    { table: "daily_briefs", rowIdColumn: "id", valueColumn: "day", severity: "warning", allowNull: false },
    { table: "daily_briefs", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "daily_briefs", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "suggestion_contexts", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "suggestion_contexts", rowIdColumn: "id", valueColumn: "resolved_at", severity: "warning" },
    { table: "calendar_connections", rowIdColumn: "id", valueColumn: "last_synced_at", severity: "warning" },
    { table: "calendar_connections", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "calendar_connections", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "email_connections", rowIdColumn: "id", valueColumn: "last_synced_at", severity: "warning" },
    { table: "email_connections", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "email_connections", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "email_messages", rowIdColumn: "id", valueColumn: "received_at", severity: "error", allowNull: false },
    { table: "email_messages", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "email_messages", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "chat_imports", rowIdColumn: "id", valueColumn: "imported_at", severity: "error", allowNull: false },
    { table: "chat_imports", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "chat_imports", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "chat_import_participants", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "chat_import_participants", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "chat_import_messages", rowIdColumn: "id", valueColumn: "sent_at", severity: "error", allowNull: false },
    { table: "chat_import_messages", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "chat_import_messages", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: false },
    { table: "memory_documents", rowIdColumn: "id", valueColumn: "last_indexed_at", severity: "warning", allowNull: false },
    { table: "secure_secrets", rowIdColumn: "owner_id", valueColumn: "created_at", severity: "error", allowNull: false },
    { table: "secure_secrets", rowIdColumn: "owner_id", valueColumn: "updated_at", severity: "error", allowNull: false },
  ];

  for (const check of dateChecks) {
    validateDateColumn(
      issues,
      check.table,
      check.rowIdColumn,
      check.valueColumn,
      check.severity,
      check.allowNull ?? true
    );
  }

  validateAllowedValueColumn(issues, "missions", "id", "status", KNOWN_WORK_STATUSES, "error");
  validateAllowedValueColumn(issues, "projects", "id", "status", KNOWN_WORK_STATUSES, "error");
  validateAllowedValueColumn(issues, "todos", "id", "status", KNOWN_WORK_STATUSES, "error");
  validateAllowedValueColumn(issues, "todos", "id", "priority", KNOWN_WORK_PRIORITIES, "error");
  validateAllowedValueColumn(issues, "deadlines", "id", "status", KNOWN_WORK_STATUSES, "error");
  validateAllowedValueColumn(issues, "deadlines", "id", "priority", KNOWN_WORK_PRIORITIES, "error");
  validateAllowedValueColumn(issues, "calendar_connections", "id", "provider", KNOWN_CALENDAR_PROVIDERS, "error");
  validateAllowedValueColumn(issues, "calendar_connections", "id", "auth_status", KNOWN_AUTH_STATUSES, "error");
  validateAllowedValueColumn(issues, "calendar_connections", "id", "sync_status", KNOWN_SYNC_STATUSES, "error");
  validateAllowedValueColumn(issues, "email_connections", "id", "provider", KNOWN_EMAIL_PROVIDERS, "error");
  validateAllowedValueColumn(issues, "email_connections", "id", "auth_status", KNOWN_AUTH_STATUSES, "error");
  validateAllowedValueColumn(issues, "email_connections", "id", "sync_status", KNOWN_SYNC_STATUSES, "error");
  validateAllowedValueColumn(issues, "chat_imports", "id", "source_system", KNOWN_CHAT_IMPORT_SOURCES, "error");

  validateBooleanColumn(issues, "todos", "id", "money_related");
  validateBooleanColumn(issues, "todos", "id", "quick_action");
  validateBooleanColumn(issues, "appointments", "id", "all_day");
  validateBooleanColumn(issues, "calendar_connections", "id", "enabled");
  validateBooleanColumn(issues, "email_connections", "id", "enabled");
  validateBooleanColumn(issues, "daily_briefs", "id", "has_more");

  validateDuplicateExternalIdentities(issues, "appointments");
  validateDuplicateExternalIdentities(issues, "email_messages");
  validateDuplicateExternalIdentities(issues, "finance_items");
  validateDuplicateExternalIdentities(issues, "chat_imports");

  validateEmailColumn(issues, "people", "id", "email");
  validateEmailColumn(issues, "email_messages", "id", "sender_email");
};

const validateAppointmentRanges = (issues: StorageIntegrityIssue[]) => {
  const rows = getPraxisDatabase()
    .prepare("SELECT id, starts_at, ends_at FROM appointments WHERE ends_at IS NOT NULL")
    .all() as AppointmentRangeRow[];

  for (const row of rows) {
    if (!isValidDateValue(row.starts_at) || !isValidDateValue(row.ends_at)) {
      continue;
    }
    const endsAt = row.ends_at;

    if (endsAt && Date.parse(endsAt) < Date.parse(row.starts_at)) {
      issues.push(
        issue(
          "error",
          "appointment_ends_before_start",
          "Appointment end time is earlier than its start time.",
          "appointments",
          row.id,
          { startsAt: row.starts_at, endsAt }
        )
      );
    }
  }
};

const validatePersonAliases = (issues: StorageIntegrityIssue[]) => {
  const rows = getPraxisDatabase()
    .prepare("SELECT id, alias, normalized_alias FROM person_aliases")
    .all() as Array<{ id: string; alias: string; normalized_alias: string }>;

  for (const row of rows) {
    const expected = normalizeAlias(row.alias);
    if (expected !== row.normalized_alias) {
      issues.push(
        issue(
          "warning",
          "stale_normalized_alias",
          "Person alias normalized value does not match the current normalization rule.",
          "person_aliases",
          row.id,
          { expected, actual: row.normalized_alias }
        )
      );
    }
  }
};

const validateDeadlineLinks = (issues: StorageIntegrityIssue[]) => {
  const linkedDeadlines = getPraxisDatabase()
    .prepare("SELECT id, entity_kind, entity_id FROM deadlines")
    .all() as EntityReferenceRow[];

  for (const deadline of linkedDeadlines) {
    if (!deadline.entity_kind || !KNOWN_DEADLINE_ENTITY_KINDS.has(deadline.entity_kind)) {
      issues.push(
        issue(
          "warning",
          "unknown_deadline_entity_kind",
          "Deadline has an unrecognized entity kind.",
          "deadlines",
          deadline.id,
          { entityKind: deadline.entity_kind }
        )
      );
      continue;
    }

    if (deadline.entity_kind === "standalone") {
      if (deadline.entity_id) {
        issues.push(
          issue(
            "warning",
            "standalone_deadline_has_entity_id",
            "Standalone deadline carries an entity_id even though it is not linked.",
            "deadlines",
            deadline.id,
            { entityId: deadline.entity_id }
          )
        );
      }
      continue;
    }

    if (!deadline.entity_id || !entityTargetExists(deadline.entity_kind, deadline.entity_id)) {
      issues.push(
        issue(
          "error",
          "broken_deadline_link",
          "Linked deadline points at missing work.",
          "deadlines",
          deadline.id,
          { entityKind: deadline.entity_kind, entityId: deadline.entity_id }
        )
      );
    }
  }

  const missingDeadlineQueries = [
    {
      table: "missions",
      entityKind: "mission",
      sql: `SELECT id FROM missions
            WHERE due_at IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM deadlines
                WHERE deadlines.entity_kind = 'mission'
                  AND deadlines.entity_id = missions.id
              )`,
    },
    {
      table: "projects",
      entityKind: "project",
      sql: `SELECT id FROM projects
            WHERE due_at IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM deadlines
                WHERE deadlines.entity_kind = 'project'
                  AND deadlines.entity_id = projects.id
              )`,
    },
    {
      table: "todos",
      entityKind: "todo",
      sql: `SELECT id FROM todos
            WHERE due_at IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM deadlines
                WHERE deadlines.entity_kind = 'todo'
                  AND deadlines.entity_id = todos.id
              )`,
    },
  ];

  for (const query of missingDeadlineQueries) {
    const rows = getPraxisDatabase().prepare(query.sql).all() as Array<{ id: string }>;
    for (const row of rows) {
      issues.push(
        issue(
          "warning",
          "missing_linked_deadline",
          `${query.table} record has due_at but no mirrored deadline row.`,
          query.table,
          row.id,
          { entityKind: query.entityKind }
        )
      );
    }
  }
};

const validatePersonWorkLinks = (issues: StorageIntegrityIssue[]) => {
  const rows = getPraxisDatabase()
    .prepare("SELECT id, entity_kind, entity_id FROM person_work_links")
    .all() as EntityReferenceRow[];

  for (const row of rows) {
    if (!row.entity_kind || !KNOWN_PERSON_LINK_ENTITY_KINDS.has(row.entity_kind)) {
      issues.push(
        issue(
          "warning",
          "unknown_person_work_link_entity_kind",
          "Person work link has an unrecognized entity kind.",
          "person_work_links",
          row.id,
          { entityKind: row.entity_kind }
        )
      );
      continue;
    }

    if (!row.entity_id || !entityTargetExists(row.entity_kind, row.entity_id)) {
      issues.push(
        issue(
          "error",
          "broken_person_work_link",
          "Person work link points at missing work.",
          "person_work_links",
          row.id,
          { entityKind: row.entity_kind, entityId: row.entity_id }
        )
      );
    }
  }
};

const validateInboxFacts = (issues: StorageIntegrityIssue[]) => {
  const rows = getPraxisDatabase()
    .prepare("SELECT id, entity_kind, entity_id FROM inbox_facts WHERE entity_kind IS NOT NULL")
    .all() as EntityReferenceRow[];

  for (const row of rows) {
    if (!row.entity_kind || !KNOWN_INBOX_ENTITY_KINDS.has(row.entity_kind)) {
      issues.push(
        issue(
          "warning",
          "unknown_inbox_fact_entity_kind",
          "Inbox fact has an unrecognized entity kind.",
          "inbox_facts",
          row.id,
          { entityKind: row.entity_kind }
        )
      );
      continue;
    }

    if (!row.entity_id || !entityTargetExists(row.entity_kind, row.entity_id)) {
      issues.push(
        issue(
          "error",
          "broken_inbox_fact_link",
          "Inbox fact points at a missing entity.",
          "inbox_facts",
          row.id,
          { entityKind: row.entity_kind, entityId: row.entity_id }
        )
      );
    }
  }

  const emailFollowUps = getPraxisDatabase()
    .prepare(
      `SELECT id, source_ref, routed_to
       FROM inbox_facts
       WHERE fact_type = 'email_follow_up'`
    )
    .all() as Array<{ id: string; source_ref: string | null; routed_to: string | null }>;

  for (const followUp of emailFollowUps) {
    const messageExists = followUp.source_ref
      ? Boolean(
          getPraxisDatabase()
            .prepare("SELECT 1 AS found FROM email_messages WHERE id = ? LIMIT 1")
            .get(followUp.source_ref) as { found: number } | undefined
        )
      : false;

    if (!messageExists) {
      issues.push(
        issue(
          "warning",
          "email_follow_up_missing_source_message",
          "Email follow-up suggestion has no matching source email message.",
          "inbox_facts",
          followUp.id,
          { sourceRef: followUp.source_ref }
        )
      );
    }

    if (
      !followUp.routed_to ||
      followUp.routed_to === "dismissed" ||
      followUp.routed_to === "archived"
    ) {
      continue;
    }

    const routeMatch = followUp.routed_to.match(/^(todo|project):(.+)$/);
    if (!routeMatch) {
      issues.push(
        issue(
          "warning",
          "unknown_email_follow_up_route",
          "Email follow-up suggestion has an unrecognized routed_to value.",
          "inbox_facts",
          followUp.id,
          { routedTo: followUp.routed_to }
        )
      );
      continue;
    }

    const [, entityKind, entityId] = routeMatch;
    if (!entityTargetExists(entityKind, entityId)) {
      issues.push(
        issue(
          "error",
          "broken_email_follow_up_route",
          "Email follow-up suggestion is routed to missing work.",
          "inbox_facts",
          followUp.id,
          { routedTo: followUp.routed_to }
        )
      );
    }
  }

  const chatFollowUps = getPraxisDatabase()
    .prepare(
      `SELECT id, source_ref, routed_to
       FROM inbox_facts
       WHERE fact_type = 'chat_follow_up'`
    )
    .all() as Array<{ id: string; source_ref: string | null; routed_to: string | null }>;

  for (const followUp of chatFollowUps) {
    const messageExists = followUp.source_ref
      ? Boolean(
          getPraxisDatabase()
            .prepare("SELECT 1 AS found FROM chat_import_messages WHERE id = ? LIMIT 1")
            .get(followUp.source_ref) as { found: number } | undefined
        )
      : false;

    if (!messageExists) {
      issues.push(
        issue(
          "warning",
          "chat_follow_up_missing_source_message",
          "Chat follow-up suggestion has no matching source chat message.",
          "inbox_facts",
          followUp.id,
          { sourceRef: followUp.source_ref }
        )
      );
    }

    if (
      !followUp.routed_to ||
      followUp.routed_to === "dismissed" ||
      followUp.routed_to === "archived"
    ) {
      continue;
    }

    const routeMatch = followUp.routed_to.match(/^(todo|project):(.+)$/);
    if (!routeMatch) {
      issues.push(
        issue(
          "warning",
          "unknown_chat_follow_up_route",
          "Chat follow-up suggestion has an unrecognized routed_to value.",
          "inbox_facts",
          followUp.id,
          { routedTo: followUp.routed_to }
        )
      );
      continue;
    }

    const [, entityKind, entityId] = routeMatch;
    if (!entityTargetExists(entityKind, entityId)) {
      issues.push(
        issue(
          "error",
          "broken_chat_follow_up_route",
          "Chat follow-up suggestion is routed to missing work.",
          "inbox_facts",
          followUp.id,
          { routedTo: followUp.routed_to }
        )
      );
    }
  }
};

const validateMemoryIndex = (issues: StorageIntegrityIssue[]) => {
  const memoryRoot = resolveMemoryRoot();
  const rows = getPraxisDatabase()
    .prepare("SELECT id, relative_path FROM memory_documents")
    .all() as Array<{ id: number; relative_path: string }>;

  for (const row of rows) {
    if (!existsSync(path.join(memoryRoot, row.relative_path))) {
      issues.push(
        issue(
          "warning",
          "missing_memory_document",
          "Memory document index points at a markdown file that no longer exists.",
          "memory_documents",
          String(row.id),
          { relativePath: row.relative_path }
        )
      );
    }
  }
};

export const checkStorageIntegrity = (): StorageIntegrityReport => {
  const issues: StorageIntegrityIssue[] = [];
  validateForeignKeys(issues);
  validateJsonColumn(issues, "settings", "key", "value_json");
  validateJsonColumn(issues, "inbox_facts", "id", "value_json");
  validateJsonColumn(issues, "suggestion_contexts", "id", "actions_json", "array");
  validateOperationalFieldShapes(issues);
  validateAppointmentRanges(issues);
  validatePersonAliases(issues);
  validateDeadlineLinks(issues);
  validatePersonWorkLinks(issues);
  validateInboxFacts(issues);
  validateMemoryIndex(issues);

  const issueCounts = {
    error: issues.filter((candidate) => candidate.severity === "error").length,
    warning: issues.filter((candidate) => candidate.severity === "warning").length,
  };
  const overview = getStorageOverview();

  return {
    ok: issueCounts.error === 0,
    checkedAt: new Date().toISOString(),
    databasePath: overview.databasePath,
    issueCounts,
    issues,
  };
};
