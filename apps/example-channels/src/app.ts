import { createChannelHandler, type Channel, type ChannelWebhookRequest } from '@agentskit/integrations'
import { createRuntime } from '@agentskit/runtime'
import type { AdapterFactory } from '@agentskit/core'

/** Demo adapter — swap for openai({}) / anthropic({}) etc. */
export function demoAdapter(): AdapterFactory {
  return {
    createSource: () => ({
      stream: async function* () {
        yield { type: 'text' as const, content: 'Hi from AgentsKit!' }
        yield { type: 'done' as const }
      },
      abort: () => {},
    }),
  }
}

/** Bind any channel (WhatsApp, Telegram, Slack, email) to one AgentsKit runtime. */
export function createChannelApp(channel: Channel, adapter: AdapterFactory = demoAdapter()) {
  const runtime = createRuntime({
    adapter,
    systemPrompt: `You are a helpful assistant answering on ${channel.name}.`,
  })
  return createChannelHandler(channel, {
    run: async (text) => (await runtime.run(text)).content,
  }) as (request: ChannelWebhookRequest) => ReturnType<ReturnType<typeof createChannelHandler>>
}
