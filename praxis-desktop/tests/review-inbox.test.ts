import { strict as assert } from "node:assert";
import {
  buildReviewInboxFromProjectTemplateProposals,
  buildReviewInboxFromChatSuggestions,
  buildReviewInboxFromEmailSuggestions,
  sortReviewInboxItems,
} from "../shared/reviewInbox";
import { selectReviewInboxItems } from "../src/dashboardSelectors";
import type { ChatImportSnapshot, ChatSuggestionRecord } from "../shared/chatImport";
import type { EmailSnapshot, EmailSuggestionRecord } from "../shared/emailModel";
import type { ProjectTemplateProposal } from "../shared/projectTemplateProposals";

const suggestion = (
  overrides: Partial<EmailSuggestionRecord> = {}
): EmailSuggestionRecord => ({
  id: "email_fact_1",
  messageId: "email_message_1",
  sourceSystem: "gmail",
  title: "Follow up: Studio 2 touching base.",
  suggestedEntityKind: "todo",
  reason: "Email from David looks like a follow-up task.",
  confidence: 0.78,
  dueAt: "2026-04-28T17:00",
  status: "pending",
  routedTo: null,
  senderName: "David",
  senderEmail: "david@example.com",
  matchedPersonId: null,
  matchedPersonName: null,
  subject: "Studio 2 touching base.",
  summary: "Please let me know when you can.",
  receivedAt: "2026-04-24T14:57:16.000Z",
  createdAt: "2026-04-24T14:57:16.000Z",
  updatedAt: "2026-04-24T14:57:16.000Z",
  ...overrides,
});

const items = buildReviewInboxFromEmailSuggestions(
  [
    suggestion({
      id: "dismissed",
      status: "dismissed",
      dueAt: "2026-04-27T17:00",
    }),
    suggestion({
      id: "future",
      dueAt: "2026-04-30T17:00",
    }),
    suggestion({
      id: "overdue",
      title: "Follow up: Meeting moved to tomorrow",
      dueAt: "2026-04-23T17:00",
      receivedAt: "2026-04-22T23:40:11.000Z",
    }),
  ],
  new Date("2026-04-27T12:00:00.000Z")
);

assert.equal(items.length, 2);
assert.equal(items[0].sourceRecordId, "overdue");
assert.equal(items[0].sourceKind, "email");
assert.equal(items[0].sourceLabel, "Gmail");
assert.equal(items[0].isOverdue, true);
assert.equal(items[0].recommendedDecision, "archive");
assert.equal(items[1].sourceRecordId, "future");
assert.equal(items[1].isOverdue, false);
assert.equal(items[1].recommendedDecision, "create_todo");

const openPastItems = buildReviewInboxFromEmailSuggestions(
  [
    suggestion({
      id: "open-past",
      dueAt: "2026-04-23T17:00",
      subject: "Still waiting on the meeting notes",
      summary: "This remains outstanding.",
    }),
  ],
  new Date("2026-04-27T12:00:00.000Z")
);
assert.equal(openPastItems[0].recommendedDecision, "create_todo");

const chatSuggestion = (
  overrides: Partial<ChatSuggestionRecord> = {}
): ChatSuggestionRecord => ({
  id: "chat_fact_1",
  chatImportId: "chat_import_1",
  messageId: "chat_message_1",
  sourceSystem: "whatsapp",
  conversationTitle: "BDNC Operations",
  title: "Send the permit packet",
  suggestedEntityKind: "todo",
  reason: "Chat message in BDNC Operations looks like a follow-up task.",
  confidence: 0.76,
  dueAt: "2026-04-29T17:00",
  status: "pending",
  routedTo: null,
  senderName: "Pedro",
  subject: "BDNC Operations",
  summary: "Can you send the permit packet by Wednesday?",
  sentAt: "2026-04-27T12:15:00.000Z",
  createdAt: "2026-04-27T12:15:00.000Z",
  updatedAt: "2026-04-27T12:15:00.000Z",
  ...overrides,
});

const chatItems = buildReviewInboxFromChatSuggestions(
  [
    chatSuggestion({ id: "chat-dismissed", status: "dismissed" }),
    chatSuggestion({ id: "chat-active" }),
  ],
  new Date("2026-04-27T12:00:00.000Z")
);

assert.equal(chatItems.length, 1);
assert.equal(chatItems[0].sourceKind, "chat_import");
assert.equal(chatItems[0].sourceLabel, "WhatsApp");
assert.equal(chatItems[0].recommendedDecision, "create_todo");

const combined = sortReviewInboxItems([...items, ...chatItems]);
assert.equal(combined[0].sourceRecordId, "overdue");
assert.equal(combined.some((item) => item.sourceKind === "chat_import"), true);

const proposal: ProjectTemplateProposal = {
  id: "project-template-proposal:engineering",
  proposalType: "new_template",
  status: "draft",
  proposedSlug: "engineering-project",
  proposedLabel: "Engineering Project",
  proposedVersion: 1,
  source: "ai_proposal",
  basedOnProjectIds: ["project-a", "project-b", "project-c"],
  matchedProjectCount: 3,
  matchedProjectTitles: ["Engineering A", "Engineering B", "Engineering C"],
  recurringTaskCount: 10,
  taskOverlapPercent: 91,
  evidenceSummary: "10 tasks repeated across 3 projects",
  clusterId: "project-template-cluster:engineering",
  proposalFingerprint: "project-template-fingerprint:engineering",
  materialChangeHash: "engineeringhash",
  writeBoundary: {
    saved: false,
    writesOnConfirmOnly: true,
    existingProjectsChange: false,
    providerWrites: false,
  },
  evidence: [
    {
      title: "Contract",
      taskSlug: "contract",
      projectIds: ["project-a", "project-b", "project-c"],
      projectCount: 3,
      occurrenceCount: 3,
    },
  ],
  markdownDraft:
    "---\nkind: project_task_template\nslug: engineering-project\nlabel: Engineering Project\nversion: 1\nstatus: active\nsource: ai_proposal\n---\n\n# Engineering Project\n\n## Tasks\n\n- [ ] Contract\n",
  explanation: "Detected 10 tasks repeated across 3 projects.",
};

const proposalItems = buildReviewInboxFromProjectTemplateProposals([proposal]);
assert.equal(proposalItems.length, 1);
assert.equal(proposalItems[0].sourceKind, "project_template_proposal");
assert.equal(proposalItems[0].title, "Reusable project template found");
assert.equal(
  proposalItems[0].reason,
  "PRAXIS noticed a repeated project checklist. Edit the draft if needed, then confirm before saving a markdown template."
);
assert.equal(
  proposalItems[0].recommendationReason,
  "Existing projects will not change. No connected providers will be updated."
);
assert.equal(proposalItems[0].receivedAt, "1970-01-01T00:00:00.000Z");
assert.equal(proposalItems[0].recommendedDecision, "review");
assert.equal(proposalItems[0].suggestedActionKind, "project_template");
assert.equal(proposalItems[0].projectTemplateProposal?.proposalType, "new_template");
assert.equal(proposalItems[0].projectTemplateProposal?.writeBoundary.saved, false);
assert.equal(proposalItems[0].projectTemplateProposal?.writeBoundary.providerWrites, false);
assert.equal(proposalItems[0].projectTemplateProposal?.markdownDraft, proposal.markdownDraft);

const revisionProposal: ProjectTemplateProposal = {
  ...proposal,
  id: "project-template-revision:engineering",
  proposalType: "template_revision",
  templateSlug: "engineering-project",
  templatePath: "templates/project-task-templates/engineering-project.md",
  currentVersion: 1,
  proposedVersion: 1,
  recurringTaskCount: 1,
  evidenceSummary: "1 possible template update repeated across 3 projects",
  clusterId: "project-template-revision-cluster:engineering-project",
  proposalFingerprint: "project-template-revision-fingerprint:engineering",
  materialChangeHash: "engineeringrevisionhash",
  changes: [
    {
      kind: "keep_task",
      taskSlug: "contract",
      title: "Contract",
    },
    {
      kind: "add_task",
      taskSlug: "permit-closeout",
      title: "Permit closeout",
      evidenceProjectIds: ["project-a", "project-b", "project-c"],
    },
  ],
  markdownDraft:
    "---\nkind: project_task_template\nslug: engineering-project\nlabel: Engineering Project\nversion: 1\nstatus: active\nsource: markdown\n---\n\n# Engineering Project\n\n## Tasks\n\n- [ ] Contract\n- [ ] Permit closeout\n",
  explanation: "Detected 1 possible template update repeated across 3 projects for Engineering Project.",
};

const revisionItems = buildReviewInboxFromProjectTemplateProposals([revisionProposal]);
assert.equal(revisionItems.length, 1);
assert.equal(revisionItems[0].title, "Project template revision found");
assert.equal(
  revisionItems[0].reason,
  "PRAXIS noticed repeated project tasks that may belong in an existing template. Review the draft before updating markdown."
);
assert.equal(revisionItems[0].projectTemplateProposal?.proposalType, "template_revision");
assert.equal(revisionItems[0].projectTemplateProposal?.templateSlug, "engineering-project");
assert.equal(
  revisionItems[0].projectTemplateProposal?.changes?.some(
    (change) => change.kind === "add_task" && change.taskSlug === "permit-closeout"
  ),
  true
);

const combinedWithProposal = sortReviewInboxItems([...items, ...chatItems, ...proposalItems]);
assert.equal(combinedWithProposal[0].sourceRecordId, "overdue");
assert.equal(combinedWithProposal.some((item) => item.sourceKind === "email"), true);
assert.equal(combinedWithProposal.some((item) => item.sourceKind === "chat_import"), true);
assert.equal(
  combinedWithProposal.some((item) => item.sourceKind === "project_template_proposal"),
  true
);

const emailSnapshot: EmailSnapshot = {
  connections: [],
  messages: [],
  suggestions: [suggestion({ id: "selector-email" })],
  contactSuggestionDismissals: [],
};
const chatSnapshot: ChatImportSnapshot = {
  imports: [],
  recentMessages: [],
  suggestions: [chatSuggestion({ id: "selector-chat" })],
};
const selectorItems = selectReviewInboxItems(emailSnapshot, chatSnapshot, {
  proposals: [proposal],
});
assert.equal(selectorItems.some((item) => item.sourceKind === "email"), true);
assert.equal(selectorItems.some((item) => item.sourceKind === "chat_import"), true);
assert.equal(
  selectorItems.some((item) => item.sourceKind === "project_template_proposal"),
  true
);

console.log("review inbox tests passed");
