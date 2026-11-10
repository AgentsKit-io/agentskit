import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the LM Studio chat adapter.
 */
export interface LMStudioConfig extends OpenAICompatibleConfig {}

/**
 * LM Studio local server. Start the built-in OpenAI-compatible
 * server in LM Studio, then point this adapter at
 * `http://localhost:1234/v1` (the default).
 */
export const lmstudio = createOpenAICompatibleAdapter('http://localhost:1234/v1')
