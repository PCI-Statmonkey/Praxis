import type {
  AssistantContextAction,
  AssistantContextActionCommand,
} from "../shared/assistantContext";
import {
  resolveAssistantContextActionSelection,
} from "../shared/assistantContextResolver";
import type {
  CompanionCommandRequest,
  CompanionCommandResult,
} from "../shared/companionCommand";
import type { CaptureResult, SaveCaptureCandidateRequest } from "../shared/naturalLanguageCapture";
import { generateAppointmentReport } from "./appointmentReport";
import { generateDailyBrief, generateFocusReport } from "./dailyBrief";
import { getCompanionSnapshot } from "./companionSnapshot";
import { captureNaturalLanguage, saveCaptureCandidate } from "./naturalLanguageCapture";
import { lookupPerson } from "./personLookup";
import { routeAssistantRequest } from "./assistantRouter";
import { lookupWork } from "./workLookup";
import { getWorkSnapshot, updateWorkRecord, updateWorkStatus } from "./workRepository";

type CompanionCommandIntent = NonNullable<CompanionCommandResult["intent"]>;

const trimmedText = (request: CompanionCommandRequest) => request.text.trim();

const confirmation = (reason: string, confirmText: string) => ({
  required: true as const,
  reason,
  confirmText,
});

const commandRequiresConfirmation = (
  intent: CompanionCommandIntent,
  message: string,
  route?: CompanionCommandResult["route"]
): CompanionCommandResult => ({
  ok: false,
  status: "requires_confirmation",
  mode: "write",
  intent,
  message,
  route,
  confirmation: confirmation(
    "Companion write actions require explicit confirmation before Praxis changes local state.",
    route?.intent === "work_update_confirmation"
      ? "Repeat the same command with confirmed: true and the selectedActionId from the chosen action."
      : "Repeat the same command with confirmed: true."
  ),
});

const statusForCommand = (command: AssistantContextActionCommand) => {
  if (command === "complete") {
    return "completed" as const;
  }
  if (command === "pause") {
    return "paused" as const;
  }
  if (command === "reactivate") {
    return "active" as const;
  }
  return null;
};

const updateDueDate = (
  entityKind: "todo" | "deadline",
  id: string,
  dueAt: string
): CompanionCommandResult => {
  const snapshot = getWorkSnapshot();
  const todo = entityKind === "todo" ? snapshot.todos.find((candidate) => candidate.id === id) : null;
  const deadline =
    entityKind === "deadline"
      ? snapshot.deadlines.find((candidate) => candidate.id === id)
      : null;

  if (entityKind === "todo" && todo) {
    updateWorkRecord({
      entityKind,
      id,
      title: todo.title,
      projectId: todo.projectId ?? "",
      priority: todo.priority,
      dueAt,
      moneyRelated: todo.moneyRelated,
      quickAction: todo.quickAction,
      estimatedMinutes: todo.estimatedMinutes ?? undefined,
      waitingOnPersonId: todo.waitingOnPersonId ?? "",
      notes: todo.notes ?? "",
    });
    return {
      ok: true,
      status: "executed",
      mode: "write",
      intent: "work_update_due_date",
      message: `${todo.title} moved to ${dueAt}.`,
      snapshot: getCompanionSnapshot(),
    };
  }

  if (entityKind === "deadline" && deadline) {
    updateWorkRecord({
      entityKind,
      id,
      title: deadline.title,
      dueAt,
      priority: deadline.priority,
    });
    return {
      ok: true,
      status: "executed",
      mode: "write",
      intent: "work_update_due_date",
      message: `${deadline.title} moved to ${dueAt}.`,
      snapshot: getCompanionSnapshot(),
    };
  }

  return {
    ok: false,
    status: "rejected",
    mode: "write",
    intent: "work_update_due_date",
    message: "Praxis matched the due-date update, but the record was no longer available.",
  };
};

const clearWaitingOn = (todoId: string, message: string): CompanionCommandResult => {
  const snapshot = getWorkSnapshot();
  const todo = snapshot.todos.find((candidate) => candidate.id === todoId);
  if (!todo) {
    return {
      ok: false,
      status: "rejected",
      mode: "write",
      intent: "work_clear_waiting_on",
      message: "Praxis matched the waiting-on update, but the todo was no longer available.",
    };
  }

  updateWorkRecord({
    entityKind: "todo",
    id: todo.id,
    title: todo.title,
    projectId: todo.projectId ?? "",
    priority: todo.priority,
    dueAt: todo.dueAt ?? "",
    moneyRelated: todo.moneyRelated,
    quickAction: todo.quickAction,
    estimatedMinutes: todo.estimatedMinutes ?? undefined,
    waitingOnPersonId: "",
    notes: todo.notes ?? "",
  });

  return {
    ok: true,
    status: "executed",
    mode: "write",
    intent: "work_clear_waiting_on",
    message,
    snapshot: getCompanionSnapshot(),
  };
};

const assignWaitingOn = (
  todoId: string,
  personId: string,
  message: string
): CompanionCommandResult => {
  const snapshot = getWorkSnapshot();
  const todo = snapshot.todos.find((candidate) => candidate.id === todoId);
  if (!todo) {
    return {
      ok: false,
      status: "rejected",
      mode: "write",
      intent: "work_assign_waiting_on",
      message: "Praxis matched the waiting-on assignment, but the todo was no longer available.",
    };
  }

  updateWorkRecord({
    entityKind: "todo",
    id: todo.id,
    title: todo.title,
    projectId: todo.projectId ?? "",
    priority: todo.priority,
    dueAt: todo.dueAt ?? "",
    moneyRelated: todo.moneyRelated,
    quickAction: todo.quickAction,
    estimatedMinutes: todo.estimatedMinutes ?? undefined,
    waitingOnPersonId: personId,
    notes: todo.notes ?? "",
  });

  return {
    ok: true,
    status: "executed",
    mode: "write",
    intent: "work_assign_waiting_on",
    message,
    snapshot: getCompanionSnapshot(),
  };
};

const executeSelectedWorkAction = (
  action: AssistantContextAction,
  message: string,
  route: NonNullable<CompanionCommandResult["route"]>
): CompanionCommandResult => {
  const status = statusForCommand(action.command);
  if (status) {
    if (
      action.entityKind !== "mission" &&
      action.entityKind !== "project" &&
      action.entityKind !== "todo" &&
      action.entityKind !== "deadline"
    ) {
      return {
        ok: false,
        status: "rejected",
        mode: "write",
      intent: route.intent,
        message: "Praxis matched the action, but that record type cannot be status-updated.",
        route,
      };
    }

    updateWorkStatus({
      entityKind: action.entityKind,
      id: action.entityId,
      status,
    });
    return {
      ok: true,
      status: "executed",
      mode: "write",
      intent: route.intent,
      message,
      route,
      snapshot: getCompanionSnapshot(),
    };
  }

  if (
    action.command === "update_due_date" &&
    action.dueAt &&
    (action.entityKind === "todo" || action.entityKind === "deadline")
  ) {
    const result = updateDueDate(action.entityKind, action.entityId, action.dueAt);
    return { ...result, intent: route.intent, message, route };
  }

  if (action.command === "clear_waiting_on" && action.entityKind === "todo") {
    const result = clearWaitingOn(action.entityId, message);
    return { ...result, intent: route.intent, route };
  }

  if (
    action.command === "assign_waiting_on" &&
    action.entityKind === "todo" &&
    action.personId
  ) {
    const result = assignWaitingOn(action.entityId, action.personId, message);
    return { ...result, intent: route.intent, route };
  }

  return {
    ok: false,
    status: "rejected",
    mode: "write",
    intent: route.intent,
    message: "Praxis matched the selected action, but companion cannot execute that command yet.",
    route,
  };
};

const draftFromCapture = (preview: CaptureResult): SaveCaptureCandidateRequest | null => {
  if (!preview || preview.candidate.intent === "unresolved") {
    return null;
  }
  if (preview.candidate.intent === "appointment") {
    return {
      intent: "appointment",
      originalText: preview.originalText,
      input: preview.candidate.input,
    };
  }
  if (preview.candidate.intent === "mission") {
    return {
      intent: "mission",
      originalText: preview.originalText,
      input: preview.candidate.input,
    };
  }
  return {
    intent: "todo",
    originalText: preview.originalText,
    input: preview.candidate.input,
  };
};

export const executeCompanionCommand = (
  request: CompanionCommandRequest
): CompanionCommandResult => {
  const text = trimmedText(request);
  if (!text) {
    return {
      ok: false,
      status: "unresolved",
      mode: "read",
      message: "Companion command text is required.",
    };
  }

  const route = routeAssistantRequest({ text, surface: "companion" });

  if (route.intent === "daily_report") {
    const brief = generateDailyBrief();
    return {
      ok: true,
      status: "answered",
      mode: "read",
      intent: route.intent,
      message: brief.spokenBrief,
      route,
      data: brief,
    };
  }

  if (route.intent === "appointment_report") {
    const report = generateAppointmentReport({ range: route.range });
    return {
      ok: true,
      status: "answered",
      mode: "read",
      intent: route.intent,
      message: report.spokenSummary,
      route,
      data: report,
    };
  }

  if (route.intent === "focus_report") {
    const report = generateFocusReport(route.entityKind, route.entityId);
    if (!report) {
      return {
        ok: false,
        status: "unresolved",
        mode: "read",
        intent: route.intent,
        message: "Praxis matched the focus report, but it is no longer available.",
        route,
      };
    }
    return {
      ok: true,
      status: "answered",
      mode: "read",
      intent: route.intent,
      message: report.summary,
      route,
      data: report,
    };
  }

  if (route.intent === "person_lookup") {
    const lookup = lookupPerson({ text });
    if (!lookup.ok) {
      return {
        ok: false,
        status: "unresolved",
        mode: "read",
        intent: route.intent,
        message: lookup.reason,
        route,
      };
    }
    return {
      ok: true,
      status: "answered",
      mode: "read",
      intent: route.intent,
      message: lookup.message,
      route,
      data: lookup,
    };
  }

  if (route.intent === "work_lookup") {
    const lookup = lookupWork({ text });
    if (!lookup.ok) {
      return {
        ok: false,
        status: "unresolved",
        mode: "read",
        intent: route.intent,
        message: lookup.reason,
        route,
      };
    }
    return {
      ok: true,
      status: "answered",
      mode: "read",
      intent: route.intent,
      message: lookup.message,
      route,
      data: lookup,
    };
  }

  if (route.intent === "conversation_review") {
    return {
      ok: true,
      status: "answered",
      mode: "read",
      intent: route.intent,
      message: route.message,
      route,
    };
  }

  if (route.intent === "work_update_status") {
    if (!request.confirmed) {
      return commandRequiresConfirmation(route.intent, route.message, route);
    }
    updateWorkStatus({
      entityKind: route.entityKind,
      id: route.entityId,
      status: route.status,
    });
    return {
      ok: true,
      status: "executed",
      mode: "write",
      intent: route.intent,
      message: route.message,
      route,
      snapshot: getCompanionSnapshot(),
    };
  }

  if (route.intent === "work_update_due_date") {
    if (!request.confirmed) {
      return commandRequiresConfirmation(route.intent, route.message, route);
    }
    const result = updateDueDate(route.entityKind, route.entityId, route.dueAt);
    return { ...result, route };
  }

  if (route.intent === "work_clear_waiting_on") {
    if (!request.confirmed) {
      return commandRequiresConfirmation(route.intent, route.message, route);
    }
    const result = clearWaitingOn(route.todoId, route.message);
    return { ...result, route };
  }

  if (route.intent === "work_assign_waiting_on") {
    if (!request.confirmed) {
      return commandRequiresConfirmation(route.intent, route.message, route);
    }
    const result = assignWaitingOn(route.todoId, route.personId, route.message);
    return { ...result, route };
  }

  if (route.intent === "capture") {
    const preview = captureNaturalLanguage({
      text,
      mode: "preview",
      forcedIntent: request.forcedIntent,
    });
    if (
      preview.candidate.intent !== "unresolved" &&
      preview.candidate.requiresConfirmation &&
      preview.candidate.confirmationOptions?.length &&
      !request.forcedIntent
    ) {
      const options = preview.candidate.confirmationOptions.join(" or ");
      return {
        ok: false,
        status: "requires_confirmation",
        mode: "write",
        intent: "capture",
        message: preview.message,
        route,
        confirmation: confirmation(
          "Companion capture needs an explicit type before saving this ambiguous command.",
          `Repeat the same command with forcedIntent set to ${options}, then confirm the resulting draft.`
        ),
        preview,
      };
    }
    const draft = draftFromCapture(preview);
    if (!draft) {
      return {
        ok: false,
        status: "unresolved",
        mode: "write",
        intent: "capture",
        message: preview.message,
        route,
        preview,
      };
    }
    if (!request.confirmed) {
      return {
        ok: false,
        status: "requires_confirmation",
        mode: "write",
        intent: "capture",
        message: preview.message,
        route,
        confirmation: confirmation(
          "Companion capture creates a local mission, todo, or appointment only after explicit confirmation.",
          "Repeat the same command with confirmed: true."
        ),
        preview,
      };
    }
    const saved = saveCaptureCandidate(draft);
    return {
      ok: true,
      status: "executed",
      mode: "write",
      intent: "capture",
      message: saved.message,
      route,
      snapshot: getCompanionSnapshot(),
    };
  }

  if (route.intent === "work_update_confirmation") {
    if (!request.confirmed) {
      return commandRequiresConfirmation(route.intent, route.message, route);
    }

    const selected = resolveAssistantContextActionSelection(
      route.actions,
      request.selectedActionId
    );
    if (!selected.ok) {
      return {
        ok: false,
        status: "rejected",
        mode: "write",
        intent: route.intent,
        message: selected.reason,
        route,
      };
    }

    return executeSelectedWorkAction(selected.action, selected.message, route);
  }

  if (route.intent === "context_action") {
    return {
      ok: false,
      status: "unsupported",
      mode: "write",
      intent: route.intent,
      message:
        "Companion commands must name the target explicitly. Context-only replies stay on the surface that created the context.",
      route,
    };
  }

  return {
    ok: false,
    status: route.intent === "unresolved" ? "unresolved" : "unsupported",
    mode: "read",
    intent: route.intent,
    message: route.message,
    route,
  };
};
