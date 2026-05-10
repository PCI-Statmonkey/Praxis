import type {
  ProjectTemplateProposal,
  ProjectTemplateProposalType,
  ProjectTemplateProposalState,
  ProjectTemplateProposalStateStatus,
} from "../shared/projectTemplateProposals";
import { isProjectTemplateProposalStateStatus } from "../shared/projectTemplateProposals";
import { getPraxisDatabase } from "./praxisDb";

type DbProjectTemplateProposalState = {
  fingerprint: string;
  proposal_type: string;
  cluster_id: string;
  material_change_hash: string;
  status: string;
  shown_count: number;
  last_shown_at: string | null;
  dismissal_reason: string | null;
  snooze_until: string | null;
  template_slug: string | null;
  template_path: string | null;
  accepted_template_slug: string | null;
  accepted_template_path: string | null;
  accepted_template_version: number | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTemplateProposalStateTarget =
  | ProjectTemplateProposal
  | {
      fingerprint: string;
      proposalType?: ProjectTemplateProposalType;
      clusterId: string;
      materialChangeHash: string;
      templateSlug?: string | null;
      templatePath?: string | null;
    };

const terminalStatuses = new Set<ProjectTemplateProposalStateStatus>([
  "dismissed",
  "rejected",
  "snoozed",
  "accepted",
  "never",
]);

const nowIso = () => new Date().toISOString();

const normalizeTarget = (target: ProjectTemplateProposalStateTarget) => ({
  fingerprint: "fingerprint" in target ? target.fingerprint : target.proposalFingerprint,
  proposalType: "fingerprint" in target ? target.proposalType ?? "new_template" : target.proposalType,
  clusterId: target.clusterId,
  materialChangeHash: target.materialChangeHash,
  templateSlug:
    "fingerprint" in target
      ? target.templateSlug ?? null
      : target.proposalType === "template_revision"
        ? target.templateSlug
        : null,
  templatePath:
    "fingerprint" in target
      ? target.templatePath ?? null
      : target.proposalType === "template_revision"
        ? target.templatePath
        : null,
});

const toProposalState = (row: DbProjectTemplateProposalState): ProjectTemplateProposalState => {
  if (!isProjectTemplateProposalStateStatus(row.status)) {
    throw new Error(`Unknown project template proposal state status: ${row.status}`);
  }

  return {
    fingerprint: row.fingerprint,
    proposalType: row.proposal_type === "template_revision" ? "template_revision" : "new_template",
    clusterId: row.cluster_id,
    materialChangeHash: row.material_change_hash,
    status: row.status,
    shownCount: row.shown_count,
    lastShownAt: row.last_shown_at,
    dismissalReason: row.dismissal_reason,
    snoozeUntil: row.snooze_until,
    templateSlug: row.template_slug,
    templatePath: row.template_path,
    acceptedTemplateSlug: row.accepted_template_slug,
    acceptedTemplatePath: row.accepted_template_path,
    acceptedTemplateVersion: row.accepted_template_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const getProposalState = (fingerprint: string) => {
  const row = getPraxisDatabase()
    .prepare("SELECT * FROM project_template_proposal_states WHERE fingerprint = ?")
    .get(fingerprint) as DbProjectTemplateProposalState | undefined;
  return row ? toProposalState(row) : null;
};

export const listProjectTemplateProposalStates = (): ProjectTemplateProposalState[] =>
  (
    getPraxisDatabase()
      .prepare(
        `SELECT * FROM project_template_proposal_states
         ORDER BY updated_at DESC, created_at DESC`
      )
      .all() as DbProjectTemplateProposalState[]
  ).map(toProposalState);

export const deleteProjectTemplateProposalState = (fingerprint: string) => {
  const normalizedFingerprint = fingerprint.trim();
  if (!normalizedFingerprint) {
    throw new Error("Proposal state fingerprint is required.");
  }

  const existingState = getProposalState(normalizedFingerprint);
  getPraxisDatabase()
    .prepare("DELETE FROM project_template_proposal_states WHERE fingerprint = ?")
    .run(normalizedFingerprint);
  return existingState;
};

export const recordProjectTemplateProposalShown = (
  proposal: ProjectTemplateProposal,
  shownAt = nowIso()
) => {
  getPraxisDatabase()
    .prepare(
      `INSERT INTO project_template_proposal_states (
        fingerprint,
        proposal_type,
        cluster_id,
        material_change_hash,
        status,
        shown_count,
        last_shown_at,
        dismissal_reason,
        snooze_until,
        template_slug,
        template_path,
        accepted_template_slug,
        accepted_template_path,
        accepted_template_version,
        created_at,
        updated_at
      ) VALUES (
        @fingerprint,
        @proposalType,
        @clusterId,
        @materialChangeHash,
        'draft',
        1,
        @shownAt,
        NULL,
        NULL,
        @templateSlug,
        @templatePath,
        NULL,
        NULL,
        NULL,
        @shownAt,
        @shownAt
      )
      ON CONFLICT(fingerprint) DO UPDATE SET
        proposal_type = excluded.proposal_type,
        cluster_id = excluded.cluster_id,
        material_change_hash = excluded.material_change_hash,
        status = CASE
          WHEN status = 'never' THEN status
          ELSE 'draft'
        END,
        shown_count = shown_count + 1,
        last_shown_at = excluded.last_shown_at,
        dismissal_reason = CASE
          WHEN status = 'never' THEN dismissal_reason
          ELSE NULL
        END,
        snooze_until = NULL,
        template_slug = excluded.template_slug,
        template_path = excluded.template_path,
        accepted_template_slug = NULL,
        accepted_template_path = NULL,
        accepted_template_version = NULL,
        updated_at = excluded.updated_at`
    )
    .run({
      fingerprint: proposal.proposalFingerprint,
      proposalType: proposal.proposalType,
      clusterId: proposal.clusterId,
      materialChangeHash: proposal.materialChangeHash,
      templateSlug: proposal.proposalType === "template_revision" ? proposal.templateSlug : null,
      templatePath: proposal.proposalType === "template_revision" ? proposal.templatePath : null,
      shownAt,
    });

  return getProposalState(proposal.proposalFingerprint);
};

const markProposalState = (
  target: ProjectTemplateProposalStateTarget,
  status: ProjectTemplateProposalStateStatus,
  values: {
    dismissalReason?: string | null;
    snoozeUntil?: string | null;
    acceptedTemplateSlug?: string | null;
    acceptedTemplatePath?: string | null;
    acceptedTemplateVersion?: number | null;
  } = {},
  updatedAt = nowIso()
) => {
  if (!isProjectTemplateProposalStateStatus(status)) {
    throw new Error(`Unknown project template proposal state status: ${status}`);
  }

  const normalizedTarget = normalizeTarget(target);
  getPraxisDatabase()
    .prepare(
      `INSERT INTO project_template_proposal_states (
        fingerprint,
        proposal_type,
        cluster_id,
        material_change_hash,
        status,
        shown_count,
        last_shown_at,
        dismissal_reason,
        snooze_until,
        template_slug,
        template_path,
        accepted_template_slug,
        accepted_template_path,
        accepted_template_version,
        created_at,
        updated_at
      ) VALUES (
        @fingerprint,
        @proposalType,
        @clusterId,
        @materialChangeHash,
        @status,
        0,
        NULL,
        @dismissalReason,
        @snoozeUntil,
        @templateSlug,
        @templatePath,
        @acceptedTemplateSlug,
        @acceptedTemplatePath,
        @acceptedTemplateVersion,
        @updatedAt,
        @updatedAt
      )
      ON CONFLICT(fingerprint) DO UPDATE SET
        proposal_type = excluded.proposal_type,
        cluster_id = excluded.cluster_id,
        material_change_hash = excluded.material_change_hash,
        status = excluded.status,
        dismissal_reason = excluded.dismissal_reason,
        snooze_until = excluded.snooze_until,
        template_slug = excluded.template_slug,
        template_path = excluded.template_path,
        accepted_template_slug = excluded.accepted_template_slug,
        accepted_template_path = excluded.accepted_template_path,
        accepted_template_version = excluded.accepted_template_version,
        updated_at = excluded.updated_at`
    )
    .run({
      ...normalizedTarget,
      status,
      dismissalReason: values.dismissalReason ?? null,
      snoozeUntil: values.snoozeUntil ?? null,
      templateSlug: normalizedTarget.templateSlug,
      templatePath: normalizedTarget.templatePath,
      acceptedTemplateSlug: values.acceptedTemplateSlug ?? null,
      acceptedTemplatePath: values.acceptedTemplatePath ?? null,
      acceptedTemplateVersion: values.acceptedTemplateVersion ?? null,
      updatedAt,
    });

  return getProposalState(normalizedTarget.fingerprint);
};

export const dismissProjectTemplateProposal = (
  target: ProjectTemplateProposalStateTarget,
  dismissalReason: string | null = null,
  dismissedAt = nowIso()
) =>
  markProposalState(
    target,
    "dismissed",
    {
      dismissalReason,
    },
    dismissedAt
  );

export const rejectProjectTemplateProposal = (
  target: ProjectTemplateProposalStateTarget,
  rejectedAt = nowIso()
) => markProposalState(target, "rejected", {}, rejectedAt);

export const snoozeProjectTemplateProposal = (
  target: ProjectTemplateProposalStateTarget,
  snoozeUntil: string,
  snoozedAt = nowIso()
) =>
  markProposalState(
    target,
    "snoozed",
    {
      snoozeUntil,
    },
    snoozedAt
  );

export const neverSuggestProjectTemplateProposal = (
  target: ProjectTemplateProposalStateTarget,
  dismissalReason: string | null = null,
  updatedAt = nowIso()
) =>
  markProposalState(
    target,
    "never",
    {
      dismissalReason,
    },
    updatedAt
  );

export const acceptProjectTemplateProposal = (
  target: ProjectTemplateProposalStateTarget,
  acceptedTemplate: {
    slug?: string | null;
    path?: string | null;
    version?: number | null;
  } = {},
  acceptedAt = nowIso()
) =>
  markProposalState(
    target,
    "accepted",
    {
      acceptedTemplateSlug: acceptedTemplate.slug ?? null,
      acceptedTemplatePath: acceptedTemplate.path ?? null,
      acceptedTemplateVersion: acceptedTemplate.version ?? null,
    },
    acceptedAt
  );

export const isTerminalProjectTemplateProposalState = (
  status: ProjectTemplateProposalStateStatus
) => terminalStatuses.has(status);
