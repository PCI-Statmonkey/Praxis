import { app } from "electron";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
  STORAGE_AUTHORITY_RULES,
  type MemoryIndexRepairReport,
  type StorageOverview,
} from "../shared/storage/hybridStorage";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");

type DatabaseHandle = import("better-sqlite3").Database;

const DATABASE_FILENAME = "praxis.sqlite";
const SCHEMA_VERSION = 12;

let database: DatabaseHandle | null = null;

const ensureDirectory = (target: string) => {
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }
};

const resolveWorkspaceRoot = () => path.resolve(process.env.APP_ROOT, "..");

const resolveWorkspaceMemoryRoot = () => path.join(resolveWorkspaceRoot(), "memory");

export const resolveMemoryRoot = () => {
  const configuredRoot = process.env["PRAXIS_MEMORY_ROOT"];
  if (configuredRoot && configuredRoot.trim().length > 0) {
    ensureDirectory(configuredRoot);
    return configuredRoot;
  }

  const workspaceMemoryRoot = resolveWorkspaceMemoryRoot();
  if (existsSync(workspaceMemoryRoot)) {
    return workspaceMemoryRoot;
  }

  const fallbackRoot = path.join(app.getPath("documents"), "Praxis Desk", "memory");
  ensureDirectory(fallbackRoot);
  return fallbackRoot;
};

export const resolveDatabasePath = () => {
  const userData = path.join(app.getPath("appData"), "praxis-desktop");
  ensureDirectory(userData);
  return path.join(userData, DATABASE_FILENAME);
};

const migrateSchema = (db: DatabaseHandle) => {
  const currentVersion = db.pragma("user_version", { simple: true }) as number;
  if (currentVersion >= SCHEMA_VERSION) {
    return;
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      status TEXT NOT NULL,
      due_at TEXT,
      markdown_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      mission_id TEXT REFERENCES missions(id) ON DELETE SET NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT,
      status TEXT NOT NULL,
      due_at TEXT,
      markdown_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      due_at TEXT,
      money_related INTEGER NOT NULL DEFAULT 0,
      waiting_on_person_id TEXT REFERENCES people(id) ON DELETE SET NULL,
      source_kind TEXT,
      source_ref TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role_summary TEXT,
      email TEXT,
      phone TEXT,
      billing_address TEXT,
      notes TEXT,
      markdown_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS person_work_links (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      entity_kind TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      relationship TEXT NOT NULL,
      source_kind TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(person_id, entity_kind, entity_id, relationship)
    );

    CREATE TABLE IF NOT EXISTS person_aliases (
      id TEXT PRIMARY KEY,
      person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      alias TEXT NOT NULL,
      normalized_alias TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      source_system TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT,
      all_day INTEGER NOT NULL DEFAULT 0,
      notes_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS appointments_external_identity
      ON appointments(source_system, external_id)
      WHERE external_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS finance_items (
      id TEXT PRIMARY KEY,
      source_system TEXT NOT NULL,
      external_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_cents INTEGER,
      currency TEXT,
      due_at TEXT,
      counterparty TEXT,
      notes_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS finance_items_external_identity
      ON finance_items(source_system, external_id)
      WHERE external_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS deadlines (
      id TEXT PRIMARY KEY,
      entity_kind TEXT NOT NULL,
      entity_id TEXT,
      title TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      source_kind TEXT,
      source_ref TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inbox_facts (
      id TEXT PRIMARY KEY,
      source_system TEXT NOT NULL,
      source_ref TEXT,
      entity_kind TEXT,
      entity_id TEXT,
      fact_type TEXT NOT NULL,
      value_json TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 1,
      captured_at TEXT NOT NULL,
      routed_to TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_briefs (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL UNIQUE,
      spoken_brief TEXT NOT NULL,
      recommendation TEXT,
      has_more INTEGER NOT NULL DEFAULT 0,
      markdown_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_kind TEXT NOT NULL,
      entity_kind TEXT NOT NULL,
      entity_id TEXT,
      title TEXT NOT NULL,
      relative_path TEXT NOT NULL UNIQUE,
      last_indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS suggestion_contexts (
      id TEXT PRIMARY KEY,
      surface TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      prompt TEXT NOT NULL,
      actions_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS calendar_connections (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      label TEXT NOT NULL,
      account_ref TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      auth_status TEXT NOT NULL DEFAULT 'needs_credentials',
      sync_status TEXT NOT NULL DEFAULT 'blocked',
      last_synced_at TEXT,
      last_sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_connections (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      label TEXT NOT NULL,
      account_ref TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      auth_status TEXT NOT NULL DEFAULT 'needs_credentials',
      sync_status TEXT NOT NULL DEFAULT 'blocked',
      last_synced_at TEXT,
      last_sync_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_messages (
      id TEXT PRIMARY KEY,
      connection_id TEXT REFERENCES email_connections(id) ON DELETE SET NULL,
      source_system TEXT NOT NULL,
      external_id TEXT,
      thread_ref TEXT,
      subject TEXT NOT NULL,
      sender_name TEXT,
      sender_email TEXT,
      received_at TEXT NOT NULL,
      summary TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS email_messages_external_identity
      ON email_messages(source_system, external_id)
      WHERE external_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS chat_imports (
      id TEXT PRIMARY KEY,
      source_system TEXT NOT NULL,
      external_id TEXT,
      conversation_title TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      summary TEXT,
      source_ref TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS chat_imports_external_identity
      ON chat_imports(source_system, external_id)
      WHERE external_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS chat_import_participants (
      id TEXT PRIMARY KEY,
      chat_import_id TEXT NOT NULL REFERENCES chat_imports(id) ON DELETE CASCADE,
      display_name TEXT NOT NULL,
      handle TEXT,
      role TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(chat_import_id, display_name, handle)
    );

    CREATE TABLE IF NOT EXISTS chat_import_messages (
      id TEXT PRIMARY KEY,
      chat_import_id TEXT NOT NULL REFERENCES chat_imports(id) ON DELETE CASCADE,
      external_id TEXT,
      sender_name TEXT,
      sent_at TEXT NOT NULL,
      summary TEXT,
      snippet TEXT,
      source_ref TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS chat_import_messages_external_identity
      ON chat_import_messages(chat_import_id, external_id)
      WHERE external_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS secure_secrets (
      owner_kind TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      secret_kind TEXT NOT NULL,
      encrypted_value_base64 TEXT NOT NULL,
      encryption_provider TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY(owner_kind, owner_id, secret_kind)
    );

    CREATE TABLE IF NOT EXISTS time_blocks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      entity_kind TEXT NOT NULL,
      entity_id TEXT,
      status TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'local',
      notes TEXT,
      actual_minutes INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS projects_mission_idx ON projects(mission_id);
    CREATE INDEX IF NOT EXISTS todos_project_idx ON todos(project_id);
    CREATE INDEX IF NOT EXISTS todos_due_idx ON todos(due_at);
    CREATE INDEX IF NOT EXISTS appointments_start_idx ON appointments(starts_at);
    CREATE INDEX IF NOT EXISTS finance_items_due_idx ON finance_items(due_at);
    CREATE INDEX IF NOT EXISTS deadlines_due_idx ON deadlines(due_at);
    CREATE INDEX IF NOT EXISTS deadlines_entity_idx ON deadlines(entity_kind, entity_id);
    CREATE INDEX IF NOT EXISTS inbox_facts_entity_idx ON inbox_facts(entity_kind, entity_id);
    CREATE INDEX IF NOT EXISTS inbox_facts_fact_type_idx ON inbox_facts(fact_type, captured_at DESC);
    CREATE INDEX IF NOT EXISTS memory_documents_doc_kind_idx ON memory_documents(doc_kind);
    CREATE INDEX IF NOT EXISTS calendar_connections_provider_idx ON calendar_connections(provider);
    CREATE INDEX IF NOT EXISTS email_connections_provider_idx ON email_connections(provider);
    CREATE INDEX IF NOT EXISTS email_messages_received_idx ON email_messages(received_at DESC);
    CREATE INDEX IF NOT EXISTS email_messages_connection_idx ON email_messages(connection_id);
    CREATE INDEX IF NOT EXISTS chat_imports_source_idx ON chat_imports(source_system, imported_at DESC);
    CREATE INDEX IF NOT EXISTS chat_import_messages_import_idx ON chat_import_messages(chat_import_id, sent_at ASC);
    CREATE INDEX IF NOT EXISTS chat_import_participants_import_idx ON chat_import_participants(chat_import_id);
    CREATE INDEX IF NOT EXISTS secure_secrets_owner_idx ON secure_secrets(owner_kind, owner_id);
    CREATE INDEX IF NOT EXISTS person_work_links_person_idx ON person_work_links(person_id);
    CREATE INDEX IF NOT EXISTS person_work_links_entity_idx ON person_work_links(entity_kind, entity_id);
    CREATE INDEX IF NOT EXISTS person_aliases_person_idx ON person_aliases(person_id);
    CREATE INDEX IF NOT EXISTS time_blocks_start_idx ON time_blocks(starts_at);
    CREATE INDEX IF NOT EXISTS time_blocks_entity_idx ON time_blocks(entity_kind, entity_id);
    CREATE INDEX IF NOT EXISTS time_blocks_status_idx ON time_blocks(status);
  `);

  const todoColumns = db.pragma("table_info(todos)") as Array<{ name: string }>;
  const hasTodoColumn = (name: string) => todoColumns.some((column) => column.name === name);
  if (!hasTodoColumn("quick_action")) {
    db.exec("ALTER TABLE todos ADD COLUMN quick_action INTEGER NOT NULL DEFAULT 0");
  }
  if (!hasTodoColumn("estimated_minutes")) {
    db.exec("ALTER TABLE todos ADD COLUMN estimated_minutes INTEGER");
  }

  const timeBlockColumns = db.pragma("table_info(time_blocks)") as Array<{ name: string }>;
  const hasTimeBlockColumn = (name: string) =>
    timeBlockColumns.some((column) => column.name === name);
  if (!hasTimeBlockColumn("actual_minutes")) {
    db.exec("ALTER TABLE time_blocks ADD COLUMN actual_minutes INTEGER");
  }

  const personColumns = db.pragma("table_info(people)") as Array<{ name: string }>;
  const hasPersonColumn = (name: string) => personColumns.some((column) => column.name === name);
  if (!hasPersonColumn("email")) {
    db.exec("ALTER TABLE people ADD COLUMN email TEXT");
  }
  if (!hasPersonColumn("phone")) {
    db.exec("ALTER TABLE people ADD COLUMN phone TEXT");
  }
  if (!hasPersonColumn("billing_address")) {
    db.exec("ALTER TABLE people ADD COLUMN billing_address TEXT");
  }
  if (!hasPersonColumn("notes")) {
    db.exec("ALTER TABLE people ADD COLUMN notes TEXT");
  }

  const calendarColumns = db.pragma("table_info(calendar_connections)") as Array<{ name: string }>;
  const hasCalendarColumn = (name: string) => calendarColumns.some((column) => column.name === name);
  if (!hasCalendarColumn("auth_status")) {
    db.exec("ALTER TABLE calendar_connections ADD COLUMN auth_status TEXT NOT NULL DEFAULT 'needs_credentials'");
    db.exec("UPDATE calendar_connections SET auth_status = 'not_configured' WHERE provider = 'other'");
  }
  if (!hasCalendarColumn("sync_status")) {
    db.exec("ALTER TABLE calendar_connections ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'blocked'");
    db.exec("UPDATE calendar_connections SET sync_status = 'manual_import_only' WHERE provider = 'other'");
  }
  if (!hasCalendarColumn("last_synced_at")) {
    db.exec("ALTER TABLE calendar_connections ADD COLUMN last_synced_at TEXT");
  }
  if (!hasCalendarColumn("last_sync_error")) {
    db.exec("ALTER TABLE calendar_connections ADD COLUMN last_sync_error TEXT");
  }

  const emailConnectionColumns = db.pragma("table_info(email_connections)") as Array<{ name: string }>;
  const hasEmailConnectionColumn = (name: string) =>
    emailConnectionColumns.some((column) => column.name === name);
  if (!hasEmailConnectionColumn("auth_status")) {
    db.exec("ALTER TABLE email_connections ADD COLUMN auth_status TEXT NOT NULL DEFAULT 'needs_credentials'");
    db.exec("UPDATE email_connections SET auth_status = 'not_configured' WHERE provider = 'manual'");
  }
  if (!hasEmailConnectionColumn("sync_status")) {
    db.exec("ALTER TABLE email_connections ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'blocked'");
    db.exec("UPDATE email_connections SET sync_status = 'manual_import_only' WHERE provider = 'manual'");
  }
  if (!hasEmailConnectionColumn("last_synced_at")) {
    db.exec("ALTER TABLE email_connections ADD COLUMN last_synced_at TEXT");
  }
  if (!hasEmailConnectionColumn("last_sync_error")) {
    db.exec("ALTER TABLE email_connections ADD COLUMN last_sync_error TEXT");
  }

  db.pragma(`user_version = ${SCHEMA_VERSION}`);
};

const inferDocKind = (relativePath: string) => {
  const [segment] = relativePath.split("/");
  return segment || "root";
};

const inferEntityKind = (docKind: string, relativePath: string) => {
  if (relativePath.endsWith("/index.md") || relativePath === "index.md") {
    return "index";
  }
  if (docKind === "templates") {
    return "template";
  }
  return docKind;
};

const titleFromPath = (relativePath: string) =>
  path.basename(relativePath, ".md").replace(/[-_]/g, " ");

const upsertIndexedDocument = (
  db: DatabaseHandle,
  memoryRoot: string,
  absolutePath: string
) => {
  const relativePath = path.relative(memoryRoot, absolutePath).replace(/\\/g, "/");
  const docKind = inferDocKind(relativePath);
  const entityKind = inferEntityKind(docKind, relativePath);
  const title = titleFromPath(relativePath);

  const result = db.prepare(`
    INSERT INTO memory_documents (
      doc_kind,
      entity_kind,
      entity_id,
      title,
      relative_path,
      last_indexed_at
    ) VALUES (?, ?, NULL, ?, ?, ?)
    ON CONFLICT(relative_path) DO UPDATE SET
      doc_kind = excluded.doc_kind,
      entity_kind = excluded.entity_kind,
      title = excluded.title,
      last_indexed_at = excluded.last_indexed_at
  `).run(docKind, entityKind, title, relativePath, new Date().toISOString());
  return result.changes;
};

const indexDirectory = (
  db: DatabaseHandle,
  memoryRoot: string,
  currentPath: string,
  seenRelativePaths: Set<string>
) => {
  let changedCount = 0;
  for (const entry of readdirSync(currentPath)) {
    const absolutePath = path.join(currentPath, entry);
    const stat = statSync(absolutePath);
    if (stat.isDirectory()) {
      changedCount += indexDirectory(db, memoryRoot, absolutePath, seenRelativePaths);
      continue;
    }

    if (stat.isFile() && absolutePath.toLowerCase().endsWith(".md")) {
      const relativePath = path.relative(memoryRoot, absolutePath).replace(/\\/g, "/");
      seenRelativePaths.add(relativePath);
      changedCount += upsertIndexedDocument(db, memoryRoot, absolutePath);
    }
  }
  return changedCount;
};

export const repairMemoryDocumentIndex = (): MemoryIndexRepairReport => {
  const db = initializePraxisDatabase();
  const memoryRoot = resolveMemoryRoot();
  const seenRelativePaths = new Set<string>();
  let addedOrUpdatedCount = 0;
  if (existsSync(memoryRoot)) {
    addedOrUpdatedCount = indexDirectory(db, memoryRoot, memoryRoot, seenRelativePaths);
  }

  const rows = db
    .prepare("SELECT relative_path FROM memory_documents ORDER BY relative_path ASC")
    .all() as Array<{ relative_path: string }>;
  const staleIndexPaths = rows
    .map((row) => row.relative_path)
    .filter((relativePath) => !seenRelativePaths.has(relativePath));

  const removeStale = db.prepare("DELETE FROM memory_documents WHERE relative_path = ?");
  for (const relativePath of staleIndexPaths) {
    removeStale.run(relativePath);
  }

  const indexedDocumentCount = db
    .prepare("SELECT COUNT(*) AS count FROM memory_documents")
    .get() as { count: number };

  return {
    memoryRoot,
    scannedMarkdownCount: seenRelativePaths.size,
    indexedDocumentCount: indexedDocumentCount.count,
    addedOrUpdatedCount,
    removedStaleIndexCount: staleIndexPaths.length,
    staleIndexPaths,
  };
};

export const refreshMemoryDocumentIndex = () => {
  repairMemoryDocumentIndex();
};

export const initializePraxisDatabase = () => {
  if (database) {
    return database;
  }

  const dbPath = resolveDatabasePath();
  database = new BetterSqlite3(dbPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  migrateSchema(database);
  refreshMemoryDocumentIndex();
  return database;
};

export const getPraxisDatabase = () => initializePraxisDatabase();

export const closePraxisDatabase = () => {
  if (!database) {
    return;
  }
  database.close();
  database = null;
};

export const getStorageOverview = (): StorageOverview => {
  const db = initializePraxisDatabase();
  const tables = (
    db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string }>
  ).map((row) => row.name);
  const indexedDocumentCount = db
    .prepare(`SELECT COUNT(*) AS count FROM memory_documents`)
    .get() as { count: number };

  return {
    databasePath: resolveDatabasePath(),
    memoryRoot: resolveMemoryRoot(),
    schemaVersion: SCHEMA_VERSION,
    indexedDocumentCount: indexedDocumentCount.count,
    tables,
    authorityRules: STORAGE_AUTHORITY_RULES,
  };
};
