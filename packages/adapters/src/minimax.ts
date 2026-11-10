import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the MiniMax chat adapter.
 */
export interface MiniMaxConfig extends OpenAICompatibleConfig {}

/**
 * Creates an adapter for MiniMax chat completions.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 *
 * @example
 * const adapter = minimax({ apiKey: '…', model: 'model-name' })
 */
export const minimax = createOpenAICompatibleAdapter('https://api.minimax.io')
