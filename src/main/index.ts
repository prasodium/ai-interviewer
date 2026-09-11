// Loads .env in development so OPENAI_API_KEY / USE_MOCK_AI are available.
// Packaged builds get their API key from secure settings storage instead.
// Silently does nothing if no .env file is present.
import 'dotenv/config'

import { app, BrowserWindow, session, systemPreferences } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { closeDatabase } from './backend/database/db'
import { logger } from './services/logger'

/**
 * Electron blocks getUserMedia (microphone access) by default unless the
 * main process explicitly allows it here - this is a security boundary
 * the renderer cannot bypass on its own, separate from the OS-level
 * permission prompt.
 */
function allowMicrophoneAccess(): void {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'media')
  })
}

async function requestMacMicrophonePermission(): Promise<void> {
  if (process.platform !== 'darwin') {
    return
  }
  try {
    const granted = await systemPreferences.askForMediaAccess('microphone')
    if (!granted) {
      logger.warn('Microphone access was not granted; voice answers will be unavailable')
    }
  } catch (error) {
    logger.error('Failed to request microphone access', error)
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.aiinterviewer.app')

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  allowMicrophoneAccess()
  await requestMacMicrophonePermission()

  registerIpcHandlers()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
