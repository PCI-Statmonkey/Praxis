import type {
  CaptureCandidate,
  CaptureRequest,
  CaptureResult,
  SaveCaptureCandidateRequest,
} from "../shared/naturalLanguageCapture";
import type { PersonRecord, ProjectRecord, WorkPriority, WorkSnapshot } from "../shared/workModel";
import {
  createAppointment,
  createMission,
  createTodo,
  getWorkSnapshot,
} from "./workRepository";

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

const removeNoise = (text: string) =>
  text
    .replace(/\b(remind me to|remember to|i need to|need to|todo|task)\b/gi, "")
    .replace(/\b(waiting on|wait on|waiting for|from)\b/gi, "")
    .replace(/\b(is due|due by|due on|due|deadline for|deadline)\b/gi, "")
    .replace(/\b(appointment|meeting|call)\b/gi, (match) => match)
    .replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi, "")
    .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "")
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\b/gi, "")
    .replace(/\b(on|by|at|for)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const titleCase = (text: string) =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));

const isMoneyRelated = (text: string) =>
  /\b(invoice|bill|payment|paid|pay|quote|proposal|contract|billing)\b/i.test(text);

const priorityFromText = (text: string): WorkPriority => {
  if (/\b(critical|urgent|asap|immediately)\b/i.test(text)) {
    return "critical";
  }
  if (/\b(important|high priority)\b/i.test(text)) {
    return "high";
  }
  return "normal";
};

const estimateMinutesFromText = (text: string) => {
  const explicit = text.match(/\b(\d{1,3})\s*(?:min|mins|minutes)\b/i);
  if (explicit) {
    return Number(explicit[1]);
  }
  if (/\b(quick|knock out|fast|small)\b/i.test(text)) {
    return 10;
  }
  if (/\b(call|text|email|send|pay)\b/i.test(text)) {
    return 15;
  }
  if (/\b(review|outline|draft)\b/i.test(text)) {
    return 30;
  }
  return null;
};

const isQuickAction = (text: string) => {
  const estimate = estimateMinutesFromText(text);
  return estimate !== null && estimate <= 30;
};

const isAppointmentLike = (text: string) =>
  /\b(appointment|meeting|doctor|dentist|calendar)\b/i.test(text);

const isTodoLike = (text: string) =>
  /\b(remind me to|remember to|i need to|need to|todo|task|due|deadline|send|finish|write|fix|call)\b/i.test(
    text
  );

const isMissionLike = (text: string) =>
  /\b(create|start|add|make|open|set up|setup|capture|new)\b.{0,30}\bmission\b/i.test(text) ||
  /\bmission\s+(?:called|named|for|about)\b/i.test(text);

const isCallLike = (text: string) => /\bcall\b/i.test(text);

const isAmbiguousCall = (text: string) =>
  isCallLike(text) && !/\b(appointment|meeting|calendar)\b/i.test(text);

const searchableWords = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((word) => word.length >= 4);

const scoreProjectMatch = (text: string, project: ProjectRecord) => {
  const normalizedText = text.toLowerCase();
  const normalizedTitle = project.title.toLowerCase();
  if (normalizedText.includes(normalizedTitle)) {
    return 100;
  }

  const words = searchableWords(project.title);
  if (words.length === 0) {
    return 0;
  }

  const matched = words.filter((word) => normalizedText.includes(word)).length;
  return matched >= 2 || matched === words.length ? matched * 20 : 0;
};

const scorePersonMatch = (text: string, person: PersonRecord) => {
  const normalizedText = text.toLowerCase();
  const candidates = [person.name, ...person.aliases];
  if (candidates.some((candidate) => normalizedText.includes(candidate.toLowerCase()))) {
    return 100;
  }

  const nameWords = candidates.flatMap(searchableWords);
  if (nameWords.length === 0) {
    return 0;
  }

  const matched = nameWords.filter((word) => normalizedText.includes(word)).length;
  return matched > 0 ? matched * 45 : 0;
};

const findBestPersonMatch = (text: string, snapshot: WorkSnapshot) => {
  const matches = snapshot.people
    .map((person) => ({
      person,
      score: scorePersonMatch(text, person),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0 || (matches[1] && matches[1].score === matches[0].score)) {
    return null;
  }

  return matches[0].person;
};

const findBestProjectMatch = (text: string, snapshot: WorkSnapshot) => {
  const matches = snapshot.projects
    .filter((project) => project.status !== "completed")
    .map((project) => ({
      project,
      score: scoreProjectMatch(text, project),
    }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0 || (matches[1] && matches[1].score === matches[0].score)) {
    return null;
  }

  return matches[0].project;
};

const findMentionedMission = (text: string, snapshot: WorkSnapshot) => {
  const normalizedText = text.toLowerCase();
  return (
    snapshot.missions.find(
      (mission) =>
        mission.status !== "completed" && normalizedText.includes(mission.title.toLowerCase())
    ) ?? null
  );
};

const buildTodoInput = (text: string, title: string, dateTime: string, snapshot: WorkSnapshot) => {
  const matchedMission = findMentionedMission(text, snapshot);
  const matchedPerson = findBestPersonMatch(text, snapshot);
  const matchedProject =
    findBestProjectMatch(text, snapshot) ??
    (() => {
      if (!matchedMission) {
        return null;
      }
      const missionProjects = snapshot.projects.filter(
        (project) => project.status !== "completed" && project.missionId === matchedMission.id
      );
      return missionProjects.length === 1 ? missionProjects[0] : null;
    })();
  const estimatedMinutes = estimateMinutesFromText(text);
  return {
    input: {
      title,
      dueAt: dateTime,
      priority: priorityFromText(text),
      moneyRelated: isMoneyRelated(text),
      quickAction: isQuickAction(text),
      estimatedMinutes: estimatedMinutes ?? undefined,
      waitingOnPersonId: matchedPerson?.id,
      notes: text,
      projectId: matchedProject?.id,
    },
    matchedProject,
    matchedMission,
    matchedPerson,
  };
};

const cleanMissionTitle = (text: string) =>
  titleCase(
    text
      .replace(
        /\b(?:create|start|add|make|open|set up|setup|capture)\s+(?:a\s+|an\s+|new\s+)?mission(?:\s+(?:called|named|for|about))?\b/gi,
        ""
      )
      .replace(/\bnew\s+mission\b/gi, "")
      .replace(/\bmission\s+(?:called|named|for|about)\b/gi, "")
      .replace(/\b(today|tomorrow|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "")
      .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/gi, "")
      .replace(/\b(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, "")
      .replace(/\bat\s+\d{1,2}(?::\d{2})?\b/gi, "")
      .replace(/\b(is due|due by|due on|due|deadline for|deadline|by|on|at|for)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  );

export const analyzeNaturalLanguageCapture = (request: CaptureRequest): CaptureCandidate => {
  const text = request.text.trim();
  const snapshot = getWorkSnapshot();
  if (!text) {
    return {
      intent: "unresolved",
      confidence: 0,
      reason: "No text was provided.",
    };
  }

  if (request.forcedIntent === "mission" || isMissionLike(text)) {
    const dueAt = parseDate(text) ?? undefined;
    const title = cleanMissionTitle(text);
    if (!title) {
      return {
        intent: "unresolved",
        confidence: 0.25,
        reason: "I understood this as a mission, but I could not find a clear mission title.",
      };
    }

    return {
      intent: "mission",
      confidence: request.forcedIntent === "mission" ? 0.95 : 0.84,
      reason:
        request.forcedIntent === "mission"
          ? "Confirmed as a mission."
          : "Detected a mission creation phrase.",
      input: {
        title,
        summary: text,
        dueAt,
      },
    };
  }

  const dateTime = parseDate(text);
  if (!dateTime) {
    return {
      intent: "unresolved",
      confidence: 0.2,
      reason: "I could not find a date or day to attach to this.",
    };
  }

  const title = titleCase(removeNoise(text));
  if (!title) {
    return {
      intent: "unresolved",
      confidence: 0.25,
      reason: "I found a date, but not a clear title.",
    };
  }

  if (request.forcedIntent === "appointment" || (!request.forcedIntent && isAppointmentLike(text))) {
    return {
      intent: "appointment",
      confidence: request.forcedIntent === "appointment" ? 0.95 : 0.86,
      reason:
        request.forcedIntent === "appointment"
          ? "Confirmed as an appointment."
          : "Detected an appointment-like phrase with a date or time.",
      input: {
        title,
        startsAt: dateTime,
        sourceSystem: "natural_language",
        notes: text,
      },
    };
  }

  if (request.forcedIntent === "todo" || isTodoLike(text)) {
    const todo = buildTodoInput(text, title, dateTime, snapshot);
    const ambiguous = request.mode !== "confirm" && isAmbiguousCall(text);
    return {
      intent: "todo",
      confidence: ambiguous ? 0.58 : request.forcedIntent === "todo" ? 0.95 : 0.82,
      reason: ambiguous
        ? "This looks like a call, but it could be either a todo or an appointment."
        : request.forcedIntent === "todo"
          ? "Confirmed as a todo."
          : todo.matchedProject
            ? `Detected a dated task and matched it to project ${todo.matchedProject.title}.`
            : todo.matchedPerson
              ? `Detected a dated task and matched it to ${todo.matchedPerson.name}.`
            : "Detected a task or due-date phrase with a date.",
      requiresConfirmation: ambiguous,
      confirmationOptions: ambiguous ? ["todo", "appointment"] : undefined,
      input: todo.input,
      matchedProjectId: todo.matchedProject?.id,
      matchedProjectTitle: todo.matchedProject?.title,
      matchedMissionId: todo.matchedMission?.id,
      matchedMissionTitle: todo.matchedMission?.title,
      matchedPersonId: todo.matchedPerson?.id,
      matchedPersonName: todo.matchedPerson?.name,
    };
  }

  return {
    intent: "unresolved",
    confidence: 0.35,
    reason: "I found a date, but the intent was not clear enough to create a record.",
  };
};

export const captureNaturalLanguage = (request: CaptureRequest): CaptureResult => {
  const candidate = analyzeNaturalLanguageCapture(request);

  if (candidate.intent !== "unresolved" && request.mode === "preview") {
    return {
      ok: false,
      originalText: request.text,
      candidate,
      message: candidate.requiresConfirmation
        ? `${candidate.reason} Review and choose how to save it.`
        : `Review parsed ${candidate.intent} before saving.`,
    };
  }

  if (candidate.intent !== "unresolved" && candidate.requiresConfirmation && request.mode !== "confirm") {
    return {
      ok: false,
      originalText: request.text,
      candidate,
      message: `${candidate.reason} Confirm whether to create a todo or an appointment.`,
    };
  }

  if (candidate.intent === "appointment") {
    const createdRecord = createAppointment(candidate.input);
    return {
      ok: true,
      originalText: request.text,
      candidate,
      createdRecord,
      snapshot: getWorkSnapshot(),
      message: `Captured appointment: ${createdRecord.title}.`,
    };
  }

  if (candidate.intent === "todo") {
    const createdRecord = createTodo(candidate.input);
    return {
      ok: true,
      originalText: request.text,
      candidate,
      createdRecord,
      snapshot: getWorkSnapshot(),
      message: candidate.matchedProjectTitle
        ? `Captured todo under ${candidate.matchedProjectTitle}: ${createdRecord.title}.`
        : `Captured todo: ${createdRecord.title}.`,
    };
  }

  if (candidate.intent === "mission") {
    const createdRecord = createMission(candidate.input);
    return {
      ok: true,
      originalText: request.text,
      candidate,
      createdRecord,
      snapshot: getWorkSnapshot(),
      message: `Captured mission: ${createdRecord.title}.`,
    };
  }

  return {
    ok: false,
    originalText: request.text,
    candidate,
    message: candidate.reason,
  };
};

export const saveCaptureCandidate = (request: SaveCaptureCandidateRequest): CaptureResult => {
  if (request.intent === "appointment") {
    const createdRecord = createAppointment(request.input);
    return {
      ok: true,
      originalText: request.originalText ?? request.input.notes ?? request.input.title,
      candidate: {
        intent: "appointment",
        confidence: 1,
        reason: "Saved from reviewed capture draft.",
        input: request.input,
      },
      createdRecord,
      snapshot: getWorkSnapshot(),
      message: `Captured appointment: ${createdRecord.title}.`,
    };
  }

  if (request.intent === "mission") {
    const createdRecord = createMission(request.input);
    return {
      ok: true,
      originalText: request.originalText ?? request.input.summary ?? request.input.title,
      candidate: {
        intent: "mission",
        confidence: 1,
        reason: "Saved from reviewed capture draft.",
        input: request.input,
      },
      createdRecord,
      snapshot: getWorkSnapshot(),
      message: `Captured mission: ${createdRecord.title}.`,
    };
  }

  const createdRecord = createTodo(request.input);
  return {
    ok: true,
    originalText: request.originalText ?? request.input.notes ?? request.input.title,
    candidate: {
      intent: "todo",
      confidence: 1,
      reason: "Saved from reviewed capture draft.",
      input: request.input,
    },
    createdRecord,
    snapshot: getWorkSnapshot(),
    message: `Captured todo: ${createdRecord.title}.`,
  };
};
