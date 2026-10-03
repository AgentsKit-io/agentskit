import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

/**
 * Configuration options for the Moonshot Kimi embedder.
 */
export interface KimiEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

/**
 * Creates an embedder for Moonshot Kimi embeddings.
 * @param config Embedder configuration.
 * @returns An embedding function.
 */
export const kimiEmbedder = createOpenAICompatibleEmbedder('Kimi', 'https://api.moonshot.ai')
