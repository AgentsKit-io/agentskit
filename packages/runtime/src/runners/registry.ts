import { ErrorCodes, RuntimeError } from '@agentskit/core'
import type { AgentRunner } from './types'

/** Lookup of runners by id. */
export interface RunnerRegistry {
  get(id: string): AgentRunner
  ids(): string[]
}

/** Pick a runner by id from configuration; throws listing the known ids when it is missing. */
export function createRunnerRegistry(runners: AgentRunner[]): RunnerRegistry {
  const byId = new Map(runners.map(r => [r.id, r]))
  return {
    get(id) {
      const runner = byId.get(id)
      if (!runner) throw new RuntimeError({
        code: ErrorCodes.AK_RUNTIME_INVALID_INPUT,
        message: `Unknown runner "${id}". Available: ${[...byId.keys()].join(', ')}`,
      })
      return runner
    },
    ids: () => [...byId.keys()],
  }
}
