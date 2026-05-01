import type { AdapterFactory } from '@agentskit/core'
import { createOpenAICompatibleAdapter, type OpenAICompatibleConfig } from './openai-compatible'

export interface CohereConfig extends OpenAICompatibleConfig {}

const COHERE_BASE_URL = 'https://api.cohere.com/compatibility/v1'
const DEFAULT_MODEL = 'command-r-plus'

const baseFactory = createOpenAICompatibleAdapter(COHERE_BASE_URL)

/**
 * Cohere Command models via Cohere's OpenAI-compatibility endpoint.
 *
 * - Streams tokens via SSE (OpenAI-compatible chunks).
 * - Supports tool calls in the OpenAI `tools` shape.
 * - Reports `usage` on the final stream chunk when the upstream model
 *   returns it (Cohere's compatibility layer mirrors OpenAI's
 *   `stream_options: { include_usage: true }` semantics).
 * - Inherits auto-retry from the shared OpenAI core (`retry`).
 *
 * Default model: `command-r-plus`. Override via `model`.
 */
export function cohere(config: Partial<CohereConfig> & { apiKey: string }): AdapterFactory {
  const factory = baseFactory({
    model: DEFAULT_MODEL,
    ...config,
  } as CohereConfig)
  return {
    ...factory,
    capabilities: {
      streaming: true,
      tools: true,
      usage: true,
    },
  }
}

/** Alias for naming consistency with other native adapters. */
export const cohereAdapter = cohere
