import type { JsonRpcMessage, McpTransport } from './types'

/**
 * Paired in-memory transports for tests and in-process bridges.
 * Returns two transports that see each other's `send` output on
 * their `onMessage` handlers.
 */
export function createInMemoryTransportPair(): [McpTransport, McpTransport] {
  const listeners: [Set<(m: JsonRpcMessage) => void>, Set<(m: JsonRpcMessage) => void>] = [
    new Set(),
    new Set(),
  ]
  const closeListeners: [Set<() => void>, Set<() => void>] = [new Set(), new Set()]
  let closed = false

  const make = (self: 0 | 1): McpTransport => {
    const other = (self === 0 ? 1 : 0) as 0 | 1
    return {
      send(message) {
        if (closed) return
        for (const l of listeners[other]) l(message)
      },
      onMessage(handler) {
        listeners[self].add(handler)
        return () => {
          listeners[self].delete(handler)
        }
      },
      onClose(handler) {
        closeListeners[self].add(handler)
        return () => {
          closeListeners[self].delete(handler)
        }
      },
      close() {
        closed = true
        for (const l of closeListeners[0]) l()
        for (const l of closeListeners[1]) l()
      },
    }
  }

  return [make(0), make(1)]
}

/**
 * Create a stdio transport over a child process handle. The spawned
 * process is expected to speak MCP's newline-delimited JSON framing
 * on stdin/stdout.
 *
 * Pass any object exposing the three streams; this intentionally
 * avoids importing `node:child_process` so the module stays
 * environment-agnostic. Most callers will wrap `child_process.spawn`
 * themselves and hand the handle in.
 */
export interface StdioLikeProcess {
  stdin: { write: (chunk: string) => boolean | void }
  stdout: {
    on: (event: 'data', cb: (chunk: Buffer | string) => void) => void
    off?: (event: 'data', cb: (chunk: Buffer | string) => void) => void
  }
  on?: (event: 'exit' | 'close', cb: () => void) => void
  kill?: () => void
}

export interface StdioTransportOptions {
  /**
   * Maximum bytes the line buffer may hold without seeing a newline.
   * A server that emits no framing terminator would otherwise grow this
   * buffer until the process runs out of memory. Default 1 MB.
   */
  maxFrameBytes?: number
}

const DEFAULT_MAX_FRAME_BYTES = 1_048_576

export function createStdioTransport(
  child: StdioLikeProcess,
  options: StdioTransportOptions = {},
): McpTransport {
  const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES
  const messageListeners = new Set<(m: JsonRpcMessage) => void>()
  const closeListeners = new Set<() => void>()
  let buffer = ''
  let closed = false

  const fireClose = (): void => {
    if (closed) return
    closed = true
    for (const l of closeListeners) l()
  }

  const onData = (chunk: Buffer | string): void => {
    if (closed) return
    buffer += typeof chunk === 'string' ? chunk : chunk.toString('utf8')
    let newlineIdx = buffer.indexOf('\n')
    while (newlineIdx >= 0) {
      const line = buffer.slice(0, newlineIdx).trim()
      buffer = buffer.slice(newlineIdx + 1)
      if (line) {
        try {
          const message = JSON.parse(line) as JsonRpcMessage
          for (const l of messageListeners) l(message)
        } catch {
          // ignore malformed frames
        }
      }
      newlineIdx = buffer.indexOf('\n')
    }
    if (buffer.length > maxFrameBytes) {
      // Oversized frame with no newline — drop buffer, signal close,
      // and kill the child so the leak cannot continue.
      buffer = ''
      try {
        child.kill?.()
      } catch {
        // ignore
      }
      fireClose()
    }
  }

  child.stdout.on('data', onData)
  child.on?.('exit', fireClose)
  child.on?.('close', fireClose)

  return {
    send(message) {
      child.stdin.write(`${JSON.stringify(message)}\n`)
    },
    onMessage(handler) {
      messageListeners.add(handler)
      return () => {
        messageListeners.delete(handler)
      }
    },
    onClose(handler) {
      closeListeners.add(handler)
      return () => {
        closeListeners.delete(handler)
      }
    },
    close() {
      child.stdout.off?.('data', onData)
      child.kill?.()
    },
  }
}
