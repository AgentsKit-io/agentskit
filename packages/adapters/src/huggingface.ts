import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the Hugging Face chat adapter.
 */
export interface HuggingFaceConfig extends OpenAICompatibleConfig {}

/**
 * Hugging Face Inference Providers router. OpenAI-compatible
 * endpoint that fans out to HF-hosted model inference providers.
 * Pass any supported repo id as `model`, e.g.
 * `meta-llama/Meta-Llama-3.1-8B-Instruct`.
 */
export const huggingface = createOpenAICompatibleAdapter('https://router.huggingface.co/v1')
