import {
  buildMessage,
  consumeStream,
  createEventEmitter,
  safeParseArgs,
  createToolLifecycle,
  formatRetrievedDocuments,
  buildToolMap,
  activateSkills,
  executeSafeTool,
} from '@agentskit/core'
import type {
  AdapterRequest,
  Message,
  StreamChunk,
  ToolCall,
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

    // Activate skill: use skill's systemPrompt directly, activate tools via shared helper
    let effectiveSystemPrompt = options?.systemPrompt ?? config.systemPrompt ?? ''
    let skillTools: import('@agentskit/core').ToolDefinition[] = []

    if (options?.skill) {
      effectiveSystemPrompt = options.skill.systemPrompt
      const activation = await activateSkills([options.skill])
      skillTools = activation.skillTools
    }

    // Build tool map using shared helper
    const toolMap = buildToolMap(config.tools, options?.tools, skillTools)

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

          const childRuntime = delegateConfig.adapter
            ? createRuntime({ ...config, adapter: delegateConfig.adapter })
            : { run: (t: string, o?: RunOptions) => runInternal(t, o, depth + 1) }

          const childOptions: RunOptions = {
            skill: delegateConfig.skill,
            tools: delegateConfig.tools,
            maxSteps: delegateConfig.maxSteps ?? 5,
            signal,
            sharedContext: options?.sharedContext,
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

    if (effectiveSystemPrompt) {
      messages.push(buildMessage({ role: 'system', content: effectiveSystemPrompt }))
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
            systemPrompt: effectiveSystemPrompt,
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
        const assistantToolCalls: ToolCall[] = stepToolCalls
          .map(({ toolCall }) => toolCall)
          .filter((tc): tc is NonNullable<typeof tc> => tc != null)
          .map(tc => ({
            id: tc.id,
            name: tc.name,
            args: safeParseArgs(tc.args),
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

        // Execute all tool calls using shared executeSafeTool
        for (const toolCall of assistantToolCalls) {
          if (signal?.aborted) break

          const tool = toolMap.get(toolCall.name)
          allToolCalls.push(toolCall)

          const execResult = await executeSafeTool({
            tool,
            toolCall,
            context: { messages, call: toolCall },
            emitter,
            lifecycle,
            validate: config.validateArgs,
            onPartial: (partial) => { toolCall.result = partial },
            onConfirm: config.onConfirm,
          })

          toolCall.status = execResult.status === 'complete' ? 'complete' : 'error'
          if (execResult.status === 'complete') {
            toolCall.result = execResult.result
            messages.push(buildMessage({ role: 'tool', content: execResult.result ?? '' }))
          } else if (execResult.status === 'skipped') {
            toolCall.status = 'error'
            toolCall.error = execResult.result
            messages.push(buildMessage({ role: 'tool', content: execResult.result ?? 'Tool execution skipped' }))
          } else {
            toolCall.error = execResult.error
            messages.push(buildMessage({ role: 'tool', content: `Error: ${execResult.error}` }))
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
