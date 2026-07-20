import ecosystem from './ecosystem.json'
import { stats } from './ecosystem-stats'

interface ClaimSpec {
  path: string
  aggregate?: 'length' | 'distinct'
  field?: string
  subtract?: number
}

interface ClaimSource {
  url: string
  claims: Record<string, ClaimSpec>
}

function valueAtPath(value: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((currentValue, segment) => {
    if (!currentValue || typeof currentValue !== 'object' || !(segment in currentValue)) return undefined
    return (currentValue as Record<string, unknown>)[segment]
  }, value)
}

function resolveClaim(data: unknown, spec: ClaimSpec): number | undefined {
  const source = valueAtPath(data, spec.path)
  let value: unknown = source
  if (spec.aggregate === 'length') value = Array.isArray(source) ? source.length : undefined
  if (spec.aggregate === 'distinct') {
    value = Array.isArray(source) && spec.field
      ? new Set(source.map(item => valueAtPath(item, spec.field as string)).filter(Boolean)).size
      : undefined
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, value - (spec.subtract ?? 0))
}

export async function collectEcosystemLiveClaims(fetchImpl: typeof fetch = fetch): Promise<Record<string, Record<string, number>>> {
  const claims: Record<string, Record<string, number>> = {}
  for (const product of ecosystem.products) {
    const claimSource = (product as { showcase?: { claimSource?: ClaimSource } }).showcase?.claimSource
    if (!claimSource) continue

    let data: unknown = stats
    if (product.id !== 'agentskit') {
      let externalData: unknown
      for (let attempt = 0; attempt < 2 && externalData === undefined; attempt += 1) {
        try {
          const response = await fetchImpl(claimSource.url, {
            headers: { accept: 'application/json' },
            signal: AbortSignal.timeout(4_000),
          })
          if (response.ok) externalData = await response.json()
        } catch {
          // A second bounded attempt protects the shared cache from transient origin failures.
        }
      }
      if (externalData === undefined) continue
      data = externalData
    }

    const resolved: Record<string, number> = {}
    for (const [claimId, spec] of Object.entries(claimSource.claims)) {
      const value = resolveClaim(data, spec)
      if (value !== undefined) resolved[claimId] = value
    }
    claims[product.id] = resolved
  }
  return claims
}
