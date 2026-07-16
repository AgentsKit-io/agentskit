import assert from 'node:assert/strict'
import test from 'node:test'
import { formatEcosystemLlmsBlock } from './lib/ecosystem-llms-block.mjs'

test('formatEcosystemLlmsBlock marks current product and includes roles', () => {
  const lines = formatEcosystemLlmsBlock({
    currentProductId: 'agentskit',
    products: [
      {
        id: 'agentskit',
        name: 'AgentsKit',
        role: 'foundation',
        promise: 'Build agents without gluing many libraries together.',
        maturity: 'beta',
        surfaces: { home: 'https://www.agentskit.io', llms: 'https://www.agentskit.io/llms.txt' },
      },
      {
        id: 'registry',
        name: 'AgentsKit Registry',
        role: 'starting-point',
        promise: 'Copy ready-made agents and own the source.',
        surfaces: { home: 'https://registry.agentskit.io', docs: 'https://registry.agentskit.io/docs' },
      },
    ],
  })
  assert.equal(lines[0], '## AgentsKit ecosystem')
  assert.ok(lines.some((line) => line.includes('**(current)**') && line.includes('AgentsKit]')))
  assert.ok(lines.some((line) => line.includes('Role: `foundation`')))
  assert.ok(lines.some((line) => line.includes('Machine index: https://www.agentskit.io/llms.txt')))
})
