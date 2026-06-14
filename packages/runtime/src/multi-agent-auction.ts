// auction topology — N bidders run concurrently; the best bid by a criterion
// (lowest-cost / highest-confidence / fastest / custom) wins, subject to an
// optional reserve price, per-bid timeout, and fallback agent.

import {
  resolveConcurrency,
  settleWithConcurrency,
  type AgentRunResult,
  type AuctionConfig,
  type TopologyOutcome,
  type TopologyRunAgent,
} from './multi-agent'

export type AuctionScorerFn = (bid: AgentRunResult, agentId: string) => number

export type AuctionHandlerOptions<Ctx> = {
  runAgent: TopologyRunAgent<Ctx>
  customScorer?: AuctionScorerFn
  concurrency?: number
}

type Bid = { agentId: string; result: AgentRunResult; score: number }

const scoreBid = (
  result: AgentRunResult,
  agentId: string,
  criteria: AuctionConfig['bidCriteria'],
  customScorer?: AuctionScorerFn,
): number => {
  switch (criteria) {
    case 'lowest-cost':
      return -(result.usd ?? Infinity)
    case 'highest-confidence': {
      const conf = typeof result.output === 'number' ? result.output : Number(result.output)
      return isNaN(conf) ? -Infinity : conf
    }
    case 'fastest':
      return -(result.latencyMs ?? Infinity)
    case 'custom':
      return customScorer ? customScorer(result, agentId) : -Infinity
    default: {
      const _exhaustive: never = criteria
      void _exhaustive
      return -Infinity
    }
  }
}

const passesReservePrice = (
  result: AgentRunResult,
  reservePrice: AuctionConfig['reservePrice'],
): boolean => {
  if (!reservePrice) return true
  if (reservePrice.usd !== undefined && (result.usd ?? 0) > reservePrice.usd) return false
  if (reservePrice.tokens !== undefined && (result.tokens ?? 0) > reservePrice.tokens) return false
  return true
}

export const createAuctionHandler = <Ctx>(opts: AuctionHandlerOptions<Ctx>) => {
  return async (node: AuctionConfig, input: unknown, ctx: Ctx): Promise<TopologyOutcome> => {
    const task = node.task ?? input

    const runWithTimeout = (agentId: string): Promise<AgentRunResult> => {
      const p = opts.runAgent(agentId, task, ctx)
      if (!node.timeout) return p
      const ms = node.timeout.ms
      return Promise.race([
        p,
        new Promise<AgentRunResult>((_, reject) =>
          setTimeout(() => reject(new Error(`auction.timeout:${agentId}`)), ms),
        ),
      ])
    }

    const settled = await settleWithConcurrency(
      node.bidders,
      resolveConcurrency(opts.concurrency),
      (id) => runWithTimeout(id),
    )

    const bids: Bid[] = []
    for (let i = 0; i < settled.length; i++) {
      const s = settled[i]!
      if (s.status === 'fulfilled') {
        const agentId = node.bidders[i]!
        const result = s.value
        if (!passesReservePrice(result, node.reservePrice)) continue
        bids.push({ agentId, result, score: scoreBid(result, agentId, node.bidCriteria, opts.customScorer) })
      }
    }

    if (bids.length === 0) {
      if (node.fallback) {
        const fallbackResult = await opts.runAgent(node.fallback, task, ctx)
        return {
          kind: 'ok',
          value: { winner: node.fallback, output: fallbackResult.output, usedFallback: true },
        }
      }
      return {
        kind: 'failed',
        error: { code: 'auction.no_winner', message: 'no bidder met reserve price and no fallback configured' },
      }
    }

    const winner = bids.reduce((best, cur) => (cur.score > best.score ? cur : best))
    return {
      kind: 'ok',
      value: { winner: winner.agentId, output: winner.result.output, score: winner.score, usedFallback: false },
    }
  }
}
