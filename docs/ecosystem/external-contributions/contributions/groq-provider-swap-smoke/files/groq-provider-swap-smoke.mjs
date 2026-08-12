#!/usr/bin/env node
import { pathToFileURL } from 'node:url'

const defaultBaseUrl = 'https://api.groq.com/openai/v1'
const defaultModel = 'openai/gpt-oss-120b'

function parseSse(body) {
  let content = ''
  let model
  let done = false
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue
    const data = line.slice(5).trim()
    if (data === '[DONE]') {
      done = true
      continue
    }
    const event = JSON.parse(data)
    if (typeof event.model === 'string') model = event.model
    const delta = event.choices?.[0]?.delta?.content
    if (typeof delta === 'string') content += delta
  }
  if (!done) throw new Error('chat.completions stream ended before [DONE]')
  if (content.trim().length === 0) throw new Error('chat.completions returned empty content')
  return { content: content.trim(), model }
}

export async function smokeGroq({
  fetchImpl = fetch,
  apiKey = process.env.GROQ_API_KEY,
  baseUrl = defaultBaseUrl,
  model = process.env.MODEL ?? defaultModel,
} = {}) {
  if (!apiKey) throw new Error('GROQ_API_KEY is required')
  const base = baseUrl.replace(/\/$/, '')
  const response = await fetchImpl(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`chat.completions failed: ${response.status} ${body}`)
  }
  const result = parseSse(await response.text())
  return { ...result, model: result.model ?? model }
}

const isMain = typeof process.argv[1] === 'string'
  && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  smokeGroq()
    .then((result) => {
      process.stdout.write(`ok model=${result.model} content=${JSON.stringify(result.content)}\n`)
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
