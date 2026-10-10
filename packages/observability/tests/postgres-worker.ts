import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { postgresCostContract } from './postgres-contract'

const worker = {
  async fetch(_request: Request, env: { AK_POSTGRES_TEST_PORT: string }, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    // A pool, not one client: the cap race must run on several connections here as well. workerd allows six
    // simultaneous outbound connections per request.
    const pool = new Pool({ host: '127.0.0.1', port: Number(env.AK_POSTGRES_TEST_PORT), user: 'postgres', database: 'postgres', max: 5 })
    try {
      return Response.json(await postgresCostContract(drizzle(pool), `worker-${crypto.randomUUID()}`))
    } catch (error) {
      return Response.json({ error: 'Postgres workerd contract failed', detail: error instanceof Error ? error.message : String(error) }, { status: 500 })
    } finally { ctx.waitUntil(pool.end()) }
  },
}
// Wrangler's module entry requires a default export; this is a test-only fixture.
export { worker as default }
