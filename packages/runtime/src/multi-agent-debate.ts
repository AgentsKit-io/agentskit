// debate topology — a multi-round adversarial loop between a proponent and an
// opponent, adjudicated by a judge. Optional early exit on agreement.

import type { DebateConfig, TopologyOutcome, TopologyRunAgent } from './multi-agent'

export type DebateHandlerOptions<Ctx> = {
  runAgent: TopologyRunAgent<Ctx>
}

type DebateMessage = { role: 'proponent' | 'opponent'; content: unknown }

export const createDebateHandler = <Ctx>(opts: DebateHandlerOptions<Ctx>) => {
  return async (node: DebateConfig, input: unknown, ctx: Ctx): Promise<TopologyOutcome> => {
    const topic = node.topic
    const transcript: DebateMessage[] = []

    for (let round = 0; round < node.rounds; round++) {
      const proResult = await opts.runAgent(
        node.proponent,
        { topic, format: node.format, round, transcript: [...transcript], role: 'proponent', input },
        ctx,
      )
      transcript.push({ role: 'proponent', content: proResult.output })

      const oppResult = await opts.runAgent(
        node.opponent,
        { topic, format: node.format, round, transcript: [...transcript], role: 'opponent', input },
        ctx,
      )
      transcript.push({ role: 'opponent', content: oppResult.output })

      if (node.earlyExit === 'on-agreement') {
        const proOutputs = transcript.filter((m) => m.role === 'proponent')
        const oppOutputs = transcript.filter((m) => m.role === 'opponent')
        const lastPro = proOutputs[proOutputs.length - 1]
        const lastOpp = oppOutputs[oppOutputs.length - 1]
        if (
          lastPro !== undefined &&
          lastOpp !== undefined &&
          JSON.stringify(lastPro.content) === JSON.stringify(lastOpp.content)
        ) {
          break
        }
      }
    }

    const judgeResult = await opts.runAgent(
      node.judge,
      { topic, format: node.format, transcript: [...transcript], role: 'judge', input },
      ctx,
    )

    return { kind: 'ok', value: { verdict: judgeResult.output, transcript } }
  }
}
