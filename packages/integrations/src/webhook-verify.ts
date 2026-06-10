import { createHmac, timingSafeEqual, verify as nodeEd25519Verify } from 'node:crypto'
import type { WebhookInput, VerifyResult } from './contract'

/** Case-insensitive header lookup. */
export function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key]
  }
  return undefined
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function hmacSha1Base64(secret: string, payload: string): string {
  return createHmac('sha1', secret).update(payload).digest('base64')
}

/** Generic HMAC-SHA256-over-raw-body verifier: signature header equals
 *  `${prefix}${hmacSha256Hex(secret, rawBody)}` (e.g. github `sha256=`). */
export function verifyHmacSha256Body(
  input: WebhookInput,
  headerName: string,
  prefix = '',
): VerifyResult {
  const sig = headerValue(input.headers, headerName)
  if (sig === undefined) return { ok: false, reason: `missing ${headerName}` }
  return safeEqual(sig, `${prefix}${hmacSha256Hex(input.secret, input.rawBody)}`)
    ? { ok: true }
    : { ok: false, reason: 'signature mismatch' }
}

const SLACK_REPLAY_WINDOW_SECONDS = 300

/** Slack: `x-slack-signature: v0=<hex>` over `v0:${ts}:${body}`, 300s replay. */
export function verifySlack(input: WebhookInput): VerifyResult {
  const ts = headerValue(input.headers, 'x-slack-request-timestamp')
  const sig = headerValue(input.headers, 'x-slack-signature')
  if (ts === undefined || sig === undefined) return { ok: false, reason: 'missing slack headers' }
  const tsInt = Number(ts)
  if (!Number.isFinite(tsInt)) return { ok: false, reason: 'invalid timestamp' }
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000)
  if (Math.abs(now - tsInt) > SLACK_REPLAY_WINDOW_SECONDS) {
    return { ok: false, reason: 'timestamp outside replay window' }
  }
  return safeEqual(sig, `v0=${hmacSha256Hex(input.secret, `v0:${ts}:${input.rawBody}`)}`)
    ? { ok: true }
    : { ok: false, reason: 'signature mismatch' }
}

/** PagerDuty v3: `x-pagerduty-signature: v1=<hex>,v1=<hex>`; any match passes. */
export function verifyPagerDuty(input: WebhookInput): VerifyResult {
  const header = headerValue(input.headers, 'x-pagerduty-signature')
  if (header === undefined) return { ok: false, reason: 'missing x-pagerduty-signature' }
  const candidates = header.split(',').map((s) => s.trim()).filter((s) => s.startsWith('v1=')).map((s) => s.slice(3))
  if (candidates.length === 0) return { ok: false, reason: 'no v1 signature in header' }
  const expected = hmacSha256Hex(input.secret, input.rawBody)
  return candidates.some((c) => safeEqual(c, expected))
    ? { ok: true }
    : { ok: false, reason: 'signature mismatch' }
}

/** Twilio: `x-twilio-signature` = base64(HMAC-SHA1(authToken, url + sorted form k+v)). */
export function verifyTwilio(input: WebhookInput): VerifyResult {
  const sig = headerValue(input.headers, 'x-twilio-signature')
  if (sig === undefined || sig.length === 0) return { ok: false, reason: 'missing x-twilio-signature' }
  if (input.requestUrl === undefined || input.requestUrl.length === 0) {
    return { ok: false, reason: 'missing request url for twilio verification' }
  }
  const form: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(input.rawBody)) form[k] = v
  let canonical = input.requestUrl
  for (const key of Object.keys(form).sort()) canonical += key + form[key]
  return safeEqual(sig, hmacSha1Base64(input.secret, canonical))
    ? { ok: true }
    : { ok: false, reason: 'signature mismatch' }
}

/** DER SubjectPublicKeyInfo prefix for a raw 32-byte Ed25519 key (RFC 8410). */
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function hexToBuffer(value: string): Buffer | undefined {
  if (value.length === 0 || value.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(value)) return undefined
  return Buffer.from(value, 'hex')
}

/** Discord: Ed25519 over `timestamp + body`; `secret` = app public key (hex). */
export function verifyDiscord(input: WebhookInput): VerifyResult {
  const signature = headerValue(input.headers, 'x-signature-ed25519')
  const timestamp = headerValue(input.headers, 'x-signature-timestamp')
  if (signature === undefined || timestamp === undefined) return { ok: false, reason: 'missing discord signature headers' }
  const sigBytes = hexToBuffer(signature)
  const keyBytes = hexToBuffer(input.secret)
  if (!sigBytes || sigBytes.length !== 64) return { ok: false, reason: 'malformed ed25519 signature' }
  if (!keyBytes || keyBytes.length !== 32) return { ok: false, reason: 'malformed ed25519 public key' }
  const spki = Buffer.concat([ED25519_SPKI_PREFIX, keyBytes])
  const message = Buffer.from(timestamp + input.rawBody, 'utf8')
  try {
    const valid = nodeEd25519Verify(null, message, { key: spki, format: 'der', type: 'spki' }, sigBytes)
    return valid ? { ok: true } : { ok: false, reason: 'ed25519 signature mismatch' }
  } catch {
    return { ok: false, reason: 'ed25519 verification error' }
  }
}

/** Generic HMAC-SHA256 verifier where the header carries the bare hex digest
 *  of the raw body (Linear `linear-signature`, Sentry `sentry-hook-signature`). */
export function verifyHmacSha256Bare(input: WebhookInput, headerName: string): VerifyResult {
  return verifyHmacSha256Body(input, headerName, '')
}
