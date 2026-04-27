import { strict as assert } from "node:assert";
import {
  buildReviewInboxFromChatSuggestions,
  buildReviewInboxFromEmailSuggestions,
  sortReviewInboxItems,
} from "../shared/reviewInbox";
import type { ChatSuggestionRecord } from "../shared/chatImport";
import type { EmailSuggestionRecord } from "../shared/emailModel";

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

console.log("review inbox tests passed");
