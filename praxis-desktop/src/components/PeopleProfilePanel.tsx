import type { FormEvent, ReactNode } from "react";
import type {
  PersonContactSuggestion,
  PersonContactSuggestionField,
} from "../../shared/personContactSuggestion";
import type {
  CreatePersonWorkLinkInput,
  EditableWorkEntityKind,
  MissionRecord,
  PersonRecord,
  ProjectRecord,
  WorkSnapshot,
  WorkStatus,
} from "../../shared/workModel";

type PeopleProfilePanelProps = {
  snapshot: WorkSnapshot;
  contactSuggestions: PersonContactSuggestion[];
  dismissedContactSuggestions: Array<PersonContactSuggestion & { dismissedAt: string }>;
  selectedPersonId: string;
  personLinkForm: CreatePersonWorkLinkInput;
  formatDateTime: (value: string | null) => string;
  setSelectedPersonId: (id: string) => void;
  setEditingPerson: (person: PersonRecord | null) => void;
  setPersonLinkForm: (form: CreatePersonWorkLinkInput) => void;
  createPersonLink: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  acceptSuggestedContact: (
    personId: string,
    field: PersonContactSuggestionField,
    inferredValue: string
  ) => Promise<void>;
  dismissContactSuggestion: (
    personId: string,
    field: PersonContactSuggestionField,
    inferredValue: string
  ) => Promise<void>;
  restoreContactSuggestion: (
    personId: string,
    field: PersonContactSuggestionField,
    inferredValue: string
  ) => Promise<void>;
  deletePersonLink: (id: string) => Promise<void>;
  deleteRecord: (entityKind: EditableWorkEntityKind, id: string) => Promise<void>;
  renderTodoContextBadges: (projectId: string | null) => ReactNode;
  renderStatusActions: (
    entityKind: "mission" | "project" | "todo" | "deadline",
    id: string,
    status: WorkStatus
  ) => ReactNode;
};

const plural = (count: number, label: string) => `${count} ${label}${count === 1 ? "" : "s"}`;

export function PeopleProfilePanel({
  snapshot,
  contactSuggestions,
  dismissedContactSuggestions,
  selectedPersonId,
  personLinkForm,
  formatDateTime,
  setSelectedPersonId,
  setEditingPerson,
  setPersonLinkForm,
  createPersonLink,
  acceptSuggestedContact,
  dismissContactSuggestion,
  restoreContactSuggestion,
  deletePersonLink,
  deleteRecord,
  renderTodoContextBadges,
  renderStatusActions,
}: PeopleProfilePanelProps) {
  const fieldLabel = (field: PersonContactSuggestionField) => {
    if (field === "billingAddress") {
      return "Billing address";
    }
    if (field === "phone") {
      return "Phone";
    }
    return "Email";
  };

  const fieldActionLabel = (field: PersonContactSuggestionField) =>
    field === "billingAddress"
      ? "Save Billing Address"
      : field === "phone"
        ? "Save Phone"
        : "Save Email";

  const projectById = new Map(snapshot.projects.map((project) => [project.id, project]));
  const missionById = new Map(snapshot.missions.map((mission) => [mission.id, mission]));
  const selectedPerson =
    snapshot.people.find((person) => person.id === selectedPersonId) ?? snapshot.people[0] ?? null;
  const selectedPersonLinks = selectedPerson
    ? snapshot.personWorkLinks
        .filter((link) => link.personId === selectedPerson.id)
        .sort((a, b) => a.relationship.localeCompare(b.relationship))
    : [];
  const selectedPersonTodos = selectedPerson
    ? snapshot.todos.filter(
        (todo) => todo.waitingOnPersonId === selectedPerson.id && todo.status !== "completed"
      )
    : [];
  const selectedPersonProjects = selectedPerson
    ? [
        ...new Map(
          selectedPersonLinks
            .filter((link) => link.entityKind === "project")
            .map((link) => [link.entityId, projectById.get(link.entityId)])
            .filter((entry): entry is [string, ProjectRecord] => Boolean(entry[1]))
        ).values(),
      ]
    : [];
  const selectedPersonContactSuggestions = selectedPerson
    ? contactSuggestions
        .filter((suggestion) => suggestion.personId === selectedPerson.id)
        .sort((a, b) => a.field.localeCompare(b.field))
    : [];
  const selectedPersonDismissedSuggestions = selectedPerson
    ? dismissedContactSuggestions
        .filter((suggestion) => suggestion.personId === selectedPerson.id)
        .sort(
          (a, b) =>
            new Date(b.dismissedAt).getTime() - new Date(a.dismissedAt).getTime()
        )
    : [];
  const selectedPersonMissions = selectedPerson
    ? [
        ...new Map(
          selectedPersonLinks
            .filter((link) => link.entityKind === "mission")
            .map((link) => [link.entityId, missionById.get(link.entityId)])
            .filter((entry): entry is [string, MissionRecord] => Boolean(entry[1]))
        ).values(),
      ]
    : [];

  return (
    <>
      <h3>People</h3>
      {snapshot.people.length > 0 ? (
        <>
          <div className="focus-row">
            <select
              value={selectedPerson?.id ?? ""}
              onChange={(event) => setSelectedPersonId(event.target.value)}
            >
              {snapshot.people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            {selectedPerson ? (
              <button type="button" onClick={() => setEditingPerson(selectedPerson)}>
                Edit
              </button>
            ) : null}
          </div>

          {selectedPerson ? (
            <article className="person-profile">
              <h4>{selectedPerson.name}</h4>
              <p>
                {selectedPerson.aliases.length > 0 ? (
                  <span className="badge">aka: {selectedPerson.aliases.join(", ")}</span>
                ) : null}
                {selectedPerson.roleSummary ? (
                  <span className="badge">{selectedPerson.roleSummary}</span>
                ) : null}
                {selectedPerson.markdownPath ? (
                  <span className="badge">memory/{selectedPerson.markdownPath}</span>
                ) : null}
              </p>

              <div className="profile-grid">
                <div>
                  <h5>Contact</h5>
                  <p>Email: {selectedPerson.email ?? "not saved"}</p>
                  <p>Phone: {selectedPerson.phone ?? "not saved"}</p>
                  <p>Billing: {selectedPerson.billingAddress ?? "not saved"}</p>
                  {selectedPersonContactSuggestions.length > 0 ? (
                    <div className="brief-card">
                      <h5>Suggested Contact Details</h5>
                      <ul>
                        {selectedPersonContactSuggestions.map((suggestion) => (
                          <li
                            key={`${suggestion.personId}:${suggestion.field}:${suggestion.inferredValue}`}
                            className="item"
                          >
                            <strong>{fieldLabel(suggestion.field)}:</strong> {suggestion.inferredValue}
                            <span className="badge waiting-badge">
                              confidence: {suggestion.confidence.toFixed(2)}
                            </span>
                            <div className="brief-path">
                              Seen in {suggestion.messageCount} synced email
                              {suggestion.messageCount === 1 ? "" : "s"}, latest on{" "}
                              {formatDateTime(suggestion.lastSeenAt)}.
                            </div>
                            <div className="brief-path">
                              Latest subject: {suggestion.latestSubject}
                            </div>
                            <div className="capture-confirmation-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  void acceptSuggestedContact(
                                    selectedPerson.id,
                                    suggestion.field,
                                    suggestion.inferredValue
                                  )
                                }
                              >
                                {fieldActionLabel(suggestion.field)}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  void dismissContactSuggestion(
                                    selectedPerson.id,
                                    suggestion.field,
                                    suggestion.inferredValue
                                  )
                                }
                              >
                                Dismiss Suggestion
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {selectedPersonDismissedSuggestions.length > 0 ? (
                    <div className="brief-card">
                      <h5>Dismissed Suggestions</h5>
                      <ul>
                        {selectedPersonDismissedSuggestions.map((suggestion) => (
                          <li
                            key={`${suggestion.personId}:${suggestion.field}:${suggestion.inferredValue}`}
                            className="item"
                          >
                            <strong>{fieldLabel(suggestion.field)}:</strong> {suggestion.inferredValue}
                            <span className="badge waiting-badge">
                              dismissed {formatDateTime(suggestion.dismissedAt)}
                            </span>
                            <span className="badge">
                              confidence: {suggestion.confidence.toFixed(2)}
                            </span>
                            <div className="brief-path">
                              Latest subject: {suggestion.latestSubject}
                            </div>
                            <div className="capture-confirmation-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  void restoreContactSuggestion(
                                    selectedPerson.id,
                                    suggestion.field,
                                    suggestion.inferredValue
                                  )
                                }
                              >
                                Restore Suggestion
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div>
                  <h5>Relationship</h5>
                  <p>{plural(selectedPersonProjects.length, "project link")}</p>
                  <p>{plural(selectedPersonMissions.length, "mission link")}</p>
                  <p>{plural(selectedPersonTodos.length, "active waiting-on todo")}</p>
                </div>
              </div>

              {selectedPerson.notes ? (
                <>
                  <h5>Notes</h5>
                  <p>{selectedPerson.notes}</p>
                </>
              ) : null}

              <h5>Add Relationship</h5>
              <form className="inline-form" onSubmit={(event) => void createPersonLink(event)}>
                <select
                  value={personLinkForm.relationship}
                  onChange={(event) =>
                    setPersonLinkForm({ ...personLinkForm, relationship: event.target.value })
                  }
                >
                  <option value="related">Related</option>
                  <option value="client">Client</option>
                  <option value="vendor">Vendor</option>
                  <option value="billing_contact">Billing contact</option>
                  <option value="gm">GM</option>
                  <option value="stakeholder">Stakeholder</option>
                  <option value="waiting_on">Waiting on</option>
                </select>
                <select
                  value={personLinkForm.entityKind}
                  onChange={(event) =>
                    setPersonLinkForm({
                      ...personLinkForm,
                      entityKind: event.target.value as "mission" | "project",
                      entityId: "",
                    })
                  }
                >
                  <option value="project">Project</option>
                  <option value="mission">Mission</option>
                </select>
                <select
                  value={personLinkForm.entityId}
                  onChange={(event) =>
                    setPersonLinkForm({ ...personLinkForm, entityId: event.target.value })
                  }
                >
                  <option value="">Choose {personLinkForm.entityKind}</option>
                  {(personLinkForm.entityKind === "project"
                    ? snapshot.projects
                    : snapshot.missions
                  ).map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.title}
                    </option>
                  ))}
                </select>
                <button type="submit">Link</button>
              </form>

              <h5>Relationships</h5>
              {selectedPersonLinks.length > 0 ? (
                <ul>
                  {selectedPersonLinks.map((link) => (
                    <li key={link.id} className="item">
                      {link.relationship}
                      <span className="badge">{link.entityKind}</span>
                      <span className="badge">
                        {link.entityKind === "mission"
                          ? missionById.get(link.entityId)?.title ?? "Unknown mission"
                          : projectById.get(link.entityId)?.title ?? "Unknown project"}
                      </span>
                      <span className="badge">{link.sourceKind ?? "manual"}</span>
                      <span className="inline-actions">
                        <button type="button" onClick={() => void deletePersonLink(link.id)}>
                          Remove
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No explicit relationships yet.</p>
              )}

              <h5>Projects</h5>
              {selectedPersonProjects.length > 0 ? (
                <ul>
                  {selectedPersonProjects.map((project) => (
                    <li key={project.id} className="item">
                      {project.title}
                      <span className="badge">{project.status}</span>
                      {project.dueAt ? (
                        <span className="badge urgent-badge">{formatDateTime(project.dueAt)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No linked projects yet.</p>
              )}

              <h5>Missions</h5>
              {selectedPersonMissions.length > 0 ? (
                <ul>
                  {selectedPersonMissions.map((mission) => (
                    <li key={mission.id} className="item">
                      {mission.title}
                      <span className="badge">{mission.status}</span>
                      {mission.dueAt ? (
                        <span className="badge urgent-badge">{formatDateTime(mission.dueAt)}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No linked missions yet.</p>
              )}

              <h5>Waiting On</h5>
              {selectedPersonTodos.length > 0 ? (
                <ul>
                  {selectedPersonTodos.map((todo) => (
                    <li key={todo.id} className="item">
                      {todo.title}
                      <span className="badge">{todo.priority}</span>
                      {renderTodoContextBadges(todo.projectId)}
                      {todo.dueAt ? (
                        <span className="badge urgent-badge">{formatDateTime(todo.dueAt)}</span>
                      ) : null}
                      {renderStatusActions("todo", todo.id, todo.status)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No active todos are waiting on this person.</p>
              )}

              <div className="capture-confirmation-actions">
                <button type="button" onClick={() => setEditingPerson(selectedPerson)}>
                  Edit person
                </button>
                <button
                  type="button"
                  onClick={() => void deleteRecord("person", selectedPerson.id)}
                >
                  Delete person
                </button>
              </div>
            </article>
          ) : null}
        </>
      ) : (
        <p>No people saved yet.</p>
      )}
    </>
  );
}
