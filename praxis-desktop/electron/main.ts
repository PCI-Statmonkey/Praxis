import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { registerRuntimeIpcHandlers } from './ipc/registerRuntimeIpcHandlers'
import { createRuntimeServices, buildRuntimeIpcDeps } from './runtime/runtimeComposition'
import { createSqliteReadOnly } from './persistence/sqliteReadOnly'
import { createEventLogService } from './persistence/eventLogService'
import { createSyncOrchestrator } from './sync/syncOrchestrator'
import { createBackupService } from './backup/backupService'
import { createRestoreService } from './backup/restoreService'
import { createMissionStore } from './persistence/missionStore'
import { createMissionService } from './missions/missionService'
import type { BackupInventoryPreview, RestorePlanPreview } from '../shared/backup/backupTypes'

const require = createRequire(import.meta.url)
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
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

const buildRuntime = () => {
  const persistenceRO = createSqliteReadOnly()
  const eventLog = createEventLogService()
  const missionStore = createMissionStore()
  const missionService = createMissionService({
    store: missionStore,
    clock: {
      now: () => new Date().toISOString(),
    },
  })

  const backupService = createBackupService({
    inventory: {
      buildPreview: async (): Promise<BackupInventoryPreview> => {
        const appDataRoot = app.getPath('userData')
        const dbPath = path.join(appDataRoot, 'eventlog.sqlite')

        const statOrMissing = async (targetPath: string) => {
          try {
            const stat = await fs.stat(targetPath)
            return { exists: stat.isFile(), sizeBytes: stat.isFile() ? stat.size : undefined }
          } catch {
            return { exists: false, sizeBytes: undefined }
          }
        }

        const dbStat = await statOrMissing(dbPath)

        return {
          items: [
            { category: 'appDataRoot', path: appDataRoot, exists: true },
            { category: 'sqlite', path: dbPath, exists: dbStat.exists, sizeBytes: dbStat.sizeBytes },
          ],
          warnings: [],
        }
      },
    },
    fs: {
      stat: fs.stat,
    },
  })

  const restoreService = createRestoreService({
    restore: {
      buildPlanPreview: async (): Promise<Omit<RestorePlanPreview, 'zipPath'>> => ({
        conflicts: [],
        willOverwriteCount: 0,
        missingCount: 0,
        warnings: ['preview_not_implemented'],
      }),
    },
    fs: {
      stat: fs.stat,
    },
  })

  const syncOrchestrator = createSyncOrchestrator({
    getMirrorRoot: () => null,
    lock: {
      withMirrorLock: async (fn) => fn(),
    },
    mirrorTransport: {
      listDeviceLogs: async () => [],
      readFromOffset: async () => ({ lines: [], nextOffset: 0 }),
      appendLines: async () => ({ appended: 0 }),
    },
    eventLogRead: {
      getLocalCursor: async () => {
        const cursor = await eventLog.getLocalEventCursor()
        if (!cursor.ok) return { maxRowId: 0 }
        return {
          maxRowId: cursor.value.maxRowId,
          lastUploadedRowId: cursor.value.lastSyncRowId,
          lastImportedRowId: cursor.value.lastSyncRowId,
        }
      },
      readEventsAfterRowId: async (rowId, limit) => {
        const result = await eventLog.readEventsAfterRowId(rowId, limit)
        return result.ok ? result.value : []
      },
    },
    eventLogWrite: {
      insertEventIfMissing: async (record) => {
        const result = await eventLog.insertEventIfMissing(record)
        return result.ok ? result.value : false
      },
    },
    validateEventRecord: eventLog.validateEventRecord,
    clock: {
      now: () => Date.now(),
    },
  })

  const services = createRuntimeServices({
    createPersistenceRO: () => persistenceRO,
    createEventLog: () => eventLog,
    createSyncOrchestrator: () => syncOrchestrator,
    createBackupService: () => backupService,
    createRestoreService: () => restoreService,
    createMissionService: () => missionService,
  })

  const ipcDeps = buildRuntimeIpcDeps(services, {
    getVersion: () => app.getVersion(),
    getStatus: () => ({ ready: true }),
    getPaths: async () => ({
      ok: true,
      value: {
        appDataRoot: app.getPath('userData'),
        dbPath: path.join(app.getPath('userData'), 'eventlog.sqlite'),
      },
    }),
    getDbStatus: () => persistenceRO.getDbStatus(),
    getDbIntegritySummary: () => persistenceRO.getIntegritySummary(),
  })

  return { services, ipcDeps }
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
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

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.maximize()
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  const { ipcDeps } = buildRuntime()
  registerRuntimeIpcHandlers(ipcMain, ipcDeps)
  createWindow()
})
