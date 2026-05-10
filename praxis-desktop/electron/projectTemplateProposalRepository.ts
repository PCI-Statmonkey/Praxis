import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildProjectTemplateApplyPreview,
  buildProjectTemplateProposals,
  buildProjectTemplateRevisionProposals,
  filterEligibleProjectTemplateProposals,
  projectTemplateProposalMarkdownPathForSlug,
  validateProjectTemplateProposalMarkdownDraft,
  type ExistingProjectTemplateMetadata,
  type ClearProjectTemplateProposalStateResult,
  type ProjectTemplateManagementSnapshot,
  type ProjectTemplateProposalActionResult,
  type ProjectTemplateProposalSaveResult,
  type ProjectTemplateProposalShownInput,
  type ProjectTemplateProposalShownResult,
  type ProjectTemplateProposalSnapshot,
  type ProjectTemplateApplyPreview,
} from "../shared/projectTemplateProposals";
import {
  parseProjectTaskTemplateMarkdown,
  PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT,
  PROJECT_TASK_TEMPLATES,
  type ProjectTaskTemplateDefinition,
} from "../shared/workModel";
import { refreshMemoryDocumentIndex, resolveMemoryRoot } from "./praxisDb";
import {
  acceptProjectTemplateProposal,
  deleteProjectTemplateProposalState,
  dismissProjectTemplateProposal,
  listProjectTemplateProposalStates,
  neverSuggestProjectTemplateProposal,
  recordProjectTemplateProposalShown,
  rejectProjectTemplateProposal,
  snoozeProjectTemplateProposal,
} from "./projectTemplateProposalStateRepository";
import { getWorkSnapshot, listProjectTaskTemplateManagementSummaries } from "./workRepository";

const readTextField = (input: unknown, field: string) => {
  if (!input || typeof input !== "object" || !(field in input)) {
    return "";
  }
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value.trim() : "";
};

const actionTarget = (input: unknown) => {
  const fingerprint = readTextField(input, "fingerprint");
  const proposalType = readTextField(input, "proposalType");
  const clusterId = readTextField(input, "clusterId");
  const materialChangeHash = readTextField(input, "materialChangeHash");
  if (!fingerprint || !clusterId || !materialChangeHash) {
    throw new Error("Project template proposal action requires proposal identity.");
  }

  return {
    fingerprint,
    proposalType: proposalType === "template_revision" ? "template_revision" as const : "new_template" as const,
    clusterId,
    materialChangeHash,
  };
};

const saveMarkdownField = (input: unknown) => {
  const markdown = readTextField(input, "markdown");
  if (!markdown) {
    throw new Error("Project template save requires markdown.");
  }
  return markdown;
};

const fingerprintField = (input: unknown) => {
  const fingerprint = readTextField(input, "fingerprint");
  if (!fingerprint) {
    throw new Error("Project template proposal state fingerprint is required.");
  }
  return fingerprint;
};

const toExistingTemplateMetadata = (
  template: ReturnType<typeof parseProjectTaskTemplateMarkdown>
): ExistingProjectTemplateMetadata => ({
  slug: template.slug,
  label: template.label,
  version: template.version,
  status: template.status,
  path: template.markdownPath,
  source: template.source,
  items: template.items.map((item) => ({
    title: item.title,
    taskSlug: item.taskSlug,
    priority: item.priority,
    moneyRelated: item.moneyRelated,
    quickAction: item.quickAction,
    estimatedMinutes: item.estimatedMinutes,
    notes: item.notes,
  })),
});

const listMarkdownProjectTemplateMetadata = (): ExistingProjectTemplateMetadata[] => {
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
        return toExistingTemplateMetadata(
          parseProjectTaskTemplateMarkdown(readFileSync(absolutePath, "utf8"), relativePath)
        );
      } catch {
        return null;
      }
    })
    .filter((template): template is ExistingProjectTemplateMetadata => Boolean(template));
};

const listExistingProjectTemplateMetadata = (): ExistingProjectTemplateMetadata[] => {
  const bySlug = new Map<string, ExistingProjectTemplateMetadata>();
  for (const template of PROJECT_TASK_TEMPLATES.map(toExistingTemplateMetadata)) {
    bySlug.set(template.slug, template);
  }
  for (const template of listMarkdownProjectTemplateMetadata()) {
    bySlug.set(template.slug, template);
  }
  return [...bySlug.values()];
};

const listAllProjectTaskTemplates = (): ProjectTaskTemplateDefinition[] => {
  const bySlug = new Map<string, ProjectTaskTemplateDefinition>();
  for (const template of PROJECT_TASK_TEMPLATES) {
    bySlug.set(template.slug, template);
  }
  const templateRoot = path.join(resolveMemoryRoot(), PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT);
  if (existsSync(templateRoot)) {
    for (const entry of readdirSync(templateRoot, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) {
        continue;
      }
      const relativePath = path.posix.join(PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT, entry.name);
      const absolutePath = path.join(templateRoot, entry.name);
      try {
        const template = parseProjectTaskTemplateMarkdown(readFileSync(absolutePath, "utf8"), relativePath);
        bySlug.set(template.slug, template);
      } catch {
        // Ignore malformed operator files here; management and storage checks surface them elsewhere.
      }
    }
  }
  return [...bySlug.values()];
};

const listEligibleProjectTemplateProposals = (now = new Date()) => {
  const workSnapshot = getWorkSnapshot();
  const proposals = buildProjectTemplateProposals({
    projects: workSnapshot.projects,
    todos: workSnapshot.todos,
    existingTemplates: listExistingProjectTemplateMetadata(),
  });
  const revisionProposals = buildProjectTemplateRevisionProposals({
    projects: workSnapshot.projects,
    todos: workSnapshot.todos,
    existingTemplates: listExistingProjectTemplateMetadata(),
  });
  return filterEligibleProjectTemplateProposals(
    [...proposals, ...revisionProposals],
    listProjectTemplateProposalStates(),
    { now }
  );
};

export const getProjectTemplateProposalSnapshot = (
  now = new Date()
): ProjectTemplateProposalSnapshot => {
  return {
    proposals: listEligibleProjectTemplateProposals(now),
  };
};

const currentEligibleProposal = (input: unknown, now: Date) => {
  const target = actionTarget(input);
  const matchingProposal = listEligibleProjectTemplateProposals(now).find(
    (proposal) =>
      proposal.proposalFingerprint === target.fingerprint &&
      proposal.proposalType === target.proposalType &&
      proposal.clusterId === target.clusterId &&
      proposal.materialChangeHash === target.materialChangeHash
  );
  if (!matchingProposal) {
    throw new Error("Project template proposal is no longer eligible for that action.");
  }
  return matchingProposal;
};

const ensureTemplateSlugIsNew = (slug: string) => {
  if (listExistingProjectTemplateMetadata().some((template) => template.slug === slug)) {
    throw new Error("A project template with that slug already exists.");
  }
};

const writeProjectTemplateMarkdown = (markdown: string) => {
  const validated = validateProjectTemplateProposalMarkdownDraft(markdown);
  ensureTemplateSlugIsNew(validated.slug);

  const templateRoot = path.join(resolveMemoryRoot(), PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT);
  mkdirSync(templateRoot, { recursive: true });
  const absolutePath = path.join(templateRoot, `${validated.slug}.md`);
  const expectedPath = path.join(resolveMemoryRoot(), projectTemplateProposalMarkdownPathForSlug(validated.slug));
  if (path.resolve(absolutePath) !== path.resolve(expectedPath)) {
    throw new Error("Project template path is outside the allowed template folder.");
  }

  writeFileSync(absolutePath, validated.markdown, { encoding: "utf8", flag: "wx" });
  parseProjectTaskTemplateMarkdown(readFileSync(absolutePath, "utf8"), validated.path);
  refreshMemoryDocumentIndex();
  return validated;
};

const writeProjectTemplateRevisionMarkdown = (
  markdown: string,
  proposal: ReturnType<typeof currentEligibleProposal>
) => {
  if (proposal.proposalType !== "template_revision") {
    throw new Error("Project template revision requires a revision proposal.");
  }

  const validated = validateProjectTemplateProposalMarkdownDraft(markdown);
  if (validated.slug !== proposal.templateSlug) {
    throw new Error("Project template revision slug must match the existing template.");
  }
  if (validated.path !== proposal.templatePath) {
    throw new Error("Project template revision path must match the existing template path.");
  }

  const absolutePath = path.join(resolveMemoryRoot(), validated.path);
  const templateRoot = path.join(resolveMemoryRoot(), PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT);
  const resolvedAbsolutePath = path.resolve(absolutePath);
  const resolvedTemplateRoot = path.resolve(templateRoot);
  if (!resolvedAbsolutePath.startsWith(`${resolvedTemplateRoot}${path.sep}`)) {
    throw new Error("Project template path is outside the allowed template folder.");
  }

  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, validated.markdown, { encoding: "utf8" });
  parseProjectTaskTemplateMarkdown(readFileSync(absolutePath, "utf8"), validated.path);
  refreshMemoryDocumentIndex();
  return validated;
};

const resultWithSnapshot = (
  message: string,
  now = new Date()
): ProjectTemplateProposalActionResult => ({
  ok: true,
  message,
  snapshot: getProjectTemplateProposalSnapshot(now),
});

export const getProjectTemplateManagementSnapshot = (): ProjectTemplateManagementSnapshot => ({
  templates: listProjectTaskTemplateManagementSummaries(),
  proposalStates: listProjectTemplateProposalStates().filter(
    (state) =>
      state.status === "dismissed" ||
      state.status === "rejected" ||
      state.status === "snoozed" ||
      state.status === "never"
  ),
});

export const clearProjectTemplateProposalStateForReview = (
  input: unknown
): ClearProjectTemplateProposalStateResult => {
  const fingerprint = fingerprintField(input);
  const existingState = listProjectTemplateProposalStates().find(
    (state) => state.fingerprint === fingerprint
  );
  if (existingState?.status === "accepted") {
    throw new Error("Accepted project template state cannot be cleared from this reversal path.");
  }

  const clearedState = deleteProjectTemplateProposalState(fingerprint);
  const status = clearedState?.status ?? "state";
  return {
    ok: true,
    message: clearedState
      ? `Cleared project template ${status} state.`
      : "No matching project template proposal state was found.",
    snapshot: getProjectTemplateManagementSnapshot(),
  };
};

export const dismissProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalActionResult => {
  dismissProjectTemplateProposal(
    currentEligibleProposal(input, now),
    "dismissed_from_review_inbox",
    now.toISOString()
  );
  return resultWithSnapshot("Dismissed that project template suggestion.", now);
};

export const snoozeProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalActionResult => {
  const snoozeUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  snoozeProjectTemplateProposal(
    currentEligibleProposal(input, now),
    snoozeUntil,
    now.toISOString()
  );
  return resultWithSnapshot("Snoozed that project template suggestion for 30 days.", now);
};

export const rejectProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalActionResult => {
  rejectProjectTemplateProposal(currentEligibleProposal(input, now), now.toISOString());
  return resultWithSnapshot(
    "Marked that project template draft as not this template.",
    now
  );
};

export const neverSuggestProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalActionResult => {
  neverSuggestProjectTemplateProposal(
    currentEligibleProposal(input, now),
    "never_from_review_inbox",
    now.toISOString()
  );
  return resultWithSnapshot("PRAXIS will not suggest that project template pattern again.", now);
};

export const saveProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalSaveResult => {
  const proposal = currentEligibleProposal(input, now);
  const savedTemplate =
    proposal.proposalType === "template_revision"
      ? writeProjectTemplateRevisionMarkdown(saveMarkdownField(input), proposal)
      : writeProjectTemplateMarkdown(saveMarkdownField(input));
  acceptProjectTemplateProposal(
    proposal,
    {
      slug: savedTemplate.slug,
      path: savedTemplate.path,
      version: 1,
    },
    now.toISOString()
  );
  return {
    ok: true,
    message:
      proposal.proposalType === "template_revision"
        ? `Updated project template "${savedTemplate.label}".`
        : `Saved project template "${savedTemplate.label}".`,
    snapshot: getProjectTemplateProposalSnapshot(now),
    template: {
      slug: savedTemplate.slug,
      label: savedTemplate.label,
      path: savedTemplate.path,
    },
  };
};

export const previewApplyProjectTemplateForReview = (input: unknown): ProjectTemplateApplyPreview => {
  const templateSlug = readTextField(input, "templateSlug");
  const projectIds =
    input && typeof input === "object" && Array.isArray((input as { projectIds?: unknown }).projectIds)
      ? ((input as { projectIds: unknown[] }).projectIds.filter(
          (projectId): projectId is string => typeof projectId === "string"
        ))
      : [];
  if (!templateSlug) {
    throw new Error("Project template apply preview requires a template slug.");
  }
  if (projectIds.length === 0) {
    throw new Error("Project template apply preview requires selected projects.");
  }

  const template = listAllProjectTaskTemplates().find((candidate) => candidate.slug === templateSlug);
  if (!template || template.status !== "active") {
    throw new Error("Project template apply preview requires an active template.");
  }

  const snapshot = getWorkSnapshot();
  return buildProjectTemplateApplyPreview({
    template,
    projects: snapshot.projects,
    todos: snapshot.todos,
    projectIds,
  });
};

export const recordProjectTemplateProposalsShownForReview = (
  input: ProjectTemplateProposalShownInput,
  now = new Date()
): ProjectTemplateProposalShownResult => {
  const proposalInputs =
    input && typeof input === "object" && Array.isArray(input.proposals) ? input.proposals : [];
  const eligibleByFingerprint = new Map(
    listEligibleProjectTemplateProposals(now).map((proposal) => [proposal.proposalFingerprint, proposal])
  );
  let shownCount = 0;
  for (const proposalIdentity of proposalInputs) {
    const target = actionTarget(proposalIdentity);
    const proposal = eligibleByFingerprint.get(target.fingerprint);
    if (
      !proposal ||
      proposal.clusterId !== target.clusterId ||
      proposal.materialChangeHash !== target.materialChangeHash
    ) {
      continue;
    }
    recordProjectTemplateProposalShown(proposal, now.toISOString());
    shownCount += 1;
  }
  return { ok: true, shownCount };
};
