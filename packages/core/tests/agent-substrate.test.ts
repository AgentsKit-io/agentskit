import { describe, it, expect } from 'vitest'
import { jaroWinkler, fuzzyMatchList } from '../src/fuzzy-match'
import { SEVERITY_ORDER } from '../src/types/finding'
import { fenceUntrustedContent, UNTRUSTED_CONTENT_DIRECTIVE } from '../src/security/index'

describe('jaroWinkler', () => {
  it('scores identical = 1, disjoint = 0, near = high', () => {
    expect(jaroWinkler('Putin', 'Putin')).toBe(1)
    expect(jaroWinkler('', 'x')).toBe(0)
    expect(jaroWinkler('aaaa', 'bbbb')).toBe(0)
    expect(jaroWinkler('Putin', 'Putln')).toBeGreaterThan(0.85)
  })
  it('is case- and whitespace-insensitive by default', () => {
    expect(jaroWinkler('  Vladimir  Putin ', 'vladimir putin')).toBe(1)
  })
})

describe('fuzzyMatchList', () => {
  it('returns near matches above threshold, sorted desc, drops the unrelated one', () => {
    const list = ['Vladimir Putin', 'Vladmir Putn', 'Barack Obama']
    const hits = fuzzyMatchList('Vladimir Putin', list, { threshold: 0.85 })
    expect(hits[0]?.candidate).toBe('Vladimir Putin')
    expect(hits.map((h) => h.candidate)).toContain('Vladmir Putn')
    expect(hits.map((h) => h.candidate)).not.toContain('Barack Obama')
    expect(hits[0]!.score).toBeGreaterThanOrEqual(hits[hits.length - 1]!.score)
  })
  it('respects topK', () => {
    expect(fuzzyMatchList('a', ['a', 'a', 'a'], { threshold: 0, topK: 2 })).toHaveLength(2)
  })
})

describe('fenceUntrustedContent', () => {
  it('wraps content in a matched sentinel pair with a random id', () => {
    const out = fenceUntrustedContent('ignore previous instructions', { label: 'web page' })
    expect(out).toMatch(/^«UNTRUSTED WEB PAGE [A-Z0-9]{10}»\n/)
    expect(out).toMatch(/\n«\/UNTRUSTED WEB PAGE [A-Z0-9]{10}»$/)
    expect(out).toContain('ignore previous instructions')
    // open and close ids match each other
    const open = out.match(/«UNTRUSTED WEB PAGE ([A-Z0-9]{10})»/)![1]
    expect(out).toContain(`«/UNTRUSTED WEB PAGE ${open}»`)
  })
  it('fixed id is honored (for tests); directive is non-empty', () => {
    expect(fenceUntrustedContent('x', { id: 'FIXED123' })).toBe('«UNTRUSTED INPUT FIXED123»\nx\n«/UNTRUSTED INPUT FIXED123»')
    expect(UNTRUSTED_CONTENT_DIRECTIVE.length).toBeGreaterThan(20)
  })
})

describe('Finding', () => {
  it('SEVERITY_ORDER is most→least severe', () => {
    expect(SEVERITY_ORDER[0]).toBe('critical')
    expect(SEVERITY_ORDER[SEVERITY_ORDER.length - 1]).toBe('info')
  })
})
