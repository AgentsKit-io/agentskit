import { ConfigError, ErrorCodes } from '@agentskit/core'
import type { Integration } from './contract'

/**
 * In-memory catalog of integration descriptors. A service registers once at
 * module load; every consumer layer (agent tools, connectors, triggers, auth,
 * marketplace) reads from the same registry.
 */
export interface IntegrationRegistry {
  /** Register a descriptor. Throws on duplicate `name`. */
  register(integration: Integration): void
  get(name: string): Integration | undefined
  has(name: string): boolean
  list(): Integration[]
  /** Descriptors in a given category, e.g. `comms`. */
  byCategory(category: string): Integration[]
}

export function createRegistry(initial: Integration[] = []): IntegrationRegistry {
  const map = new Map<string, Integration>()

  const register = (integration: Integration): void => {
    if (map.has(integration.name)) {
      throw new ConfigError({
        code: ErrorCodes.AK_CONFIG_INVALID,
        message: `integration "${integration.name}" is already registered`,
        hint: 'Each integration name must be unique in a registry.',
      })
    }
    map.set(integration.name, integration)
  }

  for (const integration of initial) register(integration)

  return {
    register,
    get: (name) => map.get(name),
    has: (name) => map.has(name),
    list: () => [...map.values()],
    byCategory: (category) =>
      [...map.values()].filter((i) => i.categories.includes(category)),
  }
}

/**
 * Default catalog. Service modules call `registerIntegration(...)` at load;
 * consumers call `listIntegrations()` / `getIntegration(name)`.
 */
const defaultRegistry = createRegistry()

export function registerIntegration(integration: Integration): void {
  defaultRegistry.register(integration)
}

export function getIntegration(name: string): Integration | undefined {
  return defaultRegistry.get(name)
}

export function listIntegrations(): Integration[] {
  return defaultRegistry.list()
}

export function integrationsByCategory(category: string): Integration[] {
  return defaultRegistry.byCategory(category)
}
