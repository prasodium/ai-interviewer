export interface KnowledgeBaseDocument {
  id: string
  topic: string
  title: string
  content: string
}

export interface EmbeddingRecord {
  id: string
  embedding: number[]
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) {
    return 0
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Ranks knowledge base documents against a query, and returns the top
 * matches. This is hybrid retrieval, not pure semantic search: documents
 * whose topic exactly matches one of the given priority topics (e.g. the
 * interview's own topic labels, like "Kafka" or "SQL") are ranked ahead
 * of everything else, with embedding similarity breaking ties within
 * each group and ranking any remaining semantic-only matches. Pure
 * embedding similarity on a short query like "Kafka, Data Modeling"
 * tends to drift toward generically related content (e.g. a general
 * databases note) instead of the specific topic - exact-topic priority
 * fixes that while still falling back to semantic matching for topics
 * that don't exactly match a curated entry.
 *
 * Kept as a pure function (no imports of the real knowledge base or the
 * OpenAI client) so it can be unit tested with small, controlled fake
 * data - see studyNotesRetrieval.ts for the real integration.
 */
export function rankDocumentsBySimilarity(
  queryEmbedding: number[],
  documents: KnowledgeBaseDocument[],
  embeddings: EmbeddingRecord[],
  topK: number,
  priorityTopics: string[] = []
): KnowledgeBaseDocument[] {
  const embeddingById = new Map(embeddings.map((record) => [record.id, record.embedding]))
  const normalizedPriorityTopics = new Set(priorityTopics.map((topic) => topic.toLowerCase().trim()))

  const scored = documents
    .map((doc) => {
      const embedding = embeddingById.get(doc.id)
      if (!embedding) {
        return null
      }
      const isPriorityTopic = normalizedPriorityTopics.has(doc.topic.toLowerCase().trim())
      return { doc, score: cosineSimilarity(queryEmbedding, embedding), isPriorityTopic }
    })
    .filter((entry): entry is { doc: KnowledgeBaseDocument; score: number; isPriorityTopic: boolean } => entry !== null)

  scored.sort((a, b) => {
    if (a.isPriorityTopic !== b.isPriorityTopic) {
      return a.isPriorityTopic ? -1 : 1
    }
    return b.score - a.score
  })

  return scored.slice(0, topK).map((entry) => entry.doc)
}
