import knowledgeBaseData from './knowledgeBase.json'
import knowledgeBaseEmbeddingsData from './knowledgeBaseEmbeddings.json'
import { embedText } from './embeddingsService'
import { rankDocumentsBySimilarity, type EmbeddingRecord, type KnowledgeBaseDocument } from './retriever'
import { logger } from '../../services/logger'

const knowledgeBase = knowledgeBaseData as KnowledgeBaseDocument[]
const knowledgeBaseEmbeddings = knowledgeBaseEmbeddingsData as EmbeddingRecord[]

const TOP_K = 4

/**
 * Retrieval-augmented step for the final report: embeds a query built
 * from the candidate's weaker topics, then retrieves the most relevant
 * curated study notes by embedding similarity. The knowledge base is
 * static and its embeddings are precomputed once (see
 * scripts/generate-kb-embeddings.mjs) - only the query needs embedding
 * at request time, keeping this to a single cheap API call.
 */
export async function retrieveStudyNotes(weakTopics: string[]): Promise<KnowledgeBaseDocument[]> {
  if (weakTopics.length === 0) {
    return []
  }

  try {
    const query = `Interview study notes for a candidate who needs to improve in: ${weakTopics.join(', ')}`
    const queryEmbedding = await embedText(query)
    return rankDocumentsBySimilarity(queryEmbedding, knowledgeBase, knowledgeBaseEmbeddings, TOP_K, weakTopics)
  } catch (error) {
    // Non-fatal - the final report still generates without grounding notes.
    logger.error('Failed to retrieve study notes for final report', error)
    return []
  }
}
