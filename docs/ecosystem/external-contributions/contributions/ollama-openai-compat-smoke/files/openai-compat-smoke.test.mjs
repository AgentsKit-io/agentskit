import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { smokeChatCompletions } from './openai-compat-smoke.mjs'

test('smokeChatCompletions accepts a minimal OpenAI-compatible response', async () => {
  const server = http.createServer((req, res) => {
    assert.equal(req.method, 'POST')
    assert.equal(req.url, '/v1/chat/completions')
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify({
        model: 'mock',
        choices: [{ message: { role: 'assistant', content: 'pong' } }],
      }),
    )
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  try {
    const result = await smokeChatCompletions({
      base: `http://127.0.0.1:${port}/v1`,
      modelId: 'mock',
    })
    assert.equal(result.content, 'pong')
    assert.equal(result.model, 'mock')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})
