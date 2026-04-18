import type { ToolCall, ToolDefinition, ToolExecutionContext } from './types/tool'
import type { Message } from './types/message'

export interface ProgressiveFieldEvent {
  /** Top-level field name whose value just finished being streamed. */
  field: string
  /** Parsed value (string / number / boolean / array / object / null). */
  value: unknown
  /** Raw JSON text for that field. */
  raw: string
  /** Byte offset in the accumulated buffer where this field ended. */
  offset: number
}

export interface ProgressiveArgParser {
  /** Append a new chunk of JSON text. Emits `onField` for each top-level field that completes. */
  push: (chunk: string) => ProgressiveFieldEvent[]
  /** Mark the stream finished — validates the object closed cleanly. Returns any final events. */
  end: () => ProgressiveFieldEvent[]
  /** All events seen so far, in order. */
  readonly events: ReadonlyArray<ProgressiveFieldEvent>
  /** Current parsed partial object (fields completed so far). */
  readonly value: Record<string, unknown>
  /** Accumulated raw buffer. */
  readonly buffer: string
}

/**
 * Stream-parse a JSON object where top-level field values arrive
 * incrementally. Fires an event as soon as each top-level field has a
 * syntactically complete value, enabling "progressive" tool execution
 * — the tool can begin work on the first field before the LLM has
 * finished emitting the rest.
 *
 * Only works at the top level of a JSON object — nested structures
 * are parsed atomically when their enclosing top-level field closes.
 * That matches the common tool-args shape: a flat `{ query, limit, ...}`
 * object where the expensive operation depends on one key.
 */
export function createProgressiveArgParser(): ProgressiveArgParser {
  let buffer = ''
  const events: ProgressiveFieldEvent[] = []
  const value: Record<string, unknown> = {}

  // Parser state — we track whether we have entered the top-level `{`,
  // are between fields, reading a key, between `:` and value, reading
  // a value, etc.
  let started = false
  let finished = false
  let pos = 0

  const skipWs = (): void => {
    while (pos < buffer.length && /\s/.test(buffer[pos]!)) pos++
  }

  /** Try to parse a JSON string starting at `pos`. Returns end index or -1 if incomplete. */
  const scanString = (): number => {
    if (buffer[pos] !== '"') return -1
    let i = pos + 1
    while (i < buffer.length) {
      const ch = buffer[i]
      if (ch === '\\') {
        i += 2
        continue
      }
      if (ch === '"') return i + 1
      i++
    }
    return -1
  }

  /** Scan a balanced nested value ({...} / [...]). Returns end index or -1. */
  const scanBalanced = (open: string, close: string): number => {
    let depth = 0
    let i = pos
    let inStr = false
    let esc = false
    while (i < buffer.length) {
      const ch = buffer[i]!
      if (inStr) {
        if (esc) esc = false
        else if (ch === '\\') esc = true
        else if (ch === '"') inStr = false
      } else {
        if (ch === '"') inStr = true
        else if (ch === open) depth++
        else if (ch === close) {
          depth--
          if (depth === 0) return i + 1
        }
      }
      i++
    }
    return -1
  }

  /** Scan a primitive (number / bool / null). Returns end or -1 if not terminated. */
  const scanPrimitive = (): number => {
    let i = pos
    while (i < buffer.length) {
      const ch = buffer[i]!
      if (ch === ',' || ch === '}' || /\s/.test(ch)) return i
      i++
    }
    return -1
  }

  const readValue = (): { end: number; raw: string; value: unknown } | null => {
    skipWs()
    if (pos >= buffer.length) return null
    const ch = buffer[pos]!
    let end = -1
    if (ch === '"') end = scanString()
    else if (ch === '{') end = scanBalanced('{', '}')
    else if (ch === '[') end = scanBalanced('[', ']')
    else end = scanPrimitive()
    if (end < 0) return null
    const raw = buffer.slice(pos, end)
    try {
      return { end, raw, value: JSON.parse(raw) }
    } catch {
      return null
    }
  }

  const tryConsume = (): ProgressiveFieldEvent[] => {
    const out: ProgressiveFieldEvent[] = []
    if (finished) return out

    if (!started) {
      skipWs()
      if (pos >= buffer.length) return out
      if (buffer[pos] !== '{') throw new Error(`Expected '{' at position ${pos}`)
      pos++
      started = true
    }

    while (true) {
      skipWs()
      if (pos >= buffer.length) return out
      if (buffer[pos] === '}') {
        pos++
        finished = true
        return out
      }
      if (buffer[pos] === ',') {
        pos++
        continue
      }
      const keyEnd = scanString()
      if (keyEnd < 0) return out
      const keyRaw = buffer.slice(pos, keyEnd)
      const key = JSON.parse(keyRaw) as string
      const savedPos = pos
      pos = keyEnd
      skipWs()
      if (buffer[pos] !== ':') {
        pos = savedPos
        return out
      }
      pos++
      const scanned = readValue()
      if (!scanned) {
        pos = savedPos
        return out
      }
      const ev: ProgressiveFieldEvent = {
        field: key,
        value: scanned.value,
        raw: scanned.raw,
        offset: scanned.end,
      }
      value[key] = scanned.value
      events.push(ev)
      out.push(ev)
      pos = scanned.end
    }
  }

  return {
    push(chunk) {
      buffer += chunk
      return tryConsume()
    },
    end() {
      const tail = tryConsume()
      if (!finished) {
        throw new Error('Progressive JSON ended without closing `}`')
      }
      return tail
    },
    get events() {
      return events
    },
    get value() {
      return value
    },
    get buffer() {
      return buffer
    },
  }
}

export interface ProgressiveExecOptions {
  /** Start executing after these fields have been received. Default: first field. */
  triggerFields?: string[]
  /** Called for each field event, including those after execution starts. */
  onField?: (event: ProgressiveFieldEvent) => void
}

export interface ProgressiveExecResult {
  fields: ProgressiveFieldEvent[]
  finalArgs: Record<string, unknown>
  /** Resolves with the tool's return value. */
  execution: Promise<unknown>
}

/**
 * Run a tool "progressively": feed argument-text chunks as they
 * stream, and kick off `tool.execute` as soon as the trigger fields
 * have arrived. Additional field events keep landing in the same
 * `onField` callback so the tool can adapt.
 *
 * The tool's `args` parameter reflects whichever fields had arrived
 * by the trigger point — callers that need the complete object should
 * wait for `finalArgs`.
 */
export function executeToolProgressively<TArgs extends Record<string, unknown>>(
  tool: ToolDefinition<TArgs>,
  chunks: AsyncIterable<string>,
  context: Omit<ToolExecutionContext, 'call'> & { messages: Message[]; callId: string },
  options: ProgressiveExecOptions = {},
): ProgressiveExecResult {
  const parser = createProgressiveArgParser()
  const trigger = new Set(options.triggerFields ?? [])
  const useFirst = trigger.size === 0
  let started = false
  let startResolve: (args: Record<string, unknown>) => void = () => {}
  const startArgs = new Promise<Record<string, unknown>>(res => {
    startResolve = res
  })
  const finalArgs: Record<string, unknown> = {}

  const handle = (ev: ProgressiveFieldEvent): void => {
    finalArgs[ev.field] = ev.value
    options.onField?.(ev)
    if (!started) {
      if (useFirst || trigger.has(ev.field)) {
        if (!useFirst) trigger.delete(ev.field)
        if (useFirst || trigger.size === 0) {
          started = true
          startResolve({ ...finalArgs })
        }
      }
    }
  }

  const consume = async (): Promise<void> => {
    for await (const chunk of chunks) {
      for (const ev of parser.push(chunk)) handle(ev)
    }
    for (const ev of parser.end()) handle(ev)
    if (!started) {
      started = true
      startResolve({ ...finalArgs })
    }
  }

  const execution = (async (): Promise<unknown> => {
    const consumer = consume()
    const argsAtStart = await startArgs
    const toolCall: ToolCall = {
      id: context.callId,
      name: tool.name,
      args: argsAtStart,
      status: 'running',
    }
    const execPromise = tool.execute
      ? Promise.resolve(tool.execute(argsAtStart as TArgs, { messages: context.messages, call: toolCall }))
      : Promise.resolve(undefined)
    const [result] = await Promise.all([execPromise, consumer])
    return result
  })()

  return {
    get fields() {
      return parser.events.slice()
    },
    get finalArgs() {
      return finalArgs
    },
    execution,
  }
}
