import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRedisClientAdapter } from '../src/redis-client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('createRedisClientAdapter', () => {
  it('throws MemoryError with peer hint when redis is not installed', async () => {
    // Simulate the dynamic import failing
    vi.mock('redis', () => { throw new Error('Cannot find module') })

    // We need to use doMock to intercept the dynamic import
    const { createRedisClientAdapter: create } = await import('../src/redis-client')
    await expect(create('redis://localhost:6379')).rejects.toMatchObject({
      code: 'AK_MEMORY_PEER_MISSING',
      message: expect.stringContaining('redis'),
    })
  })

  it('creates adapter methods when redis is available', async () => {
    const commands: string[] = []
    const store = new Map<string, string>()

    const fakeClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(async (key: string) => store.get(key) ?? null),
      set: vi.fn(async (key: string, value: string) => { store.set(key, value) }),
      del: vi.fn(async (keys: string[]) => { for (const k of keys) store.delete(k) }),
      keys: vi.fn(async (pattern: string) => {
        const prefix = pattern.replace('*', '')
        return [...store.keys()].filter(k => k.startsWith(prefix))
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      sendCommand: vi.fn(async (args: string[]) => {
        commands.push(args[0]!)
        return 'OK'
      }),
    }

    const fakeRedis = {
      createClient: vi.fn(() => fakeClient),
    }

    vi.doMock('redis', () => fakeRedis)
    const { createRedisClientAdapter: create } = await import('../src/redis-client')

    const adapter = await create('redis://localhost:6379')

    // get
    await adapter.set('k', 'v')
    expect(await adapter.get('k')).toBe('v')

    // del single
    await adapter.del('k')
    expect(await adapter.get('k')).toBeNull()

    // del array
    await adapter.set('a', '1')
    await adapter.set('b', '2')
    await adapter.del(['a', 'b'])
    expect(await adapter.get('a')).toBeNull()

    // keys
    await adapter.set('prefix:1', 'x')
    const keys = await adapter.keys('prefix:*')
    expect(keys).toContain('prefix:1')

    // disconnect
    await adapter.disconnect()
    expect(fakeClient.disconnect).toHaveBeenCalled()

    // call / sendCommand
    const result = await adapter.call('PING')
    expect(fakeClient.sendCommand).toHaveBeenCalled()
    expect(result).toBe('OK')
  })

  it('del with empty array is a no-op', async () => {
    const fakeClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      keys: vi.fn().mockResolvedValue([]),
      disconnect: vi.fn().mockResolvedValue(undefined),
      sendCommand: vi.fn().mockResolvedValue(null),
    }
    const fakeRedis = { createClient: vi.fn(() => fakeClient) }
    vi.doMock('redis', () => fakeRedis)
    const { createRedisClientAdapter: create } = await import('../src/redis-client')

    const adapter = await create('redis://localhost')
    await adapter.del([])
    expect(fakeClient.del).not.toHaveBeenCalled()
  })
})
