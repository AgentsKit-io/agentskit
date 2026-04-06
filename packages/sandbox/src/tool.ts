import type { ToolDefinition } from '@agentskit/core'
import { createSandbox, type SandboxConfig } from './sandbox'

export function sandboxTool(config: SandboxConfig = {}): ToolDefinition {
  const sandbox = createSandbox(config)

  return {
    name: 'code_execution',
    description: 'Execute code in a secure sandbox. Supports JavaScript and Python. Returns stdout, stderr, and exit code.',
    tags: ['code', 'execution', 'sandbox'],
    category: 'execution',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to execute' },
        language: { type: 'string', enum: ['javascript', 'python'], description: 'Programming language (default: javascript)' },
      },
      required: ['code'],
    },
    init: async () => {
      // Pre-warm the sandbox on first tool use
      await sandbox.execute('', { timeout: 5000 }).catch(() => {})
    },
    dispose: async () => {
      await sandbox.dispose()
    },
    execute: async (args) => {
      const code = String(args.code ?? '')
      if (!code) return 'Error: code is required'

      const language = (args.language as 'javascript' | 'python') ?? config.language ?? 'javascript'

      const result = await sandbox.execute(code, { language })

      const parts: string[] = []
      if (result.stdout) parts.push(result.stdout)
      if (result.stderr) parts.push(`[stderr] ${result.stderr}`)
      parts.push(`[exit code: ${result.exitCode}]`)

      return parts.join('\n')
    },
  }
}
