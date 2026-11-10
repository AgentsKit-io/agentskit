import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the Together AI chat adapter.
 */
export interface TogetherConfig extends OpenAICompatibleConfig {}

/**
 * Together AI. OpenAI-compatible endpoint, broad open-model catalog
 * (Llama, Qwen, DeepSeek, Mixtral, etc.).
 */
export const together = createOpenAICompatibleAdapter('https://api.together.xyz/v1')
