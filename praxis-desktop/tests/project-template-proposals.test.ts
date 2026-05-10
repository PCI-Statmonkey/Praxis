import { strict as assert } from "node:assert";
import {
  buildProjectTemplateApplyPreview,
  buildProjectTemplateApplyTodoCreations,
  buildProjectTemplateProposals,
  buildProjectTemplateRevisionProposals,
  canonicalProjectTemplateTaskSlug,
  filterEligibleProjectTemplateProposals,
  normalizeProjectTemplateTaskTitle,
  projectTemplateProposalMarkdownPathForSlug,
  projectTemplateTaskSlug,
  recordProjectTemplateProposalShownState,
  validateProjectTemplateProposalMarkdownDraft,
  type ProjectTemplateProposalState,
} from "../shared/projectTemplateProposals";
import {
  parseProjectTaskTemplateMarkdown,
  PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT,
  PROJECT_TASK_TEMPLATE_SOURCE_KIND,
  type ProjectRecord,
  type ProjectTaskTemplateDefinition,
  type TodoRecord,
  type WorkPriority,
  type WorkStatus,
} from "../shared/workModel";

const timestamp = "2026-05-09T12:00:00.000Z";

const project = (id: string, title: string): ProjectRecord => ({
  id,
  missionId: null,
  slug: id,
  title,
  summary: null,
  status: "active",
  dueAt: null,
  markdownPath: null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const todo = (
  projectId: string,
  title: string,
  overrides: Partial<{
    id: string;
    priority: WorkPriority;
    status: WorkStatus;
    sourceKind: string | null;
    sourceRef: string | null;
  }> = {}
): TodoRecord => ({
  id: overrides.id ?? `${projectId}-${projectTemplateTaskSlug(title)}`,
  projectId,
  title,
  status: overrides.status ?? "active",
  priority: overrides.priority ?? "normal",
  dueAt: null,
  moneyRelated: false,
  quickAction: false,
  estimatedMinutes: null,
  waitingOnPersonId: null,
  sourceKind: overrides.sourceKind ?? null,
  sourceRef: overrides.sourceRef ?? null,
  notes: null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const engineeringTasks = [
  "Contract",
  "Billing initial payment",
  "Electrical",
  "Mechanical",
  "Plumbing",
  "Grease separator",
  "Sign and seal",
  "Sent to client",
  "Billing final payment",
  "Under building department review",
];

const marketingTasks = [
  "Discovery call",
  "Audience notes",
  "Creative brief",
  "Landing page copy",
  "Campaign launch",
];

const todosFor = (projectId: string, taskTitles: string[]) =>
  taskTitles.map((title) => todo(projectId, title));

assert.equal(normalizeProjectTemplateTaskTitle("The Sign & Seal"), "sign and seal");
assert.equal(projectTemplateTaskSlug("Grease separator"), "grease-separator");
assert.equal(canonicalProjectTemplateTaskSlug("01-Grease separator"), "grease-separator");
assert.equal(
  projectTemplateTaskSlug("Under building department review"),
  "under-building-department-review"
);

const belowThresholdProjects = [
  project("engineering-a", "Engineering project A"),
  project("engineering-b", "Engineering project B"),
];
assert.deepEqual(
  buildProjectTemplateProposals({
    projects: belowThresholdProjects,
    todos: belowThresholdProjects.flatMap((candidate) => todosFor(candidate.id, engineeringTasks)),
  }),
  []
);

const engineeringProjects = [
  project("engineering-a", "Engineering project A"),
  project("engineering-b", "Engineering project B"),
  project("engineering-c", "Engineering project C"),
];
const [engineeringProposal] = buildProjectTemplateProposals({
  projects: engineeringProjects,
  todos: engineeringProjects.flatMap((candidate, index) =>
    todosFor(candidate.id, [
      ...engineeringTasks.slice(0, 6),
      index === 0 ? "Sign & Seal" : "Sign and seal",
      ...engineeringTasks.slice(7),
    ])
  ),
});

assert.equal(engineeringProposal.proposalType, "new_template");
assert.equal(engineeringProposal.proposedSlug, "engineering-project");
assert.equal(engineeringProposal.proposedLabel, "Engineering Project");
assert.deepEqual(engineeringProposal.basedOnProjectIds, [
  "engineering-a",
  "engineering-b",
  "engineering-c",
]);
assert.equal(engineeringProposal.matchedProjectCount, 3);
assert.deepEqual(engineeringProposal.matchedProjectTitles, [
  "Engineering project A",
  "Engineering project B",
  "Engineering project C",
]);
assert.equal(engineeringProposal.recurringTaskCount, 10);
assert.equal(engineeringProposal.taskOverlapPercent, 100);
assert.equal(engineeringProposal.evidenceSummary, "10 tasks repeated across 3 projects");
assert.match(engineeringProposal.clusterId, /^project-template-cluster:/);
assert.match(engineeringProposal.proposalFingerprint, /^project-template-fingerprint:/);
assert.match(engineeringProposal.materialChangeHash, /^[a-z0-9]+$/);
assert.deepEqual(engineeringProposal.writeBoundary, {
  saved: false,
  writesOnConfirmOnly: true,
  existingProjectsChange: false,
  providerWrites: false,
});
assert.equal(engineeringProposal.evidence.length, 10);
assert.equal(
  engineeringProposal.evidence.every((item) => item.projectCount === 3),
  true
);
assert.equal(
  engineeringProposal.evidence.some((item) => item.taskSlug === "sign-and-seal"),
  true
);
assert.equal(
  engineeringProposal.evidence.some((item) => item.taskSlug === "grease-separator"),
  true
);
assert.match(engineeringProposal.explanation, /10 tasks repeated across 3 projects/);
assert.equal(
  engineeringProposal.markdownDraft,
  `---\nkind: project_task_template\nslug: engineering-project\nlabel: Engineering Project\nversion: 1\nstatus: active\nsource: ai_proposal\n---\n\n# Engineering Project\n\n## Tasks\n\n- [ ] Billing final payment\n- [ ] Billing initial payment\n- [ ] Contract\n- [ ] Electrical\n- [ ] Grease separator\n- [ ] Mechanical\n- [ ] Plumbing\n- [ ] Sent to client\n- [ ] Sign and seal\n- [ ] Under building department review\n`
);

const repeatedEngineeringProposal = buildProjectTemplateProposals({
  projects: engineeringProjects,
  todos: engineeringProjects.flatMap((candidate, index) =>
    todosFor(candidate.id, [
      ...engineeringTasks.slice(0, 6),
      index === 0 ? "Sign & Seal" : "Sign and seal",
      ...engineeringTasks.slice(7),
    ])
  ),
})[0];

assert.equal(repeatedEngineeringProposal.proposalFingerprint, engineeringProposal.proposalFingerprint);
assert.equal(repeatedEngineeringProposal.materialChangeHash, engineeringProposal.materialChangeHash);

const firstShownState = recordProjectTemplateProposalShownState({
  proposal: engineeringProposal,
  shownAt: "2026-05-09T13:00:00.000Z",
});
assert.equal(firstShownState.status, "draft");
assert.equal(firstShownState.proposalType, "new_template");
assert.equal(firstShownState.templateSlug, null);
assert.equal(firstShownState.shownCount, 1);
assert.equal(firstShownState.lastShownAt, "2026-05-09T13:00:00.000Z");

const secondShownState = recordProjectTemplateProposalShownState({
  proposal: engineeringProposal,
  existingState: firstShownState,
  shownAt: "2026-05-09T14:00:00.000Z",
});
assert.equal(secondShownState.shownCount, 2);
assert.equal(secondShownState.status, "draft");

const stateFor = (
  overrides: Partial<ProjectTemplateProposalState> = {}
): ProjectTemplateProposalState => ({
  ...firstShownState,
  ...overrides,
});

const dismissedState = stateFor({
  status: "dismissed",
  dismissalReason: "later",
  updatedAt: "2026-05-09T15:00:00.000Z",
});
assert.deepEqual(
  filterEligibleProjectTemplateProposals([engineeringProposal], [dismissedState], {
    now: "2026-05-10T15:00:00.000Z",
  }),
  []
);

const resurfacedShownState = recordProjectTemplateProposalShownState({
  proposal: engineeringProposal,
  existingState: dismissedState,
  shownAt: "2026-06-10T15:00:00.000Z",
});
assert.equal(resurfacedShownState.status, "draft");
assert.equal(resurfacedShownState.dismissalReason, null);
assert.equal(resurfacedShownState.shownCount, dismissedState.shownCount + 1);

const neverShownState = recordProjectTemplateProposalShownState({
  proposal: engineeringProposal,
  existingState: stateFor({
    status: "never",
    dismissalReason: "never_from_review_inbox",
  }),
  shownAt: "2026-06-10T15:00:00.000Z",
});
assert.equal(neverShownState.status, "never");
assert.equal(neverShownState.dismissalReason, "never_from_review_inbox");

const materiallyChangedProposal = {
  ...engineeringProposal,
  proposalFingerprint: `${engineeringProposal.proposalFingerprint}:changed`,
  materialChangeHash: `${engineeringProposal.materialChangeHash}:changed`,
};
assert.deepEqual(
  filterEligibleProjectTemplateProposals([materiallyChangedProposal], [dismissedState], {
    now: "2026-05-10T15:00:00.000Z",
  }).map((proposal) => proposal.proposalFingerprint),
  [materiallyChangedProposal.proposalFingerprint]
);

assert.deepEqual(
  filterEligibleProjectTemplateProposals(
    [engineeringProposal],
    [
      stateFor({
        fingerprint: "snoozed-other-fingerprint",
        status: "snoozed",
        snoozeUntil: "2026-06-01T00:00:00.000Z",
      }),
    ],
    {
      now: "2026-05-10T15:00:00.000Z",
    }
  ),
  []
);

assert.deepEqual(
  filterEligibleProjectTemplateProposals([engineeringProposal], [
    stateFor({
      status: "rejected",
    }),
  ]),
  []
);

assert.deepEqual(
  filterEligibleProjectTemplateProposals([materiallyChangedProposal], [
    stateFor({
      status: "rejected",
    }),
  ]).map((proposal) => proposal.proposalFingerprint),
  [materiallyChangedProposal.proposalFingerprint]
);

assert.deepEqual(
  filterEligibleProjectTemplateProposals([materiallyChangedProposal], [
    stateFor({
      fingerprint: "never-other-fingerprint",
      status: "never",
    }),
  ]),
  []
);

assert.deepEqual(
  filterEligibleProjectTemplateProposals([materiallyChangedProposal], [
    stateFor({
      fingerprint: "never-other-type-fingerprint",
      proposalType: "template_revision",
      status: "never",
    }),
  ]).map((proposal) => proposal.proposalFingerprint),
  [materiallyChangedProposal.proposalFingerprint]
);

const acceptedState = stateFor({
  status: "accepted",
  acceptedTemplateSlug: "engineering-project",
  acceptedTemplatePath: "templates/project-task-templates/engineering-project.md",
});
assert.deepEqual(filterEligibleProjectTemplateProposals([engineeringProposal], [acceptedState]), []);
assert.equal(acceptedState.acceptedTemplateSlug, "engineering-project");
assert.equal(
  acceptedState.acceptedTemplatePath,
  "templates/project-task-templates/engineering-project.md"
);
assert.equal(engineeringProposal.markdownDraft.includes("source: ai_proposal"), true);

const validatedProposalMarkdown = validateProjectTemplateProposalMarkdownDraft(
  engineeringProposal.markdownDraft
);
assert.equal(validatedProposalMarkdown.slug, "engineering-project");
assert.equal(validatedProposalMarkdown.label, "Engineering Project");
assert.equal(
  validatedProposalMarkdown.path,
  projectTemplateProposalMarkdownPathForSlug("engineering-project")
);
assert.equal(validatedProposalMarkdown.taskCount, 10);
assert.equal(validatedProposalMarkdown.markdown.endsWith("\n"), true);

assert.throws(
  () => validateProjectTemplateProposalMarkdownDraft(""),
  /cannot be blank/
);
assert.throws(
  () =>
    validateProjectTemplateProposalMarkdownDraft(
      engineeringProposal.markdownDraft.replace("slug: engineering-project", "slug: ../escape")
    ),
  /lowercase letters/
);

assert.deepEqual(
  buildProjectTemplateProposals({
    projects: engineeringProjects,
    todos: engineeringProjects.flatMap((candidate) => todosFor(candidate.id, engineeringTasks)),
    existingTemplates: [
      {
        slug: "engineering-project",
        status: "active",
        items: engineeringTasks.map((title) => ({ title })),
      },
    ],
  }),
  []
);

assert.deepEqual(
  buildProjectTemplateProposals({
    projects: engineeringProjects,
    todos: engineeringProjects.flatMap((candidate) => todosFor(candidate.id, engineeringTasks)),
    existingTemplates: [
      {
        slug: "permitting-project",
        status: "active",
        items: engineeringTasks.slice(0, 8).map((title) => ({ title })),
      },
    ],
  }),
  []
);

const mixedProjects = [
  ...engineeringProjects,
  project("marketing-a", "Marketing campaign A"),
  project("marketing-b", "Marketing campaign B"),
  project("marketing-c", "Marketing campaign C"),
];
const mixedProposals = buildProjectTemplateProposals({
  projects: mixedProjects,
  todos: [
    ...engineeringProjects.flatMap((candidate) => todosFor(candidate.id, engineeringTasks)),
    ...mixedProjects
      .filter((candidate) => candidate.id.startsWith("marketing-"))
      .flatMap((candidate) => todosFor(candidate.id, marketingTasks)),
  ],
});

assert.deepEqual(
  mixedProposals.map((proposal) => proposal.proposedSlug).sort(),
  ["engineering-project", "marketing-campaign"]
);
assert.equal(
  mixedProposals.every((proposal) =>
    proposal.basedOnProjectIds.every((projectId) =>
      projectId.startsWith(proposal.proposedSlug === "engineering-project" ? "engineering-" : "marketing-")
    )
  ),
  true
);

const revisionTemplateMarkdown = `---
kind: project_task_template
slug: engineering-project
label: Engineering Project
version: 1
status: active
source: markdown
---

# Engineering Project

## Tasks

- [ ] Contract
- [ ] Billing initial payment
- [ ] Electrical
- [ ] Mechanical
`;

const revisionTemplate = parseProjectTaskTemplateMarkdown(
  revisionTemplateMarkdown,
  `${PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT}/engineering-project.md`
);

const templateMetadata = (template: ProjectTaskTemplateDefinition) => ({
  slug: template.slug,
  label: template.label,
  version: template.version,
  status: template.status,
  path: template.markdownPath,
  source: template.source,
  items: template.items,
});

const templateTodosFor = (projectId: string, template: ProjectTaskTemplateDefinition) =>
  template.items.map((item) =>
    todo(projectId, item.title, {
      id: `${projectId}-${item.taskSlug}`,
      sourceKind: PROJECT_TASK_TEMPLATE_SOURCE_KIND,
      sourceRef: `${template.slug}:v${template.version}:${item.taskSlug}`,
    })
  );

const revisionProjects = [
  project("revision-a", "Engineering revision A"),
  project("revision-b", "Engineering revision B"),
  project("revision-c", "Engineering revision C"),
];
const revisionTodos = revisionProjects.flatMap((candidate) => [
  ...templateTodosFor(candidate.id, revisionTemplate),
  todo(candidate.id, "Permit closeout"),
]);
const [revisionProposal] = buildProjectTemplateRevisionProposals({
  projects: revisionProjects,
  todos: revisionTodos,
  existingTemplates: [templateMetadata(revisionTemplate)],
});

assert.equal(revisionProposal.proposalType, "template_revision");
assert.equal(revisionProposal.templateSlug, "engineering-project");
assert.equal(revisionProposal.templatePath, `${PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT}/engineering-project.md`);
assert.equal(revisionProposal.currentVersion, 1);
assert.equal(revisionProposal.proposedVersion, 1);
assert.equal(revisionProposal.recurringTaskCount, 1);
assert.equal(revisionProposal.evidenceSummary, "1 possible template update repeated across 3 projects");
assert.equal(
  revisionProposal.changes.some(
    (change) => change.kind === "add_task" && change.taskSlug === "permit-closeout"
  ),
  true
);
assert.equal(
  revisionProposal.changes.some(
    (change) => change.kind === "keep_task" && change.taskSlug === "contract"
  ),
  true
);
assert.deepEqual(revisionProposal.writeBoundary, {
  saved: false,
  writesOnConfirmOnly: true,
  existingProjectsChange: false,
  providerWrites: false,
});
assert.match(revisionProposal.proposalFingerprint, /^project-template-revision-fingerprint:/);
assert.match(revisionProposal.markdownDraft, /version: 1/);
assert.match(revisionProposal.markdownDraft, /- \[ \] Permit closeout/);

const repeatedRevisionProposal = buildProjectTemplateRevisionProposals({
  projects: revisionProjects,
  todos: revisionTodos,
  existingTemplates: [templateMetadata(revisionTemplate)],
})[0];
assert.equal(repeatedRevisionProposal.proposalFingerprint, revisionProposal.proposalFingerprint);
assert.equal(repeatedRevisionProposal.materialChangeHash, revisionProposal.materialChangeHash);

const revisionShownState = recordProjectTemplateProposalShownState({
  proposal: revisionProposal,
  shownAt: "2026-05-09T16:00:00.000Z",
});
assert.equal(revisionShownState.proposalType, "template_revision");
assert.equal(revisionShownState.templateSlug, "engineering-project");
assert.equal(revisionShownState.templatePath, `${PROJECT_TASK_TEMPLATE_MARKDOWN_ROOT}/engineering-project.md`);

assert.deepEqual(
  buildProjectTemplateRevisionProposals({
    projects: revisionProjects,
    todos: revisionProjects.flatMap((candidate) => templateTodosFor(candidate.id, revisionTemplate)),
    existingTemplates: [templateMetadata(revisionTemplate)],
  }),
  []
);

assert.deepEqual(
  filterEligibleProjectTemplateProposals([revisionProposal], [
    stateFor({
      fingerprint: "never-new-template-fingerprint",
      clusterId: revisionProposal.clusterId,
      proposalType: "new_template",
      status: "never",
    }),
  ]).map((proposal) => proposal.proposalFingerprint),
  [revisionProposal.proposalFingerprint]
);

const previewProject = project("apply-a", "Apply target A");
const preview = buildProjectTemplateApplyPreview({
  template: revisionTemplate,
  projects: [previewProject],
  projectIds: [previewProject.id],
  todos: [
    todo(previewProject.id, "Contract", {
      id: "apply-a-contract",
      sourceKind: PROJECT_TASK_TEMPLATE_SOURCE_KIND,
      sourceRef: "engineering-project:v1:01-contract",
    }),
    todo(previewProject.id, "Billing initial payment", {
      id: "apply-a-manual-billing",
    }),
  ],
});

assert.deepEqual(preview.writeBoundary, {
  createsTodos: false,
  writesOnConfirmOnly: true,
  editsExistingTodos: false,
  providerWrites: false,
});
assert.equal(preview.projectPreviews.length, 1);
assert.deepEqual(
  preview.projectPreviews[0].duplicateWarnings.map((warning) => warning.existingTodoId).sort(),
  ["apply-a-contract", "apply-a-manual-billing"]
);
assert.deepEqual(
  preview.projectPreviews[0].missingTasks.map((task) => task.taskSlug),
  ["03-electrical", "04-mechanical"]
);
assert.deepEqual(
  preview.projectPreviews[0].missingTasks.map((task) => task.sourceRef),
  ["engineering-project:v1:03-electrical", "engineering-project:v1:04-mechanical"]
);
assert.deepEqual(
  buildProjectTemplateApplyTodoCreations(preview, [
    { projectId: previewProject.id, taskSlug: "03-electrical" },
    { projectId: previewProject.id, taskSlug: "01-contract" },
  ]),
  [
    {
      projectId: previewProject.id,
      taskSlug: "03-electrical",
      title: "Electrical",
      priority: "normal",
      moneyRelated: false,
      quickAction: false,
      estimatedMinutes: null,
      notes: null,
      sourceRef: "engineering-project:v1:03-electrical",
    },
  ]
);
assert.equal(preview.writeBoundary.providerWrites, false);
