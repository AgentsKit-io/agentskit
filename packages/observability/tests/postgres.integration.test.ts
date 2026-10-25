import { expect, it } from 'vitest'

it.skipIf(!process.env.AK_POSTGRES_TEST_PORT)('CostStore contract on real PostgreSQL', async () => {
  // Loaded here, not at module scope: the contract imports the built package, which a skipped run may not have.
  const [{ Pool }, { drizzle }, { postgresCostContract }] = await Promise.all([import('pg'), import('drizzle-orm/node-postgres'), import('./postgres-contract')])
  const pool = new Pool({ host: '127.0.0.1', port: Number(process.env.AK_POSTGRES_TEST_PORT), user: 'postgres', database: 'postgres', max: 20 })
  try {
    expect((await pool.query('SHOW server_version')).rows[0].server_version).toMatch(/^16\./)
    const result = await postgresCostContract(drizzle(pool), `test-${crypto.randomUUID()}`)
    expect(Object.values(result)).toEqual(Array(9).fill('passed'))
  } finally { await pool.end() }
}, 60_000)
