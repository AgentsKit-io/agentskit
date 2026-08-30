import { describe, expect, it } from 'vitest'
import { createAcpCliAdapter, createCliAdapter, createJsonCliAdapter } from '../src/cli'
import type { AdapterRequest, StreamChunk } from '@agentskit/core'

const request: AdapterRequest = {
  messages: [{
    id: 'm1',
    role: 'user',
    content: 'review this',
    status: 'complete',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }],
}

async function collect(adapter: ReturnType<typeof createCliAdapter>): Promise<StreamChunk[]> {
  const chunks: StreamChunk[] = []
  for await (const chunk of adapter.createSource(request).stream()) chunks.push(chunk)
  return chunks
}

describe('CLI adapters', () => {
  it('passes argv literally without a shell and emits text plus done', async () => {
    const adapter = createCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdin.on('data',()=>{}); process.stdin.on('end',()=>process.stdout.write(process.argv[1]))", 'literal;not-a-command'],
    })
    await expect(collect(adapter)).resolves.toEqual([
      { type: 'text', content: 'literal;not-a-command' },
      { type: 'done' },
    ])
  })

  it('returns a typed error for a non-zero CLI exit', async () => {
    const chunks = await collect(createCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stderr.write('bad'); process.exit(3)"],
    }))
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: expect.stringContaining('code 3') })
  })

  it('parses one structured JSON response and fails closed on malformed JSON', async () => {
    const adapter = createJsonCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write('{\"text\":\"ok\"}'))"],
    })
    await expect(collect(adapter)).resolves.toEqual([
      { type: 'text', content: 'ok' },
      { type: 'done' },
    ])

    const invalid = await collect(createJsonCliAdapter({
      command: process.execPath,
      args: ['-e', "process.stdin.resume(); process.stdin.on('end',()=>process.stdout.write('{broken'))"],
    }))
    expect(invalid).toHaveLength(1)
    expect(invalid[0]).toMatchObject({ type: 'error', content: expect.stringContaining('malformed JSON') })
  })

  it('terminates a CLI that exceeds its deadline', async () => {
    const chunks = await collect(createCliAdapter({
      command: process.execPath,
      args: ['-e', 'setTimeout(() => {}, 10000)'],
      timeoutMs: 50,
    }))
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatchObject({ type: 'error', content: expect.stringContaining('timed out') })
  })

  it('normalizes ACP v1 session output over JSON lines', async () => {
    const script = `
      const rl = require('node:readline').createInterface({ input: process.stdin });
      rl.on('line', line => {
        const message = JSON.parse(line);
        if (message.method === 'initialize') process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{protocolVersion:1}})+'\\n');
        if (message.method === 'session/new') process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{sessionId:'s1'}})+'\\n');
        if (message.method === 'session/prompt') {
          process.stdout.write(JSON.stringify({jsonrpc:'2.0',method:'session/update',params:{sessionId:'s1',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'ok'}}}})+'\\n');
          process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{stopReason:'end_turn'}})+'\\n');
        }
      });
    `
    await expect(collect(createAcpCliAdapter({ command: process.execPath, args: ['-e', script] }))).resolves.toEqual([
      { type: 'text', content: 'ok' },
      { type: 'done' },
    ])
  })
})

