import type { InterviewDifficulty, InterviewLengthMinutes, InterviewStyle } from './interview'

/** OpenAI's natural-sounding TTS voices (used when a real API key is configured). */
export type AiVoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface AppSettings {
  hasApiKey: boolean
  voiceName: string | null
  voiceSpeed: number
  voiceVolume: number
  aiVoice: AiVoiceName
  preferredInterviewStyle: InterviewStyle
  defaultDifficulty: InterviewDifficulty
  defaultLengthMinutes: InterviewLengthMinutes
}

export interface AiStatus {
  usingMockAi: boolean
  hasApiKey: boolean
}
