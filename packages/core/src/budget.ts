import type { Message } from './types/message'
import type { TokenCounter } from './types/token-counter'
import type { ToolDefinition } from './types/tool'

export type BudgetStrategy = 'drop-oldest' | 'sliding-window' | 'summarize'

export interface CompileBudgetInput {
  /** Hard upper bound (model context limit - reserveForOutput). */
  budget: number
  messages: Message[]
  systemPrompt?: string
  tools?: ToolDefinition[]
  /** Token counter. Defaults to `approximateCounter` (chars/4 heuristic). */
  counter?: TokenCounter
  /** Trimming strategy. Default 'drop-oldest'. */
  strategy?: BudgetStrategy
  /** Required when strategy === 'summarize'. */
  summarizer?: (dropped: Message[]) => Message | Promise<Message>
  /** Tokens reserved for the model's output. Subtracted from budget. */
  reserveForOutput?: number
  /**
   * Minimum number of recent messages to keep regardless of strategy.
   * Protects against dropping the turn that actually matters. Default 1.
   */
  keepRecent?: number
}

export interface CompileBudgetResult {
  messages: Message[]
  systemPrompt?: string
  tokens: {
    system: number
    messages: number
    tools: number
    total: number
    budget: number
  }
  dropped: Message[]
  fits: boolean
  strategy: BudgetStrategy
}

/**
 * Zero-dependency approximate token counter. Rule of thumb: ~4 chars
 * per token. Good enough for budget planning; swap for a real
 * tokenizer (tiktoken etc.) via the `counter` option in prod.
 */
export const approximateCounter: TokenCounter = {
  name: 'approximate',
  count(messages) {
    let total = 0
    for (const m of messages) {
      total += Math.ceil(((m.role?.length ?? 0) + (m.content?.length ?? 0)) / 4) + 2
    }
    return total
  },
  countDetailed(messages) {
    const perMessage = messages.map(m => Math.ceil(((m.role?.length ?? 0) + (m.content?.length ?? 0)) / 4) + 2)
    return { total: perMessage.reduce((a, b) => a + b, 0), perMessage }
  },
}

function countTools(tools: ToolDefinition[] | undefined, counter: TokenCounter): number | Promise<number> {
  if (!tools || tools.length === 0) return 0
  return counter.count(
    tools.map(t => ({ role: 'system' as const, content: `${t.name}:${t.description ?? ''}:${JSON.stringify(t.schema ?? {})}` })),
  )
}

async function toNumber(v: number | Promise<number>): Promise<number> {
  return typeof v === 'number' ? v : await v
}

/**
 * Take a declared `budget` and a set of messages/system/tools, then
 * return a trimmed request guaranteed to fit under `budget`. Three
 * strategies:
 *  - 'drop-oldest': remove oldest messages until it fits
 *  - 'sliding-window': backwards-compatible alias of 'drop-oldest'
 *  - 'summarize': fold dropped messages into a single summary message
 */
export async function compileBudget(input: CompileBudgetInput): Promise<CompileBudgetResult> {
  const counter = input.counter ?? approximateCounter
  const strategy = input.strategy ?? 'drop-oldest'
  const keepRecent = Math.max(1, input.keepRecent ?? 1)
  const reserved = input.reserveForOutput ?? 0
  const effectiveBudget = input.budget - reserved

  if (effectiveBudget <= 0) {
    throw new Error(`Budget must exceed reserveForOutput (${input.budget} ≤ ${reserved})`)
  }

  const systemMsg: Message | undefined = input.systemPrompt
    ? {
        id: '__system',
        role: 'system',
        content: input.systemPrompt,
        status: 'complete',
        createdAt: new Date(0),
      }
    : undefined

  const systemTokens = systemMsg ? await toNumber(counter.count([systemMsg])) : 0
  const toolTokens = await toNumber(countTools(input.tools, counter))
  const floor = systemTokens + toolTokens

  if (floor > effectiveBudget) {
    throw new Error(
      `System prompt + tools (${floor} tokens) exceed budget (${effectiveBudget}). Shrink system prompt or raise budget.`,
    )
  }

  const working = [...input.messages]
  const dropped: Message[] = []

  const messageTokens = async (msgs: Message[]): Promise<number> => toNumber(counter.count(msgs))

  let total = floor + (await messageTokens(working))

  if (strategy === 'sliding-window') {
    while (working.length > keepRecent && total > effectiveBudget) {
      dropped.push(working.shift()!)
      total = floor + (await messageTokens(working))
    }
  } else if (strategy === 'drop-oldest') {
    while (working.length > keepRecent && total > effectiveBudget) {
      dropped.push(working.shift()!)
      total = floor + (await messageTokens(working))
    }
  } else if (strategy === 'summarize') {
    if (!input.summarizer) {
      throw new Error(`strategy='summarize' requires a summarizer function`)
    }
    while (working.length > keepRecent && total > effectiveBudget) {
      dropped.push(working.shift()!)
      total = floor + (await messageTokens(working))
    }
    if (dropped.length > 0) {
      const summary = await input.summarizer(dropped)
      working.unshift(summary)
      total = floor + (await messageTokens(working))
    }
  }

  return {
    messages: working,
    systemPrompt: input.systemPrompt,
    tokens: {
      system: systemTokens,
      messages: total - floor,
      tools: toolTokens,
      total,
      budget: effectiveBudget,
    },
    dropped,
    fits: total <= effectiveBudget,
    strategy,
  }
}
