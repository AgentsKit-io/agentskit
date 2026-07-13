import { buildMessage as message, consumeStream, createEventEmitter, safeParseArgs, createToolLifecycle } from './primitives'
import { buildToolMap, activateSkills, auth, executeSafeTool as execute } from './agent-loop'
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
export function createChatController(initial: ChatConfig): ChatController {
  let config = initial
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
  let toolMap = buildToolMap(config.tools)
  let lifecycle = createToolLifecycle(toolMap)
  let hydrated = false
  let active = false
  let saving = false
  let queued: [Message[], ChatConfig['memory']] | undefined
  const authorize: NonNullable<ChatConfig['authorizeToolCall']> = async (call, context) => {
    const fn = config.authorizeToolCall
    const decision = fn ? await fn(call, context) : { allowed: true }
    return fn === config.authorizeToolCall && toolMap.get(call.name)?.execute === context.tool?.execute ? decision : { allowed: false }
  }

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
    void persist(state.messages)
    emit()
  }

  const persist = async (messages: Message[]) => {
    queued = [messages, config.memory]
    if (saving) return
    saving = true
    while (queued) {
      const [next, memory] = queued
      queued = undefined
      try {
        await memory?.save(next)
        if (memory) emitter.emit({ type: 'memory:save', messageCount: next.length })
      } catch {}
    }
    saving = false
  }

  const hydrate = async () => {
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

  void hydrate()

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

  const runTool = (tool: ToolDefinition | undefined, call: ToolCall, onPartial: (result: string) => void) => execute({
    tool,
    toolCall: call,
    context: { messages: state.messages, call },
    emitter,
    lifecycle,
    validate: config.validateArgs,
    authorize,
    onPartial,
  })

  const handleCall = async (aid: string, chunk: StreamChunk, g: number) => {
    const call = chunk.toolCall
    if (!call) return

    const tool = toolMap.get(call.name)
    const toolCall: ToolCall = {
      id: call.id,
      name: call.name,
      args: safeParseArgs(call.args),
      result: call.result,
      status: tool?.requiresConfirmation ? 'requires_confirmation' : 'pending',
    }

    await auth(authorize, toolCall, { messages: state.messages, tool, phase: 'propose' })
    if (g !== gen) return

    setMsg(aid, message => ({
      ...message,
      toolCalls: [...(message.toolCalls ?? []), toolCall],
    }))

    await config.onToolCall?.(toolCall, { messages: state.messages, tool })
    if (g !== gen) return

    // Handle requiresConfirmation: controller keeps existing behavior —
    // sets status to 'requires_confirmation' and waits for external confirmation
    if (tool?.requiresConfirmation) {
      if (call.result) {
        patchCall(aid, toolCall.id, {
          result: call.result,
          status: 'complete',
        })
      }
      return
    }

    if (tool?.execute) patchCall(aid, toolCall.id, { status: 'running' })

    const outcome = await runTool(tool, toolCall, partial => {
        if (g !== gen) return
        patchCall(aid, toolCall.id, { result: partial })
    })
    if (g !== gen) return

    patchCall(aid, toolCall.id, {
      status: outcome.status === 'complete' ? 'complete' : 'error',
      result: outcome.result,
      error: outcome.error,
    })
  }

  const run = async (aid: string, q: string, g: number): Promise<boolean> => {
    await activate()
    const request = await buildAdapterRequest(config, state.messages, q, system, [...toolMap.values()])
    if (g !== gen) return false
    source = config.adapter.createSource(request)

    const began = Date.now()
    let first = false
    emitter.emit({ type: 'llm:start', messageCount: request.messages.length })

    await consumeStream(source, {
      onText(text) {
        if (g !== gen) return; if (!first) {
          emitter.emit({ type: 'llm:first-token', latencyMs: Date.now() - began })
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
        if (g !== gen) return; await handleCall(aid, chunk, g)
      },
      onToolResult(content) {
        if (g !== gen) return; setMsg(aid, message => ({
          ...message,
          metadata: { ...message.metadata, toolResult: content },
        }))
      },
      onUsage(usage) {
        if (g !== gen) return
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
        if (g !== gen) return; gen++
        setMsg(aid, message => ({ ...message, status: 'error' }))
        set(current => ({ ...current, status: 'error', error }))
        emitter.emit({ type: 'error', error })
        config.onError?.(error)
      },
      onDone(text) {
        if (g !== gen) return; emitter.emit({ type: 'llm:end', content: text, durationMs: Date.now() - began })
      },
    })

    return g === gen
  }

  const finalize = (aid: string) => {
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
  }

  const continueTools = (aid: string, calls: ToolCall[]): string => {
    const results = calls.map(call =>
      message({
        role: 'tool',
        content: call.result ?? call.error ?? '',
        toolCallId: call.id,
      })
    )
    const nextA = message({ role: 'assistant', content: '', status: 'streaming' })

    set(current => ({
      ...current,
      messages: [
        ...current.messages.map(message =>
          message.id === aid ? { ...message, status: 'complete' as const } : message
        ),
        ...results,
        nextA,
      ],
      status: 'streaming',
      error: null,
    }))

    return nextA.id
  }

  /**
   * Resume the agent loop after tool calls on `aid` have settled
   * (no new LLM turn has been issued yet). Used by both `startStream` and
   * `approve`/`deny` so the flow is identical whether tools auto-run or
   * wait for user confirmation.
   */
  const resume = async (aid: string, g: number) => {
    let id = aid

    for (let remaining = config.maxToolIterations ?? 5; remaining > 0; remaining--) {
      const assistant = state.messages.find(message => message.id === id)
      const calls = assistant?.toolCalls ?? []
      const waits = calls.some(call => call.status !== 'complete' && call.status !== 'error')

      // Nothing to feed back, or something still awaiting confirmation —
      // stop here; the caller drives the next step.
      if (!calls.length || waits) {
        finalize(id)
        return
      }

      id = continueTools(id, calls)
      const ok = await run(id, '', g)
      if (!ok) return
    }

    finalize(id)
  }

  /**
   * Runs one `send` — an LLM turn, plus any follow-up turns needed to feed
   * completed tool results back to the model.
   */
  const start = async (aid: string, text: string, g: number) => {
    const ok = await run(aid, text, g)
    if (!ok) return
    await resume(aid, g)
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

      const user = message({ role: 'user', content: text })
      const assistant = message({ role: 'assistant', content: '', status: 'streaming' })

      set(current => ({
        ...current,
        messages: [...current.messages, user, assistant],
        status: 'streaming',
        input: '',
        error: null,
      }))

      await start(assistant.id, text, gen)
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

      const prior = messages.slice(0, -1)
      const rep = message({ role: 'assistant', content: '', status: 'streaming' })

      set(current => ({
        ...current,
        messages: [...prior, rep],
        status: 'streaming',
        error: null,
      }))

      await start(rep.id, lastUser.content, gen)
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

      await start(rep.id, newContent, gen)
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

      await start(rep.id, messages[ui].content, gen)
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
      n => [toolMap.get(n), config.validateArgs, config.onToolCall, authorize],
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

      const outcome = await runTool(tool, tc, partial => patchCall(msg.id, tid, { result: partial }))

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
      void activate()
      void hydrate()
    },
  }
  return controller
}
