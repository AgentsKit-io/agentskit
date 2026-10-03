import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the xAI Grok chat adapter.
 */
export interface GrokConfig extends OpenAICompatibleConfig {}

/**
 * Creates an adapter for xAI Grok chat completions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = grok({ apiKey: '…', model: 'model-name' })
 */
export const grok = createOpenAICompatibleAdapter('https://api.x.ai')
