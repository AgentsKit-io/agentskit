import { AdapterError, ConfigError, ErrorCodes } from '@agentskit/core'
import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'

export interface BedrockConfig {
  /** Bedrock model id, e.g. `anthropic.claude-3-5-sonnet-20241022-v2:0`. */
  model: string
  /** AWS region (e.g. `us-east-1`). Falls back to the SDK's default credential chain. */
  region?: string
  /** Override `max_tokens` (Anthropic on Bedrock requires it). Defaults to 4096. */
  maxTokens?: number
  /**
   * Override the SDK client. Mostly for tests; production code should let the
   * adapter create the client from `region` + the SDK's default credential
   * chain.
   */
  client?: BedrockRuntimeClientLike
}

/**
 * Minimal structural type for `BedrockRuntimeClient` so we don't take a hard
 * dep on `@aws-sdk/client-bedrock-runtime`.
 */
export interface BedrockRuntimeClientLike {
  send(command: { input: BedrockInvokeInput }): Promise<{
    body?: AsyncIterable<{ chunk?: { bytes?: Uint8Array } }>
  }>
}

interface BedrockInvokeInput {
  modelId: string
  contentType: string
  accept: string
  body: string
}

interface SdkModule {
  BedrockRuntimeClient: new (config: { region?: string }) => BedrockRuntimeClientLike
  InvokeModelWithResponseStreamCommand: new (input: BedrockInvokeInput) => {
    input: BedrockInvokeInput
  }
}

let cachedSdk: Promise<SdkModule> | null = null
async function loadSdk(): Promise<SdkModule> {
  if (!cachedSdk) {
    cachedSdk = (async () => {
      try {
        // Optional peer dep — resolved lazily so installs without AWS keep working.
        const moduleId = '@aws-sdk/client-bedrock-runtime'
        return (await import(/* @vite-ignore */ moduleId)) as unknown as SdkModule
      } catch {
        throw new AdapterError({
          code: ErrorCodes.AK_ADAPTER_MISSING,
          message:
            'Install @aws-sdk/client-bedrock-runtime to use the bedrock adapter: npm install @aws-sdk/client-bedrock-runtime',
          hint: 'bedrock depends on the optional peer @aws-sdk/client-bedrock-runtime.',
        })
      }
    })()
  }
  return cachedSdk
}

function isAnthropicModel(model: string): boolean {
  return model.startsWith('anthropic.')
}

function buildAnthropicBody(request: AdapterRequest, maxTokens: number): string {
  const messages = request.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }))
  const system = request.messages.find(m => m.role === 'system')?.content
  const tools = request.context?.tools?.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.schema,
  }))
  const body: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: request.context?.maxTokens ?? maxTokens,
    messages,
  }
  if (system) body.system = system
  if (tools && tools.length > 0) body.tools = tools
  return JSON.stringify(body)
}

async function* parseAnthropicBedrockEvents(
  events: AsyncIterable<{ chunk?: { bytes?: Uint8Array } }>,
): AsyncIterableIterator<StreamChunk> {
  const decoder = new TextDecoder()
  const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>()

  for await (const item of events) {
    const bytes = item.chunk?.bytes
    if (!bytes) continue
    let event: Record<string, unknown>
    try {
      event = JSON.parse(decoder.decode(bytes)) as Record<string, unknown>
    } catch {
      continue
    }
    const type = event.type as string | undefined
    if (type === 'content_block_delta') {
      const delta = event.delta as { type?: string; text?: string; partial_json?: string } | undefined
      if (delta?.type === 'text_delta' && delta.text) {
        yield { type: 'text', content: delta.text }
      } else if (delta?.type === 'input_json_delta') {
        const index = (event.index as number | undefined) ?? 0
        const existing = pendingToolCalls.get(index)
        if (existing) existing.args += delta.partial_json ?? ''
      }
    } else if (type === 'content_block_start') {
      const index = (event.index as number | undefined) ?? 0
      const block = event.content_block as { type?: string; id?: string; name?: string } | undefined
      if (block?.type === 'tool_use' && block.id && block.name) {
        pendingToolCalls.set(index, { id: block.id, name: block.name, args: '' })
      }
    } else if (type === 'content_block_stop') {
      const index = (event.index as number | undefined) ?? 0
      const tc = pendingToolCalls.get(index)
      if (tc) {
        yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
        pendingToolCalls.delete(index)
      }
    } else if (type === 'message_delta') {
      const usage = event.usage as { input_tokens?: number; output_tokens?: number } | undefined
      if (usage) {
        const promptTokens = usage.input_tokens ?? 0
        const completionTokens = usage.output_tokens ?? 0
        yield {
          type: 'usage',
          usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
        }
      }
    } else if (type === 'message_start') {
      const usage = (event.message as { usage?: { input_tokens?: number } } | undefined)?.usage
      if (usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: usage.input_tokens ?? 0,
            completionTokens: 0,
            totalTokens: usage.input_tokens ?? 0,
          },
        }
      }
    } else if (type === 'message_stop') {
      for (const [, tc] of pendingToolCalls) {
        yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
      }
      pendingToolCalls.clear()
      yield { type: 'done' }
      return
    }
  }

  for (const [, tc] of pendingToolCalls) {
    yield { type: 'tool_call', toolCall: { id: tc.id, name: tc.name, args: tc.args || '{}' } }
  }
  pendingToolCalls.clear()
  yield { type: 'done' }
}

export function bedrock(config: BedrockConfig): AdapterFactory {
  const { model, region, maxTokens = 4096 } = config

  if (!isAnthropicModel(model)) {
    throw new ConfigError({
      code: ErrorCodes.AK_CONFIG_INVALID,
      message: `bedrock: model "${model}" is not supported in v1. Only anthropic.* models are wired up; Titan + others are tracked as a follow-up.`,
      hint: 'Pass an anthropic.* model id like "anthropic.claude-3-5-sonnet-20241022-v2:0".',
    })
  }

  let clientPromise: Promise<BedrockRuntimeClientLike> | null = null
  const getClient = async (): Promise<BedrockRuntimeClientLike> => {
    if (config.client) return config.client
    if (!clientPromise) {
      clientPromise = (async () => {
        const sdk = await loadSdk()
        return new sdk.BedrockRuntimeClient({ region })
      })()
    }
    return clientPromise
  }

  return {
    capabilities: {
      streaming: true,
      tools: true,
      reasoning: model.includes('sonnet') || model.includes('opus'),
      multiModal: true,
      usage: true,
    },
    createSource: (request: AdapterRequest): StreamSource => {
      const controller = new AbortController()
      let aborted = false

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (aborted) return
          try {
            const client = await getClient()
            const sdk = config.client ? null : await loadSdk()
            const input: BedrockInvokeInput = {
              modelId: model,
              contentType: 'application/json',
              accept: 'application/json',
              body: buildAnthropicBody(request, maxTokens),
            }
            const command = sdk
              ? new sdk.InvokeModelWithResponseStreamCommand(input)
              : { input }
            const response = await client.send(command)
            if (!response.body) {
              yield { type: 'error', content: 'Bedrock: empty response body' }
              return
            }
            for await (const chunk of parseAnthropicBedrockEvents(response.body)) {
              if (aborted) return
              yield chunk
            }
          } catch (err) {
            yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
          }
        },
        abort: () => {
          aborted = true
          controller.abort()
        },
      }
    },
  }
}

export const bedrockAdapter = bedrock
