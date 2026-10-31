import { spawnProcess } from '@agentskit/cross-platform'
import { createTraceRecorder } from './trace'
import type { AgentRunner } from './types'

/** JSON-RPC channel to an ACP agent. */
export interface AcpTransport {
  /** Send a JSON-RPC request and resolve with its result. */
  request(method: string, params: unknown): Promise<unknown>
  /** Subscribe to JSON-RPC notifications from the agent. */
  onNotification(handler: (method: string, params: unknown) => void): void
  close(): void
}

interface RpcMessage {
  id?: number
  method?: string
  params?: unknown
  result?: unknown
  error?: { message?: string }
}

/** Newline-delimited JSON-RPC over a child process's stdio, as ACP agents speak. */
export function spawnAcpTransport(command: string, args: string[], cwd?: string): AcpTransport {
  const child = spawnProcess(command, args, { cwd, stdin: 'pipe', stdout: 'pipe', stderr: 'inherit' })
  const writer = child.stdin?.getWriter()
  const encoder = new TextEncoder()
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  const handlers: Array<(method: string, params: unknown) => void> = []
  let nextId = 0
  const failAll = (err: Error): void => {
    for (const p of pending.values()) p.reject(err)
    pending.clear()
  }
  const dispatch = (line: string): void => {
    let msg: RpcMessage
    try { msg = JSON.parse(line) as RpcMessage } catch { return }
    const waiter = msg.id === undefined ? undefined : pending.get(msg.id)
    if (waiter && msg.id !== undefined) {
      pending.delete(msg.id)
      if (msg.error) waiter.reject(new Error(msg.error.message ?? 'ACP error'))
      else waiter.resolve(msg.result)
    } else if (msg.method) {
      for (const h of handlers) h(msg.method, msg.params)
    }
  }
  const pump = async (): Promise<void> => {
    if (!child.stdout) return
    const reader = child.stdout.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl = buffer.indexOf('\n')
      while (nl >= 0) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (line) dispatch(line)
        nl = buffer.indexOf('\n')
      }
    }
  }
  pump().then(() => failAll(new Error('ACP agent exited')), failAll)
  child.exited.catch(failAll)
  return {
    request: (method, params) => new Promise((resolve, reject) => {
      const id = ++nextId
      pending.set(id, { resolve, reject })
      writer?.write(encoder.encode(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)).catch(reject)
    }),
    onNotification: h => { handlers.push(h) },
    close: () => { void child.kill() },
  }
}

/** Options for {@link hermesAcpRunner}. */
export interface HermesAcpRunnerOptions {
  command?: string
  args?: string[]
  /** Injected for tests; defaults to spawning `hermes acp`. */
  connect?: (cwd?: string) => AcpTransport
}

/** Hermes Agent over the Agent Client Protocol: `initialize`, `session/new`, `session/prompt`, streamed `session/update`. */
export function hermesAcpRunner(options: HermesAcpRunnerOptions = {}): AgentRunner {
  const connect = options.connect
    ?? ((cwd?: string) => spawnAcpTransport(options.command ?? 'hermes', options.args ?? ['acp'], cwd))
  return {
    id: 'hermes-acp',
    async run(task) {
      const trace = createTraceRecorder('hermes-acp', { 'runner.cwd': task.cwd })
      let transport: AcpTransport | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      let aborted = false
      try {
        transport = connect(task.cwd)
        const chunks: string[] = []
        transport.onNotification((method, params) => {
          if (method !== 'session/update') return
          const update = (params as { update?: { sessionUpdate?: string; content?: { text?: string } } } | undefined)?.update
          if (update?.sessionUpdate === 'agent_message_chunk' && typeof update.content?.text === 'string') {
            chunks.push(update.content.text)
          } else if (update?.sessionUpdate === 'tool_call') {
            trace.end(trace.child('hermes-acp.tool_call', { update }))
          }
        })
        const t = transport
        const limits: Array<Promise<never>> = []
        if (task.budget?.timeoutMs) {
          limits.push(new Promise<never>((_, rej) => {
            timer = setTimeout(() => rej(new Error('timeout exceeded')), task.budget!.timeoutMs)
          }))
        }
        if (task.signal) {
          limits.push(new Promise<never>((_, rej) => {
            const abort = (): void => { aborted = true; rej(new Error('aborted')) }
            if (task.signal!.aborted) abort()
            else task.signal!.addEventListener('abort', abort, { once: true })
          }))
        }
        const exchange = (async () => {
          const init = trace.child('hermes-acp.initialize')
          await t.request('initialize', { protocolVersion: 1, clientCapabilities: {} })
          trace.end(init)
          const created = await t.request('session/new', { cwd: task.cwd ?? process.cwd(), mcpServers: [] }) as { sessionId: string }
          const prompt = trace.child('hermes-acp.prompt')
          await t.request('session/prompt', { sessionId: created.sessionId, prompt: [{ type: 'text', text: task.prompt }] })
          trace.end(prompt)
        })()
        await Promise.race([exchange, ...limits])
        trace.end(trace.root)
        return { status: 'completed', output: chunks.join(''), artifacts: [], trace: trace.spans() }
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        trace.end(trace.root, 'error', { error })
        return { status: aborted ? 'aborted' : 'failed', output: '', artifacts: [], trace: trace.spans(), error }
      } finally {
        if (timer) clearTimeout(timer)
        transport?.close()
      }
    },
  }
}
