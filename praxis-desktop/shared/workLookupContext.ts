import type { AssistantContextAction } from "./assistantContext";
import type { WorkLookupResult } from "./workLookup";
import type { WorkEntityKind, WorkSnapshot, WorkStatus } from "./workModel";

const statusableKinds = new Set<WorkEntityKind>(["mission", "project", "todo", "deadline"]);

export type WorkActionSource = {
  entityKind: WorkEntityKind;
  entityId: string;
  title: string;
};

const entityStatus = (
  snapshot: WorkSnapshot,
  entityKind: WorkEntityKind,
  entityId: string
): WorkStatus | null => {
  if (entityKind === "mission") {
    return snapshot.missions.find((candidate) => candidate.id === entityId)?.status ?? null;
  }
  if (entityKind === "project") {
    return snapshot.projects.find((candidate) => candidate.id === entityId)?.status ?? null;
  }
  if (entityKind === "todo") {
    return snapshot.todos.find((candidate) => candidate.id === entityId)?.status ?? null;
  }
  return snapshot.deadlines.find((candidate) => candidate.id === entityId)?.status ?? null;
};

export const buildWorkItemActions = (
  items: WorkActionSource[],
  snapshot: WorkSnapshot
): AssistantContextAction[] =>
  items.flatMap((item, index) => {
    const ordinal = index + 1;
    const actions: AssistantContextAction[] = [];
    const status = statusableKinds.has(item.entityKind)
      ? entityStatus(snapshot, item.entityKind, item.entityId)
      : null;

    if (
      status !== null &&
      status !== "completed" &&
      (item.entityKind === "mission" ||
        item.entityKind === "project" ||
        item.entityKind === "todo" ||
        item.entityKind === "deadline")
    ) {
      actions.push({
        actionId: `${item.entityKind}:${item.entityId}:complete:${ordinal}`,
        ordinal,
        title: item.title,
        entityKind: item.entityKind,
        entityId: item.entityId,
        command: "complete",
      });
    }

    if (
      status === "active" &&
      (item.entityKind === "mission" ||
        item.entityKind === "project" ||
        item.entityKind === "todo" ||
        item.entityKind === "deadline")
    ) {
      actions.push({
        actionId: `${item.entityKind}:${item.entityId}:pause:${ordinal}`,
        ordinal,
        title: item.title,
        entityKind: item.entityKind,
        entityId: item.entityId,
        command: "pause",
      });
    }

    if (
      status !== null &&
      status !== "active" &&
      (item.entityKind === "mission" ||
        item.entityKind === "project" ||
        item.entityKind === "todo" ||
        item.entityKind === "deadline")
    ) {
      actions.push({
        actionId: `${item.entityKind}:${item.entityId}:reactivate:${ordinal}`,
        ordinal,
        title: item.title,
        entityKind: item.entityKind,
        entityId: item.entityId,
        command: "reactivate",
      });
    }

    if ((item.entityKind === "todo" || item.entityKind === "deadline") && status !== "completed") {
      actions.push({
        actionId: `${item.entityKind}:${item.entityId}:update_due_date:${ordinal}`,
        ordinal,
        title: item.title,
        entityKind: item.entityKind,
        entityId: item.entityId,
        command: "update_due_date",
      });
    }

    if (item.entityKind === "todo") {
      const todo = snapshot.todos.find((candidate) => candidate.id === item.entityId);
      if (todo?.waitingOnPersonId) {
        actions.push({
          actionId: `todo:${item.entityId}:clear_waiting_on:${ordinal}`,
          ordinal,
          title: item.title,
          entityKind: "todo",
          entityId: item.entityId,
          command: "clear_waiting_on",
          personId: todo.waitingOnPersonId,
        });
      }
    }

    if (item.entityKind === "project" || item.entityKind === "mission") {
      actions.push({
        actionId: `${item.entityKind}:${item.entityId}:open_focus_report:${ordinal}`,
        ordinal,
        title: item.title,
        entityKind: item.entityKind,
        entityId: item.entityId,
        command: "open_focus_report",
      });
    }

    if (item.entityKind === "todo") {
      const todo = snapshot.todos.find((candidate) => candidate.id === item.entityId);
      if (todo?.projectId) {
        const project = snapshot.projects.find((candidate) => candidate.id === todo.projectId);
        if (project) {
          actions.push({
            actionId: `project:${project.id}:open_focus_report:${ordinal}`,
            ordinal,
            title: project.title,
            entityKind: "project",
            entityId: project.id,
            command: "open_focus_report",
          });
        }
      }
    }

    if (item.entityKind === "deadline") {
      const deadline = snapshot.deadlines.find((candidate) => candidate.id === item.entityId);
      if (deadline?.entityKind === "project" && deadline.entityId) {
        const project = snapshot.projects.find((candidate) => candidate.id === deadline.entityId);
        if (project) {
          actions.push({
            actionId: `project:${project.id}:open_focus_report:${ordinal}`,
            ordinal,
            title: project.title,
            entityKind: "project",
            entityId: project.id,
            command: "open_focus_report",
          });
        }
      } else if (deadline?.entityKind === "mission" && deadline.entityId) {
        const mission = snapshot.missions.find((candidate) => candidate.id === deadline.entityId);
        if (mission) {
          actions.push({
            actionId: `mission:${mission.id}:open_focus_report:${ordinal}`,
            ordinal,
            title: mission.title,
            entityKind: "mission",
            entityId: mission.id,
            command: "open_focus_report",
          });
        }
      } else if (deadline?.entityKind === "todo" && deadline.entityId) {
        const todo = snapshot.todos.find((candidate) => candidate.id === deadline.entityId);
        if (todo?.projectId) {
          const project = snapshot.projects.find((candidate) => candidate.id === todo.projectId);
          if (project) {
            actions.push({
              actionId: `project:${project.id}:open_focus_report:${ordinal}`,
              ordinal,
              title: project.title,
              entityKind: "project",
              entityId: project.id,
              command: "open_focus_report",
            });
          }
        }
      }
    }

    return actions;
  });

export const buildWorkLookupActions = (
  result: Extract<WorkLookupResult, { ok: true }>,
  snapshot: WorkSnapshot
): AssistantContextAction[] =>
  buildWorkItemActions(result.items, snapshot);
