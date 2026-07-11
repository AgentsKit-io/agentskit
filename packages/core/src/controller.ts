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
  let system = config.systemPrompt
  let source: StreamSource | undefined
  let gen = 0
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
  let active = false

  const rebuild = (extraTools?: ToolDefinition[]) => {
    toolMap = buildToolMap(config.tools, extraTools)
    lifecycle = createToolLifecycle(toolMap)
  }

  const activate = async () => {
    if (active) return
    active = true
    const result = await activateSkills(config.skills ?? [], config.systemPrompt)
    system = result.systemPrompt
    if (result.skillTools.length > 0) rebuild(result.skillTools)
  }
  void activate()

  for (const observer of config.observers ?? []) {
    emitter.addObserver(observer)
  }

  const emit = () => {
    for (const listener of listeners) listener()
  }

  const set = (updater: ChatState | ((current: ChatState) => ChatState)) => {
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

  const setMsg = (aid: string, updater: (message: Message) => Message) => {
    set(current => ({
      ...current,
      messages: current.messages.map(message =>
        message.id === aid ? updater(message) : message
      ),
    }))
  }

  const patchCall = (aid: string, tid: string, patch: Partial<ToolCall>) => {
    setMsg(aid, message => ({
      ...message,
      toolCalls: (message.toolCalls ?? []).map(call =>
        call.id === tid ? { ...call, ...patch } : call
      ),
    }))
  }

  const handleCall = async (aid: string, chunk: StreamChunk) => {
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

    setMsg(aid, message => ({
      ...message,
      toolCalls: [...(message.toolCalls ?? []), toolCall],
    }))

    await config.onToolCall?.(toolCall, { messages: state.messages, tool })

    // Handle requiresConfirmation: controller keeps existing behavior —
    // sets status to 'requires_confirmation' and waits for external confirmation
    if (tool?.requiresConfirmation) {
      if (chunk.toolCall.result) {
        patchCall(aid, toolCall.id, {
          result: chunk.toolCall.result,
          status: 'complete',
        })
      }
      return
    }

    // No tool or no execute — use executeSafeTool for consistent error handling
    if (!tool?.execute) {
      const outcome = await executeSafeTool({
        tool,
        toolCall,
        context: { messages: state.messages, call: toolCall },
        emitter,
        lifecycle,
      })
      patchCall(aid, toolCall.id, {
        status: 'error',
        error: outcome.error,
      })
      return
    }

    patchCall(aid, toolCall.id, { status: 'running' })

    const outcome = await executeSafeTool({
      tool,
      toolCall,
      context: { messages: state.messages, call: toolCall },
      emitter,
      lifecycle,
      validate: config.validateArgs,
      onPartial: (partial) => {
        patchCall(aid, toolCall.id, { result: partial })
      },
    })

    patchCall(aid, toolCall.id, {
      status: outcome.status === 'complete' ? 'complete' : 'error',
      result: outcome.result,
      error: outcome.error,
    })
  }

  const DEFAULT_MAX_TOOL_ITERATIONS = 5

  const isCallSettled = (status: ToolCall['status']): boolean =>
    status === 'complete' || status === 'error'

  const isCallPending = (status: ToolCall['status']): boolean =>
    status === 'pending' || status === 'running' || status === 'requires_confirmation'

  const run = async (aid: string, queryText: string, generation: number): Promise<boolean> => {
    await activate()
    const request = await buildAdapterRequest(config, state.messages, queryText, system, [...toolMap.values()])
    if (generation !== gen) return false
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
        setMsg(aid, message => ({ ...message, content: accumulated }))
      },
      onReasoning(accumulated) {
        setMsg(aid, message => ({
          ...message,
          metadata: { ...message.metadata, reasoning: accumulated },
        }))
      },
      async onToolCall(chunk) {
        await handleCall(aid, chunk)
      },
      onToolResult(content) {
        setMsg(aid, message => ({
          ...message,
          metadata: { ...message.metadata, toolResult: content },
        }))
      },
      onUsage(usage) {
        // Attach to this turn's assistant message + accumulate the session total.
        set(current => ({
          ...current,
          messages: current.messages.map(message =>
            message.id === aid
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
        setMsg(aid, message => ({ ...message, status: 'error' }))
        set(current => ({ ...current, status: 'error', error }))
        emitter.emit({ type: 'error', error })
        config.onError?.(error)
      },
      onDone(accumulatedText) {
        emitter.emit({ type: 'llm:end', content: accumulatedText, durationMs: Date.now() - streamStart })
      },
    })

    return generation === gen && !errored
  }

  const finalize = (aid: string) => {
    let completedMessage: Message | undefined
    set(current => ({
      ...current,
      messages: current.messages.map(message => {
        if (message.id !== aid) return message
        completedMessage = { ...message, status: 'complete' as const }
        return completedMessage
      }),
      status: 'idle',
      error: null,
    }))
    if (completedMessage) config.onMessage?.(completedMessage)
  }

  const appendToolResultsAndContinue = (aid: string, settledCalls: ToolCall[]): string => {
    const toolResultMessages = settledCalls.map(call =>
      buildMessage({
        role: 'tool',
        content: call.result ?? call.error ?? '',
        toolCallId: call.id,
      })
    )
    const nextAssistant = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

    set(current => ({
      ...current,
      messages: [
        ...current.messages.map(message =>
          message.id === aid ? { ...message, status: 'complete' as const } : message
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
   * Resume the agent loop after tool calls on `aid` have settled
   * (no new LLM turn has been issued yet). Used by both `startStream` and
   * `approve`/`deny` so the flow is identical whether tools auto-run or
   * wait for user confirmation.
   */
  const resume = async (aid: string, generation: number) => {
    const maxIterations = config.maxToolIterations ?? DEFAULT_MAX_TOOL_ITERATIONS
    let currentId = aid

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const assistant = state.messages.find(message => message.id === currentId)
      const calls = assistant?.toolCalls ?? []
      const hasPending = calls.some(call => isCallPending(call.status))
      const settled = calls.filter(call => isCallSettled(call.status))

      // Nothing to feed back, or something still awaiting confirmation —
      // stop here; the caller drives the next step.
      if (settled.length === 0 || hasPending) {
        finalize(currentId)
        return
      }

      currentId = appendToolResultsAndContinue(currentId, settled)
      const ok = await run(currentId, '', generation)
      if (!ok) return
    }

    finalize(currentId)
  }

  /**
   * Runs one `send` — an LLM turn, plus any follow-up turns needed to feed
   * completed tool results back to the model.
   */
  const startStream = async (aid: string, text: string, generation: number) => {
    const ok = await run(aid, text, generation)
    if (!ok) return
    await resume(aid, generation)
  }

  const controller: ChatController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async send(text) {
      if (!text.trim()) return
      gen++

      const userMessage = buildMessage({ role: 'user', content: text })
      const assistant = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

      set(current => ({
        ...current,
        messages: [...current.messages, userMessage, assistant],
        status: 'streaming',
        input: '',
        error: null,
      }))

      await startStream(assistant.id, text, gen)
    },
    stop() {
      gen++
      source?.abort()
      set(current => ({ ...current, status: 'idle' }))
    },
    async retry() {
      const messages = [...state.messages]
      if (messages.length < 2) return

      const lastAssistant = messages[messages.length - 1]
      const lastUser = messages[messages.length - 2]
      if (lastAssistant.role !== 'assistant' || lastUser.role !== 'user') return
      gen++

      const withoutLast = messages.slice(0, -1)
      const replacement = buildMessage({ role: 'assistant', content: '', status: 'streaming' })

      set(current => ({
        ...current,
        messages: [...withoutLast, replacement],
        status: 'streaming',
        error: null,
      }))

      await startStream(replacement.id, lastUser.content, gen)
    },
    async edit(messageId, newContent, opts = {}) {
      const messages = state.messages
      const index = messages.findIndex(m => m.id === messageId)
      if (index === -1) return

      const target = messages[index]

      // Assistant messages: in-place content edit, no regeneration.
      if (target.role !== 'user') {
        set(current => ({
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
        set(current => ({ ...current, messages: truncated }))
        return
      }

      gen++
      source?.abort()
      const replacement = buildMessage({
        role: 'assistant',
        content: '',
        status: 'streaming',
      })

      const nextMessages = [...truncated, replacement]
      set(current => ({
        ...current,
        messages: nextMessages,
        status: 'streaming',
        error: null,
      }))

      await startStream(replacement.id, newContent, gen)
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

      gen++
      source?.abort()
      const priorTurns = messages.slice(0, targetIndex)
      const replacement = buildMessage({
        role: 'assistant',
        content: '',
        status: 'streaming',
      })
      const nextMessages = [...priorTurns, replacement]

      set(current => ({
        ...current,
        messages: nextMessages,
        status: 'streaming',
        error: null,
      }))

      await startStream(replacement.id, messages[userIndex].content, gen)
    },
    setInput(value) {
      set(current => ({ ...current, input: value }))
    },
    setMessages(messages) {
      set(current => ({ ...current, messages }))
    },
    async clear() {
      await lifecycle.disposeAll()
      set(current => ({
        ...current,
        messages: [],
        status: 'idle',
        error: null,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      }))
      await config.memory?.clear?.()
    },
    proposeToolCall: p => import('./tool-proposal-internal.js').then(m => m.withAuthority(
      controller,
      p,
      n => [toolMap.get(n), config.validateArgs, config.onToolCall],
    )),
    async approve(tid) {
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === tid && tc.status === 'requires_confirmation')
      )
      const tc = msg?.toolCalls?.find(c => c.id === tid)
      if (!msg || !tc) return

      const tool = toolMap.get(tc.name)
      if (!tool?.execute) return

      patchCall(msg.id, tid, { status: 'running' })

      const outcome = await executeSafeTool({
        tool,
        toolCall: tc,
        context: { messages: state.messages, call: tc },
        emitter,
        lifecycle,
        validate: config.validateArgs,
        onPartial: (partial) => {
          patchCall(msg.id, tid, { result: partial })
        },
      })

      patchCall(msg.id, tid, {
        status: outcome.status === 'complete' ? 'complete' : 'error',
        result: outcome.result,
        error: outcome.error,
      })

      await resume(msg.id, gen)
    },
    async deny(tid, reason) {
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === tid && tc.status === 'requires_confirmation')
      )
      const tc = msg?.toolCalls?.find(c => c.id === tid)
      if (!msg || !tc) return

      patchCall(msg.id, tid, {
        status: 'error',
        error: `Permission denied: ${reason ?? 'user denied access'}`,
      })

      await resume(msg.id, gen)
    },
    updateConfig(nextConfig) {
      void lifecycle.disposeAll()
      config = { ...config, ...nextConfig }
      active = false
      rebuild()
      lifecycle = createToolLifecycle(toolMap)
      void activate()
      void hydrateMemory()
    },
  }
  return controller
}
