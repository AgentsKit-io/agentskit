import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the Mistral chat adapter.
 */
export interface MistralConfig extends OpenAICompatibleConfig {}

/**
 * Mistral AI. Uses the OpenAI-compatible chat completions endpoint.
 * Default models: `mistral-large-latest`, `mistral-small-latest`,
 * `open-mistral-nemo`.
 */
export const mistral = createOpenAICompatibleAdapter('https://api.mistral.ai/v1')
