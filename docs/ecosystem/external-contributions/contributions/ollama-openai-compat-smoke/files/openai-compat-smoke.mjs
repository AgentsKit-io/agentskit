#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
/**
 * Standalone OpenAI-compatible chat completions smoke check.
 * Works with Ollama's /v1 surface or any compatible local server.
 *
 * Usage:
 *   node openai-compat-smoke.mjs
 *   OPENAI_COMPAT_BASE_URL=http://127.0.0.1:11434/v1 MODEL=llama3.2 node openai-compat-smoke.mjs
 */

const baseUrl = (process.env.OPENAI_COMPAT_BASE_URL ?? 'http://127.0.0.1:11434/v1').replace(/\/$/, '')
const model = process.env.MODEL ?? 'llama3.2'

export async function smokeChatCompletions({
  fetchImpl = fetch,
  base = baseUrl,
  modelId = model,
} = {}) {
  const response = await fetchImpl(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      stream: false,
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`chat.completions failed: ${response.status} ${body}`)
  }
  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('chat.completions returned empty content')
  }
  return { content: content.trim(), model: json.model ?? modelId }
}

const isMain =
  typeof process.argv[1] === 'string' && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  smokeChatCompletions()
    .then((result) => {
      process.stdout.write(`ok model=${result.model} content=${JSON.stringify(result.content)}\n`)
    })
    .catch((error) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exit(1)
    })
}
