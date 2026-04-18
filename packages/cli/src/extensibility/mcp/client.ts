import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import type { McpServerSpec } from '../plugins/types'

export interface McpTool {
  name: string
  description?: string
  inputSchema?: unknown
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number | string
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

/**
 * Minimal JSON-RPC-over-stdio client for an MCP server. This is a
 * pragmatic subset of the MCP protocol sufficient for `tools/list` +
 * `tools/call` — full spec support lives in `@modelcontextprotocol/sdk`
 * if/when we depend on it.
 *
 * Transport: newline-delimited JSON (per the MCP stdio transport spec).
 */
export class McpClient {
  private child: ChildProcessWithoutNullStreams | undefined
  private buffer = ''
  private nextId = 1
  private readonly pending = new Map<number, (res: JsonRpcResponse) => void>()
  private disposed = false

  constructor(
    readonly spec: McpServerSpec,
    private readonly onError: (err: unknown) => void = (err) =>
      process.stderr.write(
        `[agentskit] mcp[${spec.name}] error: ${err instanceof Error ? err.message : String(err)}\n`,
      ),
  ) {}

  async start(): Promise<void> {
    if (this.child) return
    const child = spawn(this.spec.command, this.spec.args ?? [], {
      env: { ...process.env, ...(this.spec.env ?? {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams
    this.child = child

    child.stdout.on('data', (chunk) => this.onStdout(chunk.toString()))
    child.stderr.on('data', (chunk) => {
      process.stderr.write(`[mcp ${this.spec.name}] ${chunk}`)
    })
    child.on('error', (err) => this.onError(err))
    child.on('close', () => {
      this.disposed = true
      for (const pending of this.pending.values()) {
        pending({ jsonrpc: '2.0', id: 0, error: { code: -1, message: 'server closed' } })
      }
      this.pending.clear()
    })

    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'agentskit', version: '0' },
    })
  }

  async listTools(): Promise<McpTool[]> {
    const res = await this.request('tools/list', {})
    const tools = (res as { tools?: McpTool[] }).tools ?? []
    return tools
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    return await this.request('tools/call', { name, arguments: args })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.child?.kill('SIGTERM')
  }

  private request(method: string, params: unknown): Promise<unknown> {
    return new Promise((resolvePromise, rejectPromise) => {
      if (!this.child || this.disposed) {
        rejectPromise(new Error(`mcp server ${this.spec.name} not running`))
        return
      }
      const id = this.nextId++
      const timeoutMs = this.spec.timeout ?? 10_000
      const timer = setTimeout(() => {
        this.pending.delete(id)
        rejectPromise(new Error(`mcp ${this.spec.name}.${method} timed out`))
      }, timeoutMs)

      this.pending.set(id, (res) => {
        clearTimeout(timer)
        if (res.error) {
          rejectPromise(new Error(`mcp ${method} failed: ${res.error.message}`))
          return
        }
        resolvePromise(res.result)
      })

      const message = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
      this.child.stdin.write(message)
    })
  }

  private onStdout(chunk: string): void {
    this.buffer += chunk
    let newlineIndex = this.buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)
      if (line) {
        try {
          const parsed = JSON.parse(line) as JsonRpcResponse
          const pending = this.pending.get(Number(parsed.id))
          if (pending) {
            this.pending.delete(Number(parsed.id))
            pending(parsed)
          }
        } catch (err) {
          this.onError(err)
        }
      }
      newlineIndex = this.buffer.indexOf('\n')
    }
  }
}
