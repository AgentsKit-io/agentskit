import React, { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import Translate, { translate } from '@docusaurus/Translate'

const GITHUB_REPO = 'EmersonBraun/agentskit'
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`
const GITHUB_DISCUSSIONS = `${GITHUB_URL}/discussions`
const GITHUB_ISSUES = `${GITHUB_URL}/issues`
const NPM_REACT = 'https://www.npmjs.com/package/@agentskit/react'
const NPM_ORG = 'https://www.npmjs.com/org/agentskit'

/** All published workspace packages — used for aggregated download counts (npm API has no scoped bulk endpoint). */
const AGENTSKIT_NPM_PACKAGES = [
  '@agentskit/adapters',
  '@agentskit/cli',
  '@agentskit/core',
  '@agentskit/eval',
  '@agentskit/ink',
  '@agentskit/memory',
  '@agentskit/observability',
  '@agentskit/rag',
  '@agentskit/react',
  '@agentskit/runtime',
  '@agentskit/sandbox',
  '@agentskit/skills',
  '@agentskit/templates',
  '@agentskit/tools',
] as const

async function fetchLastWeekDownloads(pkg: string): Promise<number> {
  const enc = encodeURIComponent(pkg)
  const res = await fetch(`https://api.npmjs.org/downloads/point/last-week/${enc}`)
  if (!res.ok) return 0
  const data: { downloads?: number; error?: string } = await res.json()
  if (data.error || typeof data.downloads !== 'number') return 0
  return data.downloads
}

function formatCompactCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

/** Weekly downloads summed across all @agentskit/* packages (npm does not expose scope totals in one call). */
function AggregatedNpmDownloadsBadge() {
  const t = translate
  const [total, setTotal] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const counts = await Promise.all(AGENTSKIT_NPM_PACKAGES.map(p => fetchLastWeekDownloads(p)))
        if (cancelled) return
        setTotal(counts.reduce((a, b) => a + b, 0))
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const label = t({
    id: 'home.badge.downloads.label',
    message: 'downloads',
    description: 'npm downloads badge label',
  })
  const message =
    failed ? '—' : total === null ? '…' : formatCompactCount(total)

  return (
    <a
      href={NPM_ORG}
      target="_blank"
      rel="noopener noreferrer"
      className="social-proof-badge ak-shield-badge ak-shield-badge--downloads"
      title={t({
        id: 'home.badge.downloads.title',
        message: 'Sum of last-week npm downloads across all @agentskit packages',
        description: 'npm downloads badge tooltip',
      })}
    >
      <span className="ak-shield-badge__label">{label}</span>
      <span className="ak-shield-badge__value">{message}</span>
    </a>
  )
}

// ─── Floating Keywords Background ───
const KEYWORDS = [
  'useChat()', 'useStream()', 'useReactive()', 'adapter', 'streaming',
  'ChatContainer', 'Message', 'InputBar', '<5KB', 'anthropic()',
  'openai()', 'send()', 'stop()', 'retry()', 'data-ak-*',
  'onMessage', 'onChunk', 'headless', 'theme', 'hooks',
  'createRuntime()', 'RAG', 'Ink', 'CLI', 'tools', 'memory',
]

function FloatingKeywords() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {KEYWORDS.map((kw, i) => (
        <span
          key={i}
          className="floating-keyword"
          style={{
            left: `${(i * 5.2) % 100}%`,
            animationDuration: `${12 + (i % 8) * 3}s`,
            animationDelay: `${(i * 1.7) % 10}s`,
            fontSize: `${11 + (i % 4) * 2}px`,
          }}
        >
          {kw}
        </span>
      ))}
    </div>
  )
}

// ─── Social proof (live badges) ───
function SocialProofBar() {
  const t = translate
  return (
    <div className="social-proof-bar">
      <a href={NPM_REACT} target="_blank" rel="noopener noreferrer" className="social-proof-badge">
        <img
          src="https://img.shields.io/npm/v/@agentskit/react?style=flat-square&logo=npm&label=npm&color=0891b2"
          alt={t({
            id: 'home.social.npmAlt',
            message: 'npm package version for @agentskit/react',
            description: 'Alt text for npm version shield',
          })}
          height={20}
          loading="lazy"
        />
      </a>
      <AggregatedNpmDownloadsBadge />
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="social-proof-badge">
        <img
          src={`https://img.shields.io/github/stars/${GITHUB_REPO}?style=flat-square&logo=github&label=stars&color=64748b`}
          alt={t({
            id: 'home.social.githubStarsAlt',
            message: 'GitHub stars for AgentsKit',
            description: 'Alt text for GitHub stars shield',
          })}
          height={20}
          loading="lazy"
        />
      </a>
      <span className="social-proof-meta">
        <Translate id="home.social.meta">14 packages on npm · MIT · Open source</Translate>
      </span>
    </div>
  )
}

// ─── Copy Install Command ───
function InstallCommand() {
  const t = translate
  const [copied, setCopied] = useState(false)
  const cmd = 'npm install @agentskit/react'

  const copy = () => {
    navigator.clipboard?.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="install-block">
      <button type="button" onClick={copy} className="install-cmd">
        <span className="dollar">$</span>
        <span>{cmd}</span>
        <span className={`install-copy-badge${copied ? ' install-copy-badge--done' : ''}`}>
          {copied
            ? t({ id: 'home.install.copied', message: '✓ Copied', description: 'Copy button after copy' })
            : t({ id: 'home.install.copy', message: 'Copy', description: 'Copy install command' })}
        </span>
      </button>
      <p className="install-hint">
        <Link to="/docs/getting-started/installation">
          <Translate id="home.install.hint">CLI, Runtime, Ink, RAG — full install guide →</Translate>
        </Link>
      </p>
    </div>
  )
}

// ─── Compare approaches (factual framing) ───
function CompareApproachesSection() {
  return (
    <section id="compare" className="compare-section">
      <h2 className="section-title">
        <Translate id="home.compare.title">How AgentsKit fits the landscape</Translate>
      </h2>
      <p className="section-subtitle">
        <Translate id="home.compare.subtitle">
          A practical lens — not a performance benchmark. Choose what matches your stack and how much control you need.
        </Translate>
      </p>
      <p className="compare-scroll-hint">
        <Translate id="home.compare.scrollHint">
          This table is wide — scroll sideways on small screens to compare all columns.
        </Translate>
      </p>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">
                <Translate id="home.compare.th.dimension">Dimension</Translate>
              </th>
              <th scope="col">
                <Translate id="home.compare.th.vendor">Vendor-tied or closed UI SDKs</Translate>
              </th>
              <th scope="col">
                <Translate id="home.compare.th.framework">Opinionated web framework paths</Translate>
              </th>
              <th scope="col">
                <Translate id="home.compare.th.agentskit">AgentsKit</Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                <Translate id="home.compare.row.ownership">Ownership</Translate>
              </th>
              <td>
                <Translate id="home.compare.cell.ownership.vendor">
                  Often bound to one vendor console, hosted-only features, or opaque upgrade paths.
                </Translate>
              </td>
              <td>
                <Translate id="home.compare.cell.ownership.framework">
                  Open source with a strong &ldquo;happy path&rdquo; for a specific ecosystem (e.g. React streaming patterns).
                </Translate>
              </td>
              <td>
                <strong>
                  <Translate id="home.compare.cell.ownership.agentskit.lead">MIT, modular npm packages</Translate>
                </strong>{' '}
                <Translate id="home.compare.cell.ownership.agentskit.tail">
                  — you own deployment; swap adapters without rewriting the UI layer.
                </Translate>
              </td>
            </tr>
            <tr>
              <th scope="row">
                <Translate id="home.compare.row.ui">UI model</Translate>
              </th>
              <td>
                <Translate id="home.compare.cell.ui.vendor">
                  Pre-built widgets; limited theming or escape hatches.
                </Translate>
              </td>
              <td>
                <Translate id="home.compare.cell.ui.framework">
                  Conventions and examples centered on one stack&apos;s idioms.
                </Translate>
              </td>
              <td>
                <strong>
                  <Translate id="home.compare.cell.ui.agentskit.lead">Headless primitives</Translate>
                </strong>{' '}
                (<code className="compare-inline-code">data-ak-*</code>){' '}
                <Translate id="home.compare.cell.ui.agentskit.tail">
                  plus optional theme — bring MUI, shadcn, or your design system.
                </Translate>
              </td>
            </tr>
            <tr>
              <th scope="row">
                <Translate id="home.compare.row.surfaces">Surfaces</Translate>
              </th>
              <td>
                <Translate id="home.compare.cell.surfaces.vendor">
                  Usually web-first; terminal or headless agents are an afterthought.
                </Translate>
              </td>
              <td>
                <Translate id="home.compare.cell.surfaces.framework">
                  Web-first; depth outside the browser varies.
                </Translate>
              </td>
              <td>
                <strong>
                  <Translate id="home.compare.cell.surfaces.agentskit.lead">Same contracts</Translate>
                </strong>{' '}
                <Translate id="home.compare.cell.surfaces.agentskit.tail">
                  for React, Ink (terminal), CLI, and headless
                </Translate>{' '}
                <code className="compare-inline-code">runtime</code>.
              </td>
            </tr>
            <tr>
              <th scope="row">
                <Translate id="home.compare.row.extension">Extension</Translate>
              </th>
              <td>
                <Translate id="home.compare.cell.extension.vendor">
                  Plugin tiers, closed extension APIs, or vendor-specific tool schemas.
                </Translate>
              </td>
              <td>
                <Translate id="home.compare.cell.extension.framework">
                  Composable inside the framework&apos;s world.
                </Translate>
              </td>
              <td>
                <strong>
                  <Translate id="home.compare.cell.extension.agentskit.lead">Shared core types</Translate>
                </strong>{' '}
                <Translate id="home.compare.cell.extension.agentskit.mid">— adapters, tools, memory, RAG, skills compose on</Translate>{' '}
                <code className="compare-inline-code">@agentskit/core</code>.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="compare-note">
        <strong>
          <Translate id="home.compare.note.bestLabel">Best fit:</Translate>
        </strong>{' '}
        <Translate id="home.compare.note.bestBody">
          one stack across browser, terminal, and headless agents, with control over adapters and tools.
        </Translate>{' '}
        <strong>
          <Translate id="home.compare.note.skipLabel">Skip if:</Translate>
        </strong>{' '}
        <Translate id="home.compare.note.skipBody">
          a single vendor widget is enough, or you are fully committed to one framework&apos;s AI path.
        </Translate>
      </p>
    </section>
  )
}

// ─── Live Interactive Widgets (rendered inside chat) ───
function WidgetColorPicker() {
  const t = translate
  const [hue, setHue] = useState(210)
  const colors = [0, 60, 120, 180, 240].map(offset => `hsl(${(hue + offset) % 360}, 72%, 58%)`)

  return (
    <div style={{ marginTop: 10 }}>
      <div className="widget-swatch-row">
        {colors.map((c, i) => (
          <div key={i} style={{ width: 40, height: 40, borderRadius: 8, background: c, cursor: 'pointer', transition: 'transform 0.15s', border: '2px solid rgba(255,255,255,0.1)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.15)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            onClick={() => navigator.clipboard?.writeText(c)}
          />
        ))}
      </div>
      <input type="range" min={0} max={360} value={hue} onChange={e => setHue(Number(e.target.value))}
        style={{ width: '100%', accentColor: `hsl(${hue}, 72%, 58%)` }}
      />
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
        {t({
          id: 'home.widget.colorPicker.hint',
          message: 'Drag to shift hue · Click swatch to copy',
          description: 'Color picker widget hint',
        })}
      </div>
    </div>
  )
}

function WidgetTimer() {
  const t = translate
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const pct = (seconds % 60) / 60
  const r = 28
  const circ = 2 * Math.PI * r

  return (
    <div className="widget-timer-row">
      <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
        <circle cx={36} cy={36} r={r} fill="none" stroke="#3b82f6" strokeWidth={6}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.3s' }}
        />
        <text x={36} y={38} textAnchor="middle" fill="#e2e8f0" fontSize={14} fontWeight={700}
          style={{ transform: 'rotate(90deg)', transformOrigin: '36px 36px' }}>
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
        </text>
      </svg>
      <div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setRunning(!running)} style={{ background: running ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', color: running ? '#ef4444' : '#22c55e', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
            {running
              ? t({ id: 'home.widget.timer.pause', message: 'Pause', description: 'Timer pause button' })
              : t({ id: 'home.widget.timer.resume', message: 'Resume', description: 'Timer resume button' })}
          </button>
          <button onClick={() => { setSeconds(0); setRunning(true) }} style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
            {t({ id: 'home.widget.timer.reset', message: 'Reset', description: 'Timer reset button' })}
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          {t({
            id: 'home.widget.timer.caption',
            message: 'Live timer — reactive state updates',
            description: 'Timer widget caption',
          })}
        </div>
      </div>
    </div>
  )
}

function WidgetPoll() {
  const t = translate
  const [votes, setVotes] = useState([
    { label: 'React', count: 42 },
    { label: 'Vue', count: 28 },
    { label: 'Svelte', count: 18 },
    { label: 'Solid', count: 12 },
  ])
  const total = votes.reduce((s, v) => s + v.count, 0)

  const vote = (i: number) => {
    setVotes(prev => prev.map((v, j) => j === i ? { ...v, count: v.count + 1 } : v))
  }

  return (
    <div style={{ marginTop: 10 }}>
      {votes.map((v, i) => {
        const pct = Math.round((v.count / total) * 100)
        return (
          <div key={v.label} onClick={() => vote(i)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, cursor: 'pointer', padding: '4px 0' }}>
            <div style={{ width: 60, fontSize: 12, fontWeight: 600 }}>{v.label}</div>
            <div style={{ flex: 1, height: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${210 + i * 30}, 70%, 55%)`, borderRadius: 6, transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ width: 36, fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>{pct}%</div>
          </div>
        )
      })}
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
        {t(
          {
            id: 'home.widget.poll.footer',
            message: 'Click to vote · {total} total votes',
            description: 'Poll widget footer',
          },
          { total: String(total) },
        )}
      </div>
    </div>
  )
}

// ─── Conversation Script ───
type MsgItem = { role: 'user' | 'assistant'; content: string; widget?: React.ReactNode }

// ─── Live Chat Demo ───
function LiveChatDemo() {
  const t = translate
  const script = [
    { role: 'user' as const, text: t({ id: 'home.demo.script.user.palette', message: 'Generate a color palette', description: 'Demo user message' }), delay: 0 },
    {
      role: 'assistant' as const,
      text: t({
        id: 'home.demo.script.assistant.palette',
        message: "Here's an interactive palette — drag the slider to shift the hue, click any swatch to copy:",
        description: 'Demo assistant message for color widget',
      }),
      delay: 600,
      widget: () => <WidgetColorPicker />,
    },
    { role: 'user' as const, text: t({ id: 'home.demo.script.user.timer', message: 'Now create a live timer', description: 'Demo user message' }), delay: 2000 },
    {
      role: 'assistant' as const,
      text: t({
        id: 'home.demo.script.assistant.timer',
        message: 'Done! A reactive timer with SVG progress ring — all powered by useReactive:',
        description: 'Demo assistant message for timer widget',
      }),
      delay: 600,
      widget: () => <WidgetTimer />,
    },
    { role: 'user' as const, text: t({ id: 'home.demo.script.user.poll', message: 'Show me a live poll', description: 'Demo user message' }), delay: 2500 },
    {
      role: 'assistant' as const,
      text: t({
        id: 'home.demo.script.assistant.poll',
        message: 'Interactive poll with reactive bar charts — click to vote and watch the bars update instantly:',
        description: 'Demo assistant message for poll widget',
      }),
      delay: 600,
      widget: () => <WidgetPoll />,
    },
  ] as Array<{ role: 'user' | 'assistant'; text: string; widget?: () => React.ReactNode; delay: number }>

  const [messages, setMessages] = useState<MsgItem[]>([])
  const [streamText, setStreamText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [input, setInput] = useState('')
  const [demoFinished, setDemoFinished] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)

  const scroll = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }

  useEffect(scroll, [messages, streamText])

  const streamMessage = useCallback(async (text: string, widget?: React.ReactNode) => {
    setIsStreaming(true)
    setStreamText('')
    for (let i = 0; i < text.length; i++) {
      await new Promise(r => setTimeout(r, 15))
      setStreamText(text.slice(0, i + 1))
    }
    setIsStreaming(false)
    setStreamText('')
    setMessages(prev => [...prev, { role: 'assistant', content: text, widget }])
  }, [])

  const runDemo = useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true

    await new Promise(r => setTimeout(r, 1200))

    for (const step of script) {
      await new Promise(r => setTimeout(r, step.delay))
      if (step.role === 'user') {
        setMessages(prev => [...prev, { role: 'user', content: step.text }])
      } else {
        await streamMessage(step.text, step.widget?.())
      }
    }
    setDemoFinished(true)
  }, [streamMessage, script])

  useEffect(() => { runDemo() }, [runDemo])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    const text = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setTimeout(async () => {
      const responses = [
        {
          text: t({
            id: 'home.demo.reply.a',
            message:
              "That's a great question! The same streaming hooks power React UIs, Ink terminals, and headless runtimes — one mental model across surfaces.",
            description: 'Demo random reply',
          }),
          widget: undefined,
        },
        {
          text: t({
            id: 'home.demo.reply.b',
            message:
              'AgentsKit keeps adapters and tools on shared core types, so you extend with memory, RAG, or new providers without rewriting your chat layer.',
            description: 'Demo random reply',
          }),
          widget: undefined,
        },
        {
          text: t({
            id: 'home.demo.reply.c',
            message:
              "Try it: npm install @agentskit/react for the fastest path, or follow the install guide for CLI and runtime — you'll stream a first message in minutes.",
            description: 'Demo random reply',
          }),
          widget: undefined,
        },
      ]
      const resp = responses[Math.floor(Math.random() * responses.length)]
      await streamMessage(resp.text, resp.widget)
    }, 400)
  }

  return (
    <div className="demo-window" style={{ maxWidth: 520, width: '100%' }}>
      <div className="demo-titlebar">
        <div className="demo-dot" style={{ background: '#ef4444' }} />
        <div className="demo-dot" style={{ background: '#eab308' }} />
        <div className="demo-dot" style={{ background: '#22c55e' }} />
        <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8, fontFamily: 'monospace' }}>
          {t({ id: 'home.demo.titlebar', message: 'AgentsKit Demo', description: 'Demo window title' })}
        </span>
        <span className="live-badge">
          {t({ id: 'home.demo.liveBadge', message: 'LIVE', description: 'Live demo badge' })}
        </span>
      </div>
      <div ref={scrollRef} className="demo-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`demo-msg demo-msg-${msg.role}`}>
            <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
            {msg.widget}
          </div>
        ))}
        {isStreaming && streamText && (
          <div className="demo-msg demo-msg-assistant">
            <span style={{ whiteSpace: 'pre-wrap' }}>{streamText}</span>
            <span className="cursor" style={{ marginLeft: 1 }}>|</span>
          </div>
        )}
        {messages.length === 0 && (
          <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⚡</div>
            {t({ id: 'home.demo.starting', message: 'Starting demo...', description: 'Demo loading state' })}
          </div>
        )}
      </div>
      <form onSubmit={e => { e.preventDefault(); handleSend() }} className="demo-input-bar">
        <input
          className="demo-input"
          placeholder={
            demoFinished
              ? t({ id: 'home.demo.placeholder.ready', message: 'Type anything — try it!', description: 'Demo input placeholder when ready' })
              : t({ id: 'home.demo.placeholder.wait', message: 'Watching demo...', description: 'Demo input placeholder during script' })
          }
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={!demoFinished}
          style={{ opacity: demoFinished ? 1 : 0.5 }}
        />
        <button type="submit" className="demo-send" disabled={!demoFinished || !input.trim() || isStreaming}>
          {t({ id: 'home.demo.send', message: 'Send', description: 'Demo send button' })}
        </button>
      </form>
    </div>
  )
}

// ─── Code Comparison ───
const BEFORE_CODE = `const [messages, setMessages] = useState([])
const [input, setInput] = useState('')
const [streaming, setStreaming] = useState(false)
const abortRef = useRef(null)

const send = async () => {
  setStreaming(true)
  const userMsg = { role: 'user', content: input }
  setMessages(prev => [...prev, userMsg])
  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ messages: [...messages, userMsg] }),
    signal: abortRef.current?.signal,
  })
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value)
    setMessages(prev => [...prev.slice(0,-1),
      { role: 'assistant', content: text }])
  }
  setStreaming(false)
}
// + error handling, auto-scroll, cleanup...`

const AFTER_CODE = `import { useChat, ChatContainer, Message, InputBar }
  from '@agentskit/react'
import { anthropic } from '@agentskit/adapters'
import '@agentskit/react/theme'

function Chat() {
  const chat = useChat({
    adapter: anthropic({ model: 'claude-sonnet-4-6' })
  })
  return (
    <ChatContainer>
      {chat.messages.map(msg =>
        <Message key={msg.id} message={msg} />
      )}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}`

// ─── Main Page ───
const EXAMPLE_SLUGS = [
  { emoji: '💬', slug: 'basic-chat', href: '/docs/examples/basic-chat' },
  { emoji: '🔧', slug: 'tool-use', href: '/docs/examples/tool-use' },
  { emoji: '⚖️', slug: 'multi-model', href: '/docs/examples/multi-model' },
  { emoji: '👨‍💻', slug: 'code-assistant', href: '/docs/examples/code-assistant' },
  { emoji: '🎧', slug: 'support-bot', href: '/docs/examples/support-bot' },
  { emoji: '📚', slug: 'rag-chat', href: '/docs/examples/rag-chat' },
  { emoji: '🤖', slug: 'agent-actions', href: '/docs/examples/agent-actions' },
  { emoji: '📝', slug: 'markdown-chat', href: '/docs/examples/markdown-chat' },
  { emoji: '🎭', slug: 'mui-chat', href: '/docs/examples/mui-chat' },
  { emoji: '✨', slug: 'shadcn-chat', href: '/docs/examples/shadcn-chat' },
] as const

const EXAMPLE_DEFAULTS: Record<(typeof EXAMPLE_SLUGS)[number]['slug'], { name: string; desc: string }> = {
  'basic-chat': { name: 'Basic Chat', desc: 'Streaming conversation' },
  'tool-use': { name: 'Tool Use', desc: 'Function calling & results' },
  'multi-model': { name: 'Multi-Model', desc: 'Side-by-side comparison' },
  'code-assistant': { name: 'Code Assistant', desc: 'Syntax-highlighted code' },
  'support-bot': { name: 'Support Bot', desc: 'Quick replies & escalation' },
  'rag-chat': { name: 'RAG Chat', desc: 'Documents & citations' },
  'agent-actions': { name: 'Agent Actions', desc: 'AI generates live UI' },
  'markdown-chat': { name: 'Markdown Chat', desc: 'Rich formatted responses' },
  'mui-chat': { name: 'MUI Chat', desc: 'Material UI integration' },
  'shadcn-chat': { name: 'shadcn Chat', desc: 'shadcn/ui integration' },
}

export default function Home(): React.JSX.Element {
  const t = translate

  const exampleCards = EXAMPLE_SLUGS.map(ex => {
    const d = EXAMPLE_DEFAULTS[ex.slug]
    return {
      ...ex,
      name: t({
        id: `home.example.${ex.slug}.name`,
        message: d.name,
        description: 'Example card title',
      }),
      desc: t({
        id: `home.example.${ex.slug}.desc`,
        message: d.desc,
        description: 'Example card description',
      }),
    }
  })

  const featureCards = [
    { icon: '🪝', id: 'hooks', titleMsg: '3 Hooks', descMsg: "useStream, useReactive, useChat — that's the entire API. Learn it in 5 minutes." },
    { icon: '⚡', id: 'bundle', titleMsg: '<5KB Bundle', descMsg: 'Tiny footprint. No virtual DOM overhead. Just reactive streams wired to the DOM.' },
    { icon: '🔌', id: 'provider', titleMsg: 'Any Provider', descMsg: 'Claude, GPT, Vercel AI SDK, or bring your own ReadableStream. Swap in one line.' },
    { icon: '🎨', id: 'headless', titleMsg: 'Headless + Theme', descMsg: 'Components ship with data-ak-* attributes. Import the theme or style your way.' },
    { icon: '🤖', id: 'agent', titleMsg: 'Agent-Friendly', descMsg: 'Entire API fits in 2K tokens. AI agents generate correct AgentsKit code first try.' },
    { icon: '🧩', id: 'toolkit', titleMsg: 'Full toolkit', descMsg: 'Runtime, Ink, CLI, RAG, memory, tools, skills, sandbox, eval — compose what you need, share types with @agentskit/core.' },
    { icon: '🌍', id: 'everywhere', titleMsg: 'Works Everywhere', descMsg: 'Next.js, Vite, Remix, TanStack Start — any React 18+ app. Zero config.' },
    { icon: '⏹️', id: 'stop', titleMsg: 'Stop, retry, clear', descMsg: 'Cancellation and retries on the chat controller — fewer stuck “typing…” states and duplicate assistant messages.' },
    { icon: '📡', id: 'obs', titleMsg: 'Production visibility', descMsg: 'Optional @agentskit/observability for traces across LLM calls, tools, and memory — OpenTelemetry-friendly when you need it.' },
    { icon: '🧪', id: 'eval', titleMsg: 'Benchmark in CI', descMsg: '@agentskit/eval measures latency, cost, and success rate so agent regressions surface before users do.' },
  ].map(f => ({
    icon: f.icon,
    title: t({ id: `home.feature.${f.id}.title`, message: f.titleMsg, description: 'Feature card title' }),
    desc: t({ id: `home.feature.${f.id}.desc`, message: f.descMsg, description: 'Feature card body' }),
  }))

  return (
    <Layout
      title={t({
        id: 'home.layout.title',
        message: 'AgentsKit',
        description: 'Home page HTML title',
      })}
      description={t({
        id: 'home.layout.description',
        message:
          'Open-source, extensible JavaScript toolkit for AI agents and streaming chat: shared core types, pluggable adapters, React & Ink UIs, CLI, runtime, RAG, tools, and memory.',
        description: 'Home page meta description',
      })}
    >
      {/* ══════════ HERO ══════════ */}
      <section className="ak-hero">
        <div className="hero-grid" />
        <div className="hero-glow" />
        <FloatingKeywords />

        <div className="ak-hero-inner">
          {/* Left: Copy */}
          <div>
            <div className="ak-hero-pill">
              <Translate id="home.hero.pill">Open source · Extensible — React, terminal &amp; headless</Translate>
            </div>
            <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.2rem)', fontWeight: 800, lineHeight: 1.08, margin: '0 0 1rem 0', color: 'var(--ak-text)' }}>
              <Translate id="home.hero.title">One agent toolkit for JavaScript</Translate>
            </h1>
            <p style={{ fontSize: 'clamp(1.1rem, 3vw, 1.35rem)', fontWeight: 700, lineHeight: 1.35, margin: '0 0 1.25rem 0', color: 'var(--ak-text-muted)' }}>
              <span style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% auto' }}>
                <Translate id="home.hero.gradient">React · CLI · Runtime · RAG · Tools</Translate>
              </span>
              {' '}
              <Translate id="home.hero.taglineTail">— same contracts everywhere</Translate>
            </p>
            <p style={{ fontSize: '1.1rem', color: 'var(--ak-text-muted)', lineHeight: 1.6, marginBottom: '1.75rem', maxWidth: 540 }}>
              <Translate id="home.hero.body.lead">Pluggable adapters and shared types on</Translate>{' '}
              <code className="compare-inline-code">@agentskit/core</code>
              <Translate id="home.hero.body.mid">, optional UI. Start in</Translate>{' '}
              <strong style={{ color: 'var(--ak-text)' }}>React</strong>
              <Translate id="home.hero.body.tail1">; reuse the same ideas in</Translate>{' '}
              <strong style={{ color: 'var(--ak-text)' }}>Ink</strong>
              <Translate id="home.hero.body.tail2">, the</Translate>{' '}
              <strong style={{ color: 'var(--ak-text)' }}>CLI</strong>
              <Translate id="home.hero.body.tail3">, or</Translate>{' '}
              <strong style={{ color: 'var(--ak-text)' }}>runtime</strong>
              <Translate id="home.hero.body.tail4">— swap models in one line.</Translate>
            </p>

            <div className="ak-hero-primary-row">
              <Link
                className="button button--primary button--lg"
                to="/docs/getting-started/quick-start"
                style={{ borderRadius: 10 }}
                data-ak-cta="quick-start-hero"
              >
                <Translate id="home.hero.ctaQuickStart">Run the 2-minute quick start</Translate>
              </Link>
            </div>
            <p className="hero-friction-line">
              <Translate id="home.hero.friction">MIT · No signup · First streaming UI in under a minute · pnpm, yarn, or npm</Translate>
            </p>
            <div className="hero-secondary-links">
              <Link to="/docs/getting-started/read-this-first">
                <Translate id="home.hero.link.startDocs">Docs: Start here →</Translate>
              </Link>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <a href="#compare">
                <Translate id="home.hero.link.compare">Compare approaches →</Translate>
              </a>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <Link to="/docs/examples">
                <Translate id="home.hero.link.examples">10 live examples →</Translate>
              </Link>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <Link to="/docs/examples/tool-use">
                <Translate id="home.hero.link.toolDemo">Tool calling demo →</Translate>
              </Link>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <Link to="/docs/examples/rag-chat">
                <Translate id="home.hero.link.ragDemo">RAG chat demo →</Translate>
              </Link>
            </div>
            <div className="hero-secondary-links">
              <Link to="/docs/infrastructure/cli">
                <Translate id="home.hero.link.cli">CLI →</Translate>
              </Link>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <a href={NPM_ORG} target="_blank" rel="noopener noreferrer">
                <Translate id="home.hero.link.npmAll">All packages on npm →</Translate>
              </a>
            </div>

            <div className="social-proof-wrap">
              <SocialProofBar />
            </div>

            <InstallCommand />
          </div>

          {/* Right: Live Demo (proof) */}
          <div className="ak-flex-center">
            <LiveChatDemo />
          </div>
        </div>
      </section>

      <main className="ak-page-main">

        {/* ══════════ COMPARE (proof continues) ══════════ */}
        <CompareApproachesSection />

        {/* ══════════ PROBLEM (PAS) ══════════ */}
        <section className="pas-section">
          <h2 className="section-title">
            <Translate id="home.pas.title">Closed SDKs and opinionated paths slow you down</Translate>
          </h2>
          <p className="section-subtitle">
            <Translate id="home.pas.subtitle">You still own streaming edge cases — unless your stack is built to compose</Translate>
          </p>
          <ul className="pas-list">
            <li>
              <strong>
                <Translate id="home.pas.li.vendor.lead">Vendor-tied or closed layers</Translate>
              </strong>{' '}
              <Translate id="home.pas.li.vendor.tail">
                — upgrade schedules, hosted-only features, and opaque limits box you in when you need custom tools or self-hosted inference.
              </Translate>
            </li>
            <li>
              <strong>
                <Translate id="home.pas.li.framework.lead">Highly opinionated frameworks</Translate>
              </strong>{' '}
              <Translate id="home.pas.li.framework.tail">
                — productive inside their happy path; painful when your product spans web, terminal, and headless workers with one contract.
              </Translate>
            </li>
            <li>
              <strong>
                <Translate id="home.pas.li.streams.lead">Fragile hand-rolled streams</Translate>
              </strong>{' '}
              <Translate id="home.pas.li.streams.tail">
                — partial chunks, retries, and aborts still leak into UX (stuck &ldquo;typing&rdquo;, duplicated messages, lost tool results) when glue code diverges per surface.
              </Translate>
            </li>
          </ul>
          <p className="pas-solve">
            <Translate id="home.pas.solve.prefix">AgentsKit is</Translate>{' '}
            <strong>
              <Translate id="home.pas.solve.license">MIT-licensed and extension-first</Translate>
            </strong>
            <Translate id="home.pas.solve.suffix">
              : adapters, tools, memory, and RAG sit on shared primitives so you keep control and swap pieces without rewriting the product narrative.
            </Translate>
          </p>
        </section>

        {/* ══════════ BEFORE / AFTER ══════════ */}
        <section className="ak-section">
          <h2 className="section-title">
            <Translate id="home.codePair.title">From ~50 lines of glue to ~10 lines of product</Translate>
          </h2>
          <p className="section-subtitle">
            <Translate id="home.codePair.subtitle">Less code to review, test, and regret when the API shape changes next month</Translate>
          </p>

          <div className="ak-grid--code-pair">
            <div className="code-panel" style={{ opacity: 0.7 }}>
              <div className="code-panel-header" style={{ color: '#ef4444' }}>
                <Translate id="home.codePair.beforeLabel">Before — ~50 lines</Translate>
              </div>
              <pre className="ak-code-pre-tall"><code>{BEFORE_CODE}</code></pre>
            </div>
            <div className="code-panel" style={{ borderColor: 'var(--ak-accent)' }}>
              <div className="code-panel-header" style={{ color: 'var(--ak-accent)' }}>
                <Translate id="home.codePair.afterLabel">After — 10 lines with AgentsKit</Translate>
              </div>
              <pre className="ak-code-pre-tall"><code>{AFTER_CODE}</code></pre>
            </div>
          </div>
        </section>

        {/* ══════════ ECOSYSTEM (after proof) ══════════ */}
        <section className="ak-section--ecosystem text--center">
          <p className="ak-ecosystem-lead">
            <Translate id="home.ecosystem.lead">One architecture, every surface</Translate>
          </p>
          <p className="ak-ecosystem-copy">
            <Translate id="home.ecosystem.copy.lead">Jump to the guide you need — each link matches an</Translate>{' '}
            <code className="compare-inline-code">@agentskit/*</code>{' '}
            <Translate id="home.ecosystem.copy.tail">package on npm.</Translate>
          </p>
          <div className="ecosystem-pills">
            <Link to="/docs/chat-uis/react" className="ecosystem-pill">React</Link>
            <Link to="/docs/chat-uis/ink" className="ecosystem-pill">Ink</Link>
            <Link to="/docs/infrastructure/cli" className="ecosystem-pill">CLI</Link>
            <Link to="/docs/agents/runtime" className="ecosystem-pill">Runtime</Link>
            <Link to="/docs/data-layer/adapters" className="ecosystem-pill">Adapters</Link>
            <Link to="/docs/data-layer/memory" className="ecosystem-pill">Memory</Link>
            <Link to="/docs/data-layer/rag" className="ecosystem-pill">RAG</Link>
            <Link to="/docs/agents/tools" className="ecosystem-pill">Tools</Link>
            <Link to="/docs/agents/skills" className="ecosystem-pill">Skills</Link>
          </div>
        </section>

        {/* ══════════ PROVIDERS ══════════ */}
        <section className="ak-section--providers text--center">
          <p className="ak-ecosystem-lead">
            <Translate id="home.providers.lead">Model providers — swap in one line</Translate>
          </p>
          <div className="ak-provider-row">
            {['Anthropic', 'OpenAI', 'Vercel AI SDK', 'Any ReadableStream'].map(p => (
              <span key={p} className="provider-pill">{p}</span>
            ))}
          </div>
        </section>

        {/* ══════════ FEATURES ══════════ */}
        <section className="ak-section">
          <h2 className="section-title">
            <Translate id="home.features.sectionTitle">Why AgentsKit?</Translate>
          </h2>
          <p className="section-subtitle">
            <Translate id="home.features.sectionSubtitle">Everything you need, nothing you don&apos;t — same story from UI to headless agents</Translate>
          </p>

          <div className="ak-grid--features">
            {featureCards.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-card-icon">{f.icon}</div>
                <h4 className="feature-card-title">{f.title}</h4>
                <p className="feature-card-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════ EXAMPLES GRID ══════════ */}
        <section className="ak-section">
          <h2 className="section-title">
            <Translate id="home.examples.sectionTitle">10 Interactive Examples</Translate>
          </h2>
          <p className="section-subtitle">
            <Translate id="home.examples.sectionSubtitle">Every example is a chat — because that&apos;s what AgentsKit does</Translate>
          </p>

          <div className="ak-grid--examples">
            {exampleCards.map(ex => (
              <Link key={ex.slug} to={ex.href} className="example-card">
                <span className="example-emoji">{ex.emoji}</span>
                <div>
                  <div className="example-card-title">{ex.name}</div>
                  <div className="example-card-desc">{ex.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════ CTA ══════════ */}
        <section className="ak-section ak-section--cta text--center">
          <h2 className="ak-cta-title">
            <Translate id="home.cta.title">See streaming work in under a minute</Translate>
          </h2>
          <p className="ak-cta-lead">
            <Translate id="home.cta.lead">Run the quick start, then layer tools, memory, and RAG — the mental model does not change.</Translate>
          </p>
          <p className="hero-friction-line" style={{ marginBottom: '1.75rem' }}>
            <Translate id="home.cta.friction">MIT · No signup · Open source — use it, fork it, or tell us what is missing</Translate>
          </p>
          <div className="ak-cta-row">
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/quick-start"
              style={{ borderRadius: 10 }}
              data-ak-cta="quick-start-footer"
            >
              <Translate id="home.cta.button">Run the 2-minute quick start</Translate>
            </Link>
          </div>
          <div className="hero-secondary-links hero-secondary-links--footer">
            <Link to="/docs/examples">
              <Translate id="home.cta.link.examples">Live examples →</Translate>
            </Link>
            <span aria-hidden="true" className="hero-link-sep">·</span>
            <Link to="/docs/getting-started/for-ai-agents">
              <Translate id="home.cta.link.agents">Prompt for coding agents →</Translate>
            </Link>
            <span aria-hidden="true" className="hero-link-sep">·</span>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Translate id="home.cta.link.star">Star on GitHub →</Translate>
            </a>
          </div>
        </section>

        <section className="ak-section--end text--center">
          <div className="young-project-callout">
            <p className="ak-young-title">
              <Translate id="home.young.title">Young project, moving fast</Translate>
            </p>
            <p className="ak-young-copy">
              <Translate id="home.young.copy">
                AgentsKit is early-stage and expanding — try it, open an issue if something breaks, and help shape the roadmap.
              </Translate>
            </p>
            <div className="hero-secondary-links hero-secondary-links--justify-center">
              <a href={GITHUB_ISSUES} target="_blank" rel="noopener noreferrer">
                <Translate id="home.young.link.issues">Issues →</Translate>
              </a>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <a href={GITHUB_DISCUSSIONS} target="_blank" rel="noopener noreferrer">
                <Translate id="home.young.link.discussions">Discussions →</Translate>
              </a>
              <span aria-hidden="true" className="hero-link-sep">·</span>
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Translate id="home.young.link.contribute">Contribute on GitHub →</Translate>
              </a>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  )
}
