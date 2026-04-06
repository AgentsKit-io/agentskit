import { execSync } from 'node:child_process'
import type { ToolDefinition } from '@agentskit/core'

export interface ShellConfig {
  timeout?: number
  allowed?: string[]
  maxOutput?: number
}

// NOTE: This tool intentionally uses shell execution (execSync with shell: true)
// because the purpose IS to run arbitrary shell commands from an LLM agent.
// Security is enforced via the `allowed` list and `timeout` configuration.

export function shell(config: ShellConfig = {}): ToolDefinition {
  const { timeout = 30_000, allowed, maxOutput = 1_000_000 } = config

  return {
    name: 'shell',
    description: 'Execute a shell command. Returns stdout, stderr, and exit code.',
    tags: ['shell', 'command'],
    category: 'execution',
    schema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
      },
      required: ['command'],
    },
    execute: async (args) => {
      const command = String(args.command ?? '')
      if (!command) return 'Error: command is required'

      if (allowed) {
        const firstWord = command.trim().split(/\s+/)[0]
        if (!allowed.includes(firstWord)) {
          return `Error: command "${firstWord}" is not allowed. Allowed: ${allowed.join(', ')}`
        }
      }

      try {
        const output = execSync(command, {
          timeout,
          maxBuffer: maxOutput,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        return `${output}\n[exit code: 0]`
      } catch (err: unknown) {
        const error = err as { status?: number; stdout?: string; stderr?: string; killed?: boolean; signal?: string }
        const stdout = error.stdout ?? ''
        const stderr = error.stderr ? `[stderr] ${error.stderr}` : ''
        const output = [stdout, stderr].filter(Boolean).join('\n')

        if (error.killed || error.signal === 'SIGTERM') {
          return `${output}\n[killed: command timed out after ${timeout}ms]`
        }

        const exitCode = error.status ?? -1
        return `${output}\n[exit code: ${exitCode}]`
      }
    },
  }
}
