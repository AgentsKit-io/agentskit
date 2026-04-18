import type { ChatReturn } from '@agentskit/core'
import { forkSession, renameSession } from './sessions'
import { computeCost } from './extensibility/telemetry'

export type FeedbackKind = 'info' | 'warn' | 'error' | 'success'

export interface SlashCommandContext {
  chat: ChatReturn
  /** Short-form snapshot of the live runtime config. */
  runtime: {
    provider: string
    model?: string
    mode: string
    baseUrl?: string
    tools?: string
    skill?: string
    sessionId?: string
  }
  /** Mutators — each rebuilds the underlying adapter/tool chain. */
  setProvider: (value: string) => void
  setModel: (value: string | undefined) => void
  setApiKey: (value: string | undefined) => void
  setBaseUrl: (value: string | undefined) => void
  setTools: (value: string | undefined) => void
  setSkill: (value: string | undefined) => void
  /** Print a status line in the chat UI (non-streamed). */
  feedback: (message: string, kind?: FeedbackKind) => void
  /** Registered commands — `help` uses this to list them. */
  commands: SlashCommand[]
}

export interface SlashCommand {
  name: string
  description: string
  usage?: string
  aliases?: string[]
  run: (ctx: SlashCommandContext, argsText: string) => void | Promise<void>
}

/**
 * Parse a user-typed line as a slash command. Returns `null` when the
 * input is a regular chat message so callers can fall back to `chat.send`.
 */
export function parseSlashCommand(input: string): { name: string; args: string } | null {
  if (!input.startsWith('/')) return null
  const match = input.slice(1).match(/^(\S+)\s*([\s\S]*)$/)
  if (!match) return null
  return { name: match[1], args: match[2] ?? '' }
}

export function createSlashRegistry(commands: SlashCommand[]): Map<string, SlashCommand> {
  const map = new Map<string, SlashCommand>()
  for (const cmd of commands) {
    map.set(cmd.name, cmd)
    for (const alias of cmd.aliases ?? []) map.set(alias, cmd)
  }
  return map
}

/**
 * Built-in slash commands. Extend by composing your own array:
 *   `[...builtinSlashCommands, myCommand]`.
 * Commands registered later override earlier ones by name.
 */
export const builtinSlashCommands: SlashCommand[] = [
  {
    name: 'help',
    aliases: ['?'],
    description: 'List available slash commands.',
    run(ctx) {
      const seen = new Set<string>()
      const lines: string[] = []
      for (const cmd of ctx.commands) {
        if (seen.has(cmd.name)) continue
        seen.add(cmd.name)
        const suffix = cmd.usage ? `  (${cmd.usage})` : ''
        lines.push(`  /${cmd.name.padEnd(10)} ${cmd.description}${suffix}`)
      }
      ctx.feedback(`Slash commands:\n${lines.join('\n')}`, 'info')
    },
  },
  {
    name: 'model',
    description: 'Switch the active model.',
    usage: '/model <name>',
    run(ctx, args) {
      const value = args.trim()
      if (!value) {
        ctx.feedback(
          `Current model: ${ctx.runtime.model ?? 'unset'}. Usage: /model <name>`,
          'warn',
        )
        return
      }
      ctx.setModel(value)
      ctx.feedback(`Model → ${value}`, 'success')
    },
  },
  {
    name: 'provider',
    description: 'Switch the adapter provider.',
    usage: '/provider openai|anthropic|gemini|ollama|deepseek|grok|kimi|demo',
    run(ctx, args) {
      const value = args.trim()
      if (!value) {
        ctx.feedback(
          `Current provider: ${ctx.runtime.provider}. Usage: /provider <name>`,
          'warn',
        )
        return
      }
      ctx.setProvider(value)
      ctx.feedback(`Provider → ${value}`, 'success')
    },
  },
  {
    name: 'base-url',
    aliases: ['baseurl'],
    description: 'Override provider base URL.',
    usage: '/base-url <url|clear>',
    run(ctx, args) {
      const value = args.trim()
      if (!value || value === 'clear') {
        ctx.setBaseUrl(undefined)
        ctx.feedback('Base URL cleared.', 'success')
        return
      }
      ctx.setBaseUrl(value)
      ctx.feedback(`Base URL → ${value}`, 'success')
    },
  },
  {
    name: 'tools',
    description: 'Set active tools (comma-separated) or clear them.',
    usage: '/tools web_search,fetch_url | /tools clear',
    run(ctx, args) {
      const value = args.trim()
      if (!value || value === 'clear') {
        ctx.setTools(undefined)
        ctx.feedback('Tools reset to defaults.', 'success')
        return
      }
      ctx.setTools(value)
      ctx.feedback(`Tools → ${value}`, 'success')
    },
  },
  {
    name: 'skill',
    description: 'Set active skill(s) (comma-separated) or clear them.',
    usage: '/skill researcher,coder | /skill clear',
    run(ctx, args) {
      const value = args.trim()
      if (!value || value === 'clear') {
        ctx.setSkill(undefined)
        ctx.feedback('Skills cleared.', 'success')
        return
      }
      ctx.setSkill(value)
      ctx.feedback(`Skills → ${value}`, 'success')
    },
  },
  {
    name: 'clear',
    aliases: ['reset'],
    description: 'Clear the conversation history in this session.',
    async run(ctx) {
      await ctx.chat.clear()
      ctx.feedback('History cleared.', 'success')
    },
  },
  {
    name: 'usage',
    description: 'Show the cumulative token usage for this session.',
    run(ctx) {
      const usage = ctx.chat.usage
      if (!usage || usage.totalTokens === 0) {
        ctx.feedback('No usage reported yet for this session.', 'info')
        return
      }
      ctx.feedback(
        `Tokens — prompt=${usage.promptTokens}  completion=${usage.completionTokens}  total=${usage.totalTokens}`,
        'info',
      )
    },
  },
  {
    name: 'cost',
    description: 'Estimate the cost so far for the current model.',
    run(ctx) {
      const usage = ctx.chat.usage
      const model = ctx.runtime.model
      if (!usage || usage.totalTokens === 0) {
        ctx.feedback('No usage reported yet for this session.', 'info')
        return
      }
      const cost = computeCost(model, usage)
      if (!cost) {
        ctx.feedback(
          `No pricing registered for model "${model ?? 'unset'}". Register with registerPricing() or provide a known model name.`,
          'warn',
        )
        return
      }
      ctx.feedback(
        `$${cost.totalUsd.toFixed(4)} total (in=$${cost.inputUsd.toFixed(4)}  out=$${cost.outputUsd.toFixed(4)}  model=${cost.model})`,
        'info',
      )
    },
  },
  {
    name: 'rename',
    description: 'Attach a human-readable label to the current session.',
    usage: '/rename <label>',
    run(ctx, args) {
      const label = args.trim()
      const sessionId = ctx.runtime.sessionId
      if (!sessionId || sessionId === 'custom') {
        ctx.feedback('Rename is only available for managed sessions.', 'warn')
        return
      }
      if (!label) {
        ctx.feedback('Usage: /rename <label>', 'warn')
        return
      }
      try {
        renameSession(sessionId, label)
        ctx.feedback(`Session labeled "${label}".`, 'success')
      } catch (err) {
        ctx.feedback(`/rename failed: ${err instanceof Error ? err.message : String(err)}`, 'error')
      }
    },
  },
  {
    name: 'fork',
    description: 'Branch a copy of the current session. Does not switch to it.',
    run(ctx) {
      const sessionId = ctx.runtime.sessionId
      if (!sessionId || sessionId === 'custom') {
        ctx.feedback('Fork is only available for managed sessions.', 'warn')
        return
      }
      try {
        const result = forkSession(sessionId)
        ctx.feedback(
          `Forked into ${result.id}. Resume with:\n  agentskit chat --resume ${result.id}`,
          'success',
        )
      } catch (err) {
        ctx.feedback(`/fork failed: ${err instanceof Error ? err.message : String(err)}`, 'error')
      }
    },
  },
  {
    name: 'exit',
    aliases: ['quit', 'q'],
    description: 'Exit the chat.',
    run() {
      process.exit(0)
    },
  },
]
