import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createRuntime, createChatTrigger } from '@agentskit/runtime'
import type { AdapterFactory } from '@agentskit/core'
import { discordAdapter } from './adapter'

function demoAdapter(): AdapterFactory {
  return {
    createSource: () => ({
      stream: async function* () {
        yield { type: 'text' as const, content: 'Hi from AgentsKit on Discord!' }
        yield { type: 'done' as const }
      },
      abort: () => {},
    }),
  }
}

const runtime = createRuntime({
  adapter: demoAdapter(),
  systemPrompt: 'You are a helpful assistant in a Discord guild.',
})

const adapter = discordAdapter({
  botToken: process.env.DISCORD_BOT_TOKEN ?? '',
  publicKey: process.env.DISCORD_PUBLIC_KEY ?? '',
})

const trigger = createChatTrigger({
  adapter,
  agent: { name: 'discord-bot', run: async task => (await runtime.run(task)).content },
  autoReply: true,
  filter: e => !e.user.isBot,
  onEvent: e => console.log(`[discord] ${e.type}${e.reason ? ` — ${e.reason}` : ''}`),
})

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url !== '/discord/interactions' || req.method !== 'POST') {
    res.writeHead(404).end('not found')
    return
  }
  const raw = await readBody(req)
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k.toLowerCase()] = v
  }
  // Verify the Ed25519 signature BEFORE the PING handshake. Discord
  // explicitly requires PING validation — bots that skip it can be
  // hijacked at registration time.
  const verified = await adapter.verify!({ headers, body: raw })
  if (!verified) {
    res.writeHead(401).end('unauthorized')
    return
  }
  // After signature passes, PONG to the registration ping.
  try {
    const parsed = JSON.parse(raw)
    if (parsed.type === 1) {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ type: 1 }))
      return
    }
  } catch {
    // fall through
  }
  const result = await trigger.handler({ headers, body: raw })
  res.writeHead(result.status, result.headers).end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body))
})

const port = Number(process.env.PORT ?? 3001)
server.listen(port, () => {
  console.log(`Discord bot listening on :${port}/discord/interactions`)
})
