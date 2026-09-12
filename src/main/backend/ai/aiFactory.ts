import { resolveApiKey } from '../../services/settingsService'
import { OpenAIInterviewer } from './openAIInterviewer'
import { AIRequestError } from './aiErrors'
import type { InterviewAI } from './interviewAI'

const DEFAULT_MODEL = 'gpt-4o-mini'

/** Built fresh per request so a settings change (e.g. a new API key) takes effect immediately. */
export function getInterviewAI(): InterviewAI {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new AIRequestError('Please add your OpenAI API key in Settings to start an interview.')
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL
  return new OpenAIInterviewer(apiKey, model)
}
