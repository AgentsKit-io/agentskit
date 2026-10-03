import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the Moonshot Kimi chat adapter.
 */
export interface KimiConfig extends OpenAICompatibleConfig {}

/**
 * Creates an adapter for Moonshot Kimi chat completions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = kimi({ apiKey: '…', model: 'model-name' })
 */
export const kimi = createOpenAICompatibleAdapter('https://api.moonshot.ai')
