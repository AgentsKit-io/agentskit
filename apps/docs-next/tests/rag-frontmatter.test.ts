import { describe, expect, it } from 'vitest'
import { parseFrontmatter } from '../lib/rag/frontmatter'

describe('parseFrontmatter', () => {
  it('parses folded YAML title scalars', () => {
    expect(parseFrontmatter('---\ntitle: >-\n  Folded\n  title\n---\nBody')).toEqual({
      title: 'Folded title',
      body: 'Body',
    })
  })

  it('normalizes CRLF frontmatter and body', () => {
    expect(parseFrontmatter('---\r\ntitle: CRLF page\r\n---\r\nBody\r\ntext')).toEqual({
      title: 'CRLF page',
      body: 'Body\ntext',
    })
  })

  it('strips a BOM before splitting frontmatter', () => {
    expect(parseFrontmatter('\uFEFF---\ntitle: BOM page\n---\nBody')).toEqual({
      title: 'BOM page',
      body: 'Body',
    })
  })
})
