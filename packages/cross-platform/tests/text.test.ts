import { describe, expect, it } from 'vitest'
import { hashText, normalizeEol, splitFrontmatter, splitLines, stripBom } from '../src/text'

describe('text', () => {
  it('normalises CRLF and lone CR', () => {
    expect(normalizeEol('a\r\nb\rc\n')).toBe('a\nb\nc\n')
  })

  it('strips a BOM', () => {
    expect(stripBom('\uFEFFx')).toBe('x')
    expect(stripBom('x')).toBe('x')
  })

  it('splits lines from any OS', () => {
    expect(splitLines('a\r\nb\n')).toEqual(['a', 'b'])
    expect(splitLines('a\nb\n', { dropTrailingEmpty: false })).toEqual(['a', 'b', ''])
    expect(splitLines('')).toEqual([])
  })

  it('splits CRLF frontmatter', () => {
    expect(splitFrontmatter('\uFEFF---\r\ntitle: x\r\n---\r\nbody\r\n')).toEqual({ frontmatter: 'title: x', body: 'body\n' })
    expect(splitFrontmatter('---\n---\nbody')).toEqual({ frontmatter: '', body: 'body' })
    expect(splitFrontmatter('no fm')).toEqual({ frontmatter: null, body: 'no fm' })
  })

  it('hashes identically across line endings', async () => {
    const lf = await hashText('a\nb\n')
    expect(await hashText('a\r\nb\r\n')).toBe(lf)
    expect(await hashText('\uFEFFa\nb\n')).toBe(lf)
    expect(lf).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashText('other')).not.toBe(lf)
  })
})
