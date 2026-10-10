// CommonJS consumers load each subpath as a separate bundle. This runs the contract through `require`, where the
// store and the contract do not share module instances.
const assert = require('node:assert/strict')
const { createInMemoryCostStore } = require('@agentskit/observability')
const { costStoreContract } = require('@agentskit/observability/cost-store-contract')
const { postgresCostMigrationSql, postgresCostStore } = require('@agentskit/observability/postgres')

const passed = result => assert.deepEqual([...new Set(Object.values(result))], ['passed'])

async function main() {
  passed(await costStoreContract(createInMemoryCostStore(), { tenantPrefix: `cjs-${crypto.randomUUID()}` }))
  console.log('CommonJS: in-memory CostStore passed the contract')
  const port = process.env.AK_POSTGRES_TEST_PORT
  if (!port) {
    assert.equal(typeof postgresCostStore, 'function')
    console.log('CommonJS: PostgreSQL run skipped (AK_POSTGRES_TEST_PORT is not set)')
    return
  }
  const { Pool } = require('pg')
  const { drizzle } = require('drizzle-orm/node-postgres')
  const { sql } = require('drizzle-orm')
  const pool = new Pool({ host: '127.0.0.1', port: Number(port), user: 'postgres', database: 'postgres', max: 20 })
  try {
    const db = drizzle(pool)
    await db.execute(sql.raw(postgresCostMigrationSql))
    passed(await costStoreContract(postgresCostStore({ db }), { tenantPrefix: `cjs-${crypto.randomUUID()}` }))
    console.log('CommonJS: PostgreSQL CostStore passed the contract')
  } finally { await pool.end() }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
