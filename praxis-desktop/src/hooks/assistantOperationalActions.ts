import type { Dispatch, SetStateAction } from "react";
import type { DailyBrief, DailyBriefItem } from "../../shared/dailyBrief";
import {
  buildBestProactiveSuggestion,
  type ProactiveSuggestion,
} from "../../shared/proactiveSuggestion";
import { buildWorkItemActions } from "../../shared/workLookupContext";
import type { WorkEntityKind, WorkSnapshot, WorkStatus } from "../../shared/workModel";

const statusableKinds = new Set<WorkEntityKind>(["mission", "project", "todo", "deadline"]);

const isStatusableKind = (kind: DailyBriefItem["entityKind"]): kind is WorkEntityKind =>
  statusableKinds.has(kind as WorkEntityKind);

export const storeReportContext = async (
  surface: string,
  snapshot: WorkSnapshot,
  title: string,
  items: DailyBriefItem[]
) => {
  const actions = buildWorkItemActions(
    items.flatMap((item) =>
      isStatusableKind(item.entityKind)
        ? [
            {
              entityKind: item.entityKind,
              entityId: item.id,
              title: item.title,
            },
          ]
        : []
    ),
    snapshot
  );

  if (actions.length > 0) {
    await window.praxis.assistant.storeContext({ surface, title, actions });
  }
};

export const storeProactiveSuggestionContext = async (suggestion: ProactiveSuggestion | null) => {
  if (!suggestion || suggestion.actions.length === 0) {
    return;
  }

  await window.praxis.assistant.storeContext({
    surface: suggestion.surface,
    title: suggestion.title,
    actions: suggestion.actions,
  });
};

type AssistantOperationalActionOptions = {
  snapshot: WorkSnapshot;
  setSnapshot: Dispatch<SetStateAction<WorkSnapshot>>;
  setDailyBrief: Dispatch<SetStateAction<DailyBrief>>;
  setProactiveSuggestion: Dispatch<SetStateAction<ProactiveSuggestion | null>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setCaptureStatus: Dispatch<SetStateAction<string>>;
};

export const createAssistantOperationalActions = ({
  snapshot,
  setSnapshot,
  setDailyBrief,
  setProactiveSuggestion,
  setStatus,
  setCaptureStatus,
}: AssistantOperationalActionOptions) => {
  const refreshOperationalViews = async () => {
    const [nextSnapshot, nextBrief] = await Promise.all([
      window.praxis.work.getSnapshot(),
      window.praxis.brief.getDaily(),
    ]);
    const nextSuggestion = buildBestProactiveSuggestion(nextSnapshot, nextBrief.priorityItems);
    setSnapshot(nextSnapshot);
    setDailyBrief(nextBrief);
    await storeReportContext("daily_report", nextSnapshot, "Daily Brief", nextBrief.priorityItems);
    setProactiveSuggestion(nextSuggestion);
    await storeProactiveSuggestionContext(nextSuggestion);
  };

  const updateStatus = async (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => {
    const nextSnapshot = await window.praxis.work.updateStatus({ entityKind, id, status });
    setSnapshot(nextSnapshot);
    setStatus(`${entityKind} marked ${status}.`);
    const nextBrief = await window.praxis.brief.getDaily();
    const nextSuggestion = buildBestProactiveSuggestion(nextSnapshot, nextBrief.priorityItems);
    setDailyBrief(nextBrief);
    await storeReportContext("daily_report", nextSnapshot, "Daily Brief", nextBrief.priorityItems);
    setProactiveSuggestion(nextSuggestion);
    await storeProactiveSuggestionContext(nextSuggestion);
  };

  const updateDueDate = async (
    entityKind: "todo" | "deadline",
    id: string,
    dueAt: string
  ) => {
    const todo = entityKind === "todo" ? snapshot.todos.find((candidate) => candidate.id === id) : null;
    const deadline =
      entityKind === "deadline"
        ? snapshot.deadlines.find((candidate) => candidate.id === id)
        : null;
    if (entityKind === "todo" && todo) {
      await window.praxis.work.updateRecord({
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
    } else if (entityKind === "deadline" && deadline) {
      await window.praxis.work.updateRecord({
        entityKind,
        id,
        title: deadline.title,
        dueAt,
        priority: deadline.priority,
      });
    } else {
      setCaptureStatus("I matched the update, but the record was no longer available.");
      return;
    }

    await refreshOperationalViews();
    setStatus(`${entityKind} moved to ${dueAt}.`);
  };

  const clearWaitingOn = async (todoId: string, message: string) => {
    const todo = snapshot.todos.find((candidate) => candidate.id === todoId);
    if (!todo) {
      setCaptureStatus("I matched the waiting-on update, but the todo was no longer available.");
      return;
    }

    await window.praxis.work.updateRecord({
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
    await refreshOperationalViews();
    setStatus(message);
  };

  const assignWaitingOn = async (todoId: string, personId: string, message: string) => {
    const todo = snapshot.todos.find((candidate) => candidate.id === todoId);
    if (!todo) {
      setCaptureStatus("I matched the waiting-on assignment, but the todo was no longer available.");
      return;
    }

    await window.praxis.work.updateRecord({
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
    await refreshOperationalViews();
    setStatus(message);
  };

  return {
    refreshOperationalViews,
    updateStatus,
    updateDueDate,
    clearWaitingOn,
    assignWaitingOn,
  };
};
