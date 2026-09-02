import { describe, expect, it } from 'vitest'
import type { AgentEvent } from '@agentskit/core'
import {
  createDevtoolsServer,
  toSseFrame,
  type DevtoolsClient,
  type DevtoolsEnvelope,
} from '../src/devtools'

function sink(id: string): DevtoolsClient & { envelopes: DevtoolsEnvelope[]; closed: boolean } {
  const envelopes: DevtoolsEnvelope[] = []
  let closed = false
  return {
    id,
    envelopes,
    get closed() {
      return closed
    },
    send: e => envelopes.push(e),
    close: () => {
      closed = true
    },
  }
}

const sampleEvent: AgentEvent = { type: 'llm:start', model: 'x', messageCount: 1 }

describe('createDevtoolsServer', () => {
  it('rejects invalid buffer sizes', () => {
    for (const bufferSize of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
      expect(() => createDevtoolsServer({ bufferSize })).toThrow(/bufferSize must be a finite positive integer/)
    }
  })

  it('publish appends to buffer and fans out to clients', () => {
    const server = createDevtoolsServer()
    const s = sink('a')
    server.attach(s)
    server.publish(sampleEvent)
    const events = s.envelopes.filter(e => e.type === 'agent-event')
    expect(events).toHaveLength(1)
    expect(events[0]!).toMatchObject({ seq: 1, event: { type: 'llm:start' } })
    expect(server.buffer()).toHaveLength(1)
  })

  it('observer forwards agent events to publish', () => {
    const server = createDevtoolsServer()
    const s = sink('a')
    server.attach(s)
    server.observer.on(sampleEvent)
    expect(s.envelopes.some(e => e.type === 'agent-event')).toBe(true)
  })

  it('attach replays buffer to new clients between hello and replay-end', () => {
    const server = createDevtoolsServer()
    server.publish(sampleEvent)
    server.publish({ type: 'llm:end', content: 'hi', durationMs: 10 })
    const s = sink('late')
    server.attach(s)
    const types = s.envelopes.map(e => e.type)
    expect(types[0]).toBe('hello')
    expect(types[1]).toBe('agent-event')
    expect(types[types.length - 1]).toBe('replay-end')
    const replays = s.envelopes.filter(e => e.type === 'agent-event')
    expect(replays).toHaveLength(2)
  })

  it('ring buffer caps at bufferSize', () => {
    const server = createDevtoolsServer({ bufferSize: 10 })
    for (let i = 0; i < 25; i++) server.publish(sampleEvent)
    expect(server.buffer()).toHaveLength(10)
  })

  it('detach removes the client from fan-out', () => {
    const server = createDevtoolsServer()
    const s = sink('a')
    const detach = server.attach(s)
    detach()
    const before = s.envelopes.length
    server.publish(sampleEvent)
    expect(s.envelopes.length).toBe(before)
    expect(s.closed).toBe(true)
  })

  it('close drops all clients and empties the buffer', () => {
    const server = createDevtoolsServer()
    const s = sink('a')
    server.attach(s)
    server.publish(sampleEvent)
    server.close()
    expect(s.closed).toBe(true)
    expect(server.buffer()).toHaveLength(0)
    // publish after close is a no-op
    server.publish(sampleEvent)
    expect(server.buffer()).toHaveLength(0)
  })

  it('attach after close immediately closes the client', () => {
    const server = createDevtoolsServer()
    server.close()
    const s = sink('a')
    server.attach(s)
    expect(s.closed).toBe(true)
    expect(s.envelopes).toHaveLength(0)
  })

  it('a throwing client does not poison other clients', () => {
    const server = createDevtoolsServer()
    const bad: DevtoolsClient = {
      id: 'bad',
      send: () => {
        throw new Error('nope')
      },
    }
    const good = sink('good')
    server.attach(bad)
    server.attach(good)
    server.publish(sampleEvent)
    expect(good.envelopes.some(e => e.type === 'agent-event')).toBe(true)
  })

  it('hello envelope exposes configured serverId', () => {
    const server = createDevtoolsServer({ serverId: 'test-server' })
    const s = sink('a')
    server.attach(s)
    const hello = s.envelopes[0]!
    if (hello.type !== 'hello') throw new Error('expected hello')
    expect(hello.serverId).toBe('test-server')
    expect(hello.protocol).toBe(1)
  })
})

describe('toSseFrame', () => {
  it('serializes to a valid SSE frame', () => {
    const frame = toSseFrame({ type: 'hello', protocol: 1, serverId: 's', since: new Date(0).toISOString() })
    expect(frame.startsWith('data: ')).toBe(true)
    expect(frame.endsWith('\n\n')).toBe(true)
    const json = frame.slice(6, -2)
    expect(JSON.parse(json)).toMatchObject({ type: 'hello', protocol: 1 })
  })
})
