import { createRAG } from '@agentskit/rag'
import { openaiEmbedder } from '@agentskit/adapters'
import { fileVectorMemory } from '@agentskit/memory'

const rag = createRAG({
  embed: openaiEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
  store: fileVectorMemory({ path: './vectors' }),
})

await rag.ingest([
  { id: 'doc-1', content: 'AgentsKit is a JavaScript agent toolkit...' },
])

const docs = await rag.search('How does AgentsKit work?', { topK: 5 })
