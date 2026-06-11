/**
 * Machine endpoint — serves the registry as JSON under the site's own origin,
 * mirroring the canonical paths consumers expect:
 *   - `/r/index.json`  → `{ schemaVersion, agents: [...] }`
 *   - `/r/<id>.json`   → a single agent's full record
 *
 * The data lives in the decoupled `agentskit-registry` repo (RFC 0002); this
 * route re-serves it from the site origin so tools (e.g. the AKOS sidecar's
 * `agents.registry.list` / `agents.importFromRegistry`) can point
 * `AKOS_AGENT_REGISTRY` at `https://registry.agentskit.io` instead of raw
 * GitHub. Reuses the same fetch + revalidation as the rendered pages.
 */

import { getAgent, getRegistryIndex } from '@/lib/registry'

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // Served cross-origin to local sidecars / browsers; the payload is public.
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
}

const notFound = (): Response =>
  new Response(JSON.stringify({ error: 'not found' }), {
    status: 404,
    headers: JSON_HEADERS,
  })

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params

  if (file === 'index.json') {
    const agents = await getRegistryIndex()
    return new Response(JSON.stringify({ schemaVersion: 1, agents }), { headers: JSON_HEADERS })
  }

  if (!file.endsWith('.json')) return notFound()
  const id = file.slice(0, -'.json'.length)
  if (!id) return notFound()

  const agent = await getAgent(id)
  if (!agent) return notFound()
  return new Response(JSON.stringify(agent), { headers: JSON_HEADERS })
}
