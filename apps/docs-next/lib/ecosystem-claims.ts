import snapshot from './ecosystem-claims.snapshot.json'

export interface EcosystemClaim {
  id: string
  value: number
  noun: string
  conservativeFloor?: number
  evidence: {
    type: 'repository-derivation' | 'endpoint'
    repo?: string
    path?: string
    url?: string
    summary: string
  }
}

export interface EcosystemProductClaims {
  productId: string
  source: { type: 'endpoint'; url: string } | { type: 'repository'; repo: string }
  verification: 'verified' | 'declared'
  claims: EcosystemClaim[]
}

export const ecosystemClaims = snapshot as {
  schemaVersion: 1
  manifestSchemaVersion: 2
  products: EcosystemProductClaims[]
}

export function claimsFor(productId: string): EcosystemClaim[] {
  return ecosystemClaims.products.find((product) => product.productId === productId)?.claims ?? []
}
