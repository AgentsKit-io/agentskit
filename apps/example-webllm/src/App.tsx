import { useEffect, useMemo, useState } from 'react'
import { useChat } from '@agentskit/react'
import { webllm } from '@agentskit/adapters'

/**
 * Browser-only chat. The MLCEngine is loaded lazily on first stream;
 * to make the load visible to the user we warm it up in an effect and
 * surface the progress text. Once warm, swap in the agentskit adapter
 * factory and let `useChat` drive it like any other provider.
 */

const MODEL_ID = 'Llama-3.1-8B-Instruct-q4f16_1-MLC'

export function App() {
  const [progress, setProgress] = useState<string>('Idle. Send a message to load the model.')
  const [ready, setReady] = useState(false)

  const adapter = useMemo(() => {
    return webllm({
      model: MODEL_ID,
      onProgress: ({ progress, text }) => {
        setProgress(`${Math.round(progress * 100)}% — ${text}`)
        if (progress >= 1) setReady(true)
      },
    })
  }, [])

  const chat = useChat({ adapter })

  useEffect(() => {
    if (chat.status === 'streaming' && !ready) setProgress('Loading model… first turn warms the engine.')
  }, [chat.status, ready])

  return (
    <div data-ak-chat="">
      <p className="progress" aria-live="polite">{progress}</p>

      <div data-ak-messages="">
        {chat.messages.map(m => (
          <div key={m.id} data-ak-message="" data-ak-role={m.role}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>

      <form
        data-ak-form=""
        onSubmit={e => {
          e.preventDefault()
          if (!chat.input.trim() || chat.status === 'streaming') return
          void chat.send(chat.input)
        }}
      >
        <input
          data-ak-input=""
          value={chat.input}
          onChange={e => chat.setInput(e.target.value)}
          placeholder="Ask anything (model runs locally)…"
          disabled={chat.status === 'streaming'}
        />
        <button type="submit" disabled={chat.status === 'streaming' || !chat.input.trim()}>
          {chat.status === 'streaming' ? '…' : 'Send'}
        </button>
        {chat.status === 'streaming' && (
          <button type="button" onClick={() => chat.stop()}>
            Stop
          </button>
        )}
      </form>
    </div>
  )
}
