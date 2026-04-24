import type { AdapterFactory, StreamChunk, ToolDefinition } from '@agentskit/core'

export type ToolCallEmit = {
  name: string
  args?: Record<string, unknown>
  result?: unknown
  durationMs?: number
}

export type Turn = {
  /** Text streamed as the assistant reply. */
  text: string
  /** Optional tool calls to emit before the text. The runtime executes each via
   *  the matching tool stub exposed by `toolsFor(turns)`. */
  toolCalls?: ToolCallEmit[]
  /** Optional reasoning stream emitted before tool calls / text. */
  reasoning?: string
}

export function createMockAdapter(turns: Turn[], cps = 80): AdapterFactory {
  let idx = 0
  return {
    createSource: () => ({
      stream: async function* (): AsyncIterableIterator<StreamChunk> {
        const turn = turns[idx % turns.length]
        idx += 1
        if (turn.reasoning) {
          for (const ch of turn.reasoning) {
            await sleep(1000 / cps)
            yield { type: 'reasoning', content: ch }
          }
        }
        if (turn.toolCalls) {
          for (const call of turn.toolCalls) {
            yield {
              type: 'tool_call',
              toolCall: {
                id: `call-${Math.random().toString(36).slice(2, 8)}`,
                name: call.name,
                args: JSON.stringify(call.args ?? {}),
              },
            }
          }
        }
        for (const ch of turn.text) {
          await sleep(1000 / cps)
          yield { type: 'text', content: ch }
        }
        yield { type: 'done' }
      },
      abort() {},
    }),
    capabilities: { streaming: true, tools: true },
  }
}

/**
 * Build a registry of tool stubs whose `execute()` resolves to the mocked
 * result declared for that tool name in `turns`. When the controller sees a
 * `tool_call` chunk from the mock adapter it looks up the name here, runs the
 * stub (with a simulated latency), and emits `tool_result`.
 */
export function toolsFor(turns: Turn[]): ToolDefinition[] {
  const byName = new Map<string, ToolCallEmit>()
  for (const t of turns) {
    for (const c of t.toolCalls ?? []) {
      if (!byName.has(c.name)) byName.set(c.name, c)
    }
  }
  return Array.from(byName.values()).map<ToolDefinition>((call) => ({
    name: call.name,
    description: `Mock ${call.name}`,
    schema: {},
    async execute() {
      if (call.durationMs) await sleep(call.durationMs)
      return JSON.stringify(call.result ?? { ok: true })
    },
  }))
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export function initialAssistant(content: string) {
  return {
    id: 'init',
    role: 'assistant' as const,
    content,
    status: 'complete' as const,
    createdAt: new Date(),
  }
}
