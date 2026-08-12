import assert from 'node:assert/strict'
import http from 'node:http'
import test from 'node:test'
import { smokeGroq } from './groq-provider-swap-smoke.mjs'

test('smokeGroq verifies an OpenAI-compatible streaming request', async () => {
  const server = http.createServer((req, res) => {
    assert.equal(req.method, 'POST')
    assert.equal(req.url, '/openai/v1/chat/completions')
    assert.equal(req.headers.authorization, 'Bearer test-key')
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      assert.deepEqual(JSON.parse(body), {
        model: 'test-model',
        stream: true,
        messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
      })
      res.writeHead(200, { 'content-type': 'text/event-stream' })
      res.end(
        'data: {"model":"test-model","choices":[{"delta":{"content":"pong"}}]}\n\n' +
        'data: [DONE]\n\n',
      )
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  try {
    const result = await smokeGroq({
      apiKey: 'test-key',
      baseUrl: `http://127.0.0.1:${address.port}/openai/v1`,
      model: 'test-model',
    })
    assert.deepEqual(result, { content: 'pong', model: 'test-model' })
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})

test('smokeGroq rejects missing credentials before transport', async () => {
  let called = false
  await assert.rejects(
    () => smokeGroq({ apiKey: '', fetchImpl: async () => { called = true } }),
    /GROQ_API_KEY is required/,
  )
  assert.equal(called, false)
})
