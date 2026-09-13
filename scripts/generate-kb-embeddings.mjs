// Dev-only script: precomputes embeddings for the static RAG knowledge
// base so the app never has to embed it at runtime - only the query
// (built from the candidate's weak topics) needs embedding per interview.
// Re-run this whenever src/main/backend/rag/knowledgeBase.json changes.
//
// Usage: npm run generate-kb-embeddings
import { config } from 'dotenv'
import OpenAI from 'openai'
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ragDir = join(__dirname, '..', 'src', 'main', 'backend', 'rag')
const knowledgeBasePath = join(ragDir, 'knowledgeBase.json')
const outputPath = join(ragDir, 'knowledgeBaseEmbeddings.json')

const EMBEDDING_MODEL = 'text-embedding-3-small'

async function main() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('Set OPENAI_API_KEY in .env before running this script.')
    process.exit(1)
  }

  const knowledgeBase = JSON.parse(readFileSync(knowledgeBasePath, 'utf-8'))
  const client = new OpenAI({ apiKey })

  console.log(`Embedding ${knowledgeBase.length} knowledge base documents...`)

  const inputs = knowledgeBase.map((doc) => `${doc.title}. ${doc.content}`)
  const response = await client.embeddings.create({ model: EMBEDDING_MODEL, input: inputs })

  const embeddings = knowledgeBase.map((doc, index) => ({
    id: doc.id,
    embedding: response.data[index].embedding
  }))

  writeFileSync(outputPath, JSON.stringify(embeddings))
  console.log(`Wrote ${embeddings.length} embeddings to ${outputPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
