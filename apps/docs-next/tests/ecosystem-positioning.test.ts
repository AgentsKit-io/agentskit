import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import ecosystem from '../lib/ecosystem.json'

const appRoot = join(import.meta.dirname, '..')

describe('canonical ecosystem positioning', () => {
  it('separates the open-source ecosystem from the optional managed control plane', () => {
    expect(ecosystem.positioning.openSourceProductIds).toEqual([
      'agentskit',
      'registry',
      'agentskit-chat',
      'playbook',
      'doc-bridge',
      'code-review',
    ])
    expect(ecosystem.positioning.managedProductIds).toEqual(['akos'])
    expect(ecosystem.products.find((product) => product.id === 'akos')?.accessModel).toBe(
      'paid-managed-service',
    )
  })

  it('publishes the canonical positioning to human and machine-readable surfaces', () => {
    const ecosystemPage = readFileSync(join(appRoot, 'app/ecosystem/page.tsx'), 'utf8')
    const llmsRoute = readFileSync(join(appRoot, 'app/llms.txt/route.ts'), 'utf8')

    expect(ecosystemPage).toContain('ecosystem.positioning.commercialBoundary')
    expect(ecosystemPage).toContain('isAccessibleForFree')
    expect(llmsRoute).toContain('## Access and commercial model')
    expect(llmsRoute).toContain('ecosystem.positioning.commercialBoundary')
  })
})
