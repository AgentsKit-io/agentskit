import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createRuntime, createChatTrigger } from '@agentskit/runtime'
import type { AdapterFactory } from '@agentskit/core'
import { teamsAdapter, type TeamsServiceClient } from './adapter'

function demoAdapter(): AdapterFactory {
  return {
    createSource: () => ({
      stream: async function* () {
        yield { type: 'text' as const, content: 'Hi from AgentsKit on Teams!' }
        yield { type: 'done' as const }
      },
      abort: () => {},
    }),
  }
}

const runtime = createRuntime({
  adapter: demoAdapter(),
  systemPrompt: 'You are a helpful assistant in a Microsoft Teams channel.',
})

// Production: replace with botbuilder's `BotFrameworkAdapter.createConnectorClient(serviceUrl)`
// + `client.conversations.replyToActivity(...)`. The demo client logs.
const serviceClient: TeamsServiceClient = {
  async sendMessage({ conversationId, text }) {
    console.log(`[teams reply] ${conversationId}: ${text}`)
  },
}

// Production: replace with `botbuilder`'s `JwtTokenValidation` or any JWT lib
// validating against Microsoft Bot Framework's OpenID config.
const verifyToken = async (_token: string) => {
  if (process.env.TEAMS_DISABLE_AUTH === '1') return true
  console.warn('[teams] verifyToken stub returns false — wire JWT validation before going live')
  return false
}

const adapter = teamsAdapter({ serviceClient, verifyToken })

const trigger = createChatTrigger({
  adapter,
  agent: { name: 'teams-bot', run: async task => (await runtime.run(task)).content },
  autoReply: true,
  filter: e => e.user.id !== '',
  onEvent: e => console.log(`[teams] ${e.type}${e.reason ? ` — ${e.reason}` : ''}`),
})

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url !== '/api/messages' || req.method !== 'POST') {
    res.writeHead(404).end('not found')
    return
  }
  const raw = await readBody(req)
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k.toLowerCase()] = v
  }
  const result = await trigger.handler({ headers, body: raw })
  res.writeHead(result.status, result.headers).end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body))
})

const port = Number(process.env.PORT ?? 3978)
server.listen(port, () => {
  console.log(`Teams bot listening on :${port}/api/messages`)
})
