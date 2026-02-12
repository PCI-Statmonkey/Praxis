import { useState } from "react";
import "./App.css";
import {
  callGetStatus,
  callPersistenceGetDbStatus,
  callPing,
  callSyncGetStatus,
} from "./ipcSmoke";
import {
  callMissionsArchive,
  callMissionsCreate,
  callMissionsGet,
  callMissionsList,
  callMissionsUpdate,
} from "./missionsIpc";

export default function App() {
  const [ipcOutput, setIpcOutput] = useState<string>("");
  const [ipcError, setIpcError] = useState<string>("");
  const [missionOutput, setMissionOutput] = useState<string>("");
  const [missionError, setMissionError] = useState<string>("");
  const [missions, setMissions] = useState<Array<{ id: string; title?: string; status?: string }>>(
    []
  );
  const [selectedMissionId, setSelectedMissionId] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [createTitle, setCreateTitle] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [updateTitle, setUpdateTitle] = useState<string>("");
  const [updateDescription, setUpdateDescription] = useState<string>("");

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setIpcError("");
    try {
      const result = await fn();
      setIpcOutput(`${label}\n${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      const err = error as Error;
      setIpcError(err?.message ?? "IPC error");
    }
  };

  const runMission = async (label: string, fn: () => Promise<unknown>) => {
    setMissionError("");
    try {
      const result = await fn();
      setMissionOutput(`${label}\n${JSON.stringify(result, null, 2)}`);
      if (result && typeof result === "object" && "ok" in result && (result as any).ok) {
        return (result as any).data;
      }
    } catch (error) {
      const err = error as Error;
      setMissionError(err?.message ?? "Mission IPC error");
    }
    return null;
  };

  const handleListMissions = async () => {
    const data = await runMission("missionsList()", () => callMissionsList(includeArchived));
    if (Array.isArray(data)) {
      setMissions(data);
    }
  };

  const handleGetMission = async (id: string) => {
    await runMission("missionsGet()", () => callMissionsGet(id));
  };

  const handleCreateMission = async () => {
    if (!createTitle.trim()) {
      setMissionError("Title is required");
      return;
    }
    const data = await runMission("missionsCreate()", () =>
      callMissionsCreate({ title: createTitle, description: createDescription || undefined })
    );
    if (data && typeof data === "object") {
      setMissions((prev) => [data as { id: string; title?: string; status?: string }, ...prev]);
    }
  };

  const handleUpdateMission = async () => {
    if (!selectedMissionId) {
      setMissionError("Select a mission to update");
      return;
    }
    const patch: { title?: string; description?: string } = {};
    if (updateTitle.trim()) patch.title = updateTitle;
    if (updateDescription.trim()) patch.description = updateDescription;
    await runMission("missionsUpdate()", () => callMissionsUpdate(selectedMissionId, patch));
  };

  const handleArchiveMission = async () => {
    if (!selectedMissionId) {
      setMissionError("Select a mission to archive");
      return;
    }
    await runMission("missionsArchive()", () => callMissionsArchive(selectedMissionId));
  };

  return (
    <div className="app-shell">
      <section className="panel left">
        <h2>Project Stack</h2>
      </section>
      <section className="panel center">
        <h2>Today Timeline</h2>
      </section>
      <section className="panel right">
        <h2>Morning Plan</h2>
      </section>
      <section className="panel bottom">
        <div className="bottom-grid">
          <div className="bottom-card">
            <h2>IPC Smoke</h2>
            <div className="ipc-smoke-controls">
              <button onClick={() => run("ping()", callPing)}>ping</button>
              <button onClick={() => run("getStatus()", callGetStatus)}>getStatus</button>
              <button onClick={() => run("persistenceGetDbStatus()", callPersistenceGetDbStatus)}>
                persistenceGetDbStatus
              </button>
              <button onClick={() => run("syncGetStatus()", callSyncGetStatus)}>
                syncGetStatus
              </button>
            </div>
            {ipcError ? (
              <div className="ipc-output error">{ipcError}</div>
            ) : (
              <pre className="ipc-output">{ipcOutput || "No IPC calls yet."}</pre>
            )}
          </div>
          <div className="bottom-card">
            <h2>Missions</h2>
            <div className="mission-controls">
              <div className="mission-row">
                <button onClick={handleListMissions}>List Missions</button>
                <label className="mission-toggle">
                  <input
                    type="checkbox"
                    checked={includeArchived}
                    onChange={(event) => setIncludeArchived(event.target.checked)}
                  />
                  Include archived
                </label>
              </div>
              <div className="mission-row">
                <select
                  value={selectedMissionId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedMissionId(nextId);
                    if (nextId) {
                      void handleGetMission(nextId);
                    }
                  }}
                >
                  <option value="">Select mission</option>
                  {missions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.title ?? mission.id} {mission.status === "archived" ? "(archived)" : ""}
                    </option>
                  ))}
                </select>
                <button onClick={() => selectedMissionId && handleGetMission(selectedMissionId)}>
                  Get
                </button>
              </div>
              <div className="mission-form">
                <input
                  type="text"
                  placeholder="Title"
                  value={createTitle}
                  onChange={(event) => setCreateTitle(event.target.value)}
                />
                <textarea
                  placeholder="Description"
                  value={createDescription}
                  onChange={(event) => setCreateDescription(event.target.value)}
                />
                <button onClick={handleCreateMission}>Create</button>
              </div>
              <div className="mission-form">
                <input
                  type="text"
                  placeholder="Update title"
                  value={updateTitle}
                  onChange={(event) => setUpdateTitle(event.target.value)}
                />
                <textarea
                  placeholder="Update description"
                  value={updateDescription}
                  onChange={(event) => setUpdateDescription(event.target.value)}
                />
                <div className="mission-row">
                  <button onClick={handleUpdateMission}>Update</button>
                  <button onClick={handleArchiveMission}>Archive</button>
                </div>
              </div>
            </div>
            {missionError ? (
              <div className="ipc-output error">{missionError}</div>
            ) : (
              <pre className="ipc-output">{missionOutput || "No mission calls yet."}</pre>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
