import React from 'react'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'

const DEMO_CODE = `import { useChat, ChatContainer, Message, InputBar } from '@agentkit/react'
import { anthropic } from '@agentkit/react/adapters'
import '@agentkit/react/theme'

function Chat() {
  const chat = useChat({
    adapter: anthropic({ apiKey: 'sk-...', model: 'claude-sonnet-4-6' }),
  })
  return (
    <ChatContainer>
      {chat.messages.map(msg => <Message key={msg.id} message={msg} />)}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}`

const BEFORE_CODE = `// Without AgentKit: ~50 lines
const [messages, setMessages] = useState([])
const [input, setInput] = useState('')
const [isStreaming, setIsStreaming] = useState(false)
const abortRef = useRef(null)
const containerRef = useRef(null)

const send = async () => {
  setIsStreaming(true)
  const userMsg = { role: 'user', content: input }
  setMessages(prev => [...prev, userMsg])
  setInput('')
  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: [...messages, userMsg] }),
    signal: abortRef.current?.signal,
  })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  // ... 30 more lines of stream parsing,
  // error handling, auto-scroll, cleanup...
}`

function StreamingDemo() {
  const [text, setText] = React.useState('')

  React.useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i <= DEMO_CODE.length) {
        setText(DEMO_CODE.slice(0, i))
        i++
      } else {
        clearInterval(interval)
      }
    }, 20)
    return () => clearInterval(interval)
  }, [])

  return (
    <pre style={{
      background: 'var(--ifm-color-emphasis-100)',
      padding: '1.5rem',
      borderRadius: '12px',
      fontSize: '13px',
      lineHeight: 1.6,
      overflow: 'auto',
      minHeight: '320px',
      border: '1px solid var(--ifm-color-emphasis-200)',
    }}>
      <code>{text}<span style={{ animation: 'blink 1s step-end infinite' }}>&#9608;</span></code>
    </pre>
  )
}

function BeforeAfter() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ifm-color-danger)', marginBottom: '0.5rem' }}>
          Before (~50 lines)
        </div>
        <pre style={{
          background: 'var(--ifm-color-emphasis-100)',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '11px',
          lineHeight: 1.5,
          overflow: 'auto',
          maxHeight: '300px',
          border: '1px solid var(--ifm-color-emphasis-200)',
          opacity: 0.7,
        }}>
          <code>{BEFORE_CODE}</code>
        </pre>
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ifm-color-primary)', marginBottom: '0.5rem' }}>
          After (10 lines)
        </div>
        <pre style={{
          background: 'var(--ifm-color-emphasis-100)',
          padding: '1rem',
          borderRadius: '8px',
          fontSize: '11px',
          lineHeight: 1.5,
          overflow: 'auto',
          maxHeight: '300px',
          border: '2px solid var(--ifm-color-primary)',
        }}>
          <code>{DEMO_CODE}</code>
        </pre>
      </div>
    </div>
  )
}

export default function Home(): React.JSX.Element {
  return (
    <Layout title="AgentKit" description="Ship AI chat in 10 lines of React">
      <main style={{ padding: '4rem 2rem', maxWidth: '960px', margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '100px',
            background: 'var(--ifm-color-primary-lightest)',
            color: 'var(--ifm-color-primary-darkest)',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '1rem',
          }}>
            3 hooks. Any provider. Zero opinions.
          </div>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, margin: '0.5rem 0' }}>
            Ship AI chat in<br />
            <span style={{ color: 'var(--ifm-color-primary)' }}>10 lines of React</span>
          </h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--ifm-color-emphasis-700)', maxWidth: '600px', margin: '1rem auto' }}>
            Drop-in hooks and components for streaming AI interfaces.
            Works with Claude, GPT, Vercel AI SDK, or any LLM.
            So simple an AI agent can write it for you.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/quick-start">
              Get Started
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/getting-started/for-ai-agents">
              For AI Agents
            </Link>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-500)', marginTop: '1rem' }}>
            npm install @agentkit/react
          </p>
        </div>

        {/* Streaming Demo */}
        <StreamingDemo />

        {/* Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginTop: '3rem',
        }}>
          {[
            { title: '3 Hooks', desc: 'useStream, useReactive, useChat. That\'s the whole API.' },
            { title: 'Any Provider', desc: 'Claude, GPT, Vercel AI SDK, or bring your own stream.' },
            { title: '<5KB', desc: 'Tiny bundle. No virtual DOM overhead. Just reactive streams.' },
            { title: 'Headless', desc: 'data-ak-* attributes. Import the theme or style your way.' },
            { title: 'Agent-Friendly', desc: 'Entire API fits in 2K tokens. Agents generate correct code.' },
            { title: 'Works Everywhere', desc: 'Next.js, Vite, Remix, TanStack Start. Any React 18+ app.' },
          ].map(({ title, desc }) => (
            <div key={title} style={{
              padding: '1.25rem',
              borderRadius: '10px',
              background: 'var(--ifm-color-emphasis-100)',
              border: '1px solid var(--ifm-color-emphasis-200)',
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{title}</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Before/After */}
        <h2 style={{ textAlign: 'center', marginTop: '4rem' }}>Before vs After</h2>
        <p style={{ textAlign: 'center', color: 'var(--ifm-color-emphasis-600)' }}>
          Stop writing stream parsing boilerplate. Focus on your product.
        </p>
        <BeforeAfter />

        {/* Provider logos text */}
        <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--ifm-color-emphasis-500)', fontSize: '0.9rem' }}>
          Works with Anthropic &middot; OpenAI &middot; Vercel AI SDK &middot; Any ReadableStream
        </div>

        {/* Footer credit */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--ifm-color-emphasis-200)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-500)' }}>
            Inspired by <a href="https://arrow-js.com/" target="_blank" rel="noopener noreferrer">Arrow.js</a> &mdash; the first UI framework for the agentic era.
          </p>
        </div>
      </main>
    </Layout>
  )
}
