import { describe, it, expect } from 'vitest'
import { slackIntegration } from '../src/services/slack/index'
import { toToolDefinitions } from '../src/project/to-tool-definitions'
import { assertValidIntegration } from '../src/testing/validate'
import { defineIntegration, defineAction } from '../src/contract'

function fakeFetch(handler: (url: string, init: RequestInit) => Response): typeof globalThis.fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init ?? {})) as typeof globalThis.fetch
}
const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })

describe('slack integration', () => {
  it('satisfies the contract', () => {
    expect(() => assertValidIntegration(slackIntegration)).not.toThrow()
    expect(slackIntegration.capabilities?.send).toBe('slack_post_message')
  })

  it('projects to tool definitions with auth-bound transport', async () => {
    let seenUrl = ''
    let seenAuth = ''
    const fetch = fakeFetch((url, init) => {
      seenUrl = url
      seenAuth = String((init.headers as Record<string, string>).authorization ?? '')
      return json({ ok: true, ts: '123.456' })
    })
    const tools = toToolDefinitions(slackIntegration, { credential: 'xoxb-1', fetch })
    expect(tools.map((t) => t.name)).toEqual(['slack_post_message', 'slack_search'])

    const post = tools.find((t) => t.name === 'slack_post_message')!
    const result = await post.execute!({ channel: '#g', text: 'hi' }, { messages: [], call: { id: '1', name: 'slack_post_message', args: {}, status: 'running' } })
    expect(result).toEqual({ ts: '123.456' })
    expect(seenUrl).toContain('chat.postMessage')
    expect(seenAuth).toBe('Bearer xoxb-1')
  })

  it('throws when Slack returns ok:false', async () => {
    const fetch = fakeFetch(() => json({ ok: false, error: 'channel_not_found' }))
    const [post] = toToolDefinitions(slackIntegration, { credential: 'x', fetch })
    await expect(
      post.execute!({ channel: 'bad', text: 'x' }, { messages: [], call: { id: '1', name: 'slack_post_message', args: {}, status: 'running' } }),
    ).rejects.toThrow(/channel_not_found/)
  })

  it('maps search matches', async () => {
    const fetch = fakeFetch(() =>
      json({ messages: { matches: [{ channel: { name: 'gen' }, text: 'hello', permalink: 'http://x' }] } }),
    )
    const search = toToolDefinitions(slackIntegration, { credential: 'x', fetch }).find((t) => t.name === 'slack_search')!
    const out = (await search.execute!({ query: 'hello' }, { messages: [], call: { id: '1', name: 'slack_search', args: {}, status: 'running' } })) as unknown[]
    expect(out).toEqual([{ channel: 'gen', text: 'hello', url: 'http://x' }])
  })

  it('projects a no-auth integration (no auth header)', async () => {
    let seenAuth: string | undefined
    const fetch = fakeFetch((_url, init) => {
      seenAuth = (init.headers as Record<string, string>).authorization
      return json({ ok: true })
    })
    const noAuth = defineIntegration({
      name: 'noauth',
      displayName: 'NoAuth',
      categories: ['example'],
      http: { baseUrl: 'https://api.example.com' },
      auth: { kind: 'none' },
      actions: [
        defineAction({
          name: 'noauth_get',
          description: 'get',
          schema: { type: 'object', properties: {}, required: [] },
          execute: (_args, { http }) => http({ path: '/x' }),
        }),
      ],
    })
    const [tool] = toToolDefinitions(noAuth, { fetch })
    await tool.execute!({}, { messages: [], call: { id: '1', name: 'noauth_get', args: {}, status: 'running' } })
    expect(seenAuth).toBeUndefined()
  })
})
