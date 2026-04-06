import {
  buildMessage,
  consumeStream,
  createEventEmitter,
  executeToolCall,
  safeParseArgs,
  createToolLifecycle,
  formatRetrievedDocuments,
} from '@agentskit/core'
import type {
  AdapterRequest,
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition,
} from '@agentskit/core'
import type { RuntimeConfig, RunOptions, RunResult } from './types'
import { buildDelegateTools } from './delegates'

export function createRuntime(config: RuntimeConfig) {
  const emitter = createEventEmitter()

  for (const observer of config.observers ?? []) {
    emitter.addObserver(observer)
  }

  const maxDelegationDepth = config.maxDelegationDepth ?? 3

  async function runInternal(
    task: string,
    options: RunOptions | undefined,
    depth: number,
  ): Promise<RunResult> {
    const startTime = Date.now()

    const maxSteps = options?.maxSteps ?? config.maxSteps ?? 10
    const signal = options?.signal

    // Activate skill if provided
    let skillTools: ToolDefinition[] = []
    let systemPrompt = options?.systemPrompt ?? config.systemPrompt ?? ''

    if (options?.skill) {
      systemPrompt = options.skill.systemPrompt
      if (options.skill.onActivate) {
        const activation = await options.skill.onActivate()
        skillTools = activation.tools ?? []
      }
    }

    // Merge tools: config < options < skill (last wins on name collision)
    const toolMap = new Map<string, ToolDefinition>()
    for (const tool of config.tools ?? []) toolMap.set(tool.name, tool)
    for (const tool of options?.tools ?? []) toolMap.set(tool.name, tool)
    for (const tool of skillTools) toolMap.set(tool.name, tool)

    // Merge delegates: config < options (last wins on name collision)
    const mergedDelegates = {
      ...(config.delegates ?? {}),
      ...(options?.delegates ?? {}),
    }

    // Generate delegate tools if within depth limit
    if (Object.keys(mergedDelegates).length > 0 && depth < maxDelegationDepth) {
      const delegateTools = buildDelegateTools(
        mergedDelegates,
        async (name, delegateConfig, delegateTask) => {
          emitter.emit({ type: 'agent:delegate:start', name, task: delegateTask, depth: depth + 1 })
          const delegateStart = Date.now()

          // Use delegate's adapter if provided, otherwise parent's
          const childRuntime = delegateConfig.adapter
            ? createRuntime({ ...config, adapter: delegateConfig.adapter })
            : { run: (t: string, o?: RunOptions) => runInternal(t, o, depth + 1) }

          const childOptions: RunOptions = {
            skill: delegateConfig.skill,
            tools: delegateConfig.tools,
            maxSteps: delegateConfig.maxSteps ?? 5,
            signal,
          }

          const result = await childRuntime.run(delegateTask, childOptions)

          emitter.emit({
            type: 'agent:delegate:end',
            name,
            result: result.content,
            durationMs: Date.now() - delegateStart,
            depth: depth + 1,
          })

          return result
        },
      )
      for (const tool of delegateTools) toolMap.set(tool.name, tool)
    }

    const tools = [...toolMap.values()]
    const lifecycle = createToolLifecycle(toolMap)

    // Build initial messages
    const messages: Message[] = []

    if (systemPrompt) {
      messages.push(buildMessage({ role: 'system', content: systemPrompt }))
    }

    messages.push(buildMessage({ role: 'user', content: task }))

    const allToolCalls: ToolCall[] = []
    let step = 0
    let finalContent = ''

    try {
      while (step < maxSteps) {
        if (signal?.aborted) break

        step++
        emitter.emit({ type: 'agent:step', step, action: step === 1 ? 'initial' : 'tool-result-loop' })

        // Retrieve context if configured
        const retrievedDocuments = config.retriever
          ? await config.retriever.retrieve({ query: task, messages })
          : []
        const retrievalContext = formatRetrievedDocuments(retrievedDocuments)

        const requestMessages = retrievalContext
          ? [buildMessage({ role: 'system', content: `Use the retrieved context below when it is relevant.\n\n${retrievalContext}` }), ...messages]
          : messages

        const request: AdapterRequest = {
          messages: requestMessages,
          context: {
            systemPrompt,
            temperature: options?.skill?.temperature ?? config.temperature,
            maxTokens: config.maxTokens,
            tools,
            metadata: retrievedDocuments.length > 0 ? { retrievedDocuments } : undefined,
          },
        }

        const streamStart = Date.now()
        const source = config.adapter.createSource(request)
        emitter.emit({ type: 'llm:start', messageCount: request.messages.length })

        let accumulatedText = ''
        const stepToolCalls: Array<{ toolCall: StreamChunk['toolCall'] }> = []
        let streamError: Error | null = null

        await consumeStream(source, {
          onText(accumulated) {
            accumulatedText = accumulated
          },
          async onToolCall(chunk) {
            if (chunk.toolCall) {
              stepToolCalls.push({ toolCall: chunk.toolCall })
            }
          },
          onError(error) {
            streamError = error
          },
          onDone(accumulated) {
            accumulatedText = accumulated
          },
        })

        emitter.emit({
          type: 'llm:end',
          content: accumulatedText,
          durationMs: Date.now() - streamStart,
        })

        if (streamError) {
          emitter.emit({ type: 'error', error: streamError })
          throw streamError
        }

        if (signal?.aborted) break

        // Build assistant message with tool calls
        const assistantToolCalls: ToolCall[] = stepToolCalls.map(({ toolCall }) => ({
          id: toolCall!.id,
          name: toolCall!.name,
          args: safeParseArgs(toolCall!.args),
          status: 'pending' as const,
        }))

        const assistantMessage = buildMessage({
          role: 'assistant',
          content: accumulatedText,
          status: 'complete',
        })
        if (assistantToolCalls.length > 0) {
          assistantMessage.toolCalls = assistantToolCalls
        }
        messages.push(assistantMessage)

        // No tool calls → agent is done
        if (assistantToolCalls.length === 0) {
          finalContent = accumulatedText
          break
        }

        // Execute all tool calls sequentially (including delegates)
        for (const toolCall of assistantToolCalls) {
          if (signal?.aborted) break

          const tool = toolMap.get(toolCall.name)
          allToolCalls.push(toolCall)

          if (!tool?.execute) {
            const errorMsg = `Tool "${toolCall.name}" not found or has no execute function`
            toolCall.status = 'error'
            toolCall.error = errorMsg
            messages.push(buildMessage({ role: 'tool', content: errorMsg }))
            emitter.emit({ type: 'error', error: new Error(errorMsg) })
            continue
          }

          // Lazy init for non-delegate tools
          if (!toolCall.name.startsWith('delegate_')) {
            await lifecycle.init(tool)
          }

          emitter.emit({ type: 'tool:start', name: toolCall.name, args: toolCall.args })
          const toolStart = Date.now()

          try {
            const result = await executeToolCall(
              tool,
              toolCall.args,
              { messages, call: toolCall },
              (partial) => {
                toolCall.result = partial
              },
            )
            toolCall.status = 'complete'
            toolCall.result = result
            messages.push(buildMessage({ role: 'tool', content: result }))
            emitter.emit({
              type: 'tool:end',
              name: toolCall.name,
              result,
              durationMs: Date.now() - toolStart,
            })
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            toolCall.status = 'error'
            toolCall.error = errorMsg
            messages.push(buildMessage({ role: 'tool', content: `Error: ${errorMsg}` }))
            emitter.emit({
              type: 'tool:end',
              name: toolCall.name,
              result: `Error: ${errorMsg}`,
              durationMs: Date.now() - toolStart,
            })
          }
        }

        finalContent = accumulatedText
      }

      // Save to memory if configured
      if (config.memory) {
        await config.memory.save(messages)
        emitter.emit({ type: 'memory:save', messageCount: messages.length })
      }

      return {
        content: finalContent,
        messages,
        steps: step,
        toolCalls: allToolCalls,
        durationMs: Date.now() - startTime,
      }
    } finally {
      await lifecycle.disposeAll()
    }
  }

  return {
    run(task: string, options?: RunOptions): Promise<RunResult> {
      return runInternal(task, options, 0)
    },
  }
}
