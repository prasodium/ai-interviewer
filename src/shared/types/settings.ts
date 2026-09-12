import type { InterviewDifficulty, InterviewLengthMinutes, InterviewStyle } from './interview'

/** OpenAI's natural-sounding TTS voices. */
export type AiVoiceName = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

export interface AppSettings {
  hasApiKey: boolean
  /** Passed to OpenAI's TTS `speed` parameter (0.25-4.0). */
  voiceSpeed: number
  /** Applied client-side to the played-back audio element (0-1). */
  voiceVolume: number
  aiVoice: AiVoiceName
  preferredInterviewStyle: InterviewStyle
  defaultDifficulty: InterviewDifficulty
  defaultLengthMinutes: InterviewLengthMinutes
}

export interface AiStatus {
  hasApiKey: boolean
}
