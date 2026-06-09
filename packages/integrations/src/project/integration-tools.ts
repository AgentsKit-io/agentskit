import { ConfigError, ErrorCodes, type ToolDefinition } from '@agentskit/core'
import type { Integration } from '../contract'
import { getIntegration } from '../registry'
import { toToolDefinitions, type ProjectionConfig } from './to-tool-definitions'

/**
 * Resolve a catalog integration (by slug or descriptor) and project its
 * actions into ready-to-use ToolDefinitions — the one-call path for agents.
 *
 * @example
 * const tools = integrationTools('slack', { credential: process.env.SLACK_BOT_TOKEN })
 */
export function integrationTools(
  target: string | Integration,
  config: ProjectionConfig = {},
): ToolDefinition[] {
  const integration = typeof target === 'string' ? getIntegration(target) : target
  if (!integration) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `unknown integration "${String(target)}"`,
      hint: 'Use listIntegrations() to see the registered services.',
    })
  }
  return toToolDefinitions(integration, config)
}

/**
 * The conventional environment variable holding an integration's credential,
 * when it authenticates with an API key. Returns undefined for OAuth2 / none /
 * webhook-secret integrations (which the caller wires explicitly).
 */
export function credentialEnvVar(integration: Integration): string | undefined {
  return integration.auth.kind === 'apiKey' ? integration.auth.envHint : undefined
}

/**
 * Project a catalog integration using a credential read from the environment
 * (via its apiKey `envHint`). Returns the tools plus whether the credential was
 * found, so callers can warn on a missing key without throwing.
 */
export function integrationToolsFromEnv(
  name: string,
  env: Record<string, string | undefined> = {},
): { tools: ToolDefinition[]; credentialFound: boolean; envVar: string | undefined } {
  const integration = getIntegration(name)
  if (!integration) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `unknown integration "${name}"`,
      hint: 'Use listIntegrations() to see the registered services.',
    })
  }
  const envVar = credentialEnvVar(integration)
  const credential = envVar ? env[envVar] : undefined
  return {
    tools: toToolDefinitions(integration, credential ? { credential } : {}),
    credentialFound: envVar ? credential !== undefined : true,
    envVar,
  }
}
