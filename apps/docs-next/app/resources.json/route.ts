import { publicResources } from '@/lib/public-resources'

export const dynamic = 'force-static'

export function GET() {
  return Response.json({
    schemaVersion: 1,
    source: 'curated-public-allowlist',
    resources: publicResources,
  })
}
