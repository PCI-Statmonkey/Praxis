import { app, BrowserWindow, ipcMain, Menu, Tray, type MenuItemConstructorOptions } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { ChecklistEvent } from '../shared/persistence/checklistEvents'
import type { MasterChecklistState } from '../shared/persistence/masterChecklistTypes'
import type { ImportCalendarEventsInput } from '../shared/calendarImport'
import type { StartCalendarOAuthInput } from '../shared/calendarOAuth'
import type {
  TimeBlockPublishConfirmRequest,
  TimeBlockPublishPreviewRequest,
} from '../shared/calendarWriteback'
import type { StartEmailOAuthInput } from '../shared/emailOAuth'
import type { SyncGoogleCalendarInput } from '../shared/googleCalendarSync'
import type { SyncGmailEmailInput } from '../shared/gmailEmailSync'
import type { SyncOutlookEmailInput } from '../shared/outlookEmailSync'
import type { SyncOutlookCalendarInput } from '../shared/outlookCalendarSync'
import { closePraxisDatabase, getStorageOverview, initializePraxisDatabase } from './praxisDb'
import { repairMemorySystem } from './memoryRepair'
import { reindexMemoryDocuments } from './memoryReindex'
import { checkStorageIntegrity } from './storageIntegrity'
import { getSkillRegistrySnapshot } from './skillRegistry'
import { getCompanionSnapshot } from './companionSnapshot'
import { writeRainmeterSnapshot } from './rainmeterSnapshot'
import { executeCompanionCommand } from './companionCommand'
import type { CompanionCommandRequest } from '../shared/companionCommand'
import type {
  CaptureRequest,
  SaveCaptureCandidateRequest,
} from '../shared/naturalLanguageCapture'
import {
  resolveAssistantAIReviewGenerateMode,
  type AssistantAIReviewGenerateRequest,
  type AssistantRouteRequest,
} from '../shared/assistantRouter'
import type {
  ResolveAssistantContextInput,
  StoreAssistantContextInput,
} from '../shared/assistantContext'
import type { PersonLookupRequest } from '../shared/personLookup'
import type { WorkLookupRequest } from '../shared/workLookup'
import type {
  CreateAppointmentInput,
  CreateDeadlineInput,
  CreateMissionInput,
  CreatePersonInput,
  CreatePersonWorkLinkInput,
  CreateProjectInput,
  CreateTodoInput,
  DeleteWorkRecordInput,
  DeletePersonWorkLinkInput,
  UpdateWorkRecordInput,
  UpdateWorkStatusInput,
} from '../shared/workModel'
import type {
  ClearProjectTemplateProposalStateInput,
  ProjectTemplateApplyConfirmInput,
  ProjectTemplateProposalActionInput,
  ProjectTemplateProposalSaveInput,
  ProjectTemplateProposalShownInput,
} from '../shared/projectTemplateProposals'
import {
  clearProjectTemplateProposalStateForReview,
  confirmApplyProjectTemplateForReview,
  dismissProjectTemplateProposalForReview,
  getProjectTemplateManagementSnapshot,
  getProjectTemplateProposalSnapshot,
  neverSuggestProjectTemplateProposalForReview,
  previewApplyProjectTemplateForReview,
  recordProjectTemplateProposalsShownForReview,
  rejectProjectTemplateProposalForReview,
  saveProjectTemplateProposalForReview,
  snoozeProjectTemplateProposalForReview,
} from './projectTemplateProposalRepository'
import type {
  CreateTimeBlockInput,
  DeleteTimeBlockInput,
  GenerateDraftPlanRequest,
  ListTimeBlocksInput,
  UpdateTimeBlockInput,
} from '../shared/timeBlocking'
import type {
  CheckOllamaModelAvailabilityInput,
  CreateCalendarConnectionInput,
  DeleteCalendarConnectionInput,
  CreateEmailConnectionInput,
  DeleteEmailConnectionInput,
  UpdateAiSettingsInput,
  UpdatePresenceSettingsInput,
  UpdateUiSettingsInput,
  UpdateCalendarAutoSyncSettingsInput,
  UpdateCalendarConnectionInput,
  UpdateEmailConnectionInput,
  UpdateGoogleOAuthSettingsInput,
  UpdateOutlookOAuthSettingsInput,
  UpdateSlackSettingsInput,
  UiSettings,
} from '../shared/settingsModel'
import { resolvePresenceSettings } from '../shared/settingsModel'
import { buildPresenceDisplayStatus } from '../shared/presenceStatus'
import type {
  AcceptEmailSuggestionInput,
  ArchiveEmailSuggestionInput,
  DismissEmailSuggestionInput,
  ImportEmailMessagesInput,
} from '../shared/emailModel'
import type {
  DismissPersonContactSuggestionInput,
  RestorePersonContactSuggestionInput,
} from '../shared/personContactSuggestion'
import {
  createAppointment,
  createMission,
  createPerson,
  createPersonWorkLink,
  createProject,
  createStandaloneDeadline,
  createTodo,
  deleteWorkRecord,
  deletePersonWorkLink,
  getWorkSnapshot,
  updateWorkRecord,
  updateWorkStatus,
} from './workRepository'
import {
  appendChecklistEvent,
  loadChecklistState,
  writeChecklistSnapshot,
} from './checklistEventLog'
import {
  createTimeBlock,
  deleteTimeBlock,
  getTimeBlockSnapshot,
  updateTimeBlock,
} from './timeBlockRepository'
import { generateLocalPlanDraft } from './planDraftService'
import { generateDailyBrief, generateFocusReport } from './dailyBrief'
import { generateAppointmentReport } from './appointmentReport'
import { importCalendarEvents } from './calendarImport'
import {
  confirmTimeBlockPublishRequest,
  previewTimeBlockPublish,
} from './calendarWritebackService'
import { captureNaturalLanguage, saveCaptureCandidate } from './naturalLanguageCapture'
import {
  createCalendarConnection,
  createEmailConnection,
  deleteCalendarConnection,
  deleteEmailConnection,
  getSettingsSnapshot,
  updateCalendarConnection,
  updateEmailConnection,
  updateAiSettings,
  updateUiSettings,
  updateGoogleOAuthSettings,
  updateCalendarAutoSyncSettings,
  updateOutlookOAuthSettings,
  updateSlackSettings,
  getUiSettings,
  getPresenceSettings,
  getCalendarAutoSyncSettings,
  updatePresenceSettings,
} from './settingsRepository'
import { checkOllamaModelAvailability } from './ollamaProbe'
import {
  acceptEmailSuggestion,
  archiveEmailSuggestion,
  dismissPersonContactSuggestion,
  dismissEmailSuggestion,
  getEmailSnapshot,
  importEmailMessages,
  restorePersonContactSuggestion,
} from './emailRepository'
import {
  autoSyncEmailConnection,
  autoSyncReadyEmailConnections,
} from './emailAutoSync'
import { routeAssistantRequest } from './assistantRouter'
import {
  buildLocalAIReviewResponse,
  toAssistantAIReviewGenerateResult,
} from './aiReviewService'
import {
  resolveAssistantContextReply,
  storeAssistantContext,
} from './assistantContextRepository'
import { lookupPerson } from './personLookup'
import { lookupWork } from './workLookup'
import {
  getSlackAdapterStatus,
  restartSlackAdapter,
  sendSlackConnectionTest,
  sendSlackTestSuggestion,
  startSlackAdapter,
  stopSlackAdapter,
} from './slackAdapter'
import {
  getGoogleCalendarOAuthReadiness,
  onGoogleCalendarOAuthUpdate,
  prepareGoogleCalendarOAuth,
} from './googleCalendarOAuth'
import {
  getGmailOAuthReadiness,
  onGmailOAuthUpdate,
  prepareGmailOAuth,
} from './gmailEmailOAuth'
import { syncGmailInbox } from './gmailEmailSync'
import {
  getOutlookEmailOAuthReadiness,
  onOutlookEmailOAuthUpdate,
  prepareOutlookEmailOAuth,
} from './outlookEmailOAuth'
import { syncOutlookInbox } from './outlookEmailSync'
import { syncGoogleCalendar } from './googleCalendarSync'
import {
  getOutlookCalendarOAuthReadiness,
  onOutlookCalendarOAuthUpdate,
  prepareOutlookCalendarOAuth,
} from './outlookCalendarOAuth'
import { syncOutlookCalendar } from './outlookCalendarSync'
import {
  autoSyncCalendarConnection,
  autoSyncReadyCalendars,
} from './calendarAutoSync'
import type {
  CalendarAutoSyncRequest,
  CalendarAutoSyncUpdate,
} from '../shared/calendarAutoSync'
import type { AppointmentReportRequest } from '../shared/appointmentReport'
import type { EmailAutoSyncUpdate } from '../shared/emailAutoSync'
import type { ImportChatConversationInput } from '../shared/chatImport'
import {
  acceptChatSuggestion,
  archiveChatSuggestion,
  dismissChatSuggestion,
  getChatImportSnapshot,
  importChatConversation,
} from './chatImportRepository'
import type {
  AcceptChatSuggestionInput,
  ArchiveChatSuggestionInput,
  DismissChatSuggestionInput,
} from '../shared/chatImport'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
const APP_ROOT = path.join(__dirname, '..')
process.env.APP_ROOT = APP_ROOT

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const vitePublic = VITE_DEV_SERVER_URL ? path.join(APP_ROOT, 'public') : RENDERER_DIST
process.env.VITE_PUBLIC = vitePublic
const appIconPath = path.join(vitePublic, 'praxis-icon.png')

let win: BrowserWindow | null
let settingsWindow: BrowserWindow | null
let tray: Tray | null = null
let calendarAutoSyncInterval: NodeJS.Timeout | null = null
let emailAutoSyncInterval: NodeJS.Timeout | null = null
let isExplicitQuit = false
let hasShutDown = false

type SettingsWindowTab =
  | 'google'
  | 'outlook'
  | 'appearance'
  | 'ai'
  | 'slack'
  | 'icsImport'
  | 'people'
  | 'templates'
  | 'storage'

const EMAIL_AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000
const isMemoryRepairMode = process.argv.includes('--memory-repair')
const isMemoryReindexMode = process.argv.includes('--memory-reindex')
const isStorageCheckMode = process.argv.includes('--storage-check')
const isSkillRegistryListMode = process.argv.includes('--skills-list')
const isCompanionSnapshotMode = process.argv.includes('--companion-snapshot')
const isRainmeterSnapshotMode = process.argv.includes('--rainmeter-snapshot')
const companionCommandArgIndex = process.argv.indexOf('--companion-command')
const isCompanionCommandMode = companionCommandArgIndex >= 0
const emailAcceptSuggestionArgIndex = process.argv.indexOf('--email-accept-suggestion')
const isEmailAcceptSuggestionMode = emailAcceptSuggestionArgIndex >= 0
const emailArchiveSuggestionArgIndex = process.argv.indexOf('--email-archive-suggestion')
const isEmailArchiveSuggestionMode = emailArchiveSuggestionArgIndex >= 0
const updateEmailConnectionArgIndex = process.argv.indexOf('--update-email-connection')
const isUpdateEmailConnectionMode = updateEmailConnectionArgIndex >= 0

const broadcastCalendarAutoSyncUpdate = (update: CalendarAutoSyncUpdate) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('calendar:autoSyncUpdated', update)
  })
}

const broadcastEmailAutoSyncUpdate = (update: EmailAutoSyncUpdate) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('email:autoSyncUpdated', update)
  })
}

const broadcastUiSettingsUpdate = (settings: UiSettings) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send('settings:uiUpdated', settings)
  })
}

const loadRendererWindow = (window: BrowserWindow, searchParams?: Record<string, string>) => {
  if (VITE_DEV_SERVER_URL) {
    const url = new URL(VITE_DEV_SERVER_URL)
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
    window.loadURL(url.toString())
    return
  }

  window.loadFile(path.join(RENDERER_DIST, 'index.html'), {
    query: searchParams,
  })
}

const isSettingsWindowTab = (value: unknown): value is SettingsWindowTab =>
  value === 'google' ||
  value === 'outlook' ||
  value === 'appearance' ||
  value === 'ai' ||
  value === 'slack' ||
  value === 'icsImport' ||
  value === 'people' ||
  value === 'templates' ||
  value === 'storage'

const openSettingsWindow = (tab?: SettingsWindowTab) => {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    if (tab) {
      settingsWindow.webContents.send('settings:openTab', tab)
    }
    return
  }

  settingsWindow = new BrowserWindow({
    title: 'Praxis Settings',
    icon: appIconPath,
    width: 980,
    height: 780,
    minWidth: 760,
    minHeight: 560,
    parent: win ?? undefined,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  settingsWindow.on('closed', () => {
    settingsWindow = null
  })

  loadRendererWindow(settingsWindow, {
    window: 'settings',
    ...(tab ? { settingsTab: tab } : {}),
  })
}

const shutdownPraxisRuntime = () => {
  if (hasShutDown) {
    return
  }
  hasShutDown = true
  stopCalendarAutoSyncInterval()
  stopEmailAutoSyncInterval()
  void stopSlackAdapter()
  closePraxisDatabase()
}

const quitPraxis = () => {
  isExplicitQuit = true
  shutdownPraxisRuntime()
  app.quit()
}

const showMainWindow = () => {
  if (!win || win.isDestroyed()) {
    createWindow()
    return
  }
  if (win.isMinimized()) {
    win.restore()
  }
  win.show()
  win.focus()
}

const integrationNeedsAttention = (integration: ReturnType<typeof getCompanionSnapshot>['integrations'][number]) =>
  integration.enabled &&
  (integration.authStatus !== 'ready' ||
    integration.syncStatus === 'blocked' ||
    integration.syncStatus === 'error')

const getTrayServiceAttentionCount = () =>
  getCompanionSnapshot().integrations.filter(integrationNeedsAttention).length

const formatQuietUntilTrayLabel = (quietUntil: string | null) =>
  quietUntil
    ? new Date(quietUntil).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

const buildTrayPresenceStatus = () => {
  const presence = getPresenceSettings()
  return buildPresenceDisplayStatus({
    presence,
    serviceAttentionCount: getTrayServiceAttentionCount(),
    quietUntilLabel: formatQuietUntilTrayLabel(presence.quietUntil),
  })
}

const formatPresenceTrayLabel = () => buildTrayPresenceStatus().label.replace(/^PRAXIS /, '')

const updatePresenceFromTray = (input: UpdatePresenceSettingsInput) => {
  updatePresenceSettings(input)
  updateTrayMenu()
  writeRainmeterSnapshot()
}

const updateTrayMenu = () => {
  if (!tray) {
    return
  }

  const presence = resolvePresenceSettings(getPresenceSettings())
  const quietUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const trayPresenceStatus = buildTrayPresenceStatus()
  tray.setToolTip(`${trayPresenceStatus.label} - ${trayPresenceStatus.detail}`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open PRAXIS',
        click: showMainWindow,
      },
      {
        label: `Presence: ${formatPresenceTrayLabel()}`,
        enabled: false,
      },
      {
        label: 'Pause nudges',
        enabled: presence.mode !== 'paused',
        click: () => updatePresenceFromTray({ mode: 'paused' }),
      },
      {
        label: 'Resume nudges',
        enabled: presence.mode !== 'active',
        click: () => updatePresenceFromTray({ mode: 'active' }),
      },
      {
        label: 'Quiet for 1 hour',
        click: () => updatePresenceFromTray({ mode: 'quiet_until', quietUntil }),
      },
      { type: 'separator' },
      {
        label: 'Sync Calendars Now',
        click: () => {
          void autoSyncReadyCalendars('user_request', broadcastCalendarAutoSyncUpdate).finally(() => {
            updateTrayMenu()
            writeRainmeterSnapshot()
          })
        },
      },
      {
        label: 'Settings',
        click: () => openSettingsWindow(),
      },
      { type: 'separator' },
      {
        label: 'Quit PRAXIS',
        click: quitPraxis,
      },
    ])
  )
}

const createTray = () => {
  if (tray || process.platform !== 'win32') {
    return
  }

  tray = new Tray(appIconPath)
  tray.on('click', showMainWindow)
  updateTrayMenu()
}

const buildApplicationMenu = () => {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Settings',
      submenu: [
          {
            label: 'Open Settings',
            accelerator: 'CommandOrControl+,',
            click: () => openSettingsWindow(),
          },
      ],
    },
    {
      label: 'Help',
      submenu: [
          {
            label: 'Praxis Setup Notes',
            click: () => openSettingsWindow(),
          },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

const startCalendarAutoSyncInterval = () => {
  if (calendarAutoSyncInterval) {
    return
  }

  const settings = getCalendarAutoSyncSettings()
  if (!settings.enabled) {
    return
  }

  calendarAutoSyncInterval = setInterval(() => {
    void autoSyncReadyCalendars('interval', broadcastCalendarAutoSyncUpdate)
  }, settings.intervalMinutes * 60 * 1000)
}

const stopCalendarAutoSyncInterval = () => {
  if (!calendarAutoSyncInterval) {
    return
  }
  clearInterval(calendarAutoSyncInterval)
  calendarAutoSyncInterval = null
}

const restartCalendarAutoSyncInterval = () => {
  stopCalendarAutoSyncInterval()
  startCalendarAutoSyncInterval()
}

const startEmailAutoSyncInterval = () => {
  if (emailAutoSyncInterval) {
    return
  }

  emailAutoSyncInterval = setInterval(() => {
    void autoSyncReadyEmailConnections('interval', broadcastEmailAutoSyncUpdate)
  }, EMAIL_AUTO_SYNC_INTERVAL_MS)
}

const stopEmailAutoSyncInterval = () => {
  if (!emailAutoSyncInterval) {
    return
  }
  clearInterval(emailAutoSyncInterval)
  emailAutoSyncInterval = null
}

function createWindow() {
  win = new BrowserWindow({
    icon: appIconPath,
    width: 1280,
    height: 800,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  loadRendererWindow(win)

  win.on('close', (event) => {
    if (isExplicitQuit || !getUiSettings().closeToTrayEnabled) {
      return
    }
    event.preventDefault()
    win?.hide()
    createTray()
  })

  win.on('closed', () => {
    win = null
  })

  win.maximize()
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (getUiSettings().closeToTrayEnabled && !isExplicitQuit) {
      createTray()
      return
    }
    shutdownPraxisRuntime()
    app.quit()
  }
})

app.on('before-quit', () => {
  isExplicitQuit = true
  shutdownPraxisRuntime()
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  initializePraxisDatabase()
  if (isMemoryRepairMode) {
    const report = repairMemorySystem()
    console.log(JSON.stringify(report, null, 2))
    closePraxisDatabase()
    app.quit()
    return
  }
  if (isMemoryReindexMode) {
    const report = reindexMemoryDocuments()
    console.log(JSON.stringify(report, null, 2))
    closePraxisDatabase()
    app.exit(report.ok ? 0 : 1)
    return
  }
  if (isStorageCheckMode) {
    const report = checkStorageIntegrity()
    console.log(JSON.stringify(report, null, 2))
    closePraxisDatabase()
    app.exit(report.ok ? 0 : 1)
    return
  }
  if (isSkillRegistryListMode) {
    const snapshot = getSkillRegistrySnapshot()
    console.log(JSON.stringify(snapshot, null, 2))
    closePraxisDatabase()
    app.exit(snapshot.ok ? 0 : 1)
    return
  }
  if (isCompanionSnapshotMode) {
    const snapshot = getCompanionSnapshot()
    console.log(JSON.stringify(snapshot, null, 2))
    closePraxisDatabase()
    app.exit(0)
    return
  }
  if (isRainmeterSnapshotMode) {
    const result = writeRainmeterSnapshot()
    console.log(JSON.stringify(result, null, 2))
    closePraxisDatabase()
    app.exit(0)
    return
  }
  if (isCompanionCommandMode) {
    const commandText = process.argv[companionCommandArgIndex + 1] ?? ''
    const command: CompanionCommandRequest = {
      text: commandText,
      confirmed: process.argv.includes('--confirm-companion-command'),
    }
    const result = executeCompanionCommand(command)
    console.log(JSON.stringify(result, null, 2))
    closePraxisDatabase()
    app.exit(0)
    return
  }
  if (isEmailAcceptSuggestionMode) {
    const suggestionId = process.argv[emailAcceptSuggestionArgIndex + 1] ?? ''
    const mode = process.argv[emailAcceptSuggestionArgIndex + 2] === 'project' ? 'project' : 'todo'
    const result = acceptEmailSuggestion({ suggestionId, mode })
    console.log(JSON.stringify(result, null, 2))
    closePraxisDatabase()
    app.exit(result.ok ? 0 : 1)
    return
  }
  if (isEmailArchiveSuggestionMode) {
    const suggestionId = process.argv[emailArchiveSuggestionArgIndex + 1] ?? ''
    const result = archiveEmailSuggestion({ suggestionId })
    console.log(JSON.stringify(result, null, 2))
    closePraxisDatabase()
    app.exit(result.ok ? 0 : 1)
    return
  }
  if (isUpdateEmailConnectionMode) {
    const id = process.argv[updateEmailConnectionArgIndex + 1] ?? ''
    const label = process.argv[updateEmailConnectionArgIndex + 2] ?? ''
    const accountRef = process.argv[updateEmailConnectionArgIndex + 3] ?? ''
    const snapshot = updateEmailConnection({ id, label, accountRef })
    console.log(JSON.stringify(snapshot.emailConnections.find((connection) => connection.id === id) ?? null, null, 2))
    closePraxisDatabase()
    app.exit(0)
    return
  }
  buildApplicationMenu()
  createTray()
  void startSlackAdapter()
  createWindow()
  onGoogleCalendarOAuthUpdate((update) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('calendar:googleOAuthUpdated', update)
    })
    if (update.ok) {
      void autoSyncCalendarConnection(
        'google',
        update.connectionId,
        'oauth',
        broadcastCalendarAutoSyncUpdate
      )
    }
  })
  onOutlookCalendarOAuthUpdate((update) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('calendar:outlookOAuthUpdated', update)
    })
    if (update.ok) {
      void autoSyncCalendarConnection(
        'outlook',
        update.connectionId,
        'oauth',
        broadcastCalendarAutoSyncUpdate
      )
    }
  })
  onGmailOAuthUpdate((update) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('email:gmailOAuthUpdated', update)
    })
    if (update.ok) {
      void autoSyncEmailConnection(
        'gmail',
        update.connectionId,
        'oauth',
        broadcastEmailAutoSyncUpdate
      )
    }
  })
  onOutlookEmailOAuthUpdate((update) => {
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('email:outlookOAuthUpdated', update)
    })
    if (update.ok) {
      void autoSyncEmailConnection(
        'outlook',
        update.connectionId,
        'oauth',
        broadcastEmailAutoSyncUpdate
      )
    }
  })
  void autoSyncReadyCalendars('startup', broadcastCalendarAutoSyncUpdate)
  void autoSyncReadyEmailConnections('startup', broadcastEmailAutoSyncUpdate)
  startCalendarAutoSyncInterval()
  startEmailAutoSyncInterval()
  writeRainmeterSnapshot()

  ipcMain.handle('checklist:loadState', async () => loadChecklistState())
  ipcMain.handle('checklist:appendEvent', async (_event, event: ChecklistEvent) => {
    await appendChecklistEvent(event)
    return { ok: true }
  })
  ipcMain.handle(
    'checklist:writeSnapshot',
    async (_event, state: MasterChecklistState, lastEventIndex: number) => {
      await writeChecklistSnapshot(state, lastEventIndex)
      return { ok: true }
    }
  )
  ipcMain.handle('storage:getOverview', async () => getStorageOverview())
  ipcMain.handle('storage:reindexMemory', async () => reindexMemoryDocuments())
  ipcMain.handle('skills:getRegistry', async () => getSkillRegistrySnapshot())
  ipcMain.handle('companion:getSnapshot', async () => getCompanionSnapshot())
  ipcMain.handle('companion:writeRainmeterSnapshot', async () => writeRainmeterSnapshot())
  ipcMain.handle('companion:executeCommand', async (_event, input: CompanionCommandRequest) =>
    executeCompanionCommand(input)
  )
  ipcMain.handle('slack:getStatus', async () => getSlackAdapterStatus())
  ipcMain.handle('slack:restart', async () => restartSlackAdapter())
  ipcMain.handle('slack:sendConnectionTest', async () => sendSlackConnectionTest())
  ipcMain.handle('slack:sendTestSuggestion', async () => sendSlackTestSuggestion())
  ipcMain.handle('settings:getSnapshot', async () => getSettingsSnapshot())
  ipcMain.handle('settings:openWindow', async (_event, input?: { tab?: unknown }) => {
    openSettingsWindow(isSettingsWindowTab(input?.tab) ? input.tab : undefined)
    return { ok: true }
  })
  ipcMain.handle(
    'settings:createCalendarConnection',
    async (_event, input: CreateCalendarConnectionInput) => createCalendarConnection(input)
  )
  ipcMain.handle(
    'settings:deleteCalendarConnection',
    async (_event, input: DeleteCalendarConnectionInput) => deleteCalendarConnection(input)
  )
  ipcMain.handle(
    'settings:updateCalendarConnection',
    async (_event, input: UpdateCalendarConnectionInput) => updateCalendarConnection(input)
  )
  ipcMain.handle(
    'settings:createEmailConnection',
    async (_event, input: CreateEmailConnectionInput) => createEmailConnection(input)
  )
  ipcMain.handle(
    'settings:deleteEmailConnection',
    async (_event, input: DeleteEmailConnectionInput) => deleteEmailConnection(input)
  )
  ipcMain.handle(
    'settings:updateEmailConnection',
    async (_event, input: UpdateEmailConnectionInput) => updateEmailConnection(input)
  )
  ipcMain.handle('settings:updateSlack', async (_event, input: UpdateSlackSettingsInput) =>
    updateSlackSettings(input)
  )
  ipcMain.handle(
    'settings:updateCalendarAutoSync',
    async (_event, input: UpdateCalendarAutoSyncSettingsInput) => {
      const snapshot = updateCalendarAutoSyncSettings(input)
      restartCalendarAutoSyncInterval()
      return snapshot
    }
  )
  ipcMain.handle('settings:updateAISettings', async (_event, input: UpdateAiSettingsInput) =>
    updateAiSettings(input)
  )
  ipcMain.handle('settings:updateUISettings', async (_event, input: UpdateUiSettingsInput) => {
    const snapshot = updateUiSettings(input)
    broadcastUiSettingsUpdate(snapshot.ui)
    updateTrayMenu()
    return snapshot
  })
  ipcMain.handle(
    'settings:updatePresence',
    async (_event, input: UpdatePresenceSettingsInput) => {
      const snapshot = updatePresenceSettings(input)
      updateTrayMenu()
      writeRainmeterSnapshot()
      return snapshot
    }
  )
  ipcMain.handle(
    'settings:checkOllamaModelAvailability',
    async (_event, input: CheckOllamaModelAvailabilityInput) =>
      checkOllamaModelAvailability(input)
  )
  ipcMain.handle(
    'settings:updateGoogleOAuth',
    async (_event, input: UpdateGoogleOAuthSettingsInput) => updateGoogleOAuthSettings(input)
  )
  ipcMain.handle(
    'settings:updateOutlookOAuth',
    async (_event, input: UpdateOutlookOAuthSettingsInput) => updateOutlookOAuthSettings(input)
  )
  ipcMain.handle('calendar:importEvents', async (_event, input: ImportCalendarEventsInput) =>
    importCalendarEvents(input)
  )
  ipcMain.handle('calendar:previewTimeBlockPublish', async (_event, input: TimeBlockPublishPreviewRequest) =>
    previewTimeBlockPublish(input)
  )
  ipcMain.handle('calendar:confirmTimeBlockPublish', async (_event, input: TimeBlockPublishConfirmRequest) =>
    confirmTimeBlockPublishRequest(input)
  )
  ipcMain.handle('email:getSnapshot', async () => getEmailSnapshot())
  ipcMain.handle('email:importMessages', async (_event, input: ImportEmailMessagesInput) =>
    importEmailMessages(input)
  )
  ipcMain.handle('email:getGoogleOAuthReadiness', async () => getGmailOAuthReadiness())
  ipcMain.handle('email:getOutlookOAuthReadiness', async () => getOutlookEmailOAuthReadiness())
  ipcMain.handle('email:prepareGoogleOAuth', async (_event, input: StartEmailOAuthInput) =>
    prepareGmailOAuth(input)
  )
  ipcMain.handle('email:prepareOutlookOAuth', async (_event, input: StartEmailOAuthInput) =>
    prepareOutlookEmailOAuth(input)
  )
  ipcMain.handle('email:syncGoogle', async (_event, input: SyncGmailEmailInput) =>
    syncGmailInbox(input)
  )
  ipcMain.handle('email:syncOutlook', async (_event, input: SyncOutlookEmailInput) =>
    syncOutlookInbox(input)
  )
  ipcMain.handle('email:acceptSuggestion', async (_event, input: AcceptEmailSuggestionInput) =>
    acceptEmailSuggestion(input)
  )
  ipcMain.handle('email:archiveSuggestion', async (_event, input: ArchiveEmailSuggestionInput) =>
    archiveEmailSuggestion(input)
  )
  ipcMain.handle('email:dismissSuggestion', async (_event, input: DismissEmailSuggestionInput) =>
    dismissEmailSuggestion(input)
  )
  ipcMain.handle(
    'email:dismissContactSuggestion',
    async (_event, input: DismissPersonContactSuggestionInput) =>
      dismissPersonContactSuggestion(input)
  )
  ipcMain.handle(
    'email:restoreContactSuggestion',
    async (_event, input: RestorePersonContactSuggestionInput) =>
      restorePersonContactSuggestion(input)
  )
  ipcMain.handle('chat:getSnapshot', async () => getChatImportSnapshot())
  ipcMain.handle('chat:importConversation', async (_event, input: ImportChatConversationInput) =>
    importChatConversation(input)
  )
  ipcMain.handle('chat:acceptSuggestion', async (_event, input: AcceptChatSuggestionInput) =>
    acceptChatSuggestion(input)
  )
  ipcMain.handle('chat:archiveSuggestion', async (_event, input: ArchiveChatSuggestionInput) =>
    archiveChatSuggestion(input)
  )
  ipcMain.handle('chat:dismissSuggestion', async (_event, input: DismissChatSuggestionInput) =>
    dismissChatSuggestion(input)
  )
  ipcMain.handle('projectTemplates:getProposalSnapshot', async () =>
    getProjectTemplateProposalSnapshot()
  )
  ipcMain.handle('projectTemplates:getManagementSnapshot', async () =>
    getProjectTemplateManagementSnapshot()
  )
  ipcMain.handle(
    'projectTemplates:clearProposalState',
    async (_event, input: ClearProjectTemplateProposalStateInput) =>
      clearProjectTemplateProposalStateForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:recordShown',
    async (_event, input: ProjectTemplateProposalShownInput) =>
      recordProjectTemplateProposalsShownForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:dismissProposal',
    async (_event, input: ProjectTemplateProposalActionInput) =>
      dismissProjectTemplateProposalForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:snoozeProposal',
    async (_event, input: ProjectTemplateProposalActionInput) =>
      snoozeProjectTemplateProposalForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:rejectProposal',
    async (_event, input: ProjectTemplateProposalActionInput) =>
      rejectProjectTemplateProposalForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:neverSuggestProposal',
    async (_event, input: ProjectTemplateProposalActionInput) =>
      neverSuggestProjectTemplateProposalForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:saveProposal',
    async (_event, input: ProjectTemplateProposalSaveInput) =>
      saveProjectTemplateProposalForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:previewApply',
    async (_event, input: unknown) => previewApplyProjectTemplateForReview(input)
  )
  ipcMain.handle(
    'projectTemplates:confirmApply',
    async (_event, input: ProjectTemplateApplyConfirmInput) =>
      confirmApplyProjectTemplateForReview(input)
  )
  ipcMain.handle('calendar:getGoogleOAuthReadiness', async () => getGoogleCalendarOAuthReadiness())
  ipcMain.handle('calendar:getOutlookOAuthReadiness', async () => getOutlookCalendarOAuthReadiness())
  ipcMain.handle('calendar:prepareGoogleOAuth', async (_event, input: StartCalendarOAuthInput) =>
    prepareGoogleCalendarOAuth(input)
  )
  ipcMain.handle('calendar:prepareOutlookOAuth', async (_event, input: StartCalendarOAuthInput) =>
    prepareOutlookCalendarOAuth(input)
  )
  ipcMain.handle('calendar:syncGoogle', async (_event, input: SyncGoogleCalendarInput) =>
    syncGoogleCalendar(input)
  )
  ipcMain.handle('calendar:syncOutlook', async (_event, input: SyncOutlookCalendarInput) =>
    syncOutlookCalendar(input)
  )
  ipcMain.handle('calendar:autoSyncNow', async (_event, input?: CalendarAutoSyncRequest) =>
    autoSyncReadyCalendars(
      input?.triggeredBy ?? 'user_request',
      broadcastCalendarAutoSyncUpdate,
      { force: input?.force ?? true }
    )
  )
  ipcMain.handle('brief:getDaily', async () => {
    await autoSyncReadyCalendars('brief', broadcastCalendarAutoSyncUpdate)
    await autoSyncReadyEmailConnections('brief', broadcastEmailAutoSyncUpdate)
    return generateDailyBrief()
  })
  ipcMain.handle('brief:getAppointmentReport', async (_event, input?: AppointmentReportRequest) => {
    await autoSyncReadyCalendars('user_request', broadcastCalendarAutoSyncUpdate, { force: true })
    return generateAppointmentReport(input)
  })
  ipcMain.handle('assistant:route', async (_event, input: AssistantRouteRequest) =>
    routeAssistantRequest(input)
  )
  ipcMain.handle(
    'assistant:generateAIReview',
    async (_event, input: AssistantAIReviewGenerateRequest) => {
      const resolved = resolveAssistantAIReviewGenerateMode(input)
      if (!resolved.ok) {
        return {
          ok: false,
          message: resolved.message,
          writeBoundary: 'read_only',
        }
      }
      return toAssistantAIReviewGenerateResult(await buildLocalAIReviewResponse(resolved.mode))
    }
  )
  ipcMain.handle('assistant:storeContext', async (_event, input: StoreAssistantContextInput) =>
    storeAssistantContext(input)
  )
  ipcMain.handle('assistant:resolveContext', async (_event, input: ResolveAssistantContextInput) =>
    resolveAssistantContextReply(input)
  )
  ipcMain.handle('assistant:lookupPerson', async (_event, input: PersonLookupRequest) =>
    lookupPerson(input)
  )
  ipcMain.handle('assistant:lookupWork', async (_event, input: WorkLookupRequest) =>
    lookupWork(input)
  )
  ipcMain.handle(
    'brief:getFocusReport',
    async (_event, input: { entityKind: 'mission' | 'project'; entityId: string }) =>
      generateFocusReport(input.entityKind, input.entityId)
  )
  ipcMain.handle('capture:naturalLanguage', async (_event, input: CaptureRequest) =>
    captureNaturalLanguage(input)
  )
  ipcMain.handle('capture:saveCandidate', async (_event, input: SaveCaptureCandidateRequest) =>
    saveCaptureCandidate(input)
  )
  ipcMain.handle('work:getSnapshot', async () => getWorkSnapshot())
  ipcMain.handle('work:createMission', async (_event, input: CreateMissionInput) => createMission(input))
  ipcMain.handle('work:createPerson', async (_event, input: CreatePersonInput) => createPerson(input))
  ipcMain.handle('work:createPersonWorkLink', async (_event, input: CreatePersonWorkLinkInput) =>
    createPersonWorkLink(input)
  )
  ipcMain.handle('work:createProject', async (_event, input: CreateProjectInput) => createProject(input))
  ipcMain.handle('work:createTodo', async (_event, input: CreateTodoInput) => createTodo(input))
  ipcMain.handle(
    'work:createAppointment',
    async (_event, input: CreateAppointmentInput) => createAppointment(input)
  )
  ipcMain.handle(
    'work:createDeadline',
    async (_event, input: CreateDeadlineInput) => createStandaloneDeadline(input)
  )
  ipcMain.handle('work:updateStatus', async (_event, input: UpdateWorkStatusInput) =>
    updateWorkStatus(input)
  )
  ipcMain.handle('work:updateRecord', async (_event, input: UpdateWorkRecordInput) =>
    updateWorkRecord(input)
  )
  ipcMain.handle('work:deleteRecord', async (_event, input: DeleteWorkRecordInput) =>
    deleteWorkRecord(input)
  )
  ipcMain.handle('work:deletePersonWorkLink', async (_event, input: DeletePersonWorkLinkInput) =>
    deletePersonWorkLink(input)
  )
  ipcMain.handle('timeBlocks:list', async (_event, input?: ListTimeBlocksInput) =>
    getTimeBlockSnapshot(input)
  )
  ipcMain.handle('timeBlocks:create', async (_event, input: CreateTimeBlockInput) =>
    createTimeBlock(input)
  )
  ipcMain.handle('timeBlocks:update', async (_event, input: UpdateTimeBlockInput) =>
    updateTimeBlock(input)
  )
  ipcMain.handle('timeBlocks:delete', async (_event, input: DeleteTimeBlockInput) =>
    deleteTimeBlock(input)
  )
  ipcMain.handle('plan:generateDraft', async (_event, input: GenerateDraftPlanRequest) =>
    generateLocalPlanDraft(input)
  )
})
