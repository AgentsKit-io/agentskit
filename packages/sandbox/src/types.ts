export interface ExecuteOptions {
  language?: 'javascript' | 'python'
  timeout?: number
  network?: boolean
  /**
   * Soft resource hint for custom backends. **Not enforced** by the E2B or
   * Web Worker backends — those platforms do not expose per-instance memory
   * limits through the AgentsKit adapter. Custom `SandboxBackend`
   * implementations may honor it.
   */
  memoryLimit?: string
  /**
   * Cap on combined stdout + stderr size in **bytes**. Backend default when
   * omitted (E2B / Web Worker: 1 MiB).
   */
  maxOutputBytes?: number
}

export interface ExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
  durationMs: number
}

export interface SandboxBackend {
  execute(code: string, options: ExecuteOptions): Promise<ExecuteResult>
  dispose?(): Promise<void>
}
