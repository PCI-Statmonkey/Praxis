import crypto from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildProjectTaskTemplateTodos,
  getProjectTaskTemplateSeed,
  parseProjectTaskTemplateMarkdown,
  PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT,
  PROJECT_TASK_TEMPLATE_NONE,
  PROJECT_TASK_TEMPLATES,
} from "../shared/workModel";
import type {
  AppointmentRecord,
  CreateAppointmentInput,
  CreateDeadlineInput,
  CreateMissionInput,
  CreatePersonInput,
  CreatePersonWorkLinkInput,
  CreateProjectInput,
  CreateTodoInput,
  DeleteWorkRecordInput,
  DeletePersonWorkLinkInput,
  DeadlineEntityKind,
  DeadlineRecord,
  MemoryDocumentSummary,
  MissionRecord,
  PersonRecord,
  PersonWorkLinkRecord,
  ProjectTaskTemplateDefinition,
  ProjectRecord,
  TodoRecord,
  UpdateWorkRecordInput,
  UpdateWorkStatusInput,
  WorkPriority,
  WorkSnapshot,
  WorkStatus,
} from "../shared/workModel";
import {
  getPraxisDatabase,
  refreshMemoryDocumentIndex,
  resolveMemoryRoot,
} from "./praxisDb";
import {
  missionMarkdownPath,
  personMarkdownPath,
  projectMarkdownPath,
  writeAppointmentsSummaryMarkdown,
  writeDeadlinesSummaryMarkdown,
  writeMissionMarkdown,
  writePersonMarkdown,
  writeProjectMarkdown,
  writeTodosSummaryMarkdown,
} from "./memoryWriter";

type DbMission = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  due_at: string | null;
  markdown_path: string | null;
  created_at: string;
  updated_at: string;
};

type DbProject = {
  id: string;
  mission_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  due_at: string | null;
  markdown_path: string | null;
  created_at: string;
  updated_at: string;
};

type DbTodo = {
  id: string;
  project_id: string | null;
  title: string;
  status: WorkStatus;
  priority: WorkPriority;
  due_at: string | null;
  money_related: number;
  quick_action: number;
  estimated_minutes: number | null;
  waiting_on_person_id: string | null;
  source_kind: string | null;
  source_ref: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type DbDeadline = {
  id: string;
  entity_kind: DeadlineEntityKind;
  entity_id: string | null;
  title: string;
  due_at: string;
  status: WorkStatus;
  priority: WorkPriority;
  source_kind: string | null;
  source_ref: string | null;
  created_at: string;
  updated_at: string;
};

type DbAppointment = {
  id: string;
  source_system: string;
  external_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  all_day: number;
  notes_json: string | null;
  created_at: string;
  updated_at: string;
};

type DbPerson = {
  id: string;
  slug: string;
  name: string;
  role_summary: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  notes: string | null;
  markdown_path: string | null;
  created_at: string;
  updated_at: string;
};

type DbPersonWorkLink = {
  id: string;
  person_id: string;
  entity_kind: "mission" | "project";
  entity_id: string;
  relationship: string;
  source_kind: string | null;
  created_at: string;
  updated_at: string;
};

type DbPersonAlias = {
  person_id: string;
  alias: string;
};

type DbMemoryDocument = {
  title: string;
  relative_path: string;
  doc_kind: string;
  entity_kind: string;
};

const nowIso = () => new Date().toISOString();

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const slugify = (title: string) => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || "untitled";
};

const uniqueSlug = (table: "missions" | "projects", title: string) => {
  const db = getPraxisDatabase();
  const base = slugify(title);
  let candidate = base;
  let suffix = 2;
  const statement = db.prepare(`SELECT 1 FROM ${table} WHERE slug = ? LIMIT 1`);
  while (statement.get(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const uniquePersonSlug = (name: string) => {
  const db = getPraxisDatabase();
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  const statement = db.prepare("SELECT 1 FROM people WHERE slug = ? LIMIT 1");
  while (statement.get(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const normalizeOptional = (value: string | undefined) => {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const normalizeAlias = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeAliases = (aliases: string[] | undefined) =>
  [...new Set((aliases ?? []).map((alias) => alias.trim()).filter((alias) => alias.length > 0))];

const toMission = (row: DbMission): MissionRecord => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  status: row.status,
  dueAt: row.due_at,
  markdownPath: row.markdown_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toProject = (row: DbProject): ProjectRecord => ({
  id: row.id,
  missionId: row.mission_id,
  slug: row.slug,
  title: row.title,
  summary: row.summary,
  status: row.status,
  dueAt: row.due_at,
  markdownPath: row.markdown_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toTodo = (row: DbTodo): TodoRecord => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  status: row.status,
  priority: row.priority,
  dueAt: row.due_at,
  moneyRelated: row.money_related === 1,
  quickAction: row.quick_action === 1,
  estimatedMinutes: row.estimated_minutes,
  waitingOnPersonId: row.waiting_on_person_id,
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toDeadline = (row: DbDeadline): DeadlineRecord => ({
  id: row.id,
  entityKind: row.entity_kind,
  entityId: row.entity_id,
  title: row.title,
  dueAt: row.due_at,
  status: row.status,
  priority: row.priority,
  sourceKind: row.source_kind,
  sourceRef: row.source_ref,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toAppointment = (row: DbAppointment): AppointmentRecord => ({
  id: row.id,
  sourceSystem: row.source_system,
  externalId: row.external_id,
  title: row.title,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  allDay: row.all_day === 1,
  notes: row.notes_json,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPerson = (row: DbPerson, aliases: string[] = []): PersonRecord => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  aliases,
  roleSummary: row.role_summary,
  email: row.email,
  phone: row.phone,
  billingAddress: row.billing_address,
  notes: row.notes,
  markdownPath: row.markdown_path,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toPersonWorkLink = (row: DbPersonWorkLink): PersonWorkLinkRecord => ({
  id: row.id,
  personId: row.person_id,
  entityKind: row.entity_kind,
  entityId: row.entity_id,
  relationship: row.relationship,
  sourceKind: row.source_kind,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toMemoryDocument = (row: DbMemoryDocument): MemoryDocumentSummary => ({
  title: row.title,
  relativePath: row.relative_path,
  docKind: row.doc_kind,
  entityKind: row.entity_kind,
});

const listMissions = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM missions ORDER BY updated_at DESC")
      .all() as DbMission[]
  ).map(toMission);

const listProjects = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
      .all() as DbProject[]
  ).map(toProject);

const listTodos = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM todos ORDER BY COALESCE(due_at, '9999-12-31') ASC, updated_at DESC")
      .all() as DbTodo[]
  ).map(toTodo);

const listDeadlines = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM deadlines ORDER BY due_at ASC")
      .all() as DbDeadline[]
  ).map(toDeadline);

const listAppointments = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM appointments ORDER BY starts_at ASC")
      .all() as DbAppointment[]
  ).map(toAppointment);

const listPeople = () =>
  {
    const people = (
    getPraxisDatabase()
      .prepare("SELECT * FROM people ORDER BY name ASC")
      .all() as DbPerson[]
    );
    const aliases = getPraxisDatabase()
      .prepare("SELECT person_id, alias FROM person_aliases ORDER BY alias ASC")
      .all() as DbPersonAlias[];
    const aliasesByPerson = new Map<string, string[]>();
    for (const alias of aliases) {
      aliasesByPerson.set(alias.person_id, [
        ...(aliasesByPerson.get(alias.person_id) ?? []),
        alias.alias,
      ]);
    }
    return people.map((person) => toPerson(person, aliasesByPerson.get(person.id) ?? []));
  };

const listPersonWorkLinks = () =>
  (
    getPraxisDatabase()
      .prepare("SELECT * FROM person_work_links ORDER BY updated_at DESC")
      .all() as DbPersonWorkLink[]
  ).map(toPersonWorkLink);

const listMemoryDocuments = () =>
  (
    getPraxisDatabase()
      .prepare(
        "SELECT title, relative_path, doc_kind, entity_kind FROM memory_documents ORDER BY relative_path ASC LIMIT 30"
      )
      .all() as DbMemoryDocument[]
  ).map(toMemoryDocument);

const getMissionById = (id: string) => {
  const row = getPraxisDatabase().prepare("SELECT * FROM missions WHERE id = ?").get(id) as
    | DbMission
    | undefined;
  return row ? toMission(row) : null;
};

const getProjectById = (id: string) => {
  const row = getPraxisDatabase().prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | DbProject
    | undefined;
  return row ? toProject(row) : null;
};

const getPersonById = (id: string) => {
  const row = getPraxisDatabase().prepare("SELECT * FROM people WHERE id = ?").get(id) as
    | DbPerson
    | undefined;
  if (!row) {
    return null;
  }
  const aliases = getPraxisDatabase()
    .prepare("SELECT alias FROM person_aliases WHERE person_id = ? ORDER BY alias ASC")
    .all(id) as Array<{ alias: string }>;
  return toPerson(row, aliases.map((alias) => alias.alias));
};

const replacePersonAliases = (personId: string, aliases: string[]) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  db.prepare("DELETE FROM person_aliases WHERE person_id = ?").run(personId);
  const statement = db.prepare(`
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
  for (const alias of normalizeAliases(aliases)) {
    statement.run(createId("person_alias"), personId, alias, normalizeAlias(alias), timestamp, timestamp);
  }
};

const getMissionTitle = (missionId: string | null) => {
  if (!missionId) {
    return null;
  }
  return (
    getPraxisDatabase().prepare("SELECT title FROM missions WHERE id = ?").get(missionId) as
      | { title: string }
      | undefined
  )?.title ?? null;
};

const syncSummaryMarkdown = () => {
  writeTodosSummaryMarkdown(listTodos());
  writeDeadlinesSummaryMarkdown(listDeadlines());
  writeAppointmentsSummaryMarkdown(listAppointments());
  refreshMemoryDocumentIndex();
};

const listMarkdownProjectTaskTemplates = () => {
  const templateRoot = path.join(resolveMemoryRoot(), PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT);
  if (!existsSync(templateRoot)) {
    return [];
  }

  return readdirSync(templateRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
    .map((entry) => {
      const relativePath = path.posix.join(PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT, entry.name);
      const absolutePath = path.join(templateRoot, entry.name);
      try {
        return parseProjectTaskTemplateMarkdown(readFileSync(absolutePath, "utf8"), relativePath);
      } catch {
        return null;
      }
    })
    .filter((template): template is ProjectTaskTemplateDefinition => Boolean(template));
};

export const listProjectTaskTemplateOptions = () => {
  const bySlug = new Map(PROJECT_TASK_TEMPLATES.map((template) => [template.slug, template]));
  for (const template of listMarkdownProjectTaskTemplates()) {
    bySlug.set(template.slug, template);
  }

  return [
    { id: PROJECT_TASK_TEMPLATE_NONE, label: "None" },
    ...[...bySlug.values()]
      .filter((template) => template.status === "active")
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((template) => ({ id: template.slug, label: template.label })),
  ];
};

const loadProjectTaskTemplateForCreation = (templateId: CreateProjectInput["taskTemplateId"]) => {
  const normalizedTemplateId = (templateId ?? "").trim();
  if (!normalizedTemplateId || normalizedTemplateId === PROJECT_TASK_TEMPLATE_NONE) {
    return null;
  }

  const seed = getProjectTaskTemplateSeed(templateId);
  if (seed) {
    const absolutePath = path.join(resolveMemoryRoot(), seed.markdownPath);
    if (!existsSync(absolutePath)) {
      mkdirSync(path.dirname(absolutePath), { recursive: true });
      writeFileSync(absolutePath, seed.markdown, "utf8");
    }

    return parseProjectTaskTemplateMarkdown(readFileSync(absolutePath, "utf8"), seed.markdownPath);
  }

  return listMarkdownProjectTaskTemplates().find((template) => template.slug === normalizedTemplateId) ?? null;
};

const upsertPersonWorkLink = (
  personId: string | null,
  entityKind: "mission" | "project",
  entityId: string | null,
  relationship: string,
  sourceKind: string
) => {
  if (!personId || !entityId) {
    return;
  }

  const db = getPraxisDatabase();
  const timestamp = nowIso();
  db.prepare(`
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
    createId("person_link"),
    personId,
    entityKind,
    entityId,
    relationship,
    sourceKind,
    timestamp,
    timestamp
  );
};

const syncTodoPersonLinks = (
  personId: string | null,
  projectId: string | null,
  relationship = "waiting_on"
) => {
  if (!personId || !projectId) {
    return;
  }

  const project = getProjectById(projectId);
  upsertPersonWorkLink(personId, "project", projectId, relationship, "todo");
  upsertPersonWorkLink(personId, "mission", project?.missionId ?? null, relationship, "todo");
};

const createDeadlineRecord = (
  input: CreateDeadlineInput,
  fallbackEntityKind: DeadlineEntityKind = "standalone",
  fallbackEntityId: string | null = null
) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  const deadline: DeadlineRecord = {
    id: createId("deadline"),
    entityKind: input.entityKind ?? fallbackEntityKind,
    entityId: input.entityId ?? fallbackEntityId,
    title: input.title.trim(),
    dueAt: input.dueAt,
    status: "active",
    priority: input.priority ?? "normal",
    sourceKind: input.sourceKind ?? null,
    sourceRef: input.sourceRef ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.prepare(`
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
    deadline.id,
    deadline.entityKind,
    deadline.entityId,
    deadline.title,
    deadline.dueAt,
    deadline.status,
    deadline.priority,
    deadline.sourceKind,
    deadline.sourceRef,
    deadline.createdAt,
    deadline.updatedAt
  );

  return deadline;
};

export const getWorkSnapshot = (): WorkSnapshot => {
  refreshMemoryDocumentIndex();
  return {
    missions: listMissions(),
    projects: listProjects(),
    todos: listTodos(),
    deadlines: listDeadlines(),
    appointments: listAppointments(),
    people: listPeople(),
    personWorkLinks: listPersonWorkLinks(),
    memoryDocuments: listMemoryDocuments(),
    projectTaskTemplates: listProjectTaskTemplateOptions(),
  };
};

export const listPeopleRecords = () => listPeople();

export const createPersonWorkLink = (input: CreatePersonWorkLinkInput) => {
  upsertPersonWorkLink(
    normalizeOptional(input.personId),
    input.entityKind,
    normalizeOptional(input.entityId),
    normalizeOptional(input.relationship) ?? "related",
    "manual"
  );
  return getWorkSnapshot();
};

export const ensurePersonWorkLink = (
  personId: string | null,
  entityKind: "mission" | "project",
  entityId: string | null,
  relationship: string,
  sourceKind = "manual"
) => {
  upsertPersonWorkLink(
    normalizeOptional(personId ?? undefined),
    entityKind,
    normalizeOptional(entityId ?? undefined),
    normalizeOptional(relationship) ?? "related",
    sourceKind
  );
};

export const deletePersonWorkLink = (input: DeletePersonWorkLinkInput) => {
  getPraxisDatabase().prepare("DELETE FROM person_work_links WHERE id = ?").run(input.id);
  return getWorkSnapshot();
};

export const createPerson = (input: CreatePersonInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  const slug = uniquePersonSlug(input.name);
  const person: PersonRecord = {
    id: createId("person"),
    slug,
    name: input.name.trim(),
    aliases: normalizeAliases(input.aliases),
    roleSummary: normalizeOptional(input.roleSummary),
    email: normalizeOptional(input.email),
    phone: normalizeOptional(input.phone),
    billingAddress: normalizeOptional(input.billingAddress),
    notes: normalizeOptional(input.notes),
    markdownPath: personMarkdownPath(slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction(() => {
    db.prepare(`
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
      person.id,
      person.slug,
      person.name,
      person.roleSummary,
      person.email,
      person.phone,
      person.billingAddress,
      person.notes,
      person.markdownPath,
      person.createdAt,
      person.updatedAt
    );
    replacePersonAliases(person.id, person.aliases);
  })();

  writePersonMarkdown(person);
  refreshMemoryDocumentIndex();
  return person;
};

export const createAppointment = (input: CreateAppointmentInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  const appointment: AppointmentRecord = {
    id: createId("appointment"),
    sourceSystem: normalizeOptional(input.sourceSystem) ?? "manual",
    externalId: normalizeOptional(input.externalId),
    title: input.title.trim(),
    startsAt: input.startsAt,
    endsAt: normalizeOptional(input.endsAt),
    allDay: input.allDay ?? false,
    notes: normalizeOptional(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.prepare(`
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
    appointment.id,
    appointment.sourceSystem,
    appointment.externalId,
    appointment.title,
    appointment.startsAt,
    appointment.endsAt,
    appointment.allDay ? 1 : 0,
    appointment.notes,
    appointment.createdAt,
    appointment.updatedAt
  );

  syncSummaryMarkdown();
  return appointment;
};

export const createMission = (input: CreateMissionInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  const slug = uniqueSlug("missions", input.title);
  const mission: MissionRecord = {
    id: createId("mission"),
    slug,
    title: input.title.trim(),
    summary: normalizeOptional(input.summary),
    status: "active",
    dueAt: normalizeOptional(input.dueAt),
    markdownPath: missionMarkdownPath(slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction(() => {
    db.prepare(`
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
      mission.id,
      mission.slug,
      mission.title,
      mission.summary,
      mission.status,
      mission.dueAt,
      mission.markdownPath,
      mission.createdAt,
      mission.updatedAt
    );

    if (mission.dueAt) {
      createDeadlineRecord(
        {
          title: `Mission due: ${mission.title}`,
          dueAt: mission.dueAt,
          priority: "high",
        },
        "mission",
        mission.id
      );
    }
  })();

  writeMissionMarkdown(mission);
  syncSummaryMarkdown();
  return mission;
};

export const createProject = (input: CreateProjectInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  const slug = uniqueSlug("projects", input.title);
  const projectId = createId("project");
  const taskTemplate = loadProjectTaskTemplateForCreation(input.taskTemplateId);
  const templateTodos = buildProjectTaskTemplateTodos(projectId, taskTemplate);
  const project: ProjectRecord = {
    id: projectId,
    missionId: normalizeOptional(input.missionId),
    slug,
    title: input.title.trim(),
    summary: normalizeOptional(input.summary),
    status: "active",
    dueAt: normalizeOptional(input.dueAt),
    markdownPath: projectMarkdownPath(slug),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction(() => {
    db.prepare(`
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
      project.id,
      project.missionId,
      project.slug,
      project.title,
      project.summary,
      project.status,
      project.dueAt,
      project.markdownPath,
      project.createdAt,
      project.updatedAt
    );

    if (project.dueAt) {
      createDeadlineRecord(
        {
          title: `Project due: ${project.title}`,
          dueAt: project.dueAt,
          priority: "high",
        },
        "project",
        project.id
      );
    }

    if (templateTodos.length > 0) {
      const insertTemplateTodo = db.prepare(`
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
      `);

      for (const task of templateTodos) {
        insertTemplateTodo.run(
          createId("todo"),
          task.projectId,
          task.title,
          "active",
          task.priority ?? "normal",
          null,
          task.moneyRelated ? 1 : 0,
          task.quickAction ? 1 : 0,
          task.estimatedMinutes ?? null,
          null,
          task.sourceKind,
          task.sourceRef,
          task.notes ?? null,
          timestamp,
          timestamp
        );
      }
    }
  })();

  const missionTitle = project.missionId
    ? (db.prepare("SELECT title FROM missions WHERE id = ?").get(project.missionId) as
        | { title: string }
        | undefined)?.title ?? null
    : null;
  writeProjectMarkdown(project, missionTitle);
  syncSummaryMarkdown();
  return project;
};

export const createTodo = (input: CreateTodoInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();
  const todo: TodoRecord = {
    id: createId("todo"),
    projectId: normalizeOptional(input.projectId),
    title: input.title.trim(),
    status: "active",
    priority: input.priority ?? "normal",
    dueAt: normalizeOptional(input.dueAt),
    moneyRelated: input.moneyRelated ?? false,
    quickAction: input.quickAction ?? false,
    estimatedMinutes: input.estimatedMinutes ?? null,
    waitingOnPersonId: normalizeOptional(input.waitingOnPersonId),
    sourceKind: normalizeOptional(input.sourceKind),
    sourceRef: normalizeOptional(input.sourceRef),
    notes: normalizeOptional(input.notes),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction(() => {
    db.prepare(`
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
      todo.id,
      todo.projectId,
      todo.title,
      todo.status,
      todo.priority,
      todo.dueAt,
      todo.moneyRelated ? 1 : 0,
      todo.quickAction ? 1 : 0,
      todo.estimatedMinutes,
      todo.waitingOnPersonId,
      todo.sourceKind,
      todo.sourceRef,
      todo.notes,
      todo.createdAt,
      todo.updatedAt
    );

    if (todo.dueAt) {
      createDeadlineRecord(
        {
          title: `Todo due: ${todo.title}`,
          dueAt: todo.dueAt,
          priority: todo.priority,
        },
        "todo",
        todo.id
      );
    }
    syncTodoPersonLinks(todo.waitingOnPersonId, todo.projectId);
  })();

  syncSummaryMarkdown();
  return todo;
};

export const createStandaloneDeadline = (input: CreateDeadlineInput) => {
  const deadline = createDeadlineRecord(input, input.entityKind ?? "standalone", input.entityId ?? null);
  syncSummaryMarkdown();
  return deadline;
};

const syncLinkedDeadlineStatus = (
  entityKind: "mission" | "project" | "todo",
  entityId: string,
  status: WorkStatus
) => {
  getPraxisDatabase()
    .prepare(
      "UPDATE deadlines SET status = ?, updated_at = ? WHERE entity_kind = ? AND entity_id = ?"
    )
    .run(status, nowIso(), entityKind, entityId);
};

const upsertLinkedDeadline = (
  entityKind: "mission" | "project" | "todo",
  entityId: string,
  title: string,
  dueAt: string | null,
  priority: WorkPriority
) => {
  const db = getPraxisDatabase();
  if (!dueAt) {
    db.prepare("DELETE FROM deadlines WHERE entity_kind = ? AND entity_id = ?").run(
      entityKind,
      entityId
    );
    return;
  }

  const existing = db
    .prepare("SELECT id FROM deadlines WHERE entity_kind = ? AND entity_id = ? LIMIT 1")
    .get(entityKind, entityId) as { id: string } | undefined;
  const timestamp = nowIso();
  if (existing) {
    db.prepare(
      "UPDATE deadlines SET title = ?, due_at = ?, priority = ?, updated_at = ? WHERE id = ?"
    ).run(title, dueAt, priority, timestamp, existing.id);
    return;
  }

  createDeadlineRecord(
    {
      title,
      dueAt,
      priority,
    },
    entityKind,
    entityId
  );
};

export const updateWorkRecord = (input: UpdateWorkRecordInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();

  if (input.entityKind === "mission") {
    const dueAt = normalizeOptional(input.dueAt);
    db.transaction(() => {
      db.prepare(
        "UPDATE missions SET title = ?, summary = ?, due_at = ?, updated_at = ? WHERE id = ?"
      ).run(input.title.trim(), normalizeOptional(input.summary), dueAt, timestamp, input.id);
      upsertLinkedDeadline("mission", input.id, `Mission due: ${input.title.trim()}`, dueAt, "high");
    })();

    const mission = getMissionById(input.id);
    if (mission) {
      writeMissionMarkdown(mission);
    }
    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  if (input.entityKind === "project") {
    const dueAt = normalizeOptional(input.dueAt);
    const missionId = normalizeOptional(input.missionId);
    db.transaction(() => {
      db.prepare(
        "UPDATE projects SET mission_id = ?, title = ?, summary = ?, due_at = ?, updated_at = ? WHERE id = ?"
      ).run(missionId, input.title.trim(), normalizeOptional(input.summary), dueAt, timestamp, input.id);
      upsertLinkedDeadline("project", input.id, `Project due: ${input.title.trim()}`, dueAt, "high");
    })();

    const project = getProjectById(input.id);
    if (project) {
      writeProjectMarkdown(project, getMissionTitle(project.missionId));
    }
    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  if (input.entityKind === "todo") {
    const dueAt = normalizeOptional(input.dueAt);
    db.transaction(() => {
      db.prepare(`
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
        normalizeOptional(input.projectId),
        input.title.trim(),
        input.priority ?? "normal",
        dueAt,
        input.moneyRelated ? 1 : 0,
        input.quickAction ? 1 : 0,
        input.estimatedMinutes ?? null,
        normalizeOptional(input.waitingOnPersonId),
        normalizeOptional(input.notes),
        timestamp,
        input.id
      );
      upsertLinkedDeadline("todo", input.id, `Todo due: ${input.title.trim()}`, dueAt, input.priority ?? "normal");
      syncTodoPersonLinks(normalizeOptional(input.waitingOnPersonId), normalizeOptional(input.projectId));
    })();

    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  if (input.entityKind === "deadline") {
    db.prepare(
      "UPDATE deadlines SET title = ?, due_at = ?, priority = ?, updated_at = ? WHERE id = ?"
    ).run(input.title.trim(), input.dueAt, input.priority ?? "normal", timestamp, input.id);
    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  if (input.entityKind === "person") {
    db.transaction(() => {
      db.prepare(`
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
        input.name.trim(),
        normalizeOptional(input.roleSummary),
        normalizeOptional(input.email),
        normalizeOptional(input.phone),
        normalizeOptional(input.billingAddress),
        normalizeOptional(input.notes),
        timestamp,
        input.id
      );
      replacePersonAliases(input.id, input.aliases ?? []);
    })();
    const person = getPersonById(input.id);
    if (person) {
      writePersonMarkdown(person);
    }
    refreshMemoryDocumentIndex();
    return getWorkSnapshot();
  }

  db.prepare(`
    UPDATE appointments
    SET title = ?,
        starts_at = ?,
        ends_at = ?,
        all_day = ?,
        notes_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    input.title.trim(),
    input.startsAt,
    normalizeOptional(input.endsAt),
    input.allDay ? 1 : 0,
    normalizeOptional(input.notes),
    timestamp,
    input.id
  );
  syncSummaryMarkdown();
  return getWorkSnapshot();
};

export const deleteWorkRecord = (input: DeleteWorkRecordInput) => {
  const db = getPraxisDatabase();

  db.transaction(() => {
    if (input.entityKind === "mission") {
      db.prepare("DELETE FROM deadlines WHERE entity_kind = 'mission' AND entity_id = ?").run(input.id);
      db.prepare("UPDATE projects SET mission_id = NULL, updated_at = ? WHERE mission_id = ?").run(
        nowIso(),
        input.id
      );
      db.prepare("DELETE FROM missions WHERE id = ?").run(input.id);
      return;
    }

    if (input.entityKind === "project") {
      db.prepare("DELETE FROM deadlines WHERE entity_kind = 'project' AND entity_id = ?").run(input.id);
      db.prepare("UPDATE todos SET project_id = NULL, updated_at = ? WHERE project_id = ?").run(
        nowIso(),
        input.id
      );
      db.prepare("DELETE FROM projects WHERE id = ?").run(input.id);
      return;
    }

    if (input.entityKind === "todo") {
      db.prepare("DELETE FROM deadlines WHERE entity_kind = 'todo' AND entity_id = ?").run(input.id);
      db.prepare("DELETE FROM todos WHERE id = ?").run(input.id);
      return;
    }

    if (input.entityKind === "deadline") {
      db.prepare("DELETE FROM deadlines WHERE id = ?").run(input.id);
      return;
    }

    if (input.entityKind === "person") {
      db.prepare("UPDATE todos SET waiting_on_person_id = NULL, updated_at = ? WHERE waiting_on_person_id = ?").run(
        nowIso(),
        input.id
      );
      db.prepare("DELETE FROM person_work_links WHERE person_id = ?").run(input.id);
      db.prepare("DELETE FROM people WHERE id = ?").run(input.id);
      return;
    }

    db.prepare("DELETE FROM appointments WHERE id = ?").run(input.id);
  })();

  syncSummaryMarkdown();
  return getWorkSnapshot();
};

export const updateWorkStatus = (input: UpdateWorkStatusInput) => {
  const db = getPraxisDatabase();
  const timestamp = nowIso();

  if (input.entityKind === "mission") {
    db.transaction(() => {
      db.prepare("UPDATE missions SET status = ?, updated_at = ? WHERE id = ?").run(
        input.status,
        timestamp,
        input.id
      );
      syncLinkedDeadlineStatus("mission", input.id, input.status);
    })();

    const mission = getMissionById(input.id);
    if (mission) {
      writeMissionMarkdown(mission);
    }
    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  if (input.entityKind === "project") {
    db.transaction(() => {
      db.prepare("UPDATE projects SET status = ?, updated_at = ? WHERE id = ?").run(
        input.status,
        timestamp,
        input.id
      );
      syncLinkedDeadlineStatus("project", input.id, input.status);
    })();

    const project = getProjectById(input.id);
    if (project) {
      writeProjectMarkdown(project, getMissionTitle(project.missionId));
    }
    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  if (input.entityKind === "todo") {
    db.transaction(() => {
      db.prepare("UPDATE todos SET status = ?, updated_at = ? WHERE id = ?").run(
        input.status,
        timestamp,
        input.id
      );
      syncLinkedDeadlineStatus("todo", input.id, input.status);
    })();

    syncSummaryMarkdown();
    return getWorkSnapshot();
  }

  db.prepare("UPDATE deadlines SET status = ?, updated_at = ? WHERE id = ?").run(
    input.status,
    timestamp,
    input.id
  );
  syncSummaryMarkdown();
  return getWorkSnapshot();
};
