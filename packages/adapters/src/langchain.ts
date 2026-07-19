import type { AdapterFactory, AdapterRequest, StreamChunk, StreamSource } from '@agentskit/core'
import { adapterErrorChunk, isAbortError } from './stream-errors'

type LangChainRunnable = {
  stream?: (input: unknown, config?: Record<string, unknown>) => AsyncIterable<unknown> | Promise<AsyncIterable<unknown>>
  streamEvents?: (input: unknown, config?: Record<string, unknown>) => AsyncIterable<Record<string, unknown>> | Promise<AsyncIterable<Record<string, unknown>>>
}

export interface LangChainConfig {
  runnable: LangChainRunnable
  mode?: 'stream' | 'events'
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'content' in value) {
    const content = (value as { content?: unknown }).content
    if (typeof content === 'string') return content
  }
  return ''
}

function isToolStartEvent(eventName: string): boolean {
  return eventName === 'on_tool_start' || eventName.endsWith('_tool_start')
}

export function langchain(config: LangChainConfig): AdapterFactory {
  const { runnable, mode = 'stream' } = config

  return {
    createSource: (request: AdapterRequest): StreamSource => {
      const controller = new AbortController()

      return {
        stream: async function* (): AsyncIterableIterator<StreamChunk> {
          if (controller.signal.aborted) return
          try {
            const runnableConfig: Record<string, unknown> = {
              version: 'v2',
              signal: controller.signal,
            }

            if (mode === 'events' && runnable.streamEvents) {
              const events = await runnable.streamEvents(
                { messages: request.messages },
                runnableConfig,
              )

              for await (const event of events) {
                if (controller.signal.aborted) return
                const eventName = String(event.event ?? '')
                if (eventName.endsWith('_stream')) {
                  const chunk = asText(event.data)
                  if (chunk) yield { type: 'text', content: chunk }
                } else if (isToolStartEvent(eventName) && event.name) {
                  // Only genuine tool-start events — not chain/model starts.
                  yield {
                    type: 'tool_call',
                    toolCall: {
                      id: String(event.run_id ?? `${event.name}-${Date.now()}`),
                      name: String(event.name),
                      args: JSON.stringify(event.data ?? {}),
                    },
                  }
                }
              }
            } else if (runnable.stream) {
              const stream = await runnable.stream(
                { messages: request.messages },
                runnableConfig,
              )
              for await (const value of stream) {
                if (controller.signal.aborted) return
                const chunk = asText(value)
                if (chunk) yield { type: 'text', content: chunk }
              }
            } else {
              yield adapterErrorChunk('Runnable does not implement stream() or streamEvents()')
              return
            }

            if (controller.signal.aborted) return
            yield { type: 'done' }
          } catch (error) {
            // Abort should terminate quietly (no error chunk).
            if (isAbortError(error) || controller.signal.aborted) return
            const message = error instanceof Error ? error.message : String(error)
            yield adapterErrorChunk(message, { cause: error })
          }
        },
        abort: () => {
          controller.abort()
        },
      }
    },
  }
}

export interface LangGraphConfig {
  graph: LangChainRunnable
}

export function langgraph(config: LangGraphConfig): AdapterFactory {
  return langchain({
    runnable: config.graph,
    mode: 'events',
  })
}
