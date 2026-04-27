import { strict as assert } from "node:assert";
import {
  extractEmailFollowUpSuggestion,
  parseEmailSuggestionDueDate,
} from "../shared/emailSuggestionExtraction";

const now = new Date("2026-04-24T12:00:00.000Z");

const baseMessage = {
  sourceSystem: "gmail",
  senderName: "Max",
  senderEmail: "max@example.com",
  receivedAt: "2026-04-24T11:00:00.000Z",
  matchedPersonName: "Max",
};

const todoSuggestion = extractEmailFollowUpSuggestion(
  {
    ...baseMessage,
    subject: "Re: FWD: Can you review the invoice tomorrow by EOD?",
    summary: "Please confirm the final amount when you can.",
  },
  now
);
assert.equal(todoSuggestion?.suggestedEntityKind, "todo");
assert.equal(todoSuggestion?.subject, "Can you review the invoice tomorrow by EOD?");
assert.equal(todoSuggestion?.dueAt, "2026-04-25T17:00");
assert.equal(todoSuggestion?.title, "Review the invoice tomorrow by EOD");
assert.match(todoSuggestion?.reason ?? "", /direct request/);
assert.match(todoSuggestion?.reason ?? "", /Praxis matched/);

const projectSuggestion = extractEmailFollowUpSuggestion(
  {
    ...baseMessage,
    subject: "Project kickoff and proposal scope",
    summary: "Please review the project proposal and draft milestone plan by May 4 at 2pm.",
  },
  now
);
assert.equal(projectSuggestion?.suggestedEntityKind, "project");
assert.equal(projectSuggestion?.dueAt, "2026-05-04T14:00");
assert.equal(projectSuggestion?.title, "Project kickoff and proposal scope");

const summaryActionSuggestion = extractEmailFollowUpSuggestion(
  {
    ...baseMessage,
    subject: "Quick request",
    summary: "Can you send the signed W-9 by Friday at noon?",
  },
  now
);
assert.equal(summaryActionSuggestion?.suggestedEntityKind, "todo");
assert.equal(summaryActionSuggestion?.title, "Send the signed W-9 by Friday at noon");
assert.equal(summaryActionSuggestion?.dueAt, "2026-05-01T12:00");

const waitingOnSuggestion = extractEmailFollowUpSuggestion(
  {
    ...baseMessage,
    subject: "Invoice approval",
    summary: "We are still waiting on Max for approval before I can submit the invoice.",
  },
  now
);
assert.equal(waitingOnSuggestion?.suggestedEntityKind, "todo");
assert.equal(
  waitingOnSuggestion?.title,
  "Waiting on Max for approval before I can submit the invoice"
);
assert.match(waitingOnSuggestion?.reason ?? "", /waiting-on or blocked language/);

const relativeDateSuggestion = extractEmailFollowUpSuggestion(
  {
    ...baseMessage,
    receivedAt: "2026-04-22T23:40:11.000Z",
    subject: "Meeting moved to tomorrow",
    summary: "Please confirm the moved meeting tomorrow.",
  },
  new Date("2026-04-27T12:00:00.000Z")
);
assert.equal(relativeDateSuggestion?.dueAt, "2026-04-23T17:00");

assert.equal(
  extractEmailFollowUpSuggestion(
    {
      ...baseMessage,
      senderName: "Newsletter",
      senderEmail: "noreply@example.com",
      subject: "Weekly digest",
      summary: "Your newsletter digest is ready.",
      matchedPersonName: null,
    },
    now
  ),
  null
);

assert.equal(
  extractEmailFollowUpSuggestion(
    {
      ...baseMessage,
      subject: "FYI project launch",
      summary: "FYI the kickoff went well.",
    },
    now
  ),
  null
);

assert.equal(parseEmailSuggestionDueDate("send it friday at noon", now), "2026-05-01T12:00");
assert.equal(parseEmailSuggestionDueDate("send it 5/6 by close of business", now), "2026-05-06T17:00");

console.log("email suggestion extraction tests passed");
