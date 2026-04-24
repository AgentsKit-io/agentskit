'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { createLocalStorageMemory } from '@agentskit/core'
import type { AdapterFactory, StreamChunk, ToolDefinition } from '@agentskit/core'
import { useChat, ChatContainer, InputBar } from '@agentskit/react'
import '@agentskit/react/theme'
import { initialAssistant } from './_shared/mock-adapter'
import { ToolBadge } from './_shared/tool-badge'
import { MdRenderer } from './_shared/md-renderer'

/**
 * Branching reservation flow driven by a tiny state machine. Each step emits
 * a scripted assistant reply through a mock adapter, plus quick-reply buttons
 * for the next branch. Picking "Talk to a human" at any step escalates.
 */

type Step =
  | 'greet'
  | 'party'
  | 'date'
  | 'time'
  | 'confirm'
  | 'done'
  | 'order-which'
  | 'order-status'
  | 'order-followup'
  | 'escalated'

type OrderResult = {
  orderId: string
  status: string
  carrier: string
  tracking?: string
  reason?: string
  eta: string
}

type Option = {
  label: string
  next: Step
  tool?: { name: string; args: Record<string, unknown>; result: unknown; durationMs: number }
  widget?: { kind: 'order'; data: OrderResult }
}

const SCRIPT: Record<Step, { say: string; options: Option[] }> = {
  greet: {
    say: 'Hi — I can take a reservation, look up an order, or hand you to a human. What do you need?',
    options: [
      { label: 'Book a table', next: 'party' },
      { label: 'Track an order', next: 'order-which' },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  party: {
    say: 'How many people?',
    options: [
      { label: '2 people', next: 'date' },
      { label: '4 people', next: 'date' },
      { label: '6+ people', next: 'escalated' },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  date: {
    say: 'Which day works?',
    options: [
      { label: 'Tonight', next: 'time' },
      { label: 'Tomorrow', next: 'time' },
      { label: 'This weekend', next: 'time' },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  time: {
    say: 'Pick a time slot — I will check availability.',
    options: [
      {
        label: '7:00 PM',
        next: 'confirm',
        tool: {
          name: 'check_availability',
          args: { time: '19:00' },
          result: { available: true, table: 12 },
          durationMs: 320,
        },
      },
      {
        label: '8:30 PM',
        next: 'confirm',
        tool: {
          name: 'check_availability',
          args: { time: '20:30' },
          result: { available: true, table: 7 },
          durationMs: 300,
        },
      },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  confirm: {
    say: 'Got a table — confirm the booking?',
    options: [
      {
        label: 'Confirm',
        next: 'done',
        tool: {
          name: 'create_reservation',
          args: { confirmed: true },
          result: { id: 'RSV-9842', ok: true },
          durationMs: 410,
        },
      },
      { label: 'Cancel', next: 'greet' },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  done: {
    say: 'Booked! Your confirmation number is **RSV-9842**. Anything else?',
    options: [{ label: 'Start over', next: 'greet' }],
  },
  escalated: {
    say: 'Escalated to a human support agent — you will hear back within 15 minutes.',
    options: [{ label: 'Start over', next: 'greet' }],
  },
  'order-which': {
    say: 'Which order? Pick a recent one or enter an ID in the box.',
    options: [
      {
        label: '#48291 · Aurora ANC',
        next: 'order-status',
        tool: {
          name: 'lookup_order',
          args: { orderId: '#48291' },
          result: {
            status: 'shipped',
            carrier: 'UPS',
            tracking: '1Z999AA10123456784',
            eta: '2026-04-25',
          },
          durationMs: 380,
        },
        widget: {
          kind: 'order',
          data: {
            orderId: '#48291',
            status: 'shipped',
            carrier: 'UPS',
            tracking: '1Z999AA10123456784',
            eta: '2026-04-25',
          },
        },
      },
      {
        label: '#47013 · Nimbus Stand',
        next: 'order-status',
        tool: {
          name: 'lookup_order',
          args: { orderId: '#47013' },
          result: { status: 'delayed', carrier: 'USPS', reason: 'weather', eta: '2026-04-27' },
          durationMs: 360,
        },
        widget: {
          kind: 'order',
          data: {
            orderId: '#47013',
            status: 'delayed',
            carrier: 'USPS',
            reason: 'weather',
            eta: '2026-04-27',
          },
        },
      },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  'order-status': {
    say: 'Found it — see the details above. Anything else?',
    options: [
      {
        label: 'Resend tracking email',
        next: 'order-followup',
        tool: {
          name: 'resend_tracking_email',
          args: { orderId: '#48291' },
          result: { ok: true, to: 'user@example.com' },
          durationMs: 280,
        },
      },
      {
        label: 'Change delivery address',
        next: 'escalated',
      },
      { label: 'Back to menu', next: 'greet' },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
  'order-followup': {
    say: 'Tracking email resent to **user@example.com** — should arrive in under a minute.',
    options: [
      { label: 'Back to menu', next: 'greet' },
      { label: 'Talk to a human', next: 'escalated' },
    ],
  },
}

function createStepAdapter(
  stepRef: { current: Step },
  pendingToolRef: { current: Option['tool'] | undefined },
): AdapterFactory {
  return {
    createSource: () => ({
      stream: async function* (): AsyncIterableIterator<StreamChunk> {
        const call = pendingToolRef.current
        pendingToolRef.current = undefined
        if (call) {
          yield {
            type: 'tool_call',
            toolCall: {
              id: `call-${Math.random().toString(36).slice(2, 8)}`,
              name: call.name,
              args: JSON.stringify(call.args),
            },
          }
          // Runtime runs the registered tool stub and emits tool_result.
          yield { type: 'done' }
          return
        }
        const reply = SCRIPT[stepRef.current].say
        for (const ch of reply) {
          await new Promise((r) => setTimeout(r, 14))
          yield { type: 'text', content: ch }
        }
        yield { type: 'done' }
      },
      abort() {},
    }),
    capabilities: { streaming: true, tools: true },
  }
}

function buildTools(): ToolDefinition[] {
  const defs: { name: string; result: unknown; durationMs: number }[] = []
  for (const step of Object.values(SCRIPT)) {
    for (const opt of step.options) {
      if (opt.tool && !defs.some((d) => d.name === opt.tool!.name)) {
        defs.push({ name: opt.tool.name, result: opt.tool.result, durationMs: opt.tool.durationMs })
      }
    }
  }
  return defs.map<ToolDefinition>((d) => ({
    name: d.name,
    description: `Mock ${d.name}`,
    schema: {},
    async execute() {
      await new Promise((r) => setTimeout(r, d.durationMs))
      return JSON.stringify(d.result)
    },
  }))
}

function OrderCard({ order }: { order: OrderResult }) {
  const isShipped = order.status === 'shipped'
  return (
    <div className="rounded-lg border border-ak-border bg-ak-midnight/60 p-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-ak-foam">{order.orderId}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
            isShipped
              ? 'bg-ak-green/15 text-ak-green'
              : 'bg-[#f0b429]/15 text-[#f0b429]'
          }`}
        >
          {order.status}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-ak-graphite">
        <dt>Carrier</dt>
        <dd className="text-ak-foam">{order.carrier}</dd>
        {order.tracking ? (
          <>
            <dt>Tracking</dt>
            <dd className="break-all text-ak-foam">{order.tracking}</dd>
          </>
        ) : null}
        {order.reason ? (
          <>
            <dt>Delay</dt>
            <dd className="text-ak-foam">{order.reason}</dd>
          </>
        ) : null}
        <dt>ETA</dt>
        <dd className="text-ak-foam">{order.eta}</dd>
      </dl>
    </div>
  )
}

export function SupportBot() {
  const stepRef = useRef<Step>('greet')
  const pendingToolRef = useRef<Option['tool']>(undefined)
  const [step, setStep] = useState<Step>('greet')
  const [order, setOrder] = useState<OrderResult | null>(null)

  const adapter = useMemo(() => createStepAdapter(stepRef, pendingToolRef), [])
  const tools = useMemo(() => buildTools(), [])
  const memory = useMemo(() => createLocalStorageMemory({ key: 'ak:example:support' }), [])

  const chat = useChat({
    adapter,
    memory,
    tools,
    // 2 lets the runtime re-prompt once after the tool result so the adapter
    // streams the step's scripted text. Any further iterations are a no-op
    // because the adapter emits `done` on its second call.
    maxToolIterations: 2,
    initialMessages: [initialAssistant(SCRIPT.greet.say)],
  })

  const pick = useCallback(
    (opt: Option) => {
      stepRef.current = opt.next
      pendingToolRef.current = opt.tool
      setStep(opt.next)
      if (opt.widget?.kind === 'order') setOrder(opt.widget.data)
      if (opt.next === 'greet') setOrder(null)
      void chat.send(opt.label)
    },
    [chat],
  )

  const options = SCRIPT[step].options
  const idle = chat.status !== 'streaming'

  return (
    <div
      data-ak-example
      className="flex h-[520px] flex-col overflow-hidden rounded-lg border border-ak-border bg-ak-surface"
    >
      <ChatContainer className="flex-1 space-y-2 p-4">
        {chat.messages
          .filter((m) => m.role !== 'tool')
          .map((m) => {
            const showOrderCard =
              order &&
              m.role === 'assistant' &&
              m.toolCalls?.some((t) => t.name === 'lookup_order' && t.status !== 'pending')
            return (
              <div key={m.id} className="flex flex-col gap-1.5">
                {m.toolCalls?.map((t) => (
                  <ToolBadge key={t.id} call={t} />
                ))}
                {showOrderCard ? <OrderCard order={order} /> : null}
                {m.content ? (
                  <div data-ak-message data-ak-role={m.role} className="rounded-lg bg-ak-midnight/40 p-3">
                    <MdRenderer content={m.content} />
                  </div>
                ) : null}
              </div>
            )
          })}
        {idle ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {options.map((opt) => {
              const escalate = opt.next === 'escalated' && opt.label.includes('human')
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pick(opt)}
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition ${
                    escalate
                      ? 'border-ak-red/40 text-ak-red hover:bg-ak-red/10'
                      : 'border-ak-border text-ak-foam hover:border-ak-foam hover:bg-ak-foam/10'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </ChatContainer>
      <InputBar chat={chat} />
    </div>
  )
}
