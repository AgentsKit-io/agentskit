import { deepStrictEqual } from 'node:assert/strict'
import type { Message } from '@agentskit/core'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { postgresChatMemory, postgresChatMigrationSql, postgresChatTable } from '@agentskit/memory/postgres'

function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label)
}
function equal(a: unknown, b: unknown, label: string) {
  deepStrictEqual(a, b, label)
}
async function rejects(run: () => unknown, label: string) {
  try { await run() } catch { return }
  throw new Error(label)
}

export async function postgresContract(db: NodePgDatabase, prefix: string) {
  await db.execute(sql.raw(postgresChatMigrationSql))
  const options = { db, tenantId: prefix, sessionId: 'shared' }
  const memory = postgresChatMemory(options)
  const otherTenant = postgresChatMemory({ ...options, tenantId: `${prefix}-other` })
  const otherSession = postgresChatMemory({ ...options, sessionId: 'other' })
  const message: Message = {
    id: 'one', role: 'user', content: 'synthetic', status: 'complete', createdAt: new Date('2026-01-01Z'),
    parts: [
      { type: 'text', text: 'synthetic' },
      { type: 'image', source: 'https://example.test/image', detail: 'high' },
      { type: 'file', source: 's3://synthetic/file', filename: 'test.pdf', mimeType: 'application/pdf' },
      { type: 'audio', source: 'https://example.test/audio', durationSec: 2 },
      { type: 'video', source: 'https://example.test/video', durationSec: 3 },
    ],
    metadata: { synthetic: { nested: true } },
    toolCalls: [{ id: 'call', name: 'synthetic', args: {}, status: 'complete' }],
  }
  const second: Message = { ...message, id: 'two', role: 'assistant' }
  try {
    await memory.clear!(); await otherTenant.clear!(); await otherSession.clear!()
    equal(await memory.load(), [], 'CM5 empty')
    await memory.save([second, message])
    equal(await memory.load(), [second, message], 'CM3 parts/order/metadata roundtrip')
    check((await memory.load())[0]!.createdAt instanceof Date, 'Date restored')
    const snapshot = await memory.load()
    snapshot[0]!.parts![0] = { type: 'text', text: 'mutated' }
    equal(await memory.load(), [second, message], 'CM1 independent snapshot')
    equal(await otherTenant.load(), [], 'tenant read isolation')
    equal(await otherSession.load(), [], 'session read isolation')
    await otherTenant.save([second]); await otherSession.save([second])
    await memory.save([message])
    equal(await memory.load(), [message], 'CM2 replace-all')
    equal(await otherTenant.load(), [second], 'tenant write isolation')
    equal(await otherSession.load(), [second], 'session write isolation')
    await memory.clear!()
    equal(await memory.load(), [], 'CM6 clear')
    equal(await otherTenant.load(), [second], 'tenant clear isolation')
    equal(await otherSession.load(), [second], 'session clear isolation')
    await Promise.all([memory.save([message]), memory.save([second, message])])
    const concurrent = await memory.load()
    check(concurrent.length === 1 || concurrent.length === 2, 'CM4 complete concurrent snapshot')
    equal(concurrent, concurrent.length === 1 ? [message] : [second, message], 'CM4 no partial writes')
    await memory.save([])
    equal(await memory.load(), [], 'CM2 empty replace')
    const bounded = postgresChatMemory({ ...options, maxMessages: 1 })
    await bounded.save([message, second])
    equal(await bounded.load(), [message, second], 'retention never splits a user/assistant turn')
    const user2: Message = { ...message, id: 'user-2' }
    const answer2: Message = { ...second, id: 'answer-2' }
    const system: Message = { ...message, id: 'system', role: 'system' }
    for (const [maxMessages, expected] of [
      [1, [system, user2, answer2]], [2, [system, user2, answer2]], [3, [system, user2, answer2]],
      [4, [system, message, second, user2, answer2]], [5, [system, message, second, user2, answer2]],
    ] as const) {
      const retained = postgresChatMemory({ ...options, maxMessages })
      await retained.save([system, message, second, user2, answer2])
      equal(await retained.load(), expected, `turn boundary retention N=${maxMessages}`)
    }
    const call: Message = { ...second, id: 'calls', toolCalls: [
      { id: 'a', name: 'synthetic', args: {}, status: 'complete' },
      { id: 'b', name: 'synthetic', args: {}, status: 'complete' },
    ] }
    const result: Message = { id: 'result-a', role: 'tool', content: 'result', status: 'complete', createdAt: message.createdAt, toolCallId: 'a' }
    const resultB: Message = { ...result, id: 'result-b', toolCallId: 'b' }
    const answer: Message = { id: 'answer', role: 'assistant', content: 'answer', status: 'complete', createdAt: message.createdAt }
    const history = [message, call, result, resultB, answer]
    for (const [maxMessages, expected] of [
      [1, history], [2, history], [3, history], [4, history], [5, history],
    ] as const) {
      const retained = postgresChatMemory({ ...options, maxMessages })
      await retained.save(history)
      equal(await retained.load(), expected, `tool boundary retention N=${maxMessages}`)
    }
    await bounded.save([call, result, resultB])
    equal(await bounded.load(), [call, result, resultB], 'history without a user turn is never emptied')
    await bounded.save([message, call, result])
    equal(await bounded.load(), [message, call, result], 'in-progress tool turn kept whole')
    await bounded.save([second])
    const controller = new AbortController(); controller.abort()
    await rejects(() => memory.load({ signal: controller.signal }), 'aborted load')
    await rejects(() => memory.save([message], { signal: controller.signal }), 'aborted save')
    await rejects(() => memory.clear!({ signal: controller.signal }), 'aborted clear')
    equal(await memory.load(), [second], 'aborted mutations preserved state')
    await rejects(() => memory.save([{ ...message, role: 'invalid' } as unknown as Message]), 'invalid save rejected')
    equal(await memory.load(), [second], 'invalid save preserved state')
    await db.insert(postgresChatTable).values({ tenantId: options.tenantId, sessionId: options.sessionId, record: { version: 1, messages: [] } })
      .onConflictDoUpdate({ target: [postgresChatTable.tenantId, postgresChatTable.sessionId], set: { record: sql`'{"version":2}'::jsonb` } })
    await rejects(() => memory.load(), 'corrupt record rejected')
    await memory.save([message])
    equal(await memory.load(), [message], 'recovery by replace')
    for (const maxMessages of [0, -1, 1.5, Infinity]) {
      await rejects(() => postgresChatMemory({ ...options, maxMessages }), 'invalid retention config')
    }
    await rejects(() => postgresChatMemory({ ...options, tenantId: '' }), 'empty tenant rejected')
    await rejects(() => postgresChatMemory({ ...options, sessionId: '' }), 'empty session rejected')
    return { contract: 'CM1-CM6', isolation: 'tenant/session', parts: 'all five kinds', retention: 'newest N', abort: 'pre-query', recovery: 'passed' }
  } finally {
    await memory.clear!(); await otherTenant.clear!(); await otherSession.clear!()
  }
}
