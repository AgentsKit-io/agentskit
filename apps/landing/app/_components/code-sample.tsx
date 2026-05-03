const CODE = `import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

export function App() {
  const chat = useChat({
    adapter: anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
  })

  return (
    <ChatContainer>
      {chat.messages.map(m => <Message key={m.id} message={m} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}`

export function CodeSample() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-fg-soft)]">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span>chat.tsx — 10 lines, fully streaming</span>
        </div>
        <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed text-[var(--color-fg)]">
          <code>{CODE}</code>
        </pre>
      </div>
    </section>
  )
}
