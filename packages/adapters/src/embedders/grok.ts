import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

/**
 * Configuration options for the xAI Grok embedder.
 */
export interface GrokEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

/**
 * Creates an embedder for xAI embeddings.
 * @param config Embedder configuration.
 * @returns An embedding function.
 */
export const grokEmbedder = createOpenAICompatibleEmbedder('Grok', 'https://api.x.ai')
