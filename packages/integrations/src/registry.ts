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

/** Creates an isolated in-memory registry seeded with optional descriptors.
 * @param initial Integrations to register when the registry is created.
 * @returns A registry with register, lookup, list, and category methods.
 * @throws {ConfigError} When two initial integrations have the same name.
 * @example
 * ```ts
 * const registry = createRegistry([slackIntegration])
 * const slack = registry.get('slack')
 * ```
 */
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

/** Adds an integration to the default catalog.
 * @param integration Descriptor to register.
 * @throws {ConfigError} When an integration with the same name is registered.
 */
export function registerIntegration(integration: Integration): void {
  defaultRegistry.register(integration)
}

/** Looks up an integration by its service slug in the default catalog.
 * @param name Integration slug.
 * @returns The matching descriptor, or `undefined` when not registered.
 */
export function getIntegration(name: string): Integration | undefined {
  return defaultRegistry.get(name)
}

/** Returns all descriptors registered in the default catalog.
 * @returns A new array of integration descriptors.
 */
export function listIntegrations(): Integration[] {
  return defaultRegistry.list()
}

/** Returns default-catalog integrations that include the requested category.
 * @param category Category slug to match.
 * @returns Matching integration descriptors.
 */
export function integrationsByCategory(category: string): Integration[] {
  return defaultRegistry.byCategory(category)
}
