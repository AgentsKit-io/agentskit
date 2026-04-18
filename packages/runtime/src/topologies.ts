/**
 * Ready-made multi-agent topologies. Each builder takes a set of
 * `AgentHandle`s + config and returns a single `AgentHandle` that
 * presents the ensemble as a normal agent to the rest of the system.
 *
 * An `AgentHandle` is intentionally minimal — `name` + `run(task,
 * context?) => Promise<string>` — so any runtime (our own
 * `createRuntime`, a LangChain Runnable, a bare HTTP endpoint) can
 * participate without coupling.
 */

export interface AgentHandle<TContext = unknown> {
  name: string
  run: (task: string, context?: TContext) => Promise<string>
}

export interface TopologyLogEvent {
  topology: string
  phase: 'dispatch' | 'agent:start' | 'agent:end' | 'merge' | 'done'
  agent?: string
  task?: string
  result?: string
  iteration?: number
}

export type TopologyObserver = (event: TopologyLogEvent) => void

// ---------------------------------------------------------------------------
// Supervisor: one planner agent delegates to workers, then synthesizes.
// ---------------------------------------------------------------------------

export interface SupervisorConfig<TContext = unknown> {
  supervisor: AgentHandle<TContext>
  workers: AgentHandle<TContext>[]
  /** How the supervisor picks a worker. Default: round-robin. */
  route?: (task: string, workers: AgentHandle<TContext>[]) => AgentHandle<TContext>
  /** Maximum delegation rounds. Default 1. */
  maxRounds?: number
  onEvent?: TopologyObserver
}

export function supervisor<TContext = unknown>(
  config: SupervisorConfig<TContext>,
): AgentHandle<TContext> {
  if (config.workers.length === 0) throw new Error('supervisor requires ≥ 1 worker')
  const maxRounds = Math.max(1, config.maxRounds ?? 1)
  let rr = 0
  const route =
    config.route ??
    ((_task, workers) => workers[rr++ % workers.length]!)

  return {
    name: config.supervisor.name,
    async run(task, context) {
      const log = config.onEvent
      log?.({ topology: 'supervisor', phase: 'dispatch', task })
      let current = task
      const notes: string[] = []
      for (let i = 0; i < maxRounds; i++) {
        const worker = route(current, config.workers)
        log?.({ topology: 'supervisor', phase: 'agent:start', agent: worker.name, iteration: i })
        const result = await worker.run(current, context)
        log?.({ topology: 'supervisor', phase: 'agent:end', agent: worker.name, result, iteration: i })
        notes.push(`[${worker.name}] ${result}`)
        current = `Worker result:\n${result}\n\nOriginal task: ${task}`
      }
      const synthesis = await config.supervisor.run(
        `Synthesize the following worker outputs into one answer.\n\n${notes.join('\n---\n')}\n\nOriginal task: ${task}`,
        context,
      )
      log?.({ topology: 'supervisor', phase: 'done', result: synthesis })
      return synthesis
    },
  }
}

// ---------------------------------------------------------------------------
// Swarm: broadcast to every member, user-supplied merger picks the output.
// ---------------------------------------------------------------------------

export interface SwarmConfig<TContext = unknown> {
  name?: string
  members: AgentHandle<TContext>[]
  /** Merge member outputs into a single result. Default: longest. */
  merge?: (results: Array<{ agent: string; output: string }>) => string | Promise<string>
  /** Per-member timeout in ms. */
  timeoutMs?: number
  onEvent?: TopologyObserver
}

function withTimeout<T>(p: Promise<T>, timeoutMs: number | undefined, label: string): Promise<T> {
  if (timeoutMs === undefined) return p
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    p.then(
      v => {
        clearTimeout(timer)
        resolve(v)
      },
      e => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}

export function swarm<TContext = unknown>(config: SwarmConfig<TContext>): AgentHandle<TContext> {
  if (config.members.length === 0) throw new Error('swarm requires ≥ 1 member')
  const merge =
    config.merge ??
    ((results: Array<{ agent: string; output: string }>): string =>
      results.reduce((best, r) => (r.output.length > best.length ? r.output : best), ''))

  return {
    name: config.name ?? 'swarm',
    async run(task, context) {
      config.onEvent?.({ topology: 'swarm', phase: 'dispatch', task })
      const settled = await Promise.allSettled(
        config.members.map(async m => {
          config.onEvent?.({ topology: 'swarm', phase: 'agent:start', agent: m.name })
          const output = await withTimeout(m.run(task, context), config.timeoutMs, `swarm(${m.name})`)
          config.onEvent?.({ topology: 'swarm', phase: 'agent:end', agent: m.name, result: output })
          return { agent: m.name, output }
        }),
      )
      const results = settled.flatMap(s => (s.status === 'fulfilled' ? [s.value] : []))
      if (results.length === 0) throw new Error('every swarm member failed')
      const merged = await merge(results)
      config.onEvent?.({ topology: 'swarm', phase: 'done', result: merged })
      return merged
    },
  }
}

// ---------------------------------------------------------------------------
// Hierarchical: tree of agents. Root decides which branch to dispatch to.
// ---------------------------------------------------------------------------

export interface HierarchicalNode<TContext = unknown> {
  agent: AgentHandle<TContext>
  /** Free-form tags the router can match against. */
  tags?: string[]
  children?: HierarchicalNode<TContext>[]
}

export interface HierarchicalConfig<TContext = unknown> {
  name?: string
  root: HierarchicalNode<TContext>
  /** Pick which child (if any) to descend into. Return undefined to stop. */
  route?: (input: { task: string; node: HierarchicalNode<TContext> }) => HierarchicalNode<TContext> | undefined
  /** Maximum depth. Default 5. */
  maxDepth?: number
  onEvent?: TopologyObserver
}

export function hierarchical<TContext = unknown>(
  config: HierarchicalConfig<TContext>,
): AgentHandle<TContext> {
  const maxDepth = Math.max(1, config.maxDepth ?? 5)
  const route =
    config.route ??
    (({ task, node }: { task: string; node: HierarchicalNode<TContext> }): HierarchicalNode<TContext> | undefined => {
      if (!node.children || node.children.length === 0) return undefined
      const lowered = task.toLowerCase()
      return node.children.find(c => c.tags?.some(t => lowered.includes(t.toLowerCase()))) ?? undefined
    })

  return {
    name: config.name ?? config.root.agent.name,
    async run(task, context) {
      let current: HierarchicalNode<TContext> = config.root
      for (let depth = 0; depth < maxDepth; depth++) {
        const next = route({ task, node: current })
        if (!next) break
        config.onEvent?.({ topology: 'hierarchical', phase: 'dispatch', agent: next.agent.name })
        current = next
      }
      config.onEvent?.({ topology: 'hierarchical', phase: 'agent:start', agent: current.agent.name })
      const result = await current.agent.run(task, context)
      config.onEvent?.({ topology: 'hierarchical', phase: 'done', agent: current.agent.name, result })
      return result
    },
  }
}

// ---------------------------------------------------------------------------
// Blackboard: agents read/write a shared scratchpad. Loop until converge.
// ---------------------------------------------------------------------------

export interface BlackboardConfig<TContext = unknown> {
  name?: string
  agents: AgentHandle<TContext>[]
  /** Return an output when no further iterations are needed. */
  isDone?: (blackboard: string, iteration: number) => boolean
  /** Max iterations. Default 5. */
  maxIterations?: number
  onEvent?: TopologyObserver
}

export function blackboard<TContext = unknown>(
  config: BlackboardConfig<TContext>,
): AgentHandle<TContext> {
  if (config.agents.length === 0) throw new Error('blackboard requires ≥ 1 agent')
  const maxIterations = Math.max(1, config.maxIterations ?? 5)

  return {
    name: config.name ?? 'blackboard',
    async run(task, context) {
      let board = `Task: ${task}\n\n`
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (config.isDone?.(board, iteration)) break
        for (const agent of config.agents) {
          config.onEvent?.({ topology: 'blackboard', phase: 'agent:start', agent: agent.name, iteration })
          const contribution = await agent.run(board, context)
          config.onEvent?.({ topology: 'blackboard', phase: 'agent:end', agent: agent.name, result: contribution, iteration })
          board += `\n### ${agent.name} (round ${iteration + 1})\n${contribution}\n`
          if (config.isDone?.(board, iteration)) break
        }
      }
      config.onEvent?.({ topology: 'blackboard', phase: 'done', result: board })
      return board
    },
  }
}
