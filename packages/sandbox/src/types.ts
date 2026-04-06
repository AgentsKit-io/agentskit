export interface ExecuteOptions {
  language?: 'javascript' | 'python'
  timeout?: number
  network?: boolean
  memoryLimit?: string
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
