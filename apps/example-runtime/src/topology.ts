/**
 * topology.ts — supervisor + workers + swarm + blackboard.
 *
 * Run:  pnpm --filter @agentskit/example-runtime dev:topology
 *
 * Three multi-agent shapes, each driven by mock AgentHandles so the
 * example runs without API keys. Same topology factories accept any
 * runtime — wrap createRuntime({ adapter, ... }) handles for the real
 * thing.
 */

import { blackboard, supervisor, swarm } from '@agentskit/runtime'
import type { AgentHandle } from '@agentskit/runtime'

function mock(name: string, reply: (task: string) => string): AgentHandle {
  return {
    name,
    async run(task) {
      await new Promise(r => setTimeout(r, 50))
      return reply(task)
    },
  }
}

// --- supervisor: planner delegates to workers, then synthesises ----
const supervisorAgent = supervisor({
  supervisor: mock('lead', t => `Synthesised answer from worker outputs:\n${t}`),
  workers: [
    mock('research', t => `Research note: ${t.slice(0, 40)}…`),
    mock('write',    t => `Drafted summary for: ${t.slice(0, 40)}…`),
  ],
  maxRounds: 1,
  onEvent: e => process.stderr.write(`  [supervisor:${e.phase}] ${e.agent ?? '-'}\n`),
})

process.stderr.write('▸ supervisor topology\n')
const supRes = await supervisorAgent.run('Quantum computing in 100 words')
process.stdout.write(`\n${supRes}\n`)

// --- swarm: every member runs in parallel, merger picks output -----
const swarmAgent = swarm({
  members: [
    mock('claude', () => 'Long thoughtful answer with three points.'),
    mock('gpt',    () => 'Short answer.'),
    mock('local',  () => 'Medium-length local answer.'),
  ],
  merge: results => {
    // Take the longest response.
    return results.reduce((best, r) => (r.output.length > best.length ? r.output : best), '')
  },
  onEvent: e => process.stderr.write(`  [swarm:${e.phase}] ${e.agent ?? '-'}\n`),
})

process.stderr.write('\n▸ swarm topology\n')
const swarmRes = await swarmAgent.run('What is quantum computing?')
process.stdout.write(`\n${swarmRes}\n`)

// --- blackboard: agents iterate on a shared scratchpad -------------
const blackboardAgent = blackboard({
  agents: [
    mock('outline', () => '# Outline\n- intro\n- mechanics\n- applications'),
    mock('drafter', t => t.includes('mechanics') ? '## Mechanics\nQubits use superposition…' : 'pending'),
    mock('editor',  () => 'Editor pass: tightened mechanics paragraph.'),
  ],
  maxIterations: 2,
  onEvent: e => process.stderr.write(`  [blackboard:${e.phase}] ${e.agent ?? '-'}\n`),
})

process.stderr.write('\n▸ blackboard topology\n')
const bbRes = await blackboardAgent.run('Write a blog post about quantum computing')
process.stdout.write(`\n${bbRes}\n`)
