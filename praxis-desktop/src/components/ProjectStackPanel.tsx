import type { Dispatch, ReactNode, SetStateAction } from "react";
import type {
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkStatus,
} from "../../shared/workModel";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./EmptyState";

type ProjectStackPanelProps = {
  isActive: boolean;
  missions: MissionRecord[];
  projects: ProjectRecord[];
  todos: TodoRecord[];
  people: PersonRecord[];
  openCapture: () => void;
  formatDateTime: (value: string | null) => string;
  renderStatusActions: (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => ReactNode;
  setEditingMission: Dispatch<SetStateAction<MissionRecord | null>>;
  setEditingProject: Dispatch<SetStateAction<ProjectRecord | null>>;
  setEditingTodo: Dispatch<SetStateAction<TodoRecord | null>>;
  startProjectTask: (projectId: string) => void;
  deleteMission: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
};

const taskStatusRank: Record<WorkStatus, number> = {
  active: 0,
  blocked: 1,
  paused: 2,
  completed: 3,
};

const sortProjectTasks = (todos: TodoRecord[]) =>
  [...todos].sort(
    (left, right) =>
      taskStatusRank[left.status] - taskStatusRank[right.status] ||
      left.title.localeCompare(right.title)
  );

export function ProjectStackPanel({
  isActive,
  missions,
  projects,
  todos,
  people,
  openCapture,
  formatDateTime,
  renderStatusActions,
  setEditingMission,
  setEditingProject,
  setEditingTodo,
  startProjectTask,
  deleteMission,
  deleteProject,
  deleteTodo,
}: ProjectStackPanelProps) {
  const standaloneProjects = projects.filter((project) => !project.missionId);
  const activeMissions = missions.filter((mission) => mission.status !== "completed");
  const activeProjects = standaloneProjects.filter((project) => project.status !== "completed");
  const visibleMissions = activeMissions.length > 0 ? activeMissions : missions;
  const visibleProjects = activeProjects.length > 0 ? activeProjects : standaloneProjects;
  const visiblePeople = people.slice(0, 5);
  const projectTasksByProject = new Map<string, TodoRecord[]>();
  todos.forEach((todo) => {
    if (!todo.projectId) {
      return;
    }
    projectTasksByProject.set(todo.projectId, [
      ...(projectTasksByProject.get(todo.projectId) ?? []),
      todo,
    ]);
  });

  const progressForIndex = (index: number) => `${Math.max(30, 76 - index * 14)}%`;

  return (
    <section className={`panel left${isActive ? " is-active-panel" : ""}`}>
      <h2>Missions</h2>

      {visibleMissions.length > 0 ? (
        <ul className="operator-list">
          {visibleMissions.slice(0, 4).map((mission, index) => (
            <li key={mission.id} className="operator-card">
              <div className="operator-card-header">
                <strong>{mission.title}</strong>
                <span className={`badge${mission.status === "paused" ? " waiting-badge" : ""}`}>
                  {mission.status}
                </span>
              </div>
              <div className="progress-meter" aria-hidden="true">
                <span style={{ width: progressForIndex(index) }} />
              </div>
              <p>
                {mission.summary?.trim() ||
                  (mission.dueAt ? `Due ${formatDateTime(mission.dueAt)}` : "Active mission")}
              </p>
              <div className="operator-card-actions">
                {renderStatusActions("mission", mission.id, mission.status)}
              <ActionMenu>
                <button type="button" onClick={() => setEditingMission(mission)}>
                  Edit
                </button>
                <button type="button" onClick={() => void deleteMission(mission.id)}>
                  Delete
                </button>
              </ActionMenu>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No missions yet"
          detail="Capture a mission from Talk to Praxis when a larger outcome needs a home."
        >
          <button type="button" onClick={openCapture}>
            Open Talk
          </button>
        </EmptyState>
      )}

      <h3>Standalone Projects</h3>
      {visibleProjects.length > 0 ? (
        <ul className="operator-list">
          {visibleProjects.slice(0, 4).map((project, index) => {
            const projectTasks = sortProjectTasks(projectTasksByProject.get(project.id) ?? []);
            const completedTaskCount = projectTasks.filter(
              (task) => task.status === "completed"
            ).length;
            const taskProgressLabel =
              projectTasks.length > 0
                ? `${completedTaskCount} of ${projectTasks.length} complete`
                : "No linked tasks";
            const progressWidth =
              projectTasks.length > 0
                ? `${Math.round((completedTaskCount / projectTasks.length) * 100)}%`
                : progressForIndex(index + 1);
            const previewTasks = projectTasks.slice(0, 3);

            return (
              <li key={project.id} className="operator-card">
                <div className="operator-card-header">
                  <strong>{project.title}</strong>
                  <span className="badge">{project.status}</span>
                </div>
                <div className="progress-meter" aria-label={taskProgressLabel}>
                  <span style={{ width: progressWidth }} />
                </div>
                <p>{project.summary?.trim() || "Standalone project"}</p>
                <div className="operator-card-actions project-task-summary">
                  <span className="badge">{taskProgressLabel}</span>
                  <button type="button" onClick={() => startProjectTask(project.id)}>
                    Add task
                  </button>
                </div>
                {previewTasks.length > 0 ? (
                  <ul
                    className="operator-list project-task-preview"
                    aria-label={`Tasks for ${project.title}`}
                  >
                    {previewTasks.map((todo) => (
                      <li key={todo.id} className="operator-card project-task-row">
                        <div className="operator-card-header">
                          <strong>{todo.title}</strong>
                          <span className="badge">{todo.status}</span>
                        </div>
                        <div className="operator-card-actions">
                          {renderStatusActions("todo", todo.id, todo.status)}
                          <ActionMenu>
                            <button type="button" onClick={() => setEditingTodo(todo)}>
                              Edit
                            </button>
                            <button type="button" onClick={() => void deleteTodo(todo.id)}>
                              Delete
                            </button>
                          </ActionMenu>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {projectTasks.length > previewTasks.length ? (
                  <p className="project-task-overflow">
                    {projectTasks.length - previewTasks.length} more linked tasks in Checklist.
                  </p>
                ) : null}
                <div className="operator-card-actions">
                  {renderStatusActions("project", project.id, project.status)}
                  <ActionMenu>
                    <button type="button" onClick={() => setEditingProject(project)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => void deleteProject(project.id)}>
                      Delete
                    </button>
                  </ActionMenu>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="No standalone projects"
          detail="Projects created without a mission will appear here for quick scanning."
        >
          <button type="button" onClick={openCapture}>
            Capture Project
          </button>
        </EmptyState>
      )}

      <h3>People</h3>
      {visiblePeople.length > 0 ? (
        <ul className="operator-list">
          {visiblePeople.map((person) => (
            <li key={person.id} className="operator-card person-card">
              <strong>{person.name}</strong>
              <p>{person.roleSummary?.trim() || person.email || person.phone || "Saved contact"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No saved people"
          detail="People records will appear here after you add contacts or accept inferred details."
        >
          <button type="button" onClick={openCapture}>
            Add Person
          </button>
        </EmptyState>
      )}
    </section>
  );
}
