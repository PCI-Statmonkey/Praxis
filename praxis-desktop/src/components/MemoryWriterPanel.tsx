import type { Dispatch, FormEvent, SetStateAction } from "react";
import type {
  ChatImportSourceSystem,
} from "../../shared/chatImport";
import type {
  CaptureIntent,
  CaptureResult,
  SaveCaptureCandidateRequest,
} from "../../shared/naturalLanguageCapture";
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
import { AssistantReviewSurface } from "./AssistantReviewSurface";
import { WorkCreationPanel, WorkEditPanels } from "./WorkFormsPanel";

type CaptureDraft = SaveCaptureCandidateRequest;

const PRIORITIES: WorkPriority[] = ["low", "normal", "high", "critical"];
const CHAT_IMPORT_SOURCES: ChatImportSourceSystem[] = [
  "whatsapp",
  "sms",
  "slack",
  "manual",
  "unknown",
];

type ManualChatImportForm = {
  sourceSystem: ChatImportSourceSystem;
  conversationTitle: string;
  participants: string;
  snippet: string;
};

type MemoryWriterPanelProps = {
  isActive: boolean;
  snapshot: WorkSnapshot;
  captureText: string;
  captureStatus: string;
  assistantReply: string;
  assistantReplyIsAiReview: boolean;
  pendingConfirmationOptions: Array<Exclude<CaptureIntent, "unresolved">>;
  captureDraft: CaptureDraft | null;
  missionForm: CreateMissionInput;
  projectForm: CreateProjectInput;
  personForm: CreatePersonInput;
  todoForm: CreateTodoInput;
  deadlineForm: CreateDeadlineInput;
  appointmentForm: CreateAppointmentInput;
  manualChatImportForm: ManualChatImportForm;
  chatImportStatus: string;
  editingMission: MissionRecord | null;
  editingProject: ProjectRecord | null;
  editingDeadline: DeadlineRecord | null;
  editingTodo: TodoRecord | null;
  editingPerson: PersonRecord | null;
  editingAppointment: AppointmentRecord | null;
  setCaptureText: Dispatch<SetStateAction<string>>;
  setCaptureStatus: Dispatch<SetStateAction<string>>;
  setCaptureDraft: Dispatch<SetStateAction<CaptureDraft | null>>;
  setPendingCapture: Dispatch<SetStateAction<CaptureResult | null>>;
  setMissionForm: Dispatch<SetStateAction<CreateMissionInput>>;
  setProjectForm: Dispatch<SetStateAction<CreateProjectInput>>;
  setPersonForm: Dispatch<SetStateAction<CreatePersonInput>>;
  setTodoForm: Dispatch<SetStateAction<CreateTodoInput>>;
  setDeadlineForm: Dispatch<SetStateAction<CreateDeadlineInput>>;
  setAppointmentForm: Dispatch<SetStateAction<CreateAppointmentInput>>;
  setManualChatImportForm: Dispatch<SetStateAction<ManualChatImportForm>>;
  setEditingMission: Dispatch<SetStateAction<MissionRecord | null>>;
  setEditingProject: Dispatch<SetStateAction<ProjectRecord | null>>;
  setEditingDeadline: Dispatch<SetStateAction<DeadlineRecord | null>>;
  setEditingTodo: Dispatch<SetStateAction<TodoRecord | null>>;
  setEditingPerson: Dispatch<SetStateAction<PersonRecord | null>>;
  setEditingAppointment: Dispatch<SetStateAction<AppointmentRecord | null>>;
  captureNaturalLanguage: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  confirmCapture: (forcedIntent: Exclude<CaptureIntent, "unresolved">) => Promise<void>;
  saveCaptureDraft: () => Promise<void>;
  saveMissionEdit: () => Promise<void>;
  saveProjectEdit: () => Promise<void>;
  saveDeadlineEdit: () => Promise<void>;
  saveTodoEdit: () => Promise<void>;
  savePersonEdit: () => Promise<void>;
  saveAppointmentEdit: () => Promise<void>;
  createMission: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createProject: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createPerson: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createTodo: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createDeadline: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  createAppointment: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  importManualChatSnippet: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function MemoryWriterPanel({
  isActive,
  snapshot,
  captureText,
  captureStatus,
  assistantReply,
  assistantReplyIsAiReview,
  pendingConfirmationOptions,
  captureDraft,
  missionForm,
  projectForm,
  personForm,
  todoForm,
  deadlineForm,
  appointmentForm,
  manualChatImportForm,
  chatImportStatus,
  editingMission,
  editingProject,
  editingDeadline,
  editingTodo,
  editingPerson,
  editingAppointment,
  setCaptureText,
  setCaptureStatus,
  setCaptureDraft,
  setPendingCapture,
  setMissionForm,
  setProjectForm,
  setPersonForm,
  setTodoForm,
  setDeadlineForm,
  setAppointmentForm,
  setManualChatImportForm,
  setEditingMission,
  setEditingProject,
  setEditingDeadline,
  setEditingTodo,
  setEditingPerson,
  setEditingAppointment,
  captureNaturalLanguage,
  confirmCapture,
  saveCaptureDraft,
  saveMissionEdit,
  saveProjectEdit,
  saveDeadlineEdit,
  saveTodoEdit,
  savePersonEdit,
  saveAppointmentEdit,
  createMission,
  createProject,
  createPerson,
  createTodo,
  createDeadline,
  createAppointment,
  importManualChatSnippet,
}: MemoryWriterPanelProps) {
  const activeEditTitle = editingMission
    ? "Edit Mission"
    : editingProject
      ? "Edit Project"
      : editingDeadline
        ? "Edit Deadline"
        : editingTodo
          ? "Edit Todo"
          : editingPerson
            ? "Edit Person"
            : editingAppointment
              ? "Edit Appointment"
              : null;

  const closeEditDrawer = () => {
    setEditingMission(null);
    setEditingProject(null);
    setEditingDeadline(null);
    setEditingTodo(null);
    setEditingPerson(null);
    setEditingAppointment(null);
  };

  return (
    <section className={`panel right${isActive ? " is-active-panel" : ""}`}>
      <div className="assistant-presence-card">
        <div className="assistant-orb" aria-hidden="true">
          <span />
        </div>
        <div>
          <h2>Talk to Praxis</h2>
          <p>ask, reset, or capture work</p>
        </div>
      </div>

      <div className="assistant-thread">
        {assistantReply ? (
          <article className="praxis-reply">
            <h4>Praxis</h4>
            <p className="assistant-reply-text">{assistantReply}</p>
          </article>
        ) : (
          <article className="praxis-reply">
            <h4>Praxis</h4>
            <p>I can read the brief, answer work-graph questions, or capture the next thing.</p>
          </article>
        )}
        <article className="user-reply">
          <p>What am I waiting on? What can I knock out quickly? What is slipping?</p>
        </article>
      </div>

      <AssistantReviewSurface
        snapshot={snapshot}
        setCaptureText={setCaptureText}
        suppressLocalPreview={assistantReplyIsAiReview && captureText.trim().length === 0}
      />

      <form onSubmit={(event) => void captureNaturalLanguage(event)}>
        <textarea
          value={captureText}
          onChange={(event) => setCaptureText(event.target.value)}
          placeholder="Ask, dictate, or capture a work item..."
        />
        <div className="assistant-input-footer">
          <div className="voice-wave" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <button type="submit" className="primary-action-button">
            Send
          </button>
        </div>
      </form>
      <div className="capture-guide">
        <p className="capture-guide-label">Try asking Praxis</p>
        <ul className="capture-guide-list">
          <li>`what am I waiting on from Scott?`</li>
          <li>`what can I knock out quickly?`</li>
          <li>`what's money-related right now?`</li>
          <li>`what's blocked?`</li>
          <li>`what's Max's phone?`</li>
          <li>`create a mission for BDNC operations`</li>
        </ul>
      </div>
      <p className="capture-status">{captureStatus}</p>
      {pendingConfirmationOptions.length > 0 ? (
        <div className="capture-confirmation">
          <p>Confirm capture type:</p>
          <div className="capture-confirmation-actions">
            {pendingConfirmationOptions.map((option) => (
              <button key={option} type="button" onClick={() => void confirmCapture(option)}>
                Create {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {captureDraft ? (
        <div className="capture-draft">
          <h3>Review Capture</h3>
          {captureDraft.intent === "todo" ? (
            <>
              <input
                value={captureDraft.input.title}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: { ...captureDraft.input, title: event.target.value },
                  })
                }
                placeholder="Todo title"
              />
              <select
                value={captureDraft.input.projectId ?? ""}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: { ...captureDraft.input, projectId: event.target.value },
                  })
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
                value={captureDraft.input.priority ?? "normal"}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: {
                      ...captureDraft.input,
                      priority: event.target.value as WorkPriority,
                    },
                  })
                }
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <label className="capture-field">
                <span>Due date</span>
                <input
                  type="datetime-local"
                  value={captureDraft.input.dueAt ?? ""}
                  onChange={(event) =>
                    setCaptureDraft({
                      ...captureDraft,
                      input: { ...captureDraft.input, dueAt: event.target.value },
                    })
                  }
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={captureDraft.input.moneyRelated ?? false}
                  onChange={(event) =>
                    setCaptureDraft({
                      ...captureDraft,
                      input: { ...captureDraft.input, moneyRelated: event.target.checked },
                    })
                  }
                />
                Money related
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={captureDraft.input.quickAction ?? false}
                  onChange={(event) =>
                    setCaptureDraft({
                      ...captureDraft,
                      input: { ...captureDraft.input, quickAction: event.target.checked },
                    })
                  }
                />
                Quick action
              </label>
              <input
                type="number"
                min="1"
                value={captureDraft.input.estimatedMinutes ?? ""}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: {
                      ...captureDraft.input,
                      estimatedMinutes: event.target.value ? Number(event.target.value) : undefined,
                    },
                  })
                }
                placeholder="Estimated minutes"
              />
              <select
                value={captureDraft.input.waitingOnPersonId ?? ""}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: {
                      ...captureDraft.input,
                      waitingOnPersonId: event.target.value,
                    },
                  })
                }
              >
                <option value="">Not waiting on anyone</option>
                {snapshot.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    Waiting on {person.name}
                  </option>
                ))}
              </select>
            </>
          ) : captureDraft.intent === "mission" ? (
            <>
              <input
                value={captureDraft.input.title}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: { ...captureDraft.input, title: event.target.value },
                  })
                }
                placeholder="Mission title"
              />
              <textarea
                value={captureDraft.input.summary ?? ""}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: { ...captureDraft.input, summary: event.target.value },
                  })
                }
                placeholder="Mission summary"
              />
              <label className="capture-field">
                <span>Due date, optional</span>
                <input
                  type="datetime-local"
                  value={captureDraft.input.dueAt ?? ""}
                  onChange={(event) =>
                    setCaptureDraft({
                      ...captureDraft,
                      input: { ...captureDraft.input, dueAt: event.target.value },
                    })
                  }
                />
              </label>
            </>
          ) : (
            <>
              <input
                value={captureDraft.input.title}
                onChange={(event) =>
                  setCaptureDraft({
                    ...captureDraft,
                    input: { ...captureDraft.input, title: event.target.value },
                  })
                }
                placeholder="Appointment title"
              />
              <label className="capture-field">
                <span>Start date and time</span>
                <input
                  type="datetime-local"
                  value={captureDraft.input.startsAt}
                  onChange={(event) =>
                    setCaptureDraft({
                      ...captureDraft,
                      input: { ...captureDraft.input, startsAt: event.target.value },
                    })
                  }
                />
              </label>
              <label className="capture-field">
                <span>End date and time, optional</span>
                <input
                  type="datetime-local"
                  value={captureDraft.input.endsAt ?? ""}
                  onChange={(event) =>
                    setCaptureDraft({
                      ...captureDraft,
                      input: { ...captureDraft.input, endsAt: event.target.value },
                    })
                  }
                />
              </label>
            </>
          )}
          <div className="capture-confirmation-actions">
            <button type="button" onClick={() => void saveCaptureDraft()}>
              Save {captureDraft.intent}
            </button>
            <button
              type="button"
              onClick={() => {
                setCaptureDraft(null);
                setPendingCapture(null);
                setCaptureStatus("Capture canceled.");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {activeEditTitle ? (
        <aside className="details-drawer" aria-label={activeEditTitle}>
          <div className="details-header">
            <h3>{activeEditTitle}</h3>
            <button type="button" className="details-close" onClick={closeEditDrawer}>
              Close
            </button>
          </div>
          <p className="details-drawer-copy">
            Changes stay local until you press save.
          </p>
          <div className="details-body">
            <WorkEditPanels
              snapshot={snapshot}
              editingMission={editingMission}
              editingProject={editingProject}
              editingDeadline={editingDeadline}
              editingTodo={editingTodo}
              editingPerson={editingPerson}
              editingAppointment={editingAppointment}
              setEditingMission={setEditingMission}
              setEditingProject={setEditingProject}
              setEditingDeadline={setEditingDeadline}
              setEditingTodo={setEditingTodo}
              setEditingPerson={setEditingPerson}
              setEditingAppointment={setEditingAppointment}
              saveMissionEdit={saveMissionEdit}
              saveProjectEdit={saveProjectEdit}
              saveDeadlineEdit={saveDeadlineEdit}
              saveTodoEdit={saveTodoEdit}
              savePersonEdit={savePersonEdit}
              saveAppointmentEdit={saveAppointmentEdit}
            />
          </div>
        </aside>
      ) : null}

      <details className="form-section chat-import-section">
        <summary>
          <span>Import chat for review</span>
          <small>Paste one useful exchange; Praxis will route candidates to Review Inbox.</small>
        </summary>
        <form className="form-section-body chat-import-form" onSubmit={(event) => void importManualChatSnippet(event)}>
          <label className="capture-field">
            <span>Source</span>
            <select
              value={manualChatImportForm.sourceSystem}
              onChange={(event) =>
                setManualChatImportForm({
                  ...manualChatImportForm,
                  sourceSystem: event.target.value as ChatImportSourceSystem,
                })
              }
            >
              {CHAT_IMPORT_SOURCES.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>
          <label className="capture-field">
            <span>Conversation title</span>
            <input
              value={manualChatImportForm.conversationTitle}
              onChange={(event) =>
                setManualChatImportForm({
                  ...manualChatImportForm,
                  conversationTitle: event.target.value,
                })
              }
              placeholder="BDNC operations"
            />
          </label>
          <label className="capture-field">
            <span>Participants, comma-separated</span>
            <input
              value={manualChatImportForm.participants}
              onChange={(event) =>
                setManualChatImportForm({
                  ...manualChatImportForm,
                  participants: event.target.value,
                })
              }
              placeholder="Pedro, Scott"
            />
          </label>
          <label className="capture-field">
            <span>Pasted snippet</span>
            <textarea
              value={manualChatImportForm.snippet}
              onChange={(event) =>
                setManualChatImportForm({
                  ...manualChatImportForm,
                  snippet: event.target.value,
                })
              }
              placeholder="Can you send the revised proposal by Friday?"
            />
          </label>
          <div className="capture-confirmation-actions">
            <button type="submit" className="primary-action-button">
              Import For Review
            </button>
          </div>
          {chatImportStatus ? <p className="capture-status">{chatImportStatus}</p> : null}
        </form>
      </details>

      <details className="create-records-drawer">
        <summary>
          <span>Create records manually</span>
          <small>Natural language capture stays primary; forms are still here when needed.</small>
        </summary>
        <WorkCreationPanel
          snapshot={snapshot}
          missionForm={missionForm}
          projectForm={projectForm}
          personForm={personForm}
          todoForm={todoForm}
          deadlineForm={deadlineForm}
          appointmentForm={appointmentForm}
          setMissionForm={setMissionForm}
          setProjectForm={setProjectForm}
          setPersonForm={setPersonForm}
          setTodoForm={setTodoForm}
          setDeadlineForm={setDeadlineForm}
          setAppointmentForm={setAppointmentForm}
          createMission={createMission}
          createProject={createProject}
          createPerson={createPerson}
          createTodo={createTodo}
          createDeadline={createDeadline}
          createAppointment={createAppointment}
        />
      </details>
    </section>
  );
}
