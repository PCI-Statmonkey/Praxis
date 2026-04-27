import type { FormEvent, ReactNode } from "react";
import type {
  AppointmentRecord,
  CreateAppointmentInput,
  CreateDeadlineInput,
  CreateMissionInput,
  CreatePersonInput,
  CreateProjectInput,
  CreateTodoInput,
  DeadlineRecord,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  TodoRecord,
  WorkPriority,
  WorkSnapshot,
} from "../../shared/workModel";

const PRIORITIES: WorkPriority[] = ["low", "normal", "high", "critical"];

const aliasesToText = (aliases: string[] | undefined) => (aliases ?? []).join(", ");

const aliasesFromText = (value: string) =>
  value
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0);

type FormSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function FormSection({ title, description, children }: FormSectionProps) {
  return (
    <details className="form-section">
      <summary>
        <span>{title}</span>
        <small>{description}</small>
      </summary>
      <div className="form-section-body">{children}</div>
    </details>
  );
}

type WorkEditPanelsProps = {
  snapshot: WorkSnapshot;
  editingMission: MissionRecord | null;
  editingProject: ProjectRecord | null;
  editingDeadline: DeadlineRecord | null;
  editingTodo: TodoRecord | null;
  editingPerson: PersonRecord | null;
  editingAppointment: AppointmentRecord | null;
  setEditingMission: (record: MissionRecord | null) => void;
  setEditingProject: (record: ProjectRecord | null) => void;
  setEditingDeadline: (record: DeadlineRecord | null) => void;
  setEditingTodo: (record: TodoRecord | null) => void;
  setEditingPerson: (record: PersonRecord | null) => void;
  setEditingAppointment: (record: AppointmentRecord | null) => void;
  saveMissionEdit: () => Promise<void>;
  saveProjectEdit: () => Promise<void>;
  saveDeadlineEdit: () => Promise<void>;
  saveTodoEdit: () => Promise<void>;
  savePersonEdit: () => Promise<void>;
  saveAppointmentEdit: () => Promise<void>;
};

type WorkCreationPanelProps = {
  snapshot: WorkSnapshot;
  missionForm: CreateMissionInput;
  projectForm: CreateProjectInput;
  personForm: CreatePersonInput;
  todoForm: CreateTodoInput;
  deadlineForm: CreateDeadlineInput;
  appointmentForm: CreateAppointmentInput;
  setMissionForm: (form: CreateMissionInput) => void;
  setProjectForm: (form: CreateProjectInput) => void;
  setPersonForm: (form: CreatePersonInput) => void;
  setTodoForm: (form: CreateTodoInput) => void;
  setDeadlineForm: (form: CreateDeadlineInput) => void;
  setAppointmentForm: (form: CreateAppointmentInput) => void;
  createMission: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createProject: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createPerson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createTodo: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createDeadline: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createAppointment: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function WorkEditPanels({
  snapshot,
  editingMission,
  editingProject,
  editingDeadline,
  editingTodo,
  editingPerson,
  editingAppointment,
  setEditingMission,
  setEditingProject,
  setEditingDeadline,
  setEditingTodo,
  setEditingPerson,
  setEditingAppointment,
  saveMissionEdit,
  saveProjectEdit,
  saveDeadlineEdit,
  saveTodoEdit,
  savePersonEdit,
  saveAppointmentEdit,
}: WorkEditPanelsProps) {
  return (
    <>
      {editingMission ? (
        <div className="capture-draft">
          <h3>Edit Mission</h3>
          <input
            value={editingMission.title}
            onChange={(event) =>
              setEditingMission({ ...editingMission, title: event.target.value })
            }
            placeholder="Mission title"
          />
          <textarea
            value={editingMission.summary ?? ""}
            onChange={(event) =>
              setEditingMission({ ...editingMission, summary: event.target.value })
            }
            placeholder="Mission summary"
          />
          <input
            type="datetime-local"
            value={editingMission.dueAt ?? ""}
            onChange={(event) =>
              setEditingMission({ ...editingMission, dueAt: event.target.value })
            }
          />
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void saveMissionEdit()}>
              Save mission
            </button>
            <button type="button" onClick={() => setEditingMission(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editingProject ? (
        <div className="capture-draft">
          <h3>Edit Project</h3>
          <input
            value={editingProject.title}
            onChange={(event) =>
              setEditingProject({ ...editingProject, title: event.target.value })
            }
            placeholder="Project title"
          />
          <select
            value={editingProject.missionId ?? ""}
            onChange={(event) =>
              setEditingProject({ ...editingProject, missionId: event.target.value || null })
            }
          >
            <option value="">No parent mission</option>
            {snapshot.missions.map((mission) => (
              <option key={mission.id} value={mission.id}>
                {mission.title}
              </option>
            ))}
          </select>
          <textarea
            value={editingProject.summary ?? ""}
            onChange={(event) =>
              setEditingProject({ ...editingProject, summary: event.target.value })
            }
            placeholder="Project summary"
          />
          <input
            type="datetime-local"
            value={editingProject.dueAt ?? ""}
            onChange={(event) =>
              setEditingProject({ ...editingProject, dueAt: event.target.value })
            }
          />
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void saveProjectEdit()}>
              Save project
            </button>
            <button type="button" onClick={() => setEditingProject(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editingDeadline ? (
        <div className="capture-draft">
          <h3>Edit Deadline</h3>
          <input
            value={editingDeadline.title}
            onChange={(event) =>
              setEditingDeadline({ ...editingDeadline, title: event.target.value })
            }
            placeholder="Deadline title"
          />
          <input
            type="datetime-local"
            value={editingDeadline.dueAt}
            onChange={(event) =>
              setEditingDeadline({ ...editingDeadline, dueAt: event.target.value })
            }
          />
          <select
            value={editingDeadline.priority}
            onChange={(event) =>
              setEditingDeadline({
                ...editingDeadline,
                priority: event.target.value as WorkPriority,
              })
            }
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void saveDeadlineEdit()}>
              Save deadline
            </button>
            <button type="button" onClick={() => setEditingDeadline(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editingTodo ? (
        <div className="capture-draft">
          <h3>Edit Todo</h3>
          <input
            value={editingTodo.title}
            onChange={(event) => setEditingTodo({ ...editingTodo, title: event.target.value })}
            placeholder="Todo title"
          />
          <select
            value={editingTodo.projectId ?? ""}
            onChange={(event) =>
              setEditingTodo({ ...editingTodo, projectId: event.target.value || null })
            }
          >
            <option value="">Standalone quick todo</option>
            {snapshot.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <select
            value={editingTodo.priority}
            onChange={(event) =>
              setEditingTodo({ ...editingTodo, priority: event.target.value as WorkPriority })
            }
          >
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={editingTodo.dueAt ?? ""}
            onChange={(event) => setEditingTodo({ ...editingTodo, dueAt: event.target.value })}
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editingTodo.moneyRelated}
              onChange={(event) =>
                setEditingTodo({ ...editingTodo, moneyRelated: event.target.checked })
              }
            />
            Money related
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editingTodo.quickAction}
              onChange={(event) =>
                setEditingTodo({ ...editingTodo, quickAction: event.target.checked })
              }
            />
            Quick action
          </label>
          <input
            type="number"
            min="1"
            value={editingTodo.estimatedMinutes ?? ""}
            onChange={(event) =>
              setEditingTodo({
                ...editingTodo,
                estimatedMinutes: event.target.value ? Number(event.target.value) : null,
              })
            }
            placeholder="Estimated minutes"
          />
          <select
            value={editingTodo.waitingOnPersonId ?? ""}
            onChange={(event) =>
              setEditingTodo({ ...editingTodo, waitingOnPersonId: event.target.value || null })
            }
          >
            <option value="">Not waiting on anyone</option>
            {snapshot.people.map((person) => (
              <option key={person.id} value={person.id}>
                Waiting on {person.name}
              </option>
            ))}
          </select>
          <textarea
            value={editingTodo.notes ?? ""}
            onChange={(event) => setEditingTodo({ ...editingTodo, notes: event.target.value })}
            placeholder="Notes"
          />
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void saveTodoEdit()}>
              Save todo
            </button>
            <button type="button" onClick={() => setEditingTodo(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editingPerson ? (
        <div className="capture-draft">
          <h3>Edit Person</h3>
          <input
            value={editingPerson.name}
            onChange={(event) => setEditingPerson({ ...editingPerson, name: event.target.value })}
            placeholder="Person name"
          />
          <textarea
            value={editingPerson.roleSummary ?? ""}
            onChange={(event) =>
              setEditingPerson({ ...editingPerson, roleSummary: event.target.value })
            }
            placeholder="Role or context"
          />
          <input
            value={aliasesToText(editingPerson.aliases)}
            onChange={(event) =>
              setEditingPerson({ ...editingPerson, aliases: aliasesFromText(event.target.value) })
            }
            placeholder="Aliases or nicknames, comma separated"
          />
          <input
            value={editingPerson.email ?? ""}
            onChange={(event) => setEditingPerson({ ...editingPerson, email: event.target.value })}
            placeholder="Email address"
          />
          <input
            value={editingPerson.phone ?? ""}
            onChange={(event) => setEditingPerson({ ...editingPerson, phone: event.target.value })}
            placeholder="Phone number"
          />
          <textarea
            value={editingPerson.billingAddress ?? ""}
            onChange={(event) =>
              setEditingPerson({ ...editingPerson, billingAddress: event.target.value })
            }
            placeholder="Billing address"
          />
          <textarea
            value={editingPerson.notes ?? ""}
            onChange={(event) => setEditingPerson({ ...editingPerson, notes: event.target.value })}
            placeholder="Notes"
          />
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void savePersonEdit()}>
              Save person
            </button>
            <button type="button" onClick={() => setEditingPerson(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {editingAppointment ? (
        <div className="capture-draft">
          <h3>Edit Appointment</h3>
          <input
            value={editingAppointment.title}
            onChange={(event) =>
              setEditingAppointment({ ...editingAppointment, title: event.target.value })
            }
            placeholder="Appointment title"
          />
          <input
            type="datetime-local"
            value={editingAppointment.startsAt}
            onChange={(event) =>
              setEditingAppointment({ ...editingAppointment, startsAt: event.target.value })
            }
          />
          <input
            type="datetime-local"
            value={editingAppointment.endsAt ?? ""}
            onChange={(event) =>
              setEditingAppointment({ ...editingAppointment, endsAt: event.target.value })
            }
          />
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={editingAppointment.allDay}
              onChange={(event) =>
                setEditingAppointment({ ...editingAppointment, allDay: event.target.checked })
              }
            />
            All day
          </label>
          <textarea
            value={editingAppointment.notes ?? ""}
            onChange={(event) =>
              setEditingAppointment({ ...editingAppointment, notes: event.target.value })
            }
            placeholder="Notes"
          />
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void saveAppointmentEdit()}>
              Save appointment
            </button>
            <button type="button" onClick={() => setEditingAppointment(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function WorkCreationPanel({
  snapshot,
  missionForm,
  projectForm,
  personForm,
  todoForm,
  deadlineForm,
  appointmentForm,
  setMissionForm,
  setProjectForm,
  setPersonForm,
  setTodoForm,
  setDeadlineForm,
  setAppointmentForm,
  createMission,
  createProject,
  createPerson,
  createTodo,
  createDeadline,
  createAppointment,
}: WorkCreationPanelProps) {
  return (
    <div className="form-stack">
      <h3>Create Records</h3>
      <FormSection title="Mission" description="Complex super-project with smaller projects under it.">
      <form onSubmit={(event) => void createMission(event)}>
        <input
          value={missionForm.title}
          onChange={(event) => setMissionForm({ ...missionForm, title: event.target.value })}
          placeholder="Mission title"
        />
        <textarea
          value={missionForm.summary}
          onChange={(event) => setMissionForm({ ...missionForm, summary: event.target.value })}
          placeholder="Mission summary"
        />
        <input
          type="datetime-local"
          value={missionForm.dueAt}
          onChange={(event) => setMissionForm({ ...missionForm, dueAt: event.target.value })}
        />
        <button type="submit">Create Mission</button>
      </form>
      </FormSection>

      <FormSection title="Project" description="Standalone work or a project inside a mission.">
      <form onSubmit={(event) => void createProject(event)}>
        <input
          value={projectForm.title}
          onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
          placeholder="Project title"
        />
        <select
          value={projectForm.missionId}
          onChange={(event) => setProjectForm({ ...projectForm, missionId: event.target.value })}
        >
          <option value="">No parent mission</option>
          {snapshot.missions.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title}
            </option>
          ))}
        </select>
        <textarea
          value={projectForm.summary}
          onChange={(event) => setProjectForm({ ...projectForm, summary: event.target.value })}
          placeholder="Project summary"
        />
        <input
          type="datetime-local"
          value={projectForm.dueAt}
          onChange={(event) => setProjectForm({ ...projectForm, dueAt: event.target.value })}
        />
        <button type="submit">Create Project</button>
      </form>
      </FormSection>

      <FormSection title="Person" description="Contact info, aliases, and working relationship context.">
      <form onSubmit={(event) => void createPerson(event)}>
        <input
          value={personForm.name}
          onChange={(event) => setPersonForm({ ...personForm, name: event.target.value })}
          placeholder="Person name"
        />
        <textarea
          value={personForm.roleSummary}
          onChange={(event) => setPersonForm({ ...personForm, roleSummary: event.target.value })}
          placeholder="Role or context, for example client, GM, vendor"
        />
        <input
          value={aliasesToText(personForm.aliases)}
          onChange={(event) =>
            setPersonForm({ ...personForm, aliases: aliasesFromText(event.target.value) })
          }
          placeholder="Aliases or nicknames, comma separated"
        />
        <input
          value={personForm.email}
          onChange={(event) => setPersonForm({ ...personForm, email: event.target.value })}
          placeholder="Email address"
        />
        <input
          value={personForm.phone}
          onChange={(event) => setPersonForm({ ...personForm, phone: event.target.value })}
          placeholder="Phone number"
        />
        <textarea
          value={personForm.billingAddress}
          onChange={(event) =>
            setPersonForm({ ...personForm, billingAddress: event.target.value })
          }
          placeholder="Billing address"
        />
        <textarea
          value={personForm.notes}
          onChange={(event) => setPersonForm({ ...personForm, notes: event.target.value })}
          placeholder="Notes"
        />
        <button type="submit">Create Person</button>
      </form>
      </FormSection>

      <FormSection title="Todo" description="One-shot action, quick task, or project-linked task.">
      <form onSubmit={(event) => void createTodo(event)}>
        <input
          value={todoForm.title}
          onChange={(event) => setTodoForm({ ...todoForm, title: event.target.value })}
          placeholder="Todo title"
        />
        <select
          value={todoForm.projectId}
          onChange={(event) => setTodoForm({ ...todoForm, projectId: event.target.value })}
        >
          <option value="">Standalone todo</option>
          {snapshot.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <select
          value={todoForm.priority}
          onChange={(event) =>
            setTodoForm({ ...todoForm, priority: event.target.value as WorkPriority })
          }
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={todoForm.dueAt}
          onChange={(event) => setTodoForm({ ...todoForm, dueAt: event.target.value })}
        />
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={todoForm.moneyRelated}
            onChange={(event) => setTodoForm({ ...todoForm, moneyRelated: event.target.checked })}
          />
          Money related
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={todoForm.quickAction}
            onChange={(event) => setTodoForm({ ...todoForm, quickAction: event.target.checked })}
          />
          Quick action
        </label>
        <input
          type="number"
          min="1"
          value={todoForm.estimatedMinutes ?? ""}
          onChange={(event) =>
            setTodoForm({
              ...todoForm,
              estimatedMinutes: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          placeholder="Estimated minutes"
        />
        <select
          value={todoForm.waitingOnPersonId ?? ""}
          onChange={(event) => setTodoForm({ ...todoForm, waitingOnPersonId: event.target.value })}
        >
          <option value="">Not waiting on anyone</option>
          {snapshot.people.map((person) => (
            <option key={person.id} value={person.id}>
              Waiting on {person.name}
            </option>
          ))}
        </select>
        <textarea
          value={todoForm.notes}
          onChange={(event) => setTodoForm({ ...todoForm, notes: event.target.value })}
          placeholder="Notes"
        />
        <button type="submit">Create Todo</button>
      </form>
      </FormSection>

      <FormSection title="Standalone Deadline" description="A due date not already attached to another record.">
      <form onSubmit={(event) => void createDeadline(event)}>
        <input
          value={deadlineForm.title}
          onChange={(event) => setDeadlineForm({ ...deadlineForm, title: event.target.value })}
          placeholder="Deadline title"
        />
        <input
          type="datetime-local"
          value={deadlineForm.dueAt}
          onChange={(event) => setDeadlineForm({ ...deadlineForm, dueAt: event.target.value })}
        />
        <select
          value={deadlineForm.priority}
          onChange={(event) =>
            setDeadlineForm({ ...deadlineForm, priority: event.target.value as WorkPriority })
          }
        >
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <button type="submit">Create Deadline</button>
      </form>
      </FormSection>

      <FormSection title="Appointment" description="Manual calendar item stored in Praxis.">
      <form onSubmit={(event) => void createAppointment(event)}>
        <input
          value={appointmentForm.title}
          onChange={(event) =>
            setAppointmentForm({ ...appointmentForm, title: event.target.value })
          }
          placeholder="Appointment title"
        />
        <input
          type="datetime-local"
          value={appointmentForm.startsAt}
          onChange={(event) =>
            setAppointmentForm({ ...appointmentForm, startsAt: event.target.value })
          }
        />
        <input
          type="datetime-local"
          value={appointmentForm.endsAt}
          onChange={(event) =>
            setAppointmentForm({ ...appointmentForm, endsAt: event.target.value })
          }
        />
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={appointmentForm.allDay}
            onChange={(event) =>
              setAppointmentForm({ ...appointmentForm, allDay: event.target.checked })
            }
          />
          All day
        </label>
        <textarea
          value={appointmentForm.notes}
          onChange={(event) =>
            setAppointmentForm({ ...appointmentForm, notes: event.target.value })
          }
          placeholder="Notes"
        />
        <button type="submit">Create Appointment</button>
      </form>
      </FormSection>
    </div>
  );
}
