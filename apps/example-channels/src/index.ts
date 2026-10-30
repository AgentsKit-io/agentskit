import { createServer } from 'node:http'
import { telegramChannel } from '@agentskit/integrations'
import { createChannelApp } from './app'

// Any channel works here: whatsappChannel, slackChannel, emailChannel.
const channel = telegramChannel({
  botToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET ?? '',
})
const handle = createChannelApp(channel)

const server = createServer(async (req, res) => {
  if (req.url !== '/webhook' || req.method !== 'POST') {
    res.writeHead(404).end('not found')
    return
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers[k.toLowerCase()] = v
  const result = await handle({ headers, rawBody: Buffer.concat(chunks).toString('utf8') })
  res.writeHead(result.status).end(result.body)
})

const port = Number(process.env.PORT ?? 3000)
server.listen(port, () => console.log(`${channel.name} channel listening on :${port}/webhook`))
