import { ConfigError, ErrorCodes, type ToolDefinition } from '@agentskit/core'
import { isWindows } from '@agentskit/cross-platform/pure'

export interface ShellConfig {
  /** Per-command timeout in ms. Default 30s. */
  timeout?: number
  /**
   * Allowlist of permitted executables. **Required by default** —
   * leave unset only when explicitly opting into the open mode via
   * `allowAny:true`. Each entry is matched against the command's
   * first token (the executable name).
   */
  allowed?: string[]
  /**
   * Opt out of the allowlist requirement. When true, any executable is
   * permitted — use only for trusted, sandbox-wrapped contexts. Off by
   * default so a misconfigured agent cannot run arbitrary binaries.
   */
  allowAny?: boolean
  /** Cap on stdout and on stderr per invocation. Default 1 MB. */
  maxOutput?: number
  /** Working directory passed to the child process. */
  cwd?: string
  /**
   * Environment for the child. Defaults to `safeEnv()` from
   * `@agentskit/cross-platform`: only the system variables a process needs
   * to start (`PATH`, `SystemRoot`, `TEMP`…), so secrets in the parent
   * environment do not leak into the executed command unless forwarded.
   */
  env?: NodeJS.ProcessEnv
}

// Shell metacharacters that enable command chaining, substitution, or
// redirection. Reject any argument containing one — even an allowlisted
// executable should not be invoked with these tokens because they
// indicate the caller intended shell expansion, which is unavailable
// without a shell. `\\` is the path separator on Windows, so it is only
// rejected on POSIX, where it can only mean an escape.
const SHELL_METACHARS = /[;&|`$<>(){}[\]!*?#~\\'"\n\r]/
const WINDOWS_SHELL_METACHARS = /[;&|`$<>(){}[\]!*?#~'"\n\r%^]/

function parseCommand(input: string, windows: boolean): { argv: string[]; reason?: string } {
  const trimmed = input.trim()
  if (!trimmed) return { argv: [], reason: 'command is empty' }
  if ((windows ? WINDOWS_SHELL_METACHARS : SHELL_METACHARS).test(trimmed)) {
    return { argv: [], reason: 'command contains shell metacharacters; shell expansion is not supported' }
  }
  // Whitespace-separated tokens. No quoting support by design — if you
  // need quoted args, build the array yourself in a custom tool.
  const argv = trimmed.split(/\s+/)
  return { argv }
}

export function shell(config: ShellConfig = {}): ToolDefinition {
  const {
    timeout = 30_000,
    allowed,
    allowAny = false,
    maxOutput = 1_000_000,
    cwd,
    env,
  } = config

  if (!allowed && !allowAny) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: 'shell(): refusing to register with no `allowed` allowlist.',
      hint: 'Pass `allowed: [...]` or, only in trusted/sandboxed contexts, `allowAny: true`.',
    })
  }

  return {
    name: 'shell',
    description: 'Execute an executable directly (no shell). Returns stdout, stderr, and exit code. Shell metacharacters are rejected.',
    tags: ['shell', 'command'],
    category: 'execution',
    requiresConfirmation: true,
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The executable plus arguments, whitespace-separated. No shell metacharacters.' },
      },
      required: ['command'],
    },
    execute: async (args) => {
      const raw = String(args.command ?? '')
      const { argv, reason } = parseCommand(raw, isWindows)
      if (reason) return `Error: ${reason}`
      if (argv.length === 0) return 'Error: command is required'

      const [bin, ...rest] = argv as [string, ...string[]]
      if (allowed && !allowed.includes(bin)) {
        return `Error: command "${bin}" is not allowed. Allowed: ${allowed.join(', ')}`
      }

      // Loaded on first use so importing @agentskit/tools stays free of process APIs.
      const { runCommand, safeEnv } = await import('@agentskit/cross-platform')
      try {
        // No shell on any OS; .cmd shims on Windows are resolved and escaped by the library,
        // and a timeout kills the whole process tree.
        const result = await runCommand(bin, rest, {
          timeoutMs: timeout,
          maxOutputBytes: maxOutput,
          cwd,
          env: env ?? safeEnv(),
        })
        const stderr = result.stderr ? `[stderr] ${result.stderr}` : ''
        const output = [result.stdout, stderr].filter(Boolean).join('\n')
        if (result.timedOut) return `${output}\n[killed: command timed out after ${timeout}ms]`
        if (result.truncated) return `${output}\n[killed: output exceeded ${maxOutput} bytes]`
        return `${output}\n[exit code: ${result.code ?? -1}]`
      } catch (err: unknown) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`
      }
    },
  }
}
