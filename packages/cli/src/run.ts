import { createRuntime } from '@agentskit/runtime'
import type { AgentEvent, Observer } from '@agentskit/core'
import { resolveChatProvider } from './providers'
import { resolveTools, resolveSkill, resolveSkills, resolveMemory } from './resolve'

export interface RunCommandOptions {
  provider: string
  model?: string
  apiKey?: string
  baseUrl?: string
  task?: string
  skill?: string
  skills?: string
  tools?: string
  memory?: string
  memoryBackend?: string
  systemPrompt?: string
  maxSteps?: string
  verbose?: boolean
  pretty?: boolean
}

function formatEvent(event: AgentEvent): string {
  switch (event.type) {
    case 'agent:step':
      return `[step ${event.step}] ${event.action}`
    case 'llm:start':
      return `[llm] start (${event.messageCount} messages)`
    case 'llm:end': {
      const preview = event.content.length > 100 ? event.content.slice(0, 100) + '...' : event.content
      return `[llm] done (${event.durationMs}ms) "${preview}"`
    }
    case 'tool:start':
      return `[tool] ${event.name} ${JSON.stringify(event.args)}`
    case 'tool:end':
      return `[tool] ${event.name} done (${event.durationMs}ms)`
    case 'error':
      return `[error] ${event.error.message}`
    default:
      return `[${event.type}]`
  }
}

export async function runAgent(task: string, options: RunCommandOptions): Promise<void> {
  if (options.skill && options.skills) {
    process.stderr.write('Error: --skill and --skills are mutually exclusive. Use one or the other.\n')
    process.exit(1)
  }

  const { adapter } = resolveChatProvider({
    provider: options.provider,
    model: options.model,
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  })

  const tools = resolveTools(options.tools)
  const skill = options.skills
    ? resolveSkills(options.skills)
    : resolveSkill(options.skill)
  const memory = options.memory
    ? resolveMemory(options.memoryBackend, options.memory)
    : undefined

  const observers: Observer[] = []
  if (options.verbose) {
    observers.push({
      name: 'cli-verbose',
      on(event: AgentEvent) {
        process.stderr.write(formatEvent(event) + '\n')
      },
    })
  }

  const runtime = createRuntime({
    adapter,
    tools,
    memory,
    systemPrompt: options.systemPrompt,
    maxSteps: options.maxSteps ? parseInt(options.maxSteps, 10) : undefined,
    observers,
  })

  const result = await runtime.run(task, {
    skill: skill ?? undefined,
  })

  process.stdout.write(result.content + '\n')
}
