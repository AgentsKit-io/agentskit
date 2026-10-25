import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

/**
 * Configuration options for the DeepSeek embedder.
 */
export interface DeepSeekEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

/**
 * Creates an embedder for DeepSeek embeddings.
 * @param config Embedder configuration.
 * @returns An embedding function.
 */
export const deepseekEmbedder = createOpenAICompatibleEmbedder('DeepSeek', 'https://api.deepseek.com')
