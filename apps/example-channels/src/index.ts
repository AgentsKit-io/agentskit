import { createServer } from 'node:http'
import { telegramChannel } from '@agentskit/integrations'
import { createChannelApp } from './app'

const botToken = process.env.TELEGRAM_BOT_TOKEN
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET
if (!botToken || !secretToken) {
  console.error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET before starting.')
  process.exit(1)
}

// Any channel works here: whatsappChannel, slackChannel, emailChannel.
const channel = telegramChannel({
  botToken,
  secretToken,
})
const handle = createChannelApp(channel)

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname !== '/webhook' || (req.method !== 'POST' && req.method !== 'GET')) {
    res.writeHead(404).end('not found')
    return
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers[k.toLowerCase()] = v
  const result = await handle({ headers, rawBody: Buffer.concat(chunks).toString('utf8'), method: req.method, query: Object.fromEntries(url.searchParams) })
  res.writeHead(result.status).end(result.body)
})

const port = Number(process.env.PORT ?? 3000)
server.listen(port, () => console.log(`${channel.name} channel listening on :${port}/webhook`))
