import type { AgentEvent, Observer } from '@agentskit/core'
import { ConfigError, ErrorCodes } from '@agentskit/core'

export interface DevtoolsClient {
  id: string
  send: (event: DevtoolsEnvelope) => void
  close?: () => void
}

export type DevtoolsEnvelope =
  | { type: 'hello'; protocol: 1; serverId: string; since: string }
  | { type: 'agent-event'; seq: number; at: number; event: AgentEvent }
  | { type: 'replay-end'; seq: number }

export interface DevtoolsServerOptions {
  /** Max events to retain in the ring buffer. Default 500. */
  bufferSize?: number
  /** Server id emitted in the `hello` envelope. Default: random. */
  serverId?: string
}

export interface DevtoolsServer {
  /** Observer you can plug into `createRuntime({ observers: [...] })`. */
  observer: Observer
  /** Push arbitrary events (tests / custom sources). */
  publish: (event: AgentEvent) => void
  /** Attach a transport — SSE response, WS connection, in-process sink. */
  attach: (client: DevtoolsClient) => () => void
  /** Drop all clients and clear buffer. */
  close: () => void
  /** Snapshot of retained events, newest last. */
  buffer: () => ReadonlyArray<{ seq: number; at: number; event: AgentEvent }>
}

/**
 * In-process pub/sub hub for agent events. Transport-agnostic — hand
 * the returned `attach` function any object that can `send` envelopes
 * (an SSE response, a WebSocket, a test sink). Designed as the
 * contract a browser devtools extension speaks against.
 *
 * New clients receive a `hello` envelope followed by a replay of the
 * ring buffer (so the extension can jump in mid-session and see
 * recent history), then `replay-end`, then the live feed.
 */
export function createDevtoolsServer(options: DevtoolsServerOptions = {}): DevtoolsServer {
  if (options.bufferSize !== undefined &&
      (!Number.isFinite(options.bufferSize) || !Number.isInteger(options.bufferSize) || options.bufferSize <= 0)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `createDevtoolsServer: bufferSize must be a finite positive integer (received ${String(options.bufferSize)})`,
      hint: 'Pass a positive whole number for the event buffer.',
    })
  }
  const bufferSize = Math.max(10, options.bufferSize ?? 500)
  const serverId = options.serverId ?? `ak-${Math.random().toString(36).slice(2, 10)}`
  const buffer: Array<{ seq: number; at: number; event: AgentEvent }> = []
  const clients = new Map<string, DevtoolsClient>()
  let seq = 0
  let closed = false

  const publish = (event: AgentEvent): void => {
    if (closed) return
    seq++
    const record = { seq, at: Date.now(), event }
    buffer.push(record)
    while (buffer.length > bufferSize) buffer.shift()
    const envelope: DevtoolsEnvelope = { type: 'agent-event', seq, at: record.at, event }
    for (const client of clients.values()) {
      try {
        client.send(envelope)
      } catch {
        // A misbehaving client shouldn't poison the pub-sub loop.
      }
    }
  }

  const attach = (client: DevtoolsClient): (() => void) => {
    if (closed) {
      client.close?.()
      return () => {}
    }
    clients.set(client.id, client)
    const safeSend = (envelope: DevtoolsEnvelope): void => {
      try {
        client.send(envelope)
      } catch {
        // Misbehaving client — leave it registered so the caller can detach.
      }
    }
    safeSend({
      type: 'hello',
      protocol: 1,
      serverId,
      since: new Date().toISOString(),
    })
    for (const record of buffer) {
      safeSend({ type: 'agent-event', seq: record.seq, at: record.at, event: record.event })
    }
    safeSend({ type: 'replay-end', seq })
    return () => {
      clients.delete(client.id)
      client.close?.()
    }
  }

  const close = (): void => {
    closed = true
    for (const client of clients.values()) client.close?.()
    clients.clear()
    buffer.length = 0
  }

  return {
    observer: {
      name: 'devtools',
      on: (event: AgentEvent) => publish(event),
    },
    publish,
    attach,
    close,
    buffer: () => buffer.slice(),
  }
}

/**
 * Serialize a devtools envelope as a single `data: ...\n\n` SSE frame.
 * Framework-agnostic — hook into Express / Hono / plain http by
 * writing the returned string to your response.
 */
export function toSseFrame(envelope: DevtoolsEnvelope): string {
  return `data: ${JSON.stringify(envelope)}\n\n`
}
