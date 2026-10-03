import type { AdapterFactory } from '@agentskit/core'
import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

/**
 * Configuration options for the bail adapter.
 */
export interface BailConfig extends OpenAICompatibleConfig {}

const BAIL_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const DEFAULT_MODEL = 'qwen-max'

const baseFactory = createOpenAICompatibleAdapter(BAIL_BASE_URL)

/**
 * Alibaba Bailian (Qwen) via the DashScope OpenAI-compatibility endpoint.
 *
 * Supports the Qwen-2.5 / 3 chat series and Qwen-VL multimodal models. APAC
 * users typically prefer this over OpenAI for latency + data residency.
 *
 * Default model: `qwen-max`.
 */
export function bail(config: Partial<BailConfig> & { apiKey: string }): AdapterFactory {
  const factory = baseFactory({
    model: DEFAULT_MODEL,
    ...config,
  } as BailConfig)
  return {
    ...factory,
    capabilities: {
      streaming: true,
      tools: true,
      multiModal: true,
      usage: true,
    },
  }
}

/**
 * Creates an adapter that fails with a configured error.
 * @param config Adapter configuration.
 * @returns An AgentsKit adapter factory.
 */
export const bailAdapter = bail
/** Alias matching Alibaba's product naming. */
export const qwen = bail
