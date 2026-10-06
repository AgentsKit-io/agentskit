import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'

assert(process.env.AK_POSTGRES_TEST_PORT, 'Set AK_POSTGRES_TEST_PORT to a local trust-auth PostgreSQL 16 port')
const state = await mkdtemp(join(tmpdir(), 'ak-memory-workerd-'))
const child = spawn('pnpm', ['exec', 'wrangler', 'dev', '--config', 'tests/wrangler.postgres.jsonc', '--local', '--port', '8799', '--persist-to', state, '--var', `AK_POSTGRES_TEST_PORT:${process.env.AK_POSTGRES_TEST_PORT}`], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } })
// Capture subprocess output internally: never publish connection diagnostics.
child.stdout.resume(); child.stderr.resume()
try {
  let response
  for (let attempt = 0; attempt < 240; attempt++) {
    assert(child.exitCode === null, 'wrangler exited before acceptance')
    try { response = await fetch('http://127.0.0.1:8799', { signal: AbortSignal.timeout(15000) }); break } catch { await new Promise(resolve => setTimeout(resolve, 500)) }
  }
  assert(response, 'wrangler readiness timeout')
  assert.equal(response.status, 200, 'real workerd/Postgres request')
  assert.deepEqual(await response.json(), { contract: 'CM1-CM6', isolation: 'tenant/session', parts: 'all five kinds', retention: 'newest N', abort: 'pre-query', recovery: 'passed' })
  console.log('workerd + PostgreSQL: CM1-CM6, isolation, parts, retention, abort and recovery passed')
} finally {
  child.kill('SIGTERM')
  if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve))
  await rm(state, { recursive: true, force: true })
}
