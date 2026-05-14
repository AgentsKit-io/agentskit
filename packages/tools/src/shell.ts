import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ToolDefinition } from '@agentskit/core'

const execFileAsync = promisify(execFile)

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
  /** Cap on combined stdout/stderr per invocation. Default 1 MB. */
  maxOutput?: number
  /** Working directory passed to the child process. */
  cwd?: string
  /**
   * Environment for the child. Defaults to an empty object so secrets
   * in the parent process environment do not leak into the executed
   * command unless explicitly forwarded.
   */
  env?: NodeJS.ProcessEnv
}

// Shell metacharacters that enable command chaining, substitution, or
// redirection. Reject any argument containing one — even an allowlisted
// executable should not be invoked with these tokens because they
// indicate the caller intended shell expansion, which is unavailable
// under execFile.
const SHELL_METACHARS = /[;&|`$<>(){}[\]!*?#~\\'"\n\r]/

function parseCommand(input: string): { argv: string[]; reason?: string } {
  const trimmed = input.trim()
  if (!trimmed) return { argv: [], reason: 'command is empty' }
  if (SHELL_METACHARS.test(trimmed)) {
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
    env = {},
  } = config

  if (!allowed && !allowAny) {
    throw new Error(
      'shell(): refusing to register with no `allowed` allowlist. Pass `allowed: [...]` or, only in trusted/sandboxed contexts, `allowAny: true`.',
    )
  }

  return {
    name: 'shell',
    description: 'Execute an executable directly (no shell). Returns stdout, stderr, and exit code. Shell metacharacters are rejected.',
    tags: ['shell', 'command'],
    category: 'execution',
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The executable plus arguments, whitespace-separated. No shell metacharacters.' },
      },
      required: ['command'],
    },
    execute: async (args) => {
      const raw = String(args.command ?? '')
      const { argv, reason } = parseCommand(raw)
      if (reason) return `Error: ${reason}`
      if (argv.length === 0) return 'Error: command is required'

      const [bin, ...rest] = argv as [string, ...string[]]
      if (allowed && !allowed.includes(bin)) {
        return `Error: command "${bin}" is not allowed. Allowed: ${allowed.join(', ')}`
      }

      try {
        const { stdout, stderr } = await execFileAsync(bin, rest, {
          timeout,
          maxBuffer: maxOutput,
          encoding: 'utf8',
          cwd,
          env,
          shell: false,
          windowsHide: true,
        })
        return `${stdout}${stderr ? `\n[stderr] ${stderr}` : ''}\n[exit code: 0]`
      } catch (err: unknown) {
        const error = err as {
          code?: number | string
          status?: number
          stdout?: string
          stderr?: string
          killed?: boolean
          signal?: string
        }
        const stdout = error.stdout ?? ''
        const stderr = error.stderr ? `[stderr] ${error.stderr}` : ''
        const output = [stdout, stderr].filter(Boolean).join('\n')

        if (error.killed || error.signal === 'SIGTERM') {
          return `${output}\n[killed: command timed out after ${timeout}ms]`
        }

        const exitCode = typeof error.code === 'number' ? error.code : error.status ?? -1
        return `${output}\n[exit code: ${exitCode}]`
      }
    },
  }
}
