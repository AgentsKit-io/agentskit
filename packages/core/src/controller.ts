import { buildMessage, consumeStream, createEventEmitter, safeParseArgs, createToolLifecycle } from './primitives'
import { buildToolMap, activateSkills, executeSafeTool } from './agent-loop'
import { buildAdapterRequest } from './controller-helpers'
import type {
  ChatConfig,
  ChatController,
  ChatState,
  Message,
  StreamChunk,
  StreamSource,
  ToolCall,
  ToolDefinition,
} from './types'

export function createChatController(initialConfig: ChatConfig): ChatController {
  let config = initialConfig
  let effectiveSystemPrompt = config.systemPrompt
  let source: StreamSource | undefined
  let turnGeneration = 0
  let state: ChatState = {
    messages: initialConfig.initialMessages ?? [],
    status: 'idle',
    input: '',
    error: null,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
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

  const updateToolCall = (assistantId: string, toolCallId: string, patch: Partial<ToolCall>) => {
    setAssistantMessage(assistantId, message => ({
      ...message,
      toolCalls: (message.toolCalls ?? []).map(call =>
        call.id === toolCallId ? { ...call, ...patch } : call
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
        updateToolCall(assistantId, toolCall.id, {
          result: chunk.toolCall.result,
          status: 'complete',
        })
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
      updateToolCall(assistantId, toolCall.id, {
        status: 'error',
        error: execResult.error,
      })
      return
    }

    updateToolCall(assistantId, toolCall.id, { status: 'running' })

    const execResult = await executeSafeTool({
      tool,
      toolCall,
      context: { messages: state.messages, call: toolCall },
      emitter,
      lifecycle,
      validate: config.validateArgs,
      onPartial: (partial) => {
        updateToolCall(assistantId, toolCall.id, { result: partial })
      },
    })

    updateToolCall(assistantId, toolCall.id, {
      status: execResult.status === 'complete' ? 'complete' : 'error',
      result: execResult.result,
      error: execResult.error,
    })
  }

  const DEFAULT_MAX_TOOL_ITERATIONS = 5

  const isCallSettled = (status: ToolCall['status']): boolean =>
    status === 'complete' || status === 'error'

  const isCallPending = (status: ToolCall['status']): boolean =>
    status === 'pending' || status === 'running' || status === 'requires_confirmation'

  const runAdapterTurn = async (assistantId: string, queryText: string, generation: number): Promise<boolean> => {
    await ensureSkillsActivated()
    const request = await buildAdapterRequest(config, state.messages, queryText, effectiveSystemPrompt, [...toolMap.values()])
    if (generation !== turnGeneration) return false
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
      onUsage(usage) {
        // Attach to this turn's assistant message + accumulate the session total.
        setState(current => ({
          ...current,
          messages: current.messages.map(message =>
            message.id === assistantId
              ? { ...message, metadata: { ...message.metadata, usage } }
              : message
          ),
          usage: {
            promptTokens: current.usage.promptTokens + (usage.promptTokens ?? 0),
            completionTokens: current.usage.completionTokens + (usage.completionTokens ?? 0),
            totalTokens: current.usage.totalTokens + (usage.totalTokens ?? 0),
          },
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

    return generation === turnGeneration && !errored
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
   * Resume the agent loop after tool calls on `assistantId` have settled
   * (no new LLM turn has been issued yet). Used by both `startStream` and
   * `approve`/`deny` so the flow is identical whether tools auto-run or
   * wait for user confirmation.
   */
  const resumeAgentLoop = async (assistantId: string, generation: number) => {
    const maxIterations = config.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
    let currentAssistantId = assistantId

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const assistant = state.messages.find(message => message.id === currentAssistantId)
      const calls = assistant?.toolCalls ?? []
      const hasPending = calls.some(call => isCallPending(call.status))
      const settled = calls.filter(call => isCallSettled(call.status))

      // Nothing to feed back, or something still awaiting confirmation —
      // stop here; the caller drives the next step.
      if (settled.length === 0 || hasPending) {
        finalizeAssistant(currentAssistantId)
        return
      }

      currentAssistantId = appendToolResultsAndContinue(currentAssistantId, settled)
      const ok = await runAdapterTurn(currentAssistantId, '', generation)
      if (!ok) return
    }

    finalizeAssistant(currentAssistantId)
  }

  /**
   * Runs one `send` — an LLM turn, plus any follow-up turns needed to feed
   * completed tool results back to the model.
   */
  const startStream = async (assistantId: string, text: string, generation: number) => {
    const ok = await runAdapterTurn(assistantId, text, generation)
    if (!ok) return
    await resumeAgentLoop(assistantId, generation)
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async send(text) {
      if (!text.trim()) return
      turnGeneration++

      const userMessage = buildMessage({ role: 'user', content: text })
      const assistantMessage = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

      setState(current => ({
        ...current,
        messages: [...current.messages, userMessage, assistantMessage],
        status: 'streaming',
        input: '',
        error: null,
      }))

      await startStream(assistantMessage.id, text, turnGeneration)
    },
    stop() {
      turnGeneration++
      source?.abort()
      setState(current => ({ ...current, status: 'idle' }))
    },
    async retry() {
      const messages = [...state.messages]
      if (messages.length < 2) return

      const lastAssistant = messages[messages.length - 1]
      const lastUser = messages[messages.length - 2]
      if (lastAssistant.role !== 'assistant' || lastUser.role !== 'user') return
      turnGeneration++

      const withoutLast = messages.slice(0, -1)
      const replacementAssistant = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

      setState(current => ({
        ...current,
        messages: [...withoutLast, replacementAssistant],
        status: 'streaming',
        error: null,
      }))

      await startStream(replacementAssistant.id, lastUser.content, turnGeneration)
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

      turnGeneration++
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

      await startStream(replacementAssistant.id, newContent, turnGeneration)
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

      turnGeneration++
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

      await startStream(replacementAssistant.id, messages[userIndex].content, turnGeneration)
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
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      }))
      await config.memory?.clear?.()
    },
    async approve(toolCallId) {
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === toolCallId && tc.status === 'requires_confirmation')
      )
      const tc = msg?.toolCalls?.find(c => c.id === toolCallId)
      if (!msg || !tc) return

      const tool = toolMap.get(tc.name)
      if (!tool?.execute) return

      updateToolCall(msg.id, toolCallId, { status: 'running' })

      const execResult = await executeSafeTool({
        tool,
        toolCall: tc,
        context: { messages: state.messages, call: tc },
        emitter,
        lifecycle,
        validate: config.validateArgs,
        onPartial: (partial) => {
          updateToolCall(msg.id, toolCallId, { result: partial })
        },
      })

      updateToolCall(msg.id, toolCallId, {
        status: execResult.status === 'complete' ? 'complete' : 'error',
        result: execResult.result,
        error: execResult.error,
      })

      await resumeAgentLoop(msg.id, turnGeneration)
    },
    async deny(toolCallId, reason) {
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === toolCallId && tc.status === 'requires_confirmation')
      )
      const tc = msg?.toolCalls?.find(c => c.id === toolCallId)
      if (!msg || !tc) return

      updateToolCall(msg.id, toolCallId, {
        status: 'error',
        error: `Permission denied: ${reason ?? 'user denied access'}`,
      })

      await resumeAgentLoop(msg.id, turnGeneration)
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
