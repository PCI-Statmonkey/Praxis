import type { ProjectRecord, TodoRecord } from "./workModel";

export type ExistingProjectTemplateMetadata = {
  slug: string;
  label?: string | null;
  status?: "active" | "draft" | "archived" | string | null;
  items?: Array<{
    title: string;
    taskSlug?: string | null;
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

export type ProjectTemplateProposal = {
  id: string;
  status: "draft";
  proposedSlug: string;
  proposedLabel: string;
  proposedVersion: 1;
  source: "ai_proposal";
  basedOnProjectIds: string[];
  matchedProjectCount: number;
  matchedProjectTitles: string[];
  recurringTaskCount: number;
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

export type BuildProjectTemplateProposalsInput = {
  projects: ProjectRecord[];
  todos: TodoRecord[];
  existingTemplates?: ExistingProjectTemplateMetadata[];
  minSimilarProjects?: number;
  minRecurringTasks?: number;
  minProjectOverlap?: number;
};

type ProjectTaskProfile = {
  project: ProjectRecord;
  taskSlugs: Set<string>;
  taskTitlesBySlug: Map<string, string[]>;
};

const DEFAULT_MIN_SIMILAR_PROJECTS = 3;
const DEFAULT_MIN_RECURRING_TASKS = 5;
const DEFAULT_MIN_PROJECT_OVERLAP = 0.6;

const titleStopWords = new Set(["a", "an", "the"]);

const projectTitleStopWords = new Set(["a", "an", "the", "for", "at", "of"]);

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

export const buildProjectTemplateProposals = ({
  projects,
  todos,
  existingTemplates = [],
  minSimilarProjects = DEFAULT_MIN_SIMILAR_PROJECTS,
  minRecurringTasks = DEFAULT_MIN_RECURRING_TASKS,
  minProjectOverlap = DEFAULT_MIN_PROJECT_OVERLAP,
}: BuildProjectTemplateProposalsInput): ProjectTemplateProposal[] => {
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
    .filter((proposal): proposal is ProjectTemplateProposal => proposal !== null)
    .sort((left, right) => left.proposedLabel.localeCompare(right.proposedLabel));
};
