import { expect, it } from 'vitest'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { postgresCostContract } from './postgres-contract'

it.skipIf(!process.env.AK_POSTGRES_TEST_PORT)('CostStore contract on real PostgreSQL', async () => {
  const pool = new Pool({ host: '127.0.0.1', port: Number(process.env.AK_POSTGRES_TEST_PORT), user: 'postgres', database: 'postgres', max: 20 })
  try {
    expect((await pool.query('SHOW server_version')).rows[0].server_version).toMatch(/^16\./)
    const result = await postgresCostContract(drizzle(pool), `test-${crypto.randomUUID()}`)
    expect(Object.values(result)).toEqual(Array(8).fill('passed'))
  } finally { await pool.end() }
}, 60_000)
