import type { ToolDefinition } from '@agentskit/core'
import { ConfigError, ErrorCodes, SandboxError } from '@agentskit/core'
import { createSandbox, type SandboxConfig } from './sandbox'

const WARMUP_TIMEOUT_MS = 5_000
const SUPPORTED_LANGUAGES = new Set(['javascript', 'python'])

function isConfigOrPeerError(err: unknown): boolean {
  if (err instanceof ConfigError) return true
  if (err instanceof SandboxError) {
    return (
      err.code === ErrorCodes.AK_CONFIG_INVALID ||
      err.code === ErrorCodes.AK_SANDBOX_PEER_MISSING
    )
  }
  return false
}

/**
 * Ready-made `code_execution` tool backed by {@link createSandbox}.
 *
 * `init` pre-warms the backend. Configuration and missing-peer errors always
 * rethrow; only operational warmup failures (e.g. transient empty-code run
 * results) are swallowed so tool registration is not blocked by a no-op probe.
 */
export function sandboxTool(config: SandboxConfig = {}): ToolDefinition {
  const sandbox = createSandbox(config)

  return {
    name: 'code_execution',
    description:
      'Execute code in a secure sandbox. Supports JavaScript and Python. Returns stdout, stderr, and exit code.',
    tags: ['code', 'execution', 'sandbox'],
    category: 'execution',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'The code to execute' },
        language: {
          type: 'string',
          enum: ['javascript', 'python'],
          description: 'Programming language (default: javascript)',
        },
      },
      required: ['code'],
    },
    init: async () => {
      try {
        await sandbox.execute('', { timeout: WARMUP_TIMEOUT_MS })
      } catch (err) {
        if (isConfigOrPeerError(err)) throw err
        // Operational failures on empty warmup code are non-fatal.
      }
    },
    dispose: async () => {
      await sandbox.dispose()
    },
    execute: async (args) => {
      const code = String(args.code ?? '')
      if (!code) return 'Error: code is required'

      const rawLanguage = args.language ?? config.language ?? 'javascript'
      if (typeof rawLanguage !== 'string' || !SUPPORTED_LANGUAGES.has(rawLanguage)) {
        throw new ConfigError({
          code: ErrorCodes.AK_CONFIG_INVALID,
          message: `language must be "javascript" or "python" (received ${JSON.stringify(rawLanguage)})`,
          hint: 'Pass language: "javascript" | "python".',
        })
      }
      const language = rawLanguage as 'javascript' | 'python'

      const result = await sandbox.execute(code, { language })

      const parts: string[] = []
      if (result.stdout) parts.push(result.stdout)
      if (result.stderr) parts.push(`[stderr] ${result.stderr}`)
      parts.push(`[exit code: ${result.exitCode}]`)

      return parts.join('\n')
    },
  }
}
