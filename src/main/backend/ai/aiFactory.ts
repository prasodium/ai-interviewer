import { getAiStatus, resolveApiKey } from '../../services/settingsService'
import { MockInterviewer } from './mockInterviewer'
import { OpenAIInterviewer } from './openAIInterviewer'
import type { InterviewAI } from './interviewAI'

const DEFAULT_MODEL = 'gpt-4o-mini'

/** Picks the mock or real interviewer based on current settings/env - built fresh per request so a settings change takes effect immediately. */
export function getInterviewAI(): InterviewAI {
  const { usingMockAi } = getAiStatus()

  if (usingMockAi) {
    return new MockInterviewer()
  }

  const apiKey = resolveApiKey()
  if (!apiKey) {
    return new MockInterviewer()
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL
  return new OpenAIInterviewer(apiKey, model)
}
