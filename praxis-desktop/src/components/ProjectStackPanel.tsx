import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { MissionRecord, PersonRecord, ProjectRecord, WorkStatus } from "../../shared/workModel";
import { ActionMenu } from "./ActionMenu";
import { EmptyState } from "./EmptyState";

type ProjectStackPanelProps = {
  isActive: boolean;
  missions: MissionRecord[];
  projects: ProjectRecord[];
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
  deleteMission: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
};

export function ProjectStackPanel({
  isActive,
  missions,
  projects,
  people,
  openCapture,
  formatDateTime,
  renderStatusActions,
  setEditingMission,
  setEditingProject,
  deleteMission,
  deleteProject,
}: ProjectStackPanelProps) {
  const standaloneProjects = projects.filter((project) => !project.missionId);
  const activeMissions = missions.filter((mission) => mission.status !== "completed");
  const activeProjects = standaloneProjects.filter((project) => project.status !== "completed");
  const visibleMissions = activeMissions.length > 0 ? activeMissions : missions;
  const visibleProjects = activeProjects.length > 0 ? activeProjects : standaloneProjects;
  const visiblePeople = people.slice(0, 5);

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
          {visibleProjects.slice(0, 4).map((project, index) => (
            <li key={project.id} className="operator-card">
              <div className="operator-card-header">
                <strong>{project.title}</strong>
                <span className="badge">{project.status}</span>
              </div>
              <div className="progress-meter" aria-hidden="true">
                <span style={{ width: progressForIndex(index + 1) }} />
              </div>
              <p>{project.summary?.trim() || "Standalone project"}</p>
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
          ))}
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
