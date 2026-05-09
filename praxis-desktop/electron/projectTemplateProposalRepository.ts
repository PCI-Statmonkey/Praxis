import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  buildProjectTemplateProposals,
  filterEligibleProjectTemplateProposals,
  type ExistingProjectTemplateMetadata,
  type ProjectTemplateProposalActionInput,
  type ProjectTemplateProposalActionResult,
  type ProjectTemplateProposalShownInput,
  type ProjectTemplateProposalShownResult,
  type ProjectTemplateProposalSnapshot,
} from "../shared/projectTemplateProposals";
import {
  parseProjectTaskTemplateMarkdown,
  PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT,
  PROJECT_TASK_TEMPLATES,
} from "../shared/workModel";
import { resolveMemoryRoot } from "./praxisDb";
import {
  dismissProjectTemplateProposal,
  listProjectTemplateProposalStates,
  neverSuggestProjectTemplateProposal,
  recordProjectTemplateProposalShown,
  snoozeProjectTemplateProposal,
} from "./projectTemplateProposalStateRepository";
import { getWorkSnapshot } from "./workRepository";

const readTextField = (input: unknown, field: keyof ProjectTemplateProposalActionInput) => {
  if (!input || typeof input !== "object" || !(field in input)) {
    return "";
  }
  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value.trim() : "";
};

const actionTarget = (input: unknown) => {
  const fingerprint = readTextField(input, "fingerprint");
  const clusterId = readTextField(input, "clusterId");
  const materialChangeHash = readTextField(input, "materialChangeHash");
  if (!fingerprint || !clusterId || !materialChangeHash) {
    throw new Error("Project template proposal action requires proposal identity.");
  }

  return {
    fingerprint,
    clusterId,
    materialChangeHash,
  };
};

const toExistingTemplateMetadata = (
  template: ReturnType<typeof parseProjectTaskTemplateMarkdown>
): ExistingProjectTemplateMetadata => ({
  slug: template.slug,
  label: template.label,
  status: template.status,
  items: template.items.map((item) => ({
    title: item.title,
    taskSlug: item.taskSlug,
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

const listEligibleProjectTemplateProposals = (now = new Date()) => {
  const workSnapshot = getWorkSnapshot();
  const proposals = buildProjectTemplateProposals({
    projects: workSnapshot.projects,
    todos: workSnapshot.todos,
    existingTemplates: listExistingProjectTemplateMetadata(),
  });
  return filterEligibleProjectTemplateProposals(
    proposals,
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

const currentEligibleActionTarget = (input: unknown, now: Date) => {
  const target = actionTarget(input);
  const matchingProposal = listEligibleProjectTemplateProposals(now).find(
    (proposal) =>
      proposal.proposalFingerprint === target.fingerprint &&
      proposal.clusterId === target.clusterId &&
      proposal.materialChangeHash === target.materialChangeHash
  );
  if (!matchingProposal) {
    throw new Error("Project template proposal is no longer eligible for that action.");
  }
  return target;
};

const resultWithSnapshot = (
  message: string,
  now = new Date()
): ProjectTemplateProposalActionResult => ({
  ok: true,
  message,
  snapshot: getProjectTemplateProposalSnapshot(now),
});

export const dismissProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalActionResult => {
  dismissProjectTemplateProposal(
    currentEligibleActionTarget(input, now),
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
    currentEligibleActionTarget(input, now),
    snoozeUntil,
    now.toISOString()
  );
  return resultWithSnapshot("Snoozed that project template suggestion for 30 days.", now);
};

export const neverSuggestProjectTemplateProposalForReview = (
  input: unknown,
  now = new Date()
): ProjectTemplateProposalActionResult => {
  neverSuggestProjectTemplateProposal(
    currentEligibleActionTarget(input, now),
    "never_from_review_inbox",
    now.toISOString()
  );
  return resultWithSnapshot("PRAXIS will not suggest that project template pattern again.", now);
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
