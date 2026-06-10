import { describe, it, expect } from 'vitest'
import { createHmac, generateKeyPairSync, sign as edSign } from 'node:crypto'
import { slackEvent } from '../src/services/slack/triggers'
import { githubEvent } from '../src/services/github/triggers'
import { linearEvent } from '../src/services/linear/triggers'
import { sentryEvent } from '../src/services/sentry/triggers'
import { pagerdutyEvent } from '../src/services/pagerduty/triggers'
import { twilioEvent } from '../src/services/twilio/triggers'
import { discordInteraction } from '../src/services/discord/triggers'
import { slackIntegration } from '../src/services/slack/index'
import { githubIntegration } from '../src/services/github/index'
import { assertValidIntegration } from '../src/testing/validate'
import type { WebhookInput } from '../src/contract'
import { hmacSha256Hex, hmacSha1Base64, headerValue } from '../src/webhook-verify'

const hmac256 = (s: string, p: string) => createHmac('sha256', s).update(p).digest('hex')
const inp = (over: Partial<WebhookInput>): WebhookInput => ({ secret: 'sk', rawBody: '{}', headers: {}, ...over })

describe('webhook triggers — descriptors valid', () => {
  it('slack + github descriptors with triggers validate', () => {
    expect(() => assertValidIntegration(slackIntegration)).not.toThrow()
    expect(() => assertValidIntegration(githubIntegration)).not.toThrow()
    expect(slackIntegration.triggers?.[0]?.source).toBe('slack')
  })
})

describe('slack', () => {
  const secret = 'slacksecret'; const ts = '1700000000'
  const body = JSON.stringify({ type: 'event_callback', team_id: 'T1', event: { type: 'app_mention', channel: 'C1', user: 'U1', text: 'hi', thread_ts: '1.2' } })
  const sig = `v0=${hmac256(secret, `v0:${ts}:${body}`)}`
  it('verifies a valid signature within the replay window', () => {
    expect(slackEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-slack-signature': sig, 'x-slack-request-timestamp': ts }, nowSeconds: Number(ts) }))).toEqual({ ok: true })
  })
  it('rejects a stale timestamp and a bad signature', () => {
    expect(slackEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-slack-signature': sig, 'x-slack-request-timestamp': ts }, nowSeconds: Number(ts) + 1000 })).ok).toBe(false)
    expect(slackEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-slack-signature': 'v0=bad', 'x-slack-request-timestamp': ts }, nowSeconds: Number(ts) })).ok).toBe(false)
  })
  it('normalizes + extracts thread ref', () => {
    expect(slackEvent.normalize(body).kind).toBe('app_mention')
    expect(slackEvent.externalThreadRef!(body)).toEqual({ kind: 'slack.thread', id: 'C1:1.2', parentId: 'C1' })
  })
})

describe('github', () => {
  const secret = 'ghsecret'; const body = JSON.stringify({ action: 'opened', pull_request: { number: 1 }, repository: { full_name: 'o/r' } })
  it('verifies sha256= signature + normalizes', () => {
    expect(githubEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-hub-signature-256': `sha256=${hmac256(secret, body)}` } }))).toEqual({ ok: true })
    expect(githubEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-hub-signature-256': 'sha256=bad' } })).ok).toBe(false)
    const n = githubEvent.normalize(body)
    expect(n.kind).toBe('pull_request')
    expect((n.payload as { repo: string }).repo).toBe('o/r')
  })
})

describe('linear', () => {
  const secret = 'lnsecret'; const body = JSON.stringify({ action: 'create', type: 'Issue', data: { identifier: 'ENG-1', title: 't', state: { name: 'Todo' } } })
  it('verifies bare hex signature + normalizes', () => {
    expect(linearEvent.verify!(inp({ secret, rawBody: body, headers: { 'linear-signature': hmac256(secret, body) } }))).toEqual({ ok: true })
    expect(linearEvent.normalize(body).kind).toBe('Issue.create')
  })
})

describe('sentry', () => {
  const secret = 'sesecret'; const body = JSON.stringify({ action: 'created', data: { issue: { id: '1' } } })
  it('requires the resource header + verifies', () => {
    expect(sentryEvent.verify!(inp({ secret, rawBody: body, headers: { 'sentry-hook-signature': hmac256(secret, body), 'sentry-hook-resource': 'issue' } }))).toEqual({ ok: true })
    expect(sentryEvent.verify!(inp({ secret, rawBody: body, headers: { 'sentry-hook-signature': hmac256(secret, body) } })).ok).toBe(false)
    expect(sentryEvent.normalize(body).kind).toBe('created')
  })
})

describe('pagerduty', () => {
  const secret = 'pdsecret'; const body = JSON.stringify({ event: { event_type: 'incident.triggered', data: { id: 'P1' } } })
  it('matches any v1 signature in the list', () => {
    const good = hmac256(secret, body)
    expect(pagerdutyEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-pagerduty-signature': `v1=deadbeef,v1=${good}` } }))).toEqual({ ok: true })
    expect(pagerdutyEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-pagerduty-signature': 'v1=deadbeef' } })).ok).toBe(false)
    expect(pagerdutyEvent.normalize(body).kind).toBe('incident.triggered')
  })
})

describe('twilio', () => {
  const secret = 'twtoken'; const url = 'https://hook.example/twilio'
  const body = 'MessageSid=SM1&From=%2B15551234&Body=hi'
  it('verifies HMAC-SHA1 over url + sorted params', () => {
    const form: Record<string, string> = {}
    for (const [k, v] of new URLSearchParams(body)) form[k] = v
    let canonical = url
    for (const k of Object.keys(form).sort()) canonical += k + form[k]
    const sig = createHmac('sha1', secret).update(canonical).digest('base64')
    expect(twilioEvent.verify!(inp({ secret, rawBody: body, requestUrl: url, headers: { 'x-twilio-signature': sig } }))).toEqual({ ok: true })
    expect(twilioEvent.verify!(inp({ secret, rawBody: body, headers: { 'x-twilio-signature': sig } })).ok).toBe(false) // no url
    expect(twilioEvent.normalize(body).kind).toBe('message')
  })
})

describe('discord', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  const pubHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex')
  const ts = '1700000000'; const body = JSON.stringify({ type: 2 })
  it('verifies a valid Ed25519 signature', () => {
    const sig = edSign(null, Buffer.from(ts + body, 'utf8'), privateKey).toString('hex')
    expect(discordInteraction.verify!(inp({ secret: pubHex, rawBody: body, headers: { 'x-signature-ed25519': sig, 'x-signature-timestamp': ts } }))).toEqual({ ok: true })
    expect(discordInteraction.verify!(inp({ secret: pubHex, rawBody: body, headers: { 'x-signature-ed25519': 'aa'.repeat(64), 'x-signature-timestamp': ts } })).ok).toBe(false)
    expect(discordInteraction.normalize(body).kind).toBe('interaction')
    expect(discordInteraction.normalize(JSON.stringify({ type: 1 })).kind).toBe('ping')
  })
})

describe('webhook-verify helpers', () => {
  it('hmacSha256Hex / hmacSha1Base64 are deterministic', () => {
    expect(hmacSha256Hex('k', 'm')).toBe(createHmac('sha256', 'k').update('m').digest('hex'))
    expect(hmacSha1Base64('k', 'm')).toBe(createHmac('sha1', 'k').update('m').digest('base64'))
  })
  it('headerValue is case-insensitive', () => {
    expect(headerValue({ 'X-Foo': 'bar' }, 'x-foo')).toBe('bar')
    expect(headerValue({}, 'x-foo')).toBeUndefined()
  })
})
