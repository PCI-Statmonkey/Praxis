import { app as N, safeStorage as Ye, shell as Gn, BrowserWindow as Z, ipcMain as g, Menu as Oo } from "electron";
import { fileURLToPath as Xi } from "node:url";
import k from "node:path";
import { existsSync as ne, mkdirSync as zn, readdirSync as Rs, statSync as $s, writeFileSync as Ls, readFileSync as Hi } from "node:fs";
import { createRequire as Bi } from "node:module";
import I from "node:crypto";
import { promises as qe } from "fs";
import rn from "path";
import { App as Gi, LogLevel as zi } from "@slack/bolt";
import { EventEmitter as Xt } from "node:events";
import Yn from "node:http";
const Yi = [
  {
    entity: "missions",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Operational fields live in SQLite. The operator-facing mission document lives in markdown."
  },
  {
    entity: "projects",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Structured project state and relationships belong in SQLite. Long-form project context is mirrored to markdown."
  },
  {
    entity: "todos",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Todos change frequently and must rank quickly, so SQLite is primary. Markdown views may summarize them."
  },
  {
    entity: "tasks",
    authority: "sqlite",
    mirrors: [],
    notes: "Tasks are highly operational and should remain database-first."
  },
  {
    entity: "people",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "SQLite tracks relationships and follow-up state. Important recurring people may also have markdown profiles."
  },
  {
    entity: "appointments",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Calendar-aware planning depends on fast time-based queries. Daily and calendar markdown are summaries."
  },
  {
    entity: "finance_items",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Money-related items should be queryable and rankable. Markdown captures durable finance notes."
  },
  {
    entity: "inbox_facts",
    authority: "sqlite",
    mirrors: ["markdown"],
    notes: "Extracted facts should be structured in SQLite and optionally reflected into markdown routing files."
  },
  {
    entity: "daily_briefs",
    authority: "markdown",
    mirrors: ["sqlite"],
    notes: "The daily brief is a human-readable narrative record, with metadata indexed in SQLite."
  },
  {
    entity: "memory_documents",
    authority: "markdown",
    mirrors: ["sqlite"],
    notes: "Markdown files remain the human-facing truth layer. SQLite keeps an index for routing and retrieval."
  },
  {
    entity: "settings",
    authority: "sqlite",
    mirrors: [],
    notes: "Settings are operational application state and belong in SQLite."
  },
  {
    entity: "suggestion_contexts",
    authority: "sqlite",
    mirrors: [],
    notes: "Resolver context and reply history are operational state and should stay database-first."
  }
], qi = Bi(import.meta.url), Vi = qi("better-sqlite3"), Ji = "praxis.sqlite", Cn = 10;
let Y = null;
const Rn = (e) => {
  ne(e) || zn(e, { recursive: !0 });
}, Qi = () => k.resolve(process.env.APP_ROOT, ".."), Zi = () => k.join(Qi(), "memory"), tt = () => {
  const e = process.env.PRAXIS_MEMORY_ROOT;
  if (e && e.trim().length > 0)
    return Rn(e), e;
  const t = Zi();
  if (ne(t))
    return t;
  const n = k.join(N.getPath("documents"), "Praxis Desk", "memory");
  return Rn(n), n;
}, Ds = () => {
  const e = k.join(N.getPath("appData"), "praxis-desktop");
  return Rn(e), k.join(e, Ji);
}, ea = (e) => {
  if (e.pragma("user_version", { simple: !0 }) >= Cn)
    return;
  e.exec(`
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
  `);
  const n = e.pragma("table_info(todos)"), o = (l) => n.some((m) => m.name === l);
  o("quick_action") || e.exec("ALTER TABLE todos ADD COLUMN quick_action INTEGER NOT NULL DEFAULT 0"), o("estimated_minutes") || e.exec("ALTER TABLE todos ADD COLUMN estimated_minutes INTEGER");
  const s = e.pragma("table_info(people)"), r = (l) => s.some((m) => m.name === l);
  r("email") || e.exec("ALTER TABLE people ADD COLUMN email TEXT"), r("phone") || e.exec("ALTER TABLE people ADD COLUMN phone TEXT"), r("billing_address") || e.exec("ALTER TABLE people ADD COLUMN billing_address TEXT"), r("notes") || e.exec("ALTER TABLE people ADD COLUMN notes TEXT");
  const i = e.pragma("table_info(calendar_connections)"), a = (l) => i.some((m) => m.name === l);
  a("auth_status") || (e.exec("ALTER TABLE calendar_connections ADD COLUMN auth_status TEXT NOT NULL DEFAULT 'needs_credentials'"), e.exec("UPDATE calendar_connections SET auth_status = 'not_configured' WHERE provider = 'other'")), a("sync_status") || (e.exec("ALTER TABLE calendar_connections ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'blocked'"), e.exec("UPDATE calendar_connections SET sync_status = 'manual_import_only' WHERE provider = 'other'")), a("last_synced_at") || e.exec("ALTER TABLE calendar_connections ADD COLUMN last_synced_at TEXT"), a("last_sync_error") || e.exec("ALTER TABLE calendar_connections ADD COLUMN last_sync_error TEXT");
  const c = e.pragma("table_info(email_connections)"), d = (l) => c.some((m) => m.name === l);
  d("auth_status") || (e.exec("ALTER TABLE email_connections ADD COLUMN auth_status TEXT NOT NULL DEFAULT 'needs_credentials'"), e.exec("UPDATE email_connections SET auth_status = 'not_configured' WHERE provider = 'manual'")), d("sync_status") || (e.exec("ALTER TABLE email_connections ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'blocked'"), e.exec("UPDATE email_connections SET sync_status = 'manual_import_only' WHERE provider = 'manual'")), d("last_synced_at") || e.exec("ALTER TABLE email_connections ADD COLUMN last_synced_at TEXT"), d("last_sync_error") || e.exec("ALTER TABLE email_connections ADD COLUMN last_sync_error TEXT"), e.pragma(`user_version = ${Cn}`);
}, ta = (e) => {
  const [t] = e.split("/");
  return t || "root";
}, na = (e, t) => t.endsWith("/index.md") || t === "index.md" ? "index" : e === "templates" ? "template" : e, oa = (e) => k.basename(e, ".md").replace(/[-_]/g, " "), sa = (e, t, n) => {
  const o = k.relative(t, n).replace(/\\/g, "/"), s = ta(o), r = na(s, o), i = oa(o);
  return e.prepare(`
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
  `).run(s, r, i, o, (/* @__PURE__ */ new Date()).toISOString()).changes;
}, Ms = (e, t, n, o) => {
  let s = 0;
  for (const r of Rs(n)) {
    const i = k.join(n, r), a = $s(i);
    if (a.isDirectory()) {
      s += Ms(e, t, i, o);
      continue;
    }
    if (a.isFile() && i.toLowerCase().endsWith(".md")) {
      const c = k.relative(t, i).replace(/\\/g, "/");
      o.add(c), s += sa(e, t, i);
    }
  }
  return s;
}, qn = () => {
  const e = Ht(), t = tt(), n = /* @__PURE__ */ new Set();
  let o = 0;
  ne(t) && (o = Ms(e, t, t, n));
  const r = e.prepare("SELECT relative_path FROM memory_documents ORDER BY relative_path ASC").all().map((c) => c.relative_path).filter((c) => !n.has(c)), i = e.prepare("DELETE FROM memory_documents WHERE relative_path = ?");
  for (const c of r)
    i.run(c);
  const a = e.prepare("SELECT COUNT(*) AS count FROM memory_documents").get();
  return {
    memoryRoot: t,
    scannedMarkdownCount: n.size,
    indexedDocumentCount: a.count,
    addedOrUpdatedCount: o,
    removedStaleIndexCount: r.length,
    staleIndexPaths: r
  };
}, ke = () => {
  qn();
}, Ht = () => {
  if (Y)
    return Y;
  const e = Ds();
  return Y = new Vi(e), Y.pragma("journal_mode = WAL"), Y.pragma("foreign_keys = ON"), ea(Y), ke(), Y;
}, u = () => Ht(), z = () => {
  Y && (Y.close(), Y = null);
}, Bt = () => {
  const e = Ht(), t = e.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all().map((o) => o.name), n = e.prepare("SELECT COUNT(*) AS count FROM memory_documents").get();
  return {
    databasePath: Ds(),
    memoryRoot: tt(),
    schemaVersion: Cn,
    indexedDocumentCount: n.count,
    tables: t,
    authorityRules: Yi
  };
}, ra = (e) => {
  ne(e) || zn(e, { recursive: !0 });
}, Se = (e, t) => {
  const n = tt(), o = k.join(n, e);
  return ra(k.dirname(o)), Ls(o, t, "utf8"), e.replace(/\\/g, "/");
}, At = (e) => e ?? "", C = (e) => e || "none", Ps = (e) => `missions/${e}.md`, xs = (e) => `projects/${e}.md`, Us = (e) => `people/${e}.md`, Gt = (e) => Se(
  Ps(e.slug),
  `# Mission: ${e.title}

## Summary

${At(e.summary)}

## Status

- state: ${e.status}
- created: ${e.createdAt}
- last_updated: ${e.updatedAt}

## Deadline

- due: ${C(e.dueAt)}

## Child Projects

- none recorded yet

## People

- none recorded yet

## Risks And Blockers

- none recorded yet

## Next Recommended Actions

- define the next concrete project or task

## Recent Updates

- ${e.createdAt}: Mission record created by Praxis.
`
), zt = (e, t) => Se(
  xs(e.slug),
  `# Project: ${e.title}

## Summary

${At(e.summary)}

## Parent Mission

- ${t ?? "none"}

## Status

- state: ${e.status}
- created: ${e.createdAt}
- last_updated: ${e.updatedAt}

## Deadline

- due: ${C(e.dueAt)}

## Tasks

- none recorded yet

## Blockers

- none recorded yet

## People

- none recorded yet

## Source Links

- none recorded yet

## Next Recommended Actions

- define the next concrete task

## Recent Updates

- ${e.createdAt}: Project record created by Praxis.
`
), Vn = (e) => Se(
  Us(e.slug),
  `# Person: ${e.name}

## Role / Context

${At(e.roleSummary)}

## Aliases

${e.aliases.length > 0 ? e.aliases.map((t) => `- ${t}`).join(`
`) : "- none"}

## Contact

- Email: ${C(e.email)}
- Phone: ${C(e.phone)}
- Billing address: ${C(e.billingAddress)}

## Notes

${At(e.notes)}

## Status

- Created: ${e.createdAt}
- Updated: ${e.updatedAt}

## Rules

- SQLite is authoritative for person state
- Use this file for stable relationship/context notes only
- Do not store private message bodies here
`
), js = (e) => {
  const t = e.filter((o) => o.status !== "completed"), n = t.length > 0 ? t.map(
    (o) => `- ${o.title}
  - status: ${o.status}
  - priority: ${o.priority}
  - due: ${C(o.dueAt)}
  - money_related: ${o.moneyRelated ? "yes" : "no"}
  - quick_action: ${o.quickAction ? "yes" : "no"}
  - estimated_minutes: ${o.estimatedMinutes ?? "none"}
  - waiting_on_person_id: ${o.waitingOnPersonId ?? "none"}
  - notes: ${C(o.notes)}`
  ).join(`
`) : "No active todos recorded yet.";
  return Se(
    "todos/active.md",
    `# Active Todos

## Purpose

This file mirrors active one-shot obligations from SQLite for human-readable review.

## Active

${n}

## Rules

- SQLite is authoritative for todo state
- This file is a generated summary view
- Promote repeated or expanding work into a project if needed
`
  );
}, Ks = (e) => {
  const t = e.filter((o) => o.status !== "completed"), n = t.length > 0 ? t.map(
    (o) => `- ${o.title}
  - due: ${o.dueAt}
  - status: ${o.status}
  - priority: ${o.priority}
  - entity: ${o.entityKind}${o.entityId ? `/${o.entityId}` : ""}`
  ).join(`
`) : "No active deadlines recorded yet.";
  return Se(
    "deadlines/active.md",
    `# Active Deadlines

## Purpose

This file mirrors active deadline records from SQLite for human-readable review.

## Active

${n}

## Rules

- SQLite is authoritative for deadline state
- This file is a generated summary view
- Do not treat this file as the only source of truth
`
  );
}, Jn = (e) => {
  const t = e.filter((o) => {
    const s = new Date(o.startsAt);
    return !Number.isNaN(s.getTime()) && s.getTime() >= Date.now() - 36e5;
  }), n = t.length > 0 ? t.map(
    (o) => `- ${o.title}
  - starts: ${o.startsAt}
  - ends: ${C(o.endsAt)}
  - all_day: ${o.allDay ? "yes" : "no"}
  - source: ${o.sourceSystem}
  - notes: ${C(o.notes)}`
  ).join(`
`) : "No upcoming appointments recorded yet.";
  return Se(
    "calendar/appointments.md",
    `# Appointments

## Purpose

This file mirrors upcoming appointment records from SQLite for human-readable review.

## Upcoming

${n}

## Rules

- SQLite is authoritative for appointment time and source metadata
- This file is a generated summary view
- Imported calendar events should store facts, not raw email or calendar body dumps
`
  );
}, ia = (e) => e === "created_todo" ? "created todo" : e === "created_project" ? "created project" : e, aa = (e, t) => {
  const n = e.length > 0 ? e.map(
    (s) => `- ${s.title}
  - suggested_kind: ${s.suggestedEntityKind}
  - reason: ${s.reason}
  - confidence: ${s.confidence.toFixed(2)}
  - due: ${C(s.dueAt)}
  - sender: ${C(s.senderName ?? s.senderEmail)}
  - matched_person: ${C(s.matchedPersonName)}
  - subject: ${s.subject}
  - routed_to: ${C(s.routedTo)}
  - status: ${ia(s.status)}`
  ).join(`
`) : "No active email follow-ups flagged yet.", o = t.length > 0 ? t.map(
    (s) => `- ${s.subject}
  - received: ${s.receivedAt}
  - sender: ${C(s.senderName ?? s.senderEmail)}
  - matched_person: ${C(s.matchedPersonName)}
  - source: ${s.sourceSystem}
  - summary: ${C(s.summary)}`
  ).join(`
`) : "No recent email summaries stored yet.";
  return Se(
    "inbox/email-follow-ups.md",
    `# Email Follow-Ups

## Purpose

This file mirrors privacy-safe email follow-up candidates and recent message summaries from SQLite.

## Pending Suggestions

${n}

## Recent Messages

${o}

## Rules

- SQLite is authoritative for connection, message, and suggestion state
- Do not store raw email bodies here
- This file is a generated summary view for the markdown brain
`
  );
}, L = () => (/* @__PURE__ */ new Date()).toISOString(), se = (e) => `${e}_${I.randomUUID()}`, Fs = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72) || "untitled", Ws = (e, t) => {
  const n = u(), o = Fs(t);
  let s = o, r = 2;
  const i = n.prepare(`SELECT 1 FROM ${e} WHERE slug = ? LIMIT 1`);
  for (; i.get(s); )
    s = `${o}-${r}`, r += 1;
  return s;
}, ca = (e) => {
  const t = u(), n = Fs(e);
  let o = n, s = 2;
  const r = t.prepare("SELECT 1 FROM people WHERE slug = ? LIMIT 1");
  for (; r.get(o); )
    o = `${n}-${s}`, s += 1;
  return o;
}, h = (e) => {
  const t = e == null ? void 0 : e.trim();
  return t && t.length > 0 ? t : null;
}, da = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), Xs = (e) => [...new Set((e ?? []).map((t) => t.trim()).filter((t) => t.length > 0))], Hs = (e) => ({
  id: e.id,
  slug: e.slug,
  title: e.title,
  summary: e.summary,
  status: e.status,
  dueAt: e.due_at,
  markdownPath: e.markdown_path,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Bs = (e) => ({
  id: e.id,
  missionId: e.mission_id,
  slug: e.slug,
  title: e.title,
  summary: e.summary,
  status: e.status,
  dueAt: e.due_at,
  markdownPath: e.markdown_path,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), la = (e) => ({
  id: e.id,
  projectId: e.project_id,
  title: e.title,
  status: e.status,
  priority: e.priority,
  dueAt: e.due_at,
  moneyRelated: e.money_related === 1,
  quickAction: e.quick_action === 1,
  estimatedMinutes: e.estimated_minutes,
  waitingOnPersonId: e.waiting_on_person_id,
  sourceKind: e.source_kind,
  sourceRef: e.source_ref,
  notes: e.notes,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), ua = (e) => ({
  id: e.id,
  entityKind: e.entity_kind,
  entityId: e.entity_id,
  title: e.title,
  dueAt: e.due_at,
  status: e.status,
  priority: e.priority,
  sourceKind: e.source_kind,
  sourceRef: e.source_ref,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), ma = (e) => ({
  id: e.id,
  sourceSystem: e.source_system,
  externalId: e.external_id,
  title: e.title,
  startsAt: e.starts_at,
  endsAt: e.ends_at,
  allDay: e.all_day === 1,
  notes: e.notes_json,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Gs = (e, t = []) => ({
  id: e.id,
  slug: e.slug,
  name: e.name,
  aliases: t,
  roleSummary: e.role_summary,
  email: e.email,
  phone: e.phone,
  billingAddress: e.billing_address,
  notes: e.notes,
  markdownPath: e.markdown_path,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), pa = (e) => ({
  id: e.id,
  personId: e.person_id,
  entityKind: e.entity_kind,
  entityId: e.entity_id,
  relationship: e.relationship,
  sourceKind: e.source_kind,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), fa = (e) => ({
  title: e.title,
  relativePath: e.relative_path,
  docKind: e.doc_kind,
  entityKind: e.entity_kind
}), ga = () => u().prepare("SELECT * FROM missions ORDER BY updated_at DESC").all().map(Hs), _a = () => u().prepare("SELECT * FROM projects ORDER BY updated_at DESC").all().map(Bs), zs = () => u().prepare("SELECT * FROM todos ORDER BY COALESCE(due_at, '9999-12-31') ASC, updated_at DESC").all().map(la), Ys = () => u().prepare("SELECT * FROM deadlines ORDER BY due_at ASC").all().map(ua), qs = () => u().prepare("SELECT * FROM appointments ORDER BY starts_at ASC").all().map(ma), Vs = () => {
  const e = u().prepare("SELECT * FROM people ORDER BY name ASC").all(), t = u().prepare("SELECT person_id, alias FROM person_aliases ORDER BY alias ASC").all(), n = /* @__PURE__ */ new Map();
  for (const o of t)
    n.set(o.person_id, [
      ...n.get(o.person_id) ?? [],
      o.alias
    ]);
  return e.map((o) => Gs(o, n.get(o.id) ?? []));
}, ha = () => u().prepare("SELECT * FROM person_work_links ORDER BY updated_at DESC").all().map(pa), ya = () => u().prepare(
  "SELECT title, relative_path, doc_kind, entity_kind FROM memory_documents ORDER BY relative_path ASC LIMIT 30"
).all().map(fa), Js = (e) => {
  const t = u().prepare("SELECT * FROM missions WHERE id = ?").get(e);
  return t ? Hs(t) : null;
}, Qn = (e) => {
  const t = u().prepare("SELECT * FROM projects WHERE id = ?").get(e);
  return t ? Bs(t) : null;
}, Ea = (e) => {
  const t = u().prepare("SELECT * FROM people WHERE id = ?").get(e);
  if (!t)
    return null;
  const n = u().prepare("SELECT alias FROM person_aliases WHERE person_id = ? ORDER BY alias ASC").all(e);
  return Gs(t, n.map((o) => o.alias));
}, Qs = (e, t) => {
  const n = u(), o = L();
  n.prepare("DELETE FROM person_aliases WHERE person_id = ?").run(e);
  const s = n.prepare(`
    INSERT INTO person_aliases (
      id,
      person_id,
      alias,
      normalized_alias,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(normalized_alias) DO UPDATE SET
      person_id = excluded.person_id,
      alias = excluded.alias,
      updated_at = excluded.updated_at
  `);
  for (const r of Xs(t))
    s.run(se("person_alias"), e, r, da(r), o, o);
}, Zs = (e) => {
  var t;
  return e ? ((t = u().prepare("SELECT title FROM missions WHERE id = ?").get(e)) == null ? void 0 : t.title) ?? null : null;
}, $ = () => {
  js(zs()), Ks(Ys()), Jn(qs()), ke();
}, It = (e, t, n, o, s) => {
  if (!e || !n)
    return;
  const r = u(), i = L();
  r.prepare(`
    INSERT INTO person_work_links (
      id,
      person_id,
      entity_kind,
      entity_id,
      relationship,
      source_kind,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(person_id, entity_kind, entity_id, relationship) DO UPDATE SET
      source_kind = excluded.source_kind,
      updated_at = excluded.updated_at
  `).run(
    se("person_link"),
    e,
    t,
    n,
    o,
    s,
    i,
    i
  );
}, er = (e, t, n = "waiting_on") => {
  if (!e || !t)
    return;
  const o = Qn(t);
  It(e, "project", t, n, "todo"), It(e, "mission", (o == null ? void 0 : o.missionId) ?? null, n, "todo");
}, nt = (e, t = "standalone", n = null) => {
  const o = u(), s = L(), r = {
    id: se("deadline"),
    entityKind: e.entityKind ?? t,
    entityId: e.entityId ?? n,
    title: e.title.trim(),
    dueAt: e.dueAt,
    status: "active",
    priority: e.priority ?? "normal",
    sourceKind: e.sourceKind ?? null,
    sourceRef: e.sourceRef ?? null,
    createdAt: s,
    updatedAt: s
  };
  return o.prepare(`
    INSERT INTO deadlines (
      id,
      entity_kind,
      entity_id,
      title,
      due_at,
      status,
      priority,
      source_kind,
      source_ref,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    r.id,
    r.entityKind,
    r.entityId,
    r.title,
    r.dueAt,
    r.status,
    r.priority,
    r.sourceKind,
    r.sourceRef,
    r.createdAt,
    r.updatedAt
  ), r;
}, _ = () => (ke(), {
  missions: ga(),
  projects: _a(),
  todos: zs(),
  deadlines: Ys(),
  appointments: qs(),
  people: Vs(),
  personWorkLinks: ha(),
  memoryDocuments: ya()
}), Ve = () => Vs(), Ta = (e) => (It(
  h(e.personId),
  e.entityKind,
  h(e.entityId),
  h(e.relationship) ?? "related",
  "manual"
), _()), ka = (e, t, n, o, s = "manual") => {
  It(
    h(e ?? void 0),
    t,
    h(n ?? void 0),
    h(o) ?? "related",
    s
  );
}, Sa = (e) => (u().prepare("DELETE FROM person_work_links WHERE id = ?").run(e.id), _()), ba = (e) => {
  const t = u(), n = L(), o = ca(e.name), s = {
    id: se("person"),
    slug: o,
    name: e.name.trim(),
    aliases: Xs(e.aliases),
    roleSummary: h(e.roleSummary),
    email: h(e.email),
    phone: h(e.phone),
    billingAddress: h(e.billingAddress),
    notes: h(e.notes),
    markdownPath: Us(o),
    createdAt: n,
    updatedAt: n
  };
  return t.transaction(() => {
    t.prepare(`
    INSERT INTO people (
      id,
      slug,
      name,
      role_summary,
      email,
      phone,
      billing_address,
      notes,
      markdown_path,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s.id,
      s.slug,
      s.name,
      s.roleSummary,
      s.email,
      s.phone,
      s.billingAddress,
      s.notes,
      s.markdownPath,
      s.createdAt,
      s.updatedAt
    ), Qs(s.id, s.aliases);
  })(), Vn(s), ke(), s;
}, Zn = (e) => {
  const t = u(), n = L(), o = {
    id: se("appointment"),
    sourceSystem: h(e.sourceSystem) ?? "manual",
    externalId: h(e.externalId),
    title: e.title.trim(),
    startsAt: e.startsAt,
    endsAt: h(e.endsAt),
    allDay: e.allDay ?? !1,
    notes: h(e.notes),
    createdAt: n,
    updatedAt: n
  };
  return t.prepare(`
    INSERT INTO appointments (
      id,
      source_system,
      external_id,
      title,
      starts_at,
      ends_at,
      all_day,
      notes_json,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    o.id,
    o.sourceSystem,
    o.externalId,
    o.title,
    o.startsAt,
    o.endsAt,
    o.allDay ? 1 : 0,
    o.notes,
    o.createdAt,
    o.updatedAt
  ), $(), o;
}, eo = (e) => {
  const t = u(), n = L(), o = Ws("missions", e.title), s = {
    id: se("mission"),
    slug: o,
    title: e.title.trim(),
    summary: h(e.summary),
    status: "active",
    dueAt: h(e.dueAt),
    markdownPath: Ps(o),
    createdAt: n,
    updatedAt: n
  };
  return t.transaction(() => {
    t.prepare(`
      INSERT INTO missions (
        id,
        slug,
        title,
        summary,
        status,
        due_at,
        markdown_path,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s.id,
      s.slug,
      s.title,
      s.summary,
      s.status,
      s.dueAt,
      s.markdownPath,
      s.createdAt,
      s.updatedAt
    ), s.dueAt && nt(
      {
        title: `Mission due: ${s.title}`,
        dueAt: s.dueAt,
        priority: "high"
      },
      "mission",
      s.id
    );
  })(), Gt(s), $(), s;
}, to = (e) => {
  var i;
  const t = u(), n = L(), o = Ws("projects", e.title), s = {
    id: se("project"),
    missionId: h(e.missionId),
    slug: o,
    title: e.title.trim(),
    summary: h(e.summary),
    status: "active",
    dueAt: h(e.dueAt),
    markdownPath: xs(o),
    createdAt: n,
    updatedAt: n
  };
  t.transaction(() => {
    t.prepare(`
      INSERT INTO projects (
        id,
        mission_id,
        slug,
        title,
        summary,
        status,
        due_at,
        markdown_path,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      s.id,
      s.missionId,
      s.slug,
      s.title,
      s.summary,
      s.status,
      s.dueAt,
      s.markdownPath,
      s.createdAt,
      s.updatedAt
    ), s.dueAt && nt(
      {
        title: `Project due: ${s.title}`,
        dueAt: s.dueAt,
        priority: "high"
      },
      "project",
      s.id
    );
  })();
  const r = s.missionId ? ((i = t.prepare("SELECT title FROM missions WHERE id = ?").get(s.missionId)) == null ? void 0 : i.title) ?? null : null;
  return zt(s, r), $(), s;
}, ot = (e) => {
  const t = u(), n = L(), o = {
    id: se("todo"),
    projectId: h(e.projectId),
    title: e.title.trim(),
    status: "active",
    priority: e.priority ?? "normal",
    dueAt: h(e.dueAt),
    moneyRelated: e.moneyRelated ?? !1,
    quickAction: e.quickAction ?? !1,
    estimatedMinutes: e.estimatedMinutes ?? null,
    waitingOnPersonId: h(e.waitingOnPersonId),
    sourceKind: h(e.sourceKind),
    sourceRef: h(e.sourceRef),
    notes: h(e.notes),
    createdAt: n,
    updatedAt: n
  };
  return t.transaction(() => {
    t.prepare(`
      INSERT INTO todos (
        id,
        project_id,
        title,
        status,
        priority,
        due_at,
        money_related,
        quick_action,
        estimated_minutes,
        waiting_on_person_id,
        source_kind,
        source_ref,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      o.id,
      o.projectId,
      o.title,
      o.status,
      o.priority,
      o.dueAt,
      o.moneyRelated ? 1 : 0,
      o.quickAction ? 1 : 0,
      o.estimatedMinutes,
      o.waitingOnPersonId,
      o.sourceKind,
      o.sourceRef,
      o.notes,
      o.createdAt,
      o.updatedAt
    ), o.dueAt && nt(
      {
        title: `Todo due: ${o.title}`,
        dueAt: o.dueAt,
        priority: o.priority
      },
      "todo",
      o.id
    ), er(o.waitingOnPersonId, o.projectId);
  })(), $(), o;
}, wa = (e) => {
  const t = nt(e, e.entityKind ?? "standalone", e.entityId ?? null);
  return $(), t;
}, an = (e, t, n) => {
  u().prepare(
    "UPDATE deadlines SET status = ?, updated_at = ? WHERE entity_kind = ? AND entity_id = ?"
  ).run(n, L(), e, t);
}, cn = (e, t, n, o, s) => {
  const r = u();
  if (!o) {
    r.prepare("DELETE FROM deadlines WHERE entity_kind = ? AND entity_id = ?").run(
      e,
      t
    );
    return;
  }
  const i = r.prepare("SELECT id FROM deadlines WHERE entity_kind = ? AND entity_id = ? LIMIT 1").get(e, t), a = L();
  if (i) {
    r.prepare(
      "UPDATE deadlines SET title = ?, due_at = ?, priority = ?, updated_at = ? WHERE id = ?"
    ).run(n, o, s, a, i.id);
    return;
  }
  nt(
    {
      title: n,
      dueAt: o,
      priority: s
    },
    e,
    t
  );
}, ee = (e) => {
  const t = u(), n = L();
  if (e.entityKind === "mission") {
    const o = h(e.dueAt);
    t.transaction(() => {
      t.prepare(
        "UPDATE missions SET title = ?, summary = ?, due_at = ?, updated_at = ? WHERE id = ?"
      ).run(e.title.trim(), h(e.summary), o, n, e.id), cn("mission", e.id, `Mission due: ${e.title.trim()}`, o, "high");
    })();
    const s = Js(e.id);
    return s && Gt(s), $(), _();
  }
  if (e.entityKind === "project") {
    const o = h(e.dueAt), s = h(e.missionId);
    t.transaction(() => {
      t.prepare(
        "UPDATE projects SET mission_id = ?, title = ?, summary = ?, due_at = ?, updated_at = ? WHERE id = ?"
      ).run(s, e.title.trim(), h(e.summary), o, n, e.id), cn("project", e.id, `Project due: ${e.title.trim()}`, o, "high");
    })();
    const r = Qn(e.id);
    return r && zt(r, Zs(r.missionId)), $(), _();
  }
  if (e.entityKind === "todo") {
    const o = h(e.dueAt);
    return t.transaction(() => {
      t.prepare(`
        UPDATE todos
        SET project_id = ?,
            title = ?,
            priority = ?,
            due_at = ?,
            money_related = ?,
            quick_action = ?,
            estimated_minutes = ?,
            waiting_on_person_id = ?,
            notes = ?,
            updated_at = ?
        WHERE id = ?
      `).run(
        h(e.projectId),
        e.title.trim(),
        e.priority ?? "normal",
        o,
        e.moneyRelated ? 1 : 0,
        e.quickAction ? 1 : 0,
        e.estimatedMinutes ?? null,
        h(e.waitingOnPersonId),
        h(e.notes),
        n,
        e.id
      ), cn("todo", e.id, `Todo due: ${e.title.trim()}`, o, e.priority ?? "normal"), er(h(e.waitingOnPersonId), h(e.projectId));
    })(), $(), _();
  }
  if (e.entityKind === "deadline")
    return t.prepare(
      "UPDATE deadlines SET title = ?, due_at = ?, priority = ?, updated_at = ? WHERE id = ?"
    ).run(e.title.trim(), e.dueAt, e.priority ?? "normal", n, e.id), $(), _();
  if (e.entityKind === "person") {
    t.transaction(() => {
      t.prepare(`
      UPDATE people
      SET name = ?,
          role_summary = ?,
          email = ?,
          phone = ?,
          billing_address = ?,
          notes = ?,
          updated_at = ?
      WHERE id = ?
      `).run(
        e.name.trim(),
        h(e.roleSummary),
        h(e.email),
        h(e.phone),
        h(e.billingAddress),
        h(e.notes),
        n,
        e.id
      ), Qs(e.id, e.aliases ?? []);
    })();
    const o = Ea(e.id);
    return o && Vn(o), ke(), _();
  }
  return t.prepare(`
    UPDATE appointments
    SET title = ?,
        starts_at = ?,
        ends_at = ?,
        all_day = ?,
        notes_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    e.title.trim(),
    e.startsAt,
    h(e.endsAt),
    e.allDay ? 1 : 0,
    h(e.notes),
    n,
    e.id
  ), $(), _();
}, Aa = (e) => {
  const t = u();
  return t.transaction(() => {
    if (e.entityKind === "mission") {
      t.prepare("DELETE FROM deadlines WHERE entity_kind = 'mission' AND entity_id = ?").run(e.id), t.prepare("UPDATE projects SET mission_id = NULL, updated_at = ? WHERE mission_id = ?").run(
        L(),
        e.id
      ), t.prepare("DELETE FROM missions WHERE id = ?").run(e.id);
      return;
    }
    if (e.entityKind === "project") {
      t.prepare("DELETE FROM deadlines WHERE entity_kind = 'project' AND entity_id = ?").run(e.id), t.prepare("UPDATE todos SET project_id = NULL, updated_at = ? WHERE project_id = ?").run(
        L(),
        e.id
      ), t.prepare("DELETE FROM projects WHERE id = ?").run(e.id);
      return;
    }
    if (e.entityKind === "todo") {
      t.prepare("DELETE FROM deadlines WHERE entity_kind = 'todo' AND entity_id = ?").run(e.id), t.prepare("DELETE FROM todos WHERE id = ?").run(e.id);
      return;
    }
    if (e.entityKind === "deadline") {
      t.prepare("DELETE FROM deadlines WHERE id = ?").run(e.id);
      return;
    }
    if (e.entityKind === "person") {
      t.prepare("UPDATE todos SET waiting_on_person_id = NULL, updated_at = ? WHERE waiting_on_person_id = ?").run(
        L(),
        e.id
      ), t.prepare("DELETE FROM person_work_links WHERE person_id = ?").run(e.id), t.prepare("DELETE FROM people WHERE id = ?").run(e.id);
      return;
    }
    t.prepare("DELETE FROM appointments WHERE id = ?").run(e.id);
  })(), $(), _();
}, Ne = (e) => {
  const t = u(), n = L();
  if (e.entityKind === "mission") {
    t.transaction(() => {
      t.prepare("UPDATE missions SET status = ?, updated_at = ? WHERE id = ?").run(
        e.status,
        n,
        e.id
      ), an("mission", e.id, e.status);
    })();
    const o = Js(e.id);
    return o && Gt(o), $(), _();
  }
  if (e.entityKind === "project") {
    t.transaction(() => {
      t.prepare("UPDATE projects SET status = ?, updated_at = ? WHERE id = ?").run(
        e.status,
        n,
        e.id
      ), an("project", e.id, e.status);
    })();
    const o = Qn(e.id);
    return o && zt(o, Zs(o.missionId)), $(), _();
  }
  return e.entityKind === "todo" ? (t.transaction(() => {
    t.prepare("UPDATE todos SET status = ?, updated_at = ? WHERE id = ?").run(
      e.status,
      n,
      e.id
    ), an("todo", e.id, e.status);
  })(), $(), _()) : (t.prepare("UPDATE deadlines SET status = ?, updated_at = ? WHERE id = ?").run(
    e.status,
    n,
    e.id
  ), $(), _());
}, Ia = () => {
  const e = _(), t = new Map(e.missions.map((n) => [n.id, n.title]));
  for (const n of e.missions)
    Gt(n);
  for (const n of e.projects)
    zt(n, n.missionId ? t.get(n.missionId) ?? null : null);
  for (const n of e.people)
    Vn(n);
  return js(e.todos), Ks(e.deadlines), Jn(e.appointments), {
    missionDocumentsWritten: e.missions.length,
    projectDocumentsWritten: e.projects.length,
    personDocumentsWritten: e.people.length,
    summaryDocumentsWritten: 3
  };
}, va = () => {
  const e = Ia(), t = qn(), n = Bt();
  return {
    ok: !0,
    repairedAt: (/* @__PURE__ */ new Date()).toISOString(),
    databasePath: n.databasePath,
    index: t,
    mirrors: e
  };
}, No = () => {
  const e = qn(), t = Bt();
  return {
    ok: !0,
    reindexedAt: (/* @__PURE__ */ new Date()).toISOString(),
    databasePath: t.databasePath,
    index: e
  };
}, Oa = /* @__PURE__ */ new Set(["standalone", "mission", "project", "todo"]), Na = /* @__PURE__ */ new Set(["mission", "project", "todo", "person", "appointment"]), Ca = /* @__PURE__ */ new Set(["mission", "project"]), ct = /* @__PURE__ */ new Set(["active", "blocked", "completed", "paused"]), Co = /* @__PURE__ */ new Set(["low", "normal", "high", "critical"]), Ra = /* @__PURE__ */ new Set(["google", "outlook", "other"]), $a = /* @__PURE__ */ new Set(["gmail", "outlook", "manual"]), La = /* @__PURE__ */ new Set(["slack", "whatsapp", "sms", "manual", "unknown"]), Ro = /* @__PURE__ */ new Set(["not_configured", "needs_credentials", "ready", "error"]), $o = /* @__PURE__ */ new Set(["manual_import_only", "blocked", "ready_to_sync", "syncing", "error"]), Da = /^[^\s@]+@[^\s@]+\.[^\s@]+$/, S = (e, t, n, o, s, r) => ({
  severity: e,
  code: t,
  message: n,
  ...o ? { table: o } : {},
  ...s ? { rowId: s } : {},
  ...r ? { details: r } : {}
}), Pe = (e, t) => !!u().prepare(`SELECT 1 AS found FROM ${e} WHERE id = ? LIMIT 1`).get(t), Be = (e, t) => e === "mission" ? Pe("missions", t) : e === "project" ? Pe("projects", t) : e === "todo" ? Pe("todos", t) : e === "person" ? Pe("people", t) : e === "appointment" ? Pe("appointments", t) : !1, $n = (e) => typeof e == "string" && e.trim().length > 0 && !Number.isNaN(Date.parse(e)), Ma = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), dn = (e, t, n, o, s) => {
  const r = u().prepare(`SELECT ${n} AS row_id, ${o} AS value FROM ${t}`).all();
  for (const i of r)
    if (i.value !== null)
      try {
        const a = JSON.parse(i.value);
        s === "array" && !Array.isArray(a) && e.push(
          S(
            "warning",
            "unexpected_json_shape",
            `${t}.${o} should contain a JSON array.`,
            t,
            String(i.row_id),
            { column: o }
          )
        ), s === "object" && (a === null || Array.isArray(a) || typeof a != "object") && e.push(
          S(
            "warning",
            "unexpected_json_shape",
            `${t}.${o} should contain a JSON object.`,
            t,
            String(i.row_id),
            { column: o }
          )
        );
      } catch {
        e.push(
          S(
            "error",
            "invalid_json",
            `${t}.${o} is not valid JSON.`,
            t,
            String(i.row_id),
            { column: o }
          )
        );
      }
}, Pa = (e, t, n, o, s, r = !0) => {
  const i = u().prepare(`SELECT ${n} AS row_id, ${o} AS value FROM ${t}`).all();
  for (const a of i) {
    if (a.value === null || a.value.trim().length === 0) {
      r || e.push(
        S(
          s,
          "missing_date",
          `${t}.${o} is required but empty.`,
          t,
          String(a.row_id),
          { column: o }
        )
      );
      continue;
    }
    $n(a.value) || e.push(
      S(
        s,
        "invalid_date",
        `${t}.${o} is not a parseable date.`,
        t,
        String(a.row_id),
        { column: o, value: a.value }
      )
    );
  }
}, M = (e, t, n, o, s, r) => {
  const i = u().prepare(`SELECT ${n} AS row_id, ${o} AS value FROM ${t}`).all();
  for (const a of i) {
    const c = typeof a.value == "string" ? a.value : a.value === null ? null : String(a.value);
    (c === null || !s.has(c)) && e.push(
      S(
        r,
        "invalid_allowed_value",
        `${t}.${o} contains an unrecognized value.`,
        t,
        String(a.row_id),
        { column: o, value: c }
      )
    );
  }
}, we = (e, t, n, o) => {
  const s = u().prepare(`SELECT ${n} AS row_id, ${o} AS value FROM ${t}`).all();
  for (const r of s)
    r.value !== 0 && r.value !== 1 && e.push(
      S(
        "warning",
        "invalid_boolean",
        `${t}.${o} should be stored as 0 or 1.`,
        t,
        String(r.row_id),
        { column: o, value: r.value }
      )
    );
}, dt = (e, t) => {
  const n = u().prepare(
    `SELECT source_system,
              external_id,
              COUNT(*) AS count,
              GROUP_CONCAT(id, ', ') AS ids
       FROM ${t}
       WHERE external_id IS NOT NULL
         AND TRIM(external_id) <> ''
       GROUP BY source_system, external_id
       HAVING COUNT(*) > 1`
  ).all();
  for (const o of n)
    e.push(
      S(
        "error",
        "duplicate_external_identity",
        `${t} has duplicate imported records for the same provider identity.`,
        t,
        o.ids,
        {
          sourceSystem: o.source_system,
          externalId: o.external_id,
          count: o.count
        }
      )
    );
}, Lo = (e, t, n, o) => {
  var r;
  const s = u().prepare(`SELECT ${n} AS row_id, ${o} AS value FROM ${t}`).all();
  for (const i of s) {
    const a = (r = i.value) == null ? void 0 : r.trim();
    a && !Da.test(a) && e.push(
      S(
        "warning",
        "invalid_email_address",
        `${t}.${o} does not look like a valid email address.`,
        t,
        String(i.row_id),
        { column: o }
      )
    );
  }
}, xa = (e) => {
  const t = u().prepare("PRAGMA foreign_key_check").all();
  for (const n of t)
    e.push(
      S(
        "error",
        "foreign_key_violation",
        `${n.table} has a broken foreign key reference to ${n.parent}.`,
        n.table,
        n.rowid === null ? void 0 : String(n.rowid),
        { parent: n.parent, foreignKeyId: n.fkid }
      )
    );
}, Ua = (e) => {
  const t = [
    { table: "missions", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "missions", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "missions", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "projects", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "projects", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "projects", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "todos", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "todos", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "todos", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "people", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "people", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "person_aliases", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "person_aliases", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "person_work_links", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "person_work_links", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "appointments", rowIdColumn: "id", valueColumn: "starts_at", severity: "error", allowNull: !1 },
    { table: "appointments", rowIdColumn: "id", valueColumn: "ends_at", severity: "warning" },
    { table: "appointments", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "appointments", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "finance_items", rowIdColumn: "id", valueColumn: "due_at", severity: "warning" },
    { table: "finance_items", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "finance_items", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "deadlines", rowIdColumn: "id", valueColumn: "due_at", severity: "error", allowNull: !1 },
    { table: "deadlines", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "deadlines", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "inbox_facts", rowIdColumn: "id", valueColumn: "captured_at", severity: "error", allowNull: !1 },
    { table: "daily_briefs", rowIdColumn: "id", valueColumn: "day", severity: "warning", allowNull: !1 },
    { table: "daily_briefs", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "daily_briefs", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "suggestion_contexts", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "suggestion_contexts", rowIdColumn: "id", valueColumn: "resolved_at", severity: "warning" },
    { table: "calendar_connections", rowIdColumn: "id", valueColumn: "last_synced_at", severity: "warning" },
    { table: "calendar_connections", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "calendar_connections", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "email_connections", rowIdColumn: "id", valueColumn: "last_synced_at", severity: "warning" },
    { table: "email_connections", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "email_connections", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "email_messages", rowIdColumn: "id", valueColumn: "received_at", severity: "error", allowNull: !1 },
    { table: "email_messages", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "email_messages", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "chat_imports", rowIdColumn: "id", valueColumn: "imported_at", severity: "error", allowNull: !1 },
    { table: "chat_imports", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "chat_imports", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "chat_import_participants", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "chat_import_participants", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "chat_import_messages", rowIdColumn: "id", valueColumn: "sent_at", severity: "error", allowNull: !1 },
    { table: "chat_import_messages", rowIdColumn: "id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "chat_import_messages", rowIdColumn: "id", valueColumn: "updated_at", severity: "error", allowNull: !1 },
    { table: "memory_documents", rowIdColumn: "id", valueColumn: "last_indexed_at", severity: "warning", allowNull: !1 },
    { table: "secure_secrets", rowIdColumn: "owner_id", valueColumn: "created_at", severity: "error", allowNull: !1 },
    { table: "secure_secrets", rowIdColumn: "owner_id", valueColumn: "updated_at", severity: "error", allowNull: !1 }
  ];
  for (const n of t)
    Pa(
      e,
      n.table,
      n.rowIdColumn,
      n.valueColumn,
      n.severity,
      n.allowNull ?? !0
    );
  M(e, "missions", "id", "status", ct, "error"), M(e, "projects", "id", "status", ct, "error"), M(e, "todos", "id", "status", ct, "error"), M(e, "todos", "id", "priority", Co, "error"), M(e, "deadlines", "id", "status", ct, "error"), M(e, "deadlines", "id", "priority", Co, "error"), M(e, "calendar_connections", "id", "provider", Ra, "error"), M(e, "calendar_connections", "id", "auth_status", Ro, "error"), M(e, "calendar_connections", "id", "sync_status", $o, "error"), M(e, "email_connections", "id", "provider", $a, "error"), M(e, "email_connections", "id", "auth_status", Ro, "error"), M(e, "email_connections", "id", "sync_status", $o, "error"), M(e, "chat_imports", "id", "source_system", La, "error"), we(e, "todos", "id", "money_related"), we(e, "todos", "id", "quick_action"), we(e, "appointments", "id", "all_day"), we(e, "calendar_connections", "id", "enabled"), we(e, "email_connections", "id", "enabled"), we(e, "daily_briefs", "id", "has_more"), dt(e, "appointments"), dt(e, "email_messages"), dt(e, "finance_items"), dt(e, "chat_imports"), Lo(e, "people", "id", "email"), Lo(e, "email_messages", "id", "sender_email");
}, ja = (e) => {
  const t = u().prepare("SELECT id, starts_at, ends_at FROM appointments WHERE ends_at IS NOT NULL").all();
  for (const n of t) {
    if (!$n(n.starts_at) || !$n(n.ends_at))
      continue;
    const o = n.ends_at;
    o && Date.parse(o) < Date.parse(n.starts_at) && e.push(
      S(
        "error",
        "appointment_ends_before_start",
        "Appointment end time is earlier than its start time.",
        "appointments",
        n.id,
        { startsAt: n.starts_at, endsAt: o }
      )
    );
  }
}, Ka = (e) => {
  const t = u().prepare("SELECT id, alias, normalized_alias FROM person_aliases").all();
  for (const n of t) {
    const o = Ma(n.alias);
    o !== n.normalized_alias && e.push(
      S(
        "warning",
        "stale_normalized_alias",
        "Person alias normalized value does not match the current normalization rule.",
        "person_aliases",
        n.id,
        { expected: o, actual: n.normalized_alias }
      )
    );
  }
}, Fa = (e) => {
  const t = u().prepare("SELECT id, entity_kind, entity_id FROM deadlines").all();
  for (const o of t) {
    if (!o.entity_kind || !Oa.has(o.entity_kind)) {
      e.push(
        S(
          "warning",
          "unknown_deadline_entity_kind",
          "Deadline has an unrecognized entity kind.",
          "deadlines",
          o.id,
          { entityKind: o.entity_kind }
        )
      );
      continue;
    }
    if (o.entity_kind === "standalone") {
      o.entity_id && e.push(
        S(
          "warning",
          "standalone_deadline_has_entity_id",
          "Standalone deadline carries an entity_id even though it is not linked.",
          "deadlines",
          o.id,
          { entityId: o.entity_id }
        )
      );
      continue;
    }
    (!o.entity_id || !Be(o.entity_kind, o.entity_id)) && e.push(
      S(
        "error",
        "broken_deadline_link",
        "Linked deadline points at missing work.",
        "deadlines",
        o.id,
        { entityKind: o.entity_kind, entityId: o.entity_id }
      )
    );
  }
  const n = [
    {
      table: "missions",
      entityKind: "mission",
      sql: `SELECT id FROM missions
            WHERE due_at IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM deadlines
                WHERE deadlines.entity_kind = 'mission'
                  AND deadlines.entity_id = missions.id
              )`
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
              )`
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
              )`
    }
  ];
  for (const o of n) {
    const s = u().prepare(o.sql).all();
    for (const r of s)
      e.push(
        S(
          "warning",
          "missing_linked_deadline",
          `${o.table} record has due_at but no mirrored deadline row.`,
          o.table,
          r.id,
          { entityKind: o.entityKind }
        )
      );
  }
}, Wa = (e) => {
  const t = u().prepare("SELECT id, entity_kind, entity_id FROM person_work_links").all();
  for (const n of t) {
    if (!n.entity_kind || !Ca.has(n.entity_kind)) {
      e.push(
        S(
          "warning",
          "unknown_person_work_link_entity_kind",
          "Person work link has an unrecognized entity kind.",
          "person_work_links",
          n.id,
          { entityKind: n.entity_kind }
        )
      );
      continue;
    }
    (!n.entity_id || !Be(n.entity_kind, n.entity_id)) && e.push(
      S(
        "error",
        "broken_person_work_link",
        "Person work link points at missing work.",
        "person_work_links",
        n.id,
        { entityKind: n.entity_kind, entityId: n.entity_id }
      )
    );
  }
}, Xa = (e) => {
  const t = u().prepare("SELECT id, entity_kind, entity_id FROM inbox_facts WHERE entity_kind IS NOT NULL").all();
  for (const s of t) {
    if (!s.entity_kind || !Na.has(s.entity_kind)) {
      e.push(
        S(
          "warning",
          "unknown_inbox_fact_entity_kind",
          "Inbox fact has an unrecognized entity kind.",
          "inbox_facts",
          s.id,
          { entityKind: s.entity_kind }
        )
      );
      continue;
    }
    (!s.entity_id || !Be(s.entity_kind, s.entity_id)) && e.push(
      S(
        "error",
        "broken_inbox_fact_link",
        "Inbox fact points at a missing entity.",
        "inbox_facts",
        s.id,
        { entityKind: s.entity_kind, entityId: s.entity_id }
      )
    );
  }
  const n = u().prepare(
    `SELECT id, source_ref, routed_to
       FROM inbox_facts
       WHERE fact_type = 'email_follow_up'`
  ).all();
  for (const s of n) {
    if ((s.source_ref ? !!u().prepare("SELECT 1 AS found FROM email_messages WHERE id = ? LIMIT 1").get(s.source_ref) : !1) || e.push(
      S(
        "warning",
        "email_follow_up_missing_source_message",
        "Email follow-up suggestion has no matching source email message.",
        "inbox_facts",
        s.id,
        { sourceRef: s.source_ref }
      )
    ), !s.routed_to || s.routed_to === "dismissed" || s.routed_to === "archived")
      continue;
    const i = s.routed_to.match(/^(todo|project):(.+)$/);
    if (!i) {
      e.push(
        S(
          "warning",
          "unknown_email_follow_up_route",
          "Email follow-up suggestion has an unrecognized routed_to value.",
          "inbox_facts",
          s.id,
          { routedTo: s.routed_to }
        )
      );
      continue;
    }
    const [, a, c] = i;
    Be(a, c) || e.push(
      S(
        "error",
        "broken_email_follow_up_route",
        "Email follow-up suggestion is routed to missing work.",
        "inbox_facts",
        s.id,
        { routedTo: s.routed_to }
      )
    );
  }
  const o = u().prepare(
    `SELECT id, source_ref, routed_to
       FROM inbox_facts
       WHERE fact_type = 'chat_follow_up'`
  ).all();
  for (const s of o) {
    if ((s.source_ref ? !!u().prepare("SELECT 1 AS found FROM chat_import_messages WHERE id = ? LIMIT 1").get(s.source_ref) : !1) || e.push(
      S(
        "warning",
        "chat_follow_up_missing_source_message",
        "Chat follow-up suggestion has no matching source chat message.",
        "inbox_facts",
        s.id,
        { sourceRef: s.source_ref }
      )
    ), !s.routed_to || s.routed_to === "dismissed" || s.routed_to === "archived")
      continue;
    const i = s.routed_to.match(/^(todo|project):(.+)$/);
    if (!i) {
      e.push(
        S(
          "warning",
          "unknown_chat_follow_up_route",
          "Chat follow-up suggestion has an unrecognized routed_to value.",
          "inbox_facts",
          s.id,
          { routedTo: s.routed_to }
        )
      );
      continue;
    }
    const [, a, c] = i;
    Be(a, c) || e.push(
      S(
        "error",
        "broken_chat_follow_up_route",
        "Chat follow-up suggestion is routed to missing work.",
        "inbox_facts",
        s.id,
        { routedTo: s.routed_to }
      )
    );
  }
}, Ha = (e) => {
  const t = tt(), n = u().prepare("SELECT id, relative_path FROM memory_documents").all();
  for (const o of n)
    ne(k.join(t, o.relative_path)) || e.push(
      S(
        "warning",
        "missing_memory_document",
        "Memory document index points at a markdown file that no longer exists.",
        "memory_documents",
        String(o.id),
        { relativePath: o.relative_path }
      )
    );
}, Ba = () => {
  const e = [];
  xa(e), dn(e, "settings", "key", "value_json"), dn(e, "inbox_facts", "id", "value_json"), dn(e, "suggestion_contexts", "id", "actions_json", "array"), Ua(e), ja(e), Ka(e), Fa(e), Wa(e), Xa(e), Ha(e);
  const t = {
    error: e.filter((o) => o.severity === "error").length,
    warning: e.filter((o) => o.severity === "warning").length
  }, n = Bt();
  return {
    ok: t.error === 0,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
    databasePath: n.databasePath,
    issueCounts: t,
    issues: e
  };
}, Ga = /* @__PURE__ */ new Set(["desktop", "slack", "voice", "companion"]), za = /* @__PURE__ */ new Set(["built-in", "workspace"]), ln = (e) => e.replace(/^["']|["']$/g, "").trim(), Ya = (e) => {
  const t = e.replace(/^\uFEFF/, "");
  if (!t.startsWith(`---
`) && !t.startsWith(`---\r
`))
    return { frontMatter: {}, content: t };
  const n = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!n)
    return { frontMatter: {}, content: t };
  const o = {}, s = n[1].split(/\r?\n/);
  let r = null;
  for (const i of s) {
    const a = i.match(/^\s*-\s+(.+)$/);
    if (a && r) {
      o[r] = [
        ...o[r] ?? [],
        ln(a[1])
      ];
      continue;
    }
    const c = i.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!c) {
      r = null;
      continue;
    }
    const d = c[1], l = ln(c[2]);
    if (r = null, d === "surfaces" || d === "data_sources") {
      o[d] = l ? l.split(",").map((m) => ln(m)).filter(Boolean) : [], r = d;
      continue;
    }
    (d === "name" || d === "description" || d === "trust") && (o[d] = l);
  }
  return {
    frontMatter: o,
    content: t.slice(n[0].length)
  };
}, qa = (e) => {
  var n, o;
  const t = (o = (n = e.match(/^#\s+(.+)$/m)) == null ? void 0 : n[1]) == null ? void 0 : o.trim();
  return t && t.length > 0 ? t : null;
}, Va = (e) => k.basename(k.dirname(e)), Ja = (e, t) => e.name.localeCompare(t.name), Qa = (e) => k.join(process.env.APP_ROOT, "skills"), Za = (e, t, n) => {
  var p, y;
  const o = Hi(t, "utf8"), { frontMatter: s, content: r } = Ya(o), i = Va(t), a = [], c = (s.surfaces ?? []).map((T) => T.toLowerCase()).filter((T) => {
    const O = Ga.has(T);
    return O || a.push(`Ignoring unsupported surface '${T}'.`), O;
  });
  c.length === 0 && a.push("No valid surfaces declared.");
  const d = s.trust && za.has(s.trust) ? s.trust : "workspace";
  s.trust && d !== s.trust && a.push(`Unsupported trust '${s.trust}' was treated as workspace.`);
  const l = ((p = s.name) == null ? void 0 : p.trim()) || i, m = qa(r) ?? l, f = ((y = s.description) == null ? void 0 : y.trim()) || "";
  return f || a.push("No description declared."), {
    id: l.toLowerCase(),
    name: l,
    description: f,
    surfaces: c,
    dataSources: s.data_sources ?? [],
    trust: d,
    relativePath: k.relative(e, t).replace(/\\/g, "/"),
    title: m,
    content: r.trim(),
    loadedAt: n,
    warnings: a
  };
}, Ln = (e) => {
  const t = Qa(), n = (/* @__PURE__ */ new Date()).toISOString(), o = [];
  if (!ne(t))
    return {
      ok: !1,
      skillsRoot: t,
      indexedAt: n,
      skillCount: 0,
      skills: [],
      warnings: [`Skills root does not exist: ${t}`]
    };
  const r = Rs(t).map((a) => k.join(t, a, "SKILL.md")).filter((a) => ne(a) && $s(a).isFile()).map((a) => Za(t, a, n)).sort(Ja), i = /* @__PURE__ */ new Set();
  for (const a of r) {
    i.has(a.id) && o.push(`Duplicate skill name found: ${a.name}`), i.add(a.id);
    for (const c of a.warnings)
      o.push(`${a.name}: ${c}`);
  }
  return {
    ok: o.length === 0,
    skillsRoot: t,
    indexedAt: n,
    skillCount: r.length,
    skills: r,
    warnings: o
  };
}, Do = (e) => (e ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), Mo = (e) => {
  const t = e == null ? void 0 : e.trim().toLowerCase();
  return t && t.length > 0 ? t : null;
}, ec = (e) => [e.name, ...e.aliases], tr = (e, t, n) => {
  const o = Mo(t);
  if (o) {
    const i = n.filter(
      (a) => Mo(a.email) === o
    );
    if (i.length === 1)
      return i[0];
  }
  const s = Do(e);
  if (!s)
    return null;
  const r = n.filter(
    (i) => ec(i).some(
      (a) => Do(a) === s
    )
  );
  return r.length === 1 ? r[0] : null;
}, nr = (e) => e.replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/gi, "").replace(/\s+/g, " ").trim(), un = (e) => (e == null ? void 0 : e.toLowerCase().replace(/[^a-z0-9@.\s-]/g, " ").replace(/\s+/g, " ").trim()) ?? "", tc = (e, t) => I.createHash("sha1").update(
  [
    e.sourceSystem,
    un(e.threadRef),
    un(e.senderEmail ?? e.senderName),
    un(t.title),
    t.suggestedEntityKind
  ].join("|")
).digest("hex"), nc = (e, t = /* @__PURE__ */ new Date()) => {
  const n = new Date(e.receivedAt);
  if (Number.isNaN(n.getTime()) || Math.floor((t.getTime() - n.getTime()) / (24 * 60 * 60 * 1e3)) <= 45)
    return !1;
  if (!e.dueAt)
    return !0;
  const s = new Date(e.dueAt);
  return Number.isNaN(s.getTime()) ? !1 : s.getTime() < t.getTime();
}, oc = [
  /\bplease\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bneed you to\b/i,
  /\byou need to\b/i,
  /\baction required\b/i,
  /\bwaiting on\b/i,
  /\blet me know\b/i,
  /\bwhen you can\b/i,
  /\bwhen you get a chance\b/i,
  /\byour turn\b/i
], sc = [
  /\bwaiting\s+(?:on|for)\b/i,
  /\bstill waiting\s+(?:on|for)\b/i,
  /\bblocked\s+(?:on|by)\b/i,
  /\bneed\s+.+?\s+from\s+.+?\b/i
], rc = [
  /\bfollow up\b/i,
  /\bnext action\b/i,
  /\bnext step\b/i,
  /\breply\b/i,
  /\brespond\b/i,
  /\bsend\b/i,
  /\bcall\b/i,
  /\bconfirm\b/i,
  /\breview\b/i,
  /\bapprove\b/i,
  /\bbook\b/i,
  /\bschedule\b/i,
  /\bsubmit\b/i,
  /\bfinish\b/i,
  /\bdeliver\b/i,
  /\bship\b/i,
  /\bpay\b/i,
  /\binvoice\b/i,
  /\bwaiting\s+(?:on|for)\b/i,
  /\bblocked\s+(?:on|by)\b/i
], ic = [
  /\bproject\b/i,
  /\bengagement\b/i,
  /\bdeliverable\b/i,
  /\bscope\b/i,
  /\boutline\b/i,
  /\breport\b/i,
  /\bproposal\b/i,
  /\bcontract\b/i,
  /\bsourcebook\b/i,
  /\badventure\b/i,
  /\bmission\b/i,
  /\bkickoff\b/i,
  /\bmilestone\b/i,
  /\bphase\b/i,
  /\bdraft\b/i,
  /\brevision\b/i,
  /\bimplementation\b/i,
  /\bintegration\b/i,
  /\brollout\b/i,
  /\blaunch plan\b/i
], ac = [
  /\btoday\b/i,
  /\btonight\b/i,
  /\btomorrow\b/i,
  /\bthis week\b/i,
  /\bnext week\b/i,
  /\bdue\b/i,
  /\bdeadline\b/i,
  /\bby\b/i,
  /\bbefore\b/i,
  /\beod\b/i,
  /\bend of day\b/i,
  /\bnoon\b/i,
  /\bclose of business\b/i,
  /\bcob\b/i,
  /\bend of week\b/i,
  /\bfriday\b/i,
  /\bmonday\b/i,
  /\btuesday\b/i,
  /\bwednesday\b/i,
  /\bthursday\b/i,
  /\bsaturday\b/i,
  /\bsunday\b/i,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i,
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/i
], cc = [
  /\burgent\b/i,
  /\basap\b/i,
  /\bsoon\b/i,
  /\bimportant\b/i,
  /\bpriority\b/i,
  /\bneeded\b/i,
  /\bblocking\b/i,
  /\bblocked\b/i,
  /\bcritical\b/i
], dc = [
  /\bnewsletter\b/i,
  /\bdigest\b/i,
  /\bsummary available\b/i,
  /\bnotification\b/i,
  /\bauto(?:mated)? message\b/i,
  /\bdo not reply\b/i,
  /\bnoreply\b/i,
  /\bno-reply\b/i,
  /\bpassword\b/i,
  /\bsecurity alert\b/i,
  /\bverification code\b/i,
  /\breset code\b/i
], lc = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
], Po = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
], lt = (e) => String(e).padStart(2, "0"), uc = (e) => `${e.getFullYear()}-${lt(e.getMonth() + 1)}-${lt(e.getDate())}T${lt(e.getHours())}:${lt(e.getMinutes())}`, de = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), ut = (e, t) => {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}, mc = (e) => {
  var r;
  const t = e.match(
    /\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\b/i
  );
  if (!t)
    return null;
  let n = Number(t[1] ?? t[4]);
  const o = t[2] || t[5] ? Number(t[2] ?? t[5]) : 0, s = (r = t[3] ?? t[6]) == null ? void 0 : r.toLowerCase();
  return s === "pm" && n < 12 && (n += 12), s === "am" && n === 12 && (n = 0), !s && n >= 1 && n <= 7 && (n += 12), n > 23 || o > 59 ? null : { hour: n, minute: o };
}, or = (e, t = /* @__PURE__ */ new Date()) => {
  const n = e.toLowerCase();
  let o = de(t);
  if (/\btoday\b/.test(n))
    o = de(t);
  else if (/\btonight\b/.test(n))
    o = de(t), o.setHours(20, 0, 0, 0);
  else if (/\btomorrow\b/.test(n))
    o = ut(de(t), 1);
  else if (/\bend of week\b|\beow\b|\bthis week\b/.test(n)) {
    const i = (5 - t.getDay() + 7) % 7 || 7;
    o = ut(de(t), i);
  } else if (/\bnext week\b/.test(n))
    o = ut(de(t), 7);
  else {
    const r = n.match(
      new RegExp(
        `\\b(${Po.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{2,4}))?\\b`
      )
    );
    if (r) {
      const i = Po.indexOf(r[1]), a = Number(r[2]), c = r[3] ? Number(
        r[3].length === 2 ? `20${r[3]}` : r[3]
      ) : t.getFullYear();
      o = new Date(c, i, a);
    } else {
      const i = lc.findIndex(
        (a) => new RegExp(`\\b${a}\\b`).test(n)
      );
      if (i >= 0) {
        const a = t.getDay(), c = (i - a + 7) % 7 || 7;
        o = ut(de(t), c);
      } else {
        const a = n.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
        if (!a)
          return null;
        const c = Number(a[1]) - 1, d = Number(a[2]), l = a[3] ? Number(a[3].length === 2 ? `20${a[3]}` : a[3]) : t.getFullYear();
        o = new Date(l, c, d);
      }
    }
  }
  const s = mc(e);
  return s ? o.setHours(s.hour, s.minute, 0, 0) : /\bnoon\b/i.test(e) ? o.setHours(12, 0, 0, 0) : (/\beod\b|\bend of day\b|\bclose of business\b/i.test(e), o.setHours(17, 0, 0, 0)), uc(o);
}, pc = (e, t) => {
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? t : n;
}, le = (e, t) => t.reduce((n, o) => o.test(e) ? n + 1 : n, 0), St = (e, t) => e.length <= t ? e : `${e.slice(0, t - 1).trimEnd()}...`, fc = (e) => e.split(/(?:[.!?]\s+|\n+)/).map((t) => t.trim().replace(/[.!?]+$/g, "")).find(Boolean) ?? "", mt = (e) => {
  const t = e.replace(/^(?:to|that you|you|we)\s+/i, "").replace(/\s+/g, " ").trim();
  return t ? St(t.charAt(0).toUpperCase() + t.slice(1), 96) : null;
}, gc = (e, t) => {
  const n = [e, t ?? ""].map(fc).filter(Boolean);
  for (const o of n) {
    const s = o.match(
      /\b(?:please|can you|could you|would you|need you to|you need to)\s+([^.!?\n]+)$/i
    );
    if (s != null && s[1])
      return mt(s[1]);
    const r = o.match(
      /\b(?:next action|next step)\s*(?:is|:|-)?\s*([^.!?\n]+)$/i
    );
    if (r != null && r[1])
      return mt(r[1]);
    const i = o.match(
      /\b(?:i'?m|we'?re|we are|still|currently)?\s*waiting\s+(?:on|for)\s+([^.!?\n]+)$/i
    );
    if (i != null && i[1])
      return mt(`Waiting on ${i[1]}`);
    const a = o.match(/\bblocked\s+(?:on|by)\s+([^.!?\n]+)$/i);
    if (a != null && a[1])
      return mt(`Blocked on ${a[1]}`);
  }
  return null;
}, _c = (e, t, n) => {
  const o = e.replace(/^(please|can you|could you|would you|need you to|you need to)\s+/i, "").replace(/\b(action required|urgent)\b[:\s-]*/gi, "").replace(/\s+/g, " ").trim();
  if (n === "project")
    return St(o, 96);
  const s = gc(e, t);
  return s || (/^(reply|respond|send|call|confirm|review|approve|book|schedule|submit|finish|deliver|ship|pay)\b/i.test(
    o
  ) ? St(o.charAt(0).toUpperCase() + o.slice(1), 96) : St(`Follow up: ${o}`, 96));
}, hc = (e, t = /* @__PURE__ */ new Date()) => {
  var vo;
  const n = nr(e.subject), o = [n, e.summary ?? ""].join(`
`).trim(), s = o.toLowerCase(), r = ((vo = e.senderEmail) == null ? void 0 : vo.toLowerCase()) ?? "", i = le(o, oc), a = le(o, sc), c = le(o, rc), d = le(o, ic), l = le(o, ac), m = le(o, cc), f = le(o, dc) + (/\bnoreply\b|\bno-reply\b/.test(r) ? 1 : 0), p = i > 0 || c > 0 || a > 0, y = l > 0, T = m > 0, O = d > 0;
  if (!p && !y && !T && !O || f > 0 && i === 0 && m === 0 && d === 0 || s.startsWith("thanks") || s.startsWith("thank you") || s.startsWith("fyi"))
    return null;
  const E = d >= 2 || d >= 1 && (l > 0 || i > 0) ? "project" : "todo", v = or(o, pc(e.receivedAt, t));
  if (Math.min(
    0.36 + i * 0.16 + a * 0.12 + c * 0.08 + d * 0.11 + l * 0.1 + m * 0.08 - f * 0.12,
    0.94
  ) < 0.62)
    return null;
  const Fi = [
    `Email from ${e.senderName ?? e.senderEmail ?? "a sender"} looks like a ${E === "project" ? "project-sized thread" : "follow-up task"}.`,
    i > 0 ? "It includes a direct request aimed at you." : null,
    a > 0 ? "It includes waiting-on or blocked language." : null,
    i === 0 && c > 0 ? "It includes action-oriented language." : null,
    y && v ? `It also mentions timing around ${v}.` : y ? "It mentions timing or a deadline." : null,
    T ? "The language suggests this should not wait." : null,
    e.matchedPersonName ? `Praxis matched the sender to saved person ${e.matchedPersonName}.` : null
  ].filter((Wi) => !!Wi);
  return {
    title: _c(n, e.summary, E),
    suggestedEntityKind: E,
    reason: Fi.join(" "),
    dueAt: v,
    senderName: e.senderName,
    senderEmail: e.senderEmail,
    subject: n,
    summary: e.summary,
    receivedAt: e.receivedAt
  };
}, Je = () => (/* @__PURE__ */ new Date()).toISOString(), A = (e) => {
  const t = e == null ? void 0 : e.trim();
  return t && t.length > 0 ? t : null;
}, sr = (e) => e === "manual" ? "not_configured" : "needs_credentials", rr = (e) => e === "manual" ? "manual_import_only" : "blocked", yc = (e) => ({
  id: e.id,
  provider: e.provider,
  label: e.label,
  accountRef: e.account_ref,
  enabled: e.enabled === 1,
  authStatus: e.auth_status ?? sr(e.provider),
  syncStatus: e.sync_status ?? rr(e.provider),
  lastSyncedAt: e.last_synced_at,
  lastSyncError: e.last_sync_error,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), no = (e, t, n) => {
  const o = tr(e, t, n);
  return {
    matchedPersonId: (o == null ? void 0 : o.id) ?? null,
    matchedPersonName: (o == null ? void 0 : o.name) ?? null
  };
}, Ec = (e, t) => ({
  id: e.id,
  connectionId: e.connection_id,
  sourceSystem: e.source_system,
  externalId: e.external_id,
  threadRef: e.thread_ref,
  subject: e.subject,
  senderName: e.sender_name,
  senderEmail: e.sender_email,
  ...no(e.sender_name, e.sender_email, t),
  receivedAt: e.received_at,
  summary: e.summary,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Tc = (e, t) => e === "dismissed" ? "dismissed" : e === "archived" ? "archived" : e != null && e.startsWith("todo:") ? "created_todo" : e != null && e.startsWith("project:") ? "created_project" : t.status ?? "pending", ir = (e, t) => {
  try {
    const n = JSON.parse(e.value_json);
    return {
      id: e.id,
      messageId: n.messageId,
      sourceSystem: e.source_system,
      title: n.title,
      suggestedEntityKind: n.suggestedEntityKind,
      reason: n.reason,
      confidence: e.confidence,
      dueAt: n.dueAt,
      status: Tc(e.routed_to, n),
      routedTo: e.routed_to,
      senderName: n.senderName,
      senderEmail: n.senderEmail,
      ...no(n.senderName, n.senderEmail, t),
      subject: n.subject,
      summary: n.summary,
      receivedAt: n.receivedAt,
      createdAt: e.captured_at,
      updatedAt: e.captured_at
    };
  } catch {
    return null;
  }
}, kc = () => u().prepare("SELECT * FROM email_connections ORDER BY created_at DESC").all().map(yc), ar = () => {
  const e = Ve();
  return u().prepare("SELECT * FROM email_messages ORDER BY received_at DESC, updated_at DESC LIMIT 24").all().map((t) => Ec(t, e));
}, cr = () => {
  const e = Ve();
  return u().prepare(
    `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
           FROM inbox_facts
           WHERE fact_type = 'email_follow_up'
           ORDER BY captured_at DESC
           LIMIT 24`
  ).all().map((t) => ir(t, e)).filter((t) => !!t);
}, Sc = () => u().prepare(
  `SELECT entity_id, source_ref, captured_at
         FROM inbox_facts
         WHERE fact_type = 'person_contact_suggestion_dismissed'
         ORDER BY captured_at DESC`
).all().filter((e) => e.entity_id && e.source_ref).map((e) => {
  const t = e.source_ref, n = t.match(/^(email|phone|billingAddress):(.*)$/), o = n == null ? void 0 : n[1], s = (n == null ? void 0 : n[2]) ?? t;
  return {
    personId: e.entity_id,
    field: o ?? "email",
    inferredValue: s,
    dismissedAt: e.captured_at
  };
}), Yt = () => cr().filter((e) => e.status === "pending"), dr = () => {
  aa(Yt(), ar()), ke();
}, lr = () => ({
  connections: kc(),
  messages: ar(),
  suggestions: cr(),
  contactSuggestionDismissals: Sc()
}), bc = (e, t) => {
  const n = A(t.externalId);
  return n || I.createHash("sha1").update(
    [
      e,
      A(t.senderEmail) ?? "",
      A(t.subject) ?? "",
      A(t.receivedAt) ?? ""
    ].join("|")
  ).digest("hex");
}, oo = (e) => `${e}_${I.randomUUID()}`, wc = (e) => {
  try {
    return JSON.parse(e.value_json);
  } catch {
    return null;
  }
}, Ac = (e, t) => u().prepare("SELECT * FROM email_messages WHERE source_system = ? AND external_id = ?").get(e, t), ur = (e) => u().prepare(
  `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE id = ?
         AND fact_type = 'email_follow_up'`
).get(e), Ic = (e, t) => {
  const n = u(), o = n.prepare(
    `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE fact_type = 'email_follow_up'
         AND source_ref = ?`
  ).get(e.id);
  if (o != null && o.routed_to)
    return 0;
  if (!t)
    return o && n.prepare("DELETE FROM inbox_facts WHERE id = ?").run(o.id), 0;
  if (nc(t))
    return o && n.prepare("DELETE FROM inbox_facts WHERE id = ? AND routed_to IS NULL").run(o.id), 0;
  const s = tc(e, t);
  if (n.prepare(
    `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
         FROM inbox_facts
         WHERE fact_type = 'email_follow_up'
         ORDER BY captured_at DESC
         LIMIT 200`
  ).all().find((c) => {
    if (c.id === (o == null ? void 0 : o.id))
      return !1;
    const d = wc(c);
    return (d == null ? void 0 : d.duplicateKey) === s;
  }))
    return o && !o.routed_to && n.prepare("DELETE FROM inbox_facts WHERE id = ?").run(o.id), 0;
  const i = {
    messageId: e.id,
    duplicateKey: s,
    title: t.title,
    suggestedEntityKind: t.suggestedEntityKind,
    reason: t.reason,
    dueAt: t.dueAt,
    senderName: t.senderName,
    senderEmail: t.senderEmail,
    subject: t.subject,
    summary: t.summary,
    receivedAt: t.receivedAt,
    status: "pending"
  }, a = Je();
  return o ? (n.prepare(
    `UPDATE inbox_facts
       SET value_json = ?,
           confidence = ?,
           captured_at = ?
       WHERE id = ?`
  ).run(JSON.stringify(i), t.suggestedEntityKind === "project" ? 0.82 : 0.78, a, o.id), 1) : (n.prepare(
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
    oo("email_fact"),
    e.sourceSystem,
    e.id,
    JSON.stringify(i),
    t.suggestedEntityKind === "project" ? 0.82 : 0.78,
    a
  ), 1);
}, vc = (e, t) => {
  if (!e)
    return;
  const n = u().prepare("SELECT * FROM email_connections WHERE id = ?").get(e);
  n && u().prepare(
    `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_synced_at = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(
    t.auth_status ?? n.auth_status ?? sr(n.provider),
    t.sync_status ?? n.sync_status ?? rr(n.provider),
    t.last_synced_at ?? n.last_synced_at,
    n.last_sync_error,
    Je(),
    e
  );
}, so = (e) => {
  const t = Ve();
  let n = 0, o = 0, s = 0, r = 0;
  for (const i of e.messages) {
    const a = nr(i.subject), c = A(i.receivedAt);
    if (!a || !c) {
      s += 1;
      continue;
    }
    const d = bc(e.sourceSystem, i), l = Ac(e.sourceSystem, d), m = Je(), f = l ? {
      id: l.id,
      connectionId: e.connectionId ?? l.connection_id,
      sourceSystem: e.sourceSystem,
      externalId: d,
      threadRef: A(i.threadRef) ?? l.thread_ref,
      subject: a,
      senderName: A(i.senderName) ?? l.sender_name,
      senderEmail: A(i.senderEmail) ?? l.sender_email,
      receivedAt: c,
      summary: A(i.summary) ?? A(i.snippet) ?? l.summary,
      createdAt: l.created_at,
      updatedAt: m
    } : {
      id: oo("email_message"),
      connectionId: A(e.connectionId),
      sourceSystem: e.sourceSystem,
      externalId: d,
      threadRef: A(i.threadRef),
      subject: a,
      senderName: A(i.senderName),
      senderEmail: A(i.senderEmail),
      receivedAt: c,
      summary: A(i.summary) ?? A(i.snippet),
      createdAt: m,
      updatedAt: m
    }, p = {
      ...f,
      ...no(f.senderName, f.senderEmail, t)
    };
    l ? (u().prepare(
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
    ).run(
      p.connectionId,
      p.threadRef,
      p.subject,
      p.senderName,
      p.senderEmail,
      p.receivedAt,
      p.summary,
      p.updatedAt,
      p.id
    ), o += 1) : (u().prepare(
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
    ).run(
      p.id,
      p.connectionId,
      p.sourceSystem,
      p.externalId,
      p.threadRef,
      p.subject,
      p.senderName,
      p.senderEmail,
      p.receivedAt,
      p.summary,
      p.createdAt,
      p.updatedAt
    ), n += 1);
    const y = hc(p);
    r += Ic(p, y);
  }
  return vc(A(e.connectionId), {
    auth_status: "ready",
    sync_status: "ready_to_sync",
    last_synced_at: Je()
  }), dr(), {
    ok: !0,
    message: `Email import finished: ${n} imported, ${o} updated, ${r} follow-up candidate${r === 1 ? "" : "s"} flagged, ${s} skipped.`,
    imported: n,
    updated: o,
    suggestionsCreated: r,
    skipped: s
  };
}, vt = (e, t, n) => {
  const o = ur(e);
  if (!o)
    return !1;
  try {
    const s = JSON.parse(o.value_json);
    return u().prepare(
      `UPDATE inbox_facts
         SET value_json = ?,
             routed_to = ?
         WHERE id = ?`
    ).run(
      JSON.stringify({
        ...s,
        status: n
      }),
      t,
      e
    ), dr(), !0;
  } catch {
    return !1;
  }
}, xo = (e) => {
  const t = ur(e.suggestionId);
  if (!t)
    return {
      ok: !1,
      message: "That email suggestion no longer exists."
    };
  const n = ir(t, Ve());
  if (!n)
    return {
      ok: !1,
      message: "That email suggestion could not be read."
    };
  if (n.status !== "pending")
    return {
      ok: !1,
      message: "That email suggestion was already handled."
    };
  const o = tr(
    n.senderName,
    n.senderEmail,
    Ve()
  ), s = [
    `Seeded from email: ${n.subject}`,
    n.senderName || n.senderEmail ? `Sender: ${n.senderName ?? n.senderEmail}` : null,
    o ? `Matched person: ${o.name}` : null,
    `Received: ${n.receivedAt}`,
    n.summary ? `Summary: ${n.summary}` : null,
    `Reason: ${n.reason}`
  ].filter((i) => !!i);
  if (e.mode === "project") {
    const i = to({
      title: n.title,
      summary: s.join(`
`),
      dueAt: n.dueAt ?? void 0
    });
    return ka(
      (o == null ? void 0 : o.id) ?? null,
      "project",
      i.id,
      "email_sender",
      "email"
    ), vt(e.suggestionId, `project:${i.id}`, "created_project"), {
      ok: !0,
      message: `Created project ${i.title} from the email follow-up.`,
      entityKind: "project",
      entityId: i.id
    };
  }
  const r = ot({
    title: n.title,
    dueAt: n.dueAt ?? void 0,
    priority: n.dueAt ? "high" : "normal",
    quickAction: n.suggestedEntityKind !== "project",
    notes: s.join(`
`)
  });
  return vt(e.suggestionId, `todo:${r.id}`, "created_todo"), {
    ok: !0,
    message: `Created todo ${r.title} from the email follow-up.`,
    entityKind: "todo",
    entityId: r.id
  };
}, Oc = (e) => {
  const t = vt(e.suggestionId, "dismissed", "dismissed");
  return {
    ok: t,
    message: t ? "Dismissed that email follow-up." : "That email follow-up could not be dismissed."
  };
}, Uo = (e) => {
  const t = vt(e.suggestionId, "archived", "archived");
  return {
    ok: t,
    message: t ? "Archived that email follow-up." : "That email follow-up could not be archived."
  };
}, Nc = (e) => {
  const t = A(e.personId), n = A(e.inferredValue) ?? null, o = e.field, s = o === "email" ? (n == null ? void 0 : n.toLowerCase()) ?? null : n;
  if (!t || !s)
    return {
      ok: !1,
      message: "Person, suggestion field, and inferred value are required to dismiss this suggestion."
    };
  const r = Je(), i = `${o}:${s}`, a = o === "email" ? s : null, c = u().prepare(
    `SELECT id
       FROM inbox_facts
       WHERE fact_type = 'person_contact_suggestion_dismissed'
         AND entity_kind = 'person'
         AND entity_id = ?
         AND (source_ref = ? OR source_ref = ?)
       LIMIT 1`
  ).get(t, i, a), d = JSON.stringify({
    personId: t,
    field: o,
    inferredValue: s,
    dismissedAt: r
  });
  return c ? u().prepare(
    `UPDATE inbox_facts
         SET value_json = ?,
             captured_at = ?,
             routed_to = 'dismissed'
         WHERE id = ?`
  ).run(d, r, c.id) : u().prepare(
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
  ).run(oo("email_fact"), i, t, d, r), {
    ok: !0,
    message: "Ignored that suggested contact detail."
  };
}, Cc = (e) => {
  const t = A(e.personId), n = A(e.inferredValue) ?? null, o = e.field, s = o === "email" ? (n == null ? void 0 : n.toLowerCase()) ?? null : n;
  if (!t || !s)
    return {
      ok: !1,
      message: "Person, suggestion field, and inferred value are required to restore this suggestion."
    };
  const r = `${o}:${s}`, i = o === "email" ? s : null, a = u().prepare(
    `DELETE FROM inbox_facts
       WHERE fact_type = 'person_contact_suggestion_dismissed'
         AND entity_kind = 'person'
         AND entity_id = ?
         AND (source_ref = ? OR source_ref = ?)`
  ).run(t, r, i);
  return {
    ok: a.changes > 0,
    message: a.changes > 0 ? "Restored that suggested contact detail." : "That suggested contact detail was not dismissed."
  };
}, Rc = 30, $c = 5, Lc = 24 * 60, Dn = {
  enabled: !0,
  intervalMinutes: Rc
}, mr = (e = {}, t = Dn) => {
  const n = typeof e.intervalMinutes == "number" && Number.isFinite(e.intervalMinutes) ? e.intervalMinutes : t.intervalMinutes, o = Math.round(n), s = Math.min(
    Lc,
    Math.max($c, o)
  );
  return {
    enabled: typeof e.enabled == "boolean" ? e.enabled : t.enabled,
    intervalMinutes: s
  };
}, pr = "electron_safe_storage", Dc = () => (/* @__PURE__ */ new Date()).toISOString(), st = () => {
  const e = Ye.isEncryptionAvailable();
  return {
    available: e,
    provider: pr,
    reason: e ? "OS-backed encryption is available for local secrets." : "OS-backed encryption is unavailable in this desktop session."
  };
}, V = (e) => {
  if (!Ye.isEncryptionAvailable())
    throw new Error("OS-backed secret encryption is unavailable.");
  const t = Dc(), n = Ye.encryptString(e.value).toString("base64");
  return u().prepare(
    `INSERT INTO secure_secrets (
        owner_kind,
        owner_id,
        secret_kind,
        encrypted_value_base64,
        encryption_provider,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_kind, owner_id, secret_kind) DO UPDATE SET
        encrypted_value_base64 = excluded.encrypted_value_base64,
        encryption_provider = excluded.encryption_provider,
        updated_at = excluded.updated_at`
  ).run(
    e.ownerKind,
    e.ownerId,
    e.secretKind,
    n,
    pr,
    t,
    t
  ), {
    ownerKind: e.ownerKind,
    ownerId: e.ownerId,
    secretKind: e.secretKind,
    createdAt: t,
    updatedAt: t
  };
}, $e = (e, t, n) => {
  if (!Ye.isEncryptionAvailable())
    return null;
  const o = u().prepare(
    `SELECT *
       FROM secure_secrets
       WHERE owner_kind = ? AND owner_id = ? AND secret_kind = ?`
  ).get(e, t, n);
  return o ? Ye.decryptString(Buffer.from(o.encrypted_value_base64, "base64")) : null;
}, fr = (e, t) => {
  u().prepare("DELETE FROM secure_secrets WHERE owner_kind = ? AND owner_id = ?").run(e, t);
}, gr = (e, t, n) => !!u().prepare(
  `SELECT 1
       FROM secure_secrets
       WHERE owner_kind = ? AND owner_id = ? AND secret_kind = ?
       LIMIT 1`
).get(e, t, n), _r = (e, t, n) => {
  u().prepare(
    `DELETE FROM secure_secrets
       WHERE owner_kind = ? AND owner_id = ? AND secret_kind = ?`
  ).run(e, t, n);
}, re = () => (/* @__PURE__ */ new Date()).toISOString(), hr = "slack", yr = "calendar_auto_sync", Er = "google_oauth", Ot = "google_calendar", Tr = "outlook_oauth", Nt = "outlook_shared", qt = "http://127.0.0.1:47841/oauth/google/callback", mn = () => ({
  operatorChannelId: null,
  proactiveMirroringEnabled: !1
}), rt = () => {
  const e = u().prepare("SELECT value_json FROM settings WHERE key = ?").get(yr);
  if (!e)
    return Dn;
  try {
    return mr(JSON.parse(e.value_json));
  } catch {
    return Dn;
  }
}, pn = () => ({
  clientId: null,
  clientSecretConfigured: !1,
  redirectUri: null,
  effectiveRedirectUri: qt
}), fn = () => ({
  clientId: null,
  clientSecretConfigured: !1
}), oe = (e) => {
  const t = e == null ? void 0 : e.trim();
  return t && t.length > 0 ? t : null;
}, kr = (e) => e === "other" ? "not_configured" : "needs_credentials", Sr = (e) => e === "other" ? "manual_import_only" : "blocked", Mc = (e) => ({
  id: e.id,
  provider: e.provider,
  label: e.label,
  accountRef: e.account_ref,
  enabled: e.enabled === 1,
  authStatus: e.auth_status ?? kr(e.provider),
  syncStatus: e.sync_status ?? Sr(e.provider),
  lastSyncedAt: e.last_synced_at,
  lastSyncError: e.last_sync_error,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), br = (e) => e === "manual" ? "not_configured" : "needs_credentials", wr = (e) => e === "manual" ? "manual_import_only" : "blocked", Pc = (e) => ({
  id: e.id,
  provider: e.provider,
  label: e.label,
  accountRef: e.account_ref,
  enabled: e.enabled === 1,
  authStatus: e.auth_status ?? br(e.provider),
  syncStatus: e.sync_status ?? wr(e.provider),
  lastSyncedAt: e.last_synced_at,
  lastSyncError: e.last_sync_error,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Vt = () => {
  const e = u().prepare("SELECT value_json FROM settings WHERE key = ?").get(hr);
  if (!e)
    return mn();
  try {
    return {
      ...mn(),
      ...JSON.parse(e.value_json)
    };
  } catch {
    return mn();
  }
}, ro = () => {
  const e = u().prepare("SELECT value_json FROM settings WHERE key = ?").get(Er), t = (() => {
    if (!e)
      return pn();
    try {
      return {
        ...pn(),
        ...JSON.parse(e.value_json)
      };
    } catch {
      return pn();
    }
  })(), n = t.redirectUri ?? null;
  return {
    clientId: t.clientId ?? null,
    clientSecretConfigured: gr(
      "integration_config",
      Ot,
      "oauth_client_secret"
    ),
    redirectUri: n,
    effectiveRedirectUri: n ?? qt
  };
}, j = () => ({
  calendarConnections: u().prepare("SELECT * FROM calendar_connections ORDER BY created_at DESC").all().map(Mc),
  emailConnections: u().prepare("SELECT * FROM email_connections ORDER BY created_at DESC").all().map(Pc),
  calendarAutoSync: rt(),
  secretStorage: st(),
  googleOAuth: ro(),
  outlookOAuth: io(),
  slack: Vt()
}), io = () => {
  const e = u().prepare("SELECT value_json FROM settings WHERE key = ?").get(Tr);
  return {
    clientId: (() => {
      if (!e)
        return fn();
      try {
        return {
          ...fn(),
          ...JSON.parse(e.value_json)
        };
      } catch {
        return fn();
      }
    })().clientId ?? null,
    clientSecretConfigured: gr(
      "integration_config",
      Nt,
      "oauth_client_secret"
    )
  };
}, xc = (e) => {
  const t = re(), n = {
    id: `calendar_${I.randomUUID()}`,
    provider: e.provider,
    label: e.label.trim(),
    accountRef: oe(e.accountRef),
    enabled: e.enabled ?? !0,
    authStatus: e.authStatus ?? kr(e.provider),
    syncStatus: e.syncStatus ?? Sr(e.provider),
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: t,
    updatedAt: t
  };
  return u().prepare(
    `INSERT INTO calendar_connections (
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
  ).run(
    n.id,
    n.provider,
    n.label,
    n.accountRef,
    n.enabled ? 1 : 0,
    n.authStatus,
    n.syncStatus,
    n.lastSyncedAt,
    n.lastSyncError,
    n.createdAt,
    n.updatedAt
  ), n;
}, Uc = (e) => (fr("calendar_connection", e.id), u().prepare("DELETE FROM calendar_connections WHERE id = ?").run(e.id), j()), jc = (e) => {
  const t = u().prepare("SELECT * FROM calendar_connections WHERE id = ?").get(e.id);
  return t && u().prepare(
    `UPDATE calendar_connections
       SET label = ?,
           account_ref = ?,
           enabled = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(
    e.label === void 0 ? t.label : e.label.trim(),
    e.accountRef === void 0 ? t.account_ref : oe(e.accountRef),
    e.enabled === void 0 ? t.enabled : e.enabled ? 1 : 0,
    re(),
    e.id
  ), j();
}, Kc = (e) => {
  const t = re(), n = {
    id: `email_${I.randomUUID()}`,
    provider: e.provider,
    label: e.label.trim(),
    accountRef: oe(e.accountRef),
    enabled: e.enabled ?? !0,
    authStatus: e.authStatus ?? br(e.provider),
    syncStatus: e.syncStatus ?? wr(e.provider),
    lastSyncedAt: null,
    lastSyncError: null,
    createdAt: t,
    updatedAt: t
  };
  return u().prepare(
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
  ).run(
    n.id,
    n.provider,
    n.label,
    n.accountRef,
    n.enabled ? 1 : 0,
    n.authStatus,
    n.syncStatus,
    n.lastSyncedAt,
    n.lastSyncError,
    n.createdAt,
    n.updatedAt
  ), n;
}, Fc = (e) => (fr("email_connection", e.id), u().prepare("DELETE FROM email_connections WHERE id = ?").run(e.id), j()), jo = (e) => {
  const t = u().prepare("SELECT * FROM email_connections WHERE id = ?").get(e.id);
  return t && u().prepare(
    `UPDATE email_connections
       SET label = ?,
           account_ref = ?,
           enabled = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(
    e.label === void 0 ? t.label : e.label.trim(),
    e.accountRef === void 0 ? t.account_ref : oe(e.accountRef),
    e.enabled === void 0 ? t.enabled : e.enabled ? 1 : 0,
    re(),
    e.id
  ), j();
}, Wc = (e) => {
  const t = Vt(), n = {
    operatorChannelId: e.operatorChannelId === void 0 ? t.operatorChannelId : oe(e.operatorChannelId),
    proactiveMirroringEnabled: e.proactiveMirroringEnabled ?? t.proactiveMirroringEnabled
  }, o = re();
  return u().prepare(
    `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(hr, JSON.stringify(n), o), j();
}, Xc = (e) => {
  const t = mr(e, rt()), n = re();
  return u().prepare(
    `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(yr, JSON.stringify(t), n), j();
}, Hc = (e) => {
  var r;
  const t = ro(), n = {
    ...t,
    clientId: e.clientId === void 0 ? t.clientId : oe(e.clientId),
    redirectUri: e.redirectUri === void 0 ? t.redirectUri : oe(e.redirectUri),
    clientSecretConfigured: t.clientSecretConfigured,
    effectiveRedirectUri: t.effectiveRedirectUri
  };
  n.effectiveRedirectUri = n.redirectUri ?? qt;
  const o = re();
  u().prepare(
    `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(
    Er,
    JSON.stringify({
      clientId: n.clientId,
      redirectUri: n.redirectUri
    }),
    o
  );
  const s = (r = e.clientSecret) == null ? void 0 : r.trim();
  return s ? V({
    ownerKind: "integration_config",
    ownerId: Ot,
    secretKind: "oauth_client_secret",
    value: s
  }) : e.clearClientSecret && _r("integration_config", Ot, "oauth_client_secret"), j();
}, Bc = (e) => {
  var r;
  const t = io(), n = {
    ...t,
    clientId: e.clientId === void 0 ? t.clientId : oe(e.clientId),
    clientSecretConfigured: t.clientSecretConfigured
  }, o = re();
  u().prepare(
    `INSERT INTO settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(
    Tr,
    JSON.stringify({
      clientId: n.clientId
    }),
    o
  );
  const s = (r = e.clientSecret) == null ? void 0 : r.trim();
  return s ? V({
    ownerKind: "integration_config",
    ownerId: Nt,
    secretKind: "oauth_client_secret",
    value: s
  }) : e.clearClientSecret && _r("integration_config", Nt, "oauth_client_secret"), j();
}, be = () => {
  var t, n, o;
  const e = ro();
  return {
    clientId: e.clientId ?? ((t = process.env.PRAXIS_GOOGLE_CLIENT_ID) == null ? void 0 : t.trim()) ?? "",
    clientSecret: ((n = process.env.PRAXIS_GOOGLE_CLIENT_SECRET) == null ? void 0 : n.trim()) ?? $e("integration_config", Ot, "oauth_client_secret") ?? "",
    redirectUri: e.redirectUri ?? ((o = process.env.PRAXIS_GOOGLE_REDIRECT_URI) == null ? void 0 : o.trim()) ?? qt
  };
}, ie = () => {
  var t, n;
  return {
    clientId: io().clientId ?? ((t = process.env.PRAXIS_OUTLOOK_CLIENT_ID) == null ? void 0 : t.trim()) ?? "",
    clientSecret: ((n = process.env.PRAXIS_OUTLOOK_CLIENT_SECRET) == null ? void 0 : n.trim()) ?? $e("integration_config", Nt, "oauth_client_secret") ?? ""
  };
}, Ar = 24 * 60 * 60 * 1e3, Gc = {
  critical: 0,
  high: 10,
  normal: 20,
  low: 30
}, zc = (e) => {
  const t = e.getFullYear(), n = String(e.getMonth() + 1).padStart(2, "0"), o = String(e.getDate()).padStart(2, "0");
  return `${t}-${n}-${o}`;
}, Ko = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), Jt = (e, t) => {
  if (!e)
    return null;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor((Ko(n).getTime() - Ko(t).getTime()) / Ar);
}, Qt = (e, t) => {
  const n = Jt(e, t);
  return n === null ? "No deadline recorded" : n < 0 ? `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"} overdue` : n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : `Due in ${n} days`;
}, Zt = (e, t, n) => {
  const o = Jt(e, n), s = Gc[t];
  return o === null ? 90 + s : o < 0 ? s : o === 0 ? 5 + s : o === 1 ? 15 + s : o <= 7 ? 30 + o + s : 70 + Math.min(o, 30) + s;
}, Yc = (e, t) => {
  const n = new Date(e.startsAt), o = Jt(e.startsAt, t);
  return Number.isNaN(n.getTime()) || o === null ? 100 : o === 0 && e.allDay ? -100 : o === 0 ? -80 + Math.max(0, n.getTime() - t.getTime()) / Ar : o === 1 ? 12 : 85;
}, Fo = (e) => [...e].sort((t, n) => t.rank - n.rank || (t.title ?? "").localeCompare(n.title ?? "")), qc = (e, t) => ({
  id: e.id,
  entityKind: "appointment",
  title: e.title,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  allDay: e.allDay,
  sourceSystem: e.sourceSystem,
  rank: Yc(e, t)
}), Vc = (e, t) => ({
  id: e.id,
  entityKind: "mission",
  title: e.title,
  status: e.status,
  priority: "normal",
  dueAt: e.dueAt,
  reason: Qt(e.dueAt, t),
  rank: Zt(e.dueAt, "normal", t) + 20
}), Jc = (e, t) => ({
  id: e.id,
  entityKind: "project",
  title: e.title,
  status: e.status,
  priority: "normal",
  dueAt: e.dueAt,
  reason: Qt(e.dueAt, t),
  rank: Zt(e.dueAt, "normal", t) + 10,
  missionId: e.missionId
}), Qc = (e, t, n) => ({
  id: e.id,
  entityKind: "todo",
  title: e.title,
  status: e.status,
  priority: e.priority,
  dueAt: e.dueAt,
  reason: e.quickAction ? `Quick action${e.estimatedMinutes ? `, about ${e.estimatedMinutes} minutes` : ""}` : Qt(e.dueAt, t),
  rank: Zt(e.dueAt, e.priority, t) + (e.moneyRelated ? -4 : 0) + (e.quickAction ? -6 : 0) + Math.min(e.estimatedMinutes ?? 60, 60) / 60,
  projectId: e.projectId,
  waitingOnPersonName: e.waitingOnPersonId ? n.get(e.waitingOnPersonId) ?? null : null,
  moneyRelated: e.moneyRelated,
  quickAction: e.quickAction
}), Zc = (e, t) => ({
  id: e.id,
  entityKind: "deadline",
  title: e.title,
  status: e.status,
  priority: e.priority,
  dueAt: e.dueAt,
  reason: Qt(e.dueAt, t),
  rank: Zt(e.dueAt, e.priority, t) - 2
}), Wo = (e) => ({
  id: e.id,
  entityKind: e.entityKind,
  title: e.title,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  allDay: e.allDay,
  sourceSystem: e.sourceSystem
}), ed = (e, t, n) => {
  const o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Map();
  for (const a of t)
    a.status === "completed" || !a.missionId || o.set(
      a.missionId,
      (o.get(a.missionId) ?? 0) + 1
    );
  for (const a of n)
    a.status === "completed" || !a.projectId || s.set(a.projectId, (s.get(a.projectId) ?? 0) + 1);
  const r = e.filter((a) => a.status !== "completed").map((a) => ({
    id: a.id,
    entityKind: "mission",
    title: a.title,
    status: a.status,
    dueAt: a.dueAt,
    activeChildCount: o.get(a.id) ?? 0,
    markdownPath: a.markdownPath
  })), i = t.filter((a) => a.status !== "completed").map((a) => ({
    id: a.id,
    entityKind: "project",
    title: a.title,
    status: a.status,
    dueAt: a.dueAt,
    activeChildCount: s.get(a.id) ?? 0,
    markdownPath: a.markdownPath
  }));
  return [...r, ...i].sort((a, c) => c.activeChildCount - a.activeChildCount || a.title.localeCompare(c.title)).slice(0, 12);
}, td = (e) => {
  const t = /* @__PURE__ */ new Set([
    ...e.missions.filter((o) => o.status !== "completed").map((o) => o.id),
    ...e.projects.filter((o) => o.status !== "completed").map((o) => o.id)
  ]), n = /* @__PURE__ */ new Map();
  for (const o of e.personWorkLinks)
    t.has(o.entityId) && n.set(
      o.personId,
      (n.get(o.personId) ?? 0) + 1
    );
  return e.people.map((o) => ({
    id: o.id,
    name: o.name,
    roleSummary: o.roleSummary,
    emailAvailable: !!o.email,
    phoneAvailable: !!o.phone,
    billingAddressAvailable: !!o.billingAddress,
    activeRelationshipCount: n.get(o.id) ?? 0
  })).filter(
    (o) => o.activeRelationshipCount > 0 || o.emailAvailable || o.phoneAvailable || o.billingAddressAvailable
  ).sort((o, s) => s.activeRelationshipCount - o.activeRelationshipCount || o.name.localeCompare(s.name)).slice(0, 12);
}, nd = () => {
  const e = j();
  return [
    ...e.calendarConnections.map((t) => ({
      kind: "calendar",
      id: t.id,
      provider: t.provider,
      label: t.label,
      enabled: t.enabled,
      authStatus: t.authStatus,
      syncStatus: t.syncStatus,
      lastSyncedAt: t.lastSyncedAt
    })),
    ...e.emailConnections.map((t) => ({
      kind: "email",
      id: t.id,
      provider: t.provider,
      label: t.label,
      enabled: t.enabled,
      authStatus: t.authStatus,
      syncStatus: t.syncStatus,
      lastSyncedAt: t.lastSyncedAt
    }))
  ];
}, od = () => Yt().map((t) => ({
  id: t.id,
  title: t.title,
  suggestedEntityKind: t.suggestedEntityKind,
  reason: t.reason,
  dueAt: t.dueAt,
  receivedAt: t.receivedAt,
  sourceSystem: t.sourceSystem,
  matchedPersonName: t.matchedPersonName
})).sort((t, n) => n.receivedAt.localeCompare(t.receivedAt)).slice(0, 8), te = () => {
  const e = /* @__PURE__ */ new Date(), t = _(), n = new Map(t.people.map((f) => [f.id, f.name])), o = t.missions.filter((f) => f.status !== "completed"), s = t.projects.filter((f) => f.status !== "completed"), r = t.todos.filter((f) => f.status !== "completed"), i = t.deadlines.filter((f) => f.status !== "completed"), a = Fo(
    t.appointments.filter((f) => {
      const p = Jt(f.startsAt, e);
      return p !== null && p >= 0 && p <= 1;
    }).map((f) => qc(f, e))
  ).slice(0, 8), c = Fo([
    ...i.map((f) => Zc(f, e)),
    ...r.map((f) => Qc(f, e, n)),
    ...s.map((f) => Jc(f, e)),
    ...o.map((f) => Vc(f, e))
  ]).slice(0, 12), d = a[0], l = c[0] ?? null, m = od();
  return {
    schemaVersion: "companion.snapshot.v1",
    version: 1,
    generatedAt: e.toISOString(),
    localDate: zc(e),
    source: "praxis-home-node",
    capability: {
      readOnly: !0,
      commandsAccepted: !0,
      explicitCommandOnly: !0,
      directStorageAccess: !1,
      notes: "Companion clients may request snapshots and submit explicit assistant commands. They cannot directly read or mutate SQLite, markdown memory, or secrets."
    },
    summary: {
      activeMissionCount: o.length,
      activeProjectCount: s.length,
      activeTodoCount: r.length,
      activeDeadlineCount: i.length,
      waitingOnCount: r.filter((f) => !!f.waitingOnPersonId).length,
      blockedCount: [...o, ...s, ...r, ...i].filter(
        (f) => f.status === "blocked"
      ).length,
      pausedCount: [...o, ...s, ...r, ...i].filter(
        (f) => f.status === "paused"
      ).length,
      moneyRelatedCount: r.filter((f) => f.moneyRelated).length,
      quickActionCount: r.filter((f) => f.quickAction).length
    },
    topMove: d && (!l || d.rank <= l.rank) ? Wo(d) : l,
    today: {
      appointments: a.map(Wo),
      workItems: c
    },
    focusTargets: ed(t.missions, t.projects, t.todos),
    people: {
      totalCount: t.people.length,
      highlighted: td(t)
    },
    inbox: {
      pendingEmailFollowUpCount: Yt().length,
      latestEmailFollowUps: m
    },
    integrations: nd()
  };
}, sd = (e) => {
  var s;
  const t = e.toLowerCase(), n = t.match(/\b(\d{1,2})\b/);
  return n ? Number(n[1]) : ((s = [
    [/\b(first|top)\b/, 1],
    [/\bsecond\b/, 2],
    [/\bthird\b/, 3],
    [/\bfourth\b/, 4],
    [/\bfifth\b/, 5]
  ].find(([r]) => r.test(t))) == null ? void 0 : s[1]) ?? null;
}, Ir = (e) => /\b(complete|completed|done|mark done|mark it done|finish|finished)\b/i.test(e), rd = (e) => /\b(pause|hold|put it on hold|park it)\b/i.test(e), id = (e) => /\b(reactivate|resume|unpause|reopen|make it active|start it again)\b/i.test(e), ad = (e) => /^(yes|y|yeah|yep|sure|ok|okay|do it|go ahead|sounds good|please do)$/i.test(e.trim()), cd = (e) => /^(no|n|nope|not now|stop|cancel|never mind)$/i.test(e.trim()), Xo = (e) => e.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(), dd = (e, t) => {
  const n = Xo(e);
  return t.find((o) => {
    const s = Xo(o.title);
    return s.length > 3 && n.includes(s);
  }) ?? null;
}, ld = (e) => id(e) ? "reactivate" : rd(e) ? "pause" : Ir(e) ? "complete" : /\b(open|show|pull up|bring up)\b/i.test(e) && /\b(focus report|project focus|mission focus|related project)\b/i.test(e) ? "open_focus_report" : /\b(move|reschedule|shift|change|set|push|make)\b/i.test(e) && /\b(due|deadline|to|for|on|by)\b/i.test(e) || /\b(move|reschedule|shift|change|set|push)\b/i.test(e) ? "update_due_date" : /\b(clear|remove|not waiting|no longer waiting|got it|received|came through)\b/i.test(e) ? "clear_waiting_on" : /\b(waiting on|waiting for|wait on)\b/i.test(e) ? "assign_waiting_on" : null, ud = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
], pt = (e) => String(e).padStart(2, "0"), md = (e) => `${e.getFullYear()}-${pt(e.getMonth() + 1)}-${pt(e.getDate())}T${pt(
  e.getHours()
)}:${pt(e.getMinutes())}`, ft = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), Ho = (e, t) => {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}, pd = (e) => {
  var r;
  const t = e.match(
    /\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\b/i
  );
  if (!t)
    return null;
  let n = Number(t[1] ?? t[4]);
  const o = t[2] || t[5] ? Number(t[2] ?? t[5]) : 0, s = (r = t[3] ?? t[6]) == null ? void 0 : r.toLowerCase();
  return s === "pm" && n < 12 && (n += 12), s === "am" && n === 12 && (n = 0), !s && n >= 1 && n <= 7 && (n += 12), n > 23 || o > 59 ? null : { hour: n, minute: o };
}, Bo = (e, t = /* @__PURE__ */ new Date()) => {
  const n = e.toLowerCase();
  let o = ft(t);
  if (/\btoday\b/.test(n))
    o = ft(t);
  else if (/\btomorrow\b/.test(n))
    o = Ho(ft(t), 1);
  else {
    const r = ud.findIndex(
      (i) => new RegExp(`\\b${i}\\b`).test(n)
    );
    if (r >= 0) {
      const i = t.getDay(), a = (r - i + 7) % 7 || 7;
      o = Ho(ft(t), a);
    } else {
      const i = n.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
      if (!i)
        return null;
      const a = Number(i[1]) - 1, c = Number(i[2]), d = i[3] ? Number(i[3].length === 2 ? `20${i[3]}` : i[3]) : t.getFullYear();
      o = new Date(d, a, c);
    }
  }
  const s = pd(e);
  return s ? o.setHours(s.hour, s.minute, 0, 0) : o.setHours(17, 0, 0, 0), md(o);
}, We = (e) => e.command === "reactivate" ? `Resolved follow-up to reactivate ${e.title}.` : e.command === "pause" ? `Resolved follow-up to pause ${e.title}.` : e.command === "open_focus_report" ? `Resolved follow-up to open the focus report for ${e.title}.` : e.command === "update_due_date" ? `Resolved follow-up to move ${e.title}.` : e.command === "clear_waiting_on" ? `Resolved follow-up to clear waiting-on for ${e.title}.` : e.command === "assign_waiting_on" ? `Resolved follow-up to assign waiting-on for ${e.title}.` : `Resolved follow-up to complete ${e.title}.`, fd = (e, t) => {
  const n = t == null ? void 0 : t.trim();
  if (!n)
    return {
      ok: !1,
      reason: "Choose one of the available action ids before confirming."
    };
  const o = e.find((s) => s.actionId === n);
  return o ? {
    ok: !0,
    action: o,
    message: We(o)
  } : {
    ok: !1,
    reason: "That action id is no longer available. Ask Praxis to generate the choices again."
  };
}, gd = ({
  surface: e,
  text: t,
  actions: n
}) => {
  const o = e === "proactive_suggestion", s = e === "work_update_confirmation", r = e === "work_lookup", i = e === "daily_report" || e === "focus_report", a = sd(t), c = ld(t);
  if (cd(t) && (o || i || s))
    return {
      ok: !1,
      declined: !0,
      reason: "Okay. I will leave it alone."
    };
  const d = a ? n.find((p) => p.ordinal !== a ? !1 : c ? p.command === c : s ? !0 : p.command === "complete") : null, l = dd(
    t,
    n.filter((p) => !c || p.command === c)
  ), m = d ?? l;
  if (!m && ad(t) && (o || s)) {
    if (n.length === 1) {
      const [p] = n;
      return {
        ok: !0,
        action: p,
        message: We(p)
      };
    }
    return {
      ok: !1,
      reason: "I have a few options. Reply with a number so I pick the right one."
    };
  }
  if (!m && Ir(t) && n.length === 1) {
    const [p] = n;
    return {
      ok: !0,
      action: p,
      message: We(p)
    };
  }
  if (!m && c) {
    const p = n.filter((y) => y.command === c);
    if (p.length === 1) {
      const [y] = p, T = y.command === "update_due_date" && !y.dueAt ? {
        ...y,
        dueAt: Bo(t) ?? void 0
      } : y;
      return T.command === "update_due_date" && !T.dueAt ? {
        ok: !1,
        reason: "I need a clear date for that move, for example `move that to tomorrow`."
      } : {
        ok: !0,
        action: T,
        message: We(T)
      };
    }
  }
  if (!m && c && r)
    return {
      ok: !1,
      reason: c === "update_due_date" ? "Say which lookup item to move, for example `move the first one to tomorrow`." : c === "open_focus_report" ? "Say which lookup item to open, for example `open the focus report for the first one`." : "Say which lookup item to change, for example `pause the first one` or `mark the first one done`."
    };
  if (!m)
    return {
      ok: !1,
      reason: o || s ? "I could not safely map that reply. Reply with a number or the specific item title." : r ? "Say which lookup item to change, for example `mark the first one done`." : "Say which report item to complete, for example `mark the first one done`."
    };
  const f = m.command === "update_due_date" && !m.dueAt ? {
    ...m,
    dueAt: Bo(t) ?? void 0
  } : m;
  return f.command === "update_due_date" && !f.dueAt ? {
    ok: !1,
    reason: "I need a clear date for that move, for example `move the first one to tomorrow`."
  } : {
    ok: !0,
    action: f,
    message: We(f)
  };
}, _d = 24 * 60 * 60 * 1e3, Go = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), ao = (e, t) => {
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor((Go(n).getTime() - Go(t).getTime()) / _d);
}, hd = (e, t) => {
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.round((n.getTime() - t.getTime()) / (60 * 1e3));
}, zo = (e) => {
  if (!e)
    return null;
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}, yd = (e, t) => {
  const n = ao(e.startsAt, t), o = hd(e.startsAt, t), s = e.allDay ? "all day" : zo(e.startsAt), r = e.allDay ? null : zo(e.endsAt), i = r && s ? `${s}-${r}` : s;
  return n === 0 && e.allDay ? "Today, all day" : n === 0 && o !== null && o >= 0 ? `${i}; starts in ${o} minute${o === 1 ? "" : "s"}` : n === 0 ? `${i}; today` : n === 1 ? `${i}; tomorrow` : `${i ?? "scheduled"}; upcoming`;
}, Yo = (e, t) => ({
  id: e.id,
  title: e.title,
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  allDay: e.allDay,
  sourceSystem: e.sourceSystem,
  notes: e.notes,
  reason: yd(e, t)
}), gt = {
  today: "Today's Appointments",
  tomorrow: "Tomorrow's Appointments",
  upcoming: "Upcoming Appointments"
}, Ed = (e, t, n) => {
  const o = ao(e.startsAt, n);
  return o === null ? !1 : t === "today" ? o === 0 : t === "tomorrow" ? o === 1 : o >= 0;
}, Td = (e, t) => e.filter((n) => {
  const o = ao(n.startsAt, t);
  return o !== null && o >= 0;
}).sort((n, o) => new Date(n.startsAt).getTime() - new Date(o.startsAt).getTime()), kd = (e) => (e == null ? void 0 : e.range) ?? "upcoming", co = (e) => {
  const t = /* @__PURE__ */ new Date(), n = kd(e), o = _().appointments, s = o.filter((l) => Ed(l, n, t)).sort((l, m) => new Date(l.startsAt).getTime() - new Date(m.startsAt).getTime()), r = s.slice(0, 8).map((l) => Yo(l, t)), i = r[0], a = Td(o, t), c = a[0] ? Yo(a[0], t) : null, d = i ? `${gt[n]}: first up is ${i.title}, ${i.reason}. I found ${s.length} appointment${s.length === 1 ? "" : "s"}.` : c && n !== "upcoming" ? `${gt[n]}: I do not see any appointments in that window. I do see ${a.length} upcoming appointment${a.length === 1 ? "" : "s"}; next up is ${c.title}, ${c.reason}.` : `${gt[n]}: I do not see any appointments in that window.`;
  return {
    generatedAt: t.toISOString(),
    range: n,
    title: gt[n],
    spokenSummary: d,
    appointments: r,
    thereIsMore: s.length > r.length
  };
}, Sd = 24 * 60 * 60 * 1e3, bd = {
  critical: 0,
  high: 10,
  normal: 20,
  low: 30
}, wd = (e) => {
  const t = e.getFullYear(), n = String(e.getMonth() + 1).padStart(2, "0"), o = String(e.getDate()).padStart(2, "0");
  return `${t}-${n}-${o}`;
}, Ct = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), vr = (e, t) => {
  if (!e)
    return !1;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? !1 : Ct(n).getTime() === Ct(t).getTime();
}, P = (e, t) => {
  if (!e)
    return null;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor((Ct(n).getTime() - Ct(t).getTime()) / Sd);
}, Or = (e, t) => {
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.round((n.getTime() - t.getTime()) / (60 * 1e3));
}, Ad = (e) => {
  const t = e.getHours();
  return t < 12 ? "Good morning" : t < 18 ? "Good afternoon" : "Good evening";
}, Id = (e) => {
  if (!e)
    return "none";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}, Nr = (e, t) => {
  const n = P(e, t);
  return n === null ? "No deadline recorded" : n < 0 ? `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"} overdue` : n === 0 ? "Due today" : n === 1 ? "Due tomorrow" : `Due in ${n} days`;
}, Cr = (e, t, n) => {
  const o = P(e, n), s = bd[t];
  return o === null ? 80 + s : o < 0 ? s : o === 0 ? 5 + s : o === 1 ? 15 + s : o <= 7 ? 30 + o + s : 60 + Math.min(o, 30) + s;
}, vd = (e, t) => {
  const n = P(e.startsAt, t), o = Or(e.startsAt, t), s = e.allDay ? "" : ` at ${Id(e.startsAt)}`;
  if (n === 0 && e.allDay)
    return "Appointment today";
  if (n === 0 && o !== null && o >= 0) {
    if (o < 60)
      return `Appointment in ${o} minute${o === 1 ? "" : "s"}`;
    const r = Math.round(o / 60);
    return `Appointment in ${r} hour${r === 1 ? "" : "s"}`;
  }
  return n === 0 ? `Appointment today${s}` : n === 1 ? `Appointment tomorrow${s}` : `Upcoming appointment${s}`;
}, Od = (e, t) => {
  const n = P(e.startsAt, t), o = Or(e.startsAt, t);
  return n === 0 && e.allDay ? -100 : n === 0 && o !== null && o >= 0 ? -90 + Math.min(o, 720) / 720 : n === 0 ? -80 : n === 1 ? 12 : 75;
}, Nd = (e, t) => ({
  id: e.id,
  entityKind: "appointment",
  title: e.title,
  reason: vd(e, t),
  dueAt: e.startsAt,
  priority: "high",
  status: "active",
  rank: Od(e, t),
  startsAt: e.startsAt,
  endsAt: e.endsAt,
  allDay: e.allDay,
  sourceSystem: e.sourceSystem,
  notes: e.notes ?? null
}), lo = (e, t) => ({
  id: e.id,
  entityKind: "deadline",
  title: e.title,
  reason: Nr(e.dueAt, t),
  dueAt: e.dueAt,
  priority: e.priority,
  status: e.status,
  rank: Cr(e.dueAt, e.priority, t)
}), Rt = (e, t, n = /* @__PURE__ */ new Map()) => ({
  id: e.id,
  entityKind: "todo",
  title: e.title,
  reason: e.quickAction ? `Quick action${e.estimatedMinutes ? `, about ${e.estimatedMinutes} minutes` : ""}` : e.dueAt ? Nr(e.dueAt, t) : "Active todo",
  dueAt: e.dueAt,
  priority: e.priority,
  status: e.status,
  waitingOnPersonName: e.waitingOnPersonId ? n.get(e.waitingOnPersonId) ?? null : null,
  rank: Cr(e.dueAt, e.priority, t) + (e.moneyRelated ? -4 : 0) + (e.quickAction ? -6 : 0) + Math.min(e.estimatedMinutes ?? 60, 60) / 60
}), Cd = (e, t) => vr(e.updatedAt, t) && new Date(e.updatedAt).getTime() !== new Date(e.createdAt).getTime(), Rd = (e, t, n, o, s) => {
  const r = [
    ...e.missions,
    ...e.projects,
    ...e.todos,
    ...e.deadlines
  ].filter((p) => Cd(p, o)).length, i = [
    ...e.missions,
    ...e.projects,
    ...e.todos,
    ...e.deadlines
  ].filter(
    (p) => p.status === "completed" && vr(p.updatedAt, o)
  ).length, a = n.filter((p) => !!p.waitingOnPersonId).length, c = t.filter((p) => P(p.dueAt, o) !== null && P(p.dueAt, o) < 0).length + n.filter((p) => P(p.dueAt, o) !== null && P(p.dueAt, o) < 0).length, d = t.filter((p) => P(p.dueAt, o) === 0).length + n.filter((p) => P(p.dueAt, o) === 0).length, l = fe(
    [
      ...t.filter((p) => {
        const y = P(p.dueAt, o);
        return y !== null && y <= 0;
      }).map((p) => lo(p, o)),
      ...n.filter((p) => {
        const y = P(p.dueAt, o);
        return y !== null && y <= 0;
      }).map((p) => Rt(p, o, s))
    ],
    5
  ).map((p) => p.title), m = c > 0 ? `${c} overdue item${c === 1 ? "" : "s"}` : d > 0 ? `${d} item${d === 1 ? "" : "s"} due today` : a > 0 ? `${a} waiting-on item${a === 1 ? "" : "s"}` : "no closeout pressure", f = i > 0 ? `${i} completed today` : "nothing completed today yet";
  return {
    changedTodayCount: r,
    completedTodayCount: i,
    waitingOnCount: a,
    overdueCount: c,
    dueTodayCount: d,
    moveTomorrowCandidates: l,
    summary: `${f}; ${m}.`
  };
}, fe = (e, t) => [...e].sort((n, o) => n.rank - o.rank || n.title.localeCompare(o.title)).slice(0, t), $d = (e) => {
  const t = e[0] ?? null;
  return t ? t.entityKind === "appointment" ? {
    item: t,
    directive: `Protect the calendar item: ${t.title}.`,
    rationale: t.reason,
    actionHint: "Ask for today's appointments or tell Praxis what preparation is needed."
  } : t.entityKind === "mission" || t.entityKind === "project" ? {
    item: t,
    directive: `Open the focus report for ${t.title}.`,
    rationale: t.reason,
    actionHint: "Reply with `show me the project` or `open the focus report`."
  } : t.entityKind === "todo" && t.waitingOnPersonName ? {
    item: t,
    directive: `Decide whether ${t.title} is still waiting on ${t.waitingOnPersonName}.`,
    rationale: t.reason,
    actionHint: "Reply with `clear the waiting-on flag` if that blocker is gone."
  } : t.entityKind === "todo" && t.reason.toLowerCase().includes("quick action") ? {
    item: t,
    directive: `Knock out ${t.title}.`,
    rationale: t.reason,
    actionHint: "Reply with `mark the first one done` after you finish it."
  } : t.entityKind === "deadline" ? {
    item: t,
    directive: `Move ${t.title} forward before the deadline gets louder.`,
    rationale: t.reason,
    actionHint: "Reply with `move the first one to tomorrow` if the date needs to change."
  } : {
    item: t,
    directive: `Work on ${t.title}.`,
    rationale: t.reason,
    actionHint: "Reply with the item number and what you want changed."
  } : {
    item: null,
    directive: "Capture the first real mission, project, todo, or deadline.",
    rationale: "Praxis does not have enough active work recorded to make a useful recommendation yet.",
    actionHint: "Add a work item in Talk to Praxis."
  };
}, Ld = (e) => {
  const t = e.deadlines.length, n = e.todos.length, o = e.moneyItems.length, s = e.emailFollowUpCount, r = e.priorityItems[0], i = e.recommendedMove, a = e.appointments[0], c = [...e.deadlines, ...e.todos].filter(
    (v) => v.reason.toLowerCase().includes("overdue")
  ).length, d = e.todos.filter((v) => !!v.waitingOnPersonName).length, l = e.todos.filter(
    (v) => v.reason.toLowerCase().includes("quick action")
  ).length;
  if (!r)
    return `${e.greeting}, sir. Status report: I do not have active work recorded yet. Add a mission, project, todo, or deadline and I will start tracking it.`;
  const m = o > 0 ? ` You also have ${o} money-related item${o === 1 ? "" : "s"} in the queue.` : "", f = s > 0 ? ` I also flagged ${s} email follow-up${s === 1 ? "" : "s"} worth reviewing.` : "", p = e.thereIsMore ? " There is more, sir, if you want to go over it." : "", y = a ? ` First calendar item: ${a.title}, ${a.reason.toLowerCase()}.` : "", T = c > 0 ? ` ${c} item${c === 1 ? " is" : "s are"} overdue.` : "", O = d > 0 ? ` ${d} todo${d === 1 ? " is" : "s are"} still waiting on someone else.` : "", E = l > 0 ? ` I can also see ${l} quick win${l === 1 ? "" : "s"} in the stack.` : "";
  return `${e.greeting}, sir. Status report: your top move is ${i.directive} Reason: ${i.rationale.toLowerCase()}.${y} I see ${t} active deadline${t === 1 ? "" : "s"} and ${n} active todo${n === 1 ? "" : "s"}.${T}${O}${E}${m}${f}${p}`;
}, qo = (e, t, n, o) => fe([...e.map((s) => lo(s, n)), ...t.map((s) => Rt(s, n, o))], 20), Dd = (e, t, n = /* @__PURE__ */ new Date()) => {
  const o = new Map(e.people.map((E) => [E.id, E.name])), s = e.appointments.filter((E) => {
    const v = P(E.startsAt, n);
    return v !== null && v >= 0 && v <= 1;
  }), r = e.deadlines.filter((E) => E.status !== "completed"), i = e.todos.filter((E) => E.status !== "completed"), a = fe(
    s.map((E) => Nd(E, n)),
    5
  ), c = fe(r.map((E) => lo(E, n)), 8), d = fe(i.map((E) => Rt(E, n, o)), 8), l = fe(
    i.filter((E) => E.moneyRelated).map((E) => Rt(E, n, o)),
    5
  ), m = fe([...a, ...c, ...d], 5), f = $d(m), p = Rd(
    e,
    r,
    i,
    n,
    o
  ), y = s.length + r.length + i.length, T = [
    s.length > a.length ? "additional appointments" : null,
    r.length > c.length ? "additional deadlines" : null,
    i.length > d.length ? "additional todos" : null,
    l.length > 0 ? "money items" : null,
    t > 0 ? "email follow-ups" : null
  ].filter((E) => !!E), O = {
    generatedAt: n.toISOString(),
    localDate: wd(n),
    greeting: Ad(n),
    recommendedMove: f,
    closeout: p,
    priorityItems: m,
    appointments: a,
    deadlines: c,
    todos: d,
    moneyItems: l,
    emailFollowUpCount: t,
    followUpTopics: T,
    thereIsMore: y > m.length
  };
  return {
    ...O,
    spokenBrief: Ld(O),
    markdownPath: ""
  };
}, Vo = (e, t, n, o = /* @__PURE__ */ new Set()) => {
  const s = new Map(e.people.map((i) => [i.id, i])), r = /* @__PURE__ */ new Set();
  return e.personWorkLinks.filter((i) => i.entityKind === t && i.entityId === n ? !0 : t === "mission" && i.entityKind === "project" && o.has(i.entityId)).map((i) => {
    const a = s.get(i.personId);
    if (!a)
      return null;
    const c = `${a.id}:${i.relationship}`;
    return r.has(c) ? null : (r.add(c), {
      personId: a.id,
      name: a.name,
      relationship: i.relationship
    });
  }).filter((i) => !!i).sort((i, a) => i.relationship.localeCompare(a.relationship) || i.name.localeCompare(a.name)).slice(0, 8);
}, Md = (e) => e ?? "none", Jo = (e) => {
  if (!e)
    return "none";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}, Pd = (e) => {
  if (e.entityKind !== "appointment")
    return "none";
  if (e.allDay)
    return "all day";
  const t = Jo(e.startsAt ?? e.dueAt), n = Jo(e.endsAt);
  return n === "none" ? t : `${t}-${n}`;
}, xe = (e) => `- ${e.title}
  - kind: ${e.entityKind}
  - reason: ${e.reason}
  - priority: ${e.priority}
  - due: ${Md(e.dueAt)}
  - time: ${Pd(e)}
  - source: ${e.sourceSystem ?? "none"}
  - waiting_on: ${e.waitingOnPersonName ?? "none"}
  - status: ${e.status}`, xd = (e) => {
  const t = tt(), n = `daily/${e.localDate}.md`, o = k.join(t, n), s = `# Daily Note - ${e.localDate}

## Spoken Brief

${e.spokenBrief}

## Priority Order

${e.priorityItems.length > 0 ? e.priorityItems.map(xe).join(`
`) : "- No priority work recorded yet."}

## Appointments

${e.appointments.length > 0 ? e.appointments.map(xe).join(`
`) : "- No appointments recorded for today or tomorrow."}

## Deadlines

${e.deadlines.length > 0 ? e.deadlines.map(xe).join(`
`) : "- No active deadlines recorded yet."}

## Waiting On You

${e.todos.length > 0 ? e.todos.map(xe).join(`
`) : "- No active todos recorded yet."}

## Money Items

${e.moneyItems.length > 0 ? e.moneyItems.map(xe).join(`
`) : "- No money-related todos recorded yet."}

## Recommended Next Move

- directive: ${e.recommendedMove.directive}
- rationale: ${e.recommendedMove.rationale}
- action_hint: ${e.recommendedMove.actionHint}
- item: ${e.recommendedMove.item ? `${e.recommendedMove.item.entityKind}:${e.recommendedMove.item.id}` : "none"}

## Closeout

- summary: ${e.closeout.summary}
- changed_today: ${e.closeout.changedTodayCount}
- completed_today: ${e.closeout.completedTodayCount}
- waiting_on: ${e.closeout.waitingOnCount}
- overdue: ${e.closeout.overdueCount}
- due_today: ${e.closeout.dueTodayCount}
- move_or_decide: ${e.closeout.moveTomorrowCandidates.join(", ") || "none"}

## There Is More

- yes_or_no: ${e.thereIsMore ? "yes" : "no"}
- follow_up_topics: ${e.followUpTopics.join(", ") || "none"}
`;
  return ne(k.dirname(o)) || zn(k.dirname(o), { recursive: !0 }), Ls(o, s, "utf8"), n;
}, en = () => {
  const e = _(), t = Yt(), n = Dd(e, t.length), o = xd({ ...n });
  return {
    ...n,
    markdownPath: o
  };
}, $t = (e, t) => {
  const n = /* @__PURE__ */ new Date(), o = _(), s = new Map(o.people.map((m) => [m.id, m.name]));
  if (e === "mission") {
    const m = o.missions.find((b) => b.id === t);
    if (!m)
      return null;
    const f = o.projects.filter(
      (b) => b.missionId === m.id && b.status !== "completed"
    ), p = new Set(f.map((b) => b.id)), y = o.todos.filter(
      (b) => b.status !== "completed" && b.projectId && p.has(b.projectId)
    ), T = o.deadlines.filter(
      (b) => b.status !== "completed" && (b.entityKind === "mission" && b.entityId === m.id || b.entityKind === "project" && b.entityId && p.has(b.entityId) || b.entityKind === "todo" && b.entityId && y.some((Me) => Me.id === b.entityId))
    ), O = qo(T, y, n, s), E = O.slice(0, 6), v = Vo(o, "mission", m.id, p);
    return {
      entityKind: e,
      entityId: t,
      title: m.title,
      summary: m.summary ?? `${m.title} has ${f.length} active project${f.length === 1 ? "" : "s"} and ${y.length} active todo${y.length === 1 ? "" : "s"}.`,
      status: m.status,
      dueAt: m.dueAt,
      activeProjectCount: f.length,
      activeTodoCount: y.length,
      upcomingDeadlineCount: T.length,
      people: v,
      topItems: E,
      detailItems: O,
      markdownPath: m.markdownPath
    };
  }
  const r = o.projects.find((m) => m.id === t);
  if (!r)
    return null;
  const i = o.todos.filter(
    (m) => m.status !== "completed" && m.projectId === r.id
  ), a = o.deadlines.filter(
    (m) => m.status !== "completed" && (m.entityKind === "project" && m.entityId === r.id || m.entityKind === "todo" && m.entityId && i.some((f) => f.id === m.entityId))
  ), c = qo(a, i, n, s), d = c.slice(0, 6), l = Vo(o, "project", r.id);
  return {
    entityKind: e,
    entityId: t,
    title: r.title,
    summary: r.summary ?? `${r.title} has ${i.length} active todo${i.length === 1 ? "" : "s"}.`,
    status: r.status,
    dueAt: r.dueAt,
    activeProjectCount: 0,
    activeTodoCount: i.length,
    upcomingDeadlineCount: a.length,
    people: l,
    topItems: d,
    detailItems: c,
    markdownPath: r.markdownPath
  };
}, Ud = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
], _t = (e) => String(e).padStart(2, "0"), jd = (e) => `${e.getFullYear()}-${_t(e.getMonth() + 1)}-${_t(e.getDate())}T${_t(e.getHours())}:${_t(e.getMinutes())}`, ht = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), Qo = (e, t) => {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}, Kd = (e) => {
  var r;
  const t = e.match(/\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\b/i);
  if (!t)
    return null;
  let n = Number(t[1] ?? t[4]);
  const o = t[2] || t[5] ? Number(t[2] ?? t[5]) : 0, s = (r = t[3] ?? t[6]) == null ? void 0 : r.toLowerCase();
  return s === "pm" && n < 12 && (n += 12), s === "am" && n === 12 && (n = 0), !s && n >= 1 && n <= 7 && (n += 12), n > 23 || o > 59 ? null : { hour: n, minute: o };
}, Zo = (e, t = /* @__PURE__ */ new Date()) => {
  const n = e.toLowerCase();
  let o = ht(t);
  if (/\btoday\b/.test(n))
    o = ht(t);
  else if (/\btomorrow\b/.test(n))
    o = Qo(ht(t), 1);
  else {
    const r = Ud.findIndex(
      (i) => new RegExp(`\\b${i}\\b`).test(n)
    );
    if (r >= 0) {
      const i = t.getDay(), a = (r - i + 7) % 7 || 7;
      o = Qo(ht(t), a);
    } else {
      const i = n.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
      if (!i)
        return null;
      const a = Number(i[1]) - 1, c = Number(i[2]), d = i[3] ? Number(i[3].length === 2 ? `20${i[3]}` : i[3]) : t.getFullYear();
      o = new Date(d, a, c);
    }
  }
  const s = Kd(e);
  return s ? o.setHours(s.hour, s.minute, 0, 0) : o.setHours(17, 0, 0, 0), jd(o);
}, Fd = (e) => e.replace(/\b(remind me to|remember to|i need to|need to|todo|task)\b/gi, "").replace(/\b(waiting on|wait on|waiting for|from)\b/gi, "").replace(/\b(is due|due by|due on|due|deadline for|deadline)\b/gi, "").replace(/\b(appointment|meeting|call)\b/gi, (t) => t).replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "").replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi, "").replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "").replace(/\bat\s+\d{1,2}(?::\d{2})?\b/gi, "").replace(/\b(on|by|at|for)\b/gi, "").replace(/\s+/g, " ").trim(), Rr = (e) => e.trim().replace(/\s+/g, " ").replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1)), Wd = (e) => /\b(invoice|bill|payment|paid|pay|quote|proposal|contract|billing)\b/i.test(e), Xd = (e) => /\b(critical|urgent|asap|immediately)\b/i.test(e) ? "critical" : /\b(important|high priority)\b/i.test(e) ? "high" : "normal", $r = (e) => {
  const t = e.match(/\b(\d{1,3})\s*(?:min|mins|minutes)\b/i);
  return t ? Number(t[1]) : /\b(quick|knock out|fast|small)\b/i.test(e) ? 10 : /\b(call|text|email|send|pay)\b/i.test(e) ? 15 : /\b(review|outline|draft)\b/i.test(e) ? 30 : null;
}, Hd = (e) => {
  const t = $r(e);
  return t !== null && t <= 30;
}, Bd = (e) => /\b(appointment|meeting|doctor|dentist|calendar)\b/i.test(e), Gd = (e) => /\b(remind me to|remember to|i need to|need to|todo|task|due|deadline|send|finish|write|fix|call)\b/i.test(
  e
), zd = (e) => /\b(create|start|add|make|open|set up|setup|capture|new)\b.{0,30}\bmission\b/i.test(e) || /\bmission\s+(?:called|named|for|about)\b/i.test(e), Yd = (e) => /\bcall\b/i.test(e), qd = (e) => Yd(e) && !/\b(appointment|meeting|calendar)\b/i.test(e), Lr = (e) => e.toLowerCase().split(/[^a-z0-9]+/g).filter((t) => t.length >= 4), Vd = (e, t) => {
  const n = e.toLowerCase(), o = t.title.toLowerCase();
  if (n.includes(o))
    return 100;
  const s = Lr(t.title);
  if (s.length === 0)
    return 0;
  const r = s.filter((i) => n.includes(i)).length;
  return r >= 2 || r === s.length ? r * 20 : 0;
}, Jd = (e, t) => {
  const n = e.toLowerCase(), o = [t.name, ...t.aliases];
  if (o.some((i) => n.includes(i.toLowerCase())))
    return 100;
  const s = o.flatMap(Lr);
  if (s.length === 0)
    return 0;
  const r = s.filter((i) => n.includes(i)).length;
  return r > 0 ? r * 45 : 0;
}, Qd = (e, t) => {
  const n = t.people.map((o) => ({
    person: o,
    score: Jd(e, o)
  })).filter((o) => o.score > 0).sort((o, s) => s.score - o.score);
  return n.length === 0 || n[1] && n[1].score === n[0].score ? null : n[0].person;
}, Zd = (e, t) => {
  const n = t.projects.filter((o) => o.status !== "completed").map((o) => ({
    project: o,
    score: Vd(e, o)
  })).filter((o) => o.score > 0).sort((o, s) => s.score - o.score);
  return n.length === 0 || n[1] && n[1].score === n[0].score ? null : n[0].project;
}, el = (e, t) => {
  const n = e.toLowerCase();
  return t.missions.find(
    (o) => o.status !== "completed" && n.includes(o.title.toLowerCase())
  ) ?? null;
}, tl = (e, t, n, o) => {
  const s = el(e, o), r = Qd(e, o), i = Zd(e, o) ?? (() => {
    if (!s)
      return null;
    const c = o.projects.filter(
      (d) => d.status !== "completed" && d.missionId === s.id
    );
    return c.length === 1 ? c[0] : null;
  })(), a = $r(e);
  return {
    input: {
      title: t,
      dueAt: n,
      priority: Xd(e),
      moneyRelated: Wd(e),
      quickAction: Hd(e),
      estimatedMinutes: a ?? void 0,
      waitingOnPersonId: r == null ? void 0 : r.id,
      notes: e,
      projectId: i == null ? void 0 : i.id
    },
    matchedProject: i,
    matchedMission: s,
    matchedPerson: r
  };
}, nl = (e) => Rr(
  e.replace(
    /\b(?:create|start|add|make|open|set up|setup|capture)\s+(?:a\s+|an\s+|new\s+)?mission(?:\s+(?:called|named|for|about))?\b/gi,
    ""
  ).replace(/\bnew\s+mission\b/gi, "").replace(/\bmission\s+(?:called|named|for|about)\b/gi, "").replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "").replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi, "").replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "").replace(/\bat\s+\d{1,2}(?::\d{2})?\b/gi, "").replace(/\b(is due|due by|due on|due|deadline for|deadline|by|on|at|for)\b/gi, "").replace(/\s+/g, " ").trim()
), ol = (e) => {
  var r, i, a, c, d, l;
  const t = e.text.trim(), n = _();
  if (!t)
    return {
      intent: "unresolved",
      confidence: 0,
      reason: "No text was provided."
    };
  if (e.forcedIntent === "mission" || zd(t)) {
    const m = Zo(t) ?? void 0, f = nl(t);
    return f ? {
      intent: "mission",
      confidence: e.forcedIntent === "mission" ? 0.95 : 0.84,
      reason: e.forcedIntent === "mission" ? "Confirmed as a mission." : "Detected a mission creation phrase.",
      input: {
        title: f,
        summary: t,
        dueAt: m
      }
    } : {
      intent: "unresolved",
      confidence: 0.25,
      reason: "I understood this as a mission, but I could not find a clear mission title."
    };
  }
  const o = Zo(t);
  if (!o)
    return {
      intent: "unresolved",
      confidence: 0.2,
      reason: "I could not find a date or day to attach to this."
    };
  const s = Rr(Fd(t));
  if (!s)
    return {
      intent: "unresolved",
      confidence: 0.25,
      reason: "I found a date, but not a clear title."
    };
  if (e.forcedIntent === "appointment" || !e.forcedIntent && Bd(t))
    return {
      intent: "appointment",
      confidence: e.forcedIntent === "appointment" ? 0.95 : 0.86,
      reason: e.forcedIntent === "appointment" ? "Confirmed as an appointment." : "Detected an appointment-like phrase with a date or time.",
      input: {
        title: s,
        startsAt: o,
        sourceSystem: "natural_language",
        notes: t
      }
    };
  if (e.forcedIntent === "todo" || Gd(t)) {
    const m = tl(t, s, o, n), f = e.mode !== "confirm" && qd(t);
    return {
      intent: "todo",
      confidence: f ? 0.58 : e.forcedIntent === "todo" ? 0.95 : 0.82,
      reason: f ? "This looks like a call, but it could be either a todo or an appointment." : e.forcedIntent === "todo" ? "Confirmed as a todo." : m.matchedProject ? `Detected a dated task and matched it to project ${m.matchedProject.title}.` : m.matchedPerson ? `Detected a dated task and matched it to ${m.matchedPerson.name}.` : "Detected a task or due-date phrase with a date.",
      requiresConfirmation: f,
      confirmationOptions: f ? ["todo", "appointment"] : void 0,
      input: m.input,
      matchedProjectId: (r = m.matchedProject) == null ? void 0 : r.id,
      matchedProjectTitle: (i = m.matchedProject) == null ? void 0 : i.title,
      matchedMissionId: (a = m.matchedMission) == null ? void 0 : a.id,
      matchedMissionTitle: (c = m.matchedMission) == null ? void 0 : c.title,
      matchedPersonId: (d = m.matchedPerson) == null ? void 0 : d.id,
      matchedPersonName: (l = m.matchedPerson) == null ? void 0 : l.name
    };
  }
  return {
    intent: "unresolved",
    confidence: 0.35,
    reason: "I found a date, but the intent was not clear enough to create a record."
  };
}, tn = (e) => {
  const t = ol(e);
  if (t.intent !== "unresolved" && e.mode === "preview")
    return {
      ok: !1,
      originalText: e.text,
      candidate: t,
      message: t.requiresConfirmation ? `${t.reason} Review and choose how to save it.` : `Review parsed ${t.intent} before saving.`
    };
  if (t.intent !== "unresolved" && t.requiresConfirmation && e.mode !== "confirm")
    return {
      ok: !1,
      originalText: e.text,
      candidate: t,
      message: `${t.reason} Confirm whether to create a todo or an appointment.`
    };
  if (t.intent === "appointment") {
    const n = Zn(t.input);
    return {
      ok: !0,
      originalText: e.text,
      candidate: t,
      createdRecord: n,
      snapshot: _(),
      message: `Captured appointment: ${n.title}.`
    };
  }
  if (t.intent === "todo") {
    const n = ot(t.input);
    return {
      ok: !0,
      originalText: e.text,
      candidate: t,
      createdRecord: n,
      snapshot: _(),
      message: t.matchedProjectTitle ? `Captured todo under ${t.matchedProjectTitle}: ${n.title}.` : `Captured todo: ${n.title}.`
    };
  }
  if (t.intent === "mission") {
    const n = eo(t.input);
    return {
      ok: !0,
      originalText: e.text,
      candidate: t,
      createdRecord: n,
      snapshot: _(),
      message: `Captured mission: ${n.title}.`
    };
  }
  return {
    ok: !1,
    originalText: e.text,
    candidate: t,
    message: t.reason
  };
}, uo = (e) => {
  if (e.intent === "appointment") {
    const n = Zn(e.input);
    return {
      ok: !0,
      originalText: e.originalText ?? e.input.notes ?? e.input.title,
      candidate: {
        intent: "appointment",
        confidence: 1,
        reason: "Saved from reviewed capture draft.",
        input: e.input
      },
      createdRecord: n,
      snapshot: _(),
      message: `Captured appointment: ${n.title}.`
    };
  }
  if (e.intent === "mission") {
    const n = eo(e.input);
    return {
      ok: !0,
      originalText: e.originalText ?? e.input.summary ?? e.input.title,
      candidate: {
        intent: "mission",
        confidence: 1,
        reason: "Saved from reviewed capture draft.",
        input: e.input
      },
      createdRecord: n,
      snapshot: _(),
      message: `Captured mission: ${n.title}.`
    };
  }
  const t = ot(e.input);
  return {
    ok: !0,
    originalText: e.originalText ?? e.input.notes ?? e.input.title,
    candidate: {
      intent: "todo",
      confidence: 1,
      reason: "Saved from reviewed capture draft.",
      input: e.input
    },
    createdRecord: t,
    snapshot: _(),
    message: `Captured todo: ${t.title}.`
  };
}, sl = (e) => {
  const t = e == null ? void 0 : e.trim().toLowerCase();
  return t && t.length > 0 ? t : null;
}, rl = (e) => {
  const t = (e ?? "").replace(/\D/g, "");
  return t.length === 11 && t.startsWith("1") ? `+1 ${t.slice(1, 4)}-${t.slice(4, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 3)}) ${t.slice(3, 6)}-${t.slice(6)}` : null;
}, il = (e) => {
  const t = e == null ? void 0 : e.replace(/\s+/g, " ").trim();
  return t && t.length >= 12 ? t : null;
}, mo = (e) => [...new Set(e.filter((t) => !!t))], al = (e) => {
  const t = e.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/g) ?? [];
  return mo(t.map(rl));
}, cl = (e) => {
  const t = [], n = [
    /\b(?:billing|invoice|mailing)\s+address(?:\s+is)?[:\s]+(.{12,140}?)(?:[.;]|$)/i,
    /\bsend\s+(?:the\s+)?(?:invoice|check|payment)\s+to[:\s]+(.{12,140}?)(?:[.;]|$)/i,
    /\bmail\s+(?:it|payment|invoice)\s+to[:\s]+(.{12,140}?)(?:[.;]|$)/i
  ];
  for (const o of n) {
    const s = e.match(o), r = s == null ? void 0 : s[1], i = il(r);
    i && (!/\d/.test(i) || !/\b(?:st|street|ave|avenue|rd|road|blvd|drive|dr|lane|ln|way|suite|ste)\b/i.test(i) || t.push(i));
  }
  return mo(t);
}, dl = (e) => [...e].sort(
  (t, n) => new Date(n.receivedAt).getTime() - new Date(t.receivedAt).getTime()
)[0] ?? null, gn = (e, t) => {
  const n = /* @__PURE__ */ new Map();
  for (const o of e)
    for (const s of t(o))
      n.set(s, [...n.get(s) ?? [], o]);
  return [...n.entries()].map(
    ([o, s]) => ({
      value: o,
      messages: s
    })
  );
}, _n = (e, t, n, o, s) => {
  const r = dl(n.messages);
  return r ? {
    personId: e.id,
    personName: e.name,
    field: t,
    inferredValue: n.value,
    messageCount: n.messages.length,
    lastSeenAt: r.receivedAt,
    latestSubject: r.subject,
    confidence: Math.min(o + n.messages.length * s, 0.97)
  } : null;
}, ll = (e, t) => {
  const n = [];
  for (const o of e) {
    const s = t.filter((r) => r.matchedPersonId === o.id);
    if (s.length !== 0) {
      if (!o.email) {
        const r = gn(
          s,
          (i) => mo([sl(i.senderEmail)])
        );
        if (r.length === 1) {
          const i = _n(o, "email", r[0], 0.78, 0.06);
          i && n.push(i);
        }
      }
      if (!o.phone) {
        const r = gn(
          s,
          (a) => al([a.summary ?? "", a.subject].join(" "))
        ).sort((a, c) => c.messages.length - a.messages.length || a.value.localeCompare(c.value)), i = r[0];
        if (i && i.messages.length >= 1 && (!r[1] || r[0].messages.length > r[1].messages.length)) {
          const a = _n(o, "phone", i, 0.66, 0.08);
          a && n.push(a);
        }
      }
      if (!o.billingAddress) {
        const r = gn(
          s,
          (a) => cl([a.summary ?? "", a.subject].join(" "))
        ).sort((a, c) => c.messages.length - a.messages.length || a.value.localeCompare(c.value)), i = r[0];
        if (i && i.messages.length >= 1 && (!r[1] || i.messages.length > r[1].messages.length)) {
          const a = _n(o, "billingAddress", i, 0.7, 0.1);
          a && n.push(a);
        }
      }
    }
  }
  return n.sort(
    (o, s) => new Date(s.lastSeenAt).getTime() - new Date(o.lastSeenAt).getTime() || o.personName.localeCompare(s.personName) || o.field.localeCompare(s.field)
  );
}, ul = {
  messages: [],
  contactSuggestionDismissals: []
}, Qe = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), ml = (e) => Qe(e).split(" ").filter((t) => t.length >= 2), Mn = (e) => {
  const t = e == null ? void 0 : e.trim().toLowerCase();
  return t && t.length > 0 ? t : null;
}, pl = (e) => [e.name, ...e.aliases], fl = (e, t, n) => {
  const o = Mn(t);
  if (o) {
    const i = n.filter(
      (a) => Mn(a.email) === o
    );
    if (i.length === 1)
      return i[0];
  }
  const s = Qe(e ?? "");
  if (!s)
    return null;
  const r = n.filter(
    (i) => pl(i).some(
      (a) => Qe(a) === s
    )
  );
  return r.length === 1 ? r[0] : null;
}, gl = (e, t) => {
  const n = /* @__PURE__ */ new Set();
  for (const o of t) {
    const s = Mn(o.senderEmail);
    if (!s || n.has(s))
      continue;
    if (n.add(s), fl(
      o.senderName,
      o.senderEmail,
      [e]
    ))
      return s;
  }
  return null;
}, _l = (e) => /\b(email|e mail|mail address)\b/i.test(e) ? "email" : /\b(phone|cell|mobile|number|call)\b/i.test(e) ? "phone" : /\b(billing address|bill address|invoice address|mailing address|address)\b/i.test(e) ? "billingAddress" : /\b(contact|reach|get ahold|get hold)\b/i.test(e) ? "contact" : /\b(project|projects|mission|missions|involved|working with|part of|relationship|relationships|tied to|connected to)\b/i.test(e) ? "relationships" : "profile", hl = (e, t) => {
  const n = Qe(e), o = [t.name, ...t.aliases];
  if (o.find((a) => {
    const c = Qe(a);
    return c && n.includes(c);
  }))
    return 100;
  const r = o.flatMap(ml), i = r.filter((a) => n.includes(a)).length;
  return i === 0 ? 0 : Math.round(i / r.length * 85);
}, yl = (e, t) => {
  const n = t.map((o) => ({
    person: o,
    score: hl(e, o)
  })).filter((o) => o.score > 0).sort((o, s) => s.score - o.score || o.person.name.localeCompare(s.person.name));
  return n.length === 0 ? null : n[1] && n[1].score === n[0].score ? "ambiguous" : n[0].person;
}, El = (e) => [
  e.email ? `email: ${e.email}` : null,
  e.phone ? `phone: ${e.phone}` : null,
  e.billingAddress ? `billing address: ${e.billingAddress}` : null
].filter((n) => !!n).join("; "), es = (e, t) => {
  const n = new Map(t.projects.map((a) => [a.id, a.title])), o = new Map(t.missions.map((a) => [a.id, a.title])), s = t.personWorkLinks.filter((a) => a.personId === e.id && a.entityKind === "project").map((a) => {
    const c = n.get(a.entityId);
    return c ? `${c} (${a.relationship})` : null;
  }).filter((a) => !!a), r = t.personWorkLinks.filter((a) => a.personId === e.id && a.entityKind === "mission").map((a) => {
    const c = o.get(a.entityId);
    return c ? `${c} (${a.relationship})` : null;
  }).filter((a) => !!a);
  return [
    s.length > 0 ? `projects: ${[...new Set(s)].join(", ")}` : null,
    r.length > 0 ? `missions: ${[...new Set(r)].join(", ")}` : null
  ].filter((a) => !!a).join("; ");
}, Tl = (e, t) => ll(e, t.messages).filter(
  (o) => !t.contactSuggestionDismissals.some(
    (s) => s.personId === o.personId && s.field === o.field && s.inferredValue.toLowerCase() === o.inferredValue.toLowerCase()
  )
), ts = (e, t, n) => n.find(
  (o) => o.personId === e.id && o.field === t
) ?? null, kl = (e) => e === "billingAddress" ? "billing address" : e, x = (e, t, n, o) => {
  if (t === "email")
    return {
      value: e.email ?? gl(e, o),
      inferred: !e.email
    };
  if (t === "phone") {
    if (e.phone)
      return { value: e.phone, inferred: !1 };
    const r = ts(e, "phone", n);
    return r ? { value: r.inferredValue, inferred: !0 } : { value: null, inferred: !1 };
  }
  if (e.billingAddress)
    return { value: e.billingAddress, inferred: !1 };
  const s = ts(e, "billingAddress", n);
  return s ? { value: s.inferredValue, inferred: !0 } : { value: null, inferred: !1 };
}, Sl = (e, t, n, o, s) => {
  if (t === "email")
    return x(e, "email", o, s);
  if (t === "phone")
    return x(e, "phone", o, s);
  if (t === "billingAddress")
    return x(e, "billingAddress", o, s);
  if (t === "contact") {
    const i = e.email ? `email: ${e.email}` : x(e, "email", o, s).value ? `email (inferred): ${x(e, "email", o, s).value}` : null, a = e.phone ? `phone: ${e.phone}` : x(e, "phone", o, s).value ? `phone (inferred): ${x(e, "phone", o, s).value}` : null, c = e.billingAddress ? `billing address: ${e.billingAddress}` : x(e, "billingAddress", o, s).value ? `billing address (inferred): ${x(e, "billingAddress", o, s).value}` : null;
    return { value: [i, a, c].filter((l) => !!l).join("; ") || null, inferred: !e.email && !e.phone && !e.billingAddress };
  }
  return t === "relationships" ? { value: es(e, n) || null, inferred: !1 } : { value: [
    e.roleSummary ? `role: ${e.roleSummary}` : null,
    El(e) || null,
    e.email ? null : `email (inferred): ${x(e, "email", o, s).value}`,
    e.phone ? null : `phone (inferred): ${x(e, "phone", o, s).value}`,
    e.billingAddress ? null : `billing address (inferred): ${x(e, "billingAddress", o, s).value}`,
    es(e, n) || null,
    e.notes ? `notes: ${e.notes}` : null
  ].filter((i) => !!i).join("; ") || null, inferred: !1 };
}, ns = (e) => e === "billingAddress" ? "billing address" : e === "relationships" ? "relationships" : e, bl = (e, t, n = ul) => {
  const o = e.text.trim();
  if (!o)
    return {
      ok: !1,
      reason: "Ask for a person record first."
    };
  const s = yl(o, t.people);
  if (!s)
    return {
      ok: !1,
      reason: "I could not match that to a saved person."
    };
  if (s === "ambiguous")
    return {
      ok: !1,
      reason: "I found more than one possible person. Use the full name."
    };
  const r = Tl(t.people, n), i = _l(o), a = Sl(s, i, t, r, n.messages);
  return a.value ? a.inferred && (i === "email" || i === "phone" || i === "billingAddress") ? {
    ok: !0,
    personId: s.id,
    personName: s.name,
    field: i,
    value: a.value,
    message: `${s.name}'s ${kl(i)} from recent synced mail: ${a.value}. It is not saved on the person record yet.`
  } : {
    ok: !0,
    personId: s.id,
    personName: s.name,
    field: i,
    value: a.value,
    message: `${s.name}'s ${ns(i)}: ${a.value}`
  } : {
    ok: !1,
    reason: `${s.name} does not have a saved ${ns(i)} yet.`
  };
}, po = (e) => {
  const t = _(), n = lr();
  return bl(e, t, {
    messages: n.messages,
    contactSuggestionDismissals: n.contactSuggestionDismissals
  });
}, wl = {
  focus_report: ["work-graph"],
  daily_report: ["daily-brief", "work-graph", "inbox-triage"],
  appointment_report: ["daily-brief"],
  capture: [],
  conversation_review: ["chat-triage"],
  tell_more: ["daily-brief", "work-graph"],
  context_action: ["work-graph", "daily-brief"],
  work_update_status: ["work-graph"],
  work_update_due_date: ["work-graph"],
  work_clear_waiting_on: ["work-graph", "contact-lookup"],
  work_assign_waiting_on: ["work-graph", "contact-lookup"],
  work_update_confirmation: ["work-graph"],
  person_lookup: ["contact-lookup"],
  work_lookup: ["work-graph"],
  unresolved: []
}, Al = {
  desktop: [
    "daily-brief",
    "work-graph",
    "contact-lookup",
    "inbox-triage",
    "email-noise-filter",
    "chat-triage"
  ],
  slack: ["daily-brief", "work-graph", "contact-lookup", "inbox-triage", "chat-triage"],
  voice: ["daily-brief", "work-graph", "contact-lookup"],
  companion: ["daily-brief", "work-graph", "contact-lookup", "inbox-triage", "chat-triage"]
}, Il = (e) => ({
  id: e.id,
  name: e.name,
  description: e.description,
  surfaces: e.surfaces,
  relativePath: e.relativePath
}), vl = (e) => wl[e] ?? [], Ol = (e, t, n = "desktop") => {
  const o = new Set(vl(e)), s = new Set(Al[n] ?? []);
  return t.skills.filter(
    (r) => o.has(r.id) && s.has(r.id) && r.surfaces.includes(n)
  ).map(Il);
}, Dr = (e) => /\b(?:waiting on|waiting for|wait on)\b/i.test(e) && !/\b(what|which|show|tell|do i have|am i|are we|give me|check)\b/i.test(e) && !e.trim().endsWith("?") && !/\b(sent|handled|answered|replied|responded|got it|received|came through|done|complete|completed|clear|remove|not waiting|no longer waiting)\b/i.test(
  e
), Ze = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), Pn = (e) => Ze(e).split(" ").filter((t) => t.length >= 3), Nl = (e, t) => {
  const n = Ze(e), o = [t.name, ...t.aliases];
  if (o.some((i) => n.includes(Ze(i))))
    return 100;
  const s = o.flatMap(Pn);
  if (s.length === 0)
    return 0;
  const r = s.filter((i) => n.includes(i));
  return r.length > 0 ? Math.min(90, r.length * 45) : 0;
}, os = (e, t) => {
  const n = Ze(e), o = Ze(t);
  if (!o)
    return 0;
  if (n.includes(o))
    return 100;
  const s = Pn(t);
  if (s.length === 0)
    return 0;
  const r = Pn(e), i = s.filter((a) => r.includes(a));
  return i.length === 0 ? 0 : r.length <= 2 && i.length === r.length ? 65 : Math.max(40, Math.round(i.length / s.length * 80));
}, Cl = (e) => {
  var n;
  const t = e.match(/\b(?:waiting on|waiting for|wait on)\b.+?\bfor\s+(.+)$/i);
  return ((n = t == null ? void 0 : t[1]) == null ? void 0 : n.trim()) ?? e;
}, Rl = (e, t) => {
  if (!Dr(e))
    return {
      ok: !1,
      reason: "This does not look like a waiting-on assignment request."
    };
  const n = t.people.map((d) => ({ person: d, score: Nl(e, d) })).filter((d) => d.score >= 50).sort((d, l) => l.score - d.score || d.person.name.localeCompare(l.person.name)), [o, s] = n;
  if (!o)
    return {
      ok: !1,
      reason: "I understand this as a waiting-on assignment, but I could not safely match a person."
    };
  if (s && o.score - s.score < 12)
    return {
      ok: !1,
      reason: "I found more than one possible person. Name the person more specifically."
    };
  const r = Cl(e), i = t.todos.filter((d) => d.status !== "completed").map((d) => ({
    todo: d,
    score: Math.max(os(e, d.title), os(r, d.title))
  })).filter((d) => d.score >= 50).sort((d, l) => l.score - d.score || d.todo.title.localeCompare(l.todo.title)), [a, c] = i;
  if (!a)
    return {
      ok: !1,
      reason: "I understand this as a waiting-on assignment, but I could not safely match one active todo."
    };
  if (c && a.score - c.score < 12) {
    const d = i.slice(0, 5).map(
      (l, m) => ({
        actionId: `todo:${l.todo.id}:assign_waiting_on:${o.person.id}:${m + 1}`,
        ordinal: m + 1,
        title: l.todo.title,
        entityKind: "todo",
        entityId: l.todo.id,
        command: "assign_waiting_on",
        personId: o.person.id
      })
    );
    return {
      ok: !1,
      reason: "I found multiple possible todos for that waiting-on assignment.",
      confirmation: {
        title: "Assign Waiting-On To Which Todo?",
        prompt: `I found multiple active todos that could be waiting on ${o.person.name}. Which one?`,
        actions: d
      }
    };
  }
  return {
    ok: !0,
    todo: a.todo,
    person: o.person,
    confidence: Math.min(Math.min(a.score, o.score) / 100, 0.95)
  };
}, $l = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
], yt = (e) => String(e).padStart(2, "0"), Ll = (e) => `${e.getFullYear()}-${yt(e.getMonth() + 1)}-${yt(e.getDate())}T${yt(e.getHours())}:${yt(e.getMinutes())}`, Et = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), ss = (e, t) => {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}, Dl = (e) => {
  var r;
  const t = e.match(/\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\b/i);
  if (!t)
    return null;
  let n = Number(t[1] ?? t[4]);
  const o = t[2] || t[5] ? Number(t[2] ?? t[5]) : 0, s = (r = t[3] ?? t[6]) == null ? void 0 : r.toLowerCase();
  return s === "pm" && n < 12 && (n += 12), s === "am" && n === 12 && (n = 0), !s && n >= 1 && n <= 7 && (n += 12), n > 23 || o > 59 ? null : { hour: n, minute: o };
}, fo = (e, t = /* @__PURE__ */ new Date()) => {
  const n = e.toLowerCase();
  let o = Et(t);
  if (/\btoday\b/.test(n))
    o = Et(t);
  else if (/\btomorrow\b/.test(n))
    o = ss(Et(t), 1);
  else {
    const r = $l.findIndex(
      (i) => new RegExp(`\\b${i}\\b`).test(n)
    );
    if (r >= 0) {
      const i = t.getDay(), a = (r - i + 7) % 7 || 7;
      o = ss(Et(t), a);
    } else {
      const i = n.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
      if (!i)
        return null;
      const a = Number(i[1]) - 1, c = Number(i[2]), d = i[3] ? Number(i[3].length === 2 ? `20${i[3]}` : i[3]) : t.getFullYear();
      o = new Date(d, a, c);
    }
  }
  const s = Dl(e);
  return s ? o.setHours(s.hour, s.minute, 0, 0) : o.setHours(17, 0, 0, 0), Ll(o);
}, Ml = (e) => /\b(where am i|status|status report|where do i stand|how am i doing|tell me where|what'?s going on)\b/i.test(
  e
), Pl = (e) => /\b(daily report|status report|morning report|today'?s report|what matters today|what do i need today|brief me|briefing|what'?s on deck)\b/i.test(
  e
) && !/\b(on|for|about)\s+[a-z0-9]/i.test(e), xl = (e) => /\b(appointment|appointments|calendar|calender|event|events|schedule|what'?s on my calendar|what do i have)\b/i.test(
  e
) && /\b(today|tomorrow|upcoming|next|what|show|tell|any|have|do i have|on deck)\b/i.test(e), Ul = (e) => /\b(review|triage|analyze|check|scan|import)\b/i.test(e) && /\b(conversation|chat|thread|messages|dm|dms|texts|sms|whatsapp|slack)\b/i.test(e), jl = (e) => /\bslack\b/i.test(e) ? "slack" : /\bwhatsapp\b/i.test(e) ? "whatsapp" : /\b(sms|texts|text messages)\b/i.test(e) ? "sms" : /\b(paste|manual|import)\b/i.test(e) ? "manual" : "unknown", Kl = (e) => /\b(upcoming|next|future|on deck)\b/i.test(e) ? "upcoming" : /\btomorrow\b/i.test(e) ? "tomorrow" : "today", Fl = (e) => /\b(tell me more|more|go on|expand|details|go deeper|what else)\b/i.test(e), Wl = (e) => /^(yes|y|yeah|yep|sure|ok|okay|do it|go ahead|sounds good|please do|no|n|nope|not now|cancel|never mind|1|2|3|4|5|first|second|third|fourth|fifth|the first one|the second one|the third one)$/i.test(
  e.trim()
), Ue = (e) => /\b(that|it|this|one|item|\d{1,2}|first|top|second|third|fourth|fifth)\b/i.test(e), Xl = (e) => Wl(e) || /\b(complete|completed|done|mark done|mark it done|finish|finished)\b/i.test(e) && /\b(\d{1,2}|first|top|second|third|fourth|fifth|that|it|this)\b/i.test(e) || /\b(reactivate|resume|unpause|reopen|make it active|start it again)\b/i.test(e) && Ue(e) || /\b(pause|hold|put it on hold|park it)\b/i.test(e) && Ue(e) || /\b(move|reschedule|shift|change|set|push|make)\b/i.test(e) && /\b(due|deadline|to|for|on|by)\b/i.test(e) && !!fo(e) && Ue(e) || /\b(clear|remove|not waiting|no longer waiting|got it|received|came through)\b/i.test(e) && /\b(waiting|flag|waiting on)\b/i.test(e) && Ue(e) || /\b(open|show|pull up|bring up)\b/i.test(e) && /\b(focus report|project focus|mission focus|related project)\b/i.test(e) && Ue(e), Hl = (e) => /\b(mark|complete|completed|done|finish|finished|close|clear)\b/i.test(e) && /\b(done|complete|completed|finished|closed|cleared)\b/i.test(e) && !/\b(\d{1,2}|first|top|second|third|fourth|fifth)\b/i.test(e), Bl = (e) => /\b(move|reschedule|shift|change|set|push|make)\b/i.test(e) && /\b(due|deadline|to|for|on|by)\b/i.test(e) && !!fo(e), Gl = (e) => /\b(sent|handled|answered|replied|responded|got it|received|came through|done|complete|completed|clear|remove|not waiting|no longer waiting)\b/i.test(
  e
) && /\b(waiting|sent|replied|responded|answered|got|received|clear|remove)\b/i.test(e), zl = (e) => (/\b(waiting on|waiting for|what am i waiting on|what are we waiting on)\b/i.test(e) || /\b(slipping|overdue|falling behind|behind on|at risk)\b/i.test(e) || /\b(quick win|quick wins|knock out quickly|knock out|easy win|easy wins)\b/i.test(e) || /\b(money related|money-related|billing items|invoice items|finance items)\b/i.test(e) || /\b(blocked|stuck|paused)\b/i.test(e)) && (/\b(what|which|show|tell|do i have|am i|are we|give me|check)\b/i.test(e) || e.trim().endsWith("?")), Yl = (e) => /\b(email|e mail|phone|cell|mobile|number|billing address|invoice address|mailing address|contact|reach|get ahold|get hold|project|projects|mission|missions|involved|working with|part of|relationship|relationships)\b/i.test(
  e
) && (/\b(give me|what is|what'?s|show me|find|look up|lookup|do i have|can you)\b/i.test(e) || /'s\s+(email|phone|number|contact|address)\b/i.test(e) || e.trim().endsWith("?")), et = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), Mr = (e) => et(e).split(" ").filter((t) => t.length >= 3), Lt = (e, t) => {
  const n = et(e), o = et(t);
  if (!o)
    return 0;
  if (n.includes(o))
    return 100;
  const s = Mr(t);
  if (s.length === 0)
    return 0;
  const r = s.filter((i) => n.includes(i));
  return r.length === 0 ? 0 : Math.round(r.length / s.length * 80);
}, Pr = (e, t) => {
  const n = et(e), o = [t.name, ...t.aliases];
  if (o.some((i) => n.includes(et(i))))
    return 100;
  const s = o.flatMap(Mr);
  if (s.length === 0)
    return 0;
  const r = s.filter((i) => n.includes(i));
  return r.length === 0 ? 0 : Math.min(90, r.length * 45);
}, ql = (e, t, n, o) => ({
  actionId: `${e.entityKind}:${e.entityId}:${n}:${t}`,
  ordinal: t,
  title: e.title,
  entityKind: e.entityKind,
  entityId: e.entityId,
  command: n,
  dueAt: o
}), hn = (e, t) => `${e}
${t.map((n) => `${n.ordinal}. ${n.title}`).join(`
`)}`, Vl = (e, t) => `${e}
${t.map((n) => `${n.ordinal}. ${n.title}`).join(`
`)}`, Jl = (e, t, n) => {
  const o = [
    ...t.filter((s) => s.status !== "completed").map((s) => ({
      entityKind: "mission",
      entityId: s.id,
      title: s.title,
      score: Lt(e, s.title)
    })),
    ...n.filter((s) => s.status !== "completed").map((s) => ({
      entityKind: "project",
      entityId: s.id,
      title: s.title,
      score: Lt(e, s.title)
    }))
  ].filter((s) => s.score > 0).sort((s, r) => r.score - s.score || s.title.localeCompare(r.title));
  return o.length === 0 || o[1] && o[1].score === o[0].score ? null : o[0];
}, xr = (e, t, n) => [
  ...t.filter((o) => o.status !== "completed").map((o) => ({
    entityKind: "todo",
    entityId: o.id,
    title: o.title,
    score: Lt(e, o.title)
  })),
  ...n.filter((o) => o.status !== "completed").map((o) => ({
    entityKind: "deadline",
    entityId: o.id,
    title: o.title,
    score: Lt(e, o.title)
  }))
].filter((o) => o.score > 0).sort((o, s) => s.score - o.score || o.title.localeCompare(s.title)), Ur = (e, t, n) => {
  const o = xr(e, t, n);
  if (o.length === 0)
    return null;
  const [s, r] = o;
  return !s || s.score < 50 || r && s.score - r.score < 12 ? null : s;
}, rs = (e, t, n, o, s) => xr(e, t, n).filter((r) => r.score >= 50).slice(0, 5).map((r, i) => ql(r, i + 1, o, s)), Ql = (e, t, n) => Ur(e, t, n), Zl = (e, t, n) => {
  const o = t.map((a) => ({
    person: a,
    score: Pr(e, a)
  })).filter((a) => a.score > 0).sort((a, c) => c.score - a.score || a.person.name.localeCompare(c.person.name)), [s, r] = o;
  if (!s || s.score < 50 || r && s.score - r.score < 12)
    return null;
  const i = n.filter(
    (a) => a.status !== "completed" && a.waitingOnPersonId === s.person.id
  );
  return i.length !== 1 ? null : {
    person: s.person,
    todo: i[0],
    score: s.score
  };
}, eu = (e, t, n) => {
  const o = t.map((a) => ({
    person: a,
    score: Pr(e, a)
  })).filter((a) => a.score >= 50).sort((a, c) => c.score - a.score || a.person.name.localeCompare(c.person.name)), [s] = o;
  if (!s)
    return null;
  const r = n.filter(
    (a) => a.status !== "completed" && a.waitingOnPersonId === s.person.id
  );
  if (r.length <= 1)
    return null;
  const i = r.slice(0, 5).map(
    (a, c) => ({
      actionId: `todo:${a.id}:clear_waiting_on:${c + 1}`,
      ordinal: c + 1,
      title: a.title,
      entityKind: "todo",
      entityId: a.id,
      command: "clear_waiting_on",
      personId: s.person.id
    })
  );
  return {
    person: s.person,
    actions: i
  };
}, tu = (e, t = "desktop") => ({
  ...e,
  skillReferences: Ol(
    e.intent,
    Ln(),
    t
  )
}), nu = (e) => {
  const t = e.text.trim();
  if (!t)
    return {
      intent: "unresolved",
      confidence: 0,
      message: "Tell Praxis what you want first."
    };
  if (Fl(t))
    return {
      intent: "tell_more",
      confidence: 0.8,
      message: "Opening the expanded status details."
    };
  if (Xl(t))
    return {
      intent: "context_action",
      confidence: 0.82,
      message: "Resolving this against the current report."
    };
  if (Yl(t))
    return {
      intent: "person_lookup",
      confidence: 0.82,
      message: "Looking up that person record."
    };
  if (Ul(t))
    return {
      intent: "conversation_review",
      sourceSystem: jl(t),
      confidence: 0.82,
      message: "Conversation review is ready for manual import. Open Talk to Praxis, use Import chat for review, paste the useful exchange, then review any suggested todo or project in Review Inbox."
    };
  if (Hl(t)) {
    const s = _(), r = Ur(t, s.todos, s.deadlines);
    if (!r) {
      const i = rs(
        t,
        s.todos,
        s.deadlines,
        "complete"
      );
      if (i.length > 1) {
        const a = "I found a few possible items to complete. Which one?";
        return {
          intent: "work_update_confirmation",
          title: "Complete Which Item?",
          prompt: a,
          actions: i,
          confidence: 0.6,
          message: hn(a, i)
        };
      }
      return {
        intent: "unresolved",
        confidence: 0.35,
        message: "I understand this as a completion request, but I could not safely match one active todo or deadline."
      };
    }
    return {
      intent: "work_update_status",
      entityKind: r.entityKind,
      entityId: r.entityId,
      title: r.title,
      status: "completed",
      confidence: Math.min(r.score / 100, 0.95),
      message: `Marking ${r.title} completed.`
    };
  }
  if (Bl(t)) {
    const s = fo(t), r = _(), i = Ql(t, r.todos, r.deadlines);
    if (!s || !i) {
      const a = s ? rs(
        t,
        r.todos,
        r.deadlines,
        "update_due_date",
        s
      ) : [];
      if (a.length > 1) {
        const c = `I found a few possible items to move to ${s}. Which one?`;
        return {
          intent: "work_update_confirmation",
          title: "Move Which Item?",
          prompt: c,
          actions: a,
          confidence: 0.6,
          message: hn(c, a)
        };
      }
      return {
        intent: "unresolved",
        confidence: 0.35,
        message: "I understand this as a due-date change, but I could not safely match one active todo or deadline with a clear date."
      };
    }
    return {
      intent: "work_update_due_date",
      entityKind: i.entityKind,
      entityId: i.entityId,
      title: i.title,
      dueAt: s,
      confidence: Math.min(i.score / 100, 0.95),
      message: `Moving ${i.title} to ${s}.`
    };
  }
  if (Dr(t)) {
    const s = _(), r = Rl(t, s);
    return r.ok ? {
      intent: "work_assign_waiting_on",
      todoId: r.todo.id,
      todoTitle: r.todo.title,
      personId: r.person.id,
      personName: r.person.name,
      confidence: r.confidence,
      message: `Marking ${r.todo.title} as waiting on ${r.person.name}.`
    } : r.confirmation && r.confirmation.actions.length > 1 ? {
      intent: "work_update_confirmation",
      title: r.confirmation.title,
      prompt: r.confirmation.prompt,
      actions: r.confirmation.actions,
      confidence: 0.6,
      message: Vl(
        r.confirmation.prompt,
        r.confirmation.actions
      )
    } : {
      intent: "unresolved",
      confidence: 0.35,
      message: r.reason
    };
  }
  if (Gl(t)) {
    const s = _(), r = Zl(t, s.people, s.todos);
    if (!r) {
      const i = eu(t, s.people, s.todos);
      if (i && i.actions.length > 1) {
        const a = `I found multiple active todos waiting on ${i.person.name}. Which one should I clear?`;
        return {
          intent: "work_update_confirmation",
          title: "Clear Waiting On Which Todo?",
          prompt: a,
          actions: i.actions,
          confidence: 0.6,
          message: hn(a, i.actions)
        };
      }
      return {
        intent: "unresolved",
        confidence: 0.35,
        message: "I understand this as a waiting-on update, but I could not safely match exactly one active todo for that person."
      };
    }
    return {
      intent: "work_clear_waiting_on",
      todoId: r.todo.id,
      todoTitle: r.todo.title,
      personId: r.person.id,
      personName: r.person.name,
      confidence: Math.min(r.score / 100, 0.95),
      message: `Clearing waiting-on ${r.person.name} from ${r.todo.title}.`
    };
  }
  if (zl(t))
    return {
      intent: "work_lookup",
      confidence: 0.82,
      message: "Checking the current work graph."
    };
  if (Pl(t))
    return {
      intent: "daily_report",
      confidence: 0.82,
      message: "Opening the daily status report."
    };
  if (xl(t))
    return {
      intent: "appointment_report",
      range: Kl(t),
      confidence: 0.82,
      message: "Checking your calendar and opening the appointment report."
    };
  if (!Ml(t))
    return {
      intent: "capture",
      confidence: 0.75,
      message: "Route through natural-language capture."
    };
  const n = _(), o = Jl(t, n.missions, n.projects);
  return !o || o.score < 50 ? {
    intent: "unresolved",
    confidence: 0.35,
    message: "I understand this as a status question, but I could not match a mission or project."
  } : {
    intent: "focus_report",
    entityKind: o.entityKind,
    entityId: o.entityId,
    title: o.title,
    confidence: Math.min(o.score / 100, 0.95),
    message: `Opening focus report for ${o.title}.`
  };
}, go = (e) => tu(nu(e), e.surface ?? "desktop"), jr = 24 * 60 * 60 * 1e3, Le = {
  critical: 0,
  high: 10,
  normal: 20,
  low: 30
}, xn = (e) => e.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(), ou = (e) => xn(e).split(" ").filter((t) => t.length >= 2), Dt = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), K = (e, t) => {
  if (!e)
    return null;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor((Dt(n).getTime() - Dt(t).getTime()) / jr);
}, Kr = (e, t) => {
  if (!e)
    return null;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor((Dt(t).getTime() - Dt(n).getTime()) / jr);
}, su = (e, t) => {
  const n = xn(e), o = [t.name, ...t.aliases];
  if (o.find((a) => {
    const c = xn(a);
    return c && n.includes(c);
  }))
    return 100;
  const r = o.flatMap(ou);
  if (r.length === 0)
    return 0;
  const i = r.filter((a) => n.includes(a)).length;
  return i === 0 ? 0 : Math.round(i / r.length * 85);
}, ru = (e, t) => {
  const n = t.map((o) => ({
    person: o,
    score: su(e, o)
  })).filter((o) => o.score > 0).sort((o, s) => s.score - o.score || o.person.name.localeCompare(s.person.name));
  return n.length === 0 ? null : n[1] && n[1].score === n[0].score ? "ambiguous" : n[0].person;
}, iu = (e) => {
  if (!e)
    return "no date";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}, ae = (e, t) => {
  const n = K(e, t);
  return n === null ? "no due date" : n < 0 ? `${Math.abs(n)} day${Math.abs(n) === 1 ? "" : "s"} overdue` : n === 0 ? "due today" : n === 1 ? "due tomorrow" : n <= 7 ? `due in ${n} days` : `due ${iu(e)}`;
}, it = (e, t) => {
  const n = new Map(t.map((s) => [s.id, s.title])), o = [];
  for (const s of e) {
    if (!s.missionId)
      continue;
    const r = n.get(s.missionId);
    r && o.push([s.id, r]);
  }
  return new Map(o);
}, De = (e, t, n) => {
  if (!e.projectId)
    return "standalone";
  const o = t.get(e.projectId);
  if (!o)
    return "standalone";
  const s = n.get(o.id);
  return s ? `project ${o.title}, mission ${s}` : `project ${o.title}`;
}, Fr = (e, t, n, o, s) => {
  if (e === "todo") {
    const i = n.todos.find((a) => a.id === t);
    return i ? De(i, o, s) : "todo";
  }
  if (e === "deadline") {
    const i = n.deadlines.find((a) => a.id === t);
    return i ? `${i.entityKind} deadline` : "deadline";
  }
  if (e === "project") {
    const i = o.get(t);
    if (!i)
      return "project";
    const a = s.get(i.id);
    return a ? `project in ${a}` : "project";
  }
  return n.missions.find((i) => i.id === t) ? "mission" : "work item";
}, Ee = (e) => ({
  entityKind: e.entityKind,
  entityId: e.entityId,
  title: e.title,
  detail: e.detail
}), Te = (e) => e.map((t, n) => `${n + 1}. ${t.title} (${t.detail})`).join(`
`), au = (e, t, n) => {
  const o = K(e.dueAt, t);
  return (o === null ? 80 : o < 0 ? 0 : o === 0 ? 5 : o === 1 ? 15 : 30 + o) + Le[e.priority] - Math.min(n, 30);
}, is = (e, t, n, o, s) => {
  const r = Math.max(Kr(e.updatedAt, t) ?? 0, 0), i = [
    ae(e.dueAt, t),
    r > 0 ? `waiting ${r} day${r === 1 ? "" : "s"}` : null,
    e.waitingOnPersonId && s ? `waiting on ${s.get(e.waitingOnPersonId) ?? "someone"}` : null,
    De(e, n, o)
  ].filter((a) => !!a);
  return {
    entityKind: "todo",
    entityId: e.id,
    title: e.title,
    detail: i.join(", "),
    rank: au(e, t, r)
  };
}, as = (e, t, n, o) => ({
  entityKind: "todo",
  entityId: e.id,
  title: e.title,
  detail: `${ae(e.dueAt, t)}, ${De(e, n, o)}`,
  rank: (K(e.dueAt, t) ?? 99) + Le[e.priority]
}), cs = (e, t) => ({
  entityKind: "deadline",
  entityId: e.id,
  title: e.title,
  detail: `${ae(e.dueAt, t)}, ${e.entityKind} deadline`,
  rank: (K(e.dueAt, t) ?? 99) + Le[e.priority]
}), cu = (e, t) => {
  const n = K(e.dueAt, t), o = e.estimatedMinutes ?? 20;
  return Le[e.priority] + (n !== null && n <= 0 ? -10 : n !== null && n <= 1 ? -5 : 0) + o;
}, du = (e, t, n, o) => ({
  entityKind: "todo",
  entityId: e.id,
  title: e.title,
  detail: [
    e.estimatedMinutes ? `about ${e.estimatedMinutes} minutes` : "quick action",
    ae(e.dueAt, t),
    De(e, n, o)
  ].join(", "),
  rank: cu(e, t)
}), lu = (e, t, n, o) => ({
  entityKind: "todo",
  entityId: e.id,
  title: e.title,
  detail: [ae(e.dueAt, t), De(e, n, o)].join(
    ", "
  ),
  rank: (K(e.dueAt, t) ?? 99) + Le[e.priority]
}), _o = (e, t, n, o, s) => {
  const r = K(t, s), i = Kr(o, s) ?? 0;
  return (e === "blocked" ? 0 : 20) + (r === null ? 50 : r < 0 ? -10 : r === 0 ? 0 : r) + Le[n] - i;
}, uu = (e, t, n, o, s) => ({
  entityKind: "todo",
  entityId: e.id,
  title: e.title,
  detail: [
    e.status,
    ae(e.dueAt, t),
    e.waitingOnPersonId ? `waiting on ${s.get(e.waitingOnPersonId) ?? "someone"}` : null,
    De(e, n, o)
  ].filter((r) => !!r).join(", "),
  rank: _o(e.status, e.dueAt, e.priority, e.updatedAt, t)
}), mu = (e, t, n, o, s) => ({
  entityKind: "project",
  entityId: e.id,
  title: e.title,
  detail: [
    e.status,
    ae(e.dueAt, t),
    Fr("project", e.id, n, o, s)
  ].join(", "),
  rank: _o(e.status, e.dueAt, "high", e.updatedAt, t)
}), pu = (e, t, n, o, s) => ({
  entityKind: "mission",
  entityId: e.id,
  title: e.title,
  detail: [
    e.status,
    ae(e.dueAt, t),
    Fr("mission", e.id, n, o, s)
  ].join(", "),
  rank: _o(e.status, e.dueAt, "high", e.updatedAt, t)
}), fu = (e) => e.length === 0 ? "You do not have any active todos currently marked as waiting on someone else." : `You have ${e.length} active waiting-on item${e.length === 1 ? "" : "s"}:
${Te(e)}`, gu = (e, t) => t.length === 0 ? `Nothing active is currently waiting on ${e}.` : `You are waiting on ${e} for ${t.length} active item${t.length === 1 ? "" : "s"}:
${Te(t)}`, _u = (e, t) => e.length === 0 && t.length === 0 ? "Nothing active looks overdue right now." : e.length === 0 ? `Nothing is technically overdue right now. Closest pressure points:
${Te(t)}` : `I see ${e.length} slipping item${e.length === 1 ? "" : "s"} right now:
${Te(e)}`, hu = (e) => e.length === 0 ? "I do not see any clean quick wins right now." : `Best quick wins right now:
${Te(e)}`, yu = (e) => e.length === 0 ? "No active money-related todos are recorded right now." : `Money-related items in play:
${Te(e)}`, Eu = (e) => e.length === 0 ? "I do not see any blocked or paused work right now." : `Blocked or paused work right now:
${Te(e)}`, Tu = (e, t) => {
  const n = _(), o = new Map(n.projects.map((d) => [d.id, d])), s = it(n.projects, n.missions), r = new Map(n.people.map((d) => [d.id, d.name])), i = n.todos.filter(
    (d) => d.status !== "completed" && !!d.waitingOnPersonId
  ), a = ru(e, n.people);
  if (a === "ambiguous")
    return {
      ok: !1,
      reason: "I found more than one possible person. Use the full name."
    };
  if (a) {
    const d = i.filter((l) => l.waitingOnPersonId === a.id).map((l) => is(l, t, o, s)).sort((l, m) => l.rank - m.rank || l.title.localeCompare(m.title)).slice(0, 5).map(Ee);
    return {
      ok: !0,
      kind: "waiting_on",
      itemCount: d.length,
      items: d,
      message: gu(a.name, d)
    };
  }
  const c = i.map((d) => is(d, t, o, s, r)).sort((d, l) => d.rank - l.rank || d.title.localeCompare(l.title)).slice(0, 5).map(Ee);
  return {
    ok: !0,
    kind: "waiting_on",
    itemCount: c.length,
    items: c,
    message: fu(c)
  };
}, ku = (e) => {
  const t = _(), n = new Map(t.projects.map((i) => [i.id, i])), o = it(t.projects, t.missions), s = [
    ...t.todos.filter((i) => i.status !== "completed" && (K(i.dueAt, e) ?? 1) < 0).map((i) => as(i, e, n, o)),
    ...t.deadlines.filter(
      (i) => i.status !== "completed" && (K(i.dueAt, e) ?? 1) < 0
    ).map((i) => cs(i, e))
  ].sort((i, a) => i.rank - a.rank || i.title.localeCompare(a.title)).slice(0, 5).map(Ee), r = [
    ...t.todos.filter((i) => {
      if (i.status === "completed")
        return !1;
      const a = K(i.dueAt, e);
      return a !== null && a >= 0 && a <= 1 && i.priority !== "low";
    }).map((i) => as(i, e, n, o)),
    ...t.deadlines.filter((i) => {
      if (i.status === "completed")
        return !1;
      const a = K(i.dueAt, e);
      return a !== null && a >= 0 && a <= 1 && i.priority !== "low";
    }).map((i) => cs(i, e))
  ].sort((i, a) => i.rank - a.rank || i.title.localeCompare(a.title)).slice(0, 3).map(Ee);
  return {
    ok: !0,
    kind: "slipping",
    itemCount: s.length,
    items: s,
    message: _u(s, r)
  };
}, Su = (e) => {
  const t = _(), n = new Map(t.projects.map((r) => [r.id, r])), o = it(t.projects, t.missions), s = t.todos.filter(
    (r) => r.status === "active" && r.quickAction && !r.waitingOnPersonId && (r.estimatedMinutes === null || r.estimatedMinutes <= 20)
  ).map((r) => du(r, e, n, o)).sort((r, i) => r.rank - i.rank || r.title.localeCompare(i.title)).slice(0, 5).map(Ee);
  return {
    ok: !0,
    kind: "quick_wins",
    itemCount: s.length,
    items: s,
    message: hu(s)
  };
}, bu = (e) => {
  const t = _(), n = new Map(t.projects.map((r) => [r.id, r])), o = it(t.projects, t.missions), s = t.todos.filter((r) => r.status !== "completed" && r.moneyRelated).map((r) => lu(r, e, n, o)).sort((r, i) => r.rank - i.rank || r.title.localeCompare(i.title)).slice(0, 5).map(Ee);
  return {
    ok: !0,
    kind: "money",
    itemCount: s.length,
    items: s,
    message: yu(s)
  };
}, wu = (e) => {
  const t = _(), n = new Map(t.projects.map((i) => [i.id, i])), o = it(t.projects, t.missions), s = new Map(t.people.map((i) => [i.id, i.name])), r = [
    ...t.todos.filter((i) => i.status === "blocked" || i.status === "paused").map(
      (i) => uu(i, e, n, o, s)
    ),
    ...t.projects.filter((i) => i.status === "blocked" || i.status === "paused").map((i) => mu(i, e, t, n, o)),
    ...t.missions.filter((i) => i.status === "blocked" || i.status === "paused").map((i) => pu(i, e, t, n, o))
  ].sort((i, a) => i.rank - a.rank || i.title.localeCompare(a.title)).slice(0, 6).map(Ee);
  return {
    ok: !0,
    kind: "blocked",
    itemCount: r.length,
    items: r,
    message: Eu(r)
  };
}, ho = (e) => {
  const t = e.text.trim();
  if (!t)
    return {
      ok: !1,
      reason: "Ask about the work graph first."
    };
  const n = /* @__PURE__ */ new Date();
  return /\b(waiting on|waiting for|waiting\b)\b/i.test(t) ? Tu(t, n) : /\b(slipping|overdue|falling behind|behind on|at risk)\b/i.test(t) ? ku(n) : /\b(quick win|quick wins|knock out quickly|knock out|easy win|easy wins)\b/i.test(t) ? Su(n) : /\b(money related|money-related|billing items|invoice items|finance items)\b/i.test(t) ? bu(n) : /\b(blocked|stuck|paused)\b/i.test(t) ? wu(n) : {
    ok: !1,
    reason: "I can answer waiting-on, slipping, quick-win, money-related, and blocked-work questions from the current work graph."
  };
}, Au = (e) => e.text.trim(), Un = (e, t) => ({
  required: !0,
  reason: e,
  confirmText: t
}), je = (e, t, n) => ({
  ok: !1,
  status: "requires_confirmation",
  mode: "write",
  intent: e,
  message: t,
  route: n,
  confirmation: Un(
    "Companion write actions require explicit confirmation before Praxis changes local state.",
    (n == null ? void 0 : n.intent) === "work_update_confirmation" ? "Repeat the same command with confirmed: true and the selectedActionId from the chosen action." : "Repeat the same command with confirmed: true."
  )
}), Iu = (e) => e === "complete" ? "completed" : e === "pause" ? "paused" : e === "reactivate" ? "active" : null, Wr = (e, t, n) => {
  const o = _(), s = e === "todo" ? o.todos.find((i) => i.id === t) : null, r = e === "deadline" ? o.deadlines.find((i) => i.id === t) : null;
  return e === "todo" && s ? (ee({
    entityKind: e,
    id: t,
    title: s.title,
    projectId: s.projectId ?? "",
    priority: s.priority,
    dueAt: n,
    moneyRelated: s.moneyRelated,
    quickAction: s.quickAction,
    estimatedMinutes: s.estimatedMinutes ?? void 0,
    waitingOnPersonId: s.waitingOnPersonId ?? "",
    notes: s.notes ?? ""
  }), {
    ok: !0,
    status: "executed",
    mode: "write",
    intent: "work_update_due_date",
    message: `${s.title} moved to ${n}.`,
    snapshot: te()
  }) : e === "deadline" && r ? (ee({
    entityKind: e,
    id: t,
    title: r.title,
    dueAt: n,
    priority: r.priority
  }), {
    ok: !0,
    status: "executed",
    mode: "write",
    intent: "work_update_due_date",
    message: `${r.title} moved to ${n}.`,
    snapshot: te()
  }) : {
    ok: !1,
    status: "rejected",
    mode: "write",
    intent: "work_update_due_date",
    message: "Praxis matched the due-date update, but the record was no longer available."
  };
}, Xr = (e, t) => {
  const o = _().todos.find((s) => s.id === e);
  return o ? (ee({
    entityKind: "todo",
    id: o.id,
    title: o.title,
    projectId: o.projectId ?? "",
    priority: o.priority,
    dueAt: o.dueAt ?? "",
    moneyRelated: o.moneyRelated,
    quickAction: o.quickAction,
    estimatedMinutes: o.estimatedMinutes ?? void 0,
    waitingOnPersonId: "",
    notes: o.notes ?? ""
  }), {
    ok: !0,
    status: "executed",
    mode: "write",
    intent: "work_clear_waiting_on",
    message: t,
    snapshot: te()
  }) : {
    ok: !1,
    status: "rejected",
    mode: "write",
    intent: "work_clear_waiting_on",
    message: "Praxis matched the waiting-on update, but the todo was no longer available."
  };
}, Hr = (e, t, n) => {
  const s = _().todos.find((r) => r.id === e);
  return s ? (ee({
    entityKind: "todo",
    id: s.id,
    title: s.title,
    projectId: s.projectId ?? "",
    priority: s.priority,
    dueAt: s.dueAt ?? "",
    moneyRelated: s.moneyRelated,
    quickAction: s.quickAction,
    estimatedMinutes: s.estimatedMinutes ?? void 0,
    waitingOnPersonId: t,
    notes: s.notes ?? ""
  }), {
    ok: !0,
    status: "executed",
    mode: "write",
    intent: "work_assign_waiting_on",
    message: n,
    snapshot: te()
  }) : {
    ok: !1,
    status: "rejected",
    mode: "write",
    intent: "work_assign_waiting_on",
    message: "Praxis matched the waiting-on assignment, but the todo was no longer available."
  };
}, vu = (e, t, n) => {
  const o = Iu(e.command);
  return o ? e.entityKind !== "mission" && e.entityKind !== "project" && e.entityKind !== "todo" && e.entityKind !== "deadline" ? {
    ok: !1,
    status: "rejected",
    mode: "write",
    intent: n.intent,
    message: "Praxis matched the action, but that record type cannot be status-updated.",
    route: n
  } : (Ne({
    entityKind: e.entityKind,
    id: e.entityId,
    status: o
  }), {
    ok: !0,
    status: "executed",
    mode: "write",
    intent: n.intent,
    message: t,
    route: n,
    snapshot: te()
  }) : e.command === "update_due_date" && e.dueAt && (e.entityKind === "todo" || e.entityKind === "deadline") ? { ...Wr(e.entityKind, e.entityId, e.dueAt), intent: n.intent, message: t, route: n } : e.command === "clear_waiting_on" && e.entityKind === "todo" ? { ...Xr(e.entityId, t), intent: n.intent, route: n } : e.command === "assign_waiting_on" && e.entityKind === "todo" && e.personId ? { ...Hr(e.entityId, e.personId, t), intent: n.intent, route: n } : {
    ok: !1,
    status: "rejected",
    mode: "write",
    intent: n.intent,
    message: "Praxis matched the selected action, but companion cannot execute that command yet.",
    route: n
  };
}, Ou = (e) => !e || e.candidate.intent === "unresolved" ? null : e.candidate.intent === "appointment" ? {
  intent: "appointment",
  originalText: e.originalText,
  input: e.candidate.input
} : e.candidate.intent === "mission" ? {
  intent: "mission",
  originalText: e.originalText,
  input: e.candidate.input
} : {
  intent: "todo",
  originalText: e.originalText,
  input: e.candidate.input
}, ds = (e) => {
  var o;
  const t = Au(e);
  if (!t)
    return {
      ok: !1,
      status: "unresolved",
      mode: "read",
      message: "Companion command text is required."
    };
  const n = go({ text: t, surface: "companion" });
  if (n.intent === "daily_report") {
    const s = en();
    return {
      ok: !0,
      status: "answered",
      mode: "read",
      intent: n.intent,
      message: s.spokenBrief,
      route: n,
      data: s
    };
  }
  if (n.intent === "appointment_report") {
    const s = co({ range: n.range });
    return {
      ok: !0,
      status: "answered",
      mode: "read",
      intent: n.intent,
      message: s.spokenSummary,
      route: n,
      data: s
    };
  }
  if (n.intent === "focus_report") {
    const s = $t(n.entityKind, n.entityId);
    return s ? {
      ok: !0,
      status: "answered",
      mode: "read",
      intent: n.intent,
      message: s.summary,
      route: n,
      data: s
    } : {
      ok: !1,
      status: "unresolved",
      mode: "read",
      intent: n.intent,
      message: "Praxis matched the focus report, but it is no longer available.",
      route: n
    };
  }
  if (n.intent === "person_lookup") {
    const s = po({ text: t });
    return s.ok ? {
      ok: !0,
      status: "answered",
      mode: "read",
      intent: n.intent,
      message: s.message,
      route: n,
      data: s
    } : {
      ok: !1,
      status: "unresolved",
      mode: "read",
      intent: n.intent,
      message: s.reason,
      route: n
    };
  }
  if (n.intent === "work_lookup") {
    const s = ho({ text: t });
    return s.ok ? {
      ok: !0,
      status: "answered",
      mode: "read",
      intent: n.intent,
      message: s.message,
      route: n,
      data: s
    } : {
      ok: !1,
      status: "unresolved",
      mode: "read",
      intent: n.intent,
      message: s.reason,
      route: n
    };
  }
  if (n.intent === "conversation_review")
    return {
      ok: !0,
      status: "answered",
      mode: "read",
      intent: n.intent,
      message: n.message,
      route: n
    };
  if (n.intent === "work_update_status")
    return e.confirmed ? (Ne({
      entityKind: n.entityKind,
      id: n.entityId,
      status: n.status
    }), {
      ok: !0,
      status: "executed",
      mode: "write",
      intent: n.intent,
      message: n.message,
      route: n,
      snapshot: te()
    }) : je(n.intent, n.message, n);
  if (n.intent === "work_update_due_date")
    return e.confirmed ? { ...Wr(n.entityKind, n.entityId, n.dueAt), route: n } : je(n.intent, n.message, n);
  if (n.intent === "work_clear_waiting_on")
    return e.confirmed ? { ...Xr(n.todoId, n.message), route: n } : je(n.intent, n.message, n);
  if (n.intent === "work_assign_waiting_on")
    return e.confirmed ? { ...Hr(n.todoId, n.personId, n.message), route: n } : je(n.intent, n.message, n);
  if (n.intent === "capture") {
    const s = tn({
      text: t,
      mode: "preview",
      forcedIntent: e.forcedIntent
    });
    if (s.candidate.intent !== "unresolved" && s.candidate.requiresConfirmation && ((o = s.candidate.confirmationOptions) != null && o.length) && !e.forcedIntent) {
      const a = s.candidate.confirmationOptions.join(" or ");
      return {
        ok: !1,
        status: "requires_confirmation",
        mode: "write",
        intent: "capture",
        message: s.message,
        route: n,
        confirmation: Un(
          "Companion capture needs an explicit type before saving this ambiguous command.",
          `Repeat the same command with forcedIntent set to ${a}, then confirm the resulting draft.`
        ),
        preview: s
      };
    }
    const r = Ou(s);
    return r ? e.confirmed ? {
      ok: !0,
      status: "executed",
      mode: "write",
      intent: "capture",
      message: uo(r).message,
      route: n,
      snapshot: te()
    } : {
      ok: !1,
      status: "requires_confirmation",
      mode: "write",
      intent: "capture",
      message: s.message,
      route: n,
      confirmation: Un(
        "Companion capture creates a local mission, todo, or appointment only after explicit confirmation.",
        "Repeat the same command with confirmed: true."
      ),
      preview: s
    } : {
      ok: !1,
      status: "unresolved",
      mode: "write",
      intent: "capture",
      message: s.message,
      route: n,
      preview: s
    };
  }
  if (n.intent === "work_update_confirmation") {
    if (!e.confirmed)
      return je(n.intent, n.message, n);
    const s = fd(
      n.actions,
      e.selectedActionId
    );
    return s.ok ? vu(s.action, s.message, n) : {
      ok: !1,
      status: "rejected",
      mode: "write",
      intent: n.intent,
      message: s.reason,
      route: n
    };
  }
  return n.intent === "context_action" ? {
    ok: !1,
    status: "unsupported",
    mode: "write",
    intent: n.intent,
    message: "Companion commands must name the target explicitly. Context-only replies stay on the surface that created the context.",
    route: n
  } : {
    ok: !1,
    status: n.intent === "unresolved" ? "unresolved" : "unsupported",
    mode: "read",
    intent: n.intent,
    message: n.message,
    route: n
  };
}, Nu = (e, t) => {
  switch (t.type) {
    case "ITEM_CREATED":
      return [...e, t.payload.item];
    case "ITEM_COMPLETED":
      return e.map(
        (n) => n.id === t.payload.id ? { ...n, completed: t.payload.completed } : n
      );
    case "ITEM_UPDATED":
      return e.map(
        (n) => n.id === t.payload.id ? { ...n, ...t.payload.updates } : n
      );
    case "PIN_SET":
      return [...e];
    case "PIN_CLEARED":
      return [...e];
    default:
      return [...e];
  }
}, Cu = (e, t) => t.reduce(
  (n, o) => Nu(n, o),
  [...e]
), Ru = "checklist.events.jsonl", $u = "checklist.snapshot.json", Lu = "checklist.snapshot.json.tmp";
let yn = Promise.resolve();
const nn = () => {
  const e = N.getPath("userData");
  return {
    eventsPath: rn.join(e, Ru),
    snapshotPath: rn.join(e, $u),
    snapshotTmpPath: rn.join(e, Lu)
  };
}, Du = (e) => (yn = yn.then(e, e), yn), Mu = async (e) => {
  const { eventsPath: t } = nn();
  await Du(async () => {
    const n = `${JSON.stringify(e)}
`;
    await qe.appendFile(t, n, "utf8");
  });
}, Pu = async () => {
  const { eventsPath: e } = nn();
  let t = "";
  try {
    t = await qe.readFile(e, "utf8");
  } catch (s) {
    if (s.code === "ENOENT")
      return [];
    throw s;
  }
  const n = [], o = t.split(/\r?\n/);
  for (const s of o) {
    const r = s.trim();
    if (r)
      try {
        n.push(JSON.parse(r));
      } catch {
      }
  }
  return n;
}, xu = async () => {
  const { snapshotPath: e } = nn();
  try {
    const t = await qe.readFile(e, "utf8"), n = JSON.parse(t);
    return !n || !Array.isArray(n.state) || typeof n.lastEventIndex != "number" ? null : n;
  } catch (t) {
    return t.code === "ENOENT", null;
  }
}, Uu = async (e, t) => {
  const { snapshotPath: n, snapshotTmpPath: o } = nn(), s = JSON.stringify({ state: e, lastEventIndex: t });
  await qe.writeFile(o, s, "utf8"), await qe.rename(o, n);
}, ju = async () => {
  const e = await xu(), t = await Pu(), n = (e == null ? void 0 : e.state) ?? [], o = (e == null ? void 0 : e.lastEventIndex) ?? 0, s = Math.min(Math.max(o, 0), t.length);
  return {
    state: Cu(n, t.slice(s)),
    lastEventIndex: t.length,
    eventCount: t.length
  };
}, Ku = () => (/* @__PURE__ */ new Date()).toISOString(), Fu = () => `appointment_${I.randomUUID()}`, Q = (e) => {
  if (typeof e != "string")
    return null;
  const t = e.trim();
  return t && t.length > 0 ? t : null;
}, Wu = (e) => ({
  id: e.id,
  sourceSystem: e.source_system,
  externalId: e.external_id,
  title: e.title,
  startsAt: e.starts_at,
  endsAt: e.ends_at,
  allDay: e.all_day === 1,
  notes: e.notes_json,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Xu = () => u().prepare("SELECT * FROM appointments ORDER BY starts_at ASC").all().map(Wu), ls = (e) => !Number.isNaN(new Date(e).getTime()), Hu = (e) => {
  if (!e || typeof e != "object")
    return "Event must be an object.";
  if (!Q(e.title))
    return "Missing event title.";
  const t = Q(e.startsAt);
  if (!t || !ls(t))
    return "Missing or invalid start date.";
  const n = Q(e.endsAt);
  return n && !ls(n) ? "Invalid end date." : null;
}, yo = (e) => {
  const t = Q(e.sourceSystem) ?? "manual_json", n = u(), o = Ku();
  let s = 0, r = 0;
  const i = [];
  n.transaction(() => {
    (Array.isArray(e.events) ? e.events : []).forEach((l, m) => {
      const f = Hu(l);
      if (f) {
        i.push({ index: m, reason: f });
        return;
      }
      const p = Q(l.externalId), y = p ? n.prepare("SELECT id FROM appointments WHERE source_system = ? AND external_id = ?").get(t, p) : void 0;
      if (y) {
        n.prepare(`
          UPDATE appointments
          SET title = ?,
              starts_at = ?,
              ends_at = ?,
              all_day = ?,
              notes_json = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          l.title.trim(),
          l.startsAt,
          Q(l.endsAt),
          l.allDay === !0 ? 1 : 0,
          Q(l.notes),
          o,
          y.id
        ), r += 1;
        return;
      }
      n.prepare(`
        INSERT INTO appointments (
          id,
          source_system,
          external_id,
          title,
          starts_at,
          ends_at,
          all_day,
          notes_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        Fu(),
        t,
        p,
        l.title.trim(),
        l.startsAt,
        Q(l.endsAt),
        l.allDay === !0 ? 1 : 0,
        Q(l.notes),
        o,
        o
      ), s += 1;
    });
  })();
  const a = Xu();
  Jn(a), ke();
  const c = i.length;
  return {
    ok: s + r > 0,
    imported: s,
    updated: r,
    skipped: c,
    issues: i,
    appointments: a,
    message: `Calendar import finished: ${s} imported, ${r} updated, ${c} skipped.`
  };
}, Bu = [400, 1200], Gu = /* @__PURE__ */ new Set([408, 409, 425, 429, 500, 502, 503, 504]);
class Mt extends Error {
  constructor(t, n) {
    super(t), this.status = n;
  }
}
const zu = (e) => Gu.has(e), Br = (e) => e instanceof Mt || e instanceof TypeError || e instanceof Error && /\b(network|timeout|timed out|fetch failed|socket|econnreset|etimedout)\b/i.test(e.message), us = (e) => new Promise((t) => {
  setTimeout(t, e);
}), Yu = async (e) => {
  try {
    return await e.json();
  } catch {
    return {};
  }
}, ce = async (e, t, n, o = Bu) => {
  let s = null;
  for (let r = 0; r <= o.length; r += 1)
    try {
      const i = await fetch(e, t), a = await Yu(i);
      if (!i.ok && zu(i.status)) {
        const c = new Mt(
          `${n} hit temporary HTTP ${i.status}.`,
          i.status
        );
        if (r >= o.length)
          throw c;
        s = c, await us(o[r]);
        continue;
      }
      return { response: i, payload: a };
    } catch (i) {
      if (!Br(i) || r >= o.length)
        throw i;
      s = i, await us(o[r]);
    }
  throw s instanceof Error ? s : new Mt(`${n} failed after retrying.`);
}, on = (e, t) => t instanceof Mt && t.status ? `${e} sync hit a temporary provider error (${t.status}). Praxis will retry automatically.` : Br(t) ? `${e} sync hit a temporary network problem. Praxis will retry automatically.` : null, qu = "https://oauth2.googleapis.com/token", Vu = "https://gmail.googleapis.com/gmail/v1/users/me/messages", Ju = "https://gmail.googleapis.com/gmail/v1/users/me/messages", Qu = 25;
class F extends Error {
  constructor(t, n, o) {
    super(t), this.authStatus = n, this.syncStatus = o;
  }
}
const Zu = () => be().clientId, em = () => be().clientSecret, En = (e, t, n, o, s = null) => {
  u().prepare(
    `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           last_synced_at = COALESCE(?, last_synced_at),
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, s, (/* @__PURE__ */ new Date()).toISOString(), e);
}, tm = (e) => {
  const t = u().prepare("SELECT provider FROM email_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "gmail" ? t : null;
}, nm = (e) => {
  const t = $e("email_connection", e, "oauth_token");
  if (!t)
    return null;
  try {
    const n = JSON.parse(t);
    return n.provider === "gmail" ? n : null;
  } catch {
    throw new F(
      "Stored Gmail token data could not be read. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  }
}, om = (e) => {
  if (!e.token.expires_in)
    return !0;
  const t = new Date(e.receivedAt).getTime();
  return Number.isNaN(t) ? !0 : Date.now() > t + e.token.expires_in * 1e3 - 6e4;
}, sm = (e, t) => {
  V({
    ownerKind: "email_connection",
    ownerId: e,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "gmail",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      token: t
    })
  });
}, rm = async (e, t) => {
  if (!t.token.refresh_token)
    throw new F(
      "Gmail OAuth token is missing a refresh token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  const n = new URLSearchParams({
    client_id: Zu(),
    grant_type: "refresh_token",
    refresh_token: t.token.refresh_token
  }), o = em();
  o && n.set("client_secret", o);
  const { response: s, payload: r } = await ce(qu, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: n
  }, "Gmail token refresh");
  if (!s.ok) {
    const a = r.error_description ?? r.error ?? "Gmail token refresh failed.", c = r.error === "invalid_grant";
    throw new F(
      c ? "Google authorization was revoked or expired. Reconnect this inbox." : `Gmail token refresh failed: ${a}`,
      c ? "needs_credentials" : "error",
      c ? "blocked" : "error"
    );
  }
  const i = {
    ...t.token,
    ...r,
    refresh_token: r.refresh_token ?? t.token.refresh_token
  };
  return sm(e, i), {
    provider: "gmail",
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    token: i
  };
}, im = async (e) => {
  const t = nm(e);
  if (!t)
    throw new F(
      "No encrypted Gmail OAuth token is stored for this inbox. Connect Gmail first.",
      "needs_credentials",
      "blocked"
    );
  const n = !t.token.access_token || om(t) ? await rm(e, t) : t;
  if (!n.token.access_token)
    throw new F(
      "Gmail OAuth token does not include an access token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  return n.token.access_token;
}, ms = async (e, t, n) => ce(e, {
  headers: {
    Authorization: `Bearer ${t}`
  }
}, n), am = (e) => {
  var o, s;
  if (!e)
    return { senderName: null, senderEmail: null };
  const t = e.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (t) {
    const r = ((o = t[1]) == null ? void 0 : o.trim()) || null, i = ((s = t[2]) == null ? void 0 : s.trim()) || null;
    return { senderName: r, senderEmail: i };
  }
  const n = e.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return {
    senderName: e.replace((n == null ? void 0 : n[0]) ?? "", "").replace(/[<>"]/g, "").trim() || null,
    senderEmail: (n == null ? void 0 : n[0]) ?? null
  };
}, ps = (e, t) => {
  var n;
  return ((n = e == null ? void 0 : e.find((o) => {
    var s;
    return ((s = o.name) == null ? void 0 : s.toLowerCase()) === t.toLowerCase();
  })) == null ? void 0 : n.value) ?? null;
}, cm = (e) => {
  var i, a, c, d;
  const t = ps((i = e.payload) == null ? void 0 : i.headers, "subject");
  if (!t)
    return null;
  const n = ps((a = e.payload) == null ? void 0 : a.headers, "from"), { senderName: o, senderEmail: s } = am(n), r = e.internalDate ? Number(e.internalDate) : NaN;
  return {
    externalId: e.id,
    threadRef: e.threadId,
    subject: t,
    senderName: o ?? void 0,
    senderEmail: s ?? void 0,
    receivedAt: Number.isNaN(r) ? (/* @__PURE__ */ new Date()).toISOString() : new Date(r).toISOString(),
    summary: (c = e.snippet) == null ? void 0 : c.trim(),
    snippet: (d = e.snippet) == null ? void 0 : d.trim()
  };
}, dm = async (e) => {
  var i, a;
  const t = new URL(Vu);
  t.searchParams.set("labelIds", "INBOX"), t.searchParams.set("maxResults", String(Qu));
  const { response: n, payload: o } = await ms(
    t.toString(),
    e,
    "Gmail message list fetch"
  );
  if (!n.ok) {
    const c = ((i = o.error) == null ? void 0 : i.message) ?? "Gmail message list fetch failed.";
    throw n.status === 401 ? new F(
      "Google authorization is no longer valid. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    ) : new F(`Gmail message list failed: ${c}`, "error", "error");
  }
  const s = o.messages ?? [], r = [];
  for (const c of s) {
    if (!c.id)
      continue;
    const d = new URL(`${Ju}/${c.id}`);
    d.searchParams.set("format", "metadata"), d.searchParams.append("metadataHeaders", "Subject"), d.searchParams.append("metadataHeaders", "From"), d.searchParams.append("metadataHeaders", "Date");
    const l = await ms(
      d.toString(),
      e,
      "Gmail message detail fetch"
    );
    if (!l.response.ok) {
      const f = ((a = l.payload.error) == null ? void 0 : a.message) ?? "Gmail message detail fetch failed.";
      throw l.response.status === 401 ? new F(
        "Google authorization is no longer valid. Reconnect this inbox.",
        "needs_credentials",
        "blocked"
      ) : new F(`Gmail message detail failed: ${f}`, "error", "error");
    }
    const m = cm(l.payload);
    m && r.push(m);
  }
  return r;
}, Gr = async (e) => {
  if (!tm(e.connectionId))
    return {
      ok: !1,
      message: "Choose a saved Gmail row before syncing.",
      fetched: 0,
      imported: 0,
      updated: 0,
      suggestionsCreated: 0,
      skipped: 0
    };
  En(e.connectionId, "ready", "syncing", null);
  try {
    const n = await im(e.connectionId), o = await dm(n), s = so({
      sourceSystem: "gmail",
      connectionId: e.connectionId,
      messages: o
    });
    return En(e.connectionId, "ready", "ready_to_sync", null, (/* @__PURE__ */ new Date()).toISOString()), {
      ok: !0,
      message: o.length === 0 ? "Gmail sync finished: no inbox summaries were found." : `Gmail sync finished: ${o.length} fetched, ${s.imported} imported, ${s.updated} updated, ${s.suggestionsCreated} follow-up candidates flagged, ${s.skipped} skipped.`,
      fetched: o.length,
      imported: s.imported,
      updated: s.updated,
      suggestionsCreated: s.suggestionsCreated,
      skipped: s.skipped,
      importResult: s
    };
  } catch (n) {
    const o = on("Gmail", n), s = o ?? (n instanceof Error ? n.message : "Gmail sync failed."), r = o ? "ready" : n instanceof F ? n.authStatus : "error", i = o ? "error" : n instanceof F ? n.syncStatus : "error";
    return En(e.connectionId, r, i, s), {
      ok: !1,
      message: s,
      fetched: 0,
      imported: 0,
      updated: 0,
      suggestionsCreated: 0,
      skipped: 0
    };
  }
}, R = (e, t) => e.toLowerCase().includes(t.toLowerCase()), Pt = (e, t, n) => {
  const o = n === "mail" ? "Outlook email" : "Outlook calendar";
  return R(e, "AADSTS50011") || R(e, "redirect uri") ? `${o} OAuth failed because the Microsoft app registration redirect URI does not match Praxis. Add ${t} to the app registration and try again.` : R(e, "AADSTS700016") || R(e, "application was not found") ? `${o} OAuth failed because the Microsoft client ID looks wrong or the app registration does not exist. Check Outlook App Setup in Praxis Settings.` : R(e, "invalid_client") ? `${o} OAuth failed because the Microsoft client secret is wrong or missing for this app registration. Update Outlook App Setup in Praxis Settings.` : R(e, "AADSTS65001") || R(e, "consent_required") || R(e, "interaction_required") ? `${o} OAuth needs Microsoft consent. Approve the requested permissions in the browser, then try again.` : R(e, "access_denied") ? `${o} OAuth was denied in Microsoft sign-in. Approve access in the browser and try again.` : R(e, "unauthorized_client") ? `${o} OAuth failed because the Microsoft app registration is not configured for this flow. Check the app type and redirect URIs in Azure Portal.` : e;
}, Ce = (e, t, n) => {
  const o = n === "mail" ? "Outlook inbox sync" : "Outlook calendar sync";
  return R(e, "insufficient privileges") || R(e, "access is denied") ? `${o} failed because the Microsoft app registration is missing ${t} permission or consent was not granted.` : R(e, "resource could not be found") || R(e, "erroritemnotfound") ? `${o} failed because the saved Outlook account or calendar reference could not be found. Check the connection row in Praxis Settings.` : R(e, "too many requests") ? `${o} is being rate-limited by Microsoft. Wait a bit and try again.` : e;
}, lm = "https://login.microsoftonline.com/common/oauth2/v2.0/token", um = "https://graph.microsoft.com/v1.0", mm = ["offline_access", "https://graph.microsoft.com/Mail.Read"];
class W extends Error {
  constructor(t, n, o) {
    super(t), this.authStatus = n, this.syncStatus = o;
  }
}
const fs = () => ie().clientId, pm = () => ie().clientSecret, Tn = (e, t, n, o, s = null) => {
  u().prepare(
    `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           last_synced_at = COALESCE(?, last_synced_at),
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, s, (/* @__PURE__ */ new Date()).toISOString(), e);
}, fm = (e) => {
  const t = u().prepare("SELECT provider FROM email_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "outlook" ? t : null;
}, gm = (e) => {
  const t = $e("email_connection", e, "oauth_token");
  if (!t)
    return null;
  try {
    const n = JSON.parse(t);
    return n.provider === "outlook" ? n : null;
  } catch {
    throw new W(
      "Stored Outlook token data could not be read. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  }
}, _m = (e) => {
  if (!e.token.expires_in)
    return !0;
  const t = new Date(e.receivedAt).getTime();
  return Number.isNaN(t) ? !0 : Date.now() > t + e.token.expires_in * 1e3 - 6e4;
}, hm = (e, t) => {
  V({
    ownerKind: "email_connection",
    ownerId: e,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "outlook",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      token: t
    })
  });
}, ym = async (e, t) => {
  if (!t.token.refresh_token)
    throw new W(
      "Outlook OAuth token is missing a refresh token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  if (!fs())
    throw new W(
      "Outlook client ID is not configured. Save the Microsoft app setup in Settings first.",
      "needs_credentials",
      "blocked"
    );
  const n = new URLSearchParams({
    client_id: fs(),
    grant_type: "refresh_token",
    refresh_token: t.token.refresh_token,
    scope: mm.join(" ")
  }), o = pm();
  o && n.set("client_secret", o);
  const { response: s, payload: r } = await ce(lm, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: n
  }, "Outlook mail token refresh");
  if (!s.ok) {
    const a = r.error_description ?? r.error ?? "Outlook token refresh failed.", c = r.error === "invalid_grant";
    throw new W(
      c ? "Outlook authorization was revoked or expired. Reconnect this inbox." : Ce(`Outlook token refresh failed: ${a}`, "Mail.Read", "mail"),
      c ? "needs_credentials" : "error",
      c ? "blocked" : "error"
    );
  }
  const i = {
    ...t.token,
    ...r,
    refresh_token: r.refresh_token ?? t.token.refresh_token
  };
  return hm(e, i), {
    provider: "outlook",
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    token: i
  };
}, Em = async (e) => {
  const t = gm(e);
  if (!t)
    throw new W(
      "No encrypted Outlook OAuth token is stored for this inbox. Connect Outlook first.",
      "needs_credentials",
      "blocked"
    );
  const n = !t.token.access_token || _m(t) ? await ym(e, t) : t;
  if (!n.token.access_token)
    throw new W(
      "Outlook OAuth token does not include an access token. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    );
  return n.token.access_token;
}, Tm = (e) => {
  var t, n, o, s, r, i;
  return !e.subject || !e.receivedDateTime ? null : {
    externalId: e.id,
    threadRef: e.conversationId,
    subject: e.subject,
    senderName: (n = (t = e.from) == null ? void 0 : t.emailAddress) == null ? void 0 : n.name,
    senderEmail: (s = (o = e.from) == null ? void 0 : o.emailAddress) == null ? void 0 : s.address,
    receivedAt: e.receivedDateTime,
    summary: (r = e.bodyPreview) == null ? void 0 : r.trim(),
    snippet: (i = e.bodyPreview) == null ? void 0 : i.trim()
  };
}, km = async (e) => {
  var s, r;
  const t = new URL(`${um}/me/mailFolders/inbox/messages`);
  t.searchParams.set(
    "$select",
    "id,conversationId,subject,bodyPreview,receivedDateTime,from"
  ), t.searchParams.set("$top", "25"), t.searchParams.set("$orderby", "receivedDateTime DESC");
  const { response: n, payload: o } = await ce(t, {
    headers: {
      Authorization: `Bearer ${e}`
    }
  }, "Outlook inbox fetch");
  if (!n.ok) {
    const i = ((s = o.error) == null ? void 0 : s.message) ?? "Outlook inbox fetch failed.";
    throw n.status === 401 ? new W(
      "Outlook authorization is no longer valid. Reconnect this inbox.",
      "needs_credentials",
      "blocked"
    ) : n.status === 403 ? new W(
      Ce(`Outlook mail permission denied: ${i}`, "Mail.Read", "mail"),
      "error",
      "error"
    ) : new W(
      Ce(
        `Outlook inbox fetch failed (${((r = o.error) == null ? void 0 : r.code) ?? n.status}): ${i}`,
        "Mail.Read",
        "mail"
      ),
      "error",
      "error"
    );
  }
  return (o.value ?? []).map(Tm).filter((i) => !!i);
}, zr = async (e) => {
  if (!fm(e.connectionId))
    return {
      ok: !1,
      message: "Choose a saved Outlook inbox row before syncing.",
      fetched: 0,
      imported: 0,
      updated: 0,
      suggestionsCreated: 0,
      skipped: 0
    };
  Tn(e.connectionId, "ready", "syncing", null);
  try {
    const n = await Em(e.connectionId), o = await km(n), s = so({
      sourceSystem: "outlook",
      connectionId: e.connectionId,
      messages: o
    });
    return Tn(e.connectionId, "ready", "ready_to_sync", null, (/* @__PURE__ */ new Date()).toISOString()), {
      ok: !0,
      message: o.length === 0 ? "Outlook inbox sync finished: no inbox summaries were found." : `Outlook inbox sync finished: ${o.length} fetched, ${s.imported} imported, ${s.updated} updated, ${s.suggestionsCreated} follow-up candidates flagged, ${s.skipped} skipped.`,
      fetched: o.length,
      imported: s.imported,
      updated: s.updated,
      suggestionsCreated: s.suggestionsCreated,
      skipped: s.skipped,
      importResult: s
    };
  } catch (n) {
    const o = on("Outlook inbox", n), s = o ?? (n instanceof Error ? n.message : "Outlook inbox sync failed."), r = o ? "ready" : n instanceof W ? n.authStatus : "error", i = o ? "error" : n instanceof W ? n.syncStatus : "error";
    return Tn(e.connectionId, r, i, s), {
      ok: !1,
      message: s,
      fetched: 0,
      imported: 0,
      updated: 0,
      suggestionsCreated: 0,
      skipped: 0
    };
  }
}, Sm = 29 * 60 * 1e3, bm = 5 * 60 * 1e3;
let kn = !1;
const gs = (e) => {
  if (!e)
    return null;
  const t = new Date(e).getTime();
  return Number.isNaN(t) ? null : Date.now() - t;
}, wm = (e, t) => {
  if (t)
    return !0;
  if (e.sync_status === "error") {
    const o = gs(e.updated_at);
    if (o !== null && o < bm)
      return !1;
  }
  if (!e.last_synced_at)
    return !0;
  const n = gs(e.last_synced_at);
  return n === null ? !0 : n > Sm;
}, Am = (e) => u().prepare(
  `SELECT id, provider, sync_status, last_synced_at, updated_at
         FROM email_connections
         WHERE enabled = 1
           AND auth_status = 'ready'
           AND provider IN ('gmail', 'outlook')`
).all().filter((t) => wm(t, e)), Yr = async (e, t) => {
  const n = e.provider === "outlook" ? await zr({ connectionId: e.id }) : await Gr({ connectionId: e.id });
  return {
    provider: e.provider,
    connectionId: e.id,
    ok: n.ok,
    message: n.message,
    fetched: n.fetched,
    imported: n.imported,
    updated: n.updated,
    suggestionsCreated: n.suggestionsCreated,
    skipped: n.skipped,
    triggeredBy: t,
    syncedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}, jn = async (e, t, n = {}) => {
  if (kn)
    return [];
  kn = !0;
  try {
    const o = Am(n.force ?? !1), s = [];
    for (const r of o) {
      const i = await Yr(r, e);
      s.push(i), t == null || t(i);
    }
    return s;
  } finally {
    kn = !1;
  }
}, _s = async (e, t, n, o) => {
  const s = u().prepare(
    `SELECT id, provider, sync_status, last_synced_at, updated_at
       FROM email_connections
       WHERE id = ?
         AND provider = ?
         AND enabled = 1
         AND auth_status = 'ready'`
  ).get(t, e);
  if (!s)
    return null;
  const r = await Yr(s, n);
  return o == null || o(r), r;
}, Im = () => `context_${I.randomUUID()}`, qr = "desktop:current", vm = (e) => {
  u().prepare("UPDATE suggestion_contexts SET status = 'resolved', resolved_at = ? WHERE id = ?").run((/* @__PURE__ */ new Date()).toISOString(), e);
}, Re = (e) => {
  var r;
  const t = u(), n = (/* @__PURE__ */ new Date()).toISOString(), o = ((r = e.threadId) == null ? void 0 : r.trim()) || qr, s = e.expireSurfaces ?? [e.surface];
  return t.transaction(() => {
    const i = t.prepare(
      "UPDATE suggestion_contexts SET status = 'expired', resolved_at = ? WHERE surface = ? AND thread_id = ? AND status = 'active'"
    );
    for (const a of s)
      i.run(n, a, o);
    t.prepare(`
      INSERT INTO suggestion_contexts (
        id,
        surface,
        thread_id,
        prompt,
        actions_json,
        status,
        created_at,
        resolved_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, NULL)
    `).run(
      Im(),
      e.surface,
      o,
      e.title,
      JSON.stringify(e.actions),
      n
    );
  })(), { ok: !0 };
}, Vr = (e) => {
  var s;
  const t = ((s = e.threadId) == null ? void 0 : s.trim()) || qr, n = u().prepare(
    "SELECT id, actions_json FROM suggestion_contexts WHERE surface = ? AND thread_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
  ).get(e.surface, t);
  if (!n)
    return {
      ok: !1,
      reason: "There is no active report context to apply that to."
    };
  const o = gd({
    surface: e.surface,
    text: e.text,
    actions: JSON.parse(n.actions_json)
  });
  return (o.ok || "declined" in o) && vm(n.id), "declined" in o ? {
    ok: !1,
    reason: o.reason
  } : o;
}, Om = "Okay. I will leave it alone.", Nm = (e) => e.ok || e.reason === Om, Cm = (e = {}) => {
  const t = e.includeFocusReport ?? !0, n = [
    "work_update_confirmation",
    "work_lookup"
  ];
  return t && n.push("focus_report"), n.push("daily_report", "proactive_suggestion"), n;
}, Jr = (e) => `Reply with ${e.map((t) => `\`${t}\``).join(", ")}, or \`no\` to cancel.`, Rm = /* @__PURE__ */ new Set(["todo", "deadline"]), Qr = {
  low: 1,
  normal: 2,
  high: 3,
  critical: 4
}, Zr = 24 * 60 * 60 * 1e3, xt = (e) => Rm.has(e), Ut = (e) => new Date(e.getFullYear(), e.getMonth(), e.getDate()), jt = (e, t = /* @__PURE__ */ new Date()) => {
  if (!e)
    return null;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor(
    (Ut(n).getTime() - Ut(t).getTime()) / Zr
  );
}, ei = (e, t = /* @__PURE__ */ new Date()) => {
  if (!e)
    return null;
  const n = new Date(e);
  return Number.isNaN(n.getTime()) ? null : Math.floor(
    (Ut(t).getTime() - Ut(n).getTime()) / Zr
  );
}, ti = (e, t) => {
  if (!t)
    return null;
  const n = e.projects.find((s) => s.id === t) ?? null;
  if (!n)
    return null;
  const o = n.missionId ? e.missions.find((s) => s.id === n.missionId) ?? null : null;
  return {
    projectTitle: n.title,
    missionTitle: (o == null ? void 0 : o.title) ?? null
  };
}, $m = (e) => {
  const t = e.map((s, r) => ({ item: s, index: r })).find(({ item: s }) => xt(s.entityKind));
  if (!t)
    return null;
  const { item: n, index: o } = t;
  return xt(n.entityKind) ? {
    surface: "proactive_suggestion",
    title: "Top Action Check",
    prompt: `I see "${n.title}" near the top of your report. If you have handled it, want me to mark it done?`,
    actions: [
      {
        actionId: `${n.entityKind}:${n.id}:complete:proactive`,
        ordinal: o + 1,
        title: n.title,
        entityKind: n.entityKind,
        entityId: n.id,
        command: "complete"
      }
    ]
  } : null;
}, hs = (e) => {
  const t = e.dueAt ? -new Date(e.dueAt).getTime() / 1e11 : 0, n = ei(e.updatedAt) ?? 0;
  return Qr[e.priority] * 10 + n * 2 + (e.quickAction ? 2 : 0) + t;
}, Lm = (e) => {
  const t = [...e.todos].filter((a) => a.status !== "completed" && a.waitingOnPersonId).sort((a, c) => hs(c) - hs(a) || a.title.localeCompare(c.title))[0];
  if (!(t != null && t.waitingOnPersonId))
    return null;
  const n = e.people.find((a) => a.id === t.waitingOnPersonId);
  if (!n)
    return null;
  const o = ei(t.updatedAt), s = ti(e, t.projectId), r = o && o > 0 ? ` for ${o} day${o === 1 ? "" : "s"}` : "", i = s ? ` It sits under ${s.projectTitle}${s.missionTitle ? ` in ${s.missionTitle}` : ""}.` : "";
  return {
    surface: "proactive_suggestion",
    title: "Waiting-On Nudge",
    prompt: `I still have "${t.title}" marked as waiting on ${n.name}${r}.${i} If that came through, want me to clear the waiting-on flag?`,
    actions: [
      {
        actionId: `todo:${t.id}:clear_waiting_on:proactive`,
        ordinal: 1,
        title: t.title,
        entityKind: "todo",
        entityId: t.id,
        command: "clear_waiting_on",
        personId: n.id
      }
    ]
  };
}, Dm = (e) => {
  const t = e.filter(
    (n) => xt(n.entityKind) && (jt(n.dueAt) ?? 1) < 0 && n.status !== "completed"
  ).sort((n, o) => n.rank - o.rank || n.title.localeCompare(o.title))[0];
  return !t || !xt(t.entityKind) ? null : {
    surface: "proactive_suggestion",
    title: "Overdue Check",
    prompt: `"${t.title}" is still showing as ${t.reason.toLowerCase()}. If you already handled it, want me to mark it done?`,
    actions: [
      {
        actionId: `${t.entityKind}:${t.id}:complete:overdue`,
        ordinal: 1,
        title: t.title,
        entityKind: t.entityKind,
        entityId: t.id,
        command: "complete"
      }
    ]
  };
}, ys = (e, t = /* @__PURE__ */ new Date()) => {
  const n = jt(e.dueAt, t), o = e.estimatedMinutes ?? 20;
  return Qr[e.priority] * 10 + (e.quickAction ? 10 : 0) + (e.moneyRelated ? 4 : 0) + (n !== null && n <= 0 ? 6 : n !== null && n <= 1 ? 4 : 0) - Math.min(o, 30) / 10;
}, Mm = (e) => {
  const t = [...e.todos].filter(
    (i) => i.status === "active" && i.quickAction && !i.waitingOnPersonId && (i.estimatedMinutes === null || i.estimatedMinutes <= 20)
  ).sort((i, a) => ys(a) - ys(i) || i.title.localeCompare(a.title))[0];
  if (!t)
    return null;
  const n = ti(e, t.projectId), o = t.estimatedMinutes ? ` It looks like about ${t.estimatedMinutes} minute${t.estimatedMinutes === 1 ? "" : "s"}.` : "", s = t.dueAt && jt(t.dueAt) === 0 ? " It is due today." : t.dueAt && jt(t.dueAt) === 1 ? " It is due tomorrow." : "", r = n ? ` It belongs to ${n.projectTitle}${n.missionTitle ? ` in ${n.missionTitle}` : ""}.` : "";
  return {
    surface: "proactive_suggestion",
    title: "Quick Win Nudge",
    prompt: `"${t.title}" looks like a quick hit.${o}${s}${r} If you already knocked it out, want me to mark it done?`,
    actions: [
      {
        actionId: `todo:${t.id}:complete:quick_win`,
        ordinal: 1,
        title: t.title,
        entityKind: "todo",
        entityId: t.id,
        command: "complete"
      }
    ]
  };
}, Pm = (e, t) => Dm(t) ?? Lm(e) ?? Mm(e) ?? $m(t), xm = /* @__PURE__ */ new Set(["mission", "project", "todo", "deadline"]), Um = (e, t, n) => {
  var o, s, r, i;
  return t === "mission" ? ((o = e.missions.find((a) => a.id === n)) == null ? void 0 : o.status) ?? null : t === "project" ? ((s = e.projects.find((a) => a.id === n)) == null ? void 0 : s.status) ?? null : t === "todo" ? ((r = e.todos.find((a) => a.id === n)) == null ? void 0 : r.status) ?? null : ((i = e.deadlines.find((a) => a.id === n)) == null ? void 0 : i.status) ?? null;
}, ni = (e, t) => e.flatMap((n, o) => {
  const s = o + 1, r = [], i = xm.has(n.entityKind) ? Um(t, n.entityKind, n.entityId) : null;
  if (i !== null && i !== "completed" && (n.entityKind === "mission" || n.entityKind === "project" || n.entityKind === "todo" || n.entityKind === "deadline") && r.push({
    actionId: `${n.entityKind}:${n.entityId}:complete:${s}`,
    ordinal: s,
    title: n.title,
    entityKind: n.entityKind,
    entityId: n.entityId,
    command: "complete"
  }), i === "active" && (n.entityKind === "mission" || n.entityKind === "project" || n.entityKind === "todo" || n.entityKind === "deadline") && r.push({
    actionId: `${n.entityKind}:${n.entityId}:pause:${s}`,
    ordinal: s,
    title: n.title,
    entityKind: n.entityKind,
    entityId: n.entityId,
    command: "pause"
  }), i !== null && i !== "active" && (n.entityKind === "mission" || n.entityKind === "project" || n.entityKind === "todo" || n.entityKind === "deadline") && r.push({
    actionId: `${n.entityKind}:${n.entityId}:reactivate:${s}`,
    ordinal: s,
    title: n.title,
    entityKind: n.entityKind,
    entityId: n.entityId,
    command: "reactivate"
  }), (n.entityKind === "todo" || n.entityKind === "deadline") && i !== "completed" && r.push({
    actionId: `${n.entityKind}:${n.entityId}:update_due_date:${s}`,
    ordinal: s,
    title: n.title,
    entityKind: n.entityKind,
    entityId: n.entityId,
    command: "update_due_date"
  }), n.entityKind === "todo") {
    const a = t.todos.find((c) => c.id === n.entityId);
    a != null && a.waitingOnPersonId && r.push({
      actionId: `todo:${n.entityId}:clear_waiting_on:${s}`,
      ordinal: s,
      title: n.title,
      entityKind: "todo",
      entityId: n.entityId,
      command: "clear_waiting_on",
      personId: a.waitingOnPersonId
    });
  }
  if ((n.entityKind === "project" || n.entityKind === "mission") && r.push({
    actionId: `${n.entityKind}:${n.entityId}:open_focus_report:${s}`,
    ordinal: s,
    title: n.title,
    entityKind: n.entityKind,
    entityId: n.entityId,
    command: "open_focus_report"
  }), n.entityKind === "todo") {
    const a = t.todos.find((c) => c.id === n.entityId);
    if (a != null && a.projectId) {
      const c = t.projects.find((d) => d.id === a.projectId);
      c && r.push({
        actionId: `project:${c.id}:open_focus_report:${s}`,
        ordinal: s,
        title: c.title,
        entityKind: "project",
        entityId: c.id,
        command: "open_focus_report"
      });
    }
  }
  if (n.entityKind === "deadline") {
    const a = t.deadlines.find((c) => c.id === n.entityId);
    if ((a == null ? void 0 : a.entityKind) === "project" && a.entityId) {
      const c = t.projects.find((d) => d.id === a.entityId);
      c && r.push({
        actionId: `project:${c.id}:open_focus_report:${s}`,
        ordinal: s,
        title: c.title,
        entityKind: "project",
        entityId: c.id,
        command: "open_focus_report"
      });
    } else if ((a == null ? void 0 : a.entityKind) === "mission" && a.entityId) {
      const c = t.missions.find((d) => d.id === a.entityId);
      c && r.push({
        actionId: `mission:${c.id}:open_focus_report:${s}`,
        ordinal: s,
        title: c.title,
        entityKind: "mission",
        entityId: c.id,
        command: "open_focus_report"
      });
    } else if ((a == null ? void 0 : a.entityKind) === "todo" && a.entityId) {
      const c = t.todos.find((d) => d.id === a.entityId);
      if (c != null && c.projectId) {
        const d = t.projects.find((l) => l.id === c.projectId);
        d && r.push({
          actionId: `project:${d.id}:open_focus_report:${s}`,
          ordinal: s,
          title: d.title,
          entityKind: "project",
          entityId: d.id,
          command: "open_focus_report"
        });
      }
    }
  }
  return r;
}), jm = (e, t) => ni(e.items, t);
let D = null, U = {
  enabled: !1,
  reason: "Slack adapter has not been initialized."
};
const ge = /* @__PURE__ */ new Map(), Km = (e) => e === "im", Fm = () => {
  var e;
  return ((e = process.env.SLACK_BOT_TOKEN) == null ? void 0 : e.trim()) ?? "";
}, Wm = () => {
  var e;
  return ((e = process.env.SLACK_APP_TOKEN) == null ? void 0 : e.trim()) ?? "";
}, oi = () => {
  var e, t;
  return ((e = Vt().operatorChannelId) == null ? void 0 : e.trim()) || ((t = process.env.SLACK_OPERATOR_CHANNEL_ID) == null ? void 0 : t.trim()) || "";
}, Eo = () => Vt().proactiveMirroringEnabled ? oi() : "", bt = /* @__PURE__ */ new Set(["mission", "project", "todo", "deadline"]), Xm = (e) => bt.has(e), Hm = (e) => `slack:${e.channel ?? "dm"}`, Bm = (e) => ni(
  e.flatMap(
    (t) => Xm(t.entityKind) ? [
      {
        entityKind: t.entityKind,
        entityId: t.id,
        title: t.title
      }
    ] : []
  ),
  _()
), si = (e, t) => {
  const n = e.waitingOnPersonName ? `, waiting on ${e.waitingOnPersonName}` : "";
  return `${t + 1}. ${e.title} (${e.reason.toLowerCase()}, ${e.priority}${n})`;
}, Gm = (e) => {
  const t = e.priorityItems.length > 0 ? e.priorityItems.map(si).join(`
`) : "No active priority items are recorded yet.", n = e.thereIsMore ? `
There is more if you want to go over it.` : "";
  return `${e.spokenBrief}

Top move: ${e.recommendedMove.directive}
Why: ${e.recommendedMove.rationale}
Try: ${e.recommendedMove.actionHint}

${t}${n}`;
}, Es = (e) => {
  const t = e.people.length > 0 ? `
People: ${e.people.map((o) => `${o.relationship}: ${o.name}`).join("; ")}` : "", n = e.topItems.length > 0 ? e.topItems.map(si).join(`
`) : "No active focus items are recorded for this yet.";
  return `${e.title}: ${e.summary}
Status: ${e.status}. Active todos: ${e.activeTodoCount}. Deadlines: ${e.upcomingDeadlineCount}.${t}

${n}`;
}, zm = (e) => {
  const t = e.appointments.length > 0 ? e.appointments.map((o, s) => {
    const r = o.endsAt ? ` to ${o.endsAt}` : "";
    return `${s + 1}. ${o.title} (${o.startsAt}${r}, ${o.sourceSystem})`;
  }).join(`
`) : "No matching appointments are recorded yet.", n = e.thereIsMore ? `
There is more if you want the upcoming list in the desktop app.` : "";
  return `${e.spokenSummary}

${t}${n}`;
}, ri = (e) => e.candidate.intent === "appointment" ? {
  intent: "appointment",
  originalText: e.originalText,
  input: e.candidate.input
} : e.candidate.intent === "mission" ? {
  intent: "mission",
  originalText: e.originalText,
  input: e.candidate.input
} : e.candidate.intent === "todo" ? {
  intent: "todo",
  originalText: e.originalText,
  input: e.candidate.input
} : null, ii = (e) => {
  if (e.intent === "appointment") {
    const o = e.input.endsAt ? `
End: ${e.input.endsAt}` : "";
    return `Review capture: appointment
Title: ${e.input.title}
Start: ${e.input.startsAt}${o}
Reply \`yes\` to save, or \`no\` to cancel.`;
  }
  if (e.intent === "mission") {
    const o = e.input.dueAt ? `
Due: ${e.input.dueAt}` : "";
    return `Review capture: mission
Title: ${e.input.title}${o}
Reply \`yes\` to save, or \`no\` to cancel.`;
  }
  const t = e.input.dueAt ? `
Due: ${e.input.dueAt}` : "", n = e.input.priority ? `
Priority: ${e.input.priority}` : "";
  return `Review capture: todo
Title: ${e.input.title}${t}${n}
Reply \`yes\` to save, or \`no\` to cancel.`;
}, Ym = (e) => /^(yes|y|yeah|yep|sure|ok|okay|save|save it|confirm|do it|go ahead)$/i.test(e.trim()), qm = (e) => /^(no|n|nope|not now|stop|cancel|never mind)$/i.test(e.trim()), Vm = (e) => {
  const t = e.trim().toLowerCase();
  return /^(mission|create mission|save as mission)$/.test(t) ? "mission" : /^(todo|to do|task|create todo|save as todo)$/.test(t) ? "todo" : /^(appointment|event|calendar|meeting|create appointment|save as appointment)$/.test(t) ? "appointment" : null;
}, Jm = (e, t) => {
  var s;
  const n = tn({ text: t, mode: "preview" });
  if (n.candidate.intent === "unresolved")
    return n.message;
  if (n.candidate.requiresConfirmation && ((s = n.candidate.confirmationOptions) != null && s.length))
    return ge.set(e, {
      originalText: n.originalText,
      options: n.candidate.confirmationOptions
    }), `${n.message}
${Jr(n.candidate.confirmationOptions)}`;
  const o = ri(n);
  return o ? (ge.set(e, {
    originalText: n.originalText,
    draft: o
  }), ii(o)) : n.message;
}, Qm = (e, t) => {
  const n = ge.get(e);
  if (!n)
    return null;
  if (qm(t))
    return ge.delete(e), "Capture canceled.";
  if (n.options) {
    const o = Vm(t);
    if (!o || !n.options.includes(o))
      return Jr(n.options);
    const s = tn({
      text: n.originalText,
      mode: "preview",
      forcedIntent: o
    }), r = ri(s);
    return r ? (ge.set(e, {
      originalText: n.originalText,
      draft: r
    }), ii(r)) : (ge.delete(e), s.message);
  }
  return Ym(t) ? (ge.delete(e), uo(n.draft).message) : null;
}, Sn = (e, t, n, o) => {
  const s = Bm(o);
  s.length !== 0 && Re({
    surface: e,
    threadId: t,
    expireSurfaces: ["daily_report", "focus_report", "proactive_suggestion"],
    title: n,
    actions: s
  });
}, Zm = (e, t) => {
  const n = Pm(_(), t.priorityItems);
  return n ? (Re({
    surface: n.surface,
    threadId: e,
    expireSurfaces: ["daily_report", "focus_report", "proactive_suggestion"],
    title: n.title,
    actions: n.actions
  }), n) : null;
}, Tt = (e, t, n, o) => (Re({
  surface: "work_update_confirmation",
  threadId: e,
  expireSurfaces: ["work_update_confirmation"],
  title: t,
  actions: [n]
}), `${o}
Reply \`yes\` to confirm, or \`no\` to leave it alone.`), ep = (e, t) => {
  let n = null;
  for (const o of Cm()) {
    const s = Vr({
      surface: o,
      threadId: t,
      text: e
    });
    if (Nm(s))
      return s;
    n = s;
  }
  return n ?? {
    ok: !1,
    reason: "There is no active report context to apply that to."
  };
}, To = (e) => {
  var o;
  const t = e, n = (o = t.data) == null ? void 0 : o.error;
  return n === "channel_not_found" ? "Slack could not find that channel. Check the channel ID, and make sure the bot is invited if this is a private channel." : n === "not_in_channel" ? "Slack found the channel, but the bot is not a member. Invite the Praxis bot to that channel and try again." : n === "missing_scope" ? "Slack rejected the message because the app is missing a permission scope. The bot needs chat:write." : n === "invalid_auth" || n === "not_authed" ? "Slack authentication failed. Check SLACK_BOT_TOKEN and restart Praxis." : n ? `Slack API error: ${n}.` : t.message ? `Slack error: ${t.message}` : "Slack could not send the message.";
}, ai = () => !D || !U.enabled ? "Slack is not running. Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN, then restart Praxis." : null, tp = async () => {
  const e = ai();
  if (e)
    return {
      ok: !1,
      reason: e
    };
  const t = oi();
  if (!t)
    return {
      ok: !1,
      reason: "No Slack operator channel is saved in settings."
    };
  try {
    await (D == null ? void 0 : D.client.chat.postMessage({
      channel: t,
      text: "Praxis Slack test: connection is working."
    }));
  } catch (n) {
    return {
      ok: !1,
      reason: To(n)
    };
  }
  return {
    ok: !0,
    message: `Slack connection test sent to channel ${t}.`
  };
}, ci = async () => {
  const e = ai();
  if (e)
    return {
      ok: !1,
      reason: e
    };
  const t = Eo();
  if (!t)
    return {
      ok: !1,
      reason: "Slack proactive mirroring is off or no operator channel is saved in settings."
    };
  const n = en(), o = Zm(`slack:${t}`, n);
  if (!o)
    return {
      ok: !1,
      reason: "No safe proactive suggestion is available right now."
    };
  try {
    await (D == null ? void 0 : D.client.chat.postMessage({
      channel: t,
      text: `${o.prompt}
Reply yes/no here, or use the item number if I gave you one.`
    }));
  } catch (s) {
    return {
      ok: !1,
      reason: To(s)
    };
  }
  return {
    ok: !0,
    message: `Sent a test proactive suggestion to Slack channel ${t}.`
  };
}, np = () => U.enabled ? {
  ...U,
  reason: Eo() ? "Slack Socket Mode adapter is running with proactive suggestion mirroring." : "Slack Socket Mode adapter is running. Enable proactive mirroring and set an operator channel in settings to mirror suggestions."
} : U, di = async () => {
  if (D)
    return U;
  const e = Fm(), t = Wm();
  if (!e || !t)
    return U = {
      enabled: !1,
      reason: "Set SLACK_BOT_TOKEN and SLACK_APP_TOKEN to enable Slack Socket Mode."
    }, U;
  D = new Gi({
    token: e,
    appToken: t,
    socketMode: !0,
    logLevel: zi.WARN
  }), D.message(async ({ message: n, say: o }) => {
    var a;
    if (!("text" in n) || !((a = n.text) != null && a.trim()) || !Km(n.channel_type))
      return;
    const s = Hm(n), r = Qm(s, n.text);
    if (r) {
      await o(r);
      return;
    }
    const i = go({ text: n.text, surface: "slack" });
    if (i.intent === "daily_report") {
      const c = en();
      Sn("daily_report", s, "Daily Brief", c.priorityItems), await o(Gm(c));
      return;
    }
    if (i.intent === "appointment_report") {
      const c = co({ range: i.range });
      await o(zm(c));
      return;
    }
    if (i.intent === "conversation_review") {
      await o(i.message);
      return;
    }
    if (i.intent === "focus_report") {
      const c = $t(i.entityKind, i.entityId);
      if (!c) {
        await o("I found the matching work item, but I could not generate a focus report for it.");
        return;
      }
      Sn("focus_report", s, c.title, c.topItems), await o(Es(c));
      return;
    }
    if (i.intent === "context_action") {
      const c = ep(n.text, s);
      if (!c.ok) {
        await o(c.reason);
        return;
      }
      if (c.action.command === "complete" && bt.has(c.action.entityKind)) {
        Ne({
          entityKind: c.action.entityKind,
          id: c.action.entityId,
          status: "completed"
        }), await o(c.message);
        return;
      }
      if (c.action.command === "pause" && bt.has(c.action.entityKind)) {
        Ne({
          entityKind: c.action.entityKind,
          id: c.action.entityId,
          status: "paused"
        }), await o(c.message);
        return;
      }
      if (c.action.command === "reactivate" && bt.has(c.action.entityKind)) {
        Ne({
          entityKind: c.action.entityKind,
          id: c.action.entityId,
          status: "active"
        }), await o(c.message);
        return;
      }
      if (c.action.command === "update_due_date" && c.action.dueAt) {
        const d = _(), l = c.action.entityKind === "todo" ? d.todos.find((f) => f.id === c.action.entityId) : null, m = c.action.entityKind === "deadline" ? d.deadlines.find((f) => f.id === c.action.entityId) : null;
        if (c.action.entityKind === "todo" && l) {
          ee({
            entityKind: "todo",
            id: l.id,
            title: l.title,
            projectId: l.projectId ?? "",
            priority: l.priority,
            dueAt: c.action.dueAt,
            moneyRelated: l.moneyRelated,
            quickAction: l.quickAction,
            estimatedMinutes: l.estimatedMinutes ?? void 0,
            waitingOnPersonId: l.waitingOnPersonId ?? "",
            notes: l.notes ?? ""
          }), await o(c.message);
          return;
        }
        if (c.action.entityKind === "deadline" && m) {
          ee({
            entityKind: "deadline",
            id: m.id,
            title: m.title,
            dueAt: c.action.dueAt,
            priority: m.priority
          }), await o(c.message);
          return;
        }
      }
      if (c.action.command === "clear_waiting_on" && c.action.entityKind === "todo") {
        const l = _().todos.find((m) => m.id === c.action.entityId);
        if (l) {
          ee({
            entityKind: "todo",
            id: l.id,
            title: l.title,
            projectId: l.projectId ?? "",
            priority: l.priority,
            dueAt: l.dueAt ?? "",
            moneyRelated: l.moneyRelated,
            quickAction: l.quickAction,
            estimatedMinutes: l.estimatedMinutes ?? void 0,
            waitingOnPersonId: "",
            notes: l.notes ?? ""
          }), await o(c.message);
          return;
        }
      }
      if (c.action.command === "assign_waiting_on" && c.action.entityKind === "todo" && c.action.personId) {
        const l = _().todos.find((m) => m.id === c.action.entityId);
        if (l) {
          ee({
            entityKind: "todo",
            id: l.id,
            title: l.title,
            projectId: l.projectId ?? "",
            priority: l.priority,
            dueAt: l.dueAt ?? "",
            moneyRelated: l.moneyRelated,
            quickAction: l.quickAction,
            estimatedMinutes: l.estimatedMinutes ?? void 0,
            waitingOnPersonId: c.action.personId,
            notes: l.notes ?? ""
          }), await o(c.message);
          return;
        }
      }
      if (c.action.command === "open_focus_report" && (c.action.entityKind === "mission" || c.action.entityKind === "project")) {
        const d = $t(c.action.entityKind, c.action.entityId);
        if (!d) {
          await o("I matched the focus report, but that work item was no longer available.");
          return;
        }
        Sn("focus_report", s, d.title, d.topItems), await o(Es(d));
        return;
      }
      await o("That report item cannot be completed from Slack yet.");
      return;
    }
    if (i.intent === "work_update_status") {
      await o(
        Tt(
          s,
          `Confirm ${i.title}`,
          {
            actionId: `${i.entityKind}:${i.entityId}:complete:1`,
            ordinal: 1,
            title: i.title,
            entityKind: i.entityKind,
            entityId: i.entityId,
            command: "complete"
          },
          i.message
        )
      );
      return;
    }
    if (i.intent === "work_update_due_date") {
      await o(
        Tt(
          s,
          `Confirm move for ${i.title}`,
          {
            actionId: `${i.entityKind}:${i.entityId}:update_due_date:1`,
            ordinal: 1,
            title: i.title,
            entityKind: i.entityKind,
            entityId: i.entityId,
            command: "update_due_date",
            dueAt: i.dueAt
          },
          i.message
        )
      );
      return;
    }
    if (i.intent === "work_clear_waiting_on") {
      await o(
        Tt(
          s,
          `Confirm clear waiting-on for ${i.todoTitle}`,
          {
            actionId: `todo:${i.todoId}:clear_waiting_on:1`,
            ordinal: 1,
            title: i.todoTitle,
            entityKind: "todo",
            entityId: i.todoId,
            command: "clear_waiting_on",
            personId: i.personId
          },
          i.message
        )
      );
      return;
    }
    if (i.intent === "work_assign_waiting_on") {
      await o(
        Tt(
          s,
          `Confirm waiting-on assignment for ${i.todoTitle}`,
          {
            actionId: `todo:${i.todoId}:assign_waiting_on:1`,
            ordinal: 1,
            title: i.todoTitle,
            entityKind: "todo",
            entityId: i.todoId,
            command: "assign_waiting_on",
            personId: i.personId
          },
          i.message
        )
      );
      return;
    }
    if (i.intent === "work_update_confirmation") {
      Re({
        surface: "work_update_confirmation",
        threadId: s,
        expireSurfaces: ["work_update_confirmation"],
        title: i.title,
        actions: i.actions
      }), await o(i.message);
      return;
    }
    if (i.intent === "person_lookup") {
      const c = po({ text: n.text });
      await o(c.ok ? c.message : c.reason);
      return;
    }
    if (i.intent === "work_lookup") {
      const c = ho({ text: n.text });
      if (c.ok) {
        const d = jm(c, _());
        d.length > 0 && Re({
          surface: "work_lookup",
          threadId: s,
          expireSurfaces: ["work_lookup"],
          title: `Work Lookup: ${c.kind}`,
          actions: d
        });
      }
      await o(c.ok ? c.message : c.reason);
      return;
    }
    if (i.intent === "capture") {
      await o(Jm(s, n.text));
      return;
    }
    await o(
      "I can answer saved contact lookups, capture missions/todos/appointments with confirmation, work-graph questions, appointment reports, daily reports, focus reports, and confirmed work follow-ups from Slack. Try: `create a mission for BDNC operations`, `remind me to call Max tomorrow`, `status report`, `what is on my calendar today?`, `where am I on Origins?`, `what am I waiting on from Scott?`, or `what's Max's email?`"
    );
  }), await D.start();
  try {
    await ci();
  } catch (n) {
    console.warn("Slack proactive suggestion mirror failed.", n);
  }
  return U = {
    enabled: !0,
    reason: Eo() ? "Slack Socket Mode adapter is running with proactive suggestion mirroring." : "Slack Socket Mode adapter is running. Enable proactive mirroring and set an operator channel in settings to mirror suggestions."
  }, U;
}, li = async () => {
  D && (await D.stop(), D = null, U = {
    enabled: !1,
    reason: "Slack Socket Mode adapter stopped."
  });
}, op = async () => {
  try {
    await li();
    const e = await di();
    return e.enabled ? {
      ok: !0,
      message: e.reason
    } : {
      ok: !1,
      reason: e.reason
    };
  } catch (e) {
    return U = {
      enabled: !1,
      reason: To(e)
    }, {
      ok: !1,
      reason: U.reason
    };
  }
}, sp = "https://accounts.google.com/o/oauth2/v2/auth", rp = "https://oauth2.googleapis.com/token", ip = "http://127.0.0.1:47841/oauth/google/callback";
let H = null;
const _e = /* @__PURE__ */ new Map(), ko = () => be().clientId, ap = () => be().clientSecret, at = () => be().redirectUri || ip, ui = (e) => e.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), cp = () => ui(I.randomBytes(64)), dp = (e) => ui(I.createHash("sha256").update(e).digest()), ue = (e, t, n) => {
  e.writeHead(t, { "Content-Type": "text/html; charset=utf-8" }), e.end(n);
}, lp = (e, t, n, o) => {
  const s = new URL(sp);
  return s.searchParams.set("client_id", ko()), s.searchParams.set("redirect_uri", at()), s.searchParams.set("response_type", "code"), s.searchParams.set("scope", o.join(" ")), s.searchParams.set("access_type", "offline"), s.searchParams.set("include_granted_scopes", "true"), s.searchParams.set("prompt", "consent"), s.searchParams.set("state", t), s.searchParams.set("code_challenge", n), s.searchParams.set("code_challenge_method", "S256"), e && s.searchParams.set("login_hint", e), s.toString();
}, up = async (e, t) => {
  const n = new URLSearchParams({
    client_id: ko(),
    code: e,
    code_verifier: t,
    grant_type: "authorization_code",
    redirect_uri: at()
  }), o = ap();
  o && n.set("client_secret", o);
  const s = await fetch(rp, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: n
  }), r = await s.json();
  if (!s.ok) {
    const i = typeof r.error == "string" ? r.error : "token_exchange_failed";
    throw new Error(i);
  }
  return r;
}, mp = async (e, t) => {
  const n = new URL(at()), o = new URL(e.url ?? "/", n.origin), s = "<h1>Praxis could not complete Google sign-in.</h1>";
  if (o.pathname !== n.pathname) {
    ue(t, 404, s);
    return;
  }
  const r = o.searchParams.get("state"), i = o.searchParams.get("code"), a = o.searchParams.get("error");
  if (!r) {
    ue(t, 400, s);
    return;
  }
  const c = _e.get(r);
  if (!c) {
    ue(t, 400, s);
    return;
  }
  if (a) {
    _e.delete(r), c.onError({
      connectionId: c.connectionId,
      message: `Google OAuth failed: ${a}.`
    }), ue(t, 400, c.errorHtml);
    return;
  }
  if (!i) {
    _e.delete(r), c.onError({
      connectionId: c.connectionId,
      message: "Google OAuth callback did not include an authorization code."
    }), ue(t, 400, c.errorHtml);
    return;
  }
  try {
    const d = await up(i, c.codeVerifier);
    _e.delete(r), await c.onSuccess({
      connectionId: c.connectionId,
      tokenPayload: d
    }), ue(t, 200, c.successHtml);
  } catch (d) {
    _e.delete(r), c.onError({
      connectionId: c.connectionId,
      message: d instanceof Error ? d.message : "Google OAuth token exchange failed."
    }), ue(t, 500, c.errorHtml);
  }
}, pp = async () => {
  if (H != null && H.listening)
    return;
  const e = new URL(at()), t = Number(e.port);
  if (!t || e.hostname !== "127.0.0.1")
    throw new Error("Google OAuth redirect URI must use http://127.0.0.1:<port>/...");
  H = Yn.createServer((n, o) => {
    mp(n, o);
  }), await new Promise((n, o) => {
    H == null || H.once("error", o), H == null || H.listen(t, "127.0.0.1", () => n());
  });
}, mi = () => at(), pi = () => ko(), fi = async ({
  connectionId: e,
  accountRef: t,
  scopes: n,
  onSuccess: o,
  onError: s,
  successHtml: r,
  errorHtml: i
}) => {
  const a = `${e}.${I.randomBytes(24).toString("base64url")}`, c = cp();
  _e.set(a, {
    state: a,
    codeVerifier: c,
    connectionId: e,
    onSuccess: o,
    onError: s,
    successHtml: r,
    errorHtml: i
  });
  const d = lp(
    t,
    a,
    dp(c),
    n
  );
  try {
    return await pp(), await Gn.openExternal(d), d;
  } catch (l) {
    throw _e.delete(a), l;
  }
}, gi = ["https://www.googleapis.com/auth/calendar.readonly"], fp = "<h1>Praxis connected Google Calendar.</h1><p>You can close this browser tab.</p>", gp = "<h1>Praxis could not connect Google Calendar.</h1><p>Return to Praxis Desk for details.</p>", Kn = new Xt(), Ts = (e) => {
  Kn.emit("update", e);
}, _p = (e) => (Kn.on("update", e), () => Kn.off("update", e)), _i = () => {
  const e = [], t = st(), n = pi();
  return t.available || e.push("OS-backed secret storage"), n || e.push("PRAXIS_GOOGLE_CLIENT_ID"), {
    provider: "google",
    ready: e.length === 0,
    missing: e,
    redirectUri: mi(),
    scopes: gi,
    message: e.length === 0 ? "Google OAuth is configured enough to start the authorization-code flow." : `Google OAuth needs setup: ${e.join(", ")}.`
  };
}, hp = (e) => {
  const t = u().prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "google" ? t : null;
}, bn = (e, t, n, o) => {
  u().prepare(
    `UPDATE calendar_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, (/* @__PURE__ */ new Date()).toISOString(), e);
}, yp = async (e) => {
  const t = _i(), n = hp(e.connectionId);
  if (!n)
    return {
      ok: !1,
      message: "Choose a saved Google calendar connection before starting OAuth.",
      readiness: t
    };
  if (!t.ready)
    return {
      ok: !1,
      message: t.message,
      readiness: t
    };
  try {
    return {
      ok: !0,
      message: "Google OAuth opened in your browser. Complete the Google consent flow there.",
      authorizationUrl: await fi({
        connectionId: e.connectionId,
        accountRef: n.account_ref,
        scopes: gi,
        successHtml: fp,
        errorHtml: gp,
        onSuccess: async ({ connectionId: s, tokenPayload: r }) => {
          V({
            ownerKind: "calendar_connection",
            ownerId: s,
            secretKind: "oauth_token",
            value: JSON.stringify({
              provider: "google",
              receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
              token: r
            })
          }), bn(s, "ready", "ready_to_sync", null), Ts({
            connectionId: s,
            ok: !0,
            message: "Google Calendar connected. Praxis will auto-sync events."
          });
        },
        onError: ({ connectionId: s, message: r }) => {
          bn(s, "error", "error", r), Ts({
            connectionId: s,
            ok: !1,
            message: r
          });
        }
      }),
      readiness: t
    };
  } catch (o) {
    const s = o instanceof Error ? o.message : "Google OAuth could not start.";
    return bn(e.connectionId, "error", "error", s), {
      ok: !1,
      message: s,
      readiness: t
    };
  }
}, hi = ["https://www.googleapis.com/auth/gmail.readonly"], Ep = "<h1>Praxis connected Gmail.</h1><p>You can close this browser tab.</p>", Tp = "<h1>Praxis could not connect Gmail.</h1><p>Return to Praxis Desk for details.</p>", Fn = new Xt(), ks = (e) => {
  Fn.emit("update", e);
}, kp = (e) => (Fn.on("update", e), () => Fn.off("update", e)), yi = () => {
  const e = [], t = st(), n = pi();
  return t.available || e.push("OS-backed secret storage"), n || e.push("Google OAuth client ID"), {
    provider: "gmail",
    ready: e.length === 0,
    missing: e,
    redirectUri: mi(),
    scopes: hi,
    message: e.length === 0 ? "Google OAuth is configured enough to connect Gmail. Make sure the Gmail API is enabled in Google Cloud." : `Gmail OAuth needs setup: ${e.join(", ")}.`
  };
}, Sp = (e) => {
  const t = u().prepare("SELECT provider, account_ref FROM email_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "gmail" ? t : null;
}, wn = (e, t, n, o) => {
  u().prepare(
    `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, (/* @__PURE__ */ new Date()).toISOString(), e);
}, bp = async (e) => {
  const t = yi(), n = Sp(e.connectionId);
  if (!n)
    return {
      ok: !1,
      message: "Choose a saved Gmail row before starting OAuth.",
      readiness: t
    };
  if (!t.ready)
    return {
      ok: !1,
      message: t.message,
      readiness: t
    };
  try {
    return {
      ok: !0,
      message: "Google OAuth opened in your browser. Complete the Gmail consent flow there.",
      authorizationUrl: await fi({
        connectionId: e.connectionId,
        accountRef: n.account_ref,
        scopes: hi,
        successHtml: Ep,
        errorHtml: Tp,
        onSuccess: async ({ connectionId: s, tokenPayload: r }) => {
          V({
            ownerKind: "email_connection",
            ownerId: s,
            secretKind: "oauth_token",
            value: JSON.stringify({
              provider: "gmail",
              receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
              token: r
            })
          }), wn(s, "ready", "ready_to_sync", null), ks({
            connectionId: s,
            ok: !0,
            message: "Gmail connected. Praxis will auto-sync inbox summaries."
          });
        },
        onError: ({ connectionId: s, message: r }) => {
          wn(s, "error", "error", r), ks({
            connectionId: s,
            ok: !1,
            message: r
          });
        }
      }),
      readiness: t
    };
  } catch (o) {
    const s = o instanceof Error ? o.message : "Gmail OAuth could not start.";
    return wn(e.connectionId, "error", "error", s), {
      ok: !1,
      message: s,
      readiness: t
    };
  }
}, wp = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", Ap = "https://login.microsoftonline.com/common/oauth2/v2.0/token", So = ["offline_access", "https://graph.microsoft.com/Mail.Read"], Ip = "http://127.0.0.1:47843/oauth/outlook-email/callback", vp = "<h1>Praxis connected Outlook Mail.</h1><p>You can close this browser tab.</p>", Ke = "<h1>Praxis could not connect Outlook Mail.</h1><p>Return to Praxis Desk for details.</p>";
let B = null;
const ve = /* @__PURE__ */ new Map(), Wn = new Xt(), bo = () => ie().clientId, Op = () => ie().clientSecret, he = () => {
  var e;
  return ((e = process.env.PRAXIS_OUTLOOK_REDIRECT_URI) == null ? void 0 : e.trim()) || Ip;
}, An = (e) => {
  Wn.emit("update", e);
}, Np = (e) => (Wn.on("update", e), () => Wn.off("update", e)), Ei = () => {
  const e = [], t = st(), n = bo();
  return t.available || e.push("OS-backed secret storage"), n || e.push("Outlook client ID"), {
    provider: "outlook",
    ready: e.length === 0,
    missing: e,
    redirectUri: he(),
    scopes: So,
    message: e.length === 0 ? "Outlook mail OAuth is configured enough to start the authorization-code flow." : `Outlook mail OAuth needs setup: ${e.join(", ")}.`
  };
}, Cp = (e) => {
  const t = u().prepare("SELECT provider, account_ref FROM email_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "outlook" ? t : null;
}, Kt = (e, t, n, o) => {
  u().prepare(
    `UPDATE email_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, (/* @__PURE__ */ new Date()).toISOString(), e);
}, Ti = (e) => e.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), Rp = () => Ti(I.randomBytes(64)), $p = (e) => Ti(I.createHash("sha256").update(e).digest()), Lp = (e, t, n) => {
  const o = new URL(wp);
  return o.searchParams.set("client_id", bo()), o.searchParams.set("redirect_uri", he()), o.searchParams.set("response_type", "code"), o.searchParams.set("response_mode", "query"), o.searchParams.set("scope", So.join(" ")), o.searchParams.set("state", t), o.searchParams.set("code_challenge", n), o.searchParams.set("code_challenge_method", "S256"), e && o.searchParams.set("login_hint", e), o.toString();
}, Dp = async (e, t, n) => {
  const o = new URLSearchParams({
    client_id: bo(),
    code: t,
    code_verifier: n,
    grant_type: "authorization_code",
    redirect_uri: he(),
    scope: So.join(" ")
  }), s = Op();
  s && o.set("client_secret", s);
  const r = await fetch(Ap, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: o
  }), i = await r.json();
  if (!r.ok) {
    const a = typeof i.error_description == "string" ? i.error_description : typeof i.error == "string" ? i.error : "outlook_token_exchange_failed";
    throw new Error(a);
  }
  V({
    ownerKind: "email_connection",
    ownerId: e,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "outlook",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      token: i
    })
  }), Kt(e, "ready", "ready_to_sync", null);
}, Ae = (e, t, n) => {
  e.writeHead(t, { "Content-Type": "text/html; charset=utf-8" }), e.end(n);
}, Mp = async (e, t) => {
  const n = new URL(he()), o = new URL(e.url ?? "/", n.origin);
  if (o.pathname !== n.pathname) {
    Ae(t, 404, Ke);
    return;
  }
  const s = o.searchParams.get("state"), r = o.searchParams.get("code"), i = o.searchParams.get("error_description") ?? o.searchParams.get("error");
  if (i) {
    if (s) {
      const c = ve.get(s);
      if (c) {
        ve.delete(s);
        const d = Pt(
          `Outlook OAuth failed: ${i}.`,
          he(),
          "mail"
        );
        Kt(c.connectionId, "error", "error", d), An({
          connectionId: c.connectionId,
          ok: !1,
          message: d
        });
      }
    }
    Ae(t, 400, Ke);
    return;
  }
  if (!s || !r) {
    Ae(t, 400, Ke);
    return;
  }
  const a = ve.get(s);
  if (!a) {
    Ae(t, 400, Ke);
    return;
  }
  try {
    await Dp(a.connectionId, r, a.codeVerifier), ve.delete(s), An({
      connectionId: a.connectionId,
      ok: !0,
      message: "Outlook Mail connected. Praxis will auto-sync inbox summaries."
    }), Ae(t, 200, vp);
  } catch (c) {
    const d = Pt(
      c instanceof Error ? c.message : "Outlook OAuth token exchange failed.",
      he(),
      "mail"
    );
    Kt(a.connectionId, "error", "error", d), An({
      connectionId: a.connectionId,
      ok: !1,
      message: d
    }), Ae(t, 500, Ke);
  }
}, Pp = async () => {
  if (B != null && B.listening)
    return;
  const e = new URL(he()), t = Number(e.port);
  if (!t || e.hostname !== "127.0.0.1")
    throw new Error("Outlook OAuth redirect URI must use http://127.0.0.1:<port>/...");
  B = Yn.createServer((n, o) => {
    Mp(n, o);
  }), await new Promise((n, o) => {
    B == null || B.once("error", o), B == null || B.listen(t, "127.0.0.1", () => n());
  });
}, xp = async (e) => {
  const t = Ei(), n = Cp(e.connectionId);
  if (!n)
    return {
      ok: !1,
      message: "Choose a saved Outlook inbox row before starting OAuth.",
      readiness: t
    };
  if (!t.ready)
    return {
      ok: !1,
      message: t.message,
      readiness: t
    };
  const o = `${e.connectionId}.${I.randomBytes(24).toString("base64url")}`, s = Rp();
  ve.set(o, {
    state: o,
    codeVerifier: s,
    connectionId: e.connectionId
  });
  const r = Lp(
    n.account_ref,
    o,
    $p(s)
  );
  try {
    await Pp(), await Gn.openExternal(r);
  } catch (i) {
    ve.delete(o);
    const a = i instanceof Error ? i.message : "Outlook OAuth could not start.";
    return Kt(e.connectionId, "error", "error", a), {
      ok: !1,
      message: a,
      readiness: t
    };
  }
  return {
    ok: !0,
    message: "Outlook OAuth opened in your browser. Complete the Microsoft consent flow there.",
    authorizationUrl: r,
    readiness: t
  };
}, Ss = (e) => e ? `${e}T00:00:00` : void 0, bs = (e) => {
  if (e)
    return e.endsWith("Z") ? e : `${e}Z`;
}, Up = (e) => {
  const t = [];
  return e.location && t.push(`Location: ${e.location}`), e.hangoutLink && t.push(`Meet: ${e.hangoutLink}`), e.htmlLink && t.push(`Google Calendar: ${e.htmlLink}`), e.description && t.push(e.description), t.length > 0 ? t.join(`

`) : void 0;
}, jp = (e) => {
  var n, o;
  const t = [];
  return (n = e.location) != null && n.displayName && t.push(`Location: ${e.location.displayName}`), (o = e.onlineMeeting) != null && o.joinUrl && t.push(`Meeting: ${e.onlineMeeting.joinUrl}`), e.webLink && t.push(`Outlook Calendar: ${e.webLink}`), e.bodyPreview && t.push(e.bodyPreview), t.length > 0 ? t.join(`

`) : void 0;
}, Kp = (e, t) => {
  var o, s, r, i, a, c;
  if (e.status === "cancelled")
    return null;
  const n = ((o = e.start) == null ? void 0 : o.dateTime) ?? Ss((s = e.start) == null ? void 0 : s.date);
  return n ? {
    externalId: e.id || e.iCalUID ? `${t}:${e.id ?? e.iCalUID}` : void 0,
    title: ((r = e.summary) == null ? void 0 : r.trim()) || "Untitled Google Calendar event",
    startsAt: n,
    endsAt: ((i = e.end) == null ? void 0 : i.dateTime) ?? Ss((a = e.end) == null ? void 0 : a.date),
    allDay: !!((c = e.start) != null && c.date),
    notes: Up(e)
  } : null;
}, Fp = (e, t) => {
  var o, s, r;
  if (e.isCancelled)
    return null;
  const n = bs((o = e.start) == null ? void 0 : o.dateTime);
  return n ? {
    externalId: e.id || e.iCalUId ? `${t}:${e.id ?? e.iCalUId}` : void 0,
    title: ((s = e.subject) == null ? void 0 : s.trim()) || "Untitled Outlook Calendar event",
    startsAt: n,
    endsAt: bs((r = e.end) == null ? void 0 : r.dateTime),
    allDay: e.isAllDay === !0,
    notes: jp(e)
  } : null;
}, Wp = "https://oauth2.googleapis.com/token", Xp = "https://www.googleapis.com/calendar/v3/calendars", Hp = 1, ki = 90;
class q extends Error {
  constructor(t, n, o) {
    super(t), this.authStatus = n, this.syncStatus = o;
  }
}
const Bp = () => be().clientId, Gp = () => be().clientSecret, In = (e, t, n, o, s = null) => {
  u().prepare(
    `UPDATE calendar_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           last_synced_at = COALESCE(?, last_synced_at),
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, s, (/* @__PURE__ */ new Date()).toISOString(), e);
}, zp = (e) => {
  const t = u().prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "google" ? t : null;
}, Yp = (e) => {
  const t = $e("calendar_connection", e, "oauth_token");
  if (!t)
    return null;
  try {
    const n = JSON.parse(t);
    return n.provider === "google" ? n : null;
  } catch {
    throw new q(
      "Stored Google token data could not be read. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }
}, qp = (e) => {
  if (!e.token.expires_in)
    return !0;
  const t = new Date(e.receivedAt).getTime();
  return Number.isNaN(t) ? !0 : Date.now() > t + e.token.expires_in * 1e3 - 6e4;
}, Vp = (e, t) => {
  V({
    ownerKind: "calendar_connection",
    ownerId: e,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "google",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      token: t
    })
  });
}, Jp = async (e, t) => {
  if (!t.token.refresh_token)
    throw new q(
      "Google OAuth token is missing a refresh token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  const n = new URLSearchParams({
    client_id: Bp(),
    grant_type: "refresh_token",
    refresh_token: t.token.refresh_token
  }), o = Gp();
  o && n.set("client_secret", o);
  const { response: s, payload: r } = await ce(Wp, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: n
  }, "Google Calendar token refresh");
  if (!s.ok) {
    const a = r.error_description ?? r.error ?? "Google token refresh failed.", c = r.error === "invalid_grant";
    throw new q(
      c ? "Google authorization was revoked or expired. Reconnect this calendar." : `Google token refresh failed: ${a}`,
      c ? "needs_credentials" : "error",
      c ? "blocked" : "error"
    );
  }
  const i = {
    ...t.token,
    ...r,
    refresh_token: r.refresh_token ?? t.token.refresh_token
  };
  return Vp(e, i), {
    provider: "google",
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    token: i
  };
}, Qp = async (e) => {
  const t = Yp(e);
  if (!t)
    throw new q(
      "No encrypted Google OAuth token is stored for this calendar. Connect Google first.",
      "needs_credentials",
      "blocked"
    );
  const n = !t.token.access_token || qp(t) ? await Jp(e, t) : t;
  if (!n.token.access_token)
    throw new q(
      "Google OAuth token does not include an access token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  return n.token.access_token;
}, Zp = async (e, t) => {
  var i, a, c, d, l;
  const n = new Date(Date.now() - Hp * 24 * 60 * 60 * 1e3).toISOString(), o = new Date(Date.now() + ki * 24 * 60 * 60 * 1e3).toISOString(), s = [];
  let r;
  do {
    const m = new URL(`${Xp}/${encodeURIComponent(t)}/events`);
    m.searchParams.set("singleEvents", "true"), m.searchParams.set("orderBy", "startTime"), m.searchParams.set("timeMin", n), m.searchParams.set("timeMax", o), m.searchParams.set("maxResults", "250"), r && m.searchParams.set("pageToken", r);
    const { response: f, payload: p } = await ce(m, {
      headers: {
        Authorization: `Bearer ${e}`
      }
    }, "Google Calendar events fetch");
    if (!f.ok) {
      const y = ((c = (a = (i = p.error) == null ? void 0 : i.errors) == null ? void 0 : a[0]) == null ? void 0 : c.reason) ?? ((d = p.error) == null ? void 0 : d.status) ?? String(f.status), T = ((l = p.error) == null ? void 0 : l.message) ?? "Google Calendar events fetch failed.";
      throw f.status === 401 ? new q(
        "Google authorization is no longer valid. Reconnect this calendar.",
        "needs_credentials",
        "blocked"
      ) : f.status === 403 ? new q(
        `Google Calendar permission denied: ${T}`,
        "error",
        "error"
      ) : new q(
        `Google Calendar events fetch failed (${y}): ${T}`,
        "error",
        "error"
      );
    }
    s.push(...p.items ?? []), r = p.nextPageToken;
  } while (r);
  return s;
}, Si = async (e) => {
  var n;
  const t = zp(e.connectionId);
  if (!t)
    return {
      ok: !1,
      message: "Choose a saved Google calendar connection before syncing.",
      fetched: 0,
      imported: 0,
      updated: 0,
      skipped: 0
    };
  In(e.connectionId, "ready", "syncing", null);
  try {
    const o = await Qp(e.connectionId), s = ((n = t.account_ref) == null ? void 0 : n.trim()) || "primary", r = await Zp(o, s), i = r.map((d) => Kp(d, s)).filter((d) => !!d), a = yo({
      sourceSystem: "google",
      events: i
    });
    return In(e.connectionId, "ready", "ready_to_sync", null, (/* @__PURE__ */ new Date()).toISOString()), {
      ok: !0,
      message: r.length === 0 ? `Google Calendar sync finished: no events found in the next ${ki} days.` : `Google Calendar sync finished: ${r.length} fetched, ${a.imported} imported, ${a.updated} updated, ${a.skipped} skipped.`,
      fetched: r.length,
      imported: a.imported,
      updated: a.updated,
      skipped: a.skipped,
      importResult: a
    };
  } catch (o) {
    const s = on("Google Calendar", o), r = s ?? (o instanceof Error ? o.message : "Google Calendar sync failed."), i = s ? "ready" : o instanceof q ? o.authStatus : "error", a = s ? "error" : o instanceof q ? o.syncStatus : "error";
    return In(e.connectionId, i, a, r), {
      ok: !1,
      message: r,
      fetched: 0,
      imported: 0,
      updated: 0,
      skipped: 0
    };
  }
}, ef = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize", tf = "https://login.microsoftonline.com/common/oauth2/v2.0/token", wo = [
  "offline_access",
  "https://graph.microsoft.com/Calendars.Read"
], nf = "http://127.0.0.1:47842/oauth/outlook/callback", of = "<h1>Praxis connected Outlook Calendar.</h1><p>You can close this browser tab.</p>", Fe = "<h1>Praxis could not connect Outlook Calendar.</h1><p>Return to Praxis Desk for details.</p>";
let G = null;
const Oe = /* @__PURE__ */ new Map(), Xn = new Xt(), Ao = () => ie().clientId, sf = () => ie().clientSecret, ye = () => {
  var e;
  return ((e = process.env.PRAXIS_OUTLOOK_REDIRECT_URI) == null ? void 0 : e.trim()) || nf;
}, vn = (e) => {
  Xn.emit("update", e);
}, rf = (e) => (Xn.on("update", e), () => Xn.off("update", e)), bi = () => {
  const e = [], t = st(), n = Ao();
  return t.available || e.push("OS-backed secret storage"), n || e.push("Outlook client ID"), {
    provider: "outlook",
    ready: e.length === 0,
    missing: e,
    redirectUri: ye(),
    scopes: wo,
    message: e.length === 0 ? "Outlook OAuth is configured enough to start the authorization-code flow." : `Outlook OAuth needs setup: ${e.join(", ")}.`
  };
}, af = (e) => {
  const t = u().prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "outlook" ? t : null;
}, Ft = (e, t, n, o) => {
  u().prepare(
    `UPDATE calendar_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, (/* @__PURE__ */ new Date()).toISOString(), e);
}, wi = (e) => e.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""), cf = () => wi(I.randomBytes(64)), df = (e) => wi(I.createHash("sha256").update(e).digest()), lf = (e) => {
  Oe.set(e.state, e);
}, uf = (e, t, n) => {
  const o = new URL(ef);
  return o.searchParams.set("client_id", Ao()), o.searchParams.set("redirect_uri", ye()), o.searchParams.set("response_type", "code"), o.searchParams.set("response_mode", "query"), o.searchParams.set("scope", wo.join(" ")), o.searchParams.set("state", t), o.searchParams.set("code_challenge", n), o.searchParams.set("code_challenge_method", "S256"), e && o.searchParams.set("login_hint", e), o.toString();
}, mf = async (e, t, n) => {
  const o = new URLSearchParams({
    client_id: Ao(),
    code: t,
    code_verifier: n,
    grant_type: "authorization_code",
    redirect_uri: ye(),
    scope: wo.join(" ")
  }), s = sf();
  s && o.set("client_secret", s);
  const r = await fetch(tf, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: o
  }), i = await r.json();
  if (!r.ok) {
    const a = typeof i.error_description == "string" ? i.error_description : typeof i.error == "string" ? i.error : "outlook_token_exchange_failed";
    throw new Error(a);
  }
  V({
    ownerKind: "calendar_connection",
    ownerId: e,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "outlook",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      token: i
    })
  }), Ft(e, "ready", "ready_to_sync", null);
}, Ie = (e, t, n) => {
  e.writeHead(t, { "Content-Type": "text/html; charset=utf-8" }), e.end(n);
}, pf = async (e, t) => {
  const n = new URL(ye()), o = new URL(e.url ?? "/", n.origin);
  if (o.pathname !== n.pathname) {
    Ie(t, 404, Fe);
    return;
  }
  const s = o.searchParams.get("state"), r = o.searchParams.get("code"), i = o.searchParams.get("error_description") ?? o.searchParams.get("error");
  if (i) {
    if (s) {
      const c = Oe.get(s);
      if (c) {
        Oe.delete(s);
        const d = Pt(
          `Outlook OAuth failed: ${i}.`,
          ye(),
          "calendar"
        );
        Ft(c.connectionId, "error", "error", d), vn({
          connectionId: c.connectionId,
          ok: !1,
          message: d
        });
      }
    }
    Ie(t, 400, Fe);
    return;
  }
  if (!s || !r) {
    Ie(t, 400, Fe);
    return;
  }
  const a = Oe.get(s);
  if (!a) {
    Ie(t, 400, Fe);
    return;
  }
  try {
    await mf(a.connectionId, r, a.codeVerifier), Oe.delete(s), vn({
      connectionId: a.connectionId,
      ok: !0,
      message: "Outlook Calendar connected. Praxis will auto-sync events."
    }), Ie(t, 200, of);
  } catch (c) {
    const d = Pt(
      c instanceof Error ? c.message : "Outlook OAuth token exchange failed.",
      ye(),
      "calendar"
    );
    Ft(a.connectionId, "error", "error", d), vn({
      connectionId: a.connectionId,
      ok: !1,
      message: d
    }), Ie(t, 500, Fe);
  }
}, ff = async () => {
  if (G != null && G.listening)
    return;
  const e = new URL(ye()), t = Number(e.port);
  if (!t || e.hostname !== "127.0.0.1")
    throw new Error("Outlook OAuth redirect URI must use http://127.0.0.1:<port>/...");
  G = Yn.createServer((n, o) => {
    pf(n, o);
  }), await new Promise((n, o) => {
    G == null || G.once("error", o), G == null || G.listen(t, "127.0.0.1", () => n());
  });
}, gf = async (e) => {
  const t = bi(), n = af(e.connectionId);
  if (!n)
    return {
      ok: !1,
      message: "Choose a saved Outlook calendar connection before starting OAuth.",
      readiness: t
    };
  if (!t.ready)
    return {
      ok: !1,
      message: t.message,
      readiness: t
    };
  const o = `${e.connectionId}.${I.randomBytes(24).toString("base64url")}`, s = cf();
  lf({
    state: o,
    codeVerifier: s,
    connectionId: e.connectionId,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  const r = uf(
    n.account_ref,
    o,
    df(s)
  );
  try {
    await ff(), await Gn.openExternal(r);
  } catch (i) {
    Oe.delete(o);
    const a = i instanceof Error ? i.message : "Outlook OAuth could not start.";
    return Ft(e.connectionId, "error", "error", a), {
      ok: !1,
      message: a,
      readiness: t
    };
  }
  return {
    ok: !0,
    message: "Outlook OAuth opened in your browser. Complete the Microsoft consent flow there.",
    authorizationUrl: r,
    readiness: t
  };
}, _f = "https://login.microsoftonline.com/common/oauth2/v2.0/token", hf = "https://graph.microsoft.com/v1.0", yf = ["offline_access", "https://graph.microsoft.com/Calendars.Read"], Ef = 1, Ai = 90;
class X extends Error {
  constructor(t, n, o) {
    super(t), this.authStatus = n, this.syncStatus = o;
  }
}
const ws = () => ie().clientId, Tf = () => ie().clientSecret, On = (e, t, n, o, s = null) => {
  u().prepare(
    `UPDATE calendar_connections
       SET auth_status = ?,
           sync_status = ?,
           last_sync_error = ?,
           last_synced_at = COALESCE(?, last_synced_at),
           updated_at = ?
       WHERE id = ?`
  ).run(t, n, o, s, (/* @__PURE__ */ new Date()).toISOString(), e);
}, kf = (e) => {
  const t = u().prepare("SELECT provider, account_ref FROM calendar_connections WHERE id = ?").get(e);
  return (t == null ? void 0 : t.provider) === "outlook" ? t : null;
}, Sf = (e) => {
  const t = $e("calendar_connection", e, "oauth_token");
  if (!t)
    return null;
  try {
    const n = JSON.parse(t);
    return n.provider === "outlook" ? n : null;
  } catch {
    throw new X(
      "Stored Outlook token data could not be read. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  }
}, bf = (e) => {
  if (!e.token.expires_in)
    return !0;
  const t = new Date(e.receivedAt).getTime();
  return Number.isNaN(t) ? !0 : Date.now() > t + e.token.expires_in * 1e3 - 6e4;
}, wf = (e, t) => {
  V({
    ownerKind: "calendar_connection",
    ownerId: e,
    secretKind: "oauth_token",
    value: JSON.stringify({
      provider: "outlook",
      receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
      token: t
    })
  });
}, Af = async (e, t) => {
  if (!t.token.refresh_token)
    throw new X(
      "Outlook OAuth token is missing a refresh token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  if (!ws())
    throw new X(
      "Outlook client ID is not configured. Save the Microsoft app setup in Settings first.",
      "needs_credentials",
      "blocked"
    );
  const n = new URLSearchParams({
    client_id: ws(),
    grant_type: "refresh_token",
    refresh_token: t.token.refresh_token,
    scope: yf.join(" ")
  }), o = Tf();
  o && n.set("client_secret", o);
  const { response: s, payload: r } = await ce(_f, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: n
  }, "Outlook Calendar token refresh");
  if (!s.ok) {
    const a = r.error_description ?? r.error ?? "Outlook token refresh failed.", c = r.error === "invalid_grant";
    throw new X(
      c ? "Outlook authorization was revoked or expired. Reconnect this calendar." : Ce(
        `Outlook token refresh failed: ${a}`,
        "Calendars.Read",
        "calendar"
      ),
      c ? "needs_credentials" : "error",
      c ? "blocked" : "error"
    );
  }
  const i = {
    ...t.token,
    ...r,
    refresh_token: r.refresh_token ?? t.token.refresh_token
  };
  return wf(e, i), {
    provider: "outlook",
    receivedAt: (/* @__PURE__ */ new Date()).toISOString(),
    token: i
  };
}, If = async (e) => {
  const t = Sf(e);
  if (!t)
    throw new X(
      "No encrypted Outlook OAuth token is stored for this calendar. Connect Outlook first.",
      "needs_credentials",
      "blocked"
    );
  const n = !t.token.access_token || bf(t) ? await Af(e, t) : t;
  if (!n.token.access_token)
    throw new X(
      "Outlook OAuth token does not include an access token. Reconnect this calendar.",
      "needs_credentials",
      "blocked"
    );
  return n.token.access_token;
}, vf = async (e, t) => {
  var i, a;
  const n = new Date(Date.now() - Ef * 24 * 60 * 60 * 1e3).toISOString(), o = new Date(Date.now() + Ai * 24 * 60 * 60 * 1e3).toISOString(), s = [];
  let r;
  do {
    const c = t === "primary" ? "/me/calendarView" : `/me/calendars/${encodeURIComponent(t)}/calendarView`, d = r ? new URL(r) : new URL(`${hf}${c}`);
    r || (d.searchParams.set("startDateTime", n), d.searchParams.set("endDateTime", o), d.searchParams.set("$top", "250"), d.searchParams.set("$orderby", "start/dateTime"));
    const { response: l, payload: m } = await ce(d, {
      headers: {
        Authorization: `Bearer ${e}`,
        Prefer: 'outlook.timezone="UTC"'
      }
    }, "Outlook Calendar events fetch");
    if (!l.ok) {
      const f = ((i = m.error) == null ? void 0 : i.message) ?? "Outlook Calendar events fetch failed.";
      throw l.status === 401 ? new X(
        "Outlook authorization is no longer valid. Reconnect this calendar.",
        "needs_credentials",
        "blocked"
      ) : l.status === 403 ? new X(
        Ce(
          `Outlook Calendar permission denied: ${f}`,
          "Calendars.Read",
          "calendar"
        ),
        "error",
        "error"
      ) : new X(
        Ce(
          `Outlook Calendar events fetch failed (${((a = m.error) == null ? void 0 : a.code) ?? l.status}): ${f}`,
          "Calendars.Read",
          "calendar"
        ),
        "error",
        "error"
      );
    }
    s.push(...m.value ?? []), r = m["@odata.nextLink"];
  } while (r);
  return s;
}, Ii = async (e) => {
  var n;
  const t = kf(e.connectionId);
  if (!t)
    return {
      ok: !1,
      message: "Choose a saved Outlook calendar connection before syncing.",
      fetched: 0,
      imported: 0,
      updated: 0,
      skipped: 0
    };
  On(e.connectionId, "ready", "syncing", null);
  try {
    const o = await If(e.connectionId), s = ((n = t.account_ref) == null ? void 0 : n.trim()) || "primary", r = await vf(o, s), i = r.map((d) => Fp(d, s)).filter((d) => !!d), a = yo({
      sourceSystem: "outlook",
      events: i
    });
    return On(e.connectionId, "ready", "ready_to_sync", null, (/* @__PURE__ */ new Date()).toISOString()), {
      ok: !0,
      message: r.length === 0 ? `Outlook Calendar sync finished: no events found in the next ${Ai} days.` : `Outlook Calendar sync finished: ${r.length} fetched, ${a.imported} imported, ${a.updated} updated, ${a.skipped} skipped.`,
      fetched: r.length,
      imported: a.imported,
      updated: a.updated,
      skipped: a.skipped,
      importResult: a
    };
  } catch (o) {
    const s = on("Outlook Calendar", o), r = s ?? (o instanceof Error ? o.message : "Outlook Calendar sync failed."), i = s ? "ready" : o instanceof X ? o.authStatus : "error", a = s ? "error" : o instanceof X ? o.syncStatus : "error";
    return On(e.connectionId, i, a, r), {
      ok: !1,
      message: r,
      fetched: 0,
      imported: 0,
      updated: 0,
      skipped: 0
    };
  }
}, Of = 5 * 60 * 1e3, As = 60 * 1e3;
let Nn = !1;
const Is = (e) => {
  if (!e)
    return null;
  const t = new Date(e).getTime();
  return Number.isNaN(t) ? null : Date.now() - t;
}, Nf = () => {
  const e = rt();
  return Math.max(0, e.intervalMinutes * As - As);
}, Cf = (e, t) => {
  if (t)
    return !0;
  if (e.sync_status === "error") {
    const o = Is(e.updated_at);
    if (o !== null && o < Of)
      return !1;
  }
  if (!e.last_synced_at)
    return !0;
  const n = Is(e.last_synced_at);
  return n === null ? !0 : n > Nf();
}, Rf = (e) => u().prepare(
  `SELECT id, provider, sync_status, last_synced_at, updated_at
         FROM calendar_connections
         WHERE enabled = 1
           AND auth_status = 'ready'
           AND provider IN ('google', 'outlook')`
).all().filter((t) => Cf(t, e)), vi = async (e, t) => {
  const n = e.provider === "google" ? await Si({ connectionId: e.id }) : await Ii({ connectionId: e.id });
  return {
    provider: e.provider,
    connectionId: e.id,
    ok: n.ok,
    message: n.message,
    fetched: n.fetched,
    imported: n.imported,
    updated: n.updated,
    skipped: n.skipped,
    triggeredBy: t,
    syncedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}, Xe = async (e, t, n = {}) => {
  if (Nn)
    return [];
  if (!rt().enabled && !n.force && e !== "user_request")
    return [];
  Nn = !0;
  try {
    const s = Rf(n.force ?? !1), r = [];
    for (const i of s) {
      const a = await vi(i, e);
      r.push(a), t == null || t(a);
    }
    return r;
  } finally {
    Nn = !1;
  }
}, vs = async (e, t, n, o) => {
  const s = u().prepare(
    `SELECT id, provider, sync_status, last_synced_at, updated_at
       FROM calendar_connections
       WHERE id = ?
         AND provider = ?
         AND enabled = 1
         AND auth_status = 'ready'`
  ).get(t, e);
  if (!s)
    return null;
  const r = await vi(s, n);
  return o == null || o(r), r;
}, $f = [
  /\bplease\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bneed (?:you|us|to)\b/i,
  /\bfollow up\b/i,
  /\bnext step\b/i,
  /\bnext action\b/i,
  /\breply\b/i,
  /\brespond\b/i,
  /\bsend\b/i,
  /\bcall\b/i,
  /\breview\b/i,
  /\bconfirm\b/i,
  /\bschedule\b/i,
  /\bbook\b/i,
  /\bapprove\b/i,
  /\bsubmit\b/i,
  /\bwaiting\s+(?:on|for)\b/i,
  /\bblocked\s+(?:on|by)\b/i
], Lf = [
  /\bproject\b/i,
  /\bmission\b/i,
  /\bproposal\b/i,
  /\bscope\b/i,
  /\bcontract\b/i,
  /\bestimate\b/i,
  /\bpermit\b/i,
  /\bimplementation\b/i,
  /\bintegration\b/i,
  /\brollout\b/i,
  /\blaunch\b/i,
  /\bphase\b/i
], Df = [
  /\btoday\b/i,
  /\btonight\b/i,
  /\btomorrow\b/i,
  /\bthis week\b/i,
  /\bnext week\b/i,
  /\bdue\b/i,
  /\bdeadline\b/i,
  /\bby\b/i,
  /\bbefore\b/i,
  /\beod\b/i,
  /\bend of day\b/i,
  /\bfriday\b/i,
  /\bmonday\b/i,
  /\btuesday\b/i,
  /\bwednesday\b/i,
  /\bthursday\b/i,
  /\bsaturday\b/i,
  /\bsunday\b/i,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i
], Mf = [
  /\bthanks\b/i,
  /\bthank you\b/i,
  /\bfyi\b/i,
  /\blol\b/i,
  /\bnewsletter\b/i,
  /\bverification code\b/i,
  /\bpassword\b/i
], kt = (e, t) => t.reduce((n, o) => o.test(e) ? n + 1 : n, 0), Os = (e, t) => e.length <= t ? e : `${e.slice(0, t - 1).trimEnd()}...`, Ns = (e) => e.split(/(?:[.!?]\s+|\n+)/).map((t) => t.trim().replace(/[.!?]+$/g, "")).find(Boolean) ?? "", Pf = (e, t, n) => {
  var r;
  const s = ((r = Ns(t).match(
    /\b(?:please|can you|could you|would you|need you to)\s+([^.!?\n]+)$/i
  )) == null ? void 0 : r[1]) ?? Ns(t);
  return Os(s && n === "todo" ? s.charAt(0).toUpperCase() + s.slice(1) : `Follow up: ${e}`, 96);
}, xf = (e, t, n = /* @__PURE__ */ new Date()) => {
  const o = t.summary ?? t.snippet;
  if (!o)
    return null;
  const s = o.trim();
  if (!s)
    return null;
  const r = s.toLowerCase(), i = kt(s, $f), a = kt(s, Lf), c = kt(s, Df), d = kt(s, Mf);
  if (d > 0 && i === 0 && a === 0 && c === 0 || r.startsWith("thanks") || r.startsWith("thank you") || r === "ok" || i === 0 && a === 0 && c === 0)
    return null;
  const l = a >= 2 || a >= 1 && (c > 0 || i > 0) ? "project" : "todo", m = new Date(t.sentAt), f = or(
    s,
    Number.isNaN(m.getTime()) ? n : m
  ), p = Math.min(
    0.42 + i * 0.14 + a * 0.1 + c * 0.1 - d * 0.12,
    0.92
  );
  if (p < 0.62)
    return null;
  const y = [
    `Chat message in ${e.conversationTitle} looks like ${l === "project" ? "project-sized work" : "a follow-up task"}.`,
    i > 0 ? "It includes action-oriented language." : null,
    a > 0 ? "It includes project or scope language." : null,
    c > 0 ? "It includes timing or deadline language." : null
  ].filter((T) => !!T);
  return {
    title: Pf(e.conversationTitle, s, l),
    suggestedEntityKind: l,
    reason: y.join(" "),
    dueAt: f,
    senderName: t.senderName,
    subject: e.conversationTitle,
    summary: o,
    sentAt: t.sentAt,
    confidence: p
  };
}, Uf = () => (/* @__PURE__ */ new Date()).toISOString(), sn = (e) => `${e}_${I.randomUUID()}`, w = (e) => {
  const t = e == null ? void 0 : e.trim();
  return t && t.length > 0 ? t : null;
}, jf = (e, t, n) => I.createHash("sha1").update([e, t.trim(), n ?? ""].join("|")).digest("hex"), Kf = (e, t, n) => {
  const o = w(t.externalId);
  return o || I.createHash("sha1").update(
    [
      e,
      w(t.senderName) ?? "",
      w(t.sentAt) ?? "",
      w(t.sourceRef) ?? "",
      w(t.summary) ?? w(t.snippet) ?? "",
      n
    ].join("|")
  ).digest("hex");
}, Ff = (e) => ({
  id: e.id,
  sourceSystem: e.source_system,
  externalId: e.external_id,
  conversationTitle: e.conversation_title,
  importedAt: e.imported_at,
  summary: e.summary,
  sourceRef: e.source_ref,
  messageCount: e.message_count,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Oi = (e) => ({
  id: e.id,
  chatImportId: e.chat_import_id,
  externalId: e.external_id,
  senderName: e.sender_name,
  sentAt: e.sent_at,
  summary: e.summary,
  snippet: e.snippet,
  sourceRef: e.source_ref,
  createdAt: e.created_at,
  updatedAt: e.updated_at
}), Wf = (e, t) => e === "dismissed" ? "dismissed" : e === "archived" ? "archived" : e != null && e.startsWith("todo:") ? "created_todo" : e != null && e.startsWith("project:") ? "created_project" : t.status ?? "pending", Ni = (e) => {
  try {
    const t = JSON.parse(e.value_json);
    return {
      id: e.id,
      chatImportId: t.chatImportId,
      messageId: t.messageId,
      sourceSystem: e.source_system,
      conversationTitle: t.conversationTitle,
      title: t.title,
      suggestedEntityKind: t.suggestedEntityKind,
      reason: t.reason,
      confidence: e.confidence,
      dueAt: t.dueAt,
      status: Wf(e.routed_to, t),
      routedTo: e.routed_to,
      senderName: t.senderName,
      subject: t.subject,
      summary: t.summary,
      sentAt: t.sentAt,
      createdAt: e.captured_at,
      updatedAt: e.captured_at
    };
  } catch {
    return null;
  }
}, Xf = () => u().prepare(
  `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
         FROM inbox_facts
         WHERE fact_type = 'chat_follow_up'
         ORDER BY captured_at DESC
         LIMIT 40`
).all().map(Ni).filter((e) => !!e), Hf = (e, t) => u().prepare("SELECT * FROM chat_imports WHERE source_system = ? AND external_id = ?").get(e, t), Bf = (e, t, n, o, s) => {
  u().prepare(
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
  ).run(sn("chat_participant"), e, t, n, o, s, s);
}, Gf = (e, t, n, o) => {
  const s = w(t.sentAt), r = w(t.summary), i = w(t.snippet);
  if (!s || !r && !i)
    return { status: "skipped", messageId: null };
  const a = Kf(e, t, n), c = u().prepare(
    `SELECT id
       FROM chat_import_messages
       WHERE chat_import_id = ?
         AND external_id = ?`
  ).get(e, a);
  if (c)
    return u().prepare(
      `UPDATE chat_import_messages
         SET sender_name = ?,
             sent_at = ?,
             summary = ?,
             snippet = ?,
             source_ref = ?,
             updated_at = ?
         WHERE id = ?`
    ).run(
      w(t.senderName),
      s,
      r,
      i,
      w(t.sourceRef),
      o,
      c.id
    ), { status: "updated", messageId: c.id };
  const d = sn("chat_message");
  return u().prepare(
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
  ).run(
    d,
    e,
    a,
    w(t.senderName),
    s,
    r,
    i,
    w(t.sourceRef),
    o,
    o
  ), { status: "imported", messageId: d };
}, zf = (e) => u().prepare("SELECT * FROM chat_import_messages WHERE id = ?").get(e), Ci = (e) => u().prepare(
  `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE id = ?
         AND fact_type = 'chat_follow_up'`
).get(e), Yf = (e, t, n, o) => {
  const s = u(), r = s.prepare(
    `SELECT id, source_system, source_ref, value_json, confidence, captured_at, routed_to
       FROM inbox_facts
       WHERE fact_type = 'chat_follow_up'
         AND source_ref = ?`
  ).get(t.id);
  if (r != null && r.routed_to)
    return 0;
  if (!n)
    return r && s.prepare("DELETE FROM inbox_facts WHERE id = ?").run(r.id), 0;
  const i = {
    chatImportId: e.id,
    messageId: t.id,
    conversationTitle: e.conversationTitle,
    title: n.title,
    suggestedEntityKind: n.suggestedEntityKind,
    reason: n.reason,
    dueAt: n.dueAt,
    senderName: n.senderName,
    subject: n.subject,
    summary: n.summary,
    sentAt: n.sentAt,
    status: "pending"
  };
  return r ? (s.prepare(
    `UPDATE inbox_facts
       SET value_json = ?,
           confidence = ?,
           captured_at = ?
       WHERE id = ?`
  ).run(JSON.stringify(i), n.confidence, o, r.id), 1) : (s.prepare(
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
    sn("chat_fact"),
    e.sourceSystem,
    t.id,
    JSON.stringify(i),
    n.confidence,
    o
  ), 1);
}, qf = (e) => {
  const t = w(e.conversationTitle);
  if (!t)
    return {
      ok: !1,
      message: "Conversation title is required.",
      importedMessages: 0,
      updatedMessages: 0,
      suggestionsCreated: 0,
      skippedMessages: e.messages.length
    };
  const n = Uf(), o = w(e.importedAt) ?? n, s = w(e.sourceRef), r = w(e.externalId) ?? jf(e.sourceSystem, t, s), i = Hf(e.sourceSystem, r), a = (i == null ? void 0 : i.id) ?? sn("chat_import"), c = u().transaction(() => {
    i ? u().prepare(
      `UPDATE chat_imports
           SET conversation_title = ?,
               imported_at = ?,
               summary = ?,
               source_ref = ?,
               updated_at = ?
           WHERE id = ?`
    ).run(
      t,
      o,
      w(e.summary),
      s,
      n,
      a
    ) : u().prepare(
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
    ).run(
      a,
      e.sourceSystem,
      r,
      t,
      o,
      w(e.summary),
      s,
      n,
      n
    );
    for (const T of e.participants ?? []) {
      const O = w(T.displayName);
      O && Bf(
        a,
        O,
        w(T.handle),
        w(T.role),
        n
      );
    }
    let d = 0, l = 0, m = 0, f = 0;
    const p = {
      id: a,
      sourceSystem: e.sourceSystem,
      conversationTitle: t,
      summary: w(e.summary),
      createdAt: (i == null ? void 0 : i.created_at) ?? n
    };
    e.messages.forEach((T, O) => {
      const { status: E, messageId: v } = Gf(a, T, O, n);
      if (E === "imported" ? d += 1 : E === "updated" ? l += 1 : m += 1, v) {
        const b = zf(v);
        if (b) {
          const Me = Oi(b);
          f += Yf(
            p,
            Me,
            xf(p, Me),
            n
          );
        }
      }
    });
    const y = u().prepare("SELECT COUNT(*) AS count FROM chat_import_messages WHERE chat_import_id = ?").get(a);
    return u().prepare("UPDATE chat_imports SET message_count = ?, updated_at = ? WHERE id = ?").run(y.count, n, a), {
      importedMessages: d,
      updatedMessages: l,
      suggestionsCreated: f,
      skippedMessages: m
    };
  })();
  return {
    ok: !0,
    message: `Chat import stored: ${c.importedMessages} imported, ${c.updatedMessages} updated, ${c.suggestionsCreated} review candidate${c.suggestionsCreated === 1 ? "" : "s"} flagged, ${c.skippedMessages} skipped.`,
    importId: a,
    ...c
  };
}, Vf = () => {
  const e = u().prepare("SELECT * FROM chat_imports ORDER BY imported_at DESC, updated_at DESC LIMIT 24").all().map(Ff), t = u().prepare(
    `SELECT *
         FROM chat_import_messages
         ORDER BY sent_at DESC, updated_at DESC
         LIMIT 40`
  ).all().map(Oi);
  return {
    imports: e,
    recentMessages: t,
    suggestions: Xf()
  };
}, Wt = (e, t, n) => {
  const o = Ci(e);
  if (!o)
    return !1;
  try {
    const s = JSON.parse(o.value_json);
    return u().prepare(
      `UPDATE inbox_facts
         SET value_json = ?,
             routed_to = ?
         WHERE id = ?`
    ).run(
      JSON.stringify({
        ...s,
        status: n
      }),
      t,
      e
    ), !0;
  } catch {
    return !1;
  }
}, Jf = (e) => {
  const t = Ci(e.suggestionId);
  if (!t)
    return {
      ok: !1,
      message: "That chat suggestion no longer exists."
    };
  const n = Ni(t);
  if (!n)
    return {
      ok: !1,
      message: "That chat suggestion could not be read."
    };
  if (n.status !== "pending")
    return {
      ok: !1,
      message: "That chat suggestion was already handled."
    };
  const o = [
    `Seeded from ${n.sourceSystem} chat: ${n.conversationTitle}`,
    n.senderName ? `Sender: ${n.senderName}` : null,
    `Sent: ${n.sentAt}`,
    n.summary ? `Summary: ${n.summary}` : null,
    `Reason: ${n.reason}`
  ].filter((r) => !!r);
  if (e.mode === "project") {
    const r = to({
      title: n.title,
      summary: o.join(`
`),
      dueAt: n.dueAt ?? void 0
    });
    return Wt(e.suggestionId, `project:${r.id}`, "created_project"), {
      ok: !0,
      message: `Created project ${r.title} from the chat follow-up.`,
      entityKind: "project",
      entityId: r.id
    };
  }
  const s = ot({
    title: n.title,
    dueAt: n.dueAt ?? void 0,
    priority: n.dueAt ? "high" : "normal",
    quickAction: n.suggestedEntityKind !== "project",
    sourceKind: "chat_import",
    sourceRef: n.messageId,
    notes: o.join(`
`)
  });
  return Wt(e.suggestionId, `todo:${s.id}`, "created_todo"), {
    ok: !0,
    message: `Created todo ${s.title} from the chat follow-up.`,
    entityKind: "todo",
    entityId: s.id
  };
}, Qf = (e) => {
  const t = Wt(e.suggestionId, "dismissed", "dismissed");
  return {
    ok: t,
    message: t ? "Dismissed that chat follow-up." : "That chat follow-up could not be dismissed."
  };
}, Zf = (e) => {
  const t = Wt(e.suggestionId, "archived", "archived");
  return {
    ok: t,
    message: t ? "Archived that chat follow-up." : "That chat follow-up could not be archived."
  };
}, Io = k.dirname(Xi(import.meta.url)), Ri = k.join(Io, "..");
process.env.APP_ROOT = Ri;
const Hn = process.env.VITE_DEV_SERVER_URL, Ag = k.join(process.env.APP_ROOT, "dist-electron"), $i = k.join(process.env.APP_ROOT, "dist"), Li = Hn ? k.join(Ri, "public") : $i;
process.env.VITE_PUBLIC = Li;
const Di = k.join(Li, "praxis-icon.png");
let J, me, Ge = null, ze = null;
const eg = 30 * 60 * 1e3, tg = process.argv.includes("--memory-repair"), ng = process.argv.includes("--memory-reindex"), og = process.argv.includes("--storage-check"), sg = process.argv.includes("--skills-list"), rg = process.argv.includes("--companion-snapshot"), Mi = process.argv.indexOf("--companion-command"), ig = Mi >= 0, Bn = process.argv.indexOf("--email-accept-suggestion"), ag = Bn >= 0, Pi = process.argv.indexOf("--email-archive-suggestion"), cg = Pi >= 0, wt = process.argv.indexOf("--update-email-connection"), dg = wt >= 0, pe = (e) => {
  Z.getAllWindows().forEach((t) => {
    t.webContents.send("calendar:autoSyncUpdated", e);
  });
}, He = (e) => {
  Z.getAllWindows().forEach((t) => {
    t.webContents.send("email:autoSyncUpdated", e);
  });
}, xi = (e, t) => {
  if (Hn) {
    const n = new URL(Hn);
    Object.entries(t ?? {}).forEach(([o, s]) => {
      n.searchParams.set(o, s);
    }), e.loadURL(n.toString());
    return;
  }
  e.loadFile(k.join($i, "index.html"), {
    query: t
  });
}, Cs = () => {
  if (me && !me.isDestroyed()) {
    me.focus();
    return;
  }
  me = new Z({
    title: "Praxis Settings",
    icon: Di,
    width: 980,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    parent: J ?? void 0,
    show: !0,
    webPreferences: {
      preload: k.join(Io, "preload.mjs")
    }
  }), me.on("closed", () => {
    me = null;
  }), xi(me, { window: "settings" });
}, lg = () => {
  const e = [
    {
      label: "File",
      submenu: [
        process.platform === "darwin" ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" }
      ]
    },
    {
      label: "Settings",
      submenu: [
        {
          label: "Open Settings",
          accelerator: "CommandOrControl+,",
          click: Cs
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Praxis Setup Notes",
          click: Cs
        }
      ]
    }
  ];
  Oo.setApplicationMenu(Oo.buildFromTemplate(e));
}, Ui = () => {
  if (Ge)
    return;
  const e = rt();
  e.enabled && (Ge = setInterval(() => {
    Xe("interval", pe);
  }, e.intervalMinutes * 60 * 1e3));
}, ji = () => {
  Ge && (clearInterval(Ge), Ge = null);
}, ug = () => {
  ji(), Ui();
}, mg = () => {
  ze || (ze = setInterval(() => {
    jn("interval", He);
  }, eg));
}, pg = () => {
  ze && (clearInterval(ze), ze = null);
};
function Ki() {
  J = new Z({
    icon: Di,
    width: 1280,
    height: 800,
    resizable: !0,
    maximizable: !0,
    fullscreenable: !0,
    show: !0,
    webPreferences: {
      preload: k.join(Io, "preload.mjs")
    }
  }), J.webContents.on("did-finish-load", () => {
    J == null || J.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), xi(J), J.maximize();
}
N.on("window-all-closed", () => {
  process.platform !== "darwin" && (ji(), pg(), li(), z(), N.quit(), J = null);
});
N.on("activate", () => {
  Z.getAllWindows().length === 0 && Ki();
});
N.whenReady().then(() => {
  if (Ht(), tg) {
    const e = va();
    console.log(JSON.stringify(e, null, 2)), z(), N.quit();
    return;
  }
  if (ng) {
    const e = No();
    console.log(JSON.stringify(e, null, 2)), z(), N.exit(e.ok ? 0 : 1);
    return;
  }
  if (og) {
    const e = Ba();
    console.log(JSON.stringify(e, null, 2)), z(), N.exit(e.ok ? 0 : 1);
    return;
  }
  if (sg) {
    const e = Ln();
    console.log(JSON.stringify(e, null, 2)), z(), N.exit(e.ok ? 0 : 1);
    return;
  }
  if (rg) {
    const e = te();
    console.log(JSON.stringify(e, null, 2)), z(), N.exit(0);
    return;
  }
  if (ig) {
    const t = {
      text: process.argv[Mi + 1] ?? "",
      confirmed: process.argv.includes("--confirm-companion-command")
    }, n = ds(t);
    console.log(JSON.stringify(n, null, 2)), z(), N.exit(0);
    return;
  }
  if (ag) {
    const e = process.argv[Bn + 1] ?? "", t = process.argv[Bn + 2] === "project" ? "project" : "todo", n = xo({ suggestionId: e, mode: t });
    console.log(JSON.stringify(n, null, 2)), z(), N.exit(n.ok ? 0 : 1);
    return;
  }
  if (cg) {
    const e = process.argv[Pi + 1] ?? "", t = Uo({ suggestionId: e });
    console.log(JSON.stringify(t, null, 2)), z(), N.exit(t.ok ? 0 : 1);
    return;
  }
  if (dg) {
    const e = process.argv[wt + 1] ?? "", t = process.argv[wt + 2] ?? "", n = process.argv[wt + 3] ?? "", o = jo({ id: e, label: t, accountRef: n });
    console.log(JSON.stringify(o.emailConnections.find((s) => s.id === e) ?? null, null, 2)), z(), N.exit(0);
    return;
  }
  lg(), di(), Ki(), _p((e) => {
    Z.getAllWindows().forEach((t) => {
      t.webContents.send("calendar:googleOAuthUpdated", e);
    }), e.ok && vs(
      "google",
      e.connectionId,
      "oauth",
      pe
    );
  }), rf((e) => {
    Z.getAllWindows().forEach((t) => {
      t.webContents.send("calendar:outlookOAuthUpdated", e);
    }), e.ok && vs(
      "outlook",
      e.connectionId,
      "oauth",
      pe
    );
  }), kp((e) => {
    Z.getAllWindows().forEach((t) => {
      t.webContents.send("email:gmailOAuthUpdated", e);
    }), e.ok && _s(
      "gmail",
      e.connectionId,
      "oauth",
      He
    );
  }), Np((e) => {
    Z.getAllWindows().forEach((t) => {
      t.webContents.send("email:outlookOAuthUpdated", e);
    }), e.ok && _s(
      "outlook",
      e.connectionId,
      "oauth",
      He
    );
  }), Xe("startup", pe), jn("startup", He), Ui(), mg(), g.handle("checklist:loadState", async () => ju()), g.handle("checklist:appendEvent", async (e, t) => (await Mu(t), { ok: !0 })), g.handle(
    "checklist:writeSnapshot",
    async (e, t, n) => (await Uu(t, n), { ok: !0 })
  ), g.handle("storage:getOverview", async () => Bt()), g.handle("storage:reindexMemory", async () => No()), g.handle("skills:getRegistry", async () => Ln()), g.handle("companion:getSnapshot", async () => te()), g.handle(
    "companion:executeCommand",
    async (e, t) => ds(t)
  ), g.handle("slack:getStatus", async () => np()), g.handle("slack:restart", async () => op()), g.handle("slack:sendConnectionTest", async () => tp()), g.handle("slack:sendTestSuggestion", async () => ci()), g.handle("settings:getSnapshot", async () => j()), g.handle(
    "settings:createCalendarConnection",
    async (e, t) => xc(t)
  ), g.handle(
    "settings:deleteCalendarConnection",
    async (e, t) => Uc(t)
  ), g.handle(
    "settings:updateCalendarConnection",
    async (e, t) => jc(t)
  ), g.handle(
    "settings:createEmailConnection",
    async (e, t) => Kc(t)
  ), g.handle(
    "settings:deleteEmailConnection",
    async (e, t) => Fc(t)
  ), g.handle(
    "settings:updateEmailConnection",
    async (e, t) => jo(t)
  ), g.handle(
    "settings:updateSlack",
    async (e, t) => Wc(t)
  ), g.handle(
    "settings:updateCalendarAutoSync",
    async (e, t) => {
      const n = Xc(t);
      return ug(), n;
    }
  ), g.handle(
    "settings:updateGoogleOAuth",
    async (e, t) => Hc(t)
  ), g.handle(
    "settings:updateOutlookOAuth",
    async (e, t) => Bc(t)
  ), g.handle(
    "calendar:importEvents",
    async (e, t) => yo(t)
  ), g.handle("email:getSnapshot", async () => lr()), g.handle(
    "email:importMessages",
    async (e, t) => so(t)
  ), g.handle("email:getGoogleOAuthReadiness", async () => yi()), g.handle("email:getOutlookOAuthReadiness", async () => Ei()), g.handle(
    "email:prepareGoogleOAuth",
    async (e, t) => bp(t)
  ), g.handle(
    "email:prepareOutlookOAuth",
    async (e, t) => xp(t)
  ), g.handle(
    "email:syncGoogle",
    async (e, t) => Gr(t)
  ), g.handle(
    "email:syncOutlook",
    async (e, t) => zr(t)
  ), g.handle(
    "email:acceptSuggestion",
    async (e, t) => xo(t)
  ), g.handle(
    "email:archiveSuggestion",
    async (e, t) => Uo(t)
  ), g.handle(
    "email:dismissSuggestion",
    async (e, t) => Oc(t)
  ), g.handle(
    "email:dismissContactSuggestion",
    async (e, t) => Nc(t)
  ), g.handle(
    "email:restoreContactSuggestion",
    async (e, t) => Cc(t)
  ), g.handle("chat:getSnapshot", async () => Vf()), g.handle(
    "chat:importConversation",
    async (e, t) => qf(t)
  ), g.handle(
    "chat:acceptSuggestion",
    async (e, t) => Jf(t)
  ), g.handle(
    "chat:archiveSuggestion",
    async (e, t) => Zf(t)
  ), g.handle(
    "chat:dismissSuggestion",
    async (e, t) => Qf(t)
  ), g.handle("calendar:getGoogleOAuthReadiness", async () => _i()), g.handle("calendar:getOutlookOAuthReadiness", async () => bi()), g.handle(
    "calendar:prepareGoogleOAuth",
    async (e, t) => yp(t)
  ), g.handle(
    "calendar:prepareOutlookOAuth",
    async (e, t) => gf(t)
  ), g.handle(
    "calendar:syncGoogle",
    async (e, t) => Si(t)
  ), g.handle(
    "calendar:syncOutlook",
    async (e, t) => Ii(t)
  ), g.handle(
    "calendar:autoSyncNow",
    async (e, t) => Xe(
      (t == null ? void 0 : t.triggeredBy) ?? "user_request",
      pe,
      { force: (t == null ? void 0 : t.force) ?? !0 }
    )
  ), g.handle("brief:getDaily", async () => (await Xe("brief", pe), await jn("brief", He), en())), g.handle("brief:getAppointmentReport", async (e, t) => (await Xe("user_request", pe, { force: !0 }), co(t))), g.handle(
    "assistant:route",
    async (e, t) => go(t)
  ), g.handle(
    "assistant:storeContext",
    async (e, t) => Re(t)
  ), g.handle(
    "assistant:resolveContext",
    async (e, t) => Vr(t)
  ), g.handle(
    "assistant:lookupPerson",
    async (e, t) => po(t)
  ), g.handle(
    "assistant:lookupWork",
    async (e, t) => ho(t)
  ), g.handle(
    "brief:getFocusReport",
    async (e, t) => $t(t.entityKind, t.entityId)
  ), g.handle(
    "capture:naturalLanguage",
    async (e, t) => tn(t)
  ), g.handle(
    "capture:saveCandidate",
    async (e, t) => uo(t)
  ), g.handle("work:getSnapshot", async () => _()), g.handle("work:createMission", async (e, t) => eo(t)), g.handle("work:createPerson", async (e, t) => ba(t)), g.handle(
    "work:createPersonWorkLink",
    async (e, t) => Ta(t)
  ), g.handle("work:createProject", async (e, t) => to(t)), g.handle("work:createTodo", async (e, t) => ot(t)), g.handle(
    "work:createAppointment",
    async (e, t) => Zn(t)
  ), g.handle(
    "work:createDeadline",
    async (e, t) => wa(t)
  ), g.handle(
    "work:updateStatus",
    async (e, t) => Ne(t)
  ), g.handle(
    "work:updateRecord",
    async (e, t) => ee(t)
  ), g.handle(
    "work:deleteRecord",
    async (e, t) => Aa(t)
  ), g.handle(
    "work:deletePersonWorkLink",
    async (e, t) => Sa(t)
  );
});
export {
  Ag as MAIN_DIST,
  $i as RENDERER_DIST,
  Hn as VITE_DEV_SERVER_URL
};
