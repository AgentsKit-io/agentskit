import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runCommand } from '../../cross-platform/dist/index.js'
import { fileURLToPath } from 'node:url'

const [mode, format, recordPath] = process.argv.slice(2)
if (!mode) {
  const directory = mkdtempSync(join(tmpdir(), 'core-restart-'))
  try {
    for (const format of ['esm', 'cjs']) {
      for (const mode of ['propose', 'decide', 'stream-propose', 'stream-decide']) {
        const child = await runCommand(process.execPath, [fileURLToPath(import.meta.url), mode, format, join(directory, `${format}-${mode.startsWith('stream-') ? 'stream' : 'proposal'}.json`)])
        assert.equal(child.code, 0, child.stderr)
        process.stdout.write(child.stdout)
      }
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
} else {
  const { createChatController } = format === 'esm'
    ? await import('../dist/index.js')
    : createRequire(import.meta.url)('../dist/index.cjs')
  const read = () => existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : undefined
  const save = record => writeFileSync(recordPath, JSON.stringify(record))
  // Sequential process-restart fixture only; distributed CAS is tested by the port suite.
  const decisionStore = {
    async putPending(record) { if (!read()) save(record) },
    async get(id) { const record = read(); return record?.toolCallId === id ? record : undefined },
    async claim(id, decision, reason) {
      const record = read()
      if (record?.toolCallId !== id || record.status !== 'pending') return
      const claimed = { ...record, status: 'claimed', decision, reason }
      save(claimed)
      return claimed
    },
    async settle(record) {
      assert.equal(read().status, 'claimed')
      assert.equal(read().decision, record.decision)
      save(record)
    },
  }
  let executions = 0, requests = 0
  const chat = createChatController({
    decisionStore,
    ...(mode.startsWith('stream-') ? {
      memory: {
        async load() { return existsSync(`${recordPath}.memory`) ? JSON.parse(readFileSync(`${recordPath}.memory`, 'utf8')) : [] },
        async save(messages) { writeFileSync(`${recordPath}.memory`, JSON.stringify(messages)) },
      },
    } : {}),
    onToolCall() {
      if (mode === 'stream-propose') {
        assert.equal(read().messages.at(-1).status, 'streaming')
        console.log(JSON.stringify({ mode, format, status: read().status }))
        process.exit(0)
      }
    },
    tools: [{ name: 'write', requiresConfirmation: true, execute() { executions++; return 'stored' } }],
    adapter: {
      createSource(request) {
        if (mode === 'stream-propose') return {
          abort() {},
          async *stream() { yield { type: 'tool_call', toolCall: { id: 'restart', name: 'write', args: '{}' } }; yield { type: 'done' } },
        }
        requests++
        assert.equal(request.messages.find(m => m.role === 'tool')?.content, 'stored')
        return { abort() {}, async *stream() { yield { type: 'text', content: 'Finished' }; yield { type: 'done' } } }
      },
    },
  })
  if (mode === 'stream-propose') {
    await chat.send('write')
    assert.fail('Expected process termination during streaming')
  } else if (mode === 'propose') {
    await chat.proposeToolCall({ id: 'restart', name: 'write', args: {} })
    assert.equal(read().status, 'pending')
    assert.equal(executions, 0)
  } else {
    assert.equal(chat.getState().messages.length, 0)
    assert.equal((await chat.decide('restart', 'approve')).result, 'stored')
    assert.equal(chat.getState().messages.at(-1).content, 'Finished')
    assert.equal((await chat.decide('restart', 'approve')).result, 'stored')
    assert.equal(executions, 1)
    assert.equal(requests, 1)
  }
  console.log(JSON.stringify({ mode, format, executions, requests, status: read().status }))
}
