import type {
  AssistantContextAction,
  AssistantContextActionCommand,
} from "../shared/assistantContext";
import type {
  AssistantRouteRequest,
  AssistantRouteResult,
} from "../shared/assistantRouter";
import { classifyAssistantReviewRoute } from "../shared/assistantRouter";
import { skillReferencesForAssistantIntent } from "../shared/assistantSkillRouting";
import type {
  DeadlineRecord,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
} from "../shared/workModel";
import {
  analyzeWaitingOnAssignment,
  isWaitingOnAssignmentRequest,
} from "../shared/waitingOnAssignment";
import { getWorkSnapshot } from "./workRepository";
import { getSkillRegistrySnapshot } from "./skillRegistry";

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
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
  const match = text.match(/\b(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?\s*(am|pm))\b/i);
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

const parseDate = (text: string, now = new Date()) => {
  const normalized = text.toLowerCase();
  let target = startOfDay(now);

  if (/\btoday\b/.test(normalized)) {
    target = startOfDay(now);
  } else if (/\btomorrow\b/.test(normalized)) {
    target = addDays(startOfDay(now), 1);
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

  const time = parseTime(text);
  if (time) {
    target.setHours(time.hour, time.minute, 0, 0);
  } else {
    target.setHours(17, 0, 0, 0);
  }

  return toLocalInputValue(target);
};

const isFocusQuestion = (text: string) =>
  /\b(where am i|status|status report|where do i stand|how am i doing|tell me where|what'?s going on)\b/i.test(
    text
  );

const isDailyReportRequest = (text: string) =>
  /\b(daily report|status report|morning report|today'?s report|what matters today|what do i need today|brief me|briefing|what'?s on deck)\b/i.test(
    text
  ) && !/\b(on|for|about)\s+[a-z0-9]/i.test(text);

const isAppointmentReportRequest = (text: string) =>
  /\b(appointment|appointments|calendar|calender|event|events|schedule|what'?s on my calendar|what do i have)\b/i.test(
    text
  ) &&
  /\b(today|tomorrow|upcoming|next|what|show|tell|any|have|do i have|on deck)\b/i.test(text);

const isConversationReviewRequest = (text: string) =>
  /\b(review|triage|analyze|check|scan|import)\b/i.test(text) &&
  /\b(conversation|chat|thread|messages|dm|dms|texts|sms|whatsapp|slack)\b/i.test(text);

const conversationReviewSource = (
  text: string
): Extract<AssistantRouteResult, { intent: "conversation_review" }>["sourceSystem"] => {
  if (/\bslack\b/i.test(text)) {
    return "slack";
  }
  if (/\bwhatsapp\b/i.test(text)) {
    return "whatsapp";
  }
  if (/\b(sms|texts|text messages)\b/i.test(text)) {
    return "sms";
  }
  if (/\b(paste|manual|import)\b/i.test(text)) {
    return "manual";
  }
  return "unknown";
};

const appointmentReportRange = (text: string): "today" | "tomorrow" | "upcoming" => {
  if (/\b(upcoming|next|future|on deck)\b/i.test(text)) {
    return "upcoming";
  }
  if (/\btomorrow\b/i.test(text)) {
    return "tomorrow";
  }
  return "today";
};

const isTellMoreRequest = (text: string) =>
  /\b(tell me more|more|go on|expand|details|go deeper|what else)\b/i.test(text);

const isContextualShortReply = (text: string) =>
  /^(yes|y|yeah|yep|sure|ok|okay|do it|go ahead|sounds good|please do|no|n|nope|not now|cancel|never mind|1|2|3|4|5|first|second|third|fourth|fifth|the first one|the second one|the third one)$/i.test(
    text.trim()
  );

const referencesContextTarget = (text: string) =>
  /\b(that|it|this|one|item|\d{1,2}|first|top|second|third|fourth|fifth)\b/i.test(text);

const isContextActionRequest = (text: string) =>
  isContextualShortReply(text) ||
  (/\b(complete|completed|done|mark done|mark it done|finish|finished)\b/i.test(text) &&
    /\b(\d{1,2}|first|top|second|third|fourth|fifth|that|it|this)\b/i.test(text)) ||
  (/\b(reactivate|resume|unpause|reopen|make it active|start it again)\b/i.test(text) &&
    referencesContextTarget(text)) ||
  (/\b(pause|hold|put it on hold|park it)\b/i.test(text) && referencesContextTarget(text)) ||
  (/\b(move|reschedule|shift|change|set|push|make)\b/i.test(text) &&
    /\b(due|deadline|to|for|on|by)\b/i.test(text) &&
    Boolean(parseDate(text)) &&
    referencesContextTarget(text)) ||
  (/\b(clear|remove|not waiting|no longer waiting|got it|received|came through)\b/i.test(text) &&
    /\b(waiting|flag|waiting on)\b/i.test(text) &&
    referencesContextTarget(text)) ||
  (/\b(open|show|pull up|bring up)\b/i.test(text) &&
    /\b(focus report|project focus|mission focus|related project)\b/i.test(text) &&
    referencesContextTarget(text));

const isExplicitCompletionRequest = (text: string) =>
  /\b(mark|complete|completed|done|finish|finished|close|clear)\b/i.test(text) &&
  /\b(done|complete|completed|finished|closed|cleared)\b/i.test(text) &&
  !/\b(\d{1,2}|first|top|second|third|fourth|fifth)\b/i.test(text);

const isDueDateMoveRequest = (text: string) =>
  /\b(move|reschedule|shift|change|set|push|make)\b/i.test(text) &&
  /\b(due|deadline|to|for|on|by)\b/i.test(text) &&
  Boolean(parseDate(text));

const isWaitingOnClearRequest = (text: string) =>
  /\b(sent|handled|answered|replied|responded|got it|received|came through|done|complete|completed|clear|remove|not waiting|no longer waiting)\b/i.test(
    text
  ) && /\b(waiting|sent|replied|responded|answered|got|received|clear|remove)\b/i.test(text);

const isWorkLookupRequest = (text: string) =>
  (/\b(waiting on|waiting for|what am i waiting on|what are we waiting on)\b/i.test(text) ||
    /\b(slipping|overdue|falling behind|behind on|at risk)\b/i.test(text) ||
    /\b(quick win|quick wins|knock out quickly|knock out|easy win|easy wins)\b/i.test(text) ||
    /\b(money related|money-related|billing items|invoice items|finance items)\b/i.test(text) ||
    /\b(blocked|stuck|paused)\b/i.test(text)) &&
  (/\b(what|which|show|tell|do i have|am i|are we|give me|check)\b/i.test(text) ||
    text.trim().endsWith("?"));

const isPersonLookupRequest = (text: string) =>
  /\b(email|e mail|phone|cell|mobile|number|billing address|invoice address|mailing address|contact|reach|get ahold|get hold|project|projects|mission|missions|involved|working with|part of|relationship|relationships)\b/i.test(
    text
  ) &&
  (/\b(give me|what is|what'?s|show me|find|look up|lookup|do i have|can you)\b/i.test(text) ||
    /'s\s+(email|phone|number|contact|address)\b/i.test(text) ||
    text.trim().endsWith("?"));

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (value: string) => normalize(value).split(" ").filter((word) => word.length >= 3);

const scoreTitleMatch = (text: string, title: string) => {
  const normalizedText = normalize(text);
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) {
    return 0;
  }
  if (normalizedText.includes(normalizedTitle)) {
    return 100;
  }

  const titleWords = words(title);
  if (titleWords.length === 0) {
    return 0;
  }

  const matchedWords = titleWords.filter((word) => normalizedText.includes(word));
  if (matchedWords.length === 0) {
    return 0;
  }
  return Math.round((matchedWords.length / titleWords.length) * 80);
};

const scorePersonMatch = (text: string, person: PersonRecord) => {
  const normalizedText = normalize(text);
  const candidates = [person.name, ...person.aliases];
  if (candidates.some((candidate) => normalizedText.includes(normalize(candidate)))) {
    return 100;
  }

  const personWords = candidates.flatMap(words);
  if (personWords.length === 0) {
    return 0;
  }

  const matchedWords = personWords.filter((word) => normalizedText.includes(word));
  if (matchedWords.length === 0) {
    return 0;
  }
  return Math.min(90, matchedWords.length * 45);
};

type ScoredWork = {
  entityKind: "todo" | "deadline";
  entityId: string;
  title: string;
  score: number;
};

const toConfirmationAction = (
  candidate: ScoredWork,
  ordinal: number,
  command: AssistantContextActionCommand,
  dueAt?: string
): AssistantContextAction => ({
  actionId: `${candidate.entityKind}:${candidate.entityId}:${command}:${ordinal}`,
  ordinal,
  title: candidate.title,
  entityKind: candidate.entityKind,
  entityId: candidate.entityId,
  command,
  dueAt,
});

const formatConfirmationMessage = (prompt: string, actions: AssistantContextAction[]) =>
  `${prompt}\n${actions.map((action) => `${action.ordinal}. ${action.title}`).join("\n")}`;

const formatWaitingOnAssignmentMessage = (prompt: string, actions: AssistantContextAction[]) =>
  `${prompt}\n${actions.map((action) => `${action.ordinal}. ${action.title}`).join("\n")}`;

const findBestEntity = (text: string, missions: MissionRecord[], projects: ProjectRecord[]) => {
  const scored = [
    ...missions
      .filter((mission) => mission.status !== "completed")
      .map((mission) => ({
        entityKind: "mission" as const,
        entityId: mission.id,
        title: mission.title,
        score: scoreTitleMatch(text, mission.title),
      })),
    ...projects
      .filter((project) => project.status !== "completed")
      .map((project) => ({
        entityKind: "project" as const,
        entityId: project.id,
        title: project.title,
        score: scoreTitleMatch(text, project.title),
      })),
  ]
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  if (scored.length === 0 || (scored[1] && scored[1].score === scored[0].score)) {
    return null;
  }

  return scored[0];
};

const scoredCompletableWork = (
  text: string,
  todos: TodoRecord[],
  deadlines: DeadlineRecord[]
) =>
  [
    ...todos
      .filter((todo) => todo.status !== "completed")
      .map((todo) => ({
        entityKind: "todo" as const,
        entityId: todo.id,
        title: todo.title,
        score: scoreTitleMatch(text, todo.title),
      })),
    ...deadlines
      .filter((deadline) => deadline.status !== "completed")
      .map((deadline) => ({
        entityKind: "deadline" as const,
        entityId: deadline.id,
        title: deadline.title,
        score: scoreTitleMatch(text, deadline.title),
      })),
  ]
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

const findBestCompletableWork = (
  text: string,
  todos: TodoRecord[],
  deadlines: DeadlineRecord[]
) => {
  const scored = scoredCompletableWork(text, todos, deadlines);

  if (scored.length === 0) {
    return null;
  }

  const [first, second] = scored;
  if (!first || first.score < 50 || (second && first.score - second.score < 12)) {
    return null;
  }

  return first;
};

const confirmationWorkActions = (
  text: string,
  todos: TodoRecord[],
  deadlines: DeadlineRecord[],
  command: AssistantContextActionCommand,
  dueAt?: string
) =>
  scoredCompletableWork(text, todos, deadlines)
    .filter((candidate) => candidate.score >= 50)
    .slice(0, 5)
    .map((candidate, index) => toConfirmationAction(candidate, index + 1, command, dueAt));

const findBestDueDateWork = (
  text: string,
  todos: TodoRecord[],
  deadlines: DeadlineRecord[]
) => findBestCompletableWork(text, todos, deadlines);

const findBestWaitingOnClear = (
  text: string,
  people: PersonRecord[],
  todos: TodoRecord[]
) => {
  const scoredPeople = people
    .map((person) => ({
      person,
      score: scorePersonMatch(text, person),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name));

  const [bestPerson, secondPerson] = scoredPeople;
  if (!bestPerson || bestPerson.score < 50 || (secondPerson && bestPerson.score - secondPerson.score < 12)) {
    return null;
  }

  const waitingTodos = todos.filter(
    (todo) =>
      todo.status !== "completed" &&
      todo.waitingOnPersonId === bestPerson.person.id
  );
  if (waitingTodos.length !== 1) {
    return null;
  }

  return {
    person: bestPerson.person,
    todo: waitingTodos[0],
    score: bestPerson.score,
  };
};

const waitingOnClearConfirmation = (
  text: string,
  people: PersonRecord[],
  todos: TodoRecord[]
) => {
  const scoredPeople = people
    .map((person) => ({
      person,
      score: scorePersonMatch(text, person),
    }))
    .filter((candidate) => candidate.score >= 50)
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name));
  const [bestPerson] = scoredPeople;
  if (!bestPerson) {
    return null;
  }

  const waitingTodos = todos.filter(
    (todo) =>
      todo.status !== "completed" &&
      todo.waitingOnPersonId === bestPerson.person.id
  );
  if (waitingTodos.length <= 1) {
    return null;
  }

  const actions = waitingTodos.slice(0, 5).map(
    (todo, index): AssistantContextAction => ({
      actionId: `todo:${todo.id}:clear_waiting_on:${index + 1}`,
      ordinal: index + 1,
      title: todo.title,
      entityKind: "todo",
      entityId: todo.id,
      command: "clear_waiting_on",
      personId: bestPerson.person.id,
    })
  );

  return {
    person: bestPerson.person,
    actions,
  };
};

const withSkillReferences = (
  result: AssistantRouteResult,
  surface: AssistantRouteRequest["surface"] = "desktop"
): AssistantRouteResult => ({
  ...result,
  skillReferences: skillReferencesForAssistantIntent(
    result.intent,
    getSkillRegistrySnapshot(),
    surface
  ),
});

const routeAssistantRequestCore = (request: AssistantRouteRequest): AssistantRouteResult => {
  const text = request.text.trim();
  if (!text) {
    return {
      intent: "unresolved",
      confidence: 0,
      message: "Tell Praxis what you want first.",
    };
  }

  if (isTellMoreRequest(text)) {
    return {
      intent: "tell_more",
      confidence: 0.8,
      message: "Opening the expanded status details.",
    };
  }

  if (isContextActionRequest(text)) {
    return {
      intent: "context_action",
      confidence: 0.82,
      message: "Resolving this against the current report.",
    };
  }

  const reviewRoute = classifyAssistantReviewRoute(text);
  if (reviewRoute) {
    if (reviewRoute.intent === "daily_report") {
      return {
        intent: "daily_report",
        confidence: reviewRoute.confidence,
        message: reviewRoute.message,
      };
    }
    if (reviewRoute.intent === "person_lookup") {
      return {
        intent: "person_lookup",
        confidence: reviewRoute.confidence,
        message: reviewRoute.message,
      };
    }
    return {
      intent: "work_lookup",
      confidence: reviewRoute.confidence,
      message: reviewRoute.message,
    };
  }

  if (isPersonLookupRequest(text)) {
    return {
      intent: "person_lookup",
      confidence: 0.82,
      message: "Looking up that person record.",
    };
  }

  if (isConversationReviewRequest(text)) {
    const sourceSystem = conversationReviewSource(text);
    return {
      intent: "conversation_review",
      sourceSystem,
      confidence: 0.82,
      message:
        "Conversation review is ready for manual import. Open Talk to Praxis, use Import chat for review, paste the useful exchange, then review any suggested todo or project in Review Inbox.",
    };
  }

  if (isExplicitCompletionRequest(text)) {
    const snapshot = getWorkSnapshot();
    const match = findBestCompletableWork(text, snapshot.todos, snapshot.deadlines);
    if (!match) {
      const actions = confirmationWorkActions(
        text,
        snapshot.todos,
        snapshot.deadlines,
        "complete"
      );
      if (actions.length > 1) {
        const prompt = "I found a few possible items to complete. Which one?";
        return {
          intent: "work_update_confirmation",
          title: "Complete Which Item?",
          prompt,
          actions,
          confidence: 0.6,
          message: formatConfirmationMessage(prompt, actions),
        };
      }
      return {
        intent: "unresolved",
        confidence: 0.35,
        message:
          "I understand this as a completion request, but I could not safely match one active todo or deadline.",
      };
    }

    return {
      intent: "work_update_status",
      entityKind: match.entityKind,
      entityId: match.entityId,
      title: match.title,
      status: "completed",
      confidence: Math.min(match.score / 100, 0.95),
      message: `Marking ${match.title} completed.`,
    };
  }

  if (isDueDateMoveRequest(text)) {
    const dueAt = parseDate(text);
    const snapshot = getWorkSnapshot();
    const match = findBestDueDateWork(text, snapshot.todos, snapshot.deadlines);
    if (!dueAt || !match) {
      const actions = dueAt
        ? confirmationWorkActions(
            text,
            snapshot.todos,
            snapshot.deadlines,
            "update_due_date",
            dueAt
          )
        : [];
      if (actions.length > 1) {
        const prompt = `I found a few possible items to move to ${dueAt}. Which one?`;
        return {
          intent: "work_update_confirmation",
          title: "Move Which Item?",
          prompt,
          actions,
          confidence: 0.6,
          message: formatConfirmationMessage(prompt, actions),
        };
      }
      return {
        intent: "unresolved",
        confidence: 0.35,
        message:
          "I understand this as a due-date change, but I could not safely match one active todo or deadline with a clear date.",
      };
    }

    return {
      intent: "work_update_due_date",
      entityKind: match.entityKind,
      entityId: match.entityId,
      title: match.title,
      dueAt,
      confidence: Math.min(match.score / 100, 0.95),
      message: `Moving ${match.title} to ${dueAt}.`,
    };
  }

  if (isWaitingOnAssignmentRequest(text)) {
    const snapshot = getWorkSnapshot();
    const assignment = analyzeWaitingOnAssignment(text, snapshot);
    if (assignment.ok) {
      return {
        intent: "work_assign_waiting_on",
        todoId: assignment.todo.id,
        todoTitle: assignment.todo.title,
        personId: assignment.person.id,
        personName: assignment.person.name,
        confidence: assignment.confidence,
        message: `Marking ${assignment.todo.title} as waiting on ${assignment.person.name}.`,
      };
    }

    if (assignment.confirmation && assignment.confirmation.actions.length > 1) {
      return {
        intent: "work_update_confirmation",
        title: assignment.confirmation.title,
        prompt: assignment.confirmation.prompt,
        actions: assignment.confirmation.actions,
        confidence: 0.6,
        message: formatWaitingOnAssignmentMessage(
          assignment.confirmation.prompt,
          assignment.confirmation.actions
        ),
      };
    }

    return {
      intent: "unresolved",
      confidence: 0.35,
      message: assignment.reason,
    };
  }

  if (isWaitingOnClearRequest(text)) {
    const snapshot = getWorkSnapshot();
    const match = findBestWaitingOnClear(text, snapshot.people, snapshot.todos);
    if (!match) {
      const confirmation = waitingOnClearConfirmation(text, snapshot.people, snapshot.todos);
      if (confirmation && confirmation.actions.length > 1) {
        const prompt = `I found multiple active todos waiting on ${confirmation.person.name}. Which one should I clear?`;
        return {
          intent: "work_update_confirmation",
          title: "Clear Waiting On Which Todo?",
          prompt,
          actions: confirmation.actions,
          confidence: 0.6,
          message: formatConfirmationMessage(prompt, confirmation.actions),
        };
      }
      return {
        intent: "unresolved",
        confidence: 0.35,
        message:
          "I understand this as a waiting-on update, but I could not safely match exactly one active todo for that person.",
      };
    }

    return {
      intent: "work_clear_waiting_on",
      todoId: match.todo.id,
      todoTitle: match.todo.title,
      personId: match.person.id,
      personName: match.person.name,
      confidence: Math.min(match.score / 100, 0.95),
      message: `Clearing waiting-on ${match.person.name} from ${match.todo.title}.`,
    };
  }

  if (isWorkLookupRequest(text)) {
    return {
      intent: "work_lookup",
      confidence: 0.82,
      message: "Checking the current work graph.",
    };
  }

  if (isDailyReportRequest(text)) {
    return {
      intent: "daily_report",
      confidence: 0.82,
      message: "Opening the daily status report.",
    };
  }

  if (isAppointmentReportRequest(text)) {
    return {
      intent: "appointment_report",
      range: appointmentReportRange(text),
      confidence: 0.82,
      message: "Checking your calendar and opening the appointment report.",
    };
  }

  if (!isFocusQuestion(text)) {
    return {
      intent: "capture",
      confidence: 0.75,
      message: "Route through natural-language capture.",
    };
  }

  const snapshot = getWorkSnapshot();
  const match = findBestEntity(text, snapshot.missions, snapshot.projects);
  if (!match || match.score < 50) {
    return {
      intent: "unresolved",
      confidence: 0.35,
      message: "I understand this as a status question, but I could not match a mission or project.",
    };
  }

  return {
    intent: "focus_report",
    entityKind: match.entityKind,
    entityId: match.entityId,
    title: match.title,
    confidence: Math.min(match.score / 100, 0.95),
    message: `Opening focus report for ${match.title}.`,
  };
};

export const routeAssistantRequest = (request: AssistantRouteRequest): AssistantRouteResult =>
  withSkillReferences(routeAssistantRequestCore(request), request.surface ?? "desktop");
