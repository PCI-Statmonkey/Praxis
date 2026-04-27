import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import SettingsApp from './SettingsApp.tsx'
import './index.css'

const RootApp = new URLSearchParams(window.location.search).get('window') === 'settings'
  ? SettingsApp
  : App

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(String(message))
})
