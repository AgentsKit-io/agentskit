import { formatRetrievedDocuments } from './rag'
import { buildMessage, consumeStream, createEventEmitter, safeParseArgs, createToolLifecycle } from './primitives'
import { buildToolMap, activateSkills, executeSafeTool } from './agent-loop'
import type {
  AdapterRequest,
  ChatConfig,
  ChatController,
  ChatState,
  Message,
  StreamChunk,
  StreamSource,
  ToolCall,
  ToolDefinition,
} from './types'

function mergeSystemMessages(messages: Message[], systemPrompt?: string): Message[] {
  if (!systemPrompt) return messages
  if (messages.some(message => message.role === 'system' && message.content === systemPrompt)) {
    return messages
  }
  return [buildMessage({ role: 'system', content: systemPrompt }), ...messages]
}

function buildRetrievalMessage(documentsText: string): Message | null {
  if (!documentsText) return null
  return buildMessage({
    role: 'system',
    content: `Use the retrieved context below when it is relevant.\n\n${documentsText}`,
  })
}

export function createChatController(initialConfig: ChatConfig): ChatController {
  let config = initialConfig
  let effectiveSystemPrompt = config.systemPrompt
  let source: StreamSource | null = null
  let state: ChatState = {
    messages: initialConfig.initialMessages ?? [],
    status: 'idle',
    input: '',
    error: null,
  }
  const listeners = new Set<() => void>()
  const emitter = createEventEmitter()
  let toolMap = buildToolMap(config.tools)
  let lifecycle = createToolLifecycle(toolMap)
  let hydrated = false
  let skillsActivated = false

  const rebuildToolMap = (extraTools?: ToolDefinition[]) => {
    toolMap = buildToolMap(config.tools, extraTools)
    lifecycle = createToolLifecycle(toolMap)
  }

  const ensureSkillsActivated = async () => {
    if (skillsActivated) return
    skillsActivated = true
    const result = await activateSkills(config.skills ?? [], config.systemPrompt)
    effectiveSystemPrompt = result.systemPrompt
    if (result.skillTools.length > 0) rebuildToolMap(result.skillTools)
  }
  void ensureSkillsActivated()

  for (const observer of config.observers ?? []) {
    emitter.addObserver(observer)
  }

  const emit = () => {
    for (const listener of listeners) listener()
  }

  const setState = (updater: ChatState | ((current: ChatState) => ChatState)) => {
    state = typeof updater === 'function' ? updater(state) : updater
    void persistMessages(state.messages)
    emit()
  }

  const persistMessages = async (messages: Message[]) => {
    try {
      await config.memory?.save(messages)
      if (config.memory) {
        emitter.emit({ type: 'memory:save', messageCount: messages.length })
      }
    } catch {
      // Memory failures should not break chat usage.
    }
  }

  const hydrateMemory = async () => {
    if (hydrated || !config.memory) return
    hydrated = true

    try {
      const loaded = await config.memory.load()
      if (loaded.length > 0 && state.messages.length === 0) {
        state = { ...state, messages: loaded }
        emitter.emit({ type: 'memory:load', messageCount: loaded.length })
        emit()
      }
    } catch {
      // Ignore hydration failures and continue with in-memory state.
    }
  }

  void hydrateMemory()

  const setAssistantMessage = (assistantId: string, updater: (message: Message) => Message) => {
    setState(current => ({
      ...current,
      messages: current.messages.map(message =>
        message.id === assistantId ? updater(message) : message
      ),
    }))
  }

  const handleToolCall = async (assistantId: string, chunk: StreamChunk) => {
    if (!chunk.toolCall) return

    const args = safeParseArgs(chunk.toolCall.args)
    const tool = toolMap.get(chunk.toolCall.name)
    const toolCall: ToolCall = {
      id: chunk.toolCall.id,
      name: chunk.toolCall.name,
      args,
      result: chunk.toolCall.result,
      status: tool?.requiresConfirmation ? 'requires_confirmation' : 'pending',
    }

    setAssistantMessage(assistantId, message => ({
      ...message,
      toolCalls: [...(message.toolCalls ?? []), toolCall],
    }))

    await config.onToolCall?.(toolCall, { messages: state.messages, tool })

    // Handle requiresConfirmation: controller keeps existing behavior —
    // sets status to 'requires_confirmation' and waits for external confirmation
    if (tool?.requiresConfirmation) {
      if (chunk.toolCall.result) {
        setAssistantMessage(assistantId, message => ({
          ...message,
          toolCalls: (message.toolCalls ?? []).map(call =>
            call.id === toolCall.id
              ? { ...call, result: chunk.toolCall?.result, status: 'complete' as const }
              : call
          ),
        }))
      }
      return
    }

    // No tool or no execute — use executeSafeTool for consistent error handling
    if (!tool?.execute) {
      const execResult = await executeSafeTool({
        tool,
        toolCall,
        context: { messages: state.messages, call: toolCall },
        emitter,
        lifecycle,
      })
      setAssistantMessage(assistantId, message => ({
        ...message,
        toolCalls: (message.toolCalls ?? []).map(call =>
          call.id === toolCall.id
            ? { ...call, status: 'error' as const, error: execResult.error }
            : call
        ),
      }))
      return
    }

    setAssistantMessage(assistantId, message => ({
      ...message,
      toolCalls: (message.toolCalls ?? []).map(call =>
        call.id === toolCall.id ? { ...call, status: 'running' as const } : call
      ),
    }))

    const execResult = await executeSafeTool({
      tool,
      toolCall,
      context: { messages: state.messages, call: toolCall },
      emitter,
      lifecycle,
      onPartial: (partial) => {
        setAssistantMessage(assistantId, message => ({
          ...message,
          toolCalls: (message.toolCalls ?? []).map(call =>
            call.id === toolCall.id ? { ...call, result: partial } : call
          ),
        }))
      },
    })

    setAssistantMessage(assistantId, message => ({
      ...message,
      toolCalls: (message.toolCalls ?? []).map(call =>
        call.id === toolCall.id
          ? {
              ...call,
              status: execResult.status === 'complete' ? 'complete' as const : 'error' as const,
              result: execResult.result,
              error: execResult.error,
            }
          : call
      ),
    }))
  }

  const buildAdapterRequest = async (messages: Message[], text: string): Promise<AdapterRequest> => {
    await ensureSkillsActivated()
    const withSystem = mergeSystemMessages(messages, effectiveSystemPrompt)
    const retrievedDocuments = config.retriever && text
      ? await config.retriever.retrieve({ query: text, messages })
      : []
    const retrievalMessage = buildRetrievalMessage(formatRetrievedDocuments(retrievedDocuments))

    return {
      messages: retrievalMessage ? [retrievalMessage, ...withSystem] : withSystem,
      context: {
        systemPrompt: effectiveSystemPrompt,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        tools: [...toolMap.values()],
        metadata: retrievedDocuments.length > 0 ? { retrievedDocuments } : undefined,
      },
    }
  }

  const DEFAULT_MAX_TOOL_ITERATIONS = 5

  const isCallSettled = (status: ToolCall['status']): boolean =>
    status === 'complete' || status === 'error'

  const isCallPending = (status: ToolCall['status']): boolean =>
    status === 'pending' || status === 'running' || status === 'requires_confirmation'

  const runAdapterTurn = async (assistantId: string, queryText: string): Promise<boolean> => {
    const request = await buildAdapterRequest(state.messages, queryText)
    source = config.adapter.createSource(request)

    const streamStart = Date.now()
    let firstTokenEmitted = false
    let errored = false

    emitter.emit({ type: 'llm:start', messageCount: request.messages.length })

    await consumeStream(source, {
      onText(accumulated) {
        if (!firstTokenEmitted) {
          emitter.emit({ type: 'llm:first-token', latencyMs: Date.now() - streamStart })
          firstTokenEmitted = true
        }
        setAssistantMessage(assistantId, message => ({ ...message, content: accumulated }))
      },
      onReasoning(accumulated) {
        setAssistantMessage(assistantId, message => ({
          ...message,
          metadata: { ...message.metadata, reasoning: accumulated },
        }))
      },
      async onToolCall(chunk) {
        await handleToolCall(assistantId, chunk)
      },
      onToolResult(content) {
        setAssistantMessage(assistantId, message => ({
          ...message,
          metadata: { ...message.metadata, toolResult: content },
        }))
      },
      onError(error) {
        errored = true
        setAssistantMessage(assistantId, message => ({ ...message, status: 'error' }))
        setState(current => ({ ...current, status: 'error', error }))
        emitter.emit({ type: 'error', error })
        config.onError?.(error)
      },
      onDone(accumulatedText) {
        emitter.emit({ type: 'llm:end', content: accumulatedText, durationMs: Date.now() - streamStart })
      },
    })

    return !errored
  }

  const finalizeAssistant = (assistantId: string) => {
    let completedMessage: Message | undefined
    setState(current => ({
      ...current,
      messages: current.messages.map(message => {
        if (message.id !== assistantId) return message
        completedMessage = { ...message, status: 'complete' as const }
        return completedMessage
      }),
      status: 'idle',
      error: null,
    }))
    if (completedMessage) config.onMessage?.(completedMessage)
  }

  const appendToolResultsAndContinue = (assistantId: string, settledCalls: ToolCall[]): string => {
    const toolResultMessages = settledCalls.map(call =>
      buildMessage({
        role: 'tool',
        content: call.result ?? call.error ?? '',
        toolCallId: call.id,
      })
    )
    const nextAssistant = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

    setState(current => ({
      ...current,
      messages: [
        ...current.messages.map(message =>
          message.id === assistantId ? { ...message, status: 'complete' as const } : message
        ),
        ...toolResultMessages,
        nextAssistant,
      ],
      status: 'streaming',
      error: null,
    }))

    return nextAssistant.id
  }

  /**
   * Runs one `send` — an LLM turn, plus any follow-up turns needed to feed
   * completed tool results back to the model. Loop stops when the model
   * produces a final answer (no new tool calls), any tool is still pending
   * confirmation, an error fires, or the iteration cap is hit.
   */
  const startStream = async (assistantId: string, text: string) => {
    const maxIterations = config.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
    let currentAssistantId = assistantId
    let queryText = text

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const ok = await runAdapterTurn(currentAssistantId, queryText)
      if (!ok) return // error handler already set state to 'error'

      const assistant = state.messages.find(message => message.id === currentAssistantId)
      const calls = assistant?.toolCalls ?? []
      const hasPending = calls.some(call => isCallPending(call.status))
      const settled = calls.filter(call => isCallSettled(call.status))

      // No calls, or something still awaiting confirmation — stop here and
      // let the caller (e.g. approve/deny) drive the next step if needed.
      if (settled.length === 0 || hasPending) {
        finalizeAssistant(currentAssistantId)
        return
      }

      currentAssistantId = appendToolResultsAndContinue(currentAssistantId, settled)
      queryText = '' // skip retrieval on follow-up turns; user query already consumed
    }

    // Iteration cap reached — finalize whatever the last assistant turn produced.
    finalizeAssistant(currentAssistantId)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async send(text) {
      if (!text.trim()) return

      const userMessage = buildMessage({ role: 'user', content: text })
      const assistantMessage = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

      setState(current => ({
        ...current,
        messages: [...current.messages, userMessage, assistantMessage],
        status: 'streaming',
        input: '',
        error: null,
      }))

      await startStream(assistantMessage.id, text)
    },
    stop() {
      source?.abort()
      setState(current => ({ ...current, status: 'idle' }))
    },
    async retry() {
      const messages = [...state.messages]
      if (messages.length < 2) return

      const lastAssistant = messages[messages.length - 1]
      const lastUser = messages[messages.length - 2]
      if (lastAssistant.role !== 'assistant' || lastUser.role !== 'user') return

      const withoutLast = messages.slice(0, -1)
      const replacementAssistant = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

      setState(current => ({
        ...current,
        messages: [...withoutLast, replacementAssistant],
        status: 'streaming',
        error: null,
      }))

      await startStream(replacementAssistant.id, lastUser.content)
    },
    async edit(messageId, newContent, opts = {}) {
      const messages = state.messages
      const index = messages.findIndex(m => m.id === messageId)
      if (index === -1) return

      const target = messages[index]

      // Assistant messages: in-place content edit, no regeneration.
      if (target.role !== 'user') {
        setState(current => ({
          ...current,
          messages: current.messages.map(m =>
            m.id === messageId ? { ...m, content: newContent } : m,
          ),
        }))
        return
      }

      // User messages: replace content, drop following turns, optionally
      // regenerate the assistant response.
      const regenerate = opts.regenerate !== false
      const truncated = messages.slice(0, index).concat({ ...target, content: newContent })

      if (!regenerate) {
        setState(current => ({ ...current, messages: truncated }))
        return
      }

      source?.abort()
      const replacementAssistant = buildMessage({
        role: 'assistant',
        content: '',
        status: 'streaming',
      })

      const nextMessages = [...truncated, replacementAssistant]
      setState(current => ({
        ...current,
        messages: nextMessages,
        status: 'streaming',
        error: null,
      }))

      await startStream(replacementAssistant.id, newContent)
    },
    async regenerate(messageId) {
      const messages = state.messages
      if (messages.length < 2) return

      // Find the target assistant message.
      let targetIndex: number
      if (messageId) {
        targetIndex = messages.findIndex(m => m.id === messageId && m.role === 'assistant')
        if (targetIndex === -1) return
      } else {
        targetIndex = messages.length - 1
        if (messages[targetIndex].role !== 'assistant') return
      }

      // The preceding user message drives the regeneration.
      let userIndex = targetIndex - 1
      while (userIndex >= 0 && messages[userIndex].role !== 'user') userIndex--
      if (userIndex < 0) return

      source?.abort()
      const priorTurns = messages.slice(0, targetIndex)
      const replacementAssistant = buildMessage({
        role: 'assistant',
        content: '',
        status: 'streaming',
      })
      const nextMessages = [...priorTurns, replacementAssistant]

      setState(current => ({
        ...current,
        messages: nextMessages,
        status: 'streaming',
        error: null,
      }))

      await startStream(replacementAssistant.id, messages[userIndex].content)
    },
    setInput(value) {
      setState(current => ({ ...current, input: value }))
    },
    setMessages(messages) {
      setState(current => ({ ...current, messages }))
    },
    async clear() {
      await lifecycle.disposeAll()
      setState(current => ({
        ...current,
        messages: [],
        status: 'idle',
        error: null,
      }))
      await config.memory?.clear?.()
    },
    async approve(toolCallId) {
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === toolCallId && tc.status === 'requires_confirmation')
      )
      if (!msg) return

      const tc = msg.toolCalls!.find(c => c.id === toolCallId)!
      const tool = toolMap.get(tc.name)
      if (!tool?.execute) return

      setAssistantMessage(msg.id, message => ({
        ...message,
        toolCalls: (message.toolCalls ?? []).map(call =>
          call.id === toolCallId ? { ...call, status: 'running' as const } : call
        ),
      }))

      const execResult = await executeSafeTool({
        tool,
        toolCall: tc,
        context: { messages: state.messages, call: tc },
        emitter,
        lifecycle,
        onPartial: (partial) => {
          setAssistantMessage(msg.id, message => ({
            ...message,
            toolCalls: (message.toolCalls ?? []).map(call =>
              call.id === toolCallId ? { ...call, result: partial } : call
            ),
          }))
        },
      })

      setAssistantMessage(msg.id, message => ({
        ...message,
        toolCalls: (message.toolCalls ?? []).map(call =>
          call.id === toolCallId
            ? {
                ...call,
                status: execResult.status === 'complete' ? 'complete' as const : 'error' as const,
                result: execResult.result,
                error: execResult.error,
              }
            : call
        ),
      }))
    },
    async deny(toolCallId, reason) {
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === toolCallId && tc.status === 'requires_confirmation')
      )
      if (!msg) return

      const tc = msg.toolCalls!.find(c => c.id === toolCallId)!
      const denialMessage = `Permission denied: ${reason ?? 'user denied access'}`

      setAssistantMessage(msg.id, message => ({
        ...message,
        toolCalls: (message.toolCalls ?? []).map(call =>
          call.id === toolCallId
            ? { ...call, status: 'error' as const, error: denialMessage }
            : call
        ),
      }))
    },
    updateConfig(nextConfig) {
      void lifecycle.disposeAll()
      config = { ...config, ...nextConfig }
      skillsActivated = false
      rebuildToolMap()
      lifecycle = createToolLifecycle(toolMap)
      void ensureSkillsActivated()
      void hydrateMemory()
    },
  }
}
