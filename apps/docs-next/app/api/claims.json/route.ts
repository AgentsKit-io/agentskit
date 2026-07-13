import { ecosystemClaims } from '@/lib/ecosystem-claims'

export const dynamic = 'force-static'

export function GET() {
  return Response.json(ecosystemClaims, {
    headers: {
      'cache-control': 'public, max-age=300, s-maxage=3600',
    },
  })
}
