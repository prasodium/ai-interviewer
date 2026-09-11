// Loads .env in development so OPENAI_API_KEY / USE_MOCK_AI are available.
// Packaged builds get their API key from secure settings storage instead.
// Silently does nothing if no .env file is present.
import 'dotenv/config'

import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window'
import { registerIpcHandlers } from './ipc'
import { closeDatabase } from './backend/database/db'

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.aiinterviewer.app')

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

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
