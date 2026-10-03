import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the DeepSeek chat adapter.
 */
export interface DeepSeekConfig extends OpenAICompatibleConfig {}

/**
 * Creates an adapter for DeepSeek chat completions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = deepseek({ apiKey: '…', model: 'model-name' })
 */
export const deepseek = createOpenAICompatibleAdapter('https://api.deepseek.com')
