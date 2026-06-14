// Cooperative multi-agent topology primitives — compare / vote / debate /
// auction. These complement the existing supervisor / swarm / blackboard
// topologies with fan-out-then-select patterns.
//
// They are pure orchestration factories, generic over the run context `Ctx`
// and decoupled from any flow-graph schema: each handler takes a plain config
// object (structurally compatible with a host's node type), an injected
// `TopologyRunAgent`, and returns a `TopologyOutcome`. Hosts adapt the outcome
// to their own node-result type.

/** Result of running a single agent within a topology. */
export type AgentRunResult = {
  output: unknown
  tokens?: number
  usd?: number
  latencyMs?: number
}

/** Injected agent runner: resolve an agent id + input to a structured result. */
export type TopologyRunAgent<Ctx> = (
  agentId: string,
  input: unknown,
  ctx: Ctx,
) => Promise<AgentRunResult>

/** Discriminated outcome of a topology handler. */
export type TopologyOutcome =
  | { readonly kind: 'ok'; readonly value: unknown }
  | { readonly kind: 'failed'; readonly error: { readonly code: string; readonly message: string } }
  | { readonly kind: 'paused'; readonly reason: string }

/** Default cap on concurrent agent runs in a single fan-out. */
export const DEFAULT_TOPOLOGY_CONCURRENCY = 8

/**
 * Run `fn` over `items` with at most `limit` calls in flight at once, returning
 * a `PromiseSettledResult` per item in input order — a concurrency-bounded
 * drop-in for `Promise.allSettled(items.map(fn))`.
 */
export const settleWithConcurrency = async <I, T>(
  items: readonly I[],
  limit: number,
  fn: (item: I, index: number) => Promise<T>,
): Promise<PromiseSettledResult<T>[]> => {
  const results = new Array<PromiseSettledResult<T>>(items.length)
  let next = 0
  const worker = async (): Promise<void> => {
    for (let i = next++; i < items.length; i = next++) {
      try {
        results[i] = { status: 'fulfilled', value: await fn(items[i] as I, i) }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    }
  }
  const poolSize = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: poolSize }, () => worker()))
  return results
}

/** Shared scratchpad store contract used by stateful topologies. */
export type ScratchpadStore = {
  get(key: string): unknown
  set(key: string, value: unknown): void
  entries(): ReadonlyArray<[string, unknown]>
}

export class InMemoryScratchpadStore implements ScratchpadStore {
  private readonly _data = new Map<string, unknown>()

  get(key: string): unknown {
    return this._data.get(key)
  }

  set(key: string, value: unknown): void {
    this._data.set(key, value)
  }

  entries(): ReadonlyArray<[string, unknown]> {
    return [...this._data.entries()]
  }
}

// --- Config shapes (structurally compatible with a host's node schemas) ---

export type CompareSelection =
  | { readonly mode: 'manual' }
  | { readonly mode: 'all'; readonly combine: 'concat' | 'merge' }
  | { readonly mode: 'first'; readonly metric: 'fastest' | 'cheapest' }
  | { readonly mode: 'eval'; readonly evalRef: string }
  | { readonly mode: 'judge'; readonly criteria: string; readonly judgeAgent: string }

export interface CompareConfig {
  readonly agents: readonly string[]
  readonly input?: unknown
  readonly selection: CompareSelection
}

export type VoteBallot =
  | { readonly mode: 'majority' }
  | { readonly mode: 'weighted'; readonly weights?: Record<string, number> }
  | { readonly mode: 'unanimous' }
  | { readonly mode: 'quorum'; readonly threshold: number }

export interface VoteConfig {
  readonly agents: readonly string[]
  readonly input?: unknown
  readonly ballot: VoteBallot
  readonly onTie: 'human' | 'first' | 'judge'
  readonly judgeAgent?: string
}

export interface DebateConfig {
  readonly topic: unknown
  readonly format?: unknown
  readonly proponent: string
  readonly opponent: string
  readonly judge: string
  readonly rounds: number
  readonly earlyExit?: 'on-agreement' | string
}

export interface AuctionConfig {
  readonly bidders: readonly string[]
  readonly task?: unknown
  readonly bidCriteria: 'lowest-cost' | 'highest-confidence' | 'fastest' | 'custom'
  readonly reservePrice?: { readonly usd?: number; readonly tokens?: number }
  readonly timeout?: { readonly ms: number }
  readonly fallback?: string
}

/** Resolve a concurrency limit from optional opts, falling back to the default. */
export const resolveConcurrency = (limit: number | undefined): number =>
  typeof limit === 'number' && Number.isInteger(limit) && limit > 0
    ? limit
    : DEFAULT_TOPOLOGY_CONCURRENCY
