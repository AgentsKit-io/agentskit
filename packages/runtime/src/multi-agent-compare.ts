// compare topology — fan out to N agents, then select a result by a strategy
// (all / first-by-metric / eval / judge / manual-HITL).

import {
  resolveConcurrency,
  settleWithConcurrency,
  type AgentRunResult,
  type CompareConfig,
  type TopologyOutcome,
  type TopologyRunAgent,
} from './multi-agent'

export type CompareEvalFn<Ctx> = (
  results: AgentRunResult[],
  evalRef: string,
  ctx: Ctx,
) => Promise<number>

export type CompareJudgeFn<Ctx> = (
  results: AgentRunResult[],
  agentIds: string[],
  criteria: string,
  judgeAgent: string,
  ctx: Ctx,
) => Promise<number>

export type CompareHandlerOptions<Ctx> = {
  runAgent: TopologyRunAgent<Ctx>
  evaluator?: CompareEvalFn<Ctx>
  judger?: CompareJudgeFn<Ctx>
  concurrency?: number
}

type IndexedResult = { idx: number; agentId: string; result: AgentRunResult }

const collectFulfilled = (args: {
  settled: PromiseSettledResult<AgentRunResult>[]
  agents: readonly string[]
}): IndexedResult[] => {
  const { settled, agents } = args
  const results: IndexedResult[] = []
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]!
    if (s.status === 'fulfilled') results.push({ idx: i, agentId: agents[i]!, result: s.value })
  }
  return results
}

const failAllAgents = (): TopologyOutcome => ({
  kind: 'failed',
  error: { code: 'compare.all_agents_failed', message: 'all agents returned errors' },
})

const combineAll = (args: { results: IndexedResult[]; combine: 'concat' | 'merge' }): unknown => {
  const { results, combine } = args
  const outputs = results.map((r) => r.result.output)
  if (combine === 'concat') {
    return Array.isArray(outputs[0]) ? (outputs as unknown[][]).flat() : outputs
  }
  return Object.assign({}, ...outputs.map((o) => (typeof o === 'object' && o !== null ? o : {})))
}

const pickFirstByMetric = (args: {
  results: IndexedResult[]
  metric: 'fastest' | 'cheapest'
}): unknown => {
  const { results, metric } = args
  const field: 'latencyMs' | 'usd' = metric === 'fastest' ? 'latencyMs' : 'usd'
  const winner = results.reduce((best, cur) => {
    const b = best.result[field] ?? Infinity
    const c = cur.result[field] ?? Infinity
    return c < b ? cur : best
  })
  return winner.result.output
}

const failMissing = (mode: 'eval' | 'judge'): TopologyOutcome => ({
  kind: 'failed',
  error: {
    code: mode === 'eval' ? 'compare.evaluator_not_provided' : 'compare.judger_not_provided',
    message: `selection.mode=${mode} requires ${mode === 'eval' ? 'an evaluator' : 'a judger'} function injected via createCompareHandler options`,
  },
})

const failInvalidWinnerIdx = (mode: 'eval' | 'judge', winnerIdx: number): TopologyOutcome => ({
  kind: 'failed',
  error: {
    code: mode === 'eval' ? 'compare.eval_invalid_index' : 'compare.judge_invalid_index',
    message: `${mode} returned index ${winnerIdx} out of range`,
  },
})

export const createCompareHandler = <Ctx>(opts: CompareHandlerOptions<Ctx>) => {
  return async (node: CompareConfig, input: unknown, ctx: Ctx): Promise<TopologyOutcome> => {
    const nodeInput = node.input ?? (input as Record<string, unknown> | undefined)

    const settled = await settleWithConcurrency(
      node.agents,
      resolveConcurrency(opts.concurrency),
      (agentId) => opts.runAgent(agentId, nodeInput, ctx),
    )

    const results = collectFulfilled({ settled, agents: node.agents })
    if (results.length === 0) return failAllAgents()

    const sel = node.selection
    switch (sel.mode) {
      case 'manual':
        return { kind: 'paused', reason: 'hitl' }
      case 'all':
        return { kind: 'ok', value: combineAll({ results, combine: sel.combine }) }
      case 'first':
        return { kind: 'ok', value: pickFirstByMetric({ results, metric: sel.metric }) }
      case 'eval': {
        if (!opts.evaluator) return failMissing('eval')
        const winnerIdx = await opts.evaluator(results.map((r) => r.result), sel.evalRef, ctx)
        const winner = results[winnerIdx]
        if (!winner) return failInvalidWinnerIdx('eval', winnerIdx)
        return { kind: 'ok', value: winner.result.output }
      }
      case 'judge': {
        if (!opts.judger) return failMissing('judge')
        const winnerIdx = await opts.judger(
          results.map((r) => r.result),
          results.map((r) => r.agentId),
          sel.criteria,
          sel.judgeAgent,
          ctx,
        )
        const winner = results[winnerIdx]
        if (!winner) return failInvalidWinnerIdx('judge', winnerIdx)
        return { kind: 'ok', value: winner.result.output }
      }
      default: {
        const _exhaustive: never = sel
        return {
          kind: 'failed',
          error: {
            code: 'compare.unknown_mode',
            message: `unknown selection mode: ${(_exhaustive as { mode: string }).mode}`,
          },
        }
      }
    }
  }
}
