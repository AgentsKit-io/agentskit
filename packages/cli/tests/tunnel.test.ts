import { afterEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { loadLocaltunnel, startTunnel, TUNNEL_PROVIDER_HINT, type TunnelLike } from '../src/tunnel'

describe('loadLocaltunnel', () => {
  it('prints an install hint when the provider is missing', async () => {
    const importer = vi.fn().mockRejectedValue(Object.assign(new Error('nope'), { code: 'ERR_MODULE_NOT_FOUND' }))
    await expect(loadLocaltunnel({ port: 1 }, importer)).rejects.toThrow(TUNNEL_PROVIDER_HINT)
    expect(importer).toHaveBeenCalledWith('localtunnel')
  })

  it('rethrows unrelated import errors', async () => {
    const importer = vi.fn().mockRejectedValue(new Error('boom'))
    await expect(loadLocaltunnel({ port: 1 }, importer)).rejects.toThrow('boom')
  })

  it('lazily loads the provider and opens the tunnel', async () => {
    const fake = new FakeTunnel()
    const lt = vi.fn().mockResolvedValue(fake)
    const tunnel = await loadLocaltunnel({ port: 5 }, async () => ({ default: lt }))
    expect(tunnel).toBe(fake)
    expect(lt).toHaveBeenCalledWith({ port: 5 })
  })
})

class FakeTunnel extends EventEmitter implements TunnelLike {
  url: string
  closed = false
  constructor(url = 'https://abc-def-12345.loca.lt') {
    super()
    this.url = url
  }
  close() {
    this.closed = true
    this.emit('close')
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

const noopStream = { write: () => true } as NodeJS.WritableStream

describe('startTunnel', () => {
  it('opens a tunnel and reports the URL', async () => {
    const fake = new FakeTunnel('https://test.loca.lt')
    const open = vi.fn().mockResolvedValue(fake)

    const controller = await startTunnel({
      port: 4000,
      open,
      stdout: noopStream,
    })

    expect(open).toHaveBeenCalledWith({ port: 4000, subdomain: undefined, local_host: undefined })
    expect(controller.url).toBe('https://test.loca.lt')
    expect(controller.requests()).toBe(0)

    await controller.stop()
  })

  it('forwards subdomain and host hints', async () => {
    const fake = new FakeTunnel()
    const open = vi.fn().mockResolvedValue(fake)

    const controller = await startTunnel({
      port: 8080,
      subdomain: 'agentskit-demo',
      host: '127.0.0.1',
      open,
      stdout: noopStream,
    })

    expect(open).toHaveBeenCalledWith({
      port: 8080,
      subdomain: 'agentskit-demo',
      local_host: '127.0.0.1',
    })
    await controller.stop()
  })

  it('counts incoming requests', async () => {
    const fake = new FakeTunnel()
    const open = vi.fn().mockResolvedValue(fake)

    const controller = await startTunnel({ port: 4000, open, stdout: noopStream })

    fake.emit('request')
    fake.emit('request')
    fake.emit('request')

    expect(controller.requests()).toBe(3)
    await controller.stop()
  })

  it('stop() closes the tunnel and resolves done', async () => {
    const fake = new FakeTunnel()
    const open = vi.fn().mockResolvedValue(fake)

    const controller = await startTunnel({ port: 4000, open, stdout: noopStream })

    void controller.stop()
    await expect(controller.done).resolves.toBeUndefined()
    expect(fake.closed).toBe(true)
  })

  it('done resolves when the remote closes the tunnel', async () => {
    const fake = new FakeTunnel()
    const open = vi.fn().mockResolvedValue(fake)

    const controller = await startTunnel({ port: 4000, open, stdout: noopStream })

    fake.emit('close')

    await expect(controller.done).resolves.toBeUndefined()
  })

  it('calls onReady with the tunnel URL', async () => {
    const fake = new FakeTunnel('https://greeted.loca.lt')
    const open = vi.fn().mockResolvedValue(fake)
    const onReady = vi.fn()

    const controller = await startTunnel({
      port: 4000,
      open,
      stdout: noopStream,
      onReady,
    })

    expect(onReady).toHaveBeenCalledWith('https://greeted.loca.lt')
    await controller.stop()
  })

  it('logs error events without throwing', async () => {
    const fake = new FakeTunnel()
    const open = vi.fn().mockResolvedValue(fake)

    const controller = await startTunnel({ port: 4000, open, stdout: noopStream })

    expect(() => fake.emit('error', new Error('test error'))).not.toThrow()

    await controller.stop()
  })
})
