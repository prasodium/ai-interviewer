import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc'
import type { ElectronApi } from '@shared/ipc'

/**
 * The only bridge between the sandboxed renderer and the main process.
 * The renderer can only call these specific functions - it never gets
 * direct access to Node, the filesystem, or the OpenAI API key.
 */
const api: ElectronApi = {
  resume: {
    analyze: (filePath, jobDescription) =>
      ipcRenderer.invoke(IPC_CHANNELS.resumeAnalyze, filePath, jobDescription)
  },
  interview: {
    start: (request) => ipcRenderer.invoke(IPC_CHANNELS.interviewStart, request),
    answer: (request) => ipcRenderer.invoke(IPC_CHANNELS.interviewAnswer, request),
    finish: (interviewId) => ipcRenderer.invoke(IPC_CHANNELS.interviewFinish, interviewId),
    getState: (interviewId) => ipcRenderer.invoke(IPC_CHANNELS.interviewGetState, interviewId)
  },
  history: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.historyList),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.historyGet, id),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.historyDelete, id),
    clearAll: () => ipcRenderer.invoke(IPC_CHANNELS.historyClearAll)
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (partial) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, partial),
    setApiKey: (request) => ipcRenderer.invoke(IPC_CHANNELS.settingsSetApiKey, request),
    clearApiKey: () => ipcRenderer.invoke(IPC_CHANNELS.settingsClearApiKey),
    getAiStatus: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGetAiStatus)
  },
  dialog: {
    pickResumeFile: () => ipcRenderer.invoke(IPC_CHANNELS.dialogPickResumeFile)
  }
}

contextBridge.exposeInMainWorld('api', api)
