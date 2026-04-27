import type {
  AssistantContextAction,
  ResolveAssistantContextResult,
} from "./assistantContext";

export type ResolveAssistantContextActionsInput = {
  surface: string;
  text: string;
  actions: AssistantContextAction[];
};

export type ResolveAssistantContextActionsResult =
  | ResolveAssistantContextResult
  | {
      ok: false;
      declined: true;
      reason: string;
    };

const ordinalFromText = (text: string) => {
  const normalized = text.toLowerCase();
  const numeric = normalized.match(/\b(\d{1,2})\b/);
  if (numeric) {
    return Number(numeric[1]);
  }

  const ordinals: Array<[RegExp, number]> = [
    [/\b(first|top)\b/, 1],
    [/\bsecond\b/, 2],
    [/\bthird\b/, 3],
    [/\bfourth\b/, 4],
    [/\bfifth\b/, 5],
  ];
  return ordinals.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
};

const isCompleteRequest = (text: string) =>
  /\b(complete|completed|done|mark done|mark it done|finish|finished)\b/i.test(text);

const isPauseRequest = (text: string) =>
  /\b(pause|hold|put it on hold|park it)\b/i.test(text);

const isReactivateRequest = (text: string) =>
  /\b(reactivate|resume|unpause|reopen|make it active|start it again)\b/i.test(text);

const isAffirmative = (text: string) =>
  /^(yes|y|yeah|yep|sure|ok|okay|do it|go ahead|sounds good|please do)$/i.test(text.trim());

const isDecline = (text: string) =>
  /^(no|n|nope|not now|stop|cancel|never mind)$/i.test(text.trim());

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const findReferencedAction = (text: string, actions: AssistantContextAction[]) => {
  const normalizedText = normalize(text);
  return (
    actions.find((action) => {
      const title = normalize(action.title);
      return title.length > 3 && normalizedText.includes(title);
    }) ?? null
  );
};

const requestedCommand = (text: string) => {
  if (isReactivateRequest(text)) {
    return "reactivate" as const;
  }
  if (isPauseRequest(text)) {
    return "pause" as const;
  }
  if (isCompleteRequest(text)) {
    return "complete" as const;
  }
  if (
    /\b(open|show|pull up|bring up)\b/i.test(text) &&
    /\b(focus report|project focus|mission focus|related project)\b/i.test(text)
  ) {
    return "open_focus_report" as const;
  }
  if (
    /\b(move|reschedule|shift|change|set|push|make)\b/i.test(text) &&
    /\b(due|deadline|to|for|on|by)\b/i.test(text)
  ) {
    return "update_due_date" as const;
  }
  if (/\b(move|reschedule|shift|change|set|push)\b/i.test(text)) {
    return "update_due_date" as const;
  }
  if (
    /\b(clear|remove|not waiting|no longer waiting|got it|received|came through)\b/i.test(text)
  ) {
    return "clear_waiting_on" as const;
  }
  if (/\b(waiting on|waiting for|wait on)\b/i.test(text)) {
    return "assign_waiting_on" as const;
  }
  return null;
};

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
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;

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

const parseDueDate = (text: string, now = new Date()) => {
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

const actionMessage = (action: AssistantContextAction) => {
  if (action.command === "reactivate") {
    return `Resolved follow-up to reactivate ${action.title}.`;
  }
  if (action.command === "pause") {
    return `Resolved follow-up to pause ${action.title}.`;
  }
  if (action.command === "open_focus_report") {
    return `Resolved follow-up to open the focus report for ${action.title}.`;
  }
  if (action.command === "update_due_date") {
    return `Resolved follow-up to move ${action.title}.`;
  }
  if (action.command === "clear_waiting_on") {
    return `Resolved follow-up to clear waiting-on for ${action.title}.`;
  }
  if (action.command === "assign_waiting_on") {
    return `Resolved follow-up to assign waiting-on for ${action.title}.`;
  }
  return `Resolved follow-up to complete ${action.title}.`;
};

export const resolveAssistantContextActionSelection = (
  actions: AssistantContextAction[],
  selectedActionId: string | null | undefined
): ResolveAssistantContextResult => {
  const normalizedActionId = selectedActionId?.trim();
  if (!normalizedActionId) {
    return {
      ok: false,
      reason: "Choose one of the available action ids before confirming.",
    };
  }

  const action = actions.find((candidate) => candidate.actionId === normalizedActionId);
  if (!action) {
    return {
      ok: false,
      reason: "That action id is no longer available. Ask Praxis to generate the choices again.",
    };
  }

  return {
    ok: true,
    action,
    message: actionMessage(action),
  };
};

export const resolveAssistantContextActions = ({
  surface,
  text,
  actions,
}: ResolveAssistantContextActionsInput): ResolveAssistantContextActionsResult => {
  const isProactiveSuggestion = surface === "proactive_suggestion";
  const isWorkUpdateConfirmation = surface === "work_update_confirmation";
  const isWorkLookup = surface === "work_lookup";
  const isReportContext = surface === "daily_report" || surface === "focus_report";
  const ordinal = ordinalFromText(text);
  const command = requestedCommand(text);

  if (isDecline(text) && (isProactiveSuggestion || isReportContext || isWorkUpdateConfirmation)) {
    return {
      ok: false,
      declined: true,
      reason: "Okay. I will leave it alone.",
    };
  }

  const ordinalAction = ordinal
    ? actions.find((candidate) => {
        if (candidate.ordinal !== ordinal) {
          return false;
        }
        if (command) {
          return candidate.command === command;
        }
        return isWorkUpdateConfirmation ? true : candidate.command === "complete";
      })
    : null;
  const referencedAction = findReferencedAction(
    text,
    actions.filter((candidate) => !command || candidate.command === command)
  );
  const action = ordinalAction ?? referencedAction;

  if (!action && isAffirmative(text) && (isProactiveSuggestion || isWorkUpdateConfirmation)) {
    if (actions.length === 1) {
      const [singleAction] = actions;
      return {
        ok: true,
        action: singleAction,
        message: actionMessage(singleAction),
      };
    }

    return {
      ok: false,
      reason: "I have a few options. Reply with a number so I pick the right one.",
    };
  }

  if (!action && isCompleteRequest(text) && actions.length === 1) {
    const [singleAction] = actions;
    return {
      ok: true,
      action: singleAction,
      message: actionMessage(singleAction),
    };
  }

  if (!action && command) {
    const matchingActions = actions.filter((candidate) => candidate.command === command);
    if (matchingActions.length === 1) {
      const [singleAction] = matchingActions;
      const resolvedSingleAction =
        singleAction.command === "update_due_date" && !singleAction.dueAt
          ? {
              ...singleAction,
              dueAt: parseDueDate(text) ?? undefined,
            }
          : singleAction;

      if (resolvedSingleAction.command === "update_due_date" && !resolvedSingleAction.dueAt) {
        return {
          ok: false,
          reason: "I need a clear date for that move, for example `move that to tomorrow`.",
        };
      }

      return {
        ok: true,
        action: resolvedSingleAction,
        message: actionMessage(resolvedSingleAction),
      };
    }
  }

  if (!action && command && isWorkLookup) {
    return {
      ok: false,
      reason:
        command === "update_due_date"
          ? "Say which lookup item to move, for example `move the first one to tomorrow`."
          : command === "open_focus_report"
            ? "Say which lookup item to open, for example `open the focus report for the first one`."
            : "Say which lookup item to change, for example `pause the first one` or `mark the first one done`.",
    };
  }

  if (!action) {
    return {
      ok: false,
      reason:
        isProactiveSuggestion || isWorkUpdateConfirmation
          ? "I could not safely map that reply. Reply with a number or the specific item title."
          : isWorkLookup
            ? "Say which lookup item to change, for example `mark the first one done`."
            : "Say which report item to complete, for example `mark the first one done`.",
    };
  }

  const resolvedAction =
    action.command === "update_due_date" && !action.dueAt
      ? {
          ...action,
          dueAt: parseDueDate(text) ?? undefined,
        }
      : action;

  if (resolvedAction.command === "update_due_date" && !resolvedAction.dueAt) {
    return {
      ok: false,
      reason: "I need a clear date for that move, for example `move the first one to tomorrow`.",
    };
  }

  return {
    ok: true,
    action: resolvedAction,
    message: actionMessage(resolvedAction),
  };
};
