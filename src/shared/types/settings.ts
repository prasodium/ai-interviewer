import type { InterviewDifficulty, InterviewLengthMinutes, InterviewStyle } from './interview'

export interface AppSettings {
  hasApiKey: boolean
  voiceName: string | null
  voiceSpeed: number
  voiceVolume: number
  preferredInterviewStyle: InterviewStyle
  defaultDifficulty: InterviewDifficulty
  defaultLengthMinutes: InterviewLengthMinutes
}

export interface AiStatus {
  usingMockAi: boolean
  hasApiKey: boolean
}
