import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

export interface KimiEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

export const kimiEmbedder = createOpenAICompatibleEmbedder('Kimi', 'https://api.moonshot.ai')
