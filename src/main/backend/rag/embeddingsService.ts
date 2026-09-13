import OpenAI from 'openai'
import { logger } from '../../services/logger'
import { resolveApiKey } from '../../services/settingsService'
import { AIRequestError } from '../ai/aiErrors'

/** Cheap, small embedding model - this app only ever embeds one short query string per interview. */
export const EMBEDDING_MODEL = 'text-embedding-3-small'

function getClient(): OpenAI {
  const apiKey = resolveApiKey()
  if (!apiKey) {
    throw new AIRequestError('An OpenAI API key is required to generate study recommendations.')
  }
  return new OpenAI({ apiKey })
}

export async function embedText(text: string): Promise<number[]> {
  const client = getClient()
  try {
    const response = await client.embeddings.create({ model: EMBEDDING_MODEL, input: text })
    return response.data[0].embedding
  } catch (error) {
    logger.error('Failed to create embedding', error)
    throw new AIRequestError('Could not generate study recommendations right now.')
  }
}
