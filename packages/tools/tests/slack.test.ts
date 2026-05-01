import { describe, it, expect, vi } from 'vitest'
import { slackTool } from '../src/slack'

const WEBHOOK = 'https://hooks.slack.com/services/T/B/XYZ'

function fakeFetch(impl: (url: string, init: RequestInit) => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    return impl(String(input), init ?? {})
  }) as unknown as typeof fetch
}

describe('slackTool', () => {
  it('satisfies ToolDefinition contract', () => {
    const tool = slackTool({ webhookUrl: WEBHOOK })
    expect(tool.name).toBe('slack_send')
    expect(tool.description).toBeTruthy()
    expect(tool.schema).toBeDefined()
    expect(tool.category).toBe('notification')
    expect(tool.execute).toBeTypeOf('function')
  })

  it('POSTs to the webhook with JSON body', async () => {
    const fetchMock = fakeFetch(() => new Response(null, { status: 200 }))
    const tool = slackTool({ webhookUrl: WEBHOOK, fetch: fetchMock })
    const result = await tool.execute({ text: 'hello' })
    expect(result).toEqual({ ok: true, status: 200 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe(WEBHOOK)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(String(init.body))).toEqual({ text: 'hello' })
  })

  it('forwards channel and username when present', async () => {
    let captured: Record<string, unknown> = {}
    const fetchMock = fakeFetch((_url, init) => {
      captured = JSON.parse(String(init.body))
      return new Response(null, { status: 200 })
    })
    const tool = slackTool({ webhookUrl: WEBHOOK, fetch: fetchMock })
    await tool.execute({ text: 'hi', channel: '#alerts', username: 'bot' })
    expect(captured).toEqual({ text: 'hi', channel: '#alerts', username: 'bot' })
  })

  it('reports non-2xx as ok=false with status', async () => {
    const fetchMock = fakeFetch(() => new Response('rate limited', { status: 429 }))
    const tool = slackTool({ webhookUrl: WEBHOOK, fetch: fetchMock })
    const result = await tool.execute({ text: 'hi' }) as { ok: boolean; status: number }
    expect(result.ok).toBe(false)
    expect(result.status).toBe(429)
  })

  it('rejects missing text', async () => {
    const tool = slackTool({ webhookUrl: WEBHOOK, fetch: fakeFetch(() => new Response()) })
    await expect(tool.execute({ text: '' })).rejects.toThrow(/missing text/)
  })

  it('rejects missing webhookUrl at construction time', () => {
    expect(() => slackTool({ webhookUrl: '' })).toThrow(/webhookUrl is required/)
  })
})
