import { assertPublicUrl, fetchWithRetry, parseSSEResponse, readJson } from '@agentskit/net'

// Refuse private, loopback and metadata addresses before fetching a user-supplied URL.
const { url } = await assertPublicUrl('https://api.example.com/v1/models')

// Idempotent requests retry on 429/5xx, honouring Retry-After; each attempt times out.
const models = await readJson(await fetchWithRetry(url, undefined, { timeoutMs: 10_000 }), {
  maxBytes: 1_000_000,
})
console.log(models)

// Server-sent events as an async iterable.
const stream = await fetch('https://api.example.com/v1/stream', { method: 'POST' })
for await (const event of parseSSEResponse(stream)) {
  if (event.data === '[DONE]') break
  console.log(event.event ?? 'message', event.data)
}
