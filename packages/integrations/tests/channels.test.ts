import { describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  createChannelHandler,
  emailChannel,
  slackChannel,
  telegramChannel,
  whatsappChannel,
  type Channel,
} from '../src/channels'
import { verifySvix, verifyTelegram } from '../src/webhook-verify'

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures/channels', name), 'utf8')
const hmac = (secret: string | Buffer, payload: string, enc: 'hex' | 'base64' = 'hex') =>
  createHmac('sha256', secret).update(payload).digest(enc)

const NOW = 1761700000
const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))

const wa = (f = okFetch()) =>
  whatsappChannel({ appSecret: 'app-secret', accessToken: 'tok', phoneNumberId: '106540352242922', fetch: f as never })
const tg = (f = okFetch()) => telegramChannel({ botToken: 'BOT', secretToken: 'hook-secret', fetch: f as never })
const sl = (f = okFetch()) =>
  slackChannel({ botToken: 'xoxb', signingSecret: 'sl-secret', fetch: f as never, nowSeconds: () => NOW })
const SVIX_SECRET = 'whsec_' + Buffer.from('svix-key-bytes').toString('base64')
const em = (f = okFetch()) =>
  emailChannel({ resendApiKey: 're_key', webhookSecret: SVIX_SECRET, from: 'Agent <agent@example.com>', fetch: f as never, nowSeconds: () => NOW })

describe('whatsapp channel', () => {
  it('verifies x-hub-signature-256', () => {
    const body = fixture('whatsapp-text.json')
    const good = { 'x-hub-signature-256': 'sha256=' + hmac('app-secret', body) }
    expect(wa().verify({ headers: good, rawBody: body }).ok).toBe(true)
    expect(wa().verify({ headers: good, rawBody: body + ' ' }).ok).toBe(false)
    expect(wa().verify({ headers: {}, rawBody: body }).ok).toBe(false)
  })
  it('parses text with sender identity', () => {
    const [m] = wa().receive(fixture('whatsapp-text.json'))
    expect(m).toMatchObject({ channel: 'whatsapp', conversationId: '5511999990000', text: 'Oi, preciso de ajuda', from: { id: '5511999990000', name: 'Ana Souza' }, attachments: [] })
    expect(m.receivedAt).toBe('2025-10-29T01:06:40.000Z')
  })
  it('parses media as attachment and caption as text', () => {
    const [m] = wa().receive(fixture('whatsapp-image.json'))
    expect(m.text).toBe('veja isso')
    expect(m.attachments).toEqual([{ id: 'media-123', contentType: 'image/jpeg', name: undefined }])
  })
  it('yields nothing for status callbacks', () => {
    expect(wa().receive(fixture('whatsapp-status.json'))).toEqual([])
  })
  it('sends through the Cloud API', async () => {
    const f = okFetch()
    await wa(f).send({ conversationId: '5511999990000', text: 'olá' })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://graph.facebook.com/v21.0/106540352242922/messages')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok')
    expect(JSON.parse(init.body as string)).toMatchObject({ messaging_product: 'whatsapp', to: '5511999990000', text: { body: 'olá' } })
  })
})

describe('telegram channel', () => {
  it('verifies the secret token header', () => {
    const body = fixture('telegram-text.json')
    expect(tg().verify({ headers: { 'x-telegram-bot-api-secret-token': 'hook-secret' }, rawBody: body }).ok).toBe(true)
    expect(tg().verify({ headers: { 'x-telegram-bot-api-secret-token': 'nope' }, rawBody: body }).ok).toBe(false)
    expect(tg().verify({ headers: {}, rawBody: body }).ok).toBe(false)
  })
  it('parses text in a topic thread', () => {
    const [m] = tg().receive(fixture('telegram-text.json'))
    expect(m).toMatchObject({ conversationId: '-100777', threadId: '12', text: 'ping', from: { id: '4242', name: 'Bruno', isBot: false } })
  })
  it('parses the largest photo as attachment', () => {
    const [m] = tg().receive(fixture('telegram-photo.json'))
    expect(m.text).toBe('olha')
    expect(m.attachments).toEqual([{ id: 'large', contentType: 'image/jpeg', sizeBytes: 9000 }])
    expect(m.from.name).toBe('Bruno Lima')
  })
  it('sends via sendMessage', async () => {
    const f = okFetch()
    await tg(f).send({ conversationId: '4242', text: 'oi' })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.telegram.org/botBOT/sendMessage')
    expect(JSON.parse(init.body as string)).toMatchObject({ chat_id: '4242', text: 'oi' })
  })
  it('throws when the API rejects', async () => {
    const f = vi.fn(async () => new Response('{}', { status: 401 }))
    await expect(tg(f).send({ conversationId: '1', text: 'x' })).rejects.toThrow(/HTTP 401/)
  })
})

describe('slack channel', () => {
  const sign = (body: string, ts = NOW) => ({
    'x-slack-request-timestamp': String(ts),
    'x-slack-signature': 'v0=' + hmac('sl-secret', `v0:${ts}:${body}`),
  })
  it('verifies signature and rejects tampering, bad signature and replays', () => {
    const body = fixture('slack-message.json')
    expect(sl().verify({ headers: sign(body), rawBody: body }).ok).toBe(true)
    expect(sl().verify({ headers: sign(body), rawBody: body + 'x' }).ok).toBe(false)
    expect(sl().verify({ headers: { ...sign(body), 'x-slack-signature': 'v0=00' }, rawBody: body }).ok).toBe(false)
    expect(sl().verify({ headers: sign(body, NOW - 3600), rawBody: body }).ok).toBe(false)
    expect(sl().verify({ headers: {}, rawBody: body }).ok).toBe(false)
  })
  it('parses message with file and thread', () => {
    const [m] = sl().receive(fixture('slack-message.json'))
    expect(m).toMatchObject({ conversationId: 'C0123', threadId: '1761699000.000100', text: 'hello agent', from: { id: 'U0456', isBot: false } })
    expect(m.attachments[0]).toMatchObject({ name: 'report.pdf', contentType: 'application/pdf', sizeBytes: 2048 })
  })
  it('flags bot messages', () => {
    expect(sl().receive(fixture('slack-bot-echo.json'))[0].from.isBot).toBe(true)
  })
  it('ignores url_verification', () => {
    expect(sl().receive('{"type":"url_verification","challenge":"c"}')).toEqual([])
  })
  it('sends in-thread and surfaces Slack API errors', async () => {
    const f = okFetch()
    await sl(f).send({ conversationId: 'C0123', threadId: '1.2', text: 'yo' })
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ channel: 'C0123', text: 'yo', thread_ts: '1.2' })
    const bad = vi.fn(async () => new Response('{"ok":false,"error":"channel_not_found"}', { status: 200 }))
    await expect(sl(bad).send({ conversationId: 'C', text: 'x' })).rejects.toThrow(/channel_not_found/)
  })
})

describe('email channel', () => {
  const sign = (body: string, ts = NOW, id = 'msg_1') => ({
    'svix-id': id,
    'svix-timestamp': String(ts),
    'svix-signature': 'v1,' + hmac(Buffer.from('svix-key-bytes'), `${id}.${ts}.${body}`, 'base64'),
  })
  it('verifies the Svix signature', () => {
    const body = fixture('email-received.json')
    expect(em().verify({ headers: sign(body), rawBody: body }).ok).toBe(true)
    expect(em().verify({ headers: sign(body), rawBody: body + 'x' }).ok).toBe(false)
    expect(em().verify({ headers: sign(body, NOW - 3600), rawBody: body }).ok).toBe(false)
    expect(em().verify({ headers: {}, rawBody: body }).ok).toBe(false)
    const multi = { ...sign(body), 'svix-signature': 'v1,AAAA ' + sign(body)['svix-signature'] }
    expect(em().verify({ headers: multi, rawBody: body }).ok).toBe(true)
    expect(verifySvix({ secret: SVIX_SECRET, rawBody: body, headers: { ...sign(body), 'svix-signature': 'v2,x' }, nowSeconds: NOW }).ok).toBe(false)
  })
  it('parses an inbound email', () => {
    const [m] = em().receive(fixture('email-received.json'))
    expect(m).toMatchObject({ id: 'em_123', from: { id: 'carla@example.com', name: 'Carla Dias' }, conversationId: 'carla@example.com', text: 'Onde está meu pedido?' })
    expect(m.attachments).toEqual([{ id: 'att_1', name: 'nota.pdf', contentType: 'application/pdf' }])
  })
  it('ignores other event types', () => {
    expect(em().receive('{"type":"email.sent","data":{}}')).toEqual([])
  })
  it('sends through Resend', async () => {
    const f = okFetch()
    await em(f).send({ conversationId: 'carla@example.com', subject: 'Re: Pedido 42', text: 'a caminho', threadId: '<abc@mail.example.com>' })
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(JSON.parse(init.body as string)).toMatchObject({ from: 'Agent <agent@example.com>', to: ['carla@example.com'], subject: 'Re: Pedido 42', headers: { 'In-Reply-To': '<abc@mail.example.com>' } })
  })
})

describe('createChannelHandler', () => {
  it('rejects unsigned requests without running the agent', async () => {
    const run = vi.fn(async () => 'x')
    const res = await createChannelHandler(tg(), { run })({ headers: {}, rawBody: fixture('telegram-text.json') })
    expect(res.status).toBe(401)
    expect(run).not.toHaveBeenCalled()
  })
  it('runs the agent and replies on the same conversation', async () => {
    const f = okFetch()
    const run = vi.fn(async (t: string) => `echo:${t}`)
    const res = await createChannelHandler(tg(f), { run })({
      headers: { 'x-telegram-bot-api-secret-token': 'hook-secret' },
      rawBody: fixture('telegram-text.json'),
    })
    expect(res.status).toBe(200)
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toMatchObject({ chat_id: '-100777', text: 'echo:ping' })
  })
  it('skips bot messages and reports agent errors without failing the webhook', async () => {
    const body = fixture('slack-bot-echo.json')
    const ts = NOW
    const headers = { 'x-slack-request-timestamp': String(ts), 'x-slack-signature': 'v0=' + hmac('sl-secret', `v0:${ts}:${body}`) }
    const run = vi.fn(async () => 'x')
    await createChannelHandler(sl(), { run })({ headers, rawBody: body })
    expect(run).not.toHaveBeenCalled()

    const onError = vi.fn()
    const boom: Channel = { ...tg(), verify: () => ({ ok: true }) }
    const res = await createChannelHandler(boom, { run: async () => { throw new Error('boom') } }, { onError })({ headers: {}, rawBody: fixture('telegram-text.json') })
    expect(res.status).toBe(200)
    expect(onError).toHaveBeenCalledOnce()
  })
})

describe('channel handshakes, retries and empty secrets', () => {
  const slSign = (body: string) => ({
    'x-slack-request-timestamp': String(NOW),
    'x-slack-signature': 'v0=' + hmac('sl-secret', `v0:${NOW}:${body}`),
  })
  it('answers a signed slack url_verification with the challenge', async () => {
    const body = JSON.stringify({ type: 'url_verification', challenge: 'abc123', token: 'x' })
    const run = vi.fn(async () => 'x')
    const res = await createChannelHandler(sl(), { run })({ headers: slSign(body), rawBody: body })
    expect(res).toEqual({ status: 200, body: 'abc123' })
    expect(run).not.toHaveBeenCalled()
    expect((await createChannelHandler(sl(), { run })({ headers: {}, rawBody: body })).status).toBe(401)
  })
  it('answers the whatsapp GET subscription handshake', async () => {
    const ch = whatsappChannel({ appSecret: 's', accessToken: 't', phoneNumberId: '1', verifyToken: 'vt' })
    const h = createChannelHandler(ch, { run: async () => 'x' })
    const q = { 'hub.mode': 'subscribe', 'hub.verify_token': 'vt', 'hub.challenge': '1158201444' }
    expect(await h({ method: 'GET', headers: {}, rawBody: '', query: q })).toEqual({ status: 200, body: '1158201444' })
    expect((await h({ method: 'GET', headers: {}, rawBody: '', query: { ...q, 'hub.verify_token': 'no' } })).status).toBe(403)
    expect((await h({ method: 'GET', headers: {}, rawBody: '', query: { 'hub.challenge': 'c' } })).status).toBe(403)
  })
  it('does not run the agent twice for a retried slack event', async () => {
    const body = fixture('slack-message.json')
    const run = vi.fn(async () => 'x')
    const h = createChannelHandler(sl(), { run })
    await h({ headers: slSign(body), rawBody: body })
    const retry = await h({ headers: { ...slSign(body), 'x-slack-retry-num': '1' }, rawBody: body })
    expect(retry.status).toBe(200)
    expect(run).toHaveBeenCalledTimes(1)
    // same event id without the retry header is deduped too
    await h({ headers: slSign(body), rawBody: body })
    expect(run).toHaveBeenCalledTimes(1)
  })
  it('rejects an empty secret with an empty header', () => {
    const empty = telegramChannel({ botToken: 'B', secretToken: '' })
    expect(empty.verify({ headers: { 'x-telegram-bot-api-secret-token': '' }, rawBody: '{}' }).ok).toBe(false)
    expect(verifyTelegram({ headers: { 'x-telegram-bot-api-secret-token': '' }, rawBody: '{}', secret: '' }).ok).toBe(false)
    expect(whatsappChannel({ appSecret: '', accessToken: 't', phoneNumberId: '1' }).verify({ headers: { 'x-hub-signature-256': 'sha256=' + hmac('', '{}') }, rawBody: '{}' }).ok).toBe(false)
  })
})
