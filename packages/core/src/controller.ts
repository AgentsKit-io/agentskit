import { buildMessage as message, consumeStream, createEventEmitter, generateId, createToolLifecycle } from './primitives'
import { buildToolMap, activateSkills, executeSafeTool as execute } from './agent-loop'
import { createControllerPersistence } from './controller-persistence'
import { handleControllerToolCall } from './controller-tool-call'
import {
  accumulateUsage,
  buildAdapterRequest,
  buildToolContinuation,
  mapMessageById,
  mapToolCallById,
  normalizeLlmUsage,
  sameToolLifecycle,
} from './controller-helpers'
import type {
  ChatConfig,
  ChatController,
  ChatState,
  Message,
  StreamChunk,
  StreamSource,
  ToolCall,
  ToolDefinition,
  AgentEvent,
  AgentEventContext,
} from './types'
export function createChatController(initial: ChatConfig): ChatController {
  let config = initial
  const controllerCorrelation: AgentEventContext = initial.correlation ?? { operationId: generateId('operation') }
  let activeCorrelation: AgentEventContext = controllerCorrelation
  let system = config.systemPrompt
  let source: StreamSource | undefined
  let gen = 0
  let state: ChatState = {
    messages: initial.initialMessages ?? [],
    status: 'idle',
    input: '',
    error: null,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  }
  const listeners = new Set<() => void>()
  const emitter = createEventEmitter()
  const emitEvent = (event: AgentEvent, correlation = activeCorrelation) => emitter.emit({ ...event, correlation })
  const beginRun = (): AgentEventContext => {
    activeCorrelation = { ...controllerCorrelation, runId: generateId('run') }
    return activeCorrelation
  }
  let toolMap = buildToolMap(config.tools)
  let lifecycle = createToolLifecycle(toolMap)
  let skillTools: ToolDefinition[] = []
  const approvalGenerations = new Map<string, number>()
  let hydrated = false
  let active = false
  const authorize: NonNullable<ChatConfig['authorizeToolCall']> = async (call, context) => {
    const fn = config.authorizeToolCall
    const decision = fn ? await fn(call, context) : { allowed: true }
    return fn === config.authorizeToolCall && toolMap.get(call.name)?.execute === context.tool?.execute ? decision : { allowed: false }
  }
  const rebuild = () => {
    const nextToolMap = buildToolMap(config.tools, skillTools)
    if (!sameToolLifecycle(toolMap, nextToolMap)) {
      const previousLifecycle = lifecycle
      lifecycle = createToolLifecycle(nextToolMap)
      void previousLifecycle.disposeAll()
    }
    toolMap = nextToolMap
  }
  const activate = async () => {
    if (active) return
    active = true
    const result = await activateSkills(config.skills ?? [], config.systemPrompt)
    system = result.systemPrompt
    skillTools = result.skillTools
    rebuild()
  }
  for (const observer of config.observers ?? []) {
    emitter.addObserver(observer)
  }
  const emit = () => {
    for (const listener of listeners) listener()
  }
  const set = (updater: ChatState | ((current: ChatState) => ChatState)) => {
    state = typeof updater === 'function' ? updater(state) : updater
    emit()
  }
  const reportBackgroundError = (cause: unknown) => {
    const error = cause instanceof Error ? cause : new Error(String(cause))
    state = { ...state, status: 'error', error }
    emit()
    emitEvent({ type: 'error', error })
    config.onError?.(error)
  }
  void activate().catch(error => {
    active = false
    reportBackgroundError(error)
  })
  const persistence = createControllerPersistence(
    () => config.memory,
    {
      onSave: (messageCount, correlation) => emitEvent({ type: 'memory:save', messageCount }, correlation),
      onError: error => {
        state = { ...state, status: 'error', error }
        emit()
        emitEvent({ type: 'error', error })
        config.onError?.(error)
      },
    },
  )
  const persist = persistence.save
  const hydrate = async () => {
    if (hydrated || !config.memory) return
    hydrated = true
    try {
      const loaded = await persistence.load()
      if (loaded.length > 0 && state.messages.length === 0) {
        state = { ...state, messages: loaded }
        emitEvent({ type: 'memory:load', messageCount: loaded.length }, controllerCorrelation)
        emit()
      }
    } catch (cause) {
      hydrated = false
      reportBackgroundError(cause)
    }
  }
  void hydrate()
  const setMsg = (aid: string, updater: (message: Message) => Message) => {
    set(current => ({
      ...current,
      messages: mapMessageById(current.messages, aid, updater),
    }))
  }
  const patchCall = (aid: string, tid: string, patch: Partial<ToolCall>) => {
    set(current => ({
      ...current,
      messages: mapToolCallById(current.messages, aid, tid, patch),
    }))
  }
  const runTool = (
    tool: ToolDefinition | undefined,
    call: ToolCall,
    onPartial: (result: string) => void,
    expectedGeneration = gen,
    correlation: AgentEventContext = activeCorrelation,
  ) => execute({
    tool,
    toolCall: call,
    context: { messages: state.messages, call },
    emitter,
    lifecycle,
    validate: config.validateArgs,
    authorize: async (toolCall, context) => {
      if (expectedGeneration !== gen) return { allowed: false, reason: 'Tool execution superseded by a newer controller generation' }
      const decision = await authorize(toolCall, context)
      return expectedGeneration === gen
        ? decision
        : { allowed: false, reason: 'Tool execution superseded by a newer controller generation' }
    },
    onPartial,
    correlation,
  })
  const run = async (aid: string, q: string, g: number, correlation: AgentEventContext): Promise<boolean> => {
    await activate()
    const request = await buildAdapterRequest(config, state.messages, q, system, [...toolMap.values()], correlation)
    if (g !== gen) return false
    source = config.adapter.createSource(request)
    const began = Date.now()
    let first = false
    let turnUsage: { promptTokens: number; completionTokens: number } | undefined
    emitEvent({ type: 'llm:start', messageCount: request.messages.length }, correlation)
    await consumeStream(source, {
      onText(text) {
        if (g !== gen) return; if (!first) {
          emitEvent({ type: 'llm:first-token', latencyMs: Date.now() - began }, correlation)
          first = true
        }
        setMsg(aid, message => ({ ...message, content: text }))
      },
      onReasoning(text) {
        if (g !== gen) return; setMsg(aid, message => ({
          ...message,
          metadata: { ...message.metadata, reasoning: text },
        }))
      },
      async onToolCall(chunk) {
        if (g !== gen) return
        await handleControllerToolCall({
          assistantId: aid,
          chunk,
          isCurrentGeneration: () => g === gen,
          toolMap,
          messages: state.messages,
          onToolCall: config.onToolCall,
          authorize,
          emitter,
          setMessage: setMsg,
          patchCall,
          runTool,
          correlation,
          registerToolCall: id => approvalGenerations.set(id, g),
        })
      },
      onToolResult(content) {
        if (g !== gen) return; setMsg(aid, message => ({
          ...message,
          metadata: { ...message.metadata, toolResult: content },
        }))
      },
      onUsage(usage) {
        if (g !== gen) return
        // Per-turn usage for llm:end (last chunk wins; adapters emit totals once).
        const normalized = normalizeLlmUsage(usage)
        if (normalized) turnUsage = normalized
        // Attach to this turn's assistant message + accumulate the session total.
        set(current => ({
          ...current,
          messages: mapMessageById(current.messages, aid, m => ({
            ...m,
            metadata: { ...m.metadata, usage },
          })),
          usage: accumulateUsage(current.usage, usage),
        }))
      },
      onError(error) {
        if (g !== gen) return; gen++
        setMsg(aid, message => ({ ...message, status: 'error' }))
        set(current => ({ ...current, status: 'error', error }))
        emitEvent({ type: 'error', error }, correlation)
        config.onError?.(error)
      },
      onDone(text) {
        if (g !== gen) return
        emitEvent({
          type: 'llm:end',
          content: text,
          ...(turnUsage ? { usage: turnUsage } : {}),
          durationMs: Date.now() - began,
        }, correlation)
      },
    })
    return g === gen
  }

  const finalize = async (aid: string, shouldPersist = true) => {
    let done: Message | undefined
    set(current => ({
      ...current,
      messages: current.messages.map(message => {
        if (message.id !== aid) return message
        done = { ...message, status: 'complete' as const }
        return done
      }),
      status: 'idle',
      error: null,
    }))
    if (done) config.onMessage?.(done)
    if (done && shouldPersist) await persist(state.messages, activeCorrelation)
  }

  const continueTools = (aid: string, calls: ToolCall[]): string => {
    let nextId = ''
    set(current => {
      const { messages: next, nextAssistantId } = buildToolContinuation(
        current.messages,
        aid,
        calls,
        message,
      )
      nextId = nextAssistantId
      return {
        ...current,
        messages: next,
        status: 'streaming',
        error: null,
      }
    })
    return nextId
  }

  /**
   * Resume the agent loop after tool calls on `aid` have settled
   * (no new LLM turn has been issued yet). Used by both `startStream` and
   * `approve`/`deny` so the flow is identical whether tools auto-run or
   * wait for user confirmation.
   */
  const resume = async (aid: string, g: number, correlation: AgentEventContext) => {
    let id = aid

    for (let remaining = config.maxToolIterations ?? 5; remaining > 0; remaining--) {
      const assistant = state.messages.find(message => message.id === id)
      const calls = assistant?.toolCalls ?? []
      const waits = calls.some(call => call.status !== 'complete' && call.status !== 'error')

      // Nothing to feed back, or something still awaiting confirmation —
      // stop here; the caller drives the next step.
      if (!calls.length || waits) {
        await finalize(id, !waits)
        return
      }

      id = continueTools(id, calls)
      const ok = await run(id, '', g, correlation)
      if (!ok) return
    }

    await finalize(id)
  }

  /**
   * Runs one `send` — an LLM turn, plus any follow-up turns needed to feed
   * completed tool results back to the model.
   */
  const start = async (aid: string, text: string, g: number, correlation: AgentEventContext) => {
    const ok = await run(aid, text, g, correlation)
    if (!ok) return
    await resume(aid, g, correlation)
  }

  const controller: ChatController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    async send(text) {
      if (!text.trim()) return
      if (state.status === 'streaming') controller.stop()
      gen++
      const correlation = beginRun()

      const user = message({ role: 'user', content: text })
      const assistant = message({ role: 'assistant', content: '', status: 'streaming' })

      set(current => ({
        ...current,
        messages: [...current.messages, user, assistant],
        status: 'streaming',
        input: '',
        error: null,
      }))

      await start(assistant.id, text, gen, correlation)
    },
    stop() {
      gen++
      source?.abort()
      const stopped = state.messages.filter(message => message.status === 'streaming')
      set(current => ({ ...current, messages: current.messages.map(message => message.status === 'streaming' ? { ...message, status: 'complete' as const } : message), status: 'idle' }))
      stopped.forEach(message => config.onMessage?.({ ...message, status: 'complete' }))
    },
    async retry() {
      const messages = [...state.messages]
      if (messages.length < 2) return

      const last = messages[messages.length - 1]
      const lastUser = messages[messages.length - 2]
      if (last.role !== 'assistant' || lastUser.role !== 'user') return
      gen++
      const correlation = beginRun()

      const prior = messages.slice(0, -1)
      const rep = message({ role: 'assistant', content: '', status: 'streaming' })

      set(current => ({
        ...current,
        messages: [...prior, rep],
        status: 'streaming',
        error: null,
      }))

      await start(rep.id, lastUser.content, gen, correlation)
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
      const correlation = beginRun()
      const rep = message({
        role: 'assistant',
        content: '',
        status: 'streaming',
      })

      const next = [...truncated, rep]
      set(current => ({
        ...current,
        messages: next,
        status: 'streaming',
        error: null,
      }))

      await start(rep.id, newContent, gen, correlation)
    },
    async regenerate(messageId) {
      const messages = state.messages
      if (messages.length < 2) return

      // Find the target assistant message.
      let idx: number
      if (messageId) {
        idx = messages.findIndex(m => m.id === messageId && m.role === 'assistant')
        if (idx === -1) return
      } else {
        idx = messages.length - 1
        if (messages[idx].role !== 'assistant') return
      }

      // The preceding user message drives the regeneration.
      let ui = idx - 1
      while (ui >= 0 && messages[ui].role !== 'user') ui--
      if (ui < 0) return

      gen++
      source?.abort()
      const correlation = beginRun()
      const prior = messages.slice(0, idx)
      const rep = message({
        role: 'assistant',
        content: '',
        status: 'streaming',
      })
      const next = [...prior, rep]

      set(current => ({
        ...current,
        messages: next,
        status: 'streaming',
        error: null,
      }))

      await start(rep.id, messages[ui].content, gen, correlation)
    },
    setInput(value) {
      set(current => ({ ...current, input: value }))
    },
    setMessages(messages) {
      set(current => ({ ...current, messages }))
    },
    async clear() {
      gen++
      source?.abort()
      const previousLifecycle = lifecycle
      lifecycle = createToolLifecycle(toolMap)
      set(current => ({
        ...current,
        messages: [],
        status: 'idle',
        error: null,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      }))
      await Promise.all([previousLifecycle.disposeAll(), persistence.clear()])
    },
    proposeToolCall: p => {
      const existing = state.messages.some(message => message.toolCalls?.some(call => call.id === p.id))
      const proposalGeneration = gen
      if (!existing) approvalGenerations.set(p.id, proposalGeneration)
      return import('./tool-proposal-internal.js').then(m => m.withAuthority(
        controller,
        p,
        n => [toolMap.get(n), config.validateArgs, config.onToolCall, authorize],
      )).then(call => {
        if (call.status !== 'requires_confirmation') approvalGenerations.delete(call.id)
        return call
      })
    },
    async approve(tid) {
      const approvalGeneration = approvalGenerations.get(tid)
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === tid && tc.status === 'requires_confirmation')
      )
      const tc = msg?.toolCalls?.find(c => c.id === tid)
      if (!msg || !tc || approvalGeneration === undefined || approvalGeneration !== gen) {
        approvalGenerations.delete(tid)
        return
      }

      const tool = toolMap.get(tc.name)
      if (!tool?.execute) return

      patchCall(msg.id, tid, { status: 'running' })

      const outcome = await runTool(
        { ...tool, requiresConfirmation: false },
        tc,
        partial => {
          if (approvalGeneration === gen) patchCall(msg.id, tid, { result: partial })
        },
        approvalGeneration,
        activeCorrelation,
      )
      if (approvalGeneration !== gen) return

      patchCall(msg.id, tid, {
        status: outcome.status === 'complete' ? 'complete' : 'error',
        result: outcome.result,
        error: outcome.error,
      })
      approvalGenerations.delete(tid)

      await resume(msg.id, approvalGeneration, activeCorrelation)
    },
    async deny(tid, reason) {
      const denialGeneration = approvalGenerations.get(tid)
      const msg = state.messages.find(m =>
        m.toolCalls?.some(tc => tc.id === tid && tc.status === 'requires_confirmation')
      )
      const tc = msg?.toolCalls?.find(c => c.id === tid)
      if (!msg || !tc || denialGeneration === undefined || denialGeneration !== gen) {
        approvalGenerations.delete(tid)
        return
      }

      patchCall(msg.id, tid, {
        status: 'error',
        error: `Permission denied: ${reason ?? 'user denied access'}`,
      })
      approvalGenerations.delete(tid)

      if (denialGeneration === gen) await resume(msg.id, denialGeneration, activeCorrelation)
    },
    updateConfig(nextConfig) {
      config = { ...config, ...nextConfig }
      active = false
      rebuild()
      void activate().catch(reportBackgroundError)
      void hydrate()
    },
  }
  return controller
}
