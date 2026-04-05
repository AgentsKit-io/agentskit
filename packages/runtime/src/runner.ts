import {
  buildMessage,
  consumeStream,
  createEventEmitter,
  executeToolCall,
  generateId,
} from '@agentskit/core'
import type {
  AdapterRequest,
  Message,
  StreamChunk,
  ToolCall,
  ToolDefinition,
} from '@agentskit/core'
import type { RuntimeConfig, RunOptions, RunResult } from './types'

function safeParseArgs(args: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(args)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export function createRuntime(config: RuntimeConfig) {
  const emitter = createEventEmitter()

  for (const observer of config.observers ?? []) {
    emitter.addObserver(observer)
  }

  return {
    async run(task: string, options?: RunOptions): Promise<RunResult> {
      const startTime = Date.now()

      // Resolve effective config
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
      const tools = [...toolMap.values()]

      // Lazy init tracking
      const initialized = new Set<string>()

      const initTool = async (tool: ToolDefinition) => {
        if (tool.init && !initialized.has(tool.name)) {
          await tool.init()
          initialized.add(tool.name)
        }
      }

      const disposeAll = async () => {
        for (const name of initialized) {
          const tool = toolMap.get(name)
          try {
            await tool?.dispose?.()
          } catch {
            // Dispose errors should not propagate
          }
        }
      }

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
          if (signal?.aborted) {
            break
          }

          step++
          emitter.emit({ type: 'agent:step', step, action: step === 1 ? 'initial' : 'tool-result-loop' })

          // Build adapter request
          const request: AdapterRequest = {
            messages,
            context: {
              systemPrompt,
              temperature: options?.skill?.temperature ?? config.temperature,
              maxTokens: config.maxTokens,
              tools,
            },
          }

          // Call adapter
          const streamStart = Date.now()
          const source = config.adapter.createSource(request)
          emitter.emit({ type: 'llm:start', messageCount: messages.length })

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

          if (signal?.aborted) {
            break
          }

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

          // Execute each tool call and inject results
          for (const toolCall of assistantToolCalls) {
            if (signal?.aborted) break

            const tool = toolMap.get(toolCall.name)
            allToolCalls.push(toolCall)

            if (!tool?.execute) {
              // No executor — inject error as tool result
              const errorMsg = `Tool "${toolCall.name}" not found or has no execute function`
              toolCall.status = 'error'
              toolCall.error = errorMsg
              messages.push(buildMessage({ role: 'tool', content: errorMsg }))
              emitter.emit({ type: 'error', error: new Error(errorMsg) })
              continue
            }

            // Lazy init
            await initTool(tool)

            emitter.emit({ type: 'tool:start', name: toolCall.name, args: toolCall.args })
            const toolStart = Date.now()

            try {
              const result = await executeToolCall(tool, toolCall.args, {
                messages,
                call: toolCall,
              })
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
              // Inject error as tool result — let LLM decide what to do
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

          // After last iteration with tool calls, if we hit maxSteps next loop will break
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
        await disposeAll()
      }
    },
  }
}
