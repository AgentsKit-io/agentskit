import { createOpenAICompatibleEmbedder, type OpenAICompatibleEmbedderConfig } from './openai-compatible'

export interface DeepSeekEmbedderConfig extends OpenAICompatibleEmbedderConfig {}

export const deepseekEmbedder = createOpenAICompatibleEmbedder('DeepSeek', 'https://api.deepseek.com')
