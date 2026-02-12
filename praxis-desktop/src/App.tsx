import { useState } from "react";
import "./App.css";
import {
  callGetStatus,
  callPersistenceGetDbStatus,
  callPing,
  callSyncGetStatus,
} from "./ipcSmoke";

export default function App() {
  const [ipcOutput, setIpcOutput] = useState<string>("");
  const [ipcError, setIpcError] = useState<string>("");

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
      </section>
    </div>
  );
}
