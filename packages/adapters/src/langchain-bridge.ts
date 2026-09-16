import type { AdapterContext, AdapterFactory, AdapterRequest, Message, StreamChunk, ToolDefinition } from '@agentskit/core'
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager'
import {
  BaseChatModel,
  type BaseChatModelCallOptions,
  type BaseChatModelParams,
  type BindToolsInput,
  type LangSmithParams,
} from '@langchain/core/language_models/chat_models'
import type { ModelProfile } from '@langchain/core/language_models/profile'
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'
import {
  AIMessage,
  AIMessageChunk,
  type BaseMessage,
  type InvalidToolCall,
  type ToolCall as LangChainToolCall,
  type UsageMetadata,
} from '@langchain/core/messages'
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs'
import type { Runnable } from '@langchain/core/runnables'
import { convertToOpenAITool } from '@langchain/core/utils/function_calling'

/**
 * Call options accepted by the bridged model. `tools` and `tool_choice` are
 * populated by `bindTools()` and by LangChain's agent machinery.
 */
export interface AgentsKitChatModelCallOptions extends BaseChatModelCallOptions {
  tools?: BindToolsInput[]
}

export interface AdapterToLangChainModelOptions extends BaseChatModelParams {
  /** Reported as the LangSmith model name and `_llmType()` suffix. Default: `agentskit`. */
  modelName?: string
  /** Static `AdapterContext` fields (temperature, maxTokens, metadata) sent with every request. */
  context?: Omit<AdapterContext, 'systemPrompt' | 'tools'>
  /**
   * LangChain model profile. Defaults to `toolCalling` from the adapter's
   * capabilities (assumed supported when unknown) and no native
   * `structuredOutput`, so `createAgent({ responseFormat })` uses its tool
   * strategy, which every tool-calling adapter can satisfy.
   */
  profile?: ModelProfile
}

interface CollectedResponse {
  text: string
  reasoning: string
  toolCalls: LangChainToolCall[]
  invalidToolCalls: InvalidToolCall[]
  usage?: UsageMetadata
  metadata: Record<string, unknown>
}

function contentText(content: BaseMessage['content']): string {
  if (typeof content === 'string') return content
  return content
    .map(part => (typeof part === 'object' && part !== null && 'text' in part && typeof part.text === 'string' ? part.text : ''))
    .filter(Boolean)
    .join('\n')
}

function toolCallArgs(args: unknown): Record<string, unknown> {
  if (typeof args === 'string') {
    try {
      const parsed: unknown = JSON.parse(args)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : { value: parsed }
    } catch {
      return {}
    }
  }
  return args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {}
}

function toAgentsKitMessages(messages: BaseMessage[]): { messages: Message[]; systemPrompt?: string } {
  const createdAt = new Date()
  const output: Message[] = []
  const systemParts: string[] = []
  messages.forEach((message, index) => {
    const type = message.type
    const id = message.id ?? `lc-${type}-${index}`
    if (type === 'system') {
      const content = contentText(message.content)
      systemParts.push(content)
      output.push({ id, role: 'system', content, status: 'complete', createdAt })
      return
    }
    if (type === 'ai') {
      const ai = message as AIMessage
      output.push({
        id,
        role: 'assistant',
        content: contentText(ai.content),
        status: 'complete',
        createdAt,
        toolCalls: ai.tool_calls?.map((call, callIndex) => ({
          id: call.id ?? `${id}-call-${callIndex}`,
          name: call.name,
          args: toolCallArgs(call.args),
          status: 'complete' as const,
        })),
      })
      return
    }
    if (type === 'tool') {
      const toolCallId = (message as { tool_call_id?: string }).tool_call_id
      output.push({ id, role: 'tool', content: contentText(message.content), status: 'complete', createdAt, toolCallId })
      return
    }
    output.push({ id, role: 'user', content: contentText(message.content), status: 'complete', createdAt })
  })
  return { messages: output, systemPrompt: systemParts.length > 0 ? systemParts.join('\n\n') : undefined }
}

function toToolDefinitions(tools: readonly BindToolsInput[] | undefined): ToolDefinition[] | undefined {
  if (!tools || tools.length === 0) return undefined
  return tools.map(tool => {
    const converted = convertToOpenAITool(tool as Parameters<typeof convertToOpenAITool>[0])
    const fn = converted.function
    return {
      name: fn.name,
      description: fn.description,
      schema: (fn.parameters ?? { type: 'object', properties: {} }) as ToolDefinition['schema'],
    }
  })
}

function usageMetadata(chunk: StreamChunk): UsageMetadata | undefined {
  if (!chunk.usage) return undefined
  return {
    input_tokens: chunk.usage.promptTokens,
    output_tokens: chunk.usage.completionTokens,
    total_tokens: chunk.usage.totalTokens,
  }
}

function invalidToolCall(call: NonNullable<StreamChunk['toolCall']>, error: string): InvalidToolCall {
  return { id: call.id, name: call.name, args: call.args, error, type: 'invalid_tool_call' }
}

/**
 * A LangChain `BaseChatModel` backed by any AgentsKit `AdapterFactory`.
 *
 * Drop it into any LangChain `model:` slot (`createAgent`, `AgentNode`, a
 * plain chain). `bindTools()` forwards LangChain tools as AgentsKit
 * `ToolDefinition`s on `context.tools`; `tool_call` chunks come back as
 * `AIMessage.tool_calls` so LangChain's agent loop, middleware, and
 * tool-strategy structured output work unchanged. Every response is a real
 * `AIMessage`/`AIMessageChunk` instance.
 */
export class AgentsKitChatModel extends BaseChatModel<AgentsKitChatModelCallOptions> {
  static override lc_name(): string {
    return 'AgentsKitChatModel'
  }

  override lc_namespace = ['agentskit', 'adapters', 'langchain_bridge']
  override lc_serializable = false

  readonly adapter: AdapterFactory
  readonly modelName: string
  private readonly baseContext: Omit<AdapterContext, 'systemPrompt' | 'tools'>
  private readonly profileOverride?: ModelProfile

  constructor(adapter: AdapterFactory, options: AdapterToLangChainModelOptions = {}) {
    const { modelName, context, profile, ...params } = options
    super(params)
    this.adapter = adapter
    this.modelName = modelName ?? 'agentskit'
    this.baseContext = context ?? {}
    this.profileOverride = profile
  }

  _llmType(): string {
    return 'agentskit'
  }

  override get profile(): ModelProfile {
    return { toolCalling: this.adapter.capabilities?.tools !== false, ...this.profileOverride }
  }

  override bindTools(
    tools: BindToolsInput[],
    kwargs?: Partial<AgentsKitChatModelCallOptions>,
  ): Runnable<BaseLanguageModelInput, AIMessageChunk, AgentsKitChatModelCallOptions> {
    return this.withConfig({ tools, ...kwargs })
  }

  override invocationParams(options?: this['ParsedCallOptions']): Record<string, unknown> {
    return {
      model: this.modelName,
      tools: toToolDefinitions(options?.tools)?.map(tool => ({ name: tool.name, description: tool.description })),
      tool_choice: options?.tool_choice,
    }
  }

  override getLsParams(options: this['ParsedCallOptions']): LangSmithParams {
    return {
      ls_provider: 'agentskit',
      ls_model_name: this.modelName,
      ls_model_type: 'chat',
      ls_temperature: this.baseContext.temperature,
      ls_max_tokens: this.baseContext.maxTokens,
      ls_stop: options.stop,
    }
  }

  private buildRequest(messages: BaseMessage[], options: this['ParsedCallOptions']): AdapterRequest {
    const { messages: converted, systemPrompt } = toAgentsKitMessages(messages)
    const tools = toToolDefinitions(options.tools)
    const metadata = options.tool_choice === undefined
      ? this.baseContext.metadata
      : { ...this.baseContext.metadata, toolChoice: options.tool_choice }
    const context: AdapterContext = { ...this.baseContext, systemPrompt, tools, metadata }
    return { messages: converted, context }
  }

  private async *chunks(messages: BaseMessage[], options: this['ParsedCallOptions']): AsyncIterableIterator<StreamChunk> {
    const source = this.adapter.createSource(this.buildRequest(messages, options))
    const signal = options.signal
    const onAbort = (): void => source.abort()
    if (signal?.aborted) {
      source.abort()
      throw signal.reason instanceof Error ? signal.reason : new Error('Aborted')
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    try {
      for await (const chunk of source.stream()) {
        if (chunk.type === 'error') {
          const cause = chunk.metadata?.error
          throw cause instanceof Error ? cause : new Error(chunk.content ?? 'AgentsKit adapter stream failed')
        }
        if (chunk.type === 'done') return
        yield chunk
      }
    } finally {
      signal?.removeEventListener('abort', onAbort)
    }
  }

  private static collect(response: CollectedResponse, chunk: StreamChunk): void {
    if (chunk.metadata) Object.assign(response.metadata, chunk.metadata)
    switch (chunk.type) {
      case 'text':
        response.text += chunk.content ?? ''
        break
      case 'reasoning':
        response.reasoning += chunk.content ?? ''
        break
      case 'tool_call':
        if (!chunk.toolCall) break
        try {
          response.toolCalls.push({ id: chunk.toolCall.id, name: chunk.toolCall.name, args: toolCallArgs(chunk.toolCall.args), type: 'tool_call' })
        } catch (error) {
          response.invalidToolCalls.push(invalidToolCall(chunk.toolCall, error instanceof Error ? error.message : String(error)))
        }
        break
      case 'usage':
        response.usage = usageMetadata(chunk)
        break
      default:
        break
    }
  }

  async _generate(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): Promise<ChatResult> {
    const response: CollectedResponse = { text: '', reasoning: '', toolCalls: [], invalidToolCalls: [], metadata: {} }
    for await (const chunk of this.chunks(messages, options)) {
      AgentsKitChatModel.collect(response, chunk)
      if (chunk.type === 'text' && chunk.content) await runManager?.handleLLMNewToken(chunk.content)
    }
    const message = new AIMessage({
      content: response.text,
      tool_calls: response.toolCalls,
      invalid_tool_calls: response.invalidToolCalls,
      usage_metadata: response.usage,
      additional_kwargs: response.reasoning ? { reasoning: response.reasoning } : {},
      response_metadata: { ...response.metadata, model_name: this.modelName },
    })
    return {
      generations: [{ text: response.text, message }],
      llmOutput: response.usage ? { tokenUsage: { promptTokens: response.usage.input_tokens, completionTokens: response.usage.output_tokens, totalTokens: response.usage.total_tokens } } : {},
    }
  }

  override async *_streamResponseChunks(
    messages: BaseMessage[],
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun,
  ): AsyncGenerator<ChatGenerationChunk> {
    let toolCallIndex = 0
    for await (const chunk of this.chunks(messages, options)) {
      let message: AIMessageChunk | undefined
      if (chunk.type === 'text') {
        message = new AIMessageChunk({ content: chunk.content ?? '', response_metadata: chunk.metadata ?? {} })
      } else if (chunk.type === 'reasoning') {
        message = new AIMessageChunk({ content: '', additional_kwargs: { reasoning: chunk.content ?? '' } })
      } else if (chunk.type === 'tool_call' && chunk.toolCall) {
        message = new AIMessageChunk({
          content: '',
          tool_call_chunks: [{
            id: chunk.toolCall.id,
            name: chunk.toolCall.name,
            args: typeof chunk.toolCall.args === 'string' ? chunk.toolCall.args : JSON.stringify(chunk.toolCall.args ?? {}),
            index: toolCallIndex++,
            type: 'tool_call_chunk',
          }],
        })
      } else if (chunk.type === 'usage') {
        message = new AIMessageChunk({ content: '', usage_metadata: usageMetadata(chunk) })
      }
      if (!message) continue
      const generation = new ChatGenerationChunk({ message, text: chunk.type === 'text' ? chunk.content ?? '' : '' })
      yield generation
      if (chunk.type === 'text' && chunk.content) await runManager?.handleLLMNewToken(chunk.content, undefined, undefined, undefined, undefined, { chunk: generation })
    }
  }
}

/**
 * Wraps any AgentsKit `AdapterFactory` (mock, ollama, CLI-backed, ...) as a
 * LangChain `BaseChatModel` so it can replace `ChatAnthropic`/`ChatOpenAI`
 * in `createAgent`, `AgentNode`, or any chain.
 *
 * ```ts
 * import { createAgent } from 'langchain'
 * import { mockAdapter } from '@agentskit/adapters'
 * import { adapterToLangChainModel } from '@agentskit/adapters/langchain-bridge'
 *
 * const agent = createAgent({ model: adapterToLangChainModel(mockAdapter({ response })), tools: [add] })
 * ```
 *
 * Requires `@langchain/core` (optional peer dependency).
 */
export function adapterToLangChainModel(adapter: AdapterFactory, options?: AdapterToLangChainModelOptions): AgentsKitChatModel {
  return new AgentsKitChatModel(adapter, options)
}
