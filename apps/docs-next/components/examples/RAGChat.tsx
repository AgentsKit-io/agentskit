'use client'

import { useMemo } from 'react'
import type { Retriever, RetrievedDocument } from '@agentskit/core'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'
import { MdRenderer } from './_shared/md-renderer'

const CORPUS: RetrievedDocument[] = [
  {
    id: 'doc-1',
    content:
      'AgentsKit `useChat` returns a ChatReturn with messages, status, input, error, usage and imperative handlers (send, stop, retry, edit, regenerate).',
    metadata: { source: 'guide/useChat.md' },
    score: 0.92,
  },
  {
    id: 'doc-2',
    content:
      'Retrievers implement `retrieve(request)` and return an array of RetrievedDocument. AgentsKit injects them into the context as structured citations.',
    metadata: { source: 'guide/retrievers.md' },
    score: 0.87,
  },
  {
    id: 'doc-3',
    content:
      'Memory is swappable — in-memory (dev), file, SQLite, Redis, vector stores. Every backend implements the same contract.',
    metadata: { source: 'guide/memory.md' },
    score: 0.81,
  },
]

const staticRetriever: Retriever = {
  async retrieve() {
    return CORPUS
  },
}

export function RAGChat() {
  const adapter = useMemo(
    () =>
      createMockAdapter([
        {
          text: 'Based on the docs, `useChat` returns a full ChatReturn with imperative handlers plus state. See *guide/useChat.md* and *guide/retrievers.md* for the citation flow.',
        },
        {
          text: 'Memory is pluggable — dev, file, SQLite, Redis, or vector. Each shares the same contract per *guide/memory.md*.',
        },
      ]),
    [],
  )
  const chat = useChat({
    adapter,
    retriever: staticRetriever,
    initialMessages: [
      initialAssistant('Ask me about AgentsKit — I cite the relevant doc chunks inline.'),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[440px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-3 p-4">
        {chat.messages.map((m) => (
          <div key={m.id} data-ak-message data-ak-role={m.role} className="rounded-lg bg-ak-midnight/40 p-3">
            <MdRenderer content={m.content} />
          </div>
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
