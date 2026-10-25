import { expect, it } from 'vitest'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { postgresContract } from './postgres-contract'

it.skipIf(!process.env.AK_POSTGRES_TEST_PORT)('ChatMemory contract on real PostgreSQL', async () => {
  const pool = new Pool({ host: '127.0.0.1', port: Number(process.env.AK_POSTGRES_TEST_PORT), user: 'postgres', database: 'postgres' })
  try {
    expect((await pool.query('SHOW server_version')).rows[0].server_version).toMatch(/^16\./)
    expect(await postgresContract(drizzle(pool), `test-${crypto.randomUUID()}`)).toMatchObject({ recovery: 'passed' })
  } finally { await pool.end() }
}, 30_000)
