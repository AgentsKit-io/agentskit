import { stats } from '@/lib/ecosystem-stats'

/**
 * Canonical counts for the AgentsKit library, served at
 * https://www.agentskit.io/api/stats.json — the single source of truth other
 * ecosystem properties consume at build time. Derived from the real monorepo by
 * scripts/compute-stats.mjs into the committed snapshot (regenerated at
 * prebuild), never hand-typed. CORS-open + cacheable.
 */
export const dynamic = 'force-static'

export function GET() {
  return new Response(JSON.stringify(stats, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
