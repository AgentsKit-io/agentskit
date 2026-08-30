'use client'

import { useEffect, useRef, useState } from 'react'
import { track } from '@/lib/analytics-client'
import {
  WeatherCard,
  PriceCard,
  OrderTracker,
  FlightList,
} from '@/app/(home)/_components/hero-demo/widgets'

type ToolName = 'weather' | 'price' | 'order' | 'flight'

type Scene = {
  name: ToolName
  label: string
  ask: string
  toolLabel: string
  ms: number
  say: string
}

const SCENES: Scene[] = [
  {
    name: 'weather',
    label: 'Weather',
    ask: 'weather in Tokyo this weekend?',
    toolLabel: "weather.get({ city: \"Tokyo\", days: 5 })",
    ms: 600,
    say: 'Sunny Saturday, showers Sunday → Monday. Pack a light jacket.',
  },
  {
    name: 'price',
    label: 'Crypto',
    ask: 'BTC price?',
    toolLabel: "crypto.quote({ symbol: \"BTC\" })",
    ms: 420,
    say: 'Bitcoin is $62,480 — up 2.1% in the last 24h.',
  },
  {
    name: 'order',
    label: 'Orders',
    ask: 'track my order',
    toolLabel: "orders.status({ id: \"482\" })",
    ms: 510,
    say: 'Order #482 is out for delivery, arriving today.',
  },
  {
    name: 'flight',
    label: 'Flights',
    ask: 'flights NYC → LAX tomorrow',
    toolLabel: "flights.search({ from: \"JFK\", to: \"LAX\" })",
    ms: 780,
    say: 'Three options — JetBlue 9:05am, $289 is the best balance of price and duration.',
  },
]

function widgetFor(name: ToolName) {
  if (name === 'weather') return <WeatherCard />
  if (name === 'price') return <PriceCard />
  if (name === 'order') return <OrderTracker />
  return <FlightList />
}

type Frame = {
  userMsg: string | null
  tool: { label: string; done: boolean; ms: number } | null
  widget: ToolName | null
  assistant: string
}

const EMPTY: Frame = { userMsg: null, tool: null, widget: null, assistant: '' }

export function ToolsPreview() {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [runId, setRunId] = useState(0)
  const [frame, setFrame] = useState<Frame>(EMPTY)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const userInteracted = useRef(false)
  const exampleReported = useRef(false)

  useEffect(() => {
    let cancelled = false
    const scene = SCENES[sceneIdx]
    const sleep = (ms: number) =>
      new Promise<void>((r) => {
        const t = setTimeout(r, ms)
        return () => clearTimeout(t)
      })

    const run = async () => {
      setFrame({ ...EMPTY, userMsg: scene.ask })
      if (cancelled) return
      await sleep(250)
      if (cancelled) return
      setFrame((f) => ({ ...f, tool: { label: scene.toolLabel, done: false, ms: scene.ms } }))
      await sleep(scene.ms)
      if (cancelled) return
      setFrame((f) => ({ ...f, tool: f.tool ? { ...f.tool, done: true } : null }))
      await sleep(220)
      if (cancelled) return
      setFrame((f) => ({ ...f, widget: scene.name }))
      await sleep(220)
      if (cancelled) return
      const text = scene.say
      for (let i = 1; i <= text.length; i++) {
        if (cancelled) return
        setFrame((f) => ({ ...f, assistant: text.slice(0, i) }))
        await sleep(18)
      }

      if (!cancelled && userInteracted.current && !exampleReported.current) {
        track('example_completed', {
          example_id: 'learn-tools-preview',
          completion_type: 'tool_call_and_result',
          surface: 'learn',
        })
        exampleReported.current = true
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [runId, sceneIdx])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [frame])

  return (
    <div
      data-ak-learn-preview
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-ak-border bg-ak-surface shadow-2xl shadow-black/40"
    >
      <div className="flex items-center justify-between border-b border-ak-border px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-ak-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f0b429]/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-ak-green/70" />
        </div>
        <span className="font-mono text-xs text-ak-graphite">chat.agentskit.io</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-ak-green">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ak-green" />
          live
        </span>
      </div>

      <div className="flex h-[480px] min-w-0 flex-col overflow-hidden bg-ak-midnight font-sans text-sm">
        <div
          ref={scrollRef}
          className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
          style={{ scrollbarWidth: 'thin' }}
        >
          {frame.userMsg && (
            <div className="flex min-w-0 justify-end">
              <div className="max-w-[80%] break-words rounded-2xl rounded-br-md bg-ak-blue/20 px-3.5 py-2 text-ak-foam">
                {frame.userMsg}
              </div>
            </div>
          )}

          {(frame.tool || frame.widget || frame.assistant) && (
            <div className="flex w-full min-w-0 justify-start">
              <div className="flex w-full min-w-0 max-w-[92%] flex-col gap-2">
                {frame.tool && (
                  <div
                    className={`inline-flex max-w-full items-start gap-2 rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                      frame.tool.done
                        ? 'border-ak-green/30 bg-ak-green/5 text-ak-green'
                        : 'border-ak-blue/30 bg-ak-blue/5 text-ak-blue'
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {frame.tool.done ? '✓' : (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-ak-blue border-t-transparent" />
                      )}
                    </span>
                    <span className="min-w-0 break-all">{frame.tool.label}</span>
                    {frame.tool.done && (
                      <span className="shrink-0 text-ak-graphite">{frame.tool.ms}ms</span>
                    )}
                  </div>
                )}

                {frame.widget && (
                  <div key={frame.widget} className="min-w-0 max-w-full animate-fade-in">
                    {widgetFor(frame.widget)}
                  </div>
                )}

                {frame.assistant && (
                  <div
                    className="w-fit max-w-full rounded-2xl rounded-bl-md bg-ak-surface px-3.5 py-2 text-ak-foam"
                    style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                  >
                    {frame.assistant}
                    <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 animate-pulse bg-ak-blue" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 items-center gap-2 border-t border-ak-border bg-ak-surface px-3 py-2.5">
          <span className="shrink-0 font-mono text-xs text-ak-graphite">›</span>
          <span className="min-w-0 flex-1 truncate text-ak-graphite">ask anything…</span>
          <kbd className="rounded border border-ak-border px-1.5 py-0.5 font-mono text-[10px] text-ak-graphite">⏎</kbd>
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-ak-border bg-ak-surface px-4 py-2.5">
        <div className="flex flex-wrap justify-center gap-1.5">
          {SCENES.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onClick={() => {
                userInteracted.current = true
                setFrame(EMPTY)
                setSceneIdx(i)
                setRunId((current) => current + 1)
              }}
              className={`rounded-full px-2.5 py-1 font-mono text-[11px] transition ${
                i === sceneIdx ? 'bg-ak-blue/20 text-ak-blue' : 'text-ak-graphite hover:text-ak-foam'
              }`}
            >
              <span
                className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                  i === sceneIdx ? 'bg-ak-blue' : 'bg-ak-border'
                }`}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export const TOOLS_SOURCE = `import { useChat, ChatContainer, Message, InputBar } from '@agentskit/react'
import { defineTool } from '@agentskit/tools'
import { WeatherCard, PriceCard, OrderTracker, FlightList } from './widgets'

const getWeather = defineTool({
  name: 'weather.get',
  description: 'Current weather and 5-day forecast for a city.',
  schema: { city: 'string', days: 'number?' },
  async execute({ city }) {
    return { city, tempF: 72, days: [/* ... */] }
  },
})

const tools = [getWeather /* , crypto.quote, orders.status, flights.search */]

function renderToolResult(name: string, result: unknown) {
  if (name === 'weather.get') return <WeatherCard data={result} />
  if (name === 'crypto.quote') return <PriceCard data={result} />
  if (name === 'orders.status') return <OrderTracker data={result} />
  if (name === 'flights.search') return <FlightList data={result} />
  return null
}

export function Agent() {
  const chat = useChat({ adapter, tools })
  return (
    <ChatContainer>
      {chat.messages.map((msg) => (
        <Message key={msg.id} message={msg}>
          {msg.toolCalls?.map((t) => (
            <div key={t.id}>{renderToolResult(t.name, t.result)}</div>
          ))}
        </Message>
      ))}
      <InputBar chat={chat} />
    </ChatContainer>
  )
}
`
