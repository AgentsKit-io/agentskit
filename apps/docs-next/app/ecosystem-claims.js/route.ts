import { collectEcosystemLiveClaims } from '@/lib/ecosystem-live-claims'

export const dynamic = 'force-dynamic'

export async function GET() {
  const claims = await collectEcosystemLiveClaims()
  const script = `window.__akApplyEcosystemClaims&&window.__akApplyEcosystemClaims(${JSON.stringify(claims)});`
  const cacheControl = claims.registry
    ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600'
    : 'no-store'
  return new Response(script, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': cacheControl,
      'access-control-allow-origin': '*',
    },
  })
}
