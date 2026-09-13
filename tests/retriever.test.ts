import { describe, expect, it } from 'vitest'
import { cosineSimilarity, rankDocumentsBySimilarity } from '../src/main/backend/rag/retriever'
import type { EmbeddingRecord, KnowledgeBaseDocument } from '../src/main/backend/rag/retriever'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1)
  })

  it('returns 0 instead of NaN for a zero vector', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0)
  })
})

describe('rankDocumentsBySimilarity', () => {
  const documents: KnowledgeBaseDocument[] = [
    { id: 'sql', topic: 'SQL', title: 'SQL indexing', content: 'Indexes speed up reads.' },
    { id: 'kafka', topic: 'Kafka', title: 'Kafka partitions', content: 'Partitions enable parallelism.' },
    { id: 'behavioral', topic: 'Behavioral', title: 'STAR method', content: 'Situation, Task, Action, Result.' }
  ]

  const embeddings: EmbeddingRecord[] = [
    { id: 'sql', embedding: [1, 0, 0] },
    { id: 'kafka', embedding: [0, 1, 0] },
    { id: 'behavioral', embedding: [0, 0, 1] }
  ]

  it('ranks the closest document first', () => {
    const result = rankDocumentsBySimilarity([1, 0, 0], documents, embeddings, 3)
    expect(result[0].id).toBe('sql')
  })

  it('respects topK', () => {
    const result = rankDocumentsBySimilarity([0, 1, 0], documents, embeddings, 1)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('kafka')
  })

  it('skips documents that have no matching embedding record', () => {
    const partialEmbeddings = embeddings.filter((record) => record.id !== 'behavioral')
    const result = rankDocumentsBySimilarity([0, 0, 1], documents, partialEmbeddings, 3)
    expect(result.find((doc) => doc.id === 'behavioral')).toBeUndefined()
    expect(result).toHaveLength(2)
  })

  it('orders a mixed-relevance query sensibly', () => {
    // Closer to kafka+behavioral than to sql.
    const result = rankDocumentsBySimilarity([0, 1, 1], documents, embeddings, 2)
    expect(result.map((doc) => doc.id)).toEqual(expect.arrayContaining(['kafka', 'behavioral']))
    expect(result.find((doc) => doc.id === 'sql')).toBeUndefined()
  })

  it('ranks an exact topic match ahead of a semantically closer non-matching topic', () => {
    // Query embedding is closest to "sql" by pure similarity, but the
    // candidate's weak topic is "Kafka" - the exact topic match should win.
    const result = rankDocumentsBySimilarity([0.9, 0.4, 0], documents, embeddings, 1, ['Kafka'])
    expect(result[0].id).toBe('kafka')
  })

  it('falls back to semantic ranking when no document matches the priority topic', () => {
    const result = rankDocumentsBySimilarity([1, 0, 0], documents, embeddings, 1, ['Some Unrelated Topic'])
    expect(result[0].id).toBe('sql')
  })

  it('topic matching is case-insensitive and ignores surrounding whitespace', () => {
    const result = rankDocumentsBySimilarity([0.9, 0.4, 0], documents, embeddings, 1, ['  kafka  '])
    expect(result[0].id).toBe('kafka')
  })
})
