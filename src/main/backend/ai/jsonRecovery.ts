import { AIResponseError } from './aiErrors'

/**
 * Parses a JSON object out of a raw AI response, recovering from the
 * common case where the model wraps the object in prose or markdown
 * fences despite being told not to. Throws AIResponseError only if no
 * usable JSON object can be found at all.
 */
export function parseJsonRecovering(content: string): Record<string, unknown> {
  try {
    return JSON.parse(content)
  } catch {
    const start = content.indexOf('{')
    const end = content.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1))
      } catch {
        // fall through to the error below
      }
    }
    throw new AIResponseError('The AI returned a response we could not understand.')
  }
}
