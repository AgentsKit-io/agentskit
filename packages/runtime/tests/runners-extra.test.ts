import { describe, expect, it } from 'vitest'
import {
  claudeCodeRunner,
  codexRunner,
  copilotKitRunner,
  createRunnerRegistry,
  type AcpTransport,
} from '../src/runners'
import { execCli } from '../src/runners/cli'
import { hermesAcpRunner, spawnAcpTransport } from '../src/runners/acp'

const hangingTransport = (): AcpTransport => ({
  onNotification: () => undefined,
  onRequest: () => undefined,
  close: () => undefined,
  request: () => new Promise(() => undefined),
})

describe('hermes ACP limits and errors', () => {
  it('fails on timeout', async () => {
    const result = await hermesAcpRunner({ connect: hangingTransport }).run({ prompt: 'x', budget: { timeoutMs: 20 } })
    expect(result.status).toBe('failed')
    expect(result.error).toBe('timeout exceeded')
  })

  it('aborts on signal, including an already-aborted one', async () => {
    const controller = new AbortController()
    const pending = hermesAcpRunner({ connect: hangingTransport }).run({ prompt: 'x', signal: controller.signal })
    controller.abort()
    expect((await pending).status).toBe('aborted')
    const again = await hermesAcpRunner({ connect: hangingTransport }).run({ prompt: 'x', signal: controller.signal })
    expect(again.status).toBe('aborted')
  })

  it('records tool_call updates and ignores other notifications', async () => {
    const connect = (): AcpTransport => {
      let notify: (m: string, p: unknown) => void = () => undefined
      return {
        onNotification: h => { notify = h },
        onRequest: () => undefined,
        close: () => undefined,
        async request(method) {
          if (method === 'session/new') return { sessionId: 's' }
          if (method === 'session/prompt') {
            notify('other', {})
            notify('session/update', { update: { sessionUpdate: 'tool_call' } })
          }
          return {}
        },
      }
    }
    const result = await hermesAcpRunner({ connect }).run({ prompt: 'x' })
    expect(result.trace.some(s => s.name === 'hermes-acp.tool_call')).toBe(true)
  })

  it('reports transport errors and non-Error throws', async () => {
    const connect = (): AcpTransport => { throw 'bad' }
    const result = await hermesAcpRunner({ connect }).run({ prompt: 'x' })
    expect(result).toMatchObject({ status: 'failed', error: 'bad' })
  })
})

describe('spawnAcpTransport', () => {
  const script = `
    let buf = ''
    process.stdin.on('data', d => {
      buf += d
      let i
      while ((i = buf.indexOf('\\n')) >= 0) {
        const msg = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1)
        process.stdout.write('not json\\n')
        process.stdout.write(JSON.stringify({ method: 'note', params: { n: 1 } }) + '\\n')
        if (msg.method === 'boom') process.stdout.write(JSON.stringify({ id: msg.id, error: { message: 'nope' } }) + '\\n')
        else if (msg.method === 'quit') process.exit(0)
        else process.stdout.write(JSON.stringify({ id: msg.id, result: { echo: msg.method } }) + '\\n')
      }
    })
  `

  it('round-trips requests, errors and notifications over stdio', async () => {
    const transport = spawnAcpTransport(process.execPath, ['-e', script])
    try {
      const notes: unknown[] = []
      transport.onNotification((m, p) => notes.push([m, p]))
      expect(await transport.request('hi', {})).toEqual({ echo: 'hi' })
      await expect(transport.request('boom', {})).rejects.toThrow('nope')
      expect(notes.length).toBeGreaterThan(0)
      await expect(transport.request('quit', {})).rejects.toThrow('ACP agent exited')
    } finally {
      transport.close()
    }
  })
})

describe('hermes ACP agent-to-client requests', () => {
  const permission = {
    toolCall: { title: 'Edit' },
    options: [
      { optionId: 'no', kind: 'reject_once' },
      { optionId: 'yes', kind: 'allow_once' },
    ],
  }

  const run = async (allowedTools: string[] | undefined, method = 'session/request_permission') => {
    const replies: unknown[] = []
    const connect = (): AcpTransport => {
      let onRequest: (m: string, p: unknown) => unknown = () => undefined
      return {
        onNotification: () => undefined,
        onRequest: h => { onRequest = h },
        close: () => undefined,
        async request(m) {
          if (m === 'session/new') return { sessionId: 's' }
          if (m === 'session/prompt') {
            try { replies.push(await onRequest(method, permission)) } catch (e) { replies.push({ code: (e as { code?: number }).code }) }
          }
          return {}
        },
      }
    }
    const result = await hermesAcpRunner({ connect }).run({ prompt: 'x', allowedTools })
    return { result, reply: replies[0] }
  }

  it('allows listed tools and rejects the rest', async () => {
    expect((await run(['Edit'])).reply).toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } })
    expect((await run(undefined)).reply).toEqual({ outcome: { outcome: 'selected', optionId: 'yes' } })
    expect((await run(['Read'])).reply).toEqual({ outcome: { outcome: 'selected', optionId: 'no' } })
  })

  it('replies -32601 to unknown methods', async () => {
    expect((await run(undefined, 'fs/read_text_file')).reply).toEqual({ code: -32601 })
  })

  it('answers a request whose id collides with a pending client id, over stdio', async () => {
    const script = `
      let buf = '', held
      process.stdin.on('data', d => {
        buf += d
        let i
        while ((i = buf.indexOf('\\n')) >= 0) {
          const msg = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1)
          if (msg.method === 'hi') {
            held = msg.id
            process.stdout.write(JSON.stringify({ id: msg.id, method: 'session/request_permission', params: ${JSON.stringify(permission)} }) + '\\n')
          } else if (msg.method === undefined) {
            process.stdout.write(JSON.stringify({ id: held, result: { permission: msg.result, id: msg.id } }) + '\\n')
          }
        }
      })
    `
    const transport = spawnAcpTransport(process.execPath, ['-e', script])
    try {
      transport.onRequest(() => ({ outcome: { outcome: 'selected', optionId: 'yes' } }))
      expect(await transport.request('hi', {})).toEqual({
        permission: { outcome: { outcome: 'selected', optionId: 'yes' } },
        id: 1,
      })
    } finally {
      transport.close()
    }
  })
})

describe('http runner', () => {
  const okFetch = ((body: string) => (async () => new Response(body)) as typeof fetch)

  it('accepts plain text and json artifacts', async () => {
    const text = await copilotKitRunner({ url: 'http://x', fetch: okFetch('plain') }).run({ prompt: 'x' })
    expect(text.output).toBe('plain')
    const json = await copilotKitRunner({
      url: 'http://x',
      fetch: okFetch(JSON.stringify({ output: 'o', artifacts: [{ kind: 'text', name: 'a' }], costUsd: 2 })),
    }).run({ prompt: 'x' })
    expect(json).toMatchObject({ output: 'o', costUsd: 2, artifacts: [{ name: 'a' }] })
  })

  it('maps timeout, abort and thrown errors', async () => {
    const slow = ((_u: unknown, init: RequestInit) => new Promise((_, rej) => {
      if (init.signal?.aborted) rej(new Error('x'))
      init.signal?.addEventListener('abort', () => rej(new Error('x')))
    })) as unknown as typeof fetch
    const timed = await copilotKitRunner({ url: 'http://x', fetch: slow }).run({ prompt: 'x', budget: { timeoutMs: 10 } })
    expect(timed.error).toBe('timeout exceeded')
    const controller = new AbortController()
    const pending = copilotKitRunner({ url: 'http://x', fetch: slow }).run({ prompt: 'x', signal: controller.signal })
    controller.abort()
    expect((await pending).status).toBe('aborted')
    const pre = await copilotKitRunner({ url: 'http://x', fetch: slow }).run({ prompt: 'x', signal: controller.signal })
    expect(pre.status).toBe('aborted')
    const boom = (async () => { throw 'plain' }) as unknown as typeof fetch
    expect((await copilotKitRunner({ url: 'http://x', fetch: boom }).run({ prompt: 'x' })).error).toBe('plain')
  })
})

describe('cli runners', () => {
  it('execCli runs a real process', async () => {
    const out = await execCli(process.execPath, ['-e', 'console.log("hi")'])
    expect(out).toMatchObject({ code: 0, timedOut: false, aborted: false })
    expect(out.stdout.trim()).toBe('hi')
  })

  it('claude code falls back to raw stdout on non-JSON', async () => {
    const exec = async () => ({ code: 0, stdout: ' raw \n', stderr: '', timedOut: false, aborted: false })
    expect((await claudeCodeRunner({ exec }).run({ prompt: 'x' })).output).toBe('raw')
    const json = async () => ({ code: 0, stdout: '{"a":1}', stderr: '', timedOut: false, aborted: false })
    expect((await claudeCodeRunner({ exec: json }).run({ prompt: 'x' })).output).toBe('{"a":1}')
  })

  it('codex maps timeout and abort outcomes', async () => {
    const timed = await codexRunner({ exec: async () => ({ code: null, stdout: '', stderr: '', timedOut: true, aborted: false }) } as never).run({ prompt: 'x' })
    expect(timed.status).toBe('failed')
    const aborted = await codexRunner({ exec: async () => ({ code: null, stdout: '', stderr: '', timedOut: false, aborted: true }) } as never).run({ prompt: 'x' })
    expect(aborted.status).toBe('aborted')
  })
})

describe('registry ids', () => {
  it('lists ids', () => {
    expect(createRunnerRegistry([codexRunner()]).ids()).toEqual(['codex'])
  })
})
