import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createRuntime } from '@agentskit/runtime'
import { createChatTrigger } from '@agentskit/runtime'
import type { AdapterFactory } from '@agentskit/core'
import { slackAdapter } from './adapter'

// --- Demo adapter — swap for openai({}) / anthropic({}) etc. ---

function demoAdapter(): AdapterFactory {
  return {
    createSource: () => ({
      stream: async function* () {
        yield { type: 'text' as const, content: 'Hi from AgentsKit on Slack!' }
        yield { type: 'done' as const }
      },
      abort: () => {},
    }),
  }
}

// --- Wire trigger ---

const runtime = createRuntime({
  adapter: demoAdapter(),
  systemPrompt: 'You are a helpful assistant in a Slack workspace.',
})

const adapter = slackAdapter({
  botToken: process.env.SLACK_BOT_TOKEN ?? '',
  signingSecret: process.env.SLACK_SIGNING_SECRET ?? '',
})

const trigger = createChatTrigger({
  adapter,
  agent: { name: 'slack-bot', run: async task => (await runtime.run(task)).content },
  autoReply: true,
  filter: e => !e.user.isBot,
  onEvent: e => console.log(`[slack] ${e.type}${e.reason ? ` — ${e.reason}` : ''}`),
})

// --- Minimal HTTP server ---

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url !== '/slack/events' || req.method !== 'POST') {
    res.writeHead(404).end('not found')
    return
  }
  const raw = await readBody(req)
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k.toLowerCase()] = v
  }
  // Verify the Slack signature BEFORE handling URL-verification.
  // Skipping the check on PING would let any unauthenticated client
  // confirm the endpoint is live and shaped correctly.
  const verified = await adapter.verify!({ headers, body: raw })
  if (!verified) {
    res.writeHead(401).end('unauthorized')
    return
  }
  // After signature passes, peel off the URL-verification handshake;
  // Slack expects the raw `challenge` echoed back synchronously.
  try {
    const parsed = JSON.parse(raw)
    if (parsed.type === 'url_verification' && typeof parsed.challenge === 'string') {
      res.writeHead(200, { 'content-type': 'text/plain' }).end(parsed.challenge)
      return
    }
  } catch {
    // fall through to the trigger which will 400 on bad JSON
  }
  const result = await trigger.handler({ headers, body: raw })
  res.writeHead(result.status, result.headers).end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body))
})

const port = Number(process.env.PORT ?? 3000)
server.listen(port, () => {
  console.log(`Slack bot listening on :${port}/slack/events`)
})
