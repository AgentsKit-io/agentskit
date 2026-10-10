import { spawnProcess } from '@agentskit/cross-platform'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { readJson, retry } from '@agentskit/net'

assert(process.env.AK_POSTGRES_TEST_PORT, 'Set AK_POSTGRES_TEST_PORT to a local trust-auth PostgreSQL 16 port')
const state = await mkdtemp(join(tmpdir(), 'ak-observability-workerd-'))
const child = spawnProcess('pnpm', ['exec', 'wrangler', 'dev', '--config', 'tests/wrangler.postgres.jsonc', '--local', '--port', '8798', '--persist-to', state, '--var', `AK_POSTGRES_TEST_PORT:${process.env.AK_POSTGRES_TEST_PORT}`], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
let running = true
void child.exited.then(() => { running = false }, () => { running = false })
try {
  const response = await retry(async () => {
    assert(running, 'wrangler exited before acceptance')
    return fetch('http://127.0.0.1:8798', { signal: AbortSignal.timeout(15000) })
  }, { retries: 239, minDelayMs: 500, maxDelayMs: 500, jitter: 'none', shouldRetry: () => running })
  assert.equal(response.status, 200, 'real workerd/Postgres request')
  assert.deepEqual(await readJson(response, { maxBytes: 4096 }), { accounting: 'passed', cap: 'passed', idempotency: 'passed', settlement: 'passed', isolation: 'passed', release: 'passed', ledger: 'passed', replayRace: 'passed' })
  console.log('workerd + PostgreSQL: CostStore contract, ledger and replay race passed')
} finally {
  await child.kill('SIGTERM')
  await child.exited.catch(() => {})
  await rm(state, { recursive: true, force: true })
}
