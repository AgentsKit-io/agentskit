import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the vLLM chat adapter.
 */
export interface VLLMConfig extends OpenAICompatibleConfig {}

/**
 * vLLM's OpenAI-compatible serving endpoint. Defaults to
 * `http://localhost:8000/v1` — the standard `vllm serve ...` port.
 */
export const vllm = createOpenAICompatibleAdapter('http://localhost:8000/v1')
