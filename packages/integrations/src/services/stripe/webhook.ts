import { createHmac, timingSafeEqual } from 'node:crypto'
import { defineTrigger, type NormalizedEvent } from '../../contract'

interface ParsedSignature {
  timestamp: number
  signatures: string[]
}

function parseSigHeader(header: string): ParsedSignature | null {
  let timestamp = 0
  const signatures: string[] = []
  for (const part of header.split(',')) {
    const [k, v] = part.split('=', 2)
    if (k === 't' && v) timestamp = Number(v)
    else if (k === 'v1' && v) signatures.push(v)
  }
  return Number.isFinite(timestamp) && timestamp > 0 && signatures.length > 0 ? { timestamp, signatures } : null
}

function constantTimeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

/** Verify a Stripe `Stripe-Signature` header against the raw payload. */
export function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
  now: () => number = Date.now,
): boolean {
  const parsed = parseSigHeader(header)
  if (!parsed) return false
  const ageSeconds = Math.abs(now() / 1000 - parsed.timestamp)
  if (ageSeconds > toleranceSeconds) return false
  const expected = createHmac('sha256', secret).update(`${parsed.timestamp}.${payload}`, 'utf8').digest('hex')
  return parsed.signatures.some((sig) => constantTimeCompare(sig, expected))
}

interface StripeEvent {
  id: string
  type: string
  created: number
  data: { object: Record<string, unknown> }
}

/** Inbound Stripe webhook trigger: HMAC-verify then normalize the event. */
export const stripeWebhook = defineTrigger({
  name: 'stripe.event',
  source: 'stripe',
  verify: (input) => {
    const header = input.headers['stripe-signature'] ?? input.headers['Stripe-Signature'] ?? ''
    const now = input.nowSeconds !== undefined ? () => input.nowSeconds! * 1000 : Date.now
    return verifyStripeSignature(input.rawBody, header, input.secret, 300, now)
      ? { ok: true }
      : { ok: false, reason: 'stripe: webhook signature verification failed' }
  },
  normalize: (raw): NormalizedEvent => {
    const event = (typeof raw === 'string' ? JSON.parse(raw) : raw) as StripeEvent
    return { kind: event.type, payload: { id: event.id, type: event.type, created: event.created, object: event.data.object }, raw }
  },
})
