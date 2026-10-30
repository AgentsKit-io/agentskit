import { describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadMatrix, renderPage, validateMatrix } from './lib/compatibility-matrix.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const today = '2026-10-28'
const base = {
  subject: { kind: 'provider', id: 'openai', package: '@agentskit/adapters' },
  capability: 'streaming',
  state: 'verified',
  evidence: { test: 'packages/adapters/tests/contract.test.ts', command: 'pnpm --filter @agentskit/adapters exec vitest run tests/contract.test.ts' },
  owner: 'o',
  reviewedOn: '2026-10-01',
  expiresOn: '2027-01-01',
}
const check = (patch, now = today) => validateMatrix({ schemaVersion: 1, entries: [{ ...base, ...patch }] }, { root, today: now })

describe('compatibility matrix gate', () => {
  it('accepts the committed matrix', () => {
    expect(validateMatrix(loadMatrix(root), { root, today })).toEqual([])
  })
  it('accepts a valid verified entry', () => {
    expect(check({})).toEqual([])
  })
  it('fails verified evidence pointing at a missing test file', () => {
    const errors = check({ evidence: { test: 'packages/adapters/tests/nope.test.ts', command: 'vitest run tests/nope.test.ts' } })
    expect(errors.join()).toMatch(/does not exist/)
  })
  it('fails verified without evidence', () => {
    expect(check({ evidence: undefined }).join()).toMatch(/requires evidence/)
  })
  it('fails partial without limitations', () => {
    expect(check({ state: 'partial' }).join()).toMatch(/requires limitations/)
  })
  it('fails planned carrying evidence', () => {
    expect(check({ state: 'planned' }).join()).toMatch(/must not carry evidence/)
  })
  it('fails expired entries', () => {
    expect(check({}, '2027-01-02').join()).toMatch(/expired/)
  })
  it('fails unknown capability, state and kind', () => {
    expect(check({ capability: 'telepathy' }).join()).toMatch(/unknown capability/)
    expect(check({ state: 'maybe' }).join()).toMatch(/state must be/)
    expect(check({ subject: { ...base.subject, kind: 'cloud' } }).join()).toMatch(/subject.kind/)
  })
  it('fails duplicates and unknown fields', () => {
    const dup = validateMatrix({ schemaVersion: 1, entries: [base, base] }, { root, today })
    expect(dup.join()).toMatch(/duplicate/)
    expect(check({ extra: 1 }).join()).toMatch(/unknown field/)
  })
  it('renders every entry into the page', () => {
    const matrix = loadMatrix(root)
    const page = renderPage(matrix)
    expect(page.match(/^\| .*`@agentskit\/.*$/gm) ?? []).toHaveLength(matrix.entries.length)
  })
})
