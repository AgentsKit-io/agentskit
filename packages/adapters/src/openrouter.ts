import { createOpenAICompatibleAdapter } from './openai-compatible'
import type { OpenAIConfig } from './openai'

/**
 * Configuration options for the OpenRouter chat adapter.
 */
export interface OpenRouterConfig extends OpenAIConfig {}

/**
 * OpenRouter — routes to 300+ provider models behind a single
 * OpenAI-compatible endpoint. Pass the fully-qualified id as
 * `model`, e.g. `anthropic/claude-sonnet-4-6`.
 */
export const openrouter = createOpenAICompatibleAdapter('https://openrouter.ai/api/v1')

/** Camel-case alias for the existing OpenRouter factory. */
export const openRouter = openrouter
