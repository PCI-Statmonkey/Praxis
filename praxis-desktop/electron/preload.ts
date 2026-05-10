import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('praxis', {
  checklist: {
    loadState: () => ipcRenderer.invoke('checklist:loadState'),
    appendEvent: (event: unknown) => ipcRenderer.invoke('checklist:appendEvent', event),
    writeSnapshot: (state: unknown, lastEventIndex: number) =>
      ipcRenderer.invoke('checklist:writeSnapshot', state, lastEventIndex),
  },
  storage: {
    getOverview: () => ipcRenderer.invoke('storage:getOverview'),
    reindexMemory: () => ipcRenderer.invoke('storage:reindexMemory'),
  },
  skills: {
    getRegistry: () => ipcRenderer.invoke('skills:getRegistry'),
  },
  companion: {
    getSnapshot: () => ipcRenderer.invoke('companion:getSnapshot'),
    executeCommand: (input: unknown) => ipcRenderer.invoke('companion:executeCommand', input),
  },
  slack: {
    getStatus: () => ipcRenderer.invoke('slack:getStatus'),
    restart: () => ipcRenderer.invoke('slack:restart'),
    sendConnectionTest: () => ipcRenderer.invoke('slack:sendConnectionTest'),
    sendTestSuggestion: () => ipcRenderer.invoke('slack:sendTestSuggestion'),
  },
  settings: {
    getSnapshot: () => ipcRenderer.invoke('settings:getSnapshot'),
    openWindow: (input?: unknown) => ipcRenderer.invoke('settings:openWindow', input),
    onOpenTab: (callback: (tab: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, tab: unknown) => callback(tab)
      ipcRenderer.on('settings:openTab', listener)
      return () => ipcRenderer.off('settings:openTab', listener)
    },
    onUIUpdated: (callback: (settings: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, settings: unknown) => callback(settings)
      ipcRenderer.on('settings:uiUpdated', listener)
      return () => ipcRenderer.off('settings:uiUpdated', listener)
    },
    createCalendarConnection: (input: unknown) =>
      ipcRenderer.invoke('settings:createCalendarConnection', input),
    deleteCalendarConnection: (input: unknown) =>
      ipcRenderer.invoke('settings:deleteCalendarConnection', input),
    updateCalendarConnection: (input: unknown) =>
      ipcRenderer.invoke('settings:updateCalendarConnection', input),
    createEmailConnection: (input: unknown) =>
      ipcRenderer.invoke('settings:createEmailConnection', input),
    deleteEmailConnection: (input: unknown) =>
      ipcRenderer.invoke('settings:deleteEmailConnection', input),
    updateEmailConnection: (input: unknown) =>
      ipcRenderer.invoke('settings:updateEmailConnection', input),
    updateSlack: (input: unknown) => ipcRenderer.invoke('settings:updateSlack', input),
    updateCalendarAutoSync: (input: unknown) =>
      ipcRenderer.invoke('settings:updateCalendarAutoSync', input),
    updateAISettings: (input: unknown) => ipcRenderer.invoke('settings:updateAISettings', input),
    updateUISettings: (input: unknown) => ipcRenderer.invoke('settings:updateUISettings', input),
    checkOllamaModelAvailability: (input: unknown) =>
      ipcRenderer.invoke('settings:checkOllamaModelAvailability', input),
    updateGoogleOAuth: (input: unknown) => ipcRenderer.invoke('settings:updateGoogleOAuth', input),
    updateOutlookOAuth: (input: unknown) => ipcRenderer.invoke('settings:updateOutlookOAuth', input),
  },
  email: {
    getSnapshot: () => ipcRenderer.invoke('email:getSnapshot'),
    getGoogleOAuthReadiness: () => ipcRenderer.invoke('email:getGoogleOAuthReadiness'),
    getOutlookOAuthReadiness: () => ipcRenderer.invoke('email:getOutlookOAuthReadiness'),
    prepareGoogleOAuth: (input: unknown) => ipcRenderer.invoke('email:prepareGoogleOAuth', input),
    prepareOutlookOAuth: (input: unknown) => ipcRenderer.invoke('email:prepareOutlookOAuth', input),
    syncGoogle: (input: unknown) => ipcRenderer.invoke('email:syncGoogle', input),
    syncOutlook: (input: unknown) => ipcRenderer.invoke('email:syncOutlook', input),
    importMessages: (input: unknown) => ipcRenderer.invoke('email:importMessages', input),
    acceptSuggestion: (input: unknown) => ipcRenderer.invoke('email:acceptSuggestion', input),
    archiveSuggestion: (input: unknown) => ipcRenderer.invoke('email:archiveSuggestion', input),
    dismissSuggestion: (input: unknown) => ipcRenderer.invoke('email:dismissSuggestion', input),
    dismissContactSuggestion: (input: unknown) =>
      ipcRenderer.invoke('email:dismissContactSuggestion', input),
    restoreContactSuggestion: (input: unknown) =>
      ipcRenderer.invoke('email:restoreContactSuggestion', input),
    onGoogleOAuthUpdated: (callback: (update: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, update: unknown) => callback(update)
      ipcRenderer.on('email:gmailOAuthUpdated', listener)
      return () => ipcRenderer.off('email:gmailOAuthUpdated', listener)
    },
    onOutlookOAuthUpdated: (callback: (update: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, update: unknown) => callback(update)
      ipcRenderer.on('email:outlookOAuthUpdated', listener)
      return () => ipcRenderer.off('email:outlookOAuthUpdated', listener)
    },
    onAutoSyncUpdated: (callback: (update: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, update: unknown) => callback(update)
      ipcRenderer.on('email:autoSyncUpdated', listener)
      return () => ipcRenderer.off('email:autoSyncUpdated', listener)
    },
  },
  chat: {
    getSnapshot: () => ipcRenderer.invoke('chat:getSnapshot'),
    importConversation: (input: unknown) => ipcRenderer.invoke('chat:importConversation', input),
    acceptSuggestion: (input: unknown) => ipcRenderer.invoke('chat:acceptSuggestion', input),
    archiveSuggestion: (input: unknown) => ipcRenderer.invoke('chat:archiveSuggestion', input),
    dismissSuggestion: (input: unknown) => ipcRenderer.invoke('chat:dismissSuggestion', input),
  },
  projectTemplates: {
    getProposalSnapshot: () => ipcRenderer.invoke('projectTemplates:getProposalSnapshot'),
    getManagementSnapshot: () =>
      ipcRenderer.invoke('projectTemplates:getManagementSnapshot'),
    clearProposalState: (input: unknown) =>
      ipcRenderer.invoke('projectTemplates:clearProposalState', input),
    recordShown: (input: unknown) => ipcRenderer.invoke('projectTemplates:recordShown', input),
    dismissProposal: (input: unknown) =>
      ipcRenderer.invoke('projectTemplates:dismissProposal', input),
    snoozeProposal: (input: unknown) =>
      ipcRenderer.invoke('projectTemplates:snoozeProposal', input),
    rejectProposal: (input: unknown) =>
      ipcRenderer.invoke('projectTemplates:rejectProposal', input),
    neverSuggestProposal: (input: unknown) =>
      ipcRenderer.invoke('projectTemplates:neverSuggestProposal', input),
    saveProposal: (input: unknown) => ipcRenderer.invoke('projectTemplates:saveProposal', input),
    previewApply: (input: unknown) => ipcRenderer.invoke('projectTemplates:previewApply', input),
  },
  calendar: {
    importEvents: (input: unknown) => ipcRenderer.invoke('calendar:importEvents', input),
    getGoogleOAuthReadiness: () => ipcRenderer.invoke('calendar:getGoogleOAuthReadiness'),
    getOutlookOAuthReadiness: () => ipcRenderer.invoke('calendar:getOutlookOAuthReadiness'),
    prepareGoogleOAuth: (input: unknown) => ipcRenderer.invoke('calendar:prepareGoogleOAuth', input),
    prepareOutlookOAuth: (input: unknown) => ipcRenderer.invoke('calendar:prepareOutlookOAuth', input),
    syncGoogle: (input: unknown) => ipcRenderer.invoke('calendar:syncGoogle', input),
    syncOutlook: (input: unknown) => ipcRenderer.invoke('calendar:syncOutlook', input),
    autoSyncNow: (input: unknown) => ipcRenderer.invoke('calendar:autoSyncNow', input),
    onGoogleOAuthUpdated: (callback: (update: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, update: unknown) => callback(update)
      ipcRenderer.on('calendar:googleOAuthUpdated', listener)
      return () => ipcRenderer.off('calendar:googleOAuthUpdated', listener)
    },
    onOutlookOAuthUpdated: (callback: (update: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, update: unknown) => callback(update)
      ipcRenderer.on('calendar:outlookOAuthUpdated', listener)
      return () => ipcRenderer.off('calendar:outlookOAuthUpdated', listener)
    },
    onAutoSyncUpdated: (callback: (update: unknown) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, update: unknown) => callback(update)
      ipcRenderer.on('calendar:autoSyncUpdated', listener)
      return () => ipcRenderer.off('calendar:autoSyncUpdated', listener)
    },
  },
  brief: {
    getDaily: () => ipcRenderer.invoke('brief:getDaily'),
    getAppointmentReport: (input: unknown) =>
      ipcRenderer.invoke('brief:getAppointmentReport', input),
    getFocusReport: (input: unknown) => ipcRenderer.invoke('brief:getFocusReport', input),
  },
  assistant: {
    route: (input: unknown) => ipcRenderer.invoke('assistant:route', input),
    generateAIReview: (input: unknown) => ipcRenderer.invoke('assistant:generateAIReview', input),
    storeContext: (input: unknown) => ipcRenderer.invoke('assistant:storeContext', input),
    resolveContext: (input: unknown) => ipcRenderer.invoke('assistant:resolveContext', input),
    lookupPerson: (input: unknown) => ipcRenderer.invoke('assistant:lookupPerson', input),
    lookupWork: (input: unknown) => ipcRenderer.invoke('assistant:lookupWork', input),
  },
  capture: {
    naturalLanguage: (input: unknown) => ipcRenderer.invoke('capture:naturalLanguage', input),
    saveCandidate: (input: unknown) => ipcRenderer.invoke('capture:saveCandidate', input),
  },
  work: {
    getSnapshot: () => ipcRenderer.invoke('work:getSnapshot'),
    createMission: (input: unknown) => ipcRenderer.invoke('work:createMission', input),
    createProject: (input: unknown) => ipcRenderer.invoke('work:createProject', input),
    createPerson: (input: unknown) => ipcRenderer.invoke('work:createPerson', input),
    createPersonWorkLink: (input: unknown) => ipcRenderer.invoke('work:createPersonWorkLink', input),
    createTodo: (input: unknown) => ipcRenderer.invoke('work:createTodo', input),
    createAppointment: (input: unknown) => ipcRenderer.invoke('work:createAppointment', input),
    createDeadline: (input: unknown) => ipcRenderer.invoke('work:createDeadline', input),
    updateStatus: (input: unknown) => ipcRenderer.invoke('work:updateStatus', input),
    updateRecord: (input: unknown) => ipcRenderer.invoke('work:updateRecord', input),
    deleteRecord: (input: unknown) => ipcRenderer.invoke('work:deleteRecord', input),
    deletePersonWorkLink: (input: unknown) => ipcRenderer.invoke('work:deletePersonWorkLink', input),
  },
  timeBlocks: {
    list: (input?: unknown) => ipcRenderer.invoke('timeBlocks:list', input),
    create: (input: unknown) => ipcRenderer.invoke('timeBlocks:create', input),
    update: (input: unknown) => ipcRenderer.invoke('timeBlocks:update', input),
    delete: (input: unknown) => ipcRenderer.invoke('timeBlocks:delete', input),
  },
  plan: {
    generateDraft: (input: unknown) => ipcRenderer.invoke('plan:generateDraft', input),
  },
})
