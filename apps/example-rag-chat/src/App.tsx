import { useEffect, useMemo, useState } from 'react'
import { openrouter } from '@agentskit/adapters'
import { ChatContainer, InputBar, Message, useChat } from '@agentskit/react'
// @ts-expect-error CSS side-effect import has no type declarations
import '@agentskit/react/theme'
import { ingestSampleDocs, rag } from './rag'

// Free OpenRouter model — no cost, good enough to ground answers over the docs.
const DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

const SYSTEM_PROMPT = [
  'You are the Nimbus docs assistant.',
  'Answer ONLY from the retrieved documentation context provided to you.',
  'If the answer is not in the context, say you could not find it in the docs.',
  'Be concise and cite the doc you used (e.g. "pricing.md") when relevant.',
].join(' ')

type IndexState = 'indexing' | 'ready' | 'error'

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [submittedKey, setSubmittedKey] = useState('')
  const [indexState, setIndexState] = useState<IndexState>('indexing')

  // Build the index once on load. The model download + embedding pass can take
  // a few seconds the first time; the corpus is cached in memory afterward.
  useEffect(() => {
    let active = true
    ingestSampleDocs()
      .then(() => active && setIndexState('ready'))
      .catch(() => active && setIndexState('error'))
    return () => {
      active = false
    }
  }, [])

  // Recreate the adapter only when the submitted key changes — not every render.
  const adapter = useMemo(
    () => openrouter({ apiKey: submittedKey, model: DEFAULT_MODEL }),
    [submittedKey],
  )

  const chat = useChat({
    adapter,
    retriever: rag,
    systemPrompt: SYSTEM_PROMPT,
  })

  const ready = indexState === 'ready' && submittedKey.length > 0

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">AgentsKit · RAG over your docs</p>
        <h1>Ask the Nimbus docs</h1>
        <p className="lede">
          A chat grounded in four sample markdown files via{' '}
          <code>@agentskit/rag</code>. Embeddings run on-device with{' '}
          <code>@huggingface/transformers</code>; answers come from a free{' '}
          <code>@agentskit/adapters</code> OpenRouter model.
        </p>
      </section>

      <section className="setup">
        <label className="field">
          <span>OpenRouter API key</span>
          <div className="field-row">
            <input
              type="password"
              value={apiKey}
              placeholder="sk-or-v1-…"
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSubmittedKey(apiKey.trim())
              }}
            />
            <button type="button" onClick={() => setSubmittedKey(apiKey.trim())}>
              Use key
            </button>
          </div>
          <small>
            Bring your own key from{' '}
            <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
              openrouter.ai/keys
            </a>
            . It stays in your browser. The default model is free.
          </small>
        </label>

        <p className="status" data-state={indexState}>
          {indexState === 'indexing' && 'Indexing docs (loading the embedding model)…'}
          {indexState === 'ready' && 'Docs indexed and ready.'}
          {indexState === 'error' && 'Failed to index docs — check the console.'}
        </p>
      </section>

      <section className="chat-card">
        <ChatContainer className="chat-surface">
          {chat.messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
          <InputBar
            chat={chat}
            disabled={!ready}
            placeholder={
              ready
                ? 'Ask about pricing, limits, signed URLs…'
                : 'Add your API key and wait for indexing to finish…'
            }
          />
        </ChatContainer>
      </section>
    </main>
  )
}
