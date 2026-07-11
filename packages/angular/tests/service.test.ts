import { describe, expect, it, vi } from 'vitest'
import 'zone.js'
import type { AdapterFactory, AdapterRequest, StreamChunk } from '@agentskit/core'
import { AgentskitChat } from '../src'

function mockAdapter(chunks: StreamChunk[]): AdapterFactory {
  return {
    createSource: (_req: AdapterRequest) => {
      let aborted = false
      return {
        stream: async function* () {
          for (const chunk of chunks) {
            if (aborted) return
            yield chunk
          }
        },
        abort: () => {
          aborted = true
        },
      }
    },
  }
}

describe('AgentskitChat', () => {
  it('exports the service', () => {
    expect(AgentskitChat).toBeDefined()
  })

  it('snapshot() throws before init()', () => {
    const svc = new AgentskitChat()
    expect(() => svc.snapshot()).toThrow(/init/)
  })

  it('init() returns ChatReturn and pushes signal + stream', () => {
    const svc = new AgentskitChat()
    const ret = svc.init({ adapter: mockAdapter([]) })
    expect(ret.messages).toEqual([])
    expect(ret.status).toBe('idle')
    expect(typeof ret.send).toBe('function')
    expect(svc.state()).not.toBeNull()
    let last: unknown = null
    const sub = svc.stream$.subscribe(v => (last = v))
    expect(last).not.toBeNull()
    sub.unsubscribe()
    svc.destroy()
  })

  it('streams assistant content into signal', async () => {
    const svc = new AgentskitChat()
    svc.init({
      adapter: mockAdapter([
        { type: 'text', content: 'hi' },
        { type: 'done' },
      ]),
    })
    svc.send('hello')
    await new Promise(r => setTimeout(r, 30))
    const state = svc.state()
    expect(state).not.toBeNull()
    expect(state!.messages.length).toBeGreaterThanOrEqual(2)
    svc.destroy()
  })

  it('action delegates: setInput, clear, retry, stop, approve, deny', () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })
    svc.setInput('draft')
    expect(svc.state()?.input).toBe('draft')
    svc.clear()
    svc.retry()
    svc.stop()
    svc.approve('id-1')
    svc.deny('id-2')
    expect(svc.state()).not.toBeNull()
    svc.destroy()
  })

  it('init() called twice destroys prior controller', () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })
    svc.init({ adapter: mockAdapter([]) })
    expect(svc.state()).not.toBeNull()
    svc.destroy()
  })

  it('destroy() clears state and ngOnDestroy delegates', () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })
    svc.ngOnDestroy()
    expect(svc.state()).toBeNull()
  })

  it('destroy() stops an active adapter source', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>(resolve => { release = resolve })
    let sourceReady: (() => void) | undefined
    const ready = new Promise<void>(resolve => { sourceReady = resolve })
    const abort = vi.fn(() => release?.())
    const svc = new AgentskitChat()
    svc.init({ adapter: { createSource: () => { sourceReady?.(); return { async *stream() {
      yield { type: 'text' as const, content: 'started' }
      await gate
      yield { type: 'done' as const }
    }, abort } } } })

    svc.send('hello')
    await ready
    svc.destroy()
    expect(abort).toHaveBeenCalledOnce()
  })
})
