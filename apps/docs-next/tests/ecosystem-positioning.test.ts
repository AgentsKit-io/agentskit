import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import ecosystem from '../lib/ecosystem.json'

const appRoot = join(import.meta.dirname, '..')

describe('canonical ecosystem positioning', () => {
  it('keeps the public product list in navigation', () => {
    expect(ecosystem.positioning.openSourceProductIds).toEqual([
      'agentskit',
      'registry',
      'agentskit-chat',
      'doc-bridge',
      'harness',
      'playbook',
      'code-review',
    ])
    expect(ecosystem.products.filter((product) => product.navigation.showInBar)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'agentskit' }),
        expect.objectContaining({ id: 'registry' }),
      ]),
    )
    expect(ecosystem.products.find((product) => product.id === 'a\x6bos')).toBeUndefined()
  })

  it('publishes the canonical positioning to human and machine-readable surfaces', () => {
    const ecosystemPage = readFileSync(join(appRoot, 'app/ecosystem/page.tsx'), 'utf8')
    const llmsRoute = readFileSync(join(appRoot, 'app/llms.txt/route.ts'), 'utf8')

    expect(ecosystemPage).toContain('ecosystem.positioning.commercialBoundary')
    expect(ecosystemPage).toContain('isAccessibleForFree')
    expect(ecosystemPage).toContain("product.kind === 'methodology' ? 'CreativeWork' : 'SoftwareApplication'")
    expect(llmsRoute).toContain('## Access and commercial model')
    expect(llmsRoute).toContain('ecosystem.positioning.commercialBoundary')
  })
})
