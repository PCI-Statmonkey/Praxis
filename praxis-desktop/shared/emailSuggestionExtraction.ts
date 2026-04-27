import type {
  EmailMessageRecord,
  EmailSuggestionEntityKind,
} from "./emailModel";
import { normalizeEmailSuggestionSubject } from "./emailSuggestionRules";

export type ExtractedEmailSuggestion = {
  title: string;
  suggestedEntityKind: EmailSuggestionEntityKind;
  reason: string;
  dueAt: string | null;
  senderName: string | null;
  senderEmail: string | null;
  subject: string;
  summary: string | null;
  receivedAt: string;
};

export type EmailSuggestionExtractionMessage = Pick<
  EmailMessageRecord,
  | "subject"
  | "summary"
  | "senderName"
  | "senderEmail"
  | "receivedAt"
  | "sourceSystem"
  | "matchedPersonName"
>;

const ASSIGNMENT_PATTERNS = [
  /\bplease\b/i,
  /\bcan you\b/i,
  /\bcould you\b/i,
  /\bwould you\b/i,
  /\bneed you to\b/i,
  /\byou need to\b/i,
  /\baction required\b/i,
  /\bwaiting on\b/i,
  /\blet me know\b/i,
  /\bwhen you can\b/i,
  /\bwhen you get a chance\b/i,
  /\byour turn\b/i,
];

const WAITING_ON_PATTERNS = [
  /\bwaiting\s+(?:on|for)\b/i,
  /\bstill waiting\s+(?:on|for)\b/i,
  /\bblocked\s+(?:on|by)\b/i,
  /\bneed\s+.+?\s+from\s+.+?\b/i,
];

const TODO_PATTERNS = [
  /\bfollow up\b/i,
  /\bnext action\b/i,
  /\bnext step\b/i,
  /\breply\b/i,
  /\brespond\b/i,
  /\bsend\b/i,
  /\bcall\b/i,
  /\bconfirm\b/i,
  /\breview\b/i,
  /\bapprove\b/i,
  /\bbook\b/i,
  /\bschedule\b/i,
  /\bsubmit\b/i,
  /\bfinish\b/i,
  /\bdeliver\b/i,
  /\bship\b/i,
  /\bpay\b/i,
  /\binvoice\b/i,
  /\bwaiting\s+(?:on|for)\b/i,
  /\bblocked\s+(?:on|by)\b/i,
];

const PROJECT_PATTERNS = [
  /\bproject\b/i,
  /\bengagement\b/i,
  /\bdeliverable\b/i,
  /\bscope\b/i,
  /\boutline\b/i,
  /\breport\b/i,
  /\bproposal\b/i,
  /\bcontract\b/i,
  /\bsourcebook\b/i,
  /\badventure\b/i,
  /\bmission\b/i,
  /\bkickoff\b/i,
  /\bmilestone\b/i,
  /\bphase\b/i,
  /\bdraft\b/i,
  /\brevision\b/i,
  /\bimplementation\b/i,
  /\bintegration\b/i,
  /\brollout\b/i,
  /\blaunch plan\b/i,
];

const DEADLINE_PATTERNS = [
  /\btoday\b/i,
  /\btonight\b/i,
  /\btomorrow\b/i,
  /\bthis week\b/i,
  /\bnext week\b/i,
  /\bdue\b/i,
  /\bdeadline\b/i,
  /\bby\b/i,
  /\bbefore\b/i,
  /\beod\b/i,
  /\bend of day\b/i,
  /\bnoon\b/i,
  /\bclose of business\b/i,
  /\bcob\b/i,
  /\bend of week\b/i,
  /\bfriday\b/i,
  /\bmonday\b/i,
  /\btuesday\b/i,
  /\bwednesday\b/i,
  /\bthursday\b/i,
  /\bsaturday\b/i,
  /\bsunday\b/i,
  /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/i,
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|sept|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
];

const URGENCY_PATTERNS = [
  /\burgent\b/i,
  /\basap\b/i,
  /\bsoon\b/i,
  /\bimportant\b/i,
  /\bpriority\b/i,
  /\bneeded\b/i,
  /\bblocking\b/i,
  /\bblocked\b/i,
  /\bcritical\b/i,
];

const AUTO_NOISE_PATTERNS = [
  /\bnewsletter\b/i,
  /\bdigest\b/i,
  /\bsummary available\b/i,
  /\bnotification\b/i,
  /\bauto(?:mated)? message\b/i,
  /\bdo not reply\b/i,
  /\bnoreply\b/i,
  /\bno-reply\b/i,
  /\bpassword\b/i,
  /\bsecurity alert\b/i,
  /\bverification code\b/i,
  /\breset code\b/i,
];

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MONTH_NAMES = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const pad = (value: number) => String(value).padStart(2, "0");

const toLocalInputValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const parseTime = (text: string) => {
  const match = text.match(
    /\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\b/i
  );
  if (!match) {
    return null;
  }

  let hour = Number(match[1] ?? match[4]);
  const minute = match[2] || match[5] ? Number(match[2] ?? match[5]) : 0;
  const suffix = (match[3] ?? match[6])?.toLowerCase();

  if (suffix === "pm" && hour < 12) {
    hour += 12;
  }
  if (suffix === "am" && hour === 12) {
    hour = 0;
  }
  if (!suffix && hour >= 1 && hour <= 7) {
    hour += 12;
  }

  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
};

export const parseEmailSuggestionDueDate = (text: string, now = new Date()) => {
  const normalized = text.toLowerCase();
  let target = startOfDay(now);

  if (/\btoday\b/.test(normalized)) {
    target = startOfDay(now);
  } else if (/\btonight\b/.test(normalized)) {
    target = startOfDay(now);
    target.setHours(20, 0, 0, 0);
  } else if (/\btomorrow\b/.test(normalized)) {
    target = addDays(startOfDay(now), 1);
  } else if (/\bend of week\b|\beow\b|\bthis week\b/.test(normalized)) {
    const friday = 5;
    const daysAhead = (friday - now.getDay() + 7) % 7 || 7;
    target = addDays(startOfDay(now), daysAhead);
  } else if (/\bnext week\b/.test(normalized)) {
    target = addDays(startOfDay(now), 7);
  } else {
    const monthNameMatch = normalized.match(
      new RegExp(
        `\\b(${MONTH_NAMES.join("|")})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{2,4}))?\\b`
      )
    );
    if (monthNameMatch) {
      const month = MONTH_NAMES.indexOf(monthNameMatch[1]);
      const day = Number(monthNameMatch[2]);
      const year = monthNameMatch[3]
        ? Number(
            monthNameMatch[3].length === 2 ? `20${monthNameMatch[3]}` : monthNameMatch[3]
          )
        : now.getFullYear();
      target = new Date(year, month, day);
    } else {
      const weekdayIndex = WEEKDAYS.findIndex((weekday) =>
        new RegExp(`\\b${weekday}\\b`).test(normalized)
      );
      if (weekdayIndex >= 0) {
        const currentDay = now.getDay();
        const daysAhead = (weekdayIndex - currentDay + 7) % 7 || 7;
        target = addDays(startOfDay(now), daysAhead);
      } else {
        const dateMatch = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
        if (!dateMatch) {
          return null;
        }
        const month = Number(dateMatch[1]) - 1;
        const day = Number(dateMatch[2]);
        const year = dateMatch[3]
          ? Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3])
          : now.getFullYear();
        target = new Date(year, month, day);
      }
    }
  }

  const time = parseTime(text);
  if (time) {
    target.setHours(time.hour, time.minute, 0, 0);
  } else if (/\bnoon\b/i.test(text)) {
    target.setHours(12, 0, 0, 0);
  } else if (/\beod\b|\bend of day\b|\bclose of business\b/i.test(text)) {
    target.setHours(17, 0, 0, 0);
  } else {
    target.setHours(17, 0, 0, 0);
  }

  return toLocalInputValue(target);
};

const receivedAtDateOrFallback = (receivedAt: string, fallback: Date) => {
  const receivedAtDate = new Date(receivedAt);
  return Number.isNaN(receivedAtDate.getTime()) ? fallback : receivedAtDate;
};

const countPatternMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((count, pattern) => (pattern.test(text) ? count + 1 : count), 0);

const truncate = (value: string, maxLength: number) =>
  value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}...`;

const firstSentence = (value: string) =>
  value
    .split(/(?:[.!?]\s+|\n+)/)
    .map((candidate) => candidate.trim().replace(/[.!?]+$/g, ""))
    .find(Boolean) ?? "";

const normalizeActionTitle = (value: string) => {
  const cleaned = value
    .replace(/^(?:to|that you|you|we)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return null;
  }
  return truncate(cleaned.charAt(0).toUpperCase() + cleaned.slice(1), 96);
};

const extractTodoTitleFromText = (subject: string, summary: string | null) => {
  const candidates = [subject, summary ?? ""].map(firstSentence).filter(Boolean);
  for (const candidate of candidates) {
    const actionMatch = candidate.match(
      /\b(?:please|can you|could you|would you|need you to|you need to)\s+([^.!?\n]+)$/i
    );
    if (actionMatch?.[1]) {
      return normalizeActionTitle(actionMatch[1]);
    }

    const nextActionMatch = candidate.match(
      /\b(?:next action|next step)\s*(?:is|:|-)?\s*([^.!?\n]+)$/i
    );
    if (nextActionMatch?.[1]) {
      return normalizeActionTitle(nextActionMatch[1]);
    }

    const waitingMatch = candidate.match(
      /\b(?:i'?m|we'?re|we are|still|currently)?\s*waiting\s+(?:on|for)\s+([^.!?\n]+)$/i
    );
    if (waitingMatch?.[1]) {
      return normalizeActionTitle(`Waiting on ${waitingMatch[1]}`);
    }

    const blockedMatch = candidate.match(/\bblocked\s+(?:on|by)\s+([^.!?\n]+)$/i);
    if (blockedMatch?.[1]) {
      return normalizeActionTitle(`Blocked on ${blockedMatch[1]}`);
    }
  }

  return null;
};

const cleanSuggestionTitle = (
  subject: string,
  summary: string | null,
  suggestedEntityKind: EmailSuggestionEntityKind
) => {
  const stripped = subject
    .replace(/^(please|can you|could you|would you|need you to|you need to)\s+/i, "")
    .replace(/\b(action required|urgent)\b[:\s-]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (suggestedEntityKind === "project") {
    return truncate(stripped, 96);
  }

  const extractedAction = extractTodoTitleFromText(subject, summary);
  if (extractedAction) {
    return extractedAction;
  }

  if (
    /^(reply|respond|send|call|confirm|review|approve|book|schedule|submit|finish|deliver|ship|pay)\b/i.test(
      stripped
    )
  ) {
    return truncate(stripped.charAt(0).toUpperCase() + stripped.slice(1), 96);
  }

  return truncate(`Follow up: ${stripped}`, 96);
};

export const extractEmailFollowUpSuggestion = (
  message: EmailSuggestionExtractionMessage,
  now = new Date()
): ExtractedEmailSuggestion | null => {
  const subject = normalizeEmailSuggestionSubject(message.subject);
  const text = [subject, message.summary ?? ""].join("\n").trim();
  const normalizedText = text.toLowerCase();
  const senderEmail = message.senderEmail?.toLowerCase() ?? "";

  const assignmentHits = countPatternMatches(text, ASSIGNMENT_PATTERNS);
  const waitingOnHits = countPatternMatches(text, WAITING_ON_PATTERNS);
  const todoHits = countPatternMatches(text, TODO_PATTERNS);
  const projectHits = countPatternMatches(text, PROJECT_PATTERNS);
  const deadlineHits = countPatternMatches(text, DEADLINE_PATTERNS);
  const urgencyHits = countPatternMatches(text, URGENCY_PATTERNS);
  const noiseHits =
    countPatternMatches(text, AUTO_NOISE_PATTERNS) +
    (/\bnoreply\b|\bno-reply\b/.test(senderEmail) ? 1 : 0);

  const requestMatch = assignmentHits > 0 || todoHits > 0 || waitingOnHits > 0;
  const deadlineMatch = deadlineHits > 0;
  const urgencyMatch = urgencyHits > 0;
  const projectMatch = projectHits > 0;

  if (!requestMatch && !deadlineMatch && !urgencyMatch && !projectMatch) {
    return null;
  }

  if (noiseHits > 0 && assignmentHits === 0 && urgencyHits === 0 && projectHits === 0) {
    return null;
  }

  if (
    normalizedText.startsWith("thanks") ||
    normalizedText.startsWith("thank you") ||
    normalizedText.startsWith("fyi")
  ) {
    return null;
  }

  const suggestedEntityKind: EmailSuggestionEntityKind =
    projectHits >= 2 || (projectHits >= 1 && (deadlineHits > 0 || assignmentHits > 0))
      ? "project"
      : "todo";
  const dueAt = parseEmailSuggestionDueDate(text, receivedAtDateOrFallback(message.receivedAt, now));
  const confidence = Math.min(
    0.36 +
      assignmentHits * 0.16 +
      waitingOnHits * 0.12 +
      todoHits * 0.08 +
      projectHits * 0.11 +
      deadlineHits * 0.1 +
      urgencyHits * 0.08 -
      noiseHits * 0.12,
    0.94
  );

  if (confidence < 0.62) {
    return null;
  }

  const sender = message.senderName ?? message.senderEmail ?? "a sender";
  const reasonParts = [
    `Email from ${sender} looks like a ${suggestedEntityKind === "project" ? "project-sized thread" : "follow-up task"}.`,
    assignmentHits > 0 ? "It includes a direct request aimed at you." : null,
    waitingOnHits > 0 ? "It includes waiting-on or blocked language." : null,
    assignmentHits === 0 && todoHits > 0 ? "It includes action-oriented language." : null,
    deadlineMatch && dueAt
      ? `It also mentions timing around ${dueAt}.`
      : deadlineMatch
        ? "It mentions timing or a deadline."
        : null,
    urgencyMatch ? "The language suggests this should not wait." : null,
    message.matchedPersonName ? `Praxis matched the sender to saved person ${message.matchedPersonName}.` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    title: cleanSuggestionTitle(subject, message.summary, suggestedEntityKind),
    suggestedEntityKind,
    reason: reasonParts.join(" "),
    dueAt,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    subject,
    summary: message.summary,
    receivedAt: message.receivedAt,
  };
};
