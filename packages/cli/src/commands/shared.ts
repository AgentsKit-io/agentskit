import type { AgentsKitConfig } from '../config'

export function mergeWithConfig(
  options: Record<string, unknown>,
  config: AgentsKitConfig | undefined,
): Record<string, unknown> {
  if (!config) return options
  const d = config.defaults ?? {}

  const resolvedApiKey =
    (options.apiKey as string | undefined) ??
    (d.apiKeyEnv ? process.env[d.apiKeyEnv] : undefined) ??
    d.apiKey

  return {
    ...options,
    provider: options.provider !== 'demo' ? options.provider : (d.provider ?? options.provider),
    model: options.model ?? d.model,
    apiKey: resolvedApiKey,
    baseUrl: options.baseUrl ?? d.baseUrl,
    tools: options.tools ?? d.tools,
    skill: options.skill ?? d.skill,
    system: options.system ?? d.system,
    memoryBackend: options.memoryBackend ?? d.memoryBackend,
  }
}
