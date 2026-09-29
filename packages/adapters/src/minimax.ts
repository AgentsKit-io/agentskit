import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

export interface MiniMaxConfig extends OpenAICompatibleConfig {}

export const minimax = createOpenAICompatibleAdapter('https://api.minimax.io')
