const BASE =
  process.env.REGISTRY_DISCOVERY_BASE ??
  'https://raw.githubusercontent.com/AgentsKit-io/agentskit-registry/main/public/deterministic'

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'access-control-allow-origin': '*',
  'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
}

const notFound = (): Response => new Response(JSON.stringify({ error: 'not found' }), {
  status: 404,
  headers: HEADERS,
})

export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ readonly file: string }> },
): Promise<Response> {
  const { file } = await params
  if (file !== 'site-config.json' && file !== 'knowledge.json') return notFound()
  try {
    const response = await fetch(`${BASE}/${file}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return notFound()
    return new Response(await response.text(), { headers: HEADERS })
  } catch {
    return new Response(JSON.stringify({ error: 'temporarily unavailable' }), {
      status: 503,
      headers: HEADERS,
    })
  }
}
