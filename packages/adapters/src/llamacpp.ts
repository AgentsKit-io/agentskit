import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the llama.cpp chat adapter.
 */
export interface LlamaCppConfig extends OpenAICompatibleConfig {}

/**
 * llama.cpp's OpenAI-compatible HTTP server (`llama-server`). Defaults
 * to `http://localhost:8080/v1`, matching the binary's default port.
 */
export const llamacpp = createOpenAICompatibleAdapter('http://localhost:8080/v1')
