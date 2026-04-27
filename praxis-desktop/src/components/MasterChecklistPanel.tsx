import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
  WorkStatus,
} from "../../shared/workModel";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./EmptyState";

type TodoFilter = "all" | "quick";

type MasterChecklistPanelProps = {
  isActive: boolean;
  todos: TodoRecord[];
  projects: ProjectRecord[];
  missions: MissionRecord[];
  people: PersonRecord[];
  openCapture: () => void;
  todoFilter: TodoFilter;
  setTodoFilter: Dispatch<SetStateAction<TodoFilter>>;
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

export function MasterChecklistPanel({
  isActive,
  todos,
  projects,
  missions,
  people,
  openCapture,
  todoFilter,
  setTodoFilter,
  formatDateTime,
  renderStatusActions,
  setEditingTodo,
  deleteTodo,
}: MasterChecklistPanelProps) {
  const activeTodos = todos.filter((todo) => todo.status !== "completed");
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
    .filter((todo) => (todoFilter === "quick" ? todo.quickAction || todo.priority === "critical" : true));

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const missionById = new Map(missions.map((mission) => [mission.id, mission]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const quickCount = activeTodos.filter((todo) => todo.quickAction).length;
  const criticalCount = activeTodos.filter((todo) => todo.priority === "critical").length;
  const moneyCount = activeTodos.filter((todo) => todo.moneyRelated).length;
  const waitingCount = activeTodos.filter((todo) => todo.waitingOnPersonId).length;

  const renderTodoContextBadges = (projectId: string | null) => {
    if (!projectId) {
      return <span className="badge">quick</span>;
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
      </div>
      {rankedTodos.length > 0 ? (
        <ul className="checklist-strip">
          {rankedTodos.slice(0, 8).map((todo) => (
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
      ) : (
        <EmptyState
          title={todoFilter === "quick" ? "No quick or urgent todos" : "No active todos"}
          detail={
            todoFilter === "quick"
              ? "Critical and quick-action todos will collect here when they are available."
              : "Capture a todo in Talk to Praxis or use the manual form drawer when needed."
          }
        >
          <button type="button" onClick={openCapture}>
            Capture Todo
          </button>
        </EmptyState>
      )}
    </section>
  );
}
