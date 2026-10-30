import { ErrorCodes, ToolError } from '@agentskit/core'
import type { VerifyResult } from '../contract'
import { parseJsonRecord } from '../normalize'
import { readResponseText } from '../http-body'

export type Rec = Record<string, unknown>

export function parseBody(rawBody: string): Rec | undefined {
  const parsed = parseJsonRecord(rawBody)
  return parsed.ok ? parsed.value : undefined
}

export const str = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v
  return typeof v === 'number' ? String(v) : undefined
}

export const rec = (v: unknown): Rec | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : undefined

export const arr = (v: unknown): Rec[] => (Array.isArray(v) ? v.map(rec).filter((x): x is Rec => !!x) : [])

export async function postJson(
  channel: string,
  fetchImpl: typeof globalThis.fetch,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Rec> {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
    if (!res.ok) {
    throw new ToolError({
      code: ErrorCodes.AK_TOOL_EXEC_FAILED,
      message: `${channel}: send failed with HTTP ${res.status}`,
    })
  }
  return parseBody(await readResponseText(res)) ?? {}
}

/** Guard so an unset (empty) secret never verifies anything. */
export function withSecret(secret: string, verify: () => VerifyResult): VerifyResult {
  return secret ? verify() : { ok: false, reason: 'channel secret is not configured' }
}
