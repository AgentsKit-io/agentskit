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

  it('throws on every action before init()', () => {
    const svc = new AgentskitChat()
    // requireController() throws synchronously before returning a Promise.
    expect(() => svc.snapshot()).toThrow(/init/)
    expect(() => svc.stop()).toThrow(/init/)
    expect(() => svc.setInput('x')).toThrow(/init/)
    expect(() => {
      void svc.send('x')
    }).toThrow(/init/)
    expect(() => {
      void svc.retry()
    }).toThrow(/init/)
    expect(() => {
      void svc.edit('m1', 'next')
    }).toThrow(/init/)
    expect(() => {
      void svc.regenerate('m1')
    }).toThrow(/init/)
    expect(() => {
      void svc.clear()
    }).toThrow(/init/)
    expect(() => {
      void svc.approve('t1')
    }).toThrow(/init/)
    expect(() => {
      void svc.deny('t1', 'nope')
    }).toThrow(/init/)
    expect(() => {
      void svc.proposeToolCall({ name: 'x', args: {} })
    }).toThrow(/init/)
  })

  it('init() returns ChatReturn and pushes signal + stream', () => {
    const svc = new AgentskitChat()
    const ret = svc.init({ adapter: mockAdapter([]) })
    expect(ret.messages).toEqual([])
    expect(ret.status).toBe('idle')
    expect(typeof ret.send).toBe('function')
    expect(typeof ret.edit).toBe('function')
    expect(typeof ret.regenerate).toBe('function')
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
    const sendPromise = svc.send('hello')
    // zone.js may wrap Promise; still thenable from the controller.
    expect(typeof sendPromise.then).toBe('function')
    await sendPromise
    await new Promise(r => setTimeout(r, 30))
    const state = svc.state()
    expect(state).not.toBeNull()
    expect(state!.messages.length).toBeGreaterThanOrEqual(2)
    svc.destroy()
  })

  it('forwards all ChatReturn actions and returns underlying Promises', async () => {
    const svc = new AgentskitChat()
    const ret = svc.init({ adapter: mockAdapter([]) })

    svc.setInput('draft')
    expect(svc.state()?.input).toBe('draft')

    const clearP = svc.clear()
    expect(typeof clearP.then).toBe('function')
    await clearP

    const retryP = svc.retry()
    expect(typeof retryP.then).toBe('function')
    await retryP

    svc.stop()

    const approveP = svc.approve('id-1')
    expect(typeof approveP.then).toBe('function')
    await approveP

    const denyP = svc.deny('id-2', 'user rejected')
    expect(typeof denyP.then).toBe('function')
    await denyP

    const editP = svc.edit('m1', 'edited content')
    expect(typeof editP.then).toBe('function')
    await editP

    const regenP = svc.regenerate('m1')
    expect(typeof regenP.then).toBe('function')
    await regenP

    expect(typeof ret.edit).toBe('function')
    expect(typeof ret.regenerate).toBe('function')
    expect(typeof ret.deny).toBe('function')
    expect(typeof ret.proposeToolCall).toBe('function')
    expect(svc.state()).not.toBeNull()
    svc.destroy()
  })

  it('forwards deny(reason) through the live controller', async () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })
    const c = (svc as unknown as { controller: { deny: (id: string, reason?: string) => Promise<void> } }).controller
    const deny = vi.spyOn(c, 'deny').mockResolvedValue(undefined)
    await svc.deny('tool-9', 'policy')
    expect(deny).toHaveBeenCalledWith('tool-9', 'policy')
    svc.destroy()
  })

  it('forwards edit and regenerate to the live controller', async () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })
    const c = (svc as unknown as {
      controller: {
        edit: (id: string, content: string, opts?: { regenerate?: boolean }) => Promise<void>
        regenerate: (id?: string) => Promise<void>
      }
    }).controller
    const edit = vi.spyOn(c, 'edit').mockResolvedValue(undefined)
    const regenerate = vi.spyOn(c, 'regenerate').mockResolvedValue(undefined)

    await svc.edit('msg-1', 'next', { regenerate: false })
    await svc.regenerate('msg-1')

    expect(edit).toHaveBeenCalledWith('msg-1', 'next', { regenerate: false })
    expect(regenerate).toHaveBeenCalledWith('msg-1')
    svc.destroy()
  })

  it('init() called twice destroys prior controller (unsubscribe + stop)', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    let sourceReady: (() => void) | undefined
    const ready = new Promise<void>(resolve => {
      sourceReady = resolve
    })
    const abort = vi.fn(() => release?.())

    const svc = new AgentskitChat()
    svc.init({
      adapter: {
        createSource: () => {
          sourceReady?.()
          return {
            async *stream() {
              yield { type: 'text' as const, content: 'started' }
              await gate
              yield { type: 'done' as const }
            },
            abort,
          }
        },
      },
    })
    void svc.send('hello')
    await ready

    // Re-init must tear down the active stream before wiring the next controller.
    svc.init({ adapter: mockAdapter([]) })
    expect(abort).toHaveBeenCalledOnce()
    expect(svc.state()).not.toBeNull()
    expect(svc.state()?.status).toBe('idle')
    svc.destroy()
  })

  it('destroy() nulls state + stream and is idempotent with ngOnDestroy', () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })

    let last: unknown = 'unset'
    const sub = svc.stream$.subscribe(v => {
      last = v
    })
    expect(last).not.toBeNull()

    svc.destroy()
    expect(svc.state()).toBeNull()
    expect(last).toBeNull()

    // Second destroy / ngOnDestroy must not throw.
    expect(() => svc.destroy()).not.toThrow()
    svc.ngOnDestroy()
    expect(svc.state()).toBeNull()
    expect(last).toBeNull()
    sub.unsubscribe()
  })

  it('destroy() stops an active adapter source', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>(resolve => {
      release = resolve
    })
    let sourceReady: (() => void) | undefined
    const ready = new Promise<void>(resolve => {
      sourceReady = resolve
    })
    const abort = vi.fn(() => release?.())
    const svc = new AgentskitChat()
    svc.init({
      adapter: {
        createSource: () => {
          sourceReady?.()
          return {
            async *stream() {
              yield { type: 'text' as const, content: 'started' }
              await gate
              yield { type: 'done' as const }
            },
            abort,
          }
        },
      },
    })

    void svc.send('hello')
    await ready
    svc.destroy()
    expect(abort).toHaveBeenCalledOnce()
  })

  it('reinit after destroy republishes state and stream', () => {
    const svc = new AgentskitChat()
    svc.init({ adapter: mockAdapter([]) })
    svc.destroy()
    expect(svc.state()).toBeNull()

    let last: unknown = null
    const sub = svc.stream$.subscribe(v => {
      last = v
    })
    expect(last).toBeNull()

    svc.init({ adapter: mockAdapter([]) })
    expect(svc.state()).not.toBeNull()
    expect(last).not.toBeNull()
    sub.unsubscribe()
    svc.destroy()
  })
})
