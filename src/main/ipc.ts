import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc'
import type {
  AnswerInterviewRequest,
  AnswerInterviewResponse,
  ApiKeyUpdateRequest,
  StartInterviewRequest
} from '@shared/ipc'
import type { AppSettings } from '@shared/types'
import { analyzeResume } from './backend/resume/resumeService'
import * as interviewEngine from './backend/interview/interviewEngine'
import * as interviewRepository from './backend/database/interviewRepository'
import * as settingsService from './services/settingsService'
import { logger } from './services/logger'

/**
 * Wraps every handler so unexpected bugs never crash the app - they are
 * logged in full here, and the renderer only ever sees a short, friendly
 * message (see AI Interviewer error-handling rules).
 */
function handle<Args extends unknown[], Result>(
  channel: string,
  fn: (...args: Args) => Promise<Result>
): void {
  ipcMain.handle(channel, async (_event, ...args: Args) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`IPC handler failed: ${channel}`, error)
        throw new Error(error.message)
      }
      logger.error(`IPC handler failed: ${channel}`, error)
      throw new Error('Something unexpected went wrong. Please try again.')
    }
  })
}

export function registerIpcHandlers(): void {
  handle(IPC_CHANNELS.resumeAnalyze, async (filePath: string, jobDescription: string) => {
    return analyzeResume(filePath, jobDescription)
  })

  handle(IPC_CHANNELS.interviewStart, async (request: StartInterviewRequest): Promise<AnswerInterviewResponse> => {
    const { setup, resumeAnalysis } = request
    const result = await interviewEngine.startInterview(
      setup,
      resumeAnalysis?.resumeInformation ?? null,
      resumeAnalysis?.jobMatch ?? null
    )
    return result
  })

  handle(IPC_CHANNELS.interviewAnswer, async (request: AnswerInterviewRequest): Promise<AnswerInterviewResponse> => {
    return interviewEngine.submitAnswer(request.interviewId, request.answerText)
  })

  handle(IPC_CHANNELS.interviewFinish, async (interviewId: string) => {
    return interviewEngine.finishInterview(interviewId)
  })

  handle(IPC_CHANNELS.interviewGetState, async (interviewId: string) => {
    return interviewEngine.getInterviewState(interviewId)
  })

  handle(IPC_CHANNELS.historyList, async () => {
    return interviewRepository.listInterviews()
  })

  handle(IPC_CHANNELS.historyGet, async (id: string) => {
    return interviewRepository.getInterviewDetail(id)
  })

  handle(IPC_CHANNELS.historyDelete, async (id: string) => {
    interviewRepository.deleteInterview(id)
  })

  handle(IPC_CHANNELS.historyClearAll, async () => {
    interviewRepository.clearAllInterviews()
  })

  handle(IPC_CHANNELS.settingsGet, async () => {
    return settingsService.getSettings()
  })

  handle(IPC_CHANNELS.settingsUpdate, async (partial: Partial<AppSettings>) => {
    return settingsService.updateSettings(partial)
  })

  handle(IPC_CHANNELS.settingsSetApiKey, async (request: ApiKeyUpdateRequest) => {
    settingsService.storeApiKey(request.apiKey)
  })

  handle(IPC_CHANNELS.settingsClearApiKey, async () => {
    settingsService.clearApiKey()
  })

  handle(IPC_CHANNELS.settingsGetAiStatus, async () => {
    return settingsService.getAiStatus()
  })

  handle(IPC_CHANNELS.dialogPickResumeFile, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select your resume',
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  })
}
