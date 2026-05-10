import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
  WorkStatus,
} from "../../shared/workModel";
import {
  buildChecklistContextGroups,
  highlightedChecklistContextGroupIds,
  type ChecklistContextGroup as SelectorChecklistContextGroup,
} from "../../shared/contextSurfaces";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./EmptyState";

const groupFilterPrefix = "group:";

type MasterChecklistPanelProps = {
  isActive: boolean;
  todos: TodoRecord[];
  projects: ProjectRecord[];
  missions: MissionRecord[];
  people: PersonRecord[];
  topMoveTodoId?: string | null;
  aiReviewSuggestedStableIds?: string[];
  openCapture: () => void;
  todoFilter: string;
  setTodoFilter: Dispatch<SetStateAction<string>>;
  formatDateTime: (value: string | null) => string;
  renderStatusActions: (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => ReactNode;
  setEditingTodo: Dispatch<SetStateAction<TodoRecord | null>>;
  deleteTodo: (id: string) => Promise<void>;
};

const priorityRank: Record<WorkPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

type ChecklistGroup = {
  id: string;
  label: string;
  todos: TodoRecord[];
};

export function MasterChecklistPanel({
  isActive,
  todos,
  projects,
  missions,
  people,
  topMoveTodoId = null,
  aiReviewSuggestedStableIds = [],
  openCapture,
  todoFilter,
  setTodoFilter,
  formatDateTime,
  renderStatusActions,
  setEditingTodo,
  deleteTodo,
}: MasterChecklistPanelProps) {
  const activeTodos = todos.filter((todo) => todo.status !== "completed");
  const todoById = new Map(activeTodos.map((todo) => [todo.id, todo]));
  const contextGroups = buildChecklistContextGroups({
    todos,
    projects,
    missions,
    people,
    topMoveTodoId,
  });
  const selectedGroupId = todoFilter.startsWith(groupFilterPrefix)
    ? todoFilter.slice(groupFilterPrefix.length)
    : null;
  const aiReviewHighlightedGroupIds = new Set(
    highlightedChecklistContextGroupIds(contextGroups, aiReviewSuggestedStableIds)
  );
  const selectedGroup = selectedGroupId
    ? contextGroups.find((group) => group.id === selectedGroupId) ?? null
    : null;
  const rankedTodos = [...activeTodos]
    .sort((a, b) => {
      const quickRankA = a.quickAction ? 0 : 1;
      const quickRankB = b.quickAction ? 0 : 1;
      return (
        quickRankA - quickRankB ||
        priorityRank[a.priority] - priorityRank[b.priority] ||
        (a.estimatedMinutes ?? 999) - (b.estimatedMinutes ?? 999) ||
        a.title.localeCompare(b.title)
      );
    })
    .filter((todo) => {
      if (todoFilter === "quick") {
        return todo.quickAction || todo.priority === "critical";
      }
      if (selectedGroup) {
        return selectedGroup.todoIds.includes(todo.id);
      }
      return true;
    });

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const missionById = new Map(missions.map((mission) => [mission.id, mission]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const quickCount = activeTodos.filter((todo) => todo.quickAction).length;
  const criticalCount = activeTodos.filter((todo) => todo.priority === "critical").length;
  const moneyCount = activeTodos.filter((todo) => todo.moneyRelated).length;
  const waitingCount = activeTodos.filter((todo) => todo.waitingOnPersonId).length;

  const rankedTodoIds = new Set(rankedTodos.map((todo) => todo.id));
  const groupTodos = (group: SelectorChecklistContextGroup, seenTodoIds?: Set<string>) =>
    group.todoIds
      .map((todoId) => todoById.get(todoId) ?? null)
      .filter((todo): todo is TodoRecord => todo !== null && rankedTodoIds.has(todo.id))
      .filter((todo) => {
        if (!seenTodoIds) {
          return true;
        }
        if (seenTodoIds.has(todo.id)) {
          return false;
        }
        seenTodoIds.add(todo.id);
        return true;
      });

  const groupedTodos = (() => {
    if (selectedGroup) {
      const todosForGroup = groupTodos(selectedGroup);
      return todosForGroup.length > 0
        ? [{ id: selectedGroup.id, label: selectedGroup.label, todos: todosForGroup }]
        : [];
    }

    const seenTodoIds = new Set<string>();
    const groups: ChecklistGroup[] = [];
    for (const group of contextGroups) {
      const todosForGroup = groupTodos(group, seenTodoIds);
      if (todosForGroup.length > 0) {
        groups.push({ id: group.id, label: group.label, todos: todosForGroup });
      }
      if (seenTodoIds.size >= 8) {
        break;
      }
    }

    const remainingTodos = rankedTodos
      .slice(0, 8)
      .filter((todo) => !seenTodoIds.has(todo.id));
    if (remainingTodos.length > 0) {
      groups.push({ id: "other", label: "Other Active", todos: remainingTodos });
    }
    return groups;
  })();

  const groupFilterOptions = contextGroups.slice(0, 12);
  const emptyTitle = selectedGroup
    ? `No ${selectedGroup.label.toLowerCase()} todos`
    : todoFilter === "quick"
      ? "No quick or urgent todos"
      : "No active todos";
  const emptyDetail = selectedGroup
    ? "This context is clear right now. Switch filters to review the broader active stack."
    : todoFilter === "quick"
      ? "Critical and quick-action todos will collect here when they are available."
      : "Capture a todo in Talk to Praxis or use the manual form drawer when needed.";

  const renderTodoContextBadges = (projectId: string | null) => {
    if (!projectId) {
      return <span className="badge">standalone</span>;
    }

    const project = projectById.get(projectId);
    const mission = project?.missionId ? missionById.get(project.missionId) : null;
    return (
      <>
        {project ? <span className="badge">project: {project.title}</span> : null}
        {mission ? <span className="badge">mission: {mission.title}</span> : null}
      </>
    );
  };

  const renderWaitingBadge = (personId: string | null) => {
    if (!personId) {
      return null;
    }

    const person = personById.get(personId);
    return <span className="badge waiting-badge">waiting on: {person?.name ?? "unknown"}</span>;
  };

  return (
    <section className={`panel bottom${isActive ? " is-active-panel" : ""}`}>
      <div className="surface-grid">
        <article className="surface-tile">
          <span>Todos</span>
          <strong>{activeTodos.length}</strong>
          <p>
            {quickCount} quick, {criticalCount} critical
          </p>
        </article>
        <article className="surface-tile">
          <span>Money</span>
          <strong>{moneyCount}</strong>
          <p>money-related obligations</p>
        </article>
        <article className="surface-tile">
          <span>Waiting</span>
          <strong>{waitingCount}</strong>
          <p>people-linked follow-ups</p>
        </article>
        <article className="surface-tile">
          <span>Projects</span>
          <strong>{projects.length}</strong>
          <p>{missions.length} mission anchors</p>
        </article>
      </div>

      <h2>Checklist</h2>
      <div className="filter-actions">
        <button
          type="button"
          className={todoFilter === "all" ? "is-filter-active" : ""}
          onClick={() => setTodoFilter("all")}
        >
          All Active
        </button>
        <button
          type="button"
          className={todoFilter === "quick" ? "is-filter-active" : ""}
          onClick={() => setTodoFilter("quick")}
        >
          Quick/Urgent
        </button>
        {groupFilterOptions.map((group) => {
          const filterId = `${groupFilterPrefix}${group.id}`;
          return (
            <button
              key={group.id}
              type="button"
              className={[
                todoFilter === filterId ? "is-filter-active" : "",
                aiReviewHighlightedGroupIds.has(group.id) ? "is-ai-review-highlight" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setTodoFilter(filterId)}
            >
              {group.label} ({group.count})
            </button>
          );
        })}
      </div>
      {rankedTodos.length > 0 ? (
        <div className="checklist-groups">
          {groupedTodos.map((group) => (
            <section
              key={group.id}
              className={`checklist-group${aiReviewHighlightedGroupIds.has(group.id) ? " is-ai-review-highlight" : ""}`}
              aria-label={group.label}
            >
              <div className="checklist-group-header">
                <strong>{group.label}</strong>
                <span className="badge">{group.todos.length}</span>
                {aiReviewHighlightedGroupIds.has(group.id) ? (
                  <span className="badge ai-review-badge">AI Review</span>
                ) : null}
              </div>
              <ul className="checklist-strip">
                {group.todos.map((todo) => (
                  <li key={todo.id} className={`item${todo.priority === "critical" ? " is-urgent" : ""}`}>
                    {todo.title}
                    <span className="badge">{todo.priority}</span>
                    {renderTodoContextBadges(todo.projectId)}
                    {todo.quickAction ? <span className="badge">quick</span> : null}
                    {todo.estimatedMinutes ? <span className="badge">{todo.estimatedMinutes} min</span> : null}
                    {todo.dueAt ? (
                      <span className="badge urgent-badge">{formatDateTime(todo.dueAt)}</span>
                    ) : null}
                    {renderWaitingBadge(todo.waitingOnPersonId)}
                    {todo.moneyRelated ? <span className="badge">money</span> : null}
                    {renderStatusActions("todo", todo.id, todo.status)}
                    <ActionMenu>
                      <button type="button" onClick={() => setEditingTodo(todo)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void deleteTodo(todo.id)}>
                        Delete
                      </button>
                    </ActionMenu>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title={emptyTitle}
          detail={emptyDetail}
        >
          <button type="button" onClick={openCapture}>
            Capture Todo
          </button>
        </EmptyState>
      )}
    </section>
  );
}
