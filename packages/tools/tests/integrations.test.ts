import { describe, expect, it, vi } from 'vitest'
import {
  discord,
  github,
  githubCommentIssue,
  githubCreateIssue,
  githubSearchIssues,
  gmail,
  gmailListMessages,
  gmailSendEmail,
  googleCalendar,
  calendarCreateEvent,
  calendarListEvents,
  linear,
  linearCreateIssue,
  linearSearchIssues,
  notion,
  notionCreatePage,
  notionSearch,
  postgres,
  postgresQuery,
  s3,
  s3GetObject,
  s3ListObjects,
  s3PutObject,
  slack,
  slackPostMessage,
  slackSearch,
  stripe,
  stripeCreateCustomer,
  stripeCreatePaymentIntent,
} from '../src/integrations'

function mockFetch(response: unknown, opts: { status?: number; text?: boolean } = {}) {
  const capture: { url?: string; init?: RequestInit } = {}
  const fake = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    capture.url = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url
    capture.init = init
    const text = opts.text ? String(response) : JSON.stringify(response)
    return new Response(text, { status: opts.status ?? 200 })
  })
  return { fetch: fake as unknown as typeof globalThis.fetch, capture }
}

const stubCtx = { messages: [], call: { id: 'c', name: 'x', args: {}, status: 'running' as const } }

describe('github', () => {
  it('search returns simplified issues', async () => {
    const { fetch, capture } = mockFetch({
      items: [{ number: 7, title: 'bug', html_url: 'https://x/7', state: 'open' }],
    })
    const tool = githubSearchIssues({ token: 't', fetch })
    const out = (await tool.execute!({ q: 'repo:a/b' }, stubCtx)) as unknown[]
    expect(out).toEqual([{ number: 7, title: 'bug', url: 'https://x/7', state: 'open' }])
    expect(capture.url).toContain('/search/issues')
    expect(capture.url).toContain('q=repo%3Aa%2Fb')
  })

  it('create posts the title and body', async () => {
    const { fetch, capture } = mockFetch({ number: 42, html_url: 'u' })
    const tool = githubCreateIssue({ token: 't', fetch })
    const out = await tool.execute!({ owner: 'a', repo: 'b', title: 'T' }, stubCtx)
    expect(out).toEqual({ number: 42, url: 'u' })
    expect(capture.init?.method).toBe('POST')
    expect(capture.url).toContain('/repos/a/b/issues')
  })

  it('comment posts to the right issue', async () => {
    const { fetch, capture } = mockFetch({ id: 9, html_url: 'u' })
    const tool = githubCommentIssue({ token: 't', fetch })
    await tool.execute!({ owner: 'a', repo: 'b', number: 3, body: 'hi' }, stubCtx)
    expect(capture.url).toContain('/repos/a/b/issues/3/comments')
  })

  it('github() returns all three tools', () => {
    expect(github({ token: 't' })).toHaveLength(3)
  })
})

describe('slack', () => {
  it('postMessage fails on ok:false', async () => {
    const { fetch } = mockFetch({ ok: false, error: 'channel_not_found' })
    const tool = slackPostMessage({ token: 't', fetch })
    await expect(tool.execute!({ channel: 'x', text: 'y' }, stubCtx)).rejects.toThrow(/channel_not_found/)
  })

  it('postMessage returns ts on success', async () => {
    const { fetch } = mockFetch({ ok: true, ts: '123.456' })
    const tool = slackPostMessage({ token: 't', fetch })
    const out = await tool.execute!({ channel: 'x', text: 'y' }, stubCtx)
    expect(out).toEqual({ ts: '123.456' })
  })

  it('search maps matches into flat records', async () => {
    const { fetch } = mockFetch({
      messages: {
        matches: [{ channel: { name: 'g' }, text: 't', permalink: 'u' }],
      },
    })
    const tool = slackSearch({ token: 't', fetch })
    const out = (await tool.execute!({ query: 'x' }, stubCtx)) as Array<Record<string, unknown>>
    expect(out[0]).toEqual({ channel: 'g', text: 't', url: 'u' })
  })

  it('slack() bundles both tools', () => {
    expect(slack({ token: 't' })).toHaveLength(2)
  })
})

describe('linear', () => {
  it('search uses GraphQL', async () => {
    const { fetch, capture } = mockFetch({
      data: { issueSearch: { nodes: [{ id: '1', identifier: 'ENG-7', title: 'a', url: 'u', state: { name: 'Todo' } }] } },
    })
    const tool = linearSearchIssues({ apiKey: 'key', fetch })
    const out = (await tool.execute!({ query: 'bug' }, stubCtx)) as Array<{ id: string }>
    expect(out[0]!.id).toBe('ENG-7')
    expect(capture.init?.method).toBe('POST')
  })

  it('surface GraphQL errors', async () => {
    const { fetch } = mockFetch({ errors: [{ message: 'bad token' }] })
    const tool = linearSearchIssues({ apiKey: 'k', fetch })
    await expect(tool.execute!({ query: 'x' }, stubCtx)).rejects.toThrow(/bad token/)
  })

  it('create returns the identifier', async () => {
    const { fetch } = mockFetch({
      data: { issueCreate: { success: true, issue: { id: '1', identifier: 'ENG-2', url: 'u' } } },
    })
    const tool = linearCreateIssue({ apiKey: 'k', fetch })
    const out = await tool.execute!({ teamId: 't', title: 'x' }, stubCtx)
    expect(out).toEqual({ id: 'ENG-2', url: 'u' })
  })

  it('linear() bundles both tools', () => {
    expect(linear({ apiKey: 'k' })).toHaveLength(2)
  })
})

describe('notion', () => {
  it('search returns flat list', async () => {
    const { fetch } = mockFetch({ results: [{ id: 'p', url: 'u', object: 'page' }] })
    const tool = notionSearch({ token: 't', fetch })
    const out = (await tool.execute!({ query: 'q' }, stubCtx)) as Array<Record<string, unknown>>
    expect(out[0]).toEqual({ id: 'p', url: 'u', type: 'page' })
  })

  it('createPage includes content block when body provided', async () => {
    const { fetch, capture } = mockFetch({ id: 'p2', url: 'u2' })
    const tool = notionCreatePage({ token: 't', fetch })
    await tool.execute!({ parent_page_id: 'root', title: 'T', content: 'body' }, stubCtx)
    const body = JSON.parse(capture.init!.body as string) as { children?: unknown[] }
    expect(body.children).toBeDefined()
  })

  it('notion() bundles both tools', () => {
    expect(notion({ token: 't' })).toHaveLength(2)
  })
})

describe('discord', () => {
  it('postMessage hits the channel url', async () => {
    const { fetch, capture } = mockFetch({ id: 'm', channel_id: 'c' })
    const tool = discord({ token: 't' })[0]!
    const t2 = { ...tool, execute: discord({ token: 't', fetch })[0]!.execute }
    await t2.execute!({ channel_id: '99', content: 'hi' }, stubCtx)
    expect(capture.url).toContain('/channels/99/messages')
  })
})

describe('gmail', () => {
  it('listMessages passes q + maxResults', async () => {
    const { fetch, capture } = mockFetch({ messages: [{ id: '1', threadId: 't' }] })
    const tool = gmailListMessages({ accessToken: 'a', fetch })
    await tool.execute!({ q: 'from:x' }, stubCtx)
    expect(capture.url).toContain('q=from%3Ax')
  })

  it('sendEmail base64url-encodes the raw body', async () => {
    const { fetch, capture } = mockFetch({ id: 'm', threadId: 't' })
    const tool = gmailSendEmail({ accessToken: 'a', fetch })
    await tool.execute!({ to: 'a@b.co', subject: 'S', body: 'hi' }, stubCtx)
    const body = JSON.parse(capture.init!.body as string) as { raw: string }
    expect(body.raw).not.toContain('+')
    expect(body.raw.length).toBeGreaterThan(0)
  })

  it('gmail() bundles both tools', () => {
    expect(gmail({ accessToken: 'a' })).toHaveLength(2)
  })
})

describe('google-calendar', () => {
  it('listEvents flattens fields', async () => {
    const { fetch } = mockFetch({
      items: [{ id: 'e', summary: 's', start: { dateTime: '2026-01-01T09:00:00Z' }, htmlLink: 'u' }],
    })
    const tool = calendarListEvents({ accessToken: 'a', fetch })
    const out = (await tool.execute!({}, stubCtx)) as Array<Record<string, unknown>>
    expect(out[0]).toMatchObject({ id: 'e', summary: 's' })
  })

  it('createEvent maps attendees into email objects', async () => {
    const { fetch, capture } = mockFetch({ id: 'e', htmlLink: 'u' })
    const tool = calendarCreateEvent({ accessToken: 'a', fetch })
    await tool.execute!(
      { summary: 's', start: '2026-01-01T09:00:00Z', end: '2026-01-01T10:00:00Z', attendees: ['a@b.co'] },
      stubCtx,
    )
    const body = JSON.parse(capture.init!.body as string) as { attendees: Array<{ email: string }> }
    expect(body.attendees[0]!.email).toBe('a@b.co')
  })

  it('googleCalendar() bundles both tools', () => {
    expect(googleCalendar({ accessToken: 'a' })).toHaveLength(2)
  })
})

describe('stripe', () => {
  it('createCustomer form-encodes the body', async () => {
    const { fetch, capture } = mockFetch({ id: 'cus_1' })
    const tool = stripeCreateCustomer({ apiKey: 'k', fetch })
    const out = await tool.execute!({ email: 'a@b.co' }, stubCtx)
    expect(out).toEqual({ id: 'cus_1' })
    expect(capture.init?.body).toBe('email=a%40b.co')
  })

  it('createPaymentIntent returns client secret', async () => {
    const { fetch } = mockFetch({ id: 'pi_1', client_secret: 'sec', status: 'requires_payment_method' })
    const tool = stripeCreatePaymentIntent({ apiKey: 'k', fetch })
    const out = await tool.execute!({ amount: 500, currency: 'usd' }, stubCtx)
    expect(out).toEqual({ id: 'pi_1', client_secret: 'sec', status: 'requires_payment_method' })
  })

  it('throws with stripe-style error', async () => {
    const { fetch } = mockFetch({ error: { message: 'card declined' } }, { status: 402 })
    const tool = stripeCreateCustomer({ apiKey: 'k', fetch })
    await expect(tool.execute!({ email: 'x' }, stubCtx)).rejects.toThrow(/card declined/)
  })

  it('stripe() bundles both tools', () => {
    expect(stripe({ apiKey: 'k' })).toHaveLength(2)
  })
})

describe('postgres', () => {
  const runner = vi.fn(async () => ({ rows: [{ a: 1 }, { a: 2 }, { a: 3 }], rowCount: 3 }))

  it('allows SELECT by default', async () => {
    runner.mockClear()
    const tool = postgresQuery({ execute: runner, maxRows: 2 })
    const out = (await tool.execute!({ sql: 'SELECT 1', params: [] }, stubCtx)) as Record<string, unknown>
    expect(out.rowCount).toBe(3)
    expect((out.rows as unknown[]).length).toBe(2)
    expect(out.truncated).toBe(true)
  })

  it('blocks INSERT without allowWrites', async () => {
    const tool = postgresQuery({ execute: runner })
    await expect(tool.execute!({ sql: 'INSERT INTO t VALUES(1)' }, stubCtx)).rejects.toThrow(/requires allowWrites/)
  })

  it('allows INSERT when allowWrites is true', async () => {
    runner.mockClear()
    runner.mockResolvedValueOnce({ rows: [], rowCount: 1 })
    const tool = postgresQuery({ execute: runner, allowWrites: true })
    await tool.execute!({ sql: 'INSERT INTO t VALUES(1)' }, stubCtx)
    expect(runner).toHaveBeenCalled()
  })

  it('always blocks VACUUM', async () => {
    const tool = postgresQuery({ execute: runner, allowWrites: true })
    await expect(tool.execute!({ sql: 'VACUUM FULL' }, stubCtx)).rejects.toThrow(/not allowed/)
  })

  it('custom deny list', async () => {
    const tool = postgresQuery({ execute: runner, denyStatements: ['SELECT'] })
    await expect(tool.execute!({ sql: 'SELECT 1' }, stubCtx)).rejects.toThrow(/denied by policy/)
  })

  it('postgres() bundles one tool', () => {
    expect(postgres({ execute: runner })).toHaveLength(1)
  })
})

describe('s3', () => {
  const client = {
    getObject: vi.fn(async () => ({ body: 'hello' })),
    putObject: vi.fn(async () => ({ etag: 'abc' })),
    listObjects: vi.fn(async () => [{ key: 'a', size: 1 }]),
  }

  it('getObject uses default bucket when none passed', async () => {
    const tool = s3GetObject({ client, defaultBucket: 'b1' })
    const out = await tool.execute!({ key: 'k' }, stubCtx)
    expect(out).toEqual({ bucket: 'b1', key: 'k', body: 'hello' })
  })

  it('getObject requires a bucket', async () => {
    const tool = s3GetObject({ client })
    await expect(tool.execute!({ key: 'k' }, stubCtx)).rejects.toThrow(/bucket required/)
  })

  it('putObject passes contentType', async () => {
    const tool = s3PutObject({ client, defaultBucket: 'b1' })
    await tool.execute!({ key: 'k', body: 'x', content_type: 'text/plain' }, stubCtx)
    expect(client.putObject).toHaveBeenCalledWith(expect.objectContaining({ contentType: 'text/plain' }))
  })

  it('listObjects returns items', async () => {
    const tool = s3ListObjects({ client, defaultBucket: 'b1' })
    const out = (await tool.execute!({ prefix: 'p/' }, stubCtx)) as Array<Record<string, unknown>>
    expect(out[0]!.key).toBe('a')
  })

  it('s3() bundles three tools', () => {
    expect(s3({ client })).toHaveLength(3)
  })
})
