import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the OpenRouter chat adapter.
 */
export interface OpenRouterConfig extends OpenAICompatibleConfig {}

/**
 * OpenRouter — routes to 300+ provider models behind a single
 * OpenAI-compatible endpoint. Pass the fully-qualified id as
 * `model`, e.g. `anthropic/claude-sonnet-4-6`.
 */
export const openrouter = createOpenAICompatibleAdapter('https://openrouter.ai/api/v1')
