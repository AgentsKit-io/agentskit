import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the Fireworks chat adapter.
 */
export interface FireworksConfig extends OpenAICompatibleConfig {}

/**
 * Fireworks AI. OpenAI-compatible endpoint with tuned open-source
 * models and fine-tunes (Llama, DeepSeek, Qwen, etc.).
 */
export const fireworks = createOpenAICompatibleAdapter('https://api.fireworks.ai/inference/v1')
