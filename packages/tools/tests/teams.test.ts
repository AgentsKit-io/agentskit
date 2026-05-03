import { describe, expect, it, vi } from 'vitest'
import {
  adaptiveCard,
  messageCard,
  teams,
  teamsSendBot,
  teamsSendWebhook,
  type TeamsBotClient,
} from '../src/integrations/teams'

const stubCtx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }
const WEBHOOK = 'https://outlook.office.com/webhook/abc'

function fakeFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    return impl(String(input), init ?? {})
  }) as unknown as typeof fetch
}

describe('adaptiveCard()', () => {
  it('builds title + text + facts + actions', () => {
    const card = adaptiveCard({
      title: 'Deploy ok',
      text: 'commit abc',
      facts: [{ title: 'env', value: 'prod' }],
      actions: [{ type: 'Action.OpenUrl', title: 'logs', url: 'https://x' }],
    })
    expect(card.contentType).toBe('application/vnd.microsoft.card.adaptive')
    expect(card.content.version).toBe('1.5')
    expect(card.content.body).toHaveLength(3)
    expect(card.content.actions).toHaveLength(1)
  })

  it('omits actions when none provided', () => {
    const card = adaptiveCard({ title: 'hi' })
    expect(card.content.actions).toBeUndefined()
  })
})

describe('messageCard()', () => {
  it('falls back summary to title', () => {
    const card = messageCard({ title: 'Build failed' })
    expect(card.content.summary).toBe('Build failed')
    expect(card.content['@type']).toBe('MessageCard')
  })
})

describe('teamsSendWebhook', () => {
  it('throws when webhookUrl missing', () => {
    expect(() => teamsSendWebhook({ webhookUrl: '' })).toThrow(/webhookUrl is required/)
  })

  it('wraps plain text into a MessageCard attachment', async () => {
    let captured: Record<string, unknown> = {}
    const fetch = fakeFetch((_url, init) => {
      captured = JSON.parse(String(init.body))
      return new Response(null, { status: 200 })
    })
    const tool = teamsSendWebhook({ webhookUrl: WEBHOOK, fetch })
    const result = await tool.execute!({ text: 'hello', title: 'Greeting' }, stubCtx)
    expect(result).toEqual({ ok: true, status: 200 })
    expect(captured.type).toBe('message')
    const attachments = captured.attachments as Array<{ content: { title: string } }>
    expect(attachments[0].content.title).toBe('Greeting')
  })

  it('forwards a pre-built Adaptive Card untouched', async () => {
    let captured: Record<string, unknown> = {}
    const fetch = fakeFetch((_url, init) => {
      captured = JSON.parse(String(init.body))
      return new Response(null, { status: 200 })
    })
    const tool = teamsSendWebhook({ webhookUrl: WEBHOOK, fetch })
    const card = adaptiveCard({ title: 'x' })
    await tool.execute!({ card }, stubCtx)
    expect((captured.attachments as unknown[])[0]).toEqual(card)
  })

  it('rejects when no body, title, or card', async () => {
    const tool = teamsSendWebhook({ webhookUrl: WEBHOOK, fetch: fakeFetch(() => new Response()) })
    await expect(tool.execute!({}, stubCtx)).rejects.toThrow(/text, title, or card/)
  })

  it('reports non-2xx as ToolError', async () => {
    const fetch = fakeFetch(() => new Response('rate limited', { status: 429 }))
    const tool = teamsSendWebhook({ webhookUrl: WEBHOOK, fetch })
    await expect(tool.execute!({ text: 'hi' }, stubCtx)).rejects.toThrow(/HTTP 429/)
  })
})

function makeBotClient(overrides?: Partial<TeamsBotClient>): { client: TeamsBotClient; sent: unknown[] } {
  const sent: unknown[] = []
  const client: TeamsBotClient = {
    send: vi.fn(async (msg) => {
      sent.push(msg)
      return { id: 'act-1', conversationId: msg.conversationId }
    }),
    ...overrides,
  }
  return { client, sent }
}

describe('teamsSendBot', () => {
  it('throws when client missing', () => {
    expect(() => teamsSendBot({ client: undefined as unknown as TeamsBotClient })).toThrow(/client is required/)
  })

  it('sends text + reply_to_id to the injected client', async () => {
    const { client, sent } = makeBotClient()
    const tool = teamsSendBot({ client })
    const result = (await tool.execute!(
      { conversation_id: 'conv-1', text: 'hi', reply_to_id: 'act-0' },
      stubCtx,
    )) as { id: string; conversationId: string }
    expect(result).toEqual({ id: 'act-1', conversationId: 'conv-1' })
    expect(sent[0]).toMatchObject({ conversationId: 'conv-1', text: 'hi', replyToId: 'act-0' })
  })

  it('rejects when both text and card missing', async () => {
    const { client } = makeBotClient()
    const tool = teamsSendBot({ client })
    await expect(tool.execute!({ conversation_id: 'c' }, stubCtx)).rejects.toThrow(/text or card/)
  })

  it('wraps client errors as ToolError', async () => {
    const client: TeamsBotClient = {
      send: async () => {
        throw new Error('401 unauthorized')
      },
    }
    const tool = teamsSendBot({ client })
    await expect(
      tool.execute!({ conversation_id: 'c', text: 't' }, stubCtx),
    ).rejects.toThrow(/teams_send_bot: 401 unauthorized/)
  })
})

describe('teams()', () => {
  it('returns webhook + bot tools when both configured', () => {
    const { client } = makeBotClient()
    const tools = teams({ webhook: { webhookUrl: WEBHOOK }, bot: { client } })
    expect(tools.map(t => t.name)).toEqual(['teams_send_webhook', 'teams_send_bot'])
  })

  it('throws when neither configured', () => {
    expect(() => teams({})).toThrow(/at least one/)
  })
})
