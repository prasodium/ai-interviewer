/**
 * The full contract between the renderer and the main process.
 *
 * The renderer never talks to OpenAI, the filesystem, or SQLite directly.
 * It only calls these functions through `window.api` (exposed by the
 * preload script), which forwards to IPC handlers in the main process.
 * This keeps secrets and file access out of the browser-side code.
 */
import type {
  AiStatus,
  AppSettings,
  InterviewSetupOptions,
  InterviewState,
  FinalReport,
  ResumeAnalysisResult,
  SavedInterview,
  SavedInterviewDetail
} from './types'

export interface StartInterviewRequest {
  setup: InterviewSetupOptions
  resumeAnalysis: ResumeAnalysisResult | null
}

export interface AnswerInterviewRequest {
  interviewId: string
  answerText: string
}

export interface AnswerInterviewResponse {
  state: InterviewState
  interviewerReply: string
}

export interface ApiKeyUpdateRequest {
  apiKey: string
}

export interface ElectronApi {
  resume: {
    analyze(filePath: string, jobDescription: string): Promise<ResumeAnalysisResult>
  }
  interview: {
    start(request: StartInterviewRequest): Promise<AnswerInterviewResponse>
    answer(request: AnswerInterviewRequest): Promise<AnswerInterviewResponse>
    finish(interviewId: string): Promise<FinalReport>
    getState(interviewId: string): Promise<InterviewState | null>
  }
  history: {
    list(): Promise<SavedInterview[]>
    get(id: string): Promise<SavedInterviewDetail | null>
    delete(id: string): Promise<void>
    clearAll(): Promise<void>
  }
  settings: {
    get(): Promise<AppSettings>
    update(partial: Partial<AppSettings>): Promise<AppSettings>
    setApiKey(request: ApiKeyUpdateRequest): Promise<void>
    clearApiKey(): Promise<void>
    getAiStatus(): Promise<AiStatus>
  }
  dialog: {
    pickResumeFile(): Promise<string | null>
  }
}

export const IPC_CHANNELS = {
  resumeAnalyze: 'resume:analyze',
  interviewStart: 'interview:start',
  interviewAnswer: 'interview:answer',
  interviewFinish: 'interview:finish',
  interviewGetState: 'interview:get-state',
  historyList: 'history:list',
  historyGet: 'history:get',
  historyDelete: 'history:delete',
  historyClearAll: 'history:clear-all',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  settingsSetApiKey: 'settings:set-api-key',
  settingsClearApiKey: 'settings:clear-api-key',
  settingsGetAiStatus: 'settings:get-ai-status',
  dialogPickResumeFile: 'dialog:pick-resume-file'
} as const
