import type { SandboxBackend, ExecuteOptions, ExecuteResult } from './types'

export interface E2BConfig {
  apiKey: string
  timeout?: number
}

interface E2BSandboxInstance {
  runCode(code: string, opts?: { language?: string; onStdout?: (data: { line: string }) => void; onStderr?: (data: { line: string }) => void }): Promise<{ exitCode: number }>
  kill(): Promise<void>
}

export function createE2BBackend(config: E2BConfig): SandboxBackend {
  let instance: E2BSandboxInstance | null = null
  let instancePromise: Promise<E2BSandboxInstance> | null = null

  const getInstance = (): Promise<E2BSandboxInstance> => {
    if (instance) return Promise.resolve(instance)
    if (instancePromise) return instancePromise

    instancePromise = (async () => {
      try {
        const mod = await import('@e2b/code-interpreter')
        const Sandbox = mod.Sandbox ?? (mod as unknown as { default: { Sandbox: unknown } }).default?.Sandbox
        if (!Sandbox) throw new Error('Sandbox class not found in @e2b/code-interpreter')

        const sb = await (Sandbox as unknown as {
          create(opts: { apiKey: string; timeout?: number }): Promise<E2BSandboxInstance>
        }).create({
          apiKey: config.apiKey,
          timeout: config.timeout ?? 300_000,
        })

        instance = sb
        return sb
      } catch (err) {
        instancePromise = null
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Cannot find module') || msg.includes('@e2b')) {
          throw new Error('Install @e2b/code-interpreter to use E2B sandbox: npm install @e2b/code-interpreter')
        }
        throw err
      }
    })()

    return instancePromise
  }

  return {
    async execute(code: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
      const sb = await getInstance()
      const language = options.language ?? 'javascript'
      const timeout = options.timeout ?? 30_000

      let stdout = ''
      let stderr = ''
      const startTime = Date.now()

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Sandbox execution timed out after ${timeout}ms`)), timeout)
      })

      try {
        const resultPromise = sb.runCode(code, {
          language: language === 'python' ? 'python' : 'javascript',
          onStdout: (data) => { stdout += data.line + '\n' },
          onStderr: (data) => { stderr += data.line + '\n' },
        })

        const result = await Promise.race([resultPromise, timeoutPromise])

        return {
          stdout: stdout.trimEnd(),
          stderr: stderr.trimEnd(),
          exitCode: result.exitCode,
          durationMs: Date.now() - startTime,
        }
      } catch (err) {
        return {
          stdout: stdout.trimEnd(),
          stderr: err instanceof Error ? err.message : String(err),
          exitCode: 1,
          durationMs: Date.now() - startTime,
        }
      }
    },

    async dispose() {
      if (instance) {
        await instance.kill()
        instance = null
        instancePromise = null
      }
    },
  }
}
