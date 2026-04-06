import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

export interface GrokEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

export const grokEmbedder = createOpenAICompatibleEmbedder('Grok', 'https://api.x.ai')
