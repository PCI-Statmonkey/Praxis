export type WorkStatus = "active" | "blocked" | "completed" | "paused";

export type WorkPriority = "low" | "normal" | "high" | "critical";

export type ProjectTaskTemplateId = string;

export type ProjectTaskTemplateSelection = "none" | ProjectTaskTemplateId;

export type WorkEntityKind = "mission" | "project" | "todo" | "deadline";

export type EditableWorkEntityKind = WorkEntityKind | "appointment" | "person";

export type DeadlineEntityKind = "mission" | "project" | "todo" | "standalone";

export type MissionRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  dueAt: string | null;
  markdownPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectRecord = {
  id: string;
  missionId: string | null;
  slug: string;
  title: string;
  summary: string | null;
  status: WorkStatus;
  dueAt: string | null;
  markdownPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TodoRecord = {
  id: string;
  projectId: string | null;
  title: string;
  status: WorkStatus;
  priority: WorkPriority;
  dueAt: string | null;
  moneyRelated: boolean;
  quickAction: boolean;
  estimatedMinutes: number | null;
  waitingOnPersonId: string | null;
  sourceKind: string | null;
  sourceRef: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DeadlineRecord = {
  id: string;
  entityKind: DeadlineEntityKind;
  entityId: string | null;
  title: string;
  dueAt: string;
  status: WorkStatus;
  priority: WorkPriority;
  sourceKind: string | null;
  sourceRef: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentRecord = {
  id: string;
  sourceSystem: string;
  externalId: string | null;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonRecord = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  roleSummary: string | null;
  email: string | null;
  phone: string | null;
  billingAddress: string | null;
  notes: string | null;
  markdownPath: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonWorkLinkRecord = {
  id: string;
  personId: string;
  entityKind: "mission" | "project";
  entityId: string;
  relationship: string;
  sourceKind: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePersonWorkLinkInput = {
  personId: string;
  entityKind: "mission" | "project";
  entityId: string;
  relationship: string;
};

export type DeletePersonWorkLinkInput = {
  id: string;
};

export type MemoryDocumentSummary = {
  title: string;
  relativePath: string;
  docKind: string;
  entityKind: string;
};

export type ProjectTaskTemplateOption = {
  id: ProjectTaskTemplateSelection;
  label: string;
};

export type WorkSnapshot = {
  missions: MissionRecord[];
  projects: ProjectRecord[];
  todos: TodoRecord[];
  deadlines: DeadlineRecord[];
  appointments: AppointmentRecord[];
  people: PersonRecord[];
  personWorkLinks: PersonWorkLinkRecord[];
  memoryDocuments: MemoryDocumentSummary[];
  projectTaskTemplates?: ProjectTaskTemplateOption[];
};

export type CreateMissionInput = {
  title: string;
  summary?: string;
  dueAt?: string;
};

export type CreateProjectInput = {
  title: string;
  summary?: string;
  missionId?: string;
  dueAt?: string;
  taskTemplateId?: ProjectTaskTemplateSelection | "";
};

export type CreateTodoInput = {
  title: string;
  projectId?: string;
  priority?: WorkPriority;
  dueAt?: string;
  moneyRelated?: boolean;
  quickAction?: boolean;
  estimatedMinutes?: number;
  waitingOnPersonId?: string;
  sourceKind?: string;
  sourceRef?: string;
  notes?: string;
};

export type CreatePersonInput = {
  name: string;
  aliases?: string[];
  roleSummary?: string;
  email?: string;
  phone?: string;
  billingAddress?: string;
  notes?: string;
};

export type CreateDeadlineInput = {
  title: string;
  dueAt: string;
  entityKind?: DeadlineEntityKind;
  entityId?: string;
  priority?: WorkPriority;
  sourceKind?: string;
  sourceRef?: string;
};

export type CreateAppointmentInput = {
  title: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  notes?: string;
  sourceSystem?: string;
  externalId?: string;
};

export type UpdateWorkStatusInput = {
  entityKind: WorkEntityKind;
  id: string;
  status: WorkStatus;
};

export type UpdateWorkRecordInput =
  | {
      entityKind: "mission";
      id: string;
      title: string;
      summary?: string;
      dueAt?: string;
    }
  | {
      entityKind: "project";
      id: string;
      title: string;
      summary?: string;
      missionId?: string;
      dueAt?: string;
    }
  | {
      entityKind: "todo";
      id: string;
      title: string;
      projectId?: string;
      priority?: WorkPriority;
      dueAt?: string;
      moneyRelated?: boolean;
      quickAction?: boolean;
      estimatedMinutes?: number;
      waitingOnPersonId?: string;
      notes?: string;
    }
  | {
      entityKind: "person";
      id: string;
      name: string;
      aliases?: string[];
      roleSummary?: string;
      email?: string;
      phone?: string;
      billingAddress?: string;
      notes?: string;
    }
  | {
      entityKind: "deadline";
      id: string;
      title: string;
      dueAt: string;
      priority?: WorkPriority;
    }
  | {
      entityKind: "appointment";
      id: string;
      title: string;
      startsAt: string;
      endsAt?: string;
      allDay?: boolean;
      notes?: string;
    };

export type DeleteWorkRecordInput = {
  entityKind: EditableWorkEntityKind;
  id: string;
};

export type ProjectTaskTemplateItem = {
  title: string;
  taskSlug: string;
  priority: WorkPriority;
  moneyRelated: boolean;
  quickAction: boolean;
  estimatedMinutes: number | null;
  notes: string | null;
};

export type ProjectTaskTemplateDefinition = {
  id: ProjectTaskTemplateId;
  slug: string;
  label: string;
  version: 1;
  status: "active" | "draft" | "archived";
  markdownPath: string;
  source: string;
  items: ProjectTaskTemplateItem[];
};

export type ProjectTaskTemplateSeed = {
  id: ProjectTaskTemplateId;
  markdownPath: string;
  markdown: string;
};

export const PROJECT_TASK_TEMPLATE_SOURCE_KIND = "project_template";

export const PROJECT_TASK_TEMPLATE_NONE: ProjectTaskTemplateSelection = "none";

export const PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT = "templates/project-task-templates";

export const ENGINEERING_PROJECT_TEMPLATE_ID: ProjectTaskTemplateId = "engineering-project";

export const ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH =
  `${PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT}/${ENGINEERING_PROJECT_TEMPLATE_ID}.md`;

export const ENGINEERING_PROJECT_TEMPLATE_MARKDOWN = `---
kind: project_task_template
slug: engineering-project
label: Engineering Project
version: 1
status: active
source: built_in
---

# Engineering Project

## Tasks

- [ ] Contract
- [ ] Billing initial payment
- [ ] Electrical
- [ ] Mechanical
- [ ] Plumbing
- [ ] Grease separator
- [ ] Sign and seal
- [ ] Sent to client
- [ ] Billing final payment
- [ ] Under building department review
`;

export const PROJECT_TASK_TEMPLATE_OPTIONS: ProjectTaskTemplateOption[] = [
  { id: PROJECT_TASK_TEMPLATE_NONE, label: "None" },
  { id: ENGINEERING_PROJECT_TEMPLATE_ID, label: "Engineering Project" },
];

export const PROJECT_TASK_TEMPLATE_SEEDS: ProjectTaskTemplateSeed[] = [
  {
    id: ENGINEERING_PROJECT_TEMPLATE_ID,
    markdownPath: ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH,
    markdown: ENGINEERING_PROJECT_TEMPLATE_MARKDOWN,
  },
];

export const getProjectTaskTemplateSeed = (
  templateId: ProjectTaskTemplateSelection | "" | null | undefined
) => PROJECT_TASK_TEMPLATE_SEEDS.find((seed) => seed.id === templateId) ?? null;

const frontmatterPattern = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const slugifyTemplateSegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseProjectTaskTemplateFrontmatter = (markdown: string) => {
  const frontmatterMatch = frontmatterPattern.exec(markdown);
  if (!frontmatterMatch) {
    throw new Error("Project task template markdown requires frontmatter.");
  }

  const entries = new Map<string, string>();
  for (const line of frontmatterMatch[1].split(/\r?\n/)) {
    const delimiterIndex = line.indexOf(":");
    if (delimiterIndex === -1) {
      continue;
    }
    const key = line.slice(0, delimiterIndex).trim();
    const value = line.slice(delimiterIndex + 1).trim();
    if (key) {
      entries.set(key, value);
    }
  }

  return entries;
};

const parseProjectTaskTemplateTaskTitles = (markdown: string) => {
  const taskSection = markdown.split(/^##\s+Tasks\s*$/im)[1] ?? "";
  const taskLines = taskSection.split(/^##\s+/m)[0] ?? "";
  return taskLines
    .split(/\r?\n/)
    .map((line) => /^\s*-\s+\[[ xX]\]\s+(.+?)\s*$/.exec(line)?.[1]?.trim() ?? "")
    .filter((title) => title.length > 0);
};

const isProjectTaskTemplateStatus = (
  value: string | undefined
): value is ProjectTaskTemplateDefinition["status"] =>
  value === "active" || value === "draft" || value === "archived";

const moneyRelatedTemplateTaskTitles = new Set([
  "Billing initial payment",
  "Billing final payment",
]);

export const parseProjectTaskTemplateMarkdown = (
  markdown: string,
  markdownPath: string
): ProjectTaskTemplateDefinition => {
  const frontmatter = parseProjectTaskTemplateFrontmatter(markdown);
  if (frontmatter.get("kind") !== "project_task_template") {
    throw new Error("Project task template markdown kind must be project_task_template.");
  }

  const slug = frontmatter.get("slug")?.trim();
  if (!slug) {
    throw new Error("Project task template markdown requires a slug.");
  }

  const version = Number(frontmatter.get("version") ?? "1");
  if (version !== 1) {
    throw new Error("Only project task template version 1 is supported.");
  }

  const status = frontmatter.get("status");
  const taskTitles = parseProjectTaskTemplateTaskTitles(markdown);
  if (taskTitles.length === 0) {
    throw new Error("Project task template markdown requires at least one task.");
  }

  return {
    id: slug as ProjectTaskTemplateId,
    slug,
    label: frontmatter.get("label")?.trim() || slug,
    version,
    status: isProjectTaskTemplateStatus(status) ? status : "active",
    markdownPath,
    source: frontmatter.get("source")?.trim() || "markdown",
    items: taskTitles.map((title, index) => ({
      title,
      taskSlug: `${String(index + 1).padStart(2, "0")}-${slugifyTemplateSegment(title)}`,
      priority: "normal",
      moneyRelated: moneyRelatedTemplateTaskTitles.has(title),
      quickAction: false,
      estimatedMinutes: null,
      notes: null,
    })),
  };
};

export const ENGINEERING_PROJECT_TEMPLATE = parseProjectTaskTemplateMarkdown(
  ENGINEERING_PROJECT_TEMPLATE_MARKDOWN,
  ENGINEERING_PROJECT_TEMPLATE_MARKDOWN_PATH
);

export const PROJECT_TASK_TEMPLATES: ProjectTaskTemplateDefinition[] = [
  ENGINEERING_PROJECT_TEMPLATE,
];

export const getProjectTaskTemplate = (
  templateId: ProjectTaskTemplateSelection | "" | null | undefined
) =>
  PROJECT_TASK_TEMPLATES.find((template) => template.id === templateId) ?? null;

export const buildProjectTaskTemplateTodos = (
  projectId: string,
  template: ProjectTaskTemplateDefinition | null | undefined
): CreateTodoInput[] => {
  const normalizedProjectId = projectId.trim();
  if (!template || template.status !== "active" || !normalizedProjectId) {
    return [];
  }

  return template.items.map((item) => ({
    title: item.title,
    projectId: normalizedProjectId,
    priority: item.priority,
    moneyRelated: item.moneyRelated,
    quickAction: item.quickAction,
    estimatedMinutes: item.estimatedMinutes ?? undefined,
    sourceKind: PROJECT_TASK_TEMPLATE_SOURCE_KIND,
    sourceRef: `${template.slug}:v${template.version}:${item.taskSlug}`,
    notes: item.notes ?? undefined,
  }));
};
