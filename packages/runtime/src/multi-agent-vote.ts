// vote topology — fan out to N agents, then tally ballots
// (majority / weighted / unanimous / quorum) with a tie-break policy.

import {
  resolveConcurrency,
  settleWithConcurrency,
  type AgentRunResult,
  type TopologyOutcome,
  type TopologyRunAgent,
  type VoteConfig,
} from './multi-agent'

export type VoteJudgeFn<Ctx> = (
  outputs: unknown[],
  agentIds: string[],
  judgeAgent: string,
  ctx: Ctx,
) => Promise<unknown>

export type VoteHandlerOptions<Ctx> = {
  runAgent: TopologyRunAgent<Ctx>
  judger?: VoteJudgeFn<Ctx>
  concurrency?: number
}

type VoteRecord = { agentId: string; output: unknown }

const collectVotes = (args: {
  settled: PromiseSettledResult<AgentRunResult>[]
  agents: readonly string[]
}): VoteRecord[] => {
  const { settled, agents } = args
  const votes: VoteRecord[] = []
  for (let i = 0; i < settled.length; i++) {
    const s = settled[i]!
    if (s.status === 'fulfilled') votes.push({ agentId: agents[i]!, output: s.value.output })
  }
  return votes
}

const failAllVotes = (): TopologyOutcome => ({
  kind: 'failed',
  error: { code: 'vote.all_agents_failed', message: 'all agents failed' },
})

const resolveWinnerKey = (rawKey: string): TopologyOutcome => ({ kind: 'ok', value: JSON.parse(rawKey) })

const handleTieBreak = async <Ctx>(args: {
  node: VoteConfig
  outputs: unknown[]
  agentIds: string[]
  ctx: Ctx
  judger: VoteJudgeFn<Ctx> | undefined
}): Promise<TopologyOutcome> => {
  const { node, outputs, agentIds, ctx, judger } = args
  switch (node.onTie) {
    case 'human':
      return { kind: 'paused', reason: 'hitl' }
    case 'first':
      return { kind: 'ok', value: outputs[0] }
    case 'judge': {
      if (!judger || !node.judgeAgent) return { kind: 'paused', reason: 'hitl' }
      const judged = await judger(outputs, agentIds, node.judgeAgent, ctx)
      return { kind: 'ok', value: judged }
    }
    default: {
      const _exhaustive: never = node.onTie
      void _exhaustive
      return { kind: 'paused', reason: 'hitl' }
    }
  }
}

const tally = (
  outputs: unknown[],
  agentIds: string[],
  weights: Record<string, number> | undefined,
): Map<string, number> => {
  const scores = new Map<string, number>()
  for (let i = 0; i < outputs.length; i++) {
    const key = JSON.stringify(outputs[i])
    let w = 1
    if (weights) {
      const maybe = weights[agentIds[i]!]
      if (typeof maybe === 'number' && Number.isFinite(maybe)) w = maybe
    }
    scores.set(key, (scores.get(key) ?? 0) + w)
  }
  return scores
}

const plurality = (scores: Map<string, number>): { winner: string; topScore: number; isTie: boolean } => {
  let topScore = -Infinity
  let winner = ''
  for (const [k, s] of scores) {
    if (s > topScore) {
      topScore = s
      winner = k
    }
  }
  const tiers = [...scores.values()].filter((s) => s === topScore)
  return { winner, topScore, isTie: tiers.length > 1 }
}

export const createVoteHandler = <Ctx>(opts: VoteHandlerOptions<Ctx>) => {
  return async (node: VoteConfig, input: unknown, ctx: Ctx): Promise<TopologyOutcome> => {
    const nodeInput = node.input ?? (input as Record<string, unknown> | undefined)

    const settled = await settleWithConcurrency(
      node.agents,
      resolveConcurrency(opts.concurrency),
      (agentId) => opts.runAgent(agentId, nodeInput, ctx),
    )

    const votes = collectVotes({ settled, agents: node.agents })
    if (votes.length === 0) return failAllVotes()

    const outputs = votes.map((v) => v.output)
    const agentIds = votes.map((v) => v.agentId)
    const ballot = node.ballot
    const handleTie = (): Promise<TopologyOutcome> =>
      handleTieBreak({ node, outputs, agentIds, ctx, judger: opts.judger })

    switch (ballot.mode) {
      case 'majority': {
        const scores = tally(outputs, agentIds, undefined)
        const total = votes.length
        const { winner, topScore, isTie } = plurality(scores)
        if (isTie || topScore <= total / 2) return handleTie()
        return resolveWinnerKey(winner)
      }
      case 'weighted': {
        const scores = tally(outputs, agentIds, ballot.weights)
        const { winner, isTie } = plurality(scores)
        if (isTie) return handleTie()
        return resolveWinnerKey(winner)
      }
      case 'unanimous': {
        const first = JSON.stringify(outputs[0])
        const allSame = outputs.every((o) => JSON.stringify(o) === first)
        if (!allSame) return handleTie()
        return { kind: 'ok', value: outputs[0] }
      }
      case 'quorum': {
        const scores = tally(outputs, agentIds, undefined)
        const total = votes.length
        const { winner, topScore, isTie } = plurality(scores)
        if (isTie || topScore / total < ballot.threshold) return handleTie()
        return resolveWinnerKey(winner)
      }
      default: {
        const _exhaustive: never = ballot
        void _exhaustive
        return { kind: 'failed', error: { code: 'vote.unknown_ballot_mode', message: 'unknown ballot mode' } }
      }
    }
  }
}
