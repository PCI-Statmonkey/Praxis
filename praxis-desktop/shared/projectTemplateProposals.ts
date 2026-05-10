import {
  parseProjectTaskTemplateMarkdown,
  PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT,
  PROJECT_TASK_TEMPLATE_SOURCE_KIND,
  type ProjectTaskTemplateDefinition,
  type ProjectRecord,
  type TodoRecord,
  type WorkPriority,
} from "./workModel";

export type ExistingProjectTemplateMetadata = {
  slug: string;
  label?: string | null;
  version?: 1 | number | null;
  status?: "active" | "draft" | "archived" | string | null;
  path?: string | null;
  source?: string | null;
  items?: Array<{
    title: string;
    taskSlug?: string | null;
    priority?: WorkPriority;
    moneyRelated?: boolean;
    quickAction?: boolean;
    estimatedMinutes?: number | null;
    notes?: string | null;
  }>;
};

export type ProjectTemplateProposalEvidence = {
  taskSlug: string;
  title: string;
  projectIds: string[];
  projectCount: number;
  occurrenceCount: number;
};

export type ProjectTemplateProposalWriteBoundary = {
  saved: false;
  writesOnConfirmOnly: true;
  existingProjectsChange: false;
  providerWrites: false;
};

export type ProjectTemplateProposalType = "new_template" | "template_revision";

export type ProjectTemplateRevisionChange =
  | {
      kind: "add_task";
      taskSlug: string;
      title: string;
      evidenceProjectIds: string[];
    }
  | {
      kind: "keep_task";
      taskSlug: string;
      title: string;
    };

type ProjectTemplateProposalBase = {
  id: string;
  status: "draft";
  source: "ai_proposal";
  basedOnProjectIds: string[];
  matchedProjectCount: number;
  matchedProjectTitles: string[];
  taskOverlapPercent: number;
  evidenceSummary: string;
  clusterId: string;
  proposalFingerprint: string;
  materialChangeHash: string;
  writeBoundary: ProjectTemplateProposalWriteBoundary;
  evidence: ProjectTemplateProposalEvidence[];
  markdownDraft: string;
  explanation: string;
};

export type NewProjectTemplateProposal = ProjectTemplateProposalBase & {
  proposalType: "new_template";
  proposedSlug: string;
  proposedLabel: string;
  proposedVersion: 1;
  recurringTaskCount: number;
};

export type ProjectTemplateRevisionProposal = ProjectTemplateProposalBase & {
  proposalType: "template_revision";
  templateSlug: string;
  templatePath: string;
  currentVersion: 1;
  proposedVersion: 1;
  proposedSlug: string;
  proposedLabel: string;
  recurringTaskCount: number;
  changes: ProjectTemplateRevisionChange[];
};

export type ProjectTemplateProposal =
  | NewProjectTemplateProposal
  | ProjectTemplateRevisionProposal;

export type ProjectTemplateProposalStateStatus =
  | "draft"
  | "dismissed"
  | "rejected"
  | "snoozed"
  | "accepted"
  | "never";

export type ProjectTemplateProposalState = {
  fingerprint: string;
  proposalType: ProjectTemplateProposalType;
  clusterId: string;
  materialChangeHash: string;
  status: ProjectTemplateProposalStateStatus;
  shownCount: number;
  lastShownAt: string | null;
  dismissalReason: string | null;
  snoozeUntil: string | null;
  templateSlug: string | null;
  templatePath: string | null;
  acceptedTemplateSlug: string | null;
  acceptedTemplatePath: string | null;
  acceptedTemplateVersion: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectTemplateProposalSnapshot = {
  proposals: ProjectTemplateProposal[];
};

export type ProjectTemplateProposalActionInput = {
  fingerprint: string;
  proposalType?: ProjectTemplateProposalType;
  clusterId: string;
  materialChangeHash: string;
};

export type ProjectTemplateProposalSaveInput = ProjectTemplateProposalActionInput & {
  markdown: string;
};

export type ProjectTemplateProposalShownInput = {
  proposals: ProjectTemplateProposalActionInput[];
};

export type ProjectTemplateProposalShownResult = {
  ok: true;
  shownCount: number;
};

export type ProjectTemplateProposalActionResult = {
  ok: true;
  message: string;
  snapshot: ProjectTemplateProposalSnapshot;
};

export type ProjectTemplateProposalSaveResult = ProjectTemplateProposalActionResult & {
  template: {
    slug: string;
    label: string;
    path: string;
  };
};

export type ProjectTemplateManagementTemplate = {
  slug: string;
  label: string;
  status: "active" | "draft" | "archived";
  source: string;
  path: string;
  taskCount: number;
  builtIn: boolean;
};

export type ProjectTemplateManagementSnapshot = {
  templates: ProjectTemplateManagementTemplate[];
  proposalStates: ProjectTemplateProposalState[];
};

export type ClearProjectTemplateProposalStateInput = {
  fingerprint: string;
};

export type ClearProjectTemplateProposalStateResult = {
  ok: true;
  message: string;
  snapshot: ProjectTemplateManagementSnapshot;
};

export type ProjectTemplateProposalFilterOptions = {
  now?: string | Date;
  dismissedCooldownDays?: number;
};

export type RecordProjectTemplateProposalShownStateInput = {
  proposal: ProjectTemplateProposal;
  existingState?: ProjectTemplateProposalState | null;
  shownAt: string;
};

export type BuildProjectTemplateProposalsInput = {
  projects: ProjectRecord[];
  todos: TodoRecord[];
  existingTemplates?: ExistingProjectTemplateMetadata[];
  minSimilarProjects?: number;
  minRecurringTasks?: number;
  minProjectOverlap?: number;
};

export type BuildProjectTemplateRevisionProposalsInput = {
  projects: ProjectRecord[];
  todos: TodoRecord[];
  existingTemplates: ExistingProjectTemplateMetadata[];
  minSimilarProjects?: number;
  minRepeatedNewTasks?: number;
  minTemplateOverlap?: number;
};

export type ProjectTemplateApplyPreviewInput = {
  template: ProjectTaskTemplateDefinition;
  projects: ProjectRecord[];
  todos: TodoRecord[];
  projectIds: string[];
};

export type ProjectTemplateApplyPreview = {
  templateSlug: string;
  templateVersion: number;
  projectPreviews: Array<{
    projectId: string;
    projectTitle: string;
    missingTasks: Array<{
      taskSlug: string;
      title: string;
      priority: WorkPriority;
      moneyRelated: boolean;
      quickAction: boolean;
      estimatedMinutes: number | null;
      notes: string | null;
      sourceRef: string;
    }>;
    duplicateWarnings: Array<{
      templateTaskSlug: string;
      existingTodoId: string;
      existingTitle: string;
    }>;
  }>;
  writeBoundary: {
    createsTodos: false;
    writesOnConfirmOnly: true;
    editsExistingTodos: false;
    providerWrites: false;
  };
};

export type ProjectTemplateApplyTaskSelection = {
  projectId: string;
  taskSlug: string;
};

export type ProjectTemplateApplyConfirmInput = {
  templateSlug: string;
  projectIds: string[];
  selectedTasks: ProjectTemplateApplyTaskSelection[];
};

export type ProjectTemplateApplyTodoCreation = {
  projectId: string;
  taskSlug: string;
  title: string;
  priority: WorkPriority;
  moneyRelated: boolean;
  quickAction: boolean;
  estimatedMinutes: number | null;
  notes: string | null;
  sourceRef: string;
};

export type ProjectTemplateApplyConfirmResult = {
  ok: true;
  message: string;
  templateSlug: string;
  templateVersion: number;
  selectedProjectCount: number;
  requestedTaskCount: number;
  createdCount: number;
  skippedDuplicateCount: number;
  createdTodos: Array<{
    id: string;
    projectId: string | null;
    title: string;
    sourceRef: string | null;
  }>;
  writeBoundary: {
    createsTodos: true;
    writesOnConfirmOnly: true;
    editsExistingTodos: false;
    providerWrites: false;
  };
};

type ProjectTaskProfile = {
  project: ProjectRecord;
  taskSlugs: Set<string>;
  taskTitlesBySlug: Map<string, string[]>;
};

const DEFAULT_MIN_SIMILAR_PROJECTS = 3;
const DEFAULT_MIN_RECURRING_TASKS = 5;
const DEFAULT_MIN_PROJECT_OVERLAP = 0.6;
const DEFAULT_MIN_REPEATED_NEW_TASKS = 1;
const DEFAULT_MIN_TEMPLATE_OVERLAP = 0.55;
const DEFAULT_DISMISSED_COOLDOWN_DAYS = 30;
const MAX_PROJECT_TEMPLATE_PROPOSAL_MARKDOWN_LENGTH = 50_000;

const titleStopWords = new Set(["a", "an", "the"]);

const projectTitleStopWords = new Set(["a", "an", "the", "for", "at", "of"]);

const projectTemplateProposalStateStatuses = new Set<ProjectTemplateProposalStateStatus>([
  "draft",
  "dismissed",
  "rejected",
  "snoozed",
  "accepted",
  "never",
]);

const projectTemplateSlugPattern = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

const toTitleCase = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");

const normalizeWords = (value: string, stopWords: Set<string>) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && !stopWords.has(word));

export const normalizeProjectTemplateTaskTitle = (title: string) =>
  normalizeWords(title, titleStopWords).join(" ");

export const projectTemplateTaskSlug = (title: string) =>
  normalizeProjectTemplateTaskTitle(title)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const canonicalProjectTemplateTaskSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^\d{1,3}-+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const slugify = (value: string) =>
  normalizeWords(value, projectTitleStopWords)
    .join("-")
    .replace(/^-+|-+$/g, "");

const stableHash = (value: string) => {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36);
};

export const isProjectTemplateProposalStateStatus = (
  value: unknown
): value is ProjectTemplateProposalStateStatus =>
  typeof value === "string" && projectTemplateProposalStateStatuses.has(value as ProjectTemplateProposalStateStatus);

const parseTime = (value: string | Date | null | undefined) => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const jaccardSimilarity = (left: Set<string>, right: Set<string>) => {
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersectionCount = 0;
  left.forEach((value) => {
    if (right.has(value)) {
      intersectionCount += 1;
    }
  });

  return intersectionCount / (left.size + right.size - intersectionCount);
};

const averagePairwiseOverlap = (profiles: ProjectTaskProfile[]) => {
  let overlapTotal = 0;
  let pairCount = 0;

  for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profiles.length; rightIndex += 1) {
      overlapTotal += jaccardSimilarity(profiles[leftIndex].taskSlugs, profiles[rightIndex].taskSlugs);
      pairCount += 1;
    }
  }

  return pairCount > 0 ? overlapTotal / pairCount : 0;
};

const mostCommonTitle = (titles: string[]) => {
  const counts = new Map<string, number>();
  titles.forEach((title) => {
    const normalized = title.trim().replace(/\s+/g, " ");
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  });

  return [...counts.entries()].sort(
    ([leftTitle, leftCount], [rightTitle, rightCount]) =>
      rightCount - leftCount || leftTitle.localeCompare(rightTitle)
  )[0]?.[0] ?? titles[0] ?? "";
};

const projectLabelFor = (projects: ProjectRecord[]) => {
  const tokenCounts = new Map<string, number>();
  projects.forEach((project) => {
    new Set(normalizeWords(project.title, projectTitleStopWords)).forEach((token) => {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    });
  });

  const minimumOccurrences = Math.max(2, Math.ceil(projects.length * 0.67));
  const firstProjectTokens = normalizeWords(projects[0]?.title ?? "", projectTitleStopWords);
  const commonTokens = firstProjectTokens.filter(
    (token) => (tokenCounts.get(token) ?? 0) >= minimumOccurrences && !/^\d+$/.test(token)
  );

  return commonTokens.length > 0 ? toTitleCase(commonTokens.join(" ")) : "Repeated Project";
};

const buildProfiles = (projects: ProjectRecord[], todos: TodoRecord[]): ProjectTaskProfile[] => {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const profileByProjectId = new Map<string, ProjectTaskProfile>();

  todos.forEach((todo) => {
    if (!todo.projectId || !projectById.has(todo.projectId)) {
      return;
    }

    const taskSlug = projectTemplateTaskSlug(todo.title);
    if (!taskSlug) {
      return;
    }

    const project = projectById.get(todo.projectId);
    if (!project) {
      return;
    }

    const profile =
      profileByProjectId.get(todo.projectId) ??
      ({
        project,
        taskSlugs: new Set<string>(),
        taskTitlesBySlug: new Map<string, string[]>(),
      } satisfies ProjectTaskProfile);

    profile.taskSlugs.add(taskSlug);
    profile.taskTitlesBySlug.set(taskSlug, [
      ...(profile.taskTitlesBySlug.get(taskSlug) ?? []),
      todo.title,
    ]);
    profileByProjectId.set(todo.projectId, profile);
  });

  return [...profileByProjectId.values()].filter((profile) => profile.taskSlugs.size > 0);
};

const templateTaskSlugSet = (template: ExistingProjectTemplateMetadata) =>
  new Set(
    (template.items ?? [])
      .map((item) => canonicalProjectTemplateTaskSlug(item.taskSlug ?? projectTemplateTaskSlug(item.title)))
      .filter(Boolean)
  );

const profileMatchesTemplate = (
  profile: ProjectTaskProfile,
  template: ExistingProjectTemplateMetadata,
  todos: TodoRecord[],
  minTemplateOverlap: number
) => {
  const templateSlugs = templateTaskSlugSet(template);
  if (templateSlugs.size === 0) {
    return false;
  }

  if (
    todos.some(
      (todo) =>
        todo.projectId === profile.project.id &&
        todo.sourceKind === PROJECT_TASK_TEMPLATE_SOURCE_KIND &&
        Boolean(todo.sourceRef?.startsWith(`${template.slug}:v`))
    )
  ) {
    return true;
  }

  const canonicalProfileSlugs = new Set(
    [...profile.taskSlugs].map(canonicalProjectTemplateTaskSlug).filter(Boolean)
  );
  return jaccardSimilarity(canonicalProfileSlugs, templateSlugs) >= minTemplateOverlap;
};

const findSimilarComponents = (profiles: ProjectTaskProfile[], minOverlap: number) => {
  const adjacency = new Map<string, Set<string>>();
  profiles.forEach((profile) => adjacency.set(profile.project.id, new Set<string>()));

  for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < profiles.length; rightIndex += 1) {
      const left = profiles[leftIndex];
      const right = profiles[rightIndex];
      if (jaccardSimilarity(left.taskSlugs, right.taskSlugs) >= minOverlap) {
        adjacency.get(left.project.id)?.add(right.project.id);
        adjacency.get(right.project.id)?.add(left.project.id);
      }
    }
  }

  const profileByProjectId = new Map(profiles.map((profile) => [profile.project.id, profile]));
  const visited = new Set<string>();
  const components: ProjectTaskProfile[][] = [];

  profiles.forEach((profile) => {
    if (visited.has(profile.project.id)) {
      return;
    }

    const component: ProjectTaskProfile[] = [];
    const queue = [profile.project.id];
    visited.add(profile.project.id);

    while (queue.length > 0) {
      const projectId = queue.shift();
      if (!projectId) {
        continue;
      }

      const nextProfile = profileByProjectId.get(projectId);
      if (nextProfile) {
        component.push(nextProfile);
      }

      adjacency.get(projectId)?.forEach((neighborId) => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    components.push(component);
  });

  return components;
};

const recurringEvidenceFor = (
  profiles: ProjectTaskProfile[],
  minSimilarProjects: number
): ProjectTemplateProposalEvidence[] => {
  const projectIdsByTaskSlug = new Map<string, Set<string>>();
  const titlesByTaskSlug = new Map<string, string[]>();

  profiles.forEach((profile) => {
    profile.taskSlugs.forEach((taskSlug) => {
      projectIdsByTaskSlug.set(taskSlug, projectIdsByTaskSlug.get(taskSlug) ?? new Set<string>());
      projectIdsByTaskSlug.get(taskSlug)?.add(profile.project.id);
      titlesByTaskSlug.set(taskSlug, [
        ...(titlesByTaskSlug.get(taskSlug) ?? []),
        ...(profile.taskTitlesBySlug.get(taskSlug) ?? []),
      ]);
    });
  });

  return [...projectIdsByTaskSlug.entries()]
    .filter(([, projectIds]) => projectIds.size >= minSimilarProjects)
    .map(([taskSlug, projectIds]) => ({
      taskSlug,
      title: mostCommonTitle(titlesByTaskSlug.get(taskSlug) ?? [taskSlug]),
      projectIds: [...projectIds].sort(),
      projectCount: projectIds.size,
      occurrenceCount: projectIds.size,
    }))
    .sort(
      (left, right) =>
        right.occurrenceCount - left.occurrenceCount ||
        left.title.localeCompare(right.title) ||
        left.taskSlug.localeCompare(right.taskSlug)
    );
};

const templateSuppressesProposal = (
  existingTemplate: ExistingProjectTemplateMetadata,
  proposedSlug: string,
  evidence: ProjectTemplateProposalEvidence[]
) => {
  if (existingTemplate.status && existingTemplate.status !== "active") {
    return false;
  }

  if (existingTemplate.slug === proposedSlug) {
    return true;
  }

  const templateTaskSlugs = new Set(
    (existingTemplate.items ?? [])
      .map((item) => item.taskSlug ?? projectTemplateTaskSlug(item.title))
      .filter((taskSlug) => taskSlug.length > 0)
  );
  if (templateTaskSlugs.size === 0) {
    return false;
  }

  const proposedTaskSlugs = new Set(evidence.map((item) => item.taskSlug));
  const overlap = jaccardSimilarity(templateTaskSlugs, proposedTaskSlugs);
  return overlap >= 0.8;
};

const markdownForProposal = (
  proposedSlug: string,
  proposedLabel: string,
  evidence: ProjectTemplateProposalEvidence[]
) => [
  "---",
  "kind: project_task_template",
  `slug: ${proposedSlug}`,
  `label: ${proposedLabel}`,
  "version: 1",
  "status: active",
  "source: ai_proposal",
  "---",
  "",
  `# ${proposedLabel}`,
  "",
  "## Tasks",
  "",
  ...evidence.map((item) => `- [ ] ${item.title}`),
  "",
].join("\n");

const markdownForRevisionProposal = (
  template: ExistingProjectTemplateMetadata,
  changes: ProjectTemplateRevisionChange[]
) => {
  const label = template.label ?? template.slug;
  const source = template.source ?? "markdown";
  const tasks = changes
    .filter((change) => change.kind === "keep_task" || change.kind === "add_task")
    .map((change) => change.title);
  return [
    "---",
    "kind: project_task_template",
    `slug: ${template.slug}`,
    `label: ${label}`,
    "version: 1",
    "status: active",
    `source: ${source}`,
    "---",
    "",
    `# ${label}`,
    "",
    "## Tasks",
    "",
    ...tasks.map((title) => `- [ ] ${title}`),
    "",
  ].join("\n");
};

export const projectTemplateProposalMarkdownPathForSlug = (slug: string) =>
  `${PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT}/${slug}.md`;

export const validateProjectTemplateProposalMarkdownDraft = (markdown: string) => {
  const trimmedMarkdown = markdown.trim();
  if (!trimmedMarkdown) {
    throw new Error("Project template markdown cannot be blank.");
  }
  if (trimmedMarkdown.length > MAX_PROJECT_TEMPLATE_PROPOSAL_MARKDOWN_LENGTH) {
    throw new Error("Project template markdown is too large.");
  }

  const parsedWithPlaceholder = parseProjectTaskTemplateMarkdown(
    `${trimmedMarkdown}\n`,
    `${PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT}/draft.md`
  );
  if (!projectTemplateSlugPattern.test(parsedWithPlaceholder.slug)) {
    throw new Error("Project template slug must use lowercase letters, numbers, and hyphens.");
  }

  const markdownPath = projectTemplateProposalMarkdownPathForSlug(parsedWithPlaceholder.slug);
  const parsed = parseProjectTaskTemplateMarkdown(`${trimmedMarkdown}\n`, markdownPath);
  return {
    markdown: `${trimmedMarkdown}\n`,
    slug: parsed.slug,
    label: parsed.label,
    path: markdownPath,
    taskCount: parsed.items.length,
  };
};

export const buildProjectTemplateProposals = ({
  projects,
  todos,
  existingTemplates = [],
  minSimilarProjects = DEFAULT_MIN_SIMILAR_PROJECTS,
  minRecurringTasks = DEFAULT_MIN_RECURRING_TASKS,
  minProjectOverlap = DEFAULT_MIN_PROJECT_OVERLAP,
}: BuildProjectTemplateProposalsInput): NewProjectTemplateProposal[] => {
  const profiles = buildProfiles(projects, todos).filter(
    (profile) => profile.taskSlugs.size >= minRecurringTasks
  );
  if (profiles.length < minSimilarProjects) {
    return [];
  }

  return findSimilarComponents(profiles, minProjectOverlap)
    .filter((component) => component.length >= minSimilarProjects)
    .map((component) => {
      const evidence = recurringEvidenceFor(component, minSimilarProjects).slice(0, 20);
      if (evidence.length < minRecurringTasks) {
        return null;
      }

      const basedOnProjectIds = component.map((profile) => profile.project.id).sort();
      const matchedProjectTitles = [...component]
        .sort((left, right) => left.project.id.localeCompare(right.project.id))
        .map((profile) => profile.project.title);
      const proposedLabel = projectLabelFor(component.map((profile) => profile.project));
      const proposedSlug = slugify(proposedLabel) || `project-template-${stableHash(basedOnProjectIds.join(":"))}`;
      if (
        existingTemplates.some((template) =>
          templateSuppressesProposal(template, proposedSlug, evidence)
        )
      ) {
        return null;
      }

      const proposalKey = `${proposedSlug}:${basedOnProjectIds.join(":")}:${evidence
        .map((item) => item.taskSlug)
        .join(":")}`;
      const proposalHash = stableHash(proposalKey);
      const materialChangeHash = stableHash(
        evidence
          .map((item) => `${item.taskSlug}:${item.projectIds.join(",")}:${item.projectCount}`)
          .join("|")
      );
      const evidenceSummary = `${evidence.length} tasks repeated across ${basedOnProjectIds.length} projects`;
      return {
        id: `project-template-proposal:${proposalHash}`,
        proposalType: "new_template" as const,
        status: "draft" as const,
        proposedSlug,
        proposedLabel,
        proposedVersion: 1 as const,
        source: "ai_proposal" as const,
        basedOnProjectIds,
        matchedProjectCount: basedOnProjectIds.length,
        matchedProjectTitles,
        recurringTaskCount: evidence.length,
        taskOverlapPercent: Math.round(averagePairwiseOverlap(component) * 100),
        evidenceSummary,
        clusterId: `project-template-cluster:${stableHash(basedOnProjectIds.join(":"))}`,
        proposalFingerprint: `project-template-fingerprint:${proposalHash}`,
        materialChangeHash,
        writeBoundary: {
          saved: false,
          writesOnConfirmOnly: true,
          existingProjectsChange: false,
          providerWrites: false,
        },
        evidence,
        markdownDraft: markdownForProposal(proposedSlug, proposedLabel, evidence),
        explanation: `Detected ${evidenceSummary}.`,
      };
    })
    .filter((proposal): proposal is NewProjectTemplateProposal => proposal !== null)
    .sort((left, right) => left.proposedLabel.localeCompare(right.proposedLabel));
};

export const buildProjectTemplateRevisionProposals = ({
  projects,
  todos,
  existingTemplates,
  minSimilarProjects = DEFAULT_MIN_SIMILAR_PROJECTS,
  minRepeatedNewTasks = DEFAULT_MIN_REPEATED_NEW_TASKS,
  minTemplateOverlap = DEFAULT_MIN_TEMPLATE_OVERLAP,
}: BuildProjectTemplateRevisionProposalsInput): ProjectTemplateRevisionProposal[] => {
  const activeTemplates = existingTemplates.filter(
    (template) =>
      (!template.status || template.status === "active") &&
      template.source !== "built_in" &&
      (template.items?.length ?? 0) > 0
  );
  if (activeTemplates.length === 0) {
    return [];
  }

  const profiles = buildProfiles(projects, todos);
  const todosByProjectId = new Map<string, TodoRecord[]>();
  todos.forEach((todo) => {
    if (!todo.projectId) {
      return;
    }
    todosByProjectId.set(todo.projectId, [...(todosByProjectId.get(todo.projectId) ?? []), todo]);
  });

  return activeTemplates
    .map((template) => {
      const templateSlugs = templateTaskSlugSet(template);
      const matchingProfiles = profiles.filter((profile) =>
        profileMatchesTemplate(profile, template, todos, minTemplateOverlap)
      );
      if (matchingProfiles.length < minSimilarProjects) {
        return null;
      }

      const candidateProjectIdsByTaskSlug = new Map<string, Set<string>>();
      const candidateTitlesByTaskSlug = new Map<string, string[]>();
      matchingProfiles.forEach((profile) => {
        profile.taskSlugs.forEach((taskSlug) => {
          const canonicalSlug = canonicalProjectTemplateTaskSlug(taskSlug);
          if (!canonicalSlug || templateSlugs.has(canonicalSlug)) {
            return;
          }
          candidateProjectIdsByTaskSlug.set(
            canonicalSlug,
            candidateProjectIdsByTaskSlug.get(canonicalSlug) ?? new Set<string>()
          );
          candidateProjectIdsByTaskSlug.get(canonicalSlug)?.add(profile.project.id);
          candidateTitlesByTaskSlug.set(canonicalSlug, [
            ...(candidateTitlesByTaskSlug.get(canonicalSlug) ?? []),
            ...(profile.taskTitlesBySlug.get(taskSlug) ?? []),
          ]);
        });
      });

      const addedEvidence = [...candidateProjectIdsByTaskSlug.entries()]
        .filter(([, projectIds]) => projectIds.size >= minSimilarProjects)
        .map(([taskSlug, projectIds]) => ({
          taskSlug,
          title: mostCommonTitle(candidateTitlesByTaskSlug.get(taskSlug) ?? [taskSlug]),
          projectIds: [...projectIds].sort(),
          projectCount: projectIds.size,
          occurrenceCount: projectIds.size,
        }))
        .sort(
          (left, right) =>
            right.occurrenceCount - left.occurrenceCount ||
            left.title.localeCompare(right.title) ||
            left.taskSlug.localeCompare(right.taskSlug)
        );

      if (addedEvidence.length < minRepeatedNewTasks) {
        return null;
      }

      const basedOnProjectIds = matchingProfiles.map((profile) => profile.project.id).sort();
      const matchedProjectTitles = matchingProfiles
        .sort((left, right) => left.project.id.localeCompare(right.project.id))
        .map((profile) => profile.project.title);
      const keepChanges: ProjectTemplateRevisionChange[] = (template.items ?? []).map((item) => ({
        kind: "keep_task" as const,
        taskSlug: canonicalProjectTemplateTaskSlug(item.taskSlug ?? projectTemplateTaskSlug(item.title)),
        title: item.title,
      }));
      const addChanges: ProjectTemplateRevisionChange[] = addedEvidence.map((item) => ({
        kind: "add_task" as const,
        taskSlug: item.taskSlug,
        title: item.title,
        evidenceProjectIds: item.projectIds,
      }));
      const changes = [...keepChanges, ...addChanges];
      const materialChangeHash = stableHash(
        addedEvidence
          .map((item) => `${item.taskSlug}:${item.projectIds.join(",")}:${item.projectCount}`)
          .join("|")
      );
      const proposalHash = stableHash(
        `${template.slug}:${basedOnProjectIds.join(":")}:${materialChangeHash}`
      );
      const evidenceSummary = `${addedEvidence.length} possible template update${
        addedEvidence.length === 1 ? "" : "s"
      } repeated across ${basedOnProjectIds.length} projects`;
      const averageOverlap = averagePairwiseOverlap(matchingProfiles);
      return {
        id: `project-template-revision:${proposalHash}`,
        proposalType: "template_revision" as const,
        status: "draft" as const,
        templateSlug: template.slug,
        templatePath:
          template.path ?? projectTemplateProposalMarkdownPathForSlug(template.slug),
        currentVersion: 1 as const,
        proposedVersion: 1 as const,
        proposedSlug: template.slug,
        proposedLabel: template.label ?? template.slug,
        source: "ai_proposal" as const,
        basedOnProjectIds,
        matchedProjectCount: basedOnProjectIds.length,
        matchedProjectTitles,
        recurringTaskCount: addedEvidence.length,
        taskOverlapPercent: Math.round(averageOverlap * 100),
        evidenceSummary,
        clusterId: `project-template-revision-cluster:${template.slug}`,
        proposalFingerprint: `project-template-revision-fingerprint:${proposalHash}`,
        materialChangeHash,
        writeBoundary: {
          saved: false,
          writesOnConfirmOnly: true,
          existingProjectsChange: false,
          providerWrites: false,
        },
        evidence: addedEvidence,
        changes,
        markdownDraft: markdownForRevisionProposal(template, changes),
        explanation: `Detected ${evidenceSummary} for ${template.label ?? template.slug}.`,
      };
    })
    .filter((proposal): proposal is ProjectTemplateRevisionProposal => proposal !== null)
    .sort((left, right) => left.proposedLabel.localeCompare(right.proposedLabel));
};

export const filterEligibleProjectTemplateProposals = (
  proposals: ProjectTemplateProposal[],
  states: ProjectTemplateProposalState[],
  options: ProjectTemplateProposalFilterOptions = {}
) => {
  const now = parseTime(options.now) ?? new Date();
  const dismissedCooldownDays =
    options.dismissedCooldownDays ?? DEFAULT_DISMISSED_COOLDOWN_DAYS;
  const statesByFingerprint = new Map(states.map((state) => [state.fingerprint, state]));
  const statesByCluster = new Map<string, ProjectTemplateProposalState[]>();
  states.forEach((state) => {
    statesByCluster.set(state.clusterId, [...(statesByCluster.get(state.clusterId) ?? []), state]);
  });

  return proposals.filter((proposal) => {
    const clusterStates = statesByCluster.get(proposal.clusterId) ?? [];
    if (
      clusterStates.some(
        (state) => state.proposalType === proposal.proposalType && state.status === "never"
      )
    ) {
      return false;
    }

    if (
      clusterStates.some((state) => {
        if (state.proposalType !== proposal.proposalType) {
          return false;
        }
        if (state.status !== "snoozed") {
          return false;
        }
        const snoozeUntil = parseTime(state.snoozeUntil);
        return snoozeUntil ? snoozeUntil.getTime() > now.getTime() : false;
      })
    ) {
      return false;
    }

    const exactState = statesByFingerprint.get(proposal.proposalFingerprint);
    if (!exactState) {
      return true;
    }

    if (exactState.materialChangeHash !== proposal.materialChangeHash) {
      return true;
    }

    if (exactState.status === "accepted" || exactState.status === "rejected") {
      return false;
    }

    if (exactState.status === "dismissed") {
      const dismissedAt = parseTime(exactState.updatedAt) ?? parseTime(exactState.lastShownAt);
      if (!dismissedAt) {
        return false;
      }
      return addDays(dismissedAt, dismissedCooldownDays).getTime() <= now.getTime();
    }

    if (exactState.status === "snoozed") {
      const snoozeUntil = parseTime(exactState.snoozeUntil);
      return snoozeUntil ? snoozeUntil.getTime() <= now.getTime() : false;
    }

    return true;
  });
};

export const recordProjectTemplateProposalShownState = ({
  proposal,
  existingState = null,
  shownAt,
}: RecordProjectTemplateProposalShownStateInput): ProjectTemplateProposalState => ({
  fingerprint: proposal.proposalFingerprint,
  proposalType: proposal.proposalType,
  clusterId: proposal.clusterId,
  materialChangeHash: proposal.materialChangeHash,
  status: existingState?.status === "never" ? "never" : "draft",
  shownCount: (existingState?.shownCount ?? 0) + 1,
  lastShownAt: shownAt,
  dismissalReason: existingState?.status === "never" ? existingState.dismissalReason : null,
  snoozeUntil: null,
  templateSlug: proposal.proposalType === "template_revision" ? proposal.templateSlug : null,
  templatePath: proposal.proposalType === "template_revision" ? proposal.templatePath : null,
  acceptedTemplateSlug: null,
  acceptedTemplatePath: null,
  acceptedTemplateVersion: null,
  createdAt: existingState?.createdAt ?? shownAt,
  updatedAt: shownAt,
});

const sourceRefTaskSlug = (sourceRef: string | null) => {
  if (!sourceRef) {
    return null;
  }
  const [, , taskSlug] = sourceRef.split(":");
  return taskSlug ? canonicalProjectTemplateTaskSlug(taskSlug) : null;
};

export const buildProjectTemplateApplyPreview = ({
  template,
  projects,
  todos,
  projectIds,
}: ProjectTemplateApplyPreviewInput): ProjectTemplateApplyPreview => {
  const selectedProjectIds = new Set(projectIds.map((id) => id.trim()).filter(Boolean));
  const todosByProjectId = new Map<string, TodoRecord[]>();
  todos.forEach((todo) => {
    if (!todo.projectId) {
      return;
    }
    todosByProjectId.set(todo.projectId, [...(todosByProjectId.get(todo.projectId) ?? []), todo]);
  });

  return {
    templateSlug: template.slug,
    templateVersion: template.version,
    projectPreviews: projects
      .filter((project) => selectedProjectIds.has(project.id))
      .map((project) => {
        const projectTodos = todosByProjectId.get(project.id) ?? [];
        const existingCanonicalSlugs = new Map<string, TodoRecord>();
        projectTodos.forEach((todo) => {
          const slugFromSource = sourceRefTaskSlug(todo.sourceRef);
          const normalizedSlug = canonicalProjectTemplateTaskSlug(projectTemplateTaskSlug(todo.title));
          const canonicalSlug = slugFromSource ?? normalizedSlug;
          if (canonicalSlug && !existingCanonicalSlugs.has(canonicalSlug)) {
            existingCanonicalSlugs.set(canonicalSlug, todo);
          }
        });

        const duplicateWarnings: ProjectTemplateApplyPreview["projectPreviews"][number]["duplicateWarnings"] = [];
        const missingTasks: ProjectTemplateApplyPreview["projectPreviews"][number]["missingTasks"] = [];

        template.items.forEach((item) => {
          const canonicalSlug = canonicalProjectTemplateTaskSlug(item.taskSlug);
          const existingTodo = existingCanonicalSlugs.get(canonicalSlug);
          if (existingTodo) {
            duplicateWarnings.push({
              templateTaskSlug: item.taskSlug,
              existingTodoId: existingTodo.id,
              existingTitle: existingTodo.title,
            });
            return;
          }
          missingTasks.push({
            taskSlug: item.taskSlug,
            title: item.title,
            priority: item.priority,
            moneyRelated: item.moneyRelated,
            quickAction: item.quickAction,
            estimatedMinutes: item.estimatedMinutes,
            notes: item.notes,
            sourceRef: `${template.slug}:v${template.version}:${item.taskSlug}`,
          });
        });

        return {
          projectId: project.id,
          projectTitle: project.title,
          missingTasks,
          duplicateWarnings,
        };
      }),
    writeBoundary: {
      createsTodos: false,
      writesOnConfirmOnly: true,
      editsExistingTodos: false,
      providerWrites: false,
    },
  };
};

export const buildProjectTemplateApplyTodoCreations = (
  preview: ProjectTemplateApplyPreview,
  selectedTasks: ProjectTemplateApplyTaskSelection[]
): ProjectTemplateApplyTodoCreation[] => {
  const selectedTaskKeys = new Set(
    selectedTasks
      .map((task) => `${task.projectId.trim()}:${canonicalProjectTemplateTaskSlug(task.taskSlug)}`)
      .filter((key) => key.length > 1)
  );

  return preview.projectPreviews.flatMap((projectPreview) =>
    projectPreview.missingTasks
      .filter((task) =>
        selectedTaskKeys.has(
          `${projectPreview.projectId}:${canonicalProjectTemplateTaskSlug(task.taskSlug)}`
        )
      )
      .map((task) => ({
        projectId: projectPreview.projectId,
        taskSlug: task.taskSlug,
        title: task.title,
        priority: task.priority,
        moneyRelated: task.moneyRelated,
        quickAction: task.quickAction,
        estimatedMinutes: task.estimatedMinutes,
        notes: task.notes,
        sourceRef: task.sourceRef,
      }))
  );
};
