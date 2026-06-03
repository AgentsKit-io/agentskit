import { describe, expect, it, vi } from 'vitest'
import {
  createChatTrigger,
  type ChatMessageEvent,
  type ChatSurfaceAdapter,
  type ChatSurfaceEvent,
  type ChatTriggerObserverEvent,
} from '../src/chat-trigger'
import type { AgentHandle } from '../src/topologies'
import type { WebhookRequest } from '../src/background'

function agent(impl: (task: string) => Promise<string> | string = async () => 'ok'): AgentHandle {
  return { name: 'a', run: async task => impl(task) }
}

const REQ: WebhookRequest = { method: 'POST', headers: {}, body: { text: 'hi' } }

const SAMPLE_MESSAGE: ChatMessageEvent = {
  type: 'message',
  surface: 'slack',
  channel: { id: 'C1', name: 'general', kind: 'channel' },
  user: { id: 'U1', name: 'alice' },
  eventId: 'E1',
  text: 'hello bot',
  receivedAt: '2026-01-01T00:00:00.000Z',
}

function buildAdapter(overrides: Partial<ChatSurfaceAdapter> = {}): ChatSurfaceAdapter {
  return {
    surface: 'slack',
    parse: () => SAMPLE_MESSAGE,
    verify: () => true,
    ...overrides,
  }
}

describe('createChatTrigger — config guards', () => {
  it('throws when adapter missing', () => {
    expect(() =>
      createChatTrigger({ adapter: undefined as unknown as ChatSurfaceAdapter, agent: agent() }),
    ).toThrow(/adapter is required/)
  })

  it('throws when agent missing', () => {
    expect(() =>
      createChatTrigger({ adapter: buildAdapter(), agent: undefined as unknown as AgentHandle }),
    ).toThrow(/agent is required/)
  })

  it('throws by default when adapter.verify is missing (strict mode)', () => {
    expect(() =>
      createChatTrigger({
        adapter: { surface: 'slack', parse: () => SAMPLE_MESSAGE },
        agent: agent(),
      }),
    ).toThrow(/refusing to construct an unverified trigger/)
  })

  it('allows missing verify when strict: false', () => {
    expect(() =>
      createChatTrigger({
        adapter: { surface: 'slack', parse: () => SAMPLE_MESSAGE },
        agent: agent(),
        strict: false,
      }),
    ).not.toThrow()
  })
})

describe('createChatTrigger — happy path', () => {
  it('parses, runs, returns 200 with the agent reply body', async () => {
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(async task => `echo:${task}`),
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
    expect(res.body).toBe('echo:hello bot')
    expect(events.map(e => e.type)).toEqual(['received', 'handled'])
    expect(trig.surface).toBe('slack')
  })

  it('builds task from event.text by default for message/mention/reply', async () => {
    let seen = ''
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(async task => {
        seen = task
        return ''
      }),
    })
    await trig.handler(REQ)
    expect(seen).toBe('hello bot')
  })

  it('falls back to JSON.stringify for non-text events', async () => {
    let seen = ''
    const reaction: ChatSurfaceEvent = {
      type: 'reaction',
      surface: 'slack',
      channel: { id: 'C1' },
      user: { id: 'U1' },
      eventId: 'E2',
      messageId: 'M1',
      emoji: 'thumbsup',
      added: true,
    }
    const trig = createChatTrigger({
      adapter: buildAdapter({ parse: () => reaction }),
      agent: agent(async task => {
        seen = task
        return ''
      }),
    })
    await trig.handler(REQ)
    expect(seen).toContain('"type":"reaction"')
    expect(seen).toContain('"emoji":"thumbsup"')
  })

  it('honours buildTask + buildContext overrides', async () => {
    let seen: { task: string; ctx: unknown } | null = null
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: { name: 'a', run: async (task, ctx) => { seen = { task, ctx }; return '' } },
      buildTask: e => `routed:${e.eventId}`,
      buildContext: e => ({ tenant: e.user.id }),
    })
    await trig.handler(REQ)
    expect(seen).toEqual({ task: 'routed:E1', ctx: { tenant: 'U1' } })
  })
})

describe('createChatTrigger — adapter signals', () => {
  it('returns 401 when verify returns false', async () => {
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter({ verify: () => false }),
      agent: agent(),
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(401)
    expect(res.body).toBe('unauthorized')
    expect(events.map(e => e.type)).toEqual(['received', 'rejected'])
    expect(events[1]!.reason).toContain('verify')
  })

  it('returns 200 ignored when adapter parse returns null', async () => {
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter({ parse: () => null }),
      agent: agent(),
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
    expect(res.body).toBe('ignored')
    expect(events.map(e => e.type)).toEqual(['received', 'skipped'])
  })

  it('returns 400 when adapter parse throws', async () => {
    const trig = createChatTrigger({
      adapter: buildAdapter({
        parse: () => {
          throw new Error('bad payload')
        },
      }),
      agent: agent(),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(400)
    expect(res.body).toContain('bad payload')
  })

  it('returns 400 when the parsed event fails eventSchema (ADR-0011)', async () => {
    const events: ChatTriggerObserverEvent[] = []
    let ran = false
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(async () => { ran = true; return 'ok' }),
      eventSchema: { type: 'object', required: ['type'], properties: { type: { const: 'reaction' } } },
      validateEvent: () => ({ valid: false, message: 'type must be reaction' }),
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(400)
    expect(res.body).toContain('type must be reaction')
    expect(ran).toBe(false)
    expect(events.map(e => e.type)).toEqual(['received', 'rejected'])
  })

  it('runs the agent when the parsed event passes eventSchema', async () => {
    let passedSchema = false
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(async () => 'ok'),
      eventSchema: { type: 'object' },
      validateEvent: (schema, evt) => {
        passedSchema = typeof schema === 'object' && typeof (evt as { type?: unknown }).type === 'string'
        return { valid: true }
      },
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
    expect(passedSchema).toBe(true)
  })

  it('skips validation when only eventSchema or only validateEvent is set', async () => {
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(async () => 'ok'),
      eventSchema: { type: 'object', required: ['nope'] },
      // no validateEvent → validation is a no-op
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
  })

  it('returns 500 with a generic body when the agent throws (no error leak to surface logs)', async () => {
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(async () => {
        throw new Error('secret stack detail')
      }),
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(500)
    expect(res.body).toBe('internal error')
    expect(res.body).not.toContain('secret stack detail')
    // Full message still surfaces in observer for monitoring.
    expect(events.find(e => e.type === 'rejected')!.reason).toBe('secret stack detail')
  })
})

describe('createChatTrigger — filter', () => {
  it('skips when filter returns false', async () => {
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(),
      filter: e => e.user.id !== 'U1',
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
    expect(res.body).toBe('filtered')
    expect(events.map(e => e.type)).toEqual(['received', 'skipped'])
  })

  it('skips bot-on-bot loops via isBot filter', async () => {
    const trig = createChatTrigger({
      adapter: buildAdapter({
        parse: () => ({ ...SAMPLE_MESSAGE, user: { id: 'U2', isBot: true } }),
      }),
      agent: agent(),
      filter: e => !e.user.isBot,
    })
    const res = await trig.handler(REQ)
    expect(res.body).toBe('filtered')
  })
})

describe('createChatTrigger — autoReply', () => {
  it('calls adapter.reply when autoReply is on and reply is provided', async () => {
    const reply = vi.fn()
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter({ reply }),
      agent: agent(async () => 'reply text'),
      autoReply: true,
      onEvent: e => events.push(e),
    })
    await trig.handler(REQ)
    expect(reply).toHaveBeenCalledWith(SAMPLE_MESSAGE, 'reply text')
    expect(events.map(e => e.type)).toEqual(['received', 'handled', 'replied'])
  })

  it('emits reply_failed (not rejected) when reply throws after handled', async () => {
    const events: ChatTriggerObserverEvent[] = []
    const trig = createChatTrigger({
      adapter: buildAdapter({
        reply: () => {
          throw new Error('post failed')
        },
      }),
      agent: agent(async () => 'ok'),
      autoReply: true,
      onEvent: e => events.push(e),
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
    expect(events.map(e => e.type)).toEqual(['received', 'handled', 'reply_failed'])
    expect(events.find(e => e.type === 'reply_failed')!.reason).toBe('post failed')
  })

  it('does not call reply when autoReply is off', async () => {
    const reply = vi.fn()
    const trig = createChatTrigger({
      adapter: buildAdapter({ reply }),
      agent: agent(),
    })
    await trig.handler(REQ)
    expect(reply).not.toHaveBeenCalled()
  })

  it('does not throw when autoReply is on but adapter.reply is missing', async () => {
    const trig = createChatTrigger({
      adapter: buildAdapter(),
      agent: agent(),
      autoReply: true,
    })
    const res = await trig.handler(REQ)
    expect(res.status).toBe(200)
  })
})

describe('createChatTrigger — surface union', () => {
  it('preserves the surface name from adapter', () => {
    for (const surface of ['slack', 'teams', 'discord', 'whatsapp', 'mattermost'] as const) {
      const trig = createChatTrigger({
        adapter: buildAdapter({ surface }),
        agent: agent(),
      })
      expect(trig.surface).toBe(surface)
    }
  })
})
