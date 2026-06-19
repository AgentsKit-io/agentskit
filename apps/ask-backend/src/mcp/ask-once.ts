/**
 * Non-streaming `ask` for MCP clients.
 *
 * The chat handler streams NDJSON `UiEvent`s; MCP wants one JSON result. `askOnce`
 * drives the warm `createAskHandler` with a one-shot request and collapses its
 * stream into a single markdown answer + the cited sources.
 */
import { decodeEvents } from '../ask/protocol'

export interface CitedSource {
  title?: string
  path?: string
  anchor?: string
}

export interface AskResult {
  answer: string
  sources: CitedSource[]
}

type AskHandler = (req: Request) => Promise<Response>

/** Build the one-shot request, forwarding the trusted caller IP as `x-real-ip` so
 *  the handler's own per-IP rate-limit + guards attribute to the real client (not a
 *  shared "unknown" bucket). */
function oneShotRequest(question: string, ip: string): Request {
  return new Request('http://ask.local/v1/ask?corpus=mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify({ messages: [{ role: 'user', content: question }] }),
  })
}

/** Fold the streamed events into `{ answer, sources }`. */
function collapseEvents(body: string): AskResult {
  let answer = ''
  const sources: CitedSource[] = []
  const { events } = decodeEvents(body.endsWith('\n') ? body : `${body}\n`)

  for (const ev of events) {
    if (ev.type === 'error') throw new Error(ev.message)
    if (ev.type === 'text') {
      answer += ev.delta
    } else if (ev.type === 'tool' && ev.name === 'answer') {
      const markdown = (ev.args as { markdown?: string }).markdown
      if (typeof markdown === 'string') answer += markdown
    } else if (ev.type === 'tool' && ev.name === 'cite') {
      const cited = (ev.args as { sources?: CitedSource[] }).sources
      if (Array.isArray(cited)) sources.push(...cited)
    }
  }

  return { answer: answer.trim(), sources }
}

export async function askOnce(handler: AskHandler, question: string, ip: string): Promise<AskResult> {
  const res = await handler(oneShotRequest(question, ip))
  if (res.status === 429) throw new Error('rate limited — slow down and retry shortly')
  return collapseEvents(await res.text())
}
