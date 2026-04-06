import type { AgentEvent, Observer } from '@agentskit/core'

export interface ConsoleLoggerConfig {
  format?: 'human' | 'json'
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 19)
}

function formatHuman(event: AgentEvent): string {
  switch (event.type) {
    case 'agent:step':
      return `[${timestamp()}] >> step ${event.step} (${event.action})`
    case 'llm:start':
      return `[${timestamp()}] -> llm:start (${event.messageCount} messages${event.model ? `, model=${event.model}` : ''})`
    case 'llm:first-token':
      return `[${timestamp()}]    llm:first-token (${event.latencyMs}ms)`
    case 'llm:end': {
      const preview = event.content.length > 80 ? event.content.slice(0, 80) + '...' : event.content
      const usage = event.usage ? ` tokens=${event.usage.promptTokens}+${event.usage.completionTokens}` : ''
      return `[${timestamp()}] <- llm:end (${event.durationMs}ms${usage}) "${preview}"`
    }
    case 'tool:start':
      return `[${timestamp()}] -> tool:start ${event.name} ${JSON.stringify(event.args)}`
    case 'tool:end': {
      const result = event.result.length > 80 ? event.result.slice(0, 80) + '...' : event.result
      return `[${timestamp()}] <- tool:end ${event.name} (${event.durationMs}ms) "${result}"`
    }
    case 'memory:load':
      return `[${timestamp()}]    memory:load (${event.messageCount} messages)`
    case 'memory:save':
      return `[${timestamp()}]    memory:save (${event.messageCount} messages)`
    case 'agent:delegate:start':
      return `[${timestamp()}] => delegate:start ${event.name} [depth=${event.depth}] "${event.task}"`
    case 'agent:delegate:end': {
      const delegateResult = event.result.length > 80 ? event.result.slice(0, 80) + '...' : event.result
      return `[${timestamp()}] <= delegate:end ${event.name} (${event.durationMs}ms) "${delegateResult}"`
    }
    case 'error':
      return `[${timestamp()}] !! error: ${event.error.message}`
  }
}

function formatJSON(event: AgentEvent): string {
  const base = { timestamp: new Date().toISOString(), type: event.type }
  switch (event.type) {
    case 'agent:step':
      return JSON.stringify({ ...base, step: event.step, action: event.action })
    case 'llm:start':
      return JSON.stringify({ ...base, messageCount: event.messageCount, model: event.model })
    case 'llm:first-token':
      return JSON.stringify({ ...base, latencyMs: event.latencyMs })
    case 'llm:end':
      return JSON.stringify({ ...base, durationMs: event.durationMs, usage: event.usage, contentLength: event.content.length })
    case 'tool:start':
      return JSON.stringify({ ...base, name: event.name, args: event.args })
    case 'tool:end':
      return JSON.stringify({ ...base, name: event.name, durationMs: event.durationMs, resultLength: event.result.length })
    case 'memory:load':
      return JSON.stringify({ ...base, messageCount: event.messageCount })
    case 'memory:save':
      return JSON.stringify({ ...base, messageCount: event.messageCount })
    case 'agent:delegate:start':
      return JSON.stringify({ ...base, name: event.name, task: event.task, depth: event.depth })
    case 'agent:delegate:end':
      return JSON.stringify({ ...base, name: event.name, durationMs: event.durationMs, resultLength: event.result.length, depth: event.depth })
    case 'error':
      return JSON.stringify({ ...base, error: event.error.message })
  }
}

export function consoleLogger(config: ConsoleLoggerConfig = {}): Observer {
  const { format = 'human' } = config
  const formatter = format === 'json' ? formatJSON : formatHuman

  return {
    name: 'console-logger',
    on(event: AgentEvent) {
      process.stdout.write(formatter(event) + '\n')
    },
  }
}
