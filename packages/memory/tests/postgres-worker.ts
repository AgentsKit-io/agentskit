import { Client } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { postgresContract } from './postgres-contract'

const worker = {
  async fetch(_request: Request, env: { AK_POSTGRES_TEST_PORT: string }, ctx: { waitUntil(promise: Promise<unknown>): void }) {
    const client = new Client({ host: '127.0.0.1', port: Number(env.AK_POSTGRES_TEST_PORT), user: 'postgres', database: 'postgres' })
    try {
      await client.connect()
      const result = await postgresContract(drizzle(client), `worker-${crypto.randomUUID()}`)
      return Response.json(result)
    } catch {
      return Response.json({ error: 'Postgres workerd contract failed' }, { status: 500 })
    } finally { ctx.waitUntil(client.end()) }
  },
}
// Wrangler's module entry requires a default export; this is a test-only fixture.
export { worker as default }
