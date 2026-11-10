import { vercelAI } from '@agentskit/adapters'
import { createChatController, type ChatController } from '@agentskit/core'
import { stepCountIs, streamText, tool, type LanguageModel } from 'ai'
import { z } from 'zod'

export interface RouteRecorder {
  toolCalls: Array<{ city: string }>
}

/**
 * The server half: a Vercel AI SDK route that runs the model (with a tool)
 * and answers in the UI Message Stream protocol. Swap `model` for a real
 * provider in production; nothing else changes.
 */
export function createChatRoute(model: LanguageModel, recorder: RouteRecorder) {
  return async (request: Request): Promise<Response> => {
    const body = (await request.json()) as { messages: Array<{ role: string; content: string }> }
    const result = streamText({
      model,
      stopWhen: stepCountIs(3),
      messages: body.messages.map(message => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
      tools: {
        weather: tool({
          description: 'Look up the weather for a city',
          inputSchema: z.object({ city: z.string() }),
          execute: async ({ city }) => {
            recorder.toolCalls.push({ city })
            return { city, forecast: 'sunny' }
          },
        }),
      },
    })
    return result.toUIMessageStreamResponse()
  }
}

/** The client half: the AgentsKit `vercelAI` adapter pointed at that route. */
export function createVercelChat(api: string): ChatController {
  return createChatController({ adapter: vercelAI({ api }) })
}
