import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const workflow = readFileSync('.github/workflows/models-dev-catalog.yml', 'utf8')

describe('models.dev refresh workflow', () => {
  it('runs on a schedule and supports manual refreshes', () => {
    expect(workflow).toContain('schedule:')
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('pnpm sync:models')
    expect(workflow).toContain('node scripts/gen-ecosystem-stats.mjs')
    expect(workflow).toContain('node scripts/gen-ecosystem-claims.mjs')
    expect(workflow).toContain('node scripts/sync-ecosystem.mjs')
    expect(workflow).toContain('gen:deterministic-knowledge')
  })

  it('can publish only a reviewable draft PR', () => {
    expect(workflow).toMatch(/contents:\s+write/)
    expect(workflow).toMatch(/pull-requests:\s+write/)
    expect(workflow).toContain('draft: true')
    expect(workflow).toContain('automation/models-dev-refresh')
    expect(workflow).toMatch(/peter-evans\/create-pull-request@[0-9a-f]{40}/)
  })

  it('keeps the runtime snapshot and derived evidence in the PR scope', () => {
    expect(workflow).toContain('packages/adapters/src/catalog/snapshot.json')
    expect(workflow).toContain('apps/docs-next/lib/ecosystem-stats.snapshot.json')
    expect(workflow).toContain('apps/landing/lib/ecosystem-stats.snapshot.json')
    expect(workflow).toContain('ecosystem-claims.json')
    expect(workflow).toContain('apps/docs-next/lib/deterministic-knowledge.generated.json')
  })
})
