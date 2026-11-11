import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const SPEC = /(?:from\s*|import\s*\(?\s*|require\(\s*)['"]([^'"]+)['"]/g

function externalSpecifiers(entry: string): string[] {
  const seen = new Set<string>()
  const external = new Set<string>()
  const visit = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    const body = readFileSync(file, 'utf8').replace(/\/\/# sourceMappingURL=.*/g, '')
    for (const m of body.matchAll(SPEC)) {
      const spec = m[1]!
      if (spec.startsWith('.')) visit(join(dirname(file), spec))
      else external.add(spec)
    }
  }
  visit(join(dist, entry))
  return [...external]
}

describe('@agentskit/observability/cost-store subpath', () => {
  const built = existsSync(join(dist, 'cost-store.js'))

  it.skipIf(!built)('has no node built-in imports (ESM and CJS)', () => {
    for (const entry of ['cost-store.js', 'cost-store.cjs']) {
      const specs = externalSpecifiers(entry)
      const nodeOnly = specs.filter((s) => s.startsWith('node:') || ['crypto', 'fs', 'path', 'os'].includes(s))
      expect(nodeOnly, entry).toEqual([])
      expect(specs.every((s) => s === '@agentskit/core'), `${entry}: ${specs.join(',')}`).toBe(true)
    }
  })

  it.skipIf(!built)('exports the five symbols', async () => {
    const mod = await import(join(dist, 'cost-store.js'))
    for (const name of ['multiTenantCostGuard', 'createInMemoryCostStore', 'monthlyWindowKey', 'CostReservationError']) {
      expect(typeof mod[name], name).toBe('function')
    }
    expect(existsSync(join(dist, 'cost-store.d.ts'))).toBe(true)
    expect(readFileSync(join(dist, 'cost-store.d.ts'), 'utf8')).toMatch(/CostStore\b/)
  })
})
