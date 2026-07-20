import manifest from './ecosystem.json'
import { claimsFor } from './ecosystem-claims'

type ManifestProduct = (typeof manifest.products)[number]
type Showcase = {
  stage: string
  headline: string
  detail: string
  proof: string
  sales: {
    kind: string
    headline: string
    metric?: string
    metricLabel?: string
    metrics?: { value: string; label: string }[]
    logos?: { id: string; label: string; glyph?: string }[]
    capabilities: string[]
    steps: string[]
    command?: string
  }
  cta: string
}

function hasShowcase(product: ManifestProduct): product is ManifestProduct & { showcase: Showcase } {
  return product.navigation.showInBar && 'showcase' in product
}

function productById(id: string): ManifestProduct {
  const product = manifest.products.find((candidate) => candidate.id === id)
  if (!product) throw new Error(`Unknown ecosystem product: ${id}`)
  return product
}

const agentskit = productById('agentskit')

export const agentsKitIdentity = {
  name: agentskit.name,
  role: agentskit.role,
  promise: agentskit.promise,
  maturity: agentskit.maturity,
  audience: 'JavaScript and TypeScript teams building agents they can evolve without a rewrite.',
  proof: claimsFor('agentskit'),
} as const

export const ecosystemShowcase = manifest.products
  .filter(hasShowcase)
  .sort((a, b) => a.navigation.order - b.navigation.order)
  .map((product) => ({
    id: product.id,
    name: product.name,
    shortName: product.shortName,
    accent: product.accent,
    href: product.surfaces.docs ?? product.surfaces.home,
    ...product.showcase,
  }))
