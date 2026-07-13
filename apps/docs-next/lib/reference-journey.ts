import manifest from './ecosystem.json'
import { claimsFor } from './ecosystem-claims'

export type JourneyProductId =
  | 'registry'
  | 'agentskit-chat'
  | 'playbook'
  | 'doc-bridge'
  | 'code-review'
  | 'akos'

type ManifestProduct = (typeof manifest.products)[number]

const transitionCopy: Record<JourneyProductId, { action: string; context: string }> = {
  registry: {
    action: 'Start from working source',
    context: 'Browse ready-made agents, copy one, and keep ownership of the code.',
  },
  'agentskit-chat': {
    action: 'Deliver the experience',
    context: 'Put the same agent behind web, terminal, and other chat surfaces.',
  },
  playbook: {
    action: 'Add delivery discipline',
    context: 'Apply repeatable engineering standards before the system grows.',
  },
  'doc-bridge': {
    action: 'Make the repo understandable',
    context: 'Turn repository documentation into precise handoffs for coding agents.',
  },
  'code-review': {
    action: 'Verify before merge',
    context: 'Run a focused, low-noise review with the model already in your workflow.',
  },
  akos: {
    action: 'Operate in production',
    context: 'Add orchestration, governance, and operational controls when you need them.',
  },
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

export const referenceJourney = agentskit.navigation.next.map((id) => {
  const product = productById(id)
  const copy = transitionCopy[id as JourneyProductId]
  if (!copy) throw new Error(`Missing contextual transition copy: ${id}`)

  return {
    id: id as JourneyProductId,
    name: product.name,
    maturity: product.maturity,
    promise: product.promise,
    accent: product.accent,
    href: product.surfaces.docs,
    ...copy,
  }
})
