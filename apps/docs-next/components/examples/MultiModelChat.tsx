'use client'

import { useMemo, useState } from 'react'
import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { createMockAdapter, initialAssistant } from './_shared/mock-adapter'
import { PROVIDERS, type Provider } from '@/lib/stack-state'

const REPLY_BY_PROVIDER: Record<Provider, string> = {
  openai: 'OpenAI — clear, concise, and safe. Balanced default for most chat apps.',
  anthropic: 'Anthropic — nuanced reasoning, long context, and careful tool use.',
  gemini: 'Google Gemini — fast, multimodal, and strong at structured output.',
  openrouter: 'OpenRouter — unified gateway to 200+ models, free tier included.',
  ollama: 'Ollama — local inference on your box, zero network cost.',
  grok: 'xAI Grok — big personality, very current, great for live topics.',
  groq: 'Groq — LPU-backed speed. Sub-second first token on most prompts.',
  mistral: 'Mistral — open-weights-friendly, strong European choice.',
  together: 'Together — cheap hosted inference across popular open models.',
  cohere: 'Cohere — RAG-native, stellar rerankers and embeddings.',
  deepseek: 'DeepSeek — dirt-cheap high-quality Chinese provider.',
  fireworks: 'Fireworks — fast hosted open-source with fine-tuning on call.',
  huggingface: 'Hugging Face — the model zoo, inference endpoints included.',
  kimi: 'Moonshot Kimi — 200k context, excellent at long-doc tasks.',
  llamacpp: 'llama.cpp — truly local, quantised, runs on a laptop CPU.',
  lmstudio: 'LM Studio — UX on top of llama.cpp, handy for desktop demos.',
  vllm: 'vLLM — self-hosted throughput king for production workloads.',
  langchain: 'LangChain adapter — bridge any LangChain model into AgentsKit.',
  'vercel-ai': 'Vercel AI SDK adapter — plug in any provider the SDK supports.',
}

export function MultiModelChat() {
  const [provider, setProvider] = useState<Provider>('openai')
  const meta = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0]
  const adapter = useMemo(
    () => createMockAdapter([{ text: REPLY_BY_PROVIDER[provider] }]),
    [provider],
  )
  const chat = useChat({
    adapter,
    initialMessages: [
      initialAssistant(
        'Pick a provider — AgentsKit hot-swaps the adapter without touching the rest of the app.',
      ),
    ],
  })

  return (
    <div
      data-ak-example
      className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <div className="flex flex-wrap gap-1 border-b border-ak-border p-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setProvider(p.value)}
            className={`rounded px-3 py-1.5 font-mono text-xs transition ${
              p.value === provider ? 'bg-ak-foam text-ak-midnight' : 'text-ak-graphite hover:text-ak-foam'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="border-b border-ak-border bg-ak-midnight/30 px-3 py-1.5 font-mono text-[10px] text-ak-graphite">
        {meta.pkg} · model: <span className="text-ak-foam">{meta.model}</span>
      </div>
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
